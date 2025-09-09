const { PrismaClient } = require('../prisma/generated/client');
const prisma = new PrismaClient();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { sendEmail } = require('../utils/mailer');
const { logger } = require('../utils/logger');
const { generateTokens } = require('../utils/tokenService');

class InvitationService {
  /**
   * Generate a cryptographically secure invitation token
   */
  generateSecureToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hash token for secure storage
   */
  hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Send invitation to a new user
   */
  async sendInvitation({ email, role, organizationId, invitedById }) {
    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Invalid email format');
      }

      // Check if user already exists in organization
      const existingMember = await prisma.membership.findFirst({
        where: {
          user: { email: email.toLowerCase() },
          organizationId,
        },
      });

      if (existingMember) {
        throw new Error('User is already a member of this organization');
      }

      // Check for pending invitation
      const pendingInvitation = await prisma.invitation.findFirst({
        where: {
          email: email.toLowerCase(),
          organizationId,
          acceptedAt: null,
          expiresAt: { gt: new Date() },
        },
      });

      if (pendingInvitation) {
        throw new Error('An invitation has already been sent to this email');
      }

      // Get inviter and organization details
      const [inviter, organization] = await Promise.all([
        prisma.user.findUnique({
          where: { id: invitedById },
          select: { firstName: true, lastName: true, email: true },
        }),
        prisma.organization.findUnique({
          where: { id: organizationId },
          select: { name: true, subscription: { select: { maxUsersPerOrg: true } } },
        }),
      ]);

      if (!inviter || !organization) {
        throw new Error('Invalid inviter or organization');
      }

      // Check organization user limit
      const currentMemberCount = await prisma.membership.count({
        where: { organizationId },
      });

      const maxUsers = organization.subscription?.maxUsersPerOrg || 1;
      if (currentMemberCount >= maxUsers) {
        throw new Error(`Organization has reached its user limit of ${maxUsers}`);
      }

      // Generate secure token
      const token = this.generateSecureToken();
      const hashedToken = this.hashToken(token);

      // Create invitation with 7-day expiration
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const invitation = await prisma.invitation.create({
        data: {
          email: email.toLowerCase(),
          role,
          token: hashedToken,
          expiresAt,
          organizationId,
          invitedById,
        },
      });

      // Send invitation email
      const acceptUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/accept-invitation?token=${token}`;

      await sendEmail({
        to: email,
        subject: `You're invited to join ${organization.name} on Nectar`,
        html: this.getInvitationEmailTemplate({
          inviterName: `${inviter.firstName} ${inviter.lastName}`,
          inviterEmail: inviter.email,
          organizationName: organization.name,
          role,
          acceptUrl,
          expiresIn: '7 days',
        }),
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'INVITATION_SENT',
          entityType: 'invitation',
          entityId: invitation.id,
          organizationId,
          userId: invitedById,
          metadata: { email, role },
        },
      });

      logger.info('Invitation sent successfully', {
        invitationId: invitation.id,
        email,
        organizationId,
      });

      return {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
      };
    } catch (error) {
      logger.error('Failed to send invitation', { error: error.message });
      throw error;
    }
  }

  /**
   * Validate invitation token
   */
  async validateInvitationToken(token) {
    try {
      if (!token) {
        throw new Error('Token is required');
      }

      const hashedToken = this.hashToken(token);

      const invitation = await prisma.invitation.findFirst({
        where: {
          token: hashedToken,
          acceptedAt: null,
          expiresAt: { gt: new Date() },
        },
        include: {
          organization: {
            select: { id: true, name: true, logo: true },
          },
          invitedBy: {
            select: { firstName: true, lastName: true },
          },
        },
      });

      if (!invitation) {
        throw new Error('Invalid or expired invitation');
      }

      return {
        email: invitation.email,
        role: invitation.role,
        organization: invitation.organization,
        invitedBy: invitation.invitedBy,
      };
    } catch (error) {
      logger.error('Failed to validate invitation', { error: error.message });
      throw error;
    }
  }

  /**
   * Accept invitation and create user account
   */
  async acceptInvitation({ token, password, firstName, lastName }) {
    try {
      if (!token || !password || !firstName || !lastName) {
        throw new Error('All fields are required');
      }

      // Validate password strength
      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }

      const hashedToken = this.hashToken(token);

      // Find and validate invitation
      const invitation = await prisma.invitation.findFirst({
        where: {
          token: hashedToken,
          acceptedAt: null,
          expiresAt: { gt: new Date() },
        },
      });

      if (!invitation) {
        throw new Error('Invalid or expired invitation');
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: invitation.email },
      });

      let user;

      if (existingUser) {
        // User exists, just add to organization
        user = existingUser;
      } else {
        // Create new user
        const passwordHash = await bcrypt.hash(password, 10);

        user = await prisma.user.create({
          data: {
            email: invitation.email,
            passwordHash,
            firstName,
            lastName,
            emailVerified: true,
            emailVerifiedAt: new Date(),
          },
        });
      }

      // Create membership
      await prisma.membership.create({
        data: {
          userId: user.id,
          organizationId: invitation.organizationId,
          role: invitation.role,
        },
      });

      // Mark invitation as accepted
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'INVITATION_ACCEPTED',
          entityType: 'invitation',
          entityId: invitation.id,
          organizationId: invitation.organizationId,
          userId: user.id,
          metadata: { email: invitation.email, role: invitation.role },
        },
      });

      // Generate auth tokens
      const tokens = generateTokens({
        userId: user.id,
        email: user.email,
      });

      logger.info('Invitation accepted successfully', {
        invitationId: invitation.id,
        userId: user.id,
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
        tokens,
        organizationId: invitation.organizationId,
      };
    } catch (error) {
      logger.error('Failed to accept invitation', { error: error.message });
      throw error;
    }
  }

  /**
   * Revoke a pending invitation
   */
  async revokeInvitation(invitationId, userId) {
    try {
      const invitation = await prisma.invitation.findUnique({
        where: { id: invitationId },
        include: {
          organization: {
            include: {
              memberships: {
                where: { userId },
              },
            },
          },
        },
      });

      if (!invitation) {
        throw new Error('Invitation not found');
      }

      if (invitation.acceptedAt) {
        throw new Error('Invitation has already been accepted');
      }

      // Check permissions - must be admin/owner or the inviter
      const membership = invitation.organization.memberships[0];
      const hasPermission =
        invitation.invitedById === userId ||
        membership?.role === 'OWNER' ||
        membership?.role === 'ADMIN';

      if (!hasPermission) {
        throw new Error('Insufficient permissions to revoke invitation');
      }

      await prisma.invitation.delete({
        where: { id: invitationId },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'INVITATION_REVOKED',
          entityType: 'invitation',
          entityId: invitationId,
          organizationId: invitation.organizationId,
          userId,
          metadata: { email: invitation.email },
        },
      });

      logger.info('Invitation revoked', { invitationId, userId });
      return { success: true };
    } catch (error) {
      logger.error('Failed to revoke invitation', { error: error.message });
      throw error;
    }
  }

  /**
   * Resend invitation email
   */
  async resendInvitation(invitationId, userId) {
    try {
      const invitation = await prisma.invitation.findUnique({
        where: { id: invitationId },
        include: {
          organization: true,
          invitedBy: {
            select: { firstName: true, lastName: true, email: true },
          },
        },
      });

      if (!invitation) {
        throw new Error('Invitation not found');
      }

      if (invitation.acceptedAt) {
        throw new Error('Invitation has already been accepted');
      }

      if (invitation.expiresAt < new Date()) {
        // Extend expiration if expired
        const newExpiresAt = new Date();
        newExpiresAt.setDate(newExpiresAt.getDate() + 7);

        await prisma.invitation.update({
          where: { id: invitationId },
          data: { expiresAt: newExpiresAt },
        });

        invitation.expiresAt = newExpiresAt;
      }

      // Generate new token for security
      const newToken = this.generateSecureToken();
      const hashedToken = this.hashToken(newToken);

      await prisma.invitation.update({
        where: { id: invitationId },
        data: { token: hashedToken },
      });

      // Resend email
      const acceptUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/accept-invitation?token=${newToken}`;

      await sendEmail({
        to: invitation.email,
        subject: `Reminder: You're invited to join ${invitation.organization.name}`,
        html: this.getInvitationEmailTemplate({
          inviterName: `${invitation.invitedBy.firstName} ${invitation.invitedBy.lastName}`,
          inviterEmail: invitation.invitedBy.email,
          organizationName: invitation.organization.name,
          role: invitation.role,
          acceptUrl,
          expiresIn: '7 days',
        }),
      });

      logger.info('Invitation resent', { invitationId });
      return { success: true };
    } catch (error) {
      logger.error('Failed to resend invitation', { error: error.message });
      throw error;
    }
  }

  /**
   * List pending invitations for an organization
   */
  async listPendingInvitations(organizationId, userId) {
    try {
      // Check user has permission
      const membership = await prisma.membership.findFirst({
        where: {
          userId,
          organizationId,
          role: { in: ['OWNER', 'ADMIN'] },
        },
      });

      if (!membership) {
        throw new Error('Insufficient permissions');
      }

      const invitations = await prisma.invitation.findMany({
        where: {
          organizationId,
          acceptedAt: null,
        },
        include: {
          invitedBy: {
            select: { firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return invitations.map(inv => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        status: inv.expiresAt < new Date() ? 'expired' : 'pending',
        expiresAt: inv.expiresAt,
        createdAt: inv.createdAt,
        invitedBy: `${inv.invitedBy.firstName} ${inv.invitedBy.lastName}`,
      }));
    } catch (error) {
      logger.error('Failed to list invitations', { error: error.message });
      throw error;
    }
  }

  /**
   * Clean up expired invitations (scheduled job)
   */
  async cleanupExpiredInvitations() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await prisma.invitation.deleteMany({
        where: {
          OR: [
            {
              expiresAt: { lt: new Date() },
              acceptedAt: null,
              createdAt: { lt: thirtyDaysAgo },
            },
          ],
        },
      });

      logger.info(`Cleaned up ${result.count} expired invitations`);
      return result.count;
    } catch (error) {
      logger.error('Failed to cleanup invitations', { error: error.message });
      throw error;
    }
  }

  /**
   * Get invitation email template
   */
  getInvitationEmailTemplate({
    inviterName,
    inviterEmail,
    organizationName,
    role,
    acceptUrl,
    expiresIn,
  }) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background: white; padding: 30px; border: 1px solid #e1e1e1; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e1e1e1; font-size: 14px; color: #666; }
          .role-badge { display: inline-block; padding: 4px 12px; background: #f0f0f0; border-radius: 12px; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>You're Invited!</h1>
          </div>
          <div class="content">
            <p>Hi there,</p>
            <p><strong>${inviterName}</strong> (${inviterEmail}) has invited you to join <strong>${organizationName}</strong> on Nectar.</p>
            
            <p>You'll be joining as: <span class="role-badge">${role}</span></p>
            
            <div style="text-align: center;">
              <a href="${acceptUrl}" class="button">Accept Invitation</a>
            </div>
            
            <p style="color: #666; font-size: 14px;">This invitation will expire in ${expiresIn}.</p>
            
            <div class="footer">
              <p><strong>What is Nectar?</strong><br>
              Nectar is a powerful platform for managing your data connections, workflows, and integrations in one place.</p>
              
              <p style="color: #999; font-size: 12px;">
                If you didn't expect this invitation, you can safely ignore this email. 
                The invitation will expire automatically.
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

module.exports = new InvitationService();

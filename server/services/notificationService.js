// PostgreSQL notification service with proper RLS enforcement
const prismaService = require('../services/prismaService');
const { logger } = require('../utils/logger');
const { sendEmail } = require('../utils/mailer');

class NotificationService {
  /**
   * Create a new notification for a user - requires organization context
   * @param {Object} data - Notification data
   * @param {string} data.userId - User ID
   * @param {string} data.organizationId - Organization ID (required for RLS)
   * @param {string} data.type - Notification type (system, workflow, security, user_message)
   * @param {string} data.priority - Priority level (high, medium, low)
   * @param {string} data.title - Notification title
   * @param {string} data.message - Notification message
   * @param {Object} [data.metadata] - Additional metadata
   * @param {string} [data.actionUrl] - URL for action button
   * @param {string} [data.actionText] - Text for action button
   * @param {Date} [data.expiresAt] - Expiration date
   * @param {boolean} [sendEmailNotification=true] - Whether to send email
   * @returns {Promise<Notification>}
   */
  static async createNotification(data, sendEmailNotification = true) {
    try {
      // Validate required fields including organization context
      if (!data.userId || !data.organizationId || !data.type || !data.title || !data.message) {
        throw new Error(
          'Missing required notification fields (userId, organizationId, type, title, message)'
        );
      }

      // SECURITY FIX: Get user with proper organization validation
      const systemPrisma = prismaService.getSystemClient();
      const user = await systemPrisma.user.findFirst({
        where: {
          id: data.userId,
          memberships: {
            some: {
              organizationId: data.organizationId,
              isActive: true,
            },
          },
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          notificationPreferences: true,
        },
      });

      if (!user) {
        throw new Error('User not found or not member of organization');
      }

      const preferences = user.notificationPreferences || {
        inbox: {
          system: true,
          workflow: true,
          security: true,
          user_message: true,
        },
        email: {
          system: false,
          workflow: false,
          security: true,
          user_message: false,
        },
      };

      // Check if user wants this type of notification in their inbox
      const shouldCreateInboxNotification = preferences.inbox[data.type] !== false;

      // Security notifications are always created regardless of preferences
      if (data.type === 'security' || shouldCreateInboxNotification) {
        // SECURITY FIX: Create notification with proper RLS enforcement
        const notification = await prismaService.withTenantContext(
          data.organizationId,
          async tx => {
            return await tx.notification.create({
              data: {
                userId: data.userId,
                organizationId: data.organizationId,
                type: data.type,
                priority: data.priority,
                title: data.title,
                message: data.message,
                metadata: data.metadata || {},
                actionUrl: data.actionUrl,
                actionText: data.actionText,
                expiresAt: data.expiresAt,
                isRead: false,
              },
            });
          }
        );

        logger.info(
          `Created notification ${notification.id} for user ${data.userId} in organization ${data.organizationId}`,
          {
            type: data.type,
            priority: data.priority,
            title: data.title,
          }
        );

        // Determine if email should be sent based on user preferences and notification type
        const shouldSendEmail = preferences.email[data.type] !== false;

        // Send email notification based on preferences and priority
        // Security notifications are always sent via email regardless of preferences
        if (
          sendEmailNotification &&
          (data.type === 'security' || (shouldSendEmail && data.priority === 'high'))
        ) {
          await this.sendEmailNotification(notification, user);
        }

        // TODO: Emit real-time notification via WebSocket
        // this.emitRealTimeNotification(notification);

        return notification;
      } else {
        // User has disabled this notification type, log and return null
        logger.info(
          `Skipped creating notification for user ${data.userId} in organization ${data.organizationId} - type ${data.type} disabled in preferences`
        );
        return null;
      }
    } catch (error) {
      logger.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Get notifications for a user with pagination - organization-scoped
   * @param {string} userId - User ID
   * @param {string} organizationId - Organization ID (required for RLS)
   * @param {Object} options - Query options
   * @param {number} [options.page=1] - Page number
   * @param {number} [options.limit=20] - Items per page
   * @param {boolean} [options.unreadOnly=false] - Show only unread
   * @param {string} [options.type] - Filter by type
   * @returns {Promise<Object>}
   */
  static async getUserNotifications(userId, organizationId, options = {}) {
    try {
      if (!userId || !organizationId) {
        throw new Error('User ID and Organization ID are required');
      }

      const { page = 1, limit = 20, unreadOnly = false, type } = options;
      const skip = (page - 1) * limit;

      // SECURITY FIX: Use withTenantContext for RLS enforcement
      const [notifications, total, unreadCount] = await Promise.all([
        prismaService.withTenantContext(organizationId, async tx => {
          const where = {
            userId,
            // organizationId handled by RLS
          };

          if (unreadOnly) {
            where.isRead = false;
          }

          if (type) {
            where.type = type;
          }

          return await tx.notification.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
          });
        }),
        prismaService.withTenantContext(organizationId, async tx => {
          const where = {
            userId,
            // organizationId handled by RLS
          };

          if (unreadOnly) {
            where.isRead = false;
          }

          if (type) {
            where.type = type;
          }

          return await tx.notification.count({ where });
        }),
        prismaService.withTenantContext(organizationId, async tx => {
          return await tx.notification.count({
            where: {
              userId,
              isRead: false,
              // organizationId handled by RLS
            },
          });
        }),
      ]);

      return {
        organizationId,
        notifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        unreadCount,
      };
    } catch (error) {
      logger.error('Error fetching user notifications:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read - organization-scoped for security
   * @param {string} notificationId - Notification ID
   * @param {string} userId - User ID (for security)
   * @param {string} organizationId - Organization ID (required for RLS)
   * @returns {Promise<Notification>}
   */
  static async markAsRead(notificationId, userId, organizationId) {
    try {
      if (!notificationId || !userId || !organizationId) {
        throw new Error('Notification ID, User ID, and Organization ID are required');
      }

      // SECURITY FIX: Use withTenantContext for RLS enforcement
      const notification = await prismaService.withTenantContext(organizationId, async tx => {
        // First find and verify ownership
        const existing = await tx.notification.findFirst({
          where: {
            id: notificationId,
            userId,
            // organizationId handled by RLS
          },
        });

        if (!existing) {
          throw new Error('Notification not found or access denied');
        }

        // Update to mark as read
        return await tx.notification.update({
          where: { id: notificationId },
          data: {
            isRead: true,
            readAt: new Date(),
          },
        });
      });

      logger.info(`Marked notification ${notificationId} as read for user ${userId}`);
      return notification;
    } catch (error) {
      logger.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user - organization-scoped
   * @param {string} userId - User ID
   * @param {string} organizationId - Organization ID (required for RLS)
   * @returns {Promise<Object>}
   */
  static async markAllAsRead(userId, organizationId) {
    try {
      if (!userId || !organizationId) {
        throw new Error('User ID and Organization ID are required');
      }

      // SECURITY FIX: Use withTenantContext for RLS enforcement
      const result = await prismaService.withTenantContext(organizationId, async tx => {
        return await tx.notification.updateMany({
          where: {
            userId,
            isRead: false,
            // organizationId handled by RLS
          },
          data: {
            isRead: true,
            readAt: new Date(),
          },
        });
      });

      logger.info(
        `Marked ${result.count} notifications as read for user ${userId} in organization ${organizationId}`
      );

      return {
        modifiedCount: result.count,
        message: `Marked ${result.count} notifications as read`,
      };
    } catch (error) {
      logger.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Delete a notification - organization-scoped for security
   * @param {string} notificationId - Notification ID
   * @param {string} userId - User ID (for security)
   * @param {string} organizationId - Organization ID (required for RLS)
   * @returns {Promise<boolean>}
   */
  static async deleteNotification(notificationId, userId, organizationId) {
    try {
      if (!notificationId || !userId || !organizationId) {
        throw new Error('Notification ID, User ID, and Organization ID are required');
      }

      // SECURITY FIX: Use withTenantContext for RLS enforcement
      const result = await prismaService.withTenantContext(organizationId, async tx => {
        // First verify ownership
        const existing = await tx.notification.findFirst({
          where: {
            id: notificationId,
            userId,
            // organizationId handled by RLS
          },
        });

        if (!existing) {
          throw new Error('Notification not found or access denied');
        }

        // Delete the notification
        return await tx.notification.delete({
          where: { id: notificationId },
        });
      });

      logger.info(
        `Deleted notification ${notificationId} for user ${userId} in organization ${organizationId}`
      );
      return true;
    } catch (error) {
      logger.error('Error deleting notification:', error);
      throw error;
    }
  }

  /**
   * Clear all notifications for a user - organization-scoped
   * @param {string} userId - User ID
   * @param {string} organizationId - Organization ID (required for RLS)
   * @returns {Promise<Object>}
   */
  static async clearAllNotifications(userId, organizationId) {
    try {
      if (!userId || !organizationId) {
        throw new Error('User ID and Organization ID are required');
      }

      // SECURITY FIX: Use withTenantContext for RLS enforcement
      const result = await prismaService.withTenantContext(organizationId, async tx => {
        return await tx.notification.deleteMany({
          where: {
            userId,
            // organizationId handled by RLS
          },
        });
      });

      logger.info(
        `Cleared ${result.count} notifications for user ${userId} in organization ${organizationId}`
      );

      return {
        deletedCount: result.count,
        message: `Cleared ${result.count} notifications`,
      };
    } catch (error) {
      logger.error('Error clearing all notifications:', error);
      throw error;
    }
  }

  /**
   * Get unread notification count for a user - organization-scoped
   * @param {string} userId - User ID
   * @param {string} organizationId - Organization ID (required for RLS)
   * @returns {Promise<number>}
   */
  static async getUnreadCount(userId, organizationId) {
    try {
      if (!userId || !organizationId) {
        throw new Error('User ID and Organization ID are required');
      }

      // SECURITY FIX: Use withTenantContext for RLS enforcement
      return await prismaService.withTenantContext(organizationId, async tx => {
        return await tx.notification.count({
          where: {
            userId,
            isRead: false,
            // organizationId handled by RLS
          },
        });
      });
    } catch (error) {
      logger.error('Error getting unread count:', error);
      throw error;
    }
  }

  /**
   * Send email notification to user
   * @param {Notification} notification - Notification object
   * @param {Object} user - User object with email
   * @private
   */
  static async sendEmailNotification(notification, user) {
    try {
      if (!user || !user.email) {
        logger.warn(
          `Cannot send email notification - user ${notification.userId} not found or has no email`
        );
        return;
      }

      const emailData = {
        to: user.email,
        subject: `Nectar Studio - ${notification.title}`,
        html: this.generateEmailTemplate(notification, user),
      };

      await sendEmail(emailData);

      logger.info(`Sent email notification to ${user.email} for notification ${notification.id}`);
    } catch (error) {
      logger.error('Error sending email notification:', error);
      // Don't throw - email failure shouldn't break notification creation
    }
  }

  /**
   * Generate HTML email template for notification
   * @param {Notification} notification - Notification object
   * @param {User} user - User object
   * @returns {string} HTML email content
   * @private
   */
  static generateEmailTemplate(notification, user) {
    const priorityColors = {
      high: '#ef4444',
      medium: '#f59e0b',
      low: '#10b981',
    };

    const priorityColor = priorityColors[notification.priority] || '#6b7280';
    const actionButton = notification.actionUrl
      ? `
      <div style="text-align: center; margin: 20px 0;">
        <a href="${notification.actionUrl}" 
           style="background-color: #3b82f6; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 6px; display: inline-block;">
          ${notification.actionText || 'View Details'}
        </a>
      </div>
    `
      : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Nectar Studio Notification</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #1f2937; margin: 0;">Nectar Studio</h1>
          </div>
          
          <div style="background-color: white; padding: 20px; border-radius: 6px; border-left: 4px solid ${priorityColor};">
            <h2 style="color: #1f2937; margin-top: 0;">${notification.title}</h2>
            <p style="color: #6b7280; margin-bottom: 15px;">
              Hello ${user.firstName},
            </p>
            <p style="color: #374151; margin-bottom: 20px;">
              ${notification.message}
            </p>
            
            ${actionButton}
            
            <div style="border-top: 1px solid #e5e7eb; padding-top: 15px; margin-top: 20px;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                Priority: <span style="color: ${priorityColor}; font-weight: bold; text-transform: uppercase;">${notification.priority}</span> | 
                Type: ${notification.type.replace('_', ' ')} | 
                Time: ${notification.createdAt.toLocaleString()}
              </p>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 20px;">
            <p style="color: #9ca3af; font-size: 12px;">
              This notification was sent from Nectar Studio. 
              You can manage your notification preferences in your account settings.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Create system notification (helper method) - requires organization context
   * @param {string} userId - User ID
   * @param {string} organizationId - Organization ID
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   * @param {string} [priority='medium'] - Priority level
   * @returns {Promise<Notification>}
   */
  static async createSystemNotification(
    userId,
    organizationId,
    title,
    message,
    priority = 'medium'
  ) {
    return this.createNotification({
      userId,
      organizationId,
      type: 'system',
      priority,
      title,
      message,
    });
  }

  /**
   * Create workflow notification (helper method) - requires organization context
   * @param {string} userId - User ID
   * @param {string} organizationId - Organization ID
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   * @param {Object} [metadata] - Workflow metadata
   * @param {string} [priority='medium'] - Priority level
   * @returns {Promise<Notification>}
   */
  static async createWorkflowNotification(
    userId,
    organizationId,
    title,
    message,
    metadata = {},
    priority = 'medium'
  ) {
    return this.createNotification({
      userId,
      organizationId,
      type: 'workflow',
      priority,
      title,
      message,
      metadata,
    });
  }

  /**
   * Create security notification (helper method) - requires organization context
   * @param {string} userId - User ID
   * @param {string} organizationId - Organization ID
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   * @returns {Promise<Notification>}
   */
  static async createSecurityNotification(userId, organizationId, title, message) {
    return this.createNotification(
      {
        userId,
        organizationId,
        type: 'security',
        priority: 'high',
        title,
        message,
      },
      true
    ); // Always send email for security notifications
  }
}

module.exports = NotificationService;

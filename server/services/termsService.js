const prismaService = require('../services/prismaService');
const geoip = require('geoip-lite');

class TermsService {
  /**
   * Get the currently active Terms and Conditions
   * TermsAndConditions is a global table (no organizationId), so systemPrisma is correct
   */
  async getActiveTerms() {
    try {
      // TermsAndConditions is global (no organizationId field), use systemPrisma
      const prisma = prismaService.getSystemClient();
      const activeTerms = await prisma.termsAndConditions.findFirst({
        where: {
          isActive: true,
          effectiveDate: {
            lte: new Date(),
          },
        },
        orderBy: {
          effectiveDate: 'desc',
        },
      });

      return activeTerms;
    } catch (error) {
      console.error('Error fetching active terms:', error);
      throw new Error('Failed to fetch terms and conditions');
    }
  }

  /**
   * Check if a user has accepted the current terms for their organization
   * TermsAcceptance is tenant-scoped (has organizationId), must use withTenantContext
   */
  async hasUserAcceptedCurrentTerms(userId, organizationId) {
    try {
      const activeTerms = await this.getActiveTerms();

      if (!activeTerms) {
        // No active terms means no acceptance required
        return true;
      }

      // TermsAcceptance has organizationId, use RLS-enforced client
      return await prismaService.withTenantContext(organizationId, async tx => {
        const acceptance = await tx.termsAcceptance.findUnique({
          where: {
            organizationId_userId_termsId: {
              organizationId,
              userId,
              termsId: activeTerms.id,
            },
          },
        });

        return !!acceptance;
      });
    } catch (error) {
      console.error('Error checking terms acceptance:', error);
      return false;
    }
  }

  /**
   * Record a user's acceptance of the terms
   * MIXED CLIENT USAGE: TermsAcceptance & AuditLog (tenant), Organization (infrastructure)
   */
  async recordAcceptance(userId, organizationId, ipAddress, userAgent, acceptanceMethod = 'CLICK') {
    try {
      const activeTerms = await this.getActiveTerms();

      if (!activeTerms) {
        throw new Error('No active terms and conditions found');
      }

      // First check if already accepted using RLS context
      const hasAccepted = await this.hasUserAcceptedCurrentTerms(userId, organizationId);
      if (hasAccepted) {
        // Return existing acceptance record
        return await prismaService.withTenantContext(organizationId, async tx => {
          return await tx.termsAcceptance.findUnique({
            where: {
              organizationId_userId_termsId: {
                organizationId,
                userId,
                termsId: activeTerms.id,
              },
            },
            include: {
              terms: true,
              user: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                },
              },
              organization: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          });
        });
      }

      // Get geolocation from IP (optional)
      let geolocation = null;
      if (ipAddress) {
        const geo = geoip.lookup(ipAddress);
        if (geo) {
          geolocation = {
            country: geo.country,
            region: geo.region,
            city: geo.city,
            timezone: geo.timezone,
            coordinates: geo.ll,
          };
        }
      }

      // Create acceptance record and audit log within RLS context
      const acceptance = await prismaService.withTenantContext(organizationId, async tx => {
        // Create acceptance record (tenant-scoped)
        const newAcceptance = await tx.termsAcceptance.create({
          data: {
            organizationId,
            userId,
            termsId: activeTerms.id,
            ipAddress: ipAddress || 'unknown',
            userAgent: userAgent || 'unknown',
            geolocation,
            acceptanceMethod,
            acceptedAt: new Date(),
          },
          include: {
            terms: true,
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
            organization: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

        // Create audit log entry (tenant-scoped)
        await tx.auditLog.create({
          data: {
            action: 'TERMS_ACCEPTED',
            entityType: 'TermsAcceptance',
            entityId: newAcceptance.id,
            userId,
            organizationId,
            metadata: {
              termsVersion: activeTerms.version,
              ipAddress,
              userAgent,
              acceptanceMethod,
            },
          },
        });

        return newAcceptance;
      });

      // Update organization's last prompted timestamp (infrastructure table, use systemPrisma)
      await prismaService.getSystemClient().organization.update({
        where: { id: organizationId },
        data: { lastTermsPromptedAt: new Date() },
      });

      return acceptance;
    } catch (error) {
      console.error('Error recording terms acceptance:', error);
      throw new Error('Failed to record terms acceptance');
    }
  }

  /**
   * Create or update Terms and Conditions (admin only)
   * TermsAndConditions is global (no organizationId), use systemPrisma
   */
  async createOrUpdateTerms(version, content, summary, effectiveDate) {
    try {
      // TermsAndConditions is global (no organizationId field), use systemPrisma
      const prisma = prismaService.getSystemClient();
      // Deactivate all existing terms
      await prisma.termsAndConditions.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });

      // Create new terms
      const terms = await prisma.termsAndConditions.create({
        data: {
          version,
          content,
          summary,
          effectiveDate: new Date(effectiveDate),
          isActive: true,
        },
      });

      return terms;
    } catch (error) {
      console.error('Error creating/updating terms:', error);
      throw new Error('Failed to create or update terms and conditions');
    }
  }

  /**
   * Get all terms versions (admin only)
   * TermsAndConditions is global (no organizationId), use systemPrisma
   */
  async getAllTermsVersions() {
    try {
      // TermsAndConditions is global (no organizationId field), use systemPrisma
      const prisma = prismaService.getSystemClient();
      const allTerms = await prisma.termsAndConditions.findMany({
        orderBy: {
          effectiveDate: 'desc',
        },
        include: {
          _count: {
            select: {
              acceptances: true,
            },
          },
        },
      });

      return allTerms;
    } catch (error) {
      console.error('Error fetching all terms versions:', error);
      throw new Error('Failed to fetch terms versions');
    }
  }

  /**
   * Get acceptance statistics for an organization
   * MIXED CLIENT USAGE: Membership & TermsAcceptance (tenant), TermsAndConditions (global)
   */
  async getAcceptanceStats(organizationId) {
    try {
      const activeTerms = await this.getActiveTerms();

      if (!activeTerms) {
        return {
          totalUsers: 0,
          acceptedCount: 0,
          pendingCount: 0,
          acceptanceRate: 0,
        };
      }

      // Get tenant-scoped statistics within RLS context
      return await prismaService.withTenantContext(organizationId, async tx => {
        // Get all organization members (tenant-scoped)
        const totalUsers = await tx.membership.count({
          where: { organizationId },
        });

        // Get acceptance count for current terms (tenant-scoped)
        const acceptedCount = await tx.termsAcceptance.count({
          where: {
            organizationId,
            termsId: activeTerms.id,
          },
        });

        const pendingCount = totalUsers - acceptedCount;
        const acceptanceRate = totalUsers > 0 ? (acceptedCount / totalUsers) * 100 : 0;

        return {
          totalUsers,
          acceptedCount,
          pendingCount,
          acceptanceRate: Math.round(acceptanceRate * 100) / 100,
          currentTermsVersion: activeTerms.version,
          currentTermsEffectiveDate: activeTerms.effectiveDate,
        };
      });
    } catch (error) {
      console.error('Error getting acceptance stats:', error);
      throw new Error('Failed to get acceptance statistics');
    }
  }

  /**
   * Export acceptance records for compliance
   * TermsAcceptance is tenant-scoped (has organizationId), must use withTenantContext
   */
  async exportAcceptanceRecords(organizationId, startDate, endDate) {
    try {
      // TermsAcceptance has organizationId, use RLS-enforced client for secure export
      return await prismaService.withTenantContext(organizationId, async tx => {
        const acceptances = await tx.termsAcceptance.findMany({
          where: {
            organizationId,
            acceptedAt: {
              gte: startDate ? new Date(startDate) : undefined,
              lte: endDate ? new Date(endDate) : undefined,
            },
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
            terms: {
              select: {
                version: true,
                effectiveDate: true,
              },
            },
          },
          orderBy: {
            acceptedAt: 'desc',
          },
        });

        return acceptances;
      });
    } catch (error) {
      console.error('Error exporting acceptance records:', error);
      throw new Error('Failed to export acceptance records');
    }
  }
}

module.exports = new TermsService();

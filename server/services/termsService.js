const { PrismaClient } = require('../prisma/generated/client');
const geoip = require('geoip-lite');

const prisma = new PrismaClient();

class TermsService {
  /**
   * Get the currently active Terms and Conditions
   */
  async getActiveTerms() {
    try {
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
   */
  async hasUserAcceptedCurrentTerms(userId, organizationId) {
    try {
      const activeTerms = await this.getActiveTerms();

      if (!activeTerms) {
        // No active terms means no acceptance required
        return true;
      }

      const acceptance = await prisma.termsAcceptance.findUnique({
        where: {
          organizationId_userId_termsId: {
            organizationId,
            userId,
            termsId: activeTerms.id,
          },
        },
      });

      return !!acceptance;
    } catch (error) {
      console.error('Error checking terms acceptance:', error);
      return false;
    }
  }

  /**
   * Record a user's acceptance of the terms
   */
  async recordAcceptance(userId, organizationId, ipAddress, userAgent, acceptanceMethod = 'CLICK') {
    try {
      const activeTerms = await this.getActiveTerms();

      if (!activeTerms) {
        throw new Error('No active terms and conditions found');
      }

      // Check if already accepted
      const existingAcceptance = await prisma.termsAcceptance.findUnique({
        where: {
          organizationId_userId_termsId: {
            organizationId,
            userId,
            termsId: activeTerms.id,
          },
        },
      });

      if (existingAcceptance) {
        return existingAcceptance;
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

      // Create acceptance record
      const acceptance = await prisma.termsAcceptance.create({
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

      // Update organization's last prompted timestamp
      await prisma.organization.update({
        where: { id: organizationId },
        data: { lastTermsPromptedAt: new Date() },
      });

      // Create audit log entry
      await prisma.auditLog.create({
        data: {
          action: 'TERMS_ACCEPTED',
          entityType: 'TermsAcceptance',
          entityId: acceptance.id,
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

      return acceptance;
    } catch (error) {
      console.error('Error recording terms acceptance:', error);
      throw new Error('Failed to record terms acceptance');
    }
  }

  /**
   * Create or update Terms and Conditions (admin only)
   */
  async createOrUpdateTerms(version, content, summary, effectiveDate) {
    try {
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
   */
  async getAllTermsVersions() {
    try {
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

      // Get all organization members
      const totalUsers = await prisma.membership.count({
        where: { organizationId },
      });

      // Get acceptance count for current terms
      const acceptedCount = await prisma.termsAcceptance.count({
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
    } catch (error) {
      console.error('Error getting acceptance stats:', error);
      throw new Error('Failed to get acceptance statistics');
    }
  }

  /**
   * Export acceptance records for compliance
   */
  async exportAcceptanceRecords(organizationId, startDate, endDate) {
    try {
      const acceptances = await prisma.termsAcceptance.findMany({
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
    } catch (error) {
      console.error('Error exporting acceptance records:', error);
      throw new Error('Failed to export acceptance records');
    }
  }
}

module.exports = new TermsService();

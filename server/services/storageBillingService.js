/**
 * Storage Billing Service
 * Handles storage usage tracking, overage calculations, and billing integration
 */

const prismaService = require('../services/prismaService');
const { logger } = require('../utils/logger');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

class StorageBillingService {
  constructor() {
    // Storage configuration
    this.storageLimits = {
      FREE: 100 * 1024 * 1024, // 100MB (testing only)
      STARTER: 5 * 1024 * 1024 * 1024, // 5GB
      TEAM: 50 * 1024 * 1024 * 1024, // 50GB
      BUSINESS: 250 * 1024 * 1024 * 1024, // 250GB
      ENTERPRISE: 1024 * 1024 * 1024 * 1024, // 1TB
    };

    this.overageRates = {
      FREE: null, // No overages allowed
      STARTER: 0.1, // $0.10/GB/month
      TEAM: 0.08, // $0.08/GB/month
      BUSINESS: 0.06, // $0.06/GB/month
      ENTERPRISE: 0.05, // $0.05/GB/month
    };

    // AWS S3 cost tracking
    this.awsCostPerGB = parseFloat(process.env.AWS_STORAGE_COST_PER_GB) || 0.023;
    this.markupMultiplier = parseFloat(process.env.STORAGE_MARKUP_MULTIPLIER) || 5;
  }

  /**
   * Get storage limits and overage rates for a subscription plan
   */
  getPlanStorageConfig(plan) {
    return {
      includedBytes: this.storageLimits[plan] || this.storageLimits.FREE,
      overageRate: this.overageRates[plan],
      allowsOverages: this.overageRates[plan] !== null,
    };
  }

  /**
   * Calculate current storage usage for an organization
   */
  async calculateStorageUsage(organizationId) {
    try {
      if (!organizationId) {
        throw new Error('Organization ID is required for storage usage calculation');
      }

      // SECURITY FIX: Use withTenantContext for RLS enforcement
      const usageQuery = await prismaService.withTenantContext(organizationId, async tx => {
        return await tx.fileStorage.aggregate({
          where: {
            isActive: true,
            // organizationId handled by RLS
          },
          _sum: { fileSize: true },
          _count: { id: true },
        });
      });

      const rawFileSize = usageQuery._sum.fileSize;
      const bytesUsed = rawFileSize ? parseInt(rawFileSize, 10) : 0;
      const fileCount = usageQuery._count.id || 0;

      // Ensure no NaN values in calculations
      const safeBytesUsed = isNaN(bytesUsed) ? 0 : bytesUsed;

      return {
        organizationId,
        bytesUsed: safeBytesUsed,
        fileCount,
        megabytesUsed: Math.round(safeBytesUsed / 1024 / 1024),
        gigabytesUsed: safeBytesUsed / (1024 * 1024 * 1024),
      };
    } catch (error) {
      logger.error('Failed to calculate storage usage', { error: error.message, organizationId });
      throw error;
    }
  }

  /**
   * Check storage quota and calculate overage information
   */
  async checkStorageQuota(organizationId, additionalBytes = 0) {
    try {
      if (!organizationId) {
        throw new Error('Organization ID is required for quota check');
      }

      // SECURITY FIX: Use system client for infrastructure data (organization/subscription)
      const systemPrisma = prismaService.getSystemClient();
      const organization = await systemPrisma.organization.findUnique({
        where: { id: organizationId },
        include: { subscription: true },
      });

      if (!organization) {
        throw new Error('Organization not found');
      }

      const plan = organization.subscription?.plan || 'FREE';
      const config = this.getPlanStorageConfig(plan);
      const usage = await this.calculateStorageUsage(organizationId);

      const totalBytesWithUpload = usage.bytesUsed + additionalBytes;
      const isOverLimit = totalBytesWithUpload > config.includedBytes;
      const overageBytes = isOverLimit ? totalBytesWithUpload - config.includedBytes : 0;
      const overageGB = overageBytes / (1024 * 1024 * 1024);

      // Calculate costs
      const estimatedMonthlyCost =
        config.overageRate && isOverLimit ? overageGB * config.overageRate : 0;
      const awsCost = (totalBytesWithUpload / (1024 * 1024 * 1024)) * this.awsCostPerGB;

      return {
        organization: {
          id: organizationId,
          name: organization.name,
          plan,
        },
        usage: {
          ...usage,
          totalBytesWithUpload,
        },
        quota: {
          includedBytes: config.includedBytes,
          overageRate: config.overageRate,
          allowsOverages: config.allowsOverages,
        },
        overage: {
          isOverLimit,
          overageBytes,
          overageGB: Math.round(overageGB * 100) / 100,
          estimatedMonthlyCost: Math.round(estimatedMonthlyCost * 100) / 100,
        },
        costs: {
          awsCost: Math.round(awsCost * 10000) / 10000,
          customerCost: Math.round(estimatedMonthlyCost * 100) / 100,
          profitMargin: Math.round((estimatedMonthlyCost - awsCost) * 100) / 100,
        },
        quotaStatus: this.getQuotaStatus(
          totalBytesWithUpload,
          config.includedBytes,
          config.allowsOverages
        ),
      };
    } catch (error) {
      logger.error('Failed to check storage quota', { error: error.message, organizationId });
      throw error;
    }
  }

  /**
   * Determine quota status for UI display
   */
  getQuotaStatus(usedBytes, limitBytes, allowsOverages) {
    const usagePercentage = (usedBytes / limitBytes) * 100;

    if (usagePercentage < 80) {
      return { level: 'normal', message: 'Storage usage is within normal limits' };
    } else if (usagePercentage < 95) {
      return { level: 'warning', message: 'Approaching storage limit' };
    } else if (usagePercentage < 100) {
      return { level: 'critical', message: 'Storage limit almost reached' };
    } else if (allowsOverages) {
      return { level: 'overage', message: 'Storage limit exceeded - overage charges apply' };
    } else {
      return { level: 'blocked', message: 'Storage limit exceeded - upgrade required' };
    }
  }

  /**
   * Record daily storage usage for billing tracking
   */
  async recordDailyUsage(organizationId, date = new Date()) {
    try {
      if (!organizationId) {
        throw new Error('Organization ID is required for daily usage recording');
      }

      const usage = await this.calculateStorageUsage(organizationId);
      const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

      // Calculate byte-hours for prorated billing
      const hoursInDay = 24;
      const byteHours = BigInt(Math.round(usage.bytesUsed * hoursInDay));

      // Calculate cost in USD
      const costUsd = (usage.gigabytesUsed * this.awsCostPerGB) / 30; // Daily cost

      // SECURITY FIX: Use withTenantContext for RLS enforcement
      await prismaService.withTenantContext(organizationId, async tx => {
        return await tx.storageUsage.upsert({
          where: {
            organizationId_date: {
              organizationId,
              date: dateOnly,
            },
          },
          update: {
            bytesStored: BigInt(usage.bytesUsed),
            byteHours,
            fileCount: usage.fileCount,
            costUsd,
            updatedAt: new Date(),
          },
          create: {
            organizationId,
            date: dateOnly,
            bytesStored: BigInt(usage.bytesUsed),
            byteHours,
            fileCount: usage.fileCount,
            costUsd,
          },
        });
      });

      logger.info('Daily storage usage recorded', {
        organizationId,
        date: dateOnly,
        bytesUsed: usage.bytesUsed,
        fileCount: usage.fileCount,
        costUsd,
      });

      return usage;
    } catch (error) {
      logger.error('Failed to record daily usage', { error: error.message, organizationId });
      throw error;
    }
  }

  /**
   * Calculate and record monthly overage charges
   */
  async calculateMonthlyOverage(organizationId, month = new Date()) {
    try {
      if (!organizationId) {
        throw new Error('Organization ID is required for monthly overage calculation');
      }

      const firstDayOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
      const lastDayOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0);

      // SECURITY FIX: Use system client for infrastructure data (organization/subscription)
      const systemPrisma = prismaService.getSystemClient();
      const organization = await systemPrisma.organization.findUnique({
        where: { id: organizationId },
        include: { subscription: true },
      });

      if (!organization) {
        throw new Error('Organization not found');
      }

      const plan = organization?.subscription?.plan || 'FREE';
      const config = this.getPlanStorageConfig(plan);

      // SECURITY FIX: Get average storage usage for the month with RLS
      const monthlyUsage = await prismaService.withTenantContext(organizationId, async tx => {
        return await tx.storageUsage.aggregate({
          where: {
            date: {
              gte: firstDayOfMonth,
              lte: lastDayOfMonth,
            },
            // organizationId handled by RLS
          },
          _avg: { bytesStored: true },
          _sum: { byteHours: true },
        });
      });

      const avgBytesUsed = parseInt(monthlyUsage._avg.bytesStored || 0);
      const totalByteHours = parseInt(monthlyUsage._sum.byteHours || 0);

      // Calculate overage
      const isOverLimit = avgBytesUsed > config.includedBytes;
      const overageBytes = isOverLimit ? avgBytesUsed - config.includedBytes : 0;
      const overageGB = overageBytes / (1024 * 1024 * 1024);
      const overageCost = config.overageRate && isOverLimit ? overageGB * config.overageRate : 0;

      // SECURITY FIX: Record overage with RLS enforcement
      const overageRecord = await prismaService.withTenantContext(organizationId, async tx => {
        return await tx.storageOverage.upsert({
          where: {
            organizationId_month: {
              organizationId,
              month: firstDayOfMonth,
            },
          },
          update: {
            includedBytes: BigInt(config.includedBytes),
            usedBytes: BigInt(avgBytesUsed),
            overageBytes: BigInt(overageBytes),
            overageRate: config.overageRate || 0,
            overageCost,
            updatedAt: new Date(),
          },
          create: {
            organizationId,
            month: firstDayOfMonth,
            includedBytes: BigInt(config.includedBytes),
            usedBytes: BigInt(avgBytesUsed),
            overageBytes: BigInt(overageBytes),
            overageRate: config.overageRate || 0,
            overageCost,
          },
        });
      });

      logger.info('Monthly overage calculated', {
        organizationId,
        month: firstDayOfMonth,
        avgBytesUsed,
        overageBytes,
        overageCost,
      });

      return {
        organization,
        period: { start: firstDayOfMonth, end: lastDayOfMonth },
        usage: { avgBytesUsed, totalByteHours },
        overage: { overageBytes, overageGB, overageCost },
        record: overageRecord,
      };
    } catch (error) {
      logger.error('Failed to calculate monthly overage', { error: error.message, organizationId });
      throw error;
    }
  }

  /**
   * Create Stripe invoice for storage overages
   */
  async createOverageInvoice(organizationId, month) {
    try {
      const overageData = await this.calculateMonthlyOverage(organizationId, month);

      if (overageData.overage.overageCost <= 0) {
        logger.info('No overage charges for organization', { organizationId, month });
        return null;
      }

      const organization = overageData.organization;
      if (!organization.subscription?.stripeCustomerId) {
        throw new Error('No Stripe customer ID found for organization');
      }

      // Create invoice item
      const invoiceItem = await stripe.invoiceItems.create({
        customer: organization.subscription.stripeCustomerId,
        amount: Math.round(overageData.overage.overageCost * 100), // Convert to cents
        currency: 'usd',
        description: `Storage overage charges for ${month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
        metadata: {
          organizationId,
          month: month.toISOString(),
          overageGB: overageData.overage.overageGB.toString(),
          overageRate: overageData.record.overageRate.toString(),
        },
      });

      // Create and finalize invoice
      const invoice = await stripe.invoices.create({
        customer: organization.subscription.stripeCustomerId,
        auto_advance: true,
        collection_method: 'charge_automatically',
        description: `Storage overage charges`,
      });

      const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);

      // SECURITY FIX: Mark overage as billed with RLS enforcement
      await prismaService.withTenantContext(organizationId, async tx => {
        return await tx.storageOverage.update({
          where: { id: overageData.record.id },
          data: {
            billed: true,
            billedAt: new Date(),
          },
        });
      });

      logger.info('Storage overage invoice created', {
        organizationId,
        month,
        invoiceId: finalizedInvoice.id,
        amount: overageData.overage.overageCost,
      });

      return {
        invoice: finalizedInvoice,
        overage: overageData,
      };
    } catch (error) {
      logger.error('Failed to create overage invoice', { error: error.message, organizationId });
      throw error;
    }
  }

  /**
   * Get storage analytics for an organization
   */
  async getStorageAnalytics(organizationId, days = 30) {
    try {
      if (!organizationId) {
        throw new Error('Organization ID is required for storage analytics');
      }

      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

      // SECURITY FIX: Use withTenantContext for RLS enforcement
      const usage = await prismaService.withTenantContext(organizationId, async tx => {
        return await tx.storageUsage.findMany({
          where: {
            date: {
              gte: startDate,
              lte: endDate,
            },
            // organizationId handled by RLS
          },
          orderBy: { date: 'asc' },
        });
      });

      const analytics = {
        organizationId,
        period: { start: startDate, end: endDate, days },
        usage: usage.map(u => ({
          date: u.date,
          bytesStored: parseInt(u.bytesStored),
          fileCount: u.fileCount,
          costUsd: parseFloat(u.costUsd),
        })),
        summary: {
          avgDailyUsage:
            usage.length > 0
              ? usage.reduce((sum, u) => sum + parseInt(u.bytesStored), 0) / usage.length
              : 0,
          maxUsage: usage.length > 0 ? Math.max(...usage.map(u => parseInt(u.bytesStored))) : 0,
          totalCost: usage.reduce((sum, u) => sum + parseFloat(u.costUsd), 0),
          growthRate: this.calculateGrowthRate(usage),
        },
      };

      return analytics;
    } catch (error) {
      logger.error('Failed to get storage analytics', { error: error.message, organizationId });
      throw error;
    }
  }

  /**
   * Calculate storage growth rate
   */
  calculateGrowthRate(usage) {
    if (usage.length < 2) return 0;

    const firstWeek = usage.slice(0, 7);
    const lastWeek = usage.slice(-7);

    const avgFirst =
      firstWeek.reduce((sum, u) => sum + parseInt(u.bytesStored), 0) / firstWeek.length;
    const avgLast = lastWeek.reduce((sum, u) => sum + parseInt(u.bytesStored), 0) / lastWeek.length;

    return avgFirst > 0 ? ((avgLast - avgFirst) / avgFirst) * 100 : 0;
  }

  /**
   * Cleanup old storage usage records - super admin only operation
   */
  async cleanupOldRecords(retentionDays = 365) {
    try {
      const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

      // SECURITY FIX: Use system client for global cleanup operations
      const systemPrisma = prismaService.getSystemClient();
      const deletedCount = await systemPrisma.storageUsage.deleteMany({
        where: {
          date: { lt: cutoffDate },
        },
      });

      logger.info('Old storage usage records cleaned up', {
        cutoffDate,
        deletedCount: deletedCount.count,
      });

      return deletedCount.count;
    } catch (error) {
      logger.error('Failed to cleanup old records', { error: error.message });
      throw error;
    }
  }

  /**
   * Get available storage add-on packs
   */
  getStorageAddOnPacks() {
    return [
      {
        id: 'storage_10gb',
        name: '10GB Storage Add-on',
        storageGb: 10,
        priceUsd: 2.0,
        description: 'Additional 10GB storage for one month',
      },
      {
        id: 'storage_50gb',
        name: '50GB Storage Add-on',
        storageGb: 50,
        priceUsd: 8.0,
        description: 'Additional 50GB storage for one month',
      },
      {
        id: 'storage_100gb',
        name: '100GB Storage Add-on',
        storageGb: 100,
        priceUsd: 15.0,
        description: 'Additional 100GB storage for one month',
      },
      {
        id: 'storage_500gb',
        name: '500GB Storage Add-on',
        storageGb: 500,
        priceUsd: 70.0,
        description: 'Additional 500GB storage for one month',
      },
    ];
  }

  /**
   * Purchase storage add-on pack
   */
  async purchaseStorageAddOn(organizationId, packId, paymentMethodId = null) {
    try {
      const addOnPacks = this.getStorageAddOnPacks();
      const selectedPack = addOnPacks.find(pack => pack.id === packId);

      if (!selectedPack) {
        throw new Error('Invalid storage add-on pack selected');
      }

      // SECURITY FIX: Use system client for infrastructure data (organization/subscription)
      const systemPrisma = prismaService.getSystemClient();
      const organization = await systemPrisma.organization.findUnique({
        where: { id: organizationId },
        include: { subscription: true },
      });

      if (!organization) {
        throw new Error('Organization not found');
      }

      if (!organization.subscription?.stripeCustomerId) {
        throw new Error('No Stripe customer ID found for organization');
      }

      // Create Stripe invoice item for storage purchase
      const invoiceItem = await stripe.invoiceItems.create({
        customer: organization.subscription.stripeCustomerId,
        amount: Math.round(selectedPack.priceUsd * 100), // Convert to cents
        currency: 'usd',
        description: selectedPack.description,
        metadata: {
          organizationId,
          packId: selectedPack.id,
          storageGb: selectedPack.storageGb.toString(),
          purchaseType: 'addon_pack',
        },
      });

      // Create and finalize invoice
      const invoice = await stripe.invoices.create({
        customer: organization.subscription.stripeCustomerId,
        auto_advance: true,
        collection_method: 'charge_automatically',
        description: `Storage add-on purchase: ${selectedPack.name}`,
        default_payment_method: paymentMethodId,
      });

      const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);

      // SECURITY FIX: Record storage purchase with RLS enforcement
      const purchase = await prismaService.withTenantContext(organizationId, async tx => {
        return await tx.storagePurchase.create({
          data: {
            organizationId,
            purchaseType: 'addon_pack',
            packId: selectedPack.id,
            storageGb: selectedPack.storageGb,
            pricePerGb: selectedPack.priceUsd / selectedPack.storageGb,
            totalCost: selectedPack.priceUsd,
            validFrom: new Date(),
            validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            stripePaymentIntent: finalizedInvoice.id,
            status: 'active',
          },
        });
      });

      logger.info('Storage add-on purchased successfully', {
        organizationId,
        packId: selectedPack.id,
        storageGb: selectedPack.storageGb,
        totalCost: selectedPack.priceUsd,
        invoiceId: finalizedInvoice.id,
      });

      return {
        purchase,
        invoice: finalizedInvoice,
        addOnPack: selectedPack,
      };
    } catch (error) {
      logger.error('Failed to purchase storage add-on', {
        error: error.message,
        organizationId,
        packId,
      });
      throw error;
    }
  }

  /**
   * Get organization's total available storage (plan + add-ons)
   */
  async getTotalAvailableStorage(organizationId) {
    try {
      // SECURITY FIX: Use system client for infrastructure data (organization/subscription)
      const systemPrisma = prismaService.getSystemClient();
      const organization = await systemPrisma.organization.findUnique({
        where: { id: organizationId },
        include: { subscription: true },
      });

      if (!organization) {
        throw new Error('Organization not found');
      }

      const plan = organization?.subscription?.plan || 'FREE';
      const baseStorageBytes = this.storageLimits[plan] || this.storageLimits.FREE;

      // SECURITY FIX: Get active storage purchases with RLS enforcement
      const activePurchases = await prismaService.withTenantContext(organizationId, async tx => {
        return await tx.storagePurchase.findMany({
          where: {
            status: 'active',
            validUntil: { gt: new Date() },
            // organizationId handled by RLS
          },
        });
      });

      const addOnStorageBytes = activePurchases.reduce(
        (total, purchase) => total + purchase.storageGb * 1024 * 1024 * 1024,
        0
      );

      return {
        baseStorageBytes,
        addOnStorageBytes,
        totalStorageBytes: baseStorageBytes + addOnStorageBytes,
        activePurchases,
      };
    } catch (error) {
      logger.error('Failed to calculate total available storage', {
        error: error.message,
        organizationId,
      });
      throw error;
    }
  }

  /**
   * Check enhanced storage quota including add-ons
   */
  async checkEnhancedStorageQuota(organizationId, additionalBytes = 0) {
    try {
      const storageInfo = await this.getTotalAvailableStorage(organizationId);
      const usage = await this.calculateStorageUsage(organizationId);

      const totalBytesWithUpload = usage.bytesUsed + additionalBytes;
      const isOverLimit = totalBytesWithUpload > storageInfo.totalStorageBytes;
      const overageBytes = isOverLimit ? totalBytesWithUpload - storageInfo.totalStorageBytes : 0;
      const overageGB = overageBytes / (1024 * 1024 * 1024);

      // SECURITY FIX: Use system client for infrastructure data (organization/subscription)
      const systemPrisma = prismaService.getSystemClient();
      const organization = await systemPrisma.organization.findUnique({
        where: { id: organizationId },
        include: { subscription: true },
      });

      const plan = organization?.subscription?.plan || 'FREE';
      const overageRate = this.overageRates[plan];
      const allowsOverages = overageRate !== null;

      // Calculate costs
      const estimatedMonthlyCost = allowsOverages && isOverLimit ? overageGB * overageRate : 0;

      return {
        organization: {
          id: organizationId,
          name: organization?.name,
          plan,
        },
        usage: {
          ...usage,
          totalBytesWithUpload,
        },
        storage: {
          baseStorageBytes: storageInfo.baseStorageBytes,
          addOnStorageBytes: storageInfo.addOnStorageBytes,
          totalStorageBytes: storageInfo.totalStorageBytes,
          activePurchases: storageInfo.activePurchases,
        },
        quota: {
          overageRate,
          allowsOverages,
        },
        overage: {
          isOverLimit,
          overageBytes,
          overageGB: Math.round(overageGB * 100) / 100,
          estimatedMonthlyCost: Math.round(estimatedMonthlyCost * 100) / 100,
        },
        quotaStatus: this.getQuotaStatus(
          totalBytesWithUpload,
          storageInfo.totalStorageBytes,
          allowsOverages
        ),
      };
    } catch (error) {
      logger.error('Failed to check enhanced storage quota', {
        error: error.message,
        organizationId,
      });
      throw error;
    }
  }

  /**
   * Expire old storage purchases - system-wide operation for background job
   */
  async expireOldPurchases() {
    try {
      const now = new Date();

      // SECURITY FIX: Use system client for global expiration operations
      const systemPrisma = prismaService.getSystemClient();
      const expiredCount = await systemPrisma.storagePurchase.updateMany({
        where: {
          status: 'active',
          validUntil: { lte: now },
        },
        data: {
          status: 'expired',
          updatedAt: now,
        },
      });

      logger.info('Expired old storage purchases', {
        expiredCount: expiredCount.count,
        timestamp: now,
      });

      return expiredCount.count;
    } catch (error) {
      logger.error('Failed to expire old purchases', { error: error.message });
      throw error;
    }
  }
}

module.exports = StorageBillingService;

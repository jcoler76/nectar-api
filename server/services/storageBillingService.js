/**
 * Storage Billing Service
 * Handles storage usage tracking, overage calculations, and billing integration
 */

const { PrismaClient } = require('@prisma/client');
const { logger } = require('../utils/logger');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const prisma = new PrismaClient();

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
      const usageQuery = await prisma.fileStorage.aggregate({
        where: { organizationId, isActive: true },
        _sum: { fileSize: true },
        _count: { id: true },
      });

      const bytesUsed = parseInt(usageQuery._sum.fileSize || 0);
      const fileCount = usageQuery._count.id || 0;

      return {
        bytesUsed,
        fileCount,
        megabytesUsed: Math.round(bytesUsed / 1024 / 1024),
        gigabytesUsed: bytesUsed / (1024 * 1024 * 1024),
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
      // Get organization and subscription plan
      const organization = await prisma.organization.findUnique({
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
      const usage = await this.calculateStorageUsage(organizationId);
      const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

      // Calculate byte-hours for prorated billing
      const hoursInDay = 24;
      const byteHours = BigInt(Math.round(usage.bytesUsed * hoursInDay));

      // Calculate cost in USD
      const costUsd = (usage.gigabytesUsed * this.awsCostPerGB) / 30; // Daily cost

      await prisma.storageUsage.upsert({
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
      const firstDayOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
      const lastDayOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0);

      // Get organization and plan
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        include: { subscription: true },
      });

      const plan = organization?.subscription?.plan || 'FREE';
      const config = this.getPlanStorageConfig(plan);

      // Get average storage usage for the month
      const monthlyUsage = await prisma.storageUsage.aggregate({
        where: {
          organizationId,
          date: {
            gte: firstDayOfMonth,
            lte: lastDayOfMonth,
          },
        },
        _avg: { bytesStored: true },
        _sum: { byteHours: true },
      });

      const avgBytesUsed = parseInt(monthlyUsage._avg.bytesStored || 0);
      const totalByteHours = parseInt(monthlyUsage._sum.byteHours || 0);

      // Calculate overage
      const isOverLimit = avgBytesUsed > config.includedBytes;
      const overageBytes = isOverLimit ? avgBytesUsed - config.includedBytes : 0;
      const overageGB = overageBytes / (1024 * 1024 * 1024);
      const overageCost = config.overageRate && isOverLimit ? overageGB * config.overageRate : 0;

      // Record overage
      const overageRecord = await prisma.storageOverage.upsert({
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

      // Mark overage as billed
      await prisma.storageOverage.update({
        where: { id: overageData.record.id },
        data: {
          billed: true,
          billedAt: new Date(),
        },
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
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

      const usage = await prisma.storageUsage.findMany({
        where: {
          organizationId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { date: 'asc' },
      });

      const analytics = {
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
   * Cleanup old storage usage records
   */
  async cleanupOldRecords(retentionDays = 365) {
    try {
      const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

      const deletedCount = await prisma.storageUsage.deleteMany({
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

      // Get organization and subscription
      const organization = await prisma.organization.findUnique({
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

      // Record storage purchase
      const purchase = await prisma.storagePurchase.create({
        data: {
          organizationId,
          purchaseType: 'addon_pack',
          packId: selectedPack.id,
          storageGb: selectedPack.storageGb,
          pricePerGb: selectedPack.priceUsd / selectedPack.storageGb,
          totalCost: selectedPack.priceUsd,
          purchaseDate: new Date(),
          expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          stripeInvoiceId: finalizedInvoice.id,
          isActive: true,
        },
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
      // Get base storage from plan
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        include: { subscription: true },
      });

      const plan = organization?.subscription?.plan || 'FREE';
      const baseStorageBytes = this.storageLimits[plan] || this.storageLimits.FREE;

      // Get active storage purchases
      const activePurchases = await prisma.storagePurchase.findMany({
        where: {
          organizationId,
          isActive: true,
          expirationDate: { gt: new Date() },
        },
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

      // Get organization for plan-specific overage rates
      const organization = await prisma.organization.findUnique({
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
   * Expire old storage purchases
   */
  async expireOldPurchases() {
    try {
      const now = new Date();

      const expiredCount = await prisma.storagePurchase.updateMany({
        where: {
          isActive: true,
          expirationDate: { lte: now },
        },
        data: {
          isActive: false,
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

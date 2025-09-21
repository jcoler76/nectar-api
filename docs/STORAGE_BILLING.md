# Storage Billing System Documentation

## Overview

The Nectar Studio storage billing system provides secure, cost-effective file storage with multi-tenant isolation and usage-based billing. This system prevents unlimited storage abuse while maintaining profitability through a base storage + overage rate model.

## Security Model

### Multi-Tenant Isolation

**File Segregation**: Files are stored in S3 with organization-specific prefixes:
```
s3://bucket/{organizationId}/{timestamp}-{randomId}-{filename}
```

**Database Isolation**: All file storage queries include `organizationId` filters:
```sql
WHERE organizationId = ? AND isActive = true
```

**API Security**: All endpoints require authentication and validate organization membership:
- JWT tokens contain `organizationId`
- Middleware validates user belongs to organization
- File access restricted to organization members

### Access Control

1. **Organization-Level**: Users can only access files within their organization
2. **File-Level**: Active files only (`isActive = true`)
3. **Share-Level**: Time-limited, password-protected sharing available
4. **Download Tracking**: Share link usage monitored and limited

## Billing Model

### Storage Limits by Plan

| Plan | Base Storage | Overage Rate | Overage Allowed |
|------|-------------|--------------|-----------------|
| FREE | 100MB | - | ❌ No |
| STARTER | 5GB | $0.10/GB/month | ✅ Yes |
| TEAM | 50GB | $0.08/GB/month | ✅ Yes |
| BUSINESS | 250GB | $0.06/GB/month | ✅ Yes |
| ENTERPRISE | 1TB | $0.05/GB/month | ✅ Yes |

### Cost Structure

**AWS Base Cost**: ~$0.023/GB/month (S3 Standard)
**Markup Strategy**: 2.17x - 4.35x markup ensures healthy profit margins
**Overage Philosophy**: Higher rates for lower plans encourage upgrades

### Storage Add-on Packages

| Package | Storage | Price | Duration |
|---------|---------|-------|----------|
| 10GB Add-on | 10GB | $2.00 | 30 days |
| 50GB Add-on | 50GB | $8.00 | 30 days |
| 100GB Add-on | 100GB | $15.00 | 30 days |
| 500GB Add-on | 500GB | $70.00 | 30 days |

## Implementation Architecture

### Core Components

1. **StorageBillingService** (`server/services/storageBillingService.js`)
   - Storage quota calculations
   - Overage billing logic
   - Add-on purchase management
   - Usage analytics

2. **Database Models**:
   - `StorageUsage`: Daily usage tracking
   - `StorageOverage`: Monthly overage calculations
   - `StoragePurchase`: Add-on purchase records

3. **API Endpoints** (`server/routes/fileStorage.js`):
   - `GET /api/files/storage/packages` - List add-on packages
   - `POST /api/files/storage/purchase` - Purchase storage add-ons
   - `GET /api/files/storage/info` - Enhanced storage information

4. **Scheduled Jobs** (`server/services/scheduler.js`):
   - Daily usage tracking (1 AM UTC)
   - Monthly overage calculation (1st of month, 6 AM UTC)
   - Daily purchase expiration (2 AM UTC)
   - Quarterly cleanup (every 3 months, 4 AM UTC)

### Database Schema

```sql
-- Daily storage usage tracking
model StorageUsage {
  id             String       @id @default(uuid())
  organizationId String
  date           DateTime     @db.Date
  bytesStored    BigInt       @default(0)
  byteHours      BigInt       @default(0) // For prorated billing
  fileCount      Int          @default(0)
  costUsd        Decimal      @db.Decimal(10, 4) @default(0.0000)

  @@unique([organizationId, date])
  @@index([organizationId])
  @@index([date])
}

-- Monthly overage calculations
model StorageOverage {
  id             String       @id @default(uuid())
  organizationId String
  month          DateTime     @db.Date
  includedBytes  BigInt
  usedBytes      BigInt
  overageBytes   BigInt       @default(0)
  overageRate    Decimal      @db.Decimal(6, 4)
  overageCost    Decimal      @db.Decimal(10, 2) @default(0.00)
  billed         Boolean      @default(false)
  billedAt       DateTime?

  @@unique([organizationId, month])
  @@index([organizationId])
  @@index([month])
}

-- Storage add-on purchases
model StoragePurchase {
  id                  String       @id @default(uuid())
  organizationId      String
  purchaseType        String       // 'addon_pack', 'overage_billing'
  packId              String?      // Reference to add-on pack
  storageGb           Int
  pricePerGb          Decimal      @db.Decimal(6, 4)
  totalCost           Decimal      @db.Decimal(10, 2)
  purchaseDate        DateTime     @default(now())
  expirationDate      DateTime
  stripeInvoiceId     String?
  isActive            Boolean      @default(true)

  @@index([organizationId])
  @@index([expirationDate])
  @@index([isActive])
}
```

## Security Safeguards

### Cost Protection

1. **No Unlimited Plans**: All plans have explicit storage limits
2. **FREE Plan Restrictions**: No overage allowed, forces upgrades
3. **Graduated Pricing**: Higher overage rates for lower plans
4. **Profit Margin Tracking**: Built-in cost analysis ensures profitability

### Abuse Prevention

1. **File Size Limits**: Individual file size restrictions
2. **Upload Rate Limiting**: API rate limiting prevents bulk abuse
3. **Organization Isolation**: Strict tenant separation
4. **Usage Monitoring**: Daily tracking with automated alerts

### Data Protection

1. **Encryption**: S3 server-side encryption enabled
2. **Access Logging**: All file operations logged
3. **Secure Deletion**: Soft deletes with cleanup procedures
4. **Share Controls**: Time-limited, password-protected sharing

## API Usage Examples

### Check Storage Quota

```javascript
GET /api/files/storage/info
Authorization: Bearer {token}

Response:
{
  "success": true,
  "storage": {
    "organization": {
      "id": "org-123",
      "name": "Example Org",
      "plan": "STARTER"
    },
    "usage": {
      "bytesUsed": 3221225472,
      "megabytesUsed": 3072,
      "gigabytesUsed": 3.0,
      "fileCount": 45
    },
    "limits": {
      "baseStorageBytes": 5368709120,
      "addOnStorageBytes": 10737418240,
      "totalStorageBytes": 16106127360
    },
    "quota": {
      "overageRate": 0.10,
      "allowsOverages": true
    },
    "overage": {
      "isOverLimit": false,
      "overageBytes": 0,
      "overageGB": 0,
      "estimatedMonthlyCost": 0
    },
    "quotaStatus": {
      "level": "normal",
      "message": "Storage usage is within normal limits"
    }
  }
}
```

### Purchase Storage Add-on

```javascript
POST /api/files/storage/purchase
Authorization: Bearer {token}
Content-Type: application/json

{
  "packId": "storage_10gb",
  "paymentMethodId": "pm_1234567890"
}

Response:
{
  "success": true,
  "message": "Storage add-on purchased successfully",
  "purchase": {
    "id": "purchase-123",
    "packId": "storage_10gb",
    "name": "10GB Storage Add-on",
    "storageGb": 10,
    "totalCost": 2.00,
    "expirationDate": "2024-02-15T00:00:00.000Z",
    "invoiceId": "in_1234567890"
  }
}
```

## Monitoring and Analytics

### Key Metrics

1. **Storage Usage Trends**: Daily/monthly growth patterns
2. **Overage Revenue**: Income from storage overages
3. **Plan Distribution**: Usage patterns by subscription tier
4. **Cost Analysis**: AWS costs vs. customer charges

### Alerts and Notifications

- Organizations approaching storage limits
- Unusual storage growth patterns
- Failed overage billing attempts
- High-cost storage usage anomalies

## Testing

### End-to-End Tests

Run comprehensive billing tests:
```bash
npm test tests/storage-billing-e2e.test.js
```

### Validation Script

Validate system configuration:
```bash
node validate-storage-billing.js
```

### Test Coverage

- ✅ Storage quota enforcement per plan
- ✅ Overage calculation accuracy
- ✅ Multi-tenant file isolation
- ✅ Add-on purchase functionality
- ✅ Usage tracking and billing reconciliation
- ✅ Cost protection mechanisms
- ✅ Security boundary validation

## Deployment Checklist

### Pre-Deployment

- [ ] Run validation script: `node validate-storage-billing.js`
- [ ] Execute end-to-end tests
- [ ] Verify database migrations applied
- [ ] Configure AWS S3 bucket and permissions
- [ ] Set environment variables:
  - `AWS_STORAGE_COST_PER_GB`
  - `STORAGE_MARKUP_MULTIPLIER`
  - `STRIPE_SECRET_KEY`

### Post-Deployment

- [ ] Monitor storage usage patterns
- [ ] Verify scheduled jobs running correctly
- [ ] Test file upload/download functionality
- [ ] Validate billing calculations
- [ ] Set up cost monitoring alerts

## Troubleshooting

### Common Issues

**"Storage limit exceeded" for valid uploads**:
- Check organization's plan and current usage
- Verify add-on purchases are active
- Confirm quota calculations include add-ons

**Overage calculations incorrect**:
- Review monthly usage aggregation
- Verify plan-specific overage rates
- Check for expired add-on purchases

**Multi-tenant isolation failures**:
- Validate organizationId in JWT tokens
- Check API middleware authentication
- Review database query filters

### Debug Tools

```javascript
// Check storage configuration for organization
const storageBillingService = new StorageBillingService();
const quota = await storageBillingService.checkEnhancedStorageQuota(orgId);
console.log(JSON.stringify(quota, null, 2));

// Validate storage limits
console.log(storageBillingService.storageLimits);
console.log(storageBillingService.overageRates);
```

## Support and Maintenance

### Regular Tasks

- Monthly review of AWS storage costs
- Quarterly analysis of profit margins
- Semi-annual review of storage limits and pricing
- Annual security audit of file access patterns

### Performance Optimization

- Monitor S3 request patterns
- Optimize database queries for usage calculations
- Review and adjust scheduled job frequencies
- Implement caching for frequently accessed storage info

---

*Last Updated: September 2025*
*Version: 1.0*
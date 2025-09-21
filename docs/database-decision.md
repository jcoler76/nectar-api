# Database Decision: MongoDB vs PostgreSQL for Nectar API SaaS

## Executive Summary
Recommendation: **Switch to PostgreSQL** as the primary application database while keeping MongoDB for specific use cases.

## Current State
- **MongoDB**: Currently used for user management, applications, roles, etc.
- **MSSQL**: Used for customer database connections
- **Architecture**: Document-based NoSQL for app data, relational for customer data

## PostgreSQL Advantages for Multi-Tenant SaaS

### 1. Multi-Tenancy Support
**PostgreSQL Wins**
- **Row-Level Security (RLS)**: Native support for tenant isolation
- **Schemas**: Can create separate schemas per tenant for complete isolation
- **Foreign Keys**: Enforce referential integrity across tenant boundaries
- **JSONB**: Flexible schema when needed, with indexing support

### 2. Transactional Integrity
**PostgreSQL Wins**
- **ACID Compliance**: Critical for billing, subscriptions, and financial data
- **Complex Transactions**: Multi-table updates with rollback support
- **Consistency**: Guaranteed consistency for subscription limits and usage tracking

### 3. Relational Data Modeling
**PostgreSQL Wins**
```
Organizations → Users (many-to-many via Memberships)
Organizations → Subscriptions (one-to-one)
Organizations → Database Connections (one-to-many)
Organizations → API Usage (one-to-many)
Subscriptions → Invoices (one-to-many)
```

### 4. Performance at Scale
**PostgreSQL Wins**
- **Query Optimization**: Sophisticated query planner
- **Indexing**: B-tree, Hash, GiST, SP-GiST, GIN, BRIN
- **Partitioning**: Table partitioning for large datasets
- **Connection Pooling**: PgBouncer for efficient connection management

### 5. Enterprise Features
**PostgreSQL Wins**
- **Compliance**: SOC2, HIPAA, PCI DSS ready
- **Audit Logging**: pgAudit extension
- **Encryption**: Transparent Data Encryption (TDE)
- **Backup**: Point-in-time recovery, streaming replication

### 6. Cost Efficiency
**PostgreSQL Wins**
- **Open Source**: No licensing costs
- **Resource Efficiency**: Better memory and CPU utilization
- **Hosting Options**: Cheaper on AWS RDS, Azure Database, Google Cloud SQL

## MongoDB Advantages

### 1. Current Implementation
- Already implemented and working
- Team familiarity
- No migration needed

### 2. Flexible Schema
- Easy to add fields without migrations
- Good for rapidly evolving features

### 3. Horizontal Scaling
- Built-in sharding
- Better for massive scale (10M+ users)

## Hybrid Approach (Recommended)

### Use PostgreSQL for:
- **Core Business Data**
  - Organizations/Workspaces
  - Users and Authentication
  - Subscriptions and Billing
  - API Keys and Permissions
  - Usage Metrics and Limits
  - Audit Logs

### Use MongoDB for:
- **Flexible/Large Data**
  - Workflow definitions (complex JSON)
  - API response caching
  - User activity logs
  - Generated artifacts
  - Schema intelligence data

### Keep MSSQL (and others) for:
- Customer database connections only

## Migration Strategy

### Phase 1: Setup (Week 1)
1. Set up PostgreSQL database
2. Install Prisma ORM
3. Design schema with multi-tenancy

### Phase 2: Model Creation (Week 2-3)
1. Create Prisma schema
2. Generate migrations
3. Build data access layer

### Phase 3: Data Migration (Week 4)
1. Write migration scripts
2. Test with sample data
3. Plan zero-downtime migration

### Phase 4: Gradual Rollout
1. New features use PostgreSQL
2. Migrate existing features incrementally
3. Keep MongoDB for specific use cases

## Database Schema Preview

```sql
-- Organizations (Tenants)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Users (can belong to multiple organizations)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Memberships (many-to-many relationship)
CREATE TABLE memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    organization_id UUID REFERENCES organizations(id),
    role VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, organization_id)
);

-- Subscriptions
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) UNIQUE,
    plan_id VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    stripe_subscription_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

-- Create policies for tenant isolation
CREATE POLICY tenant_isolation ON organizations
    FOR ALL
    USING (id IN (
        SELECT organization_id FROM memberships 
        WHERE user_id = current_user_id()
    ));
```

## Tooling Comparison

| Tool | PostgreSQL | MongoDB |
|------|------------|---------|
| ORM | Prisma, TypeORM, Sequelize | Mongoose |
| GUI | pgAdmin, TablePlus, DBeaver | MongoDB Compass |
| Hosting | RDS, Azure Database, Supabase | Atlas, DocumentDB |
| Migrations | Prisma Migrate, Flyway | mongoose-migrate |
| Monitoring | pg_stat_statements, pgBadger | MongoDB Atlas |

## Decision Matrix

| Criteria | Weight | PostgreSQL | MongoDB | Winner |
|----------|--------|------------|---------|--------|
| Multi-tenancy | 25% | 10/10 | 6/10 | PostgreSQL |
| ACID Transactions | 20% | 10/10 | 7/10 | PostgreSQL |
| Cost | 15% | 9/10 | 7/10 | PostgreSQL |
| Performance | 15% | 9/10 | 8/10 | PostgreSQL |
| Developer Experience | 10% | 8/10 | 9/10 | MongoDB |
| Migration Effort | 10% | 4/10 | 10/10 | MongoDB |
| Enterprise Features | 5% | 10/10 | 7/10 | PostgreSQL |

**Final Score**: PostgreSQL 8.6/10, MongoDB 7.4/10

## Recommendation

**Switch to PostgreSQL for core business data** while maintaining MongoDB for specific use cases. This hybrid approach gives us:

1. **Strong consistency** for critical business data
2. **Flexibility** for rapidly evolving features
3. **Cost optimization** with open-source solutions
4. **Enterprise readiness** for large customers
5. **Clear separation** of concerns

## Next Steps

1. ✅ Accept PostgreSQL as primary database
2. Set up PostgreSQL development environment
3. Design multi-tenant schema with Prisma
4. Create migration plan
5. Begin incremental implementation
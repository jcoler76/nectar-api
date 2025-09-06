const fs = require('fs').promises;
const path = require('path');
const Template20Intelligence = require('../models/Template20Intelligence');

/**
 * Schema Documentation Generator
 * Creates comprehensive developer documentation from template20 intelligence
 */
class SchemaDocumentationGenerator {
  constructor() {
    this.outputDir = path.join(process.cwd(), 'docs', 'template20-intelligence');
  }

  /**
   * Generate complete documentation set for developers
   */
  async generateCompleteDocs() {
    console.log('📚 Generating comprehensive template20 documentation...');

    try {
      // Ensure output directory exists
      await this.ensureOutputDirectory();

      // Get latest intelligence
      const intelligence = await Template20Intelligence.getLatestIntelligence();
      if (!intelligence) {
        throw new Error('No template20 intelligence found. Run analysis first.');
      }

      // Generate individual documentation files
      await Promise.all([
        this.generateOverviewDocs(intelligence),
        this.generateBusinessEntityDocs(intelligence),
        this.generateTableReferenceDocs(intelligence),
        this.generateProcedureReferenceDocs(intelligence),
        this.generateRelationshipDocs(intelligence),
        this.generateDeveloperPatternsDocs(intelligence),
        this.generateQuickStartGuide(intelligence),
        this.generateAPIReference(intelligence),
      ]);

      // Generate index file
      await this.generateIndexFile(intelligence);

      console.log(`✅ Documentation generated in: ${this.outputDir}`);

      return {
        success: true,
        outputDirectory: this.outputDir,
        filesGenerated: 8,
      };
    } catch (error) {
      console.error('❌ Documentation generation failed:', error);
      throw error;
    }
  }

  /**
   * Ensure output directory structure exists
   */
  async ensureOutputDirectory() {
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
      await fs.mkdir(path.join(this.outputDir, 'entities'), { recursive: true });
      await fs.mkdir(path.join(this.outputDir, 'tables'), { recursive: true });
      await fs.mkdir(path.join(this.outputDir, 'procedures'), { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }

  /**
   * Generate overview documentation
   */
  async generateOverviewDocs(intelligence) {
    const content = `# Template20 Database Intelligence Overview

> **Purpose**: Comprehensive developer reference for building new features and microservices using template20 database schema.

## Quick Stats

| Metric | Count |
|--------|-------|
| Tables | ${intelligence.schemaStats.totalTables} |
| Stored Procedures | ${intelligence.schemaStats.totalProcedures} |
| Views | ${intelligence.schemaStats.totalViews} |
| Relationships | ${intelligence.schemaStats.totalRelationships} |
| Business Entities | ${intelligence.schemaStats.businessEntitiesDetected} |

**Last Analyzed**: ${intelligence.lastFullAnalysis.toISOString()}  
**Analysis Version**: ${intelligence.analysisVersion}

## Business Entities Overview

${intelligence.businessEntities
  .map(
    entity => `
### ${entity.entityType.charAt(0).toUpperCase() + entity.entityType.slice(1)}
- **Primary Table**: \`${entity.primaryTable}\`
- **Business Concept**: ${entity.businessConcept}
- **Tables**: ${intelligence.getTablesForEntity(entity.entityType).length}
- **Procedures**: ${intelligence.getProceduresForEntity(entity.entityType).length}
- **Importance**: ${entity.businessImportance}/10
- **Confidence**: ${Math.round(entity.confidence * 100)}%
`
  )
  .join('\n')}

## Architecture Patterns

### Table Naming Convention
\`\`\`
gs{EntityName}     // Core business tables
gs{Entity}Type     // Lookup/reference tables  
gs{Entity}Items    // Detail/line item tables
\`\`\`

### Procedure Naming Convention
\`\`\`
usp{Entity}Get              // Get single record
usp{Entity}Save             // Insert/Update record
usp{Entity}Delete           // Delete record
usp{Entity}ByCriteriaGet    // Search with criteria
uspReport{Entity}{Type}Get  // Reporting procedures
\`\`\`

### Standard Audit Fields
All business tables include:
- \`CreatedDate\` (datetime)
- \`CreatedBy\` (int) - Foreign key to gsEmployees
- \`ModifiedDate\` (datetime)
- \`ModifiedBy\` (int) - Foreign key to gsEmployees

## Quick Start

1. **Identify Business Entity**: Choose from ${intelligence.businessEntities.map(e => e.entityType).join(', ')}
2. **Find Primary Table**: Use \`gs{Entity}\` pattern
3. **Locate Procedures**: Look for \`usp{Entity}*\` procedures
4. **Check Relationships**: Review foreign key connections
5. **Follow Patterns**: Use existing procedures as templates

## Related Documentation

- [Business Entities Reference](./business-entities.md)
- [Table Reference](./table-reference.md)
- [Procedure Reference](./procedure-reference.md)
- [Relationship Mapping](./relationships.md)
- [Developer Patterns](./developer-patterns.md)
- [Quick Start Guide](./quick-start.md)
- [API Reference](./api-reference.md)

---
*Generated on ${new Date().toISOString()} from template20 intelligence v${intelligence.analysisVersion}*
`;

    await fs.writeFile(path.join(this.outputDir, 'README.md'), content);
  }

  /**
   * Generate business entity documentation
   */
  async generateBusinessEntityDocs(intelligence) {
    let content = `# Business Entities Reference

This document provides detailed information about each business entity in the template20 database.

`;

    for (const entity of intelligence.businessEntities) {
      const tables = intelligence.getTablesForEntity(entity.entityType);
      const procedures = intelligence.getProceduresForEntity(entity.entityType, 0.6);
      const relationships = intelligence.relationships.filter(rel =>
        tables.some(t => t.tableName === rel.fromTable || t.tableName === rel.toTable)
      );

      content += `
## ${entity.entityType.charAt(0).toUpperCase() + entity.entityType.slice(1)}

**Business Concept**: ${entity.businessConcept}  
**Primary Table**: \`${entity.primaryTable}\`  
**Business Importance**: ${entity.businessImportance}/10  
**Analysis Confidence**: ${Math.round(entity.confidence * 100)}%

### Tables (${tables.length})

| Table | Importance | Columns | Est. Rows | Purpose |
|-------|------------|---------|-----------|---------|
${tables
  .map(
    table =>
      `| \`${table.tableName}\` | ${table.businessImportance} | ${table.columns.length} | ${table.estimatedRowCount.toLocaleString()} | ${this.inferTablePurpose(table)} |`
  )
  .join('\n')}

### Key Procedures (${procedures.filter(p => p.isActive && p.overallConfidence > 0.7).length} active)

| Procedure | Type | Confidence | Last Modified | Purpose |
|-----------|------|------------|---------------|---------|
${procedures
  .filter(p => p.isActive && p.overallConfidence > 0.7)
  .slice(0, 10)
  .map(
    proc =>
      `| \`${proc.procedureName}\` | ${proc.procedureType} | ${Math.round(proc.overallConfidence * 100)}% | ${proc.daysSinceModified} days ago | ${this.inferProcedurePurpose(proc)} |`
  )
  .join('\n')}

### Key Relationships (${relationships.length})

${relationships
  .slice(0, 8)
  .map(
    rel =>
      `- **${rel.fromTable}** → **${rel.toTable}** via \`${rel.joinColumn}\` (${rel.relationshipType})`
  )
  .join('\n')}

### Development Tips

${this.generateEntityDevelopmentTips(entity, tables, procedures)}

---
`;

      // Create individual entity file
      await fs.writeFile(
        path.join(this.outputDir, 'entities', `${entity.entityType}.md`),
        this.generateDetailedEntityDoc(entity, tables, procedures, relationships)
      );
    }

    await fs.writeFile(path.join(this.outputDir, 'business-entities.md'), content);
  }

  /**
   * Generate table reference documentation
   */
  async generateTableReferenceDocs(intelligence) {
    // Group tables by business entity
    const tablesByEntity = {};
    intelligence.tables.forEach(table => {
      const entity = table.businessEntity || 'unknown';
      if (!tablesByEntity[entity]) tablesByEntity[entity] = [];
      tablesByEntity[entity].push(table);
    });

    let content = `# Table Reference

Complete reference for all tables in template20 database, organized by business entity.

## Summary

| Business Entity | Tables | Total Columns | Avg Confidence |
|------------------|--------|---------------|----------------|
${Object.entries(tablesByEntity)
  .map(([entity, tables]) => {
    const totalColumns = tables.reduce((sum, t) => sum + t.columns.length, 0);
    const avgConfidence = Math.round(
      (tables.reduce((sum, t) => sum + t.confidence, 0) / tables.length) * 100
    );
    return `| ${entity} | ${tables.length} | ${totalColumns} | ${avgConfidence}% |`;
  })
  .join('\n')}

`;

    for (const [entityType, tables] of Object.entries(tablesByEntity)) {
      content += `
## ${entityType.charAt(0).toUpperCase() + entityType.slice(1)} Tables

${tables
  .map(table => {
    const primaryKeys = table.primaryKeys.join(', ');
    const foreignKeys = table.foreignKeys
      .map(fk => `${fk.columnName} → ${fk.referencedTable}`)
      .join(', ');

    return `
### \`${table.tableName}\`

**Business Importance**: ${table.businessImportance}  
**Estimated Rows**: ${table.estimatedRowCount.toLocaleString()}  
**Primary Keys**: ${primaryKeys || 'None'}  
**Foreign Keys**: ${foreignKeys || 'None'}

#### Columns (${table.columns.length})

| Column | Type | Nullable | Default | Business Role | Purpose |
|--------|------|----------|---------|---------------|---------|
${table.columns
  .map(
    col =>
      `| \`${col.columnName}\` | ${col.dataType}${col.maxLength ? `(${col.maxLength})` : ''} | ${col.isNullable ? 'Yes' : 'No'} | ${col.defaultValue || '-'} | ${col.businessRole} | ${this.inferColumnPurpose(col)} |`
  )
  .join('\n')}
`;
  })
  .join('\n')}
`;
    }

    await fs.writeFile(path.join(this.outputDir, 'table-reference.md'), content);
  }

  /**
   * Generate procedure reference documentation
   */
  async generateProcedureReferenceDocs(intelligence) {
    // Group procedures by confidence and type
    const activeProcedures = intelligence.procedures.filter(
      p => p.isActive && p.overallConfidence > 0.7
    );
    const proceduresByType = {};

    activeProcedures.forEach(proc => {
      const type = proc.procedureType || 'other';
      if (!proceduresByType[type]) proceduresByType[type] = [];
      proceduresByType[type].push(proc);
    });

    let content = `# Stored Procedure Reference

Reference for stored procedures in template20 database, organized by type and business entity.

## Summary

| Procedure Type | Count | Avg Confidence | Recent Modifications |
|----------------|-------|----------------|---------------------|
${Object.entries(proceduresByType)
  .map(([type, procs]) => {
    const avgConfidence = Math.round(
      (procs.reduce((sum, p) => sum + p.overallConfidence, 0) / procs.length) * 100
    );
    const recentMods = procs.filter(p => p.daysSinceModified < 90).length;
    return `| ${type} | ${procs.length} | ${avgConfidence}% | ${recentMods} |`;
  })
  .join('\n')}

## High-Confidence Procedures

### CRUD Operations

#### Get Procedures
${
  proceduresByType.get
    ?.slice(0, 10)
    .map(
      proc =>
        `- **\`${proc.procedureName}\`** (${Math.round(proc.overallConfidence * 100)}%) - ${this.inferProcedurePurpose(proc)}`
    )
    .join('\n') || 'None found'
}

#### Save Procedures  
${
  proceduresByType.save
    ?.slice(0, 10)
    .map(
      proc =>
        `- **\`${proc.procedureName}\`** (${Math.round(proc.overallConfidence * 100)}%) - ${this.inferProcedurePurpose(proc)}`
    )
    .join('\n') || 'None found'
}

#### Search Procedures
${
  proceduresByType.search
    ?.slice(0, 10)
    .map(
      proc =>
        `- **\`${proc.procedureName}\`** (${Math.round(proc.overallConfidence * 100)}%) - ${this.inferProcedurePurpose(proc)}`
    )
    .join('\n') || 'None found'
}

### Reporting Procedures
${
  proceduresByType.report
    ?.slice(0, 10)
    .map(
      proc =>
        `- **\`${proc.procedureName}\`** (${Math.round(proc.overallConfidence * 100)}%) - ${this.inferProcedurePurpose(proc)}`
    )
    .join('\n') || 'None found'
}

## Procedure Patterns

### Naming Conventions
- **usp{Entity}Get** - Retrieve single record by ID
- **usp{Entity}Save** - Insert or update record
- **usp{Entity}Delete** - Delete record by ID  
- **usp{Entity}ByCriteriaGet** - Search with multiple criteria
- **uspReport{Entity}{Type}Get** - Generate business reports

### Standard Parameters
- **@{Entity}ID** - Primary key parameter for Get/Save/Delete
- **@CreatedBy** / **@ModifiedBy** - User ID for audit trails
- **@PageSize** / **@PageNumber** - Pagination parameters
- **@SortColumn** / **@SortDirection** - Sorting parameters

## Recently Modified Procedures

| Procedure | Entity | Type | Days Since Modified | Confidence |
|-----------|--------|------|-------------------|------------|
${intelligence.procedures
  .filter(p => p.daysSinceModified < 90)
  .sort((a, b) => a.daysSinceModified - b.daysSinceModified)
  .slice(0, 15)
  .map(
    proc =>
      `| \`${proc.procedureName}\` | ${proc.businessEntity} | ${proc.procedureType} | ${proc.daysSinceModified} | ${Math.round(proc.overallConfidence * 100)}% |`
  )
  .join('\n')}

---
*Use these procedures as templates when building new features.*
`;

    await fs.writeFile(path.join(this.outputDir, 'procedure-reference.md'), content);
  }

  /**
   * Generate relationship documentation
   */
  async generateRelationshipDocs(intelligence) {
    const foreignKeyRels = intelligence.relationships.filter(
      r => r.discoveredFrom === 'foreign_key'
    );
    const viewRels = intelligence.relationships.filter(r => r.discoveredFrom === 'view_join');
    const highConfidenceRels = intelligence.relationships.filter(r => r.confidence >= 0.9);

    const content = `# Database Relationships

Understanding the relationships between tables in template20 database.

## Summary

| Relationship Type | Count | Avg Confidence |
|-------------------|-------|----------------|
| Foreign Key Constraints | ${foreignKeyRels.length} | ${Math.round((foreignKeyRels.reduce((sum, r) => sum + r.confidence, 0) / foreignKeyRels.length) * 100)}% |
| View-Based Relationships | ${viewRels.length} | ${Math.round((viewRels.reduce((sum, r) => sum + r.confidence, 0) / viewRels.length) * 100)}% |
| High Confidence (90%+) | ${highConfidenceRels.length} | - |

## Core Business Relationships

${highConfidenceRels
  .slice(0, 20)
  .map(
    rel => `
### ${rel.fromTable} → ${rel.toTable}

- **Relationship**: ${rel.relationshipType}
- **Join Column**: \`${rel.joinColumn}\`
- **Business Rule**: ${rel.businessRule}
- **Confidence**: ${Math.round(rel.confidence * 100)}%
- **Source**: ${rel.discoveredFrom}
${rel.sourceView ? `- **View**: \`${rel.sourceView}\`` : ''}
`
  )
  .join('\n')}

## Relationship Patterns

### Primary Entity Relationships

${this.generateRelationshipPatterns(intelligence)}

## Data Flow Diagrams

### Customer Entity Flow
\`\`\`
gsCustomers (1)
    ├── gsContracts (M) ────── gsContractItems (M)
    ├── gsInvoices (M) ────── gsInvoiceItems (M)
    ├── gsOpportunities (M)
    ├── gsActivities (M)
    └── gsAddresses (M)
\`\`\`

### Contract Lifecycle Flow
\`\`\`
gsOpportunities (1)
    └── gsContracts (1)
        ├── gsContractItems (M)
        ├── gsProduction (M)
        └── gsInvoices (M)
            ├── gsInvoiceItems (M)
            └── gsPayments (M)
\`\`\`

## Foreign Key Reference

| From Table | Column | References | Business Context |
|------------|--------|------------|------------------|
${foreignKeyRels
  .slice(0, 30)
  .map(
    rel =>
      `| \`${rel.fromTable}\` | \`${rel.joinColumn}\` | \`${rel.toTable}\` | ${rel.businessRule} |`
  )
  .join('\n')}

## Development Guidelines

### When Adding New Tables
1. **Follow naming patterns**: Use \`gs{Entity}\` prefix
2. **Include audit fields**: CreatedDate, CreatedBy, ModifiedDate, ModifiedBy
3. **Use proper foreign keys**: Reference existing entity IDs
4. **Consider relationships**: How does this table relate to core entities?

### When Joining Tables
1. **Use established relationships**: Prefer foreign key relationships
2. **Follow view patterns**: Look at existing vwCustomReport_* views
3. **Consider performance**: Index foreign key columns
4. **Maintain referential integrity**: Use proper constraints

---
*Generated from ${intelligence.relationships.length} discovered relationships*
`;

    await fs.writeFile(path.join(this.outputDir, 'relationships.md'), content);
  }

  /**
   * Generate developer patterns documentation
   */
  async generateDeveloperPatternsDocs(intelligence) {
    const content = `# Developer Patterns & Best Practices

Architectural patterns and best practices derived from template20 database analysis.

## Database Design Patterns

### Entity Naming Convention
\`\`\`sql
-- Core business tables
gs{Entity}           -- gsCustomers, gsContracts, gsInvoices
gs{Entity}Type       -- gsCustomersType, gsContractsType  
gs{Entity}Items      -- gsContractItems, gsInvoiceItems
gs{Entity}History    -- gsCustomersHistory, gsPaymentsHistory
\`\`\`

### Standard Table Structure
\`\`\`sql
CREATE TABLE gs{Entity} (
    gs{Entity}ID int IDENTITY(1,1) PRIMARY KEY,
    
    -- Business columns here
    {entity}Name nvarchar(100) NOT NULL,
    description nvarchar(500),
    isActive bit DEFAULT 1,
    
    -- Standard audit fields
    createdDate datetime DEFAULT GETDATE(),
    createdBy int REFERENCES gsEmployees(gsEmployeesID),
    modifiedDate datetime DEFAULT GETDATE(),
    modifiedBy int REFERENCES gsEmployees(gsEmployeesID)
);
\`\`\`

## Stored Procedure Patterns

### Get Single Record
\`\`\`sql
-- Pattern: usp{Entity}Get
CREATE PROCEDURE usp{Entity}Get
    @{Entity}ID int
AS
BEGIN
    SELECT * FROM gs{Entity} 
    WHERE gs{Entity}ID = @{Entity}ID
END
\`\`\`

### Save (Insert/Update) Record
\`\`\`sql
-- Pattern: usp{Entity}Save
CREATE PROCEDURE usp{Entity}Save
    @{Entity}ID int = NULL,
    @{Entity}Name nvarchar(100),
    @ModifiedBy int
AS
BEGIN
    IF @{Entity}ID IS NULL
        -- Insert new record
        INSERT INTO gs{Entity} ({entity}Name, createdBy, modifiedBy)
        VALUES (@{Entity}Name, @ModifiedBy, @ModifiedBy)
    ELSE
        -- Update existing record
        UPDATE gs{Entity} 
        SET {entity}Name = @{Entity}Name,
            modifiedDate = GETDATE(),
            modifiedBy = @ModifiedBy
        WHERE gs{Entity}ID = @{Entity}ID
END
\`\`\`

### Search with Criteria
\`\`\`sql
-- Pattern: usp{Entity}ByCriteriaGet
CREATE PROCEDURE usp{Entity}ByCriteriaGet
    @{Entity}Name nvarchar(100) = NULL,
    @IsActive bit = NULL,
    @PageSize int = 50,
    @PageNumber int = 1
AS
BEGIN
    SELECT * FROM gs{Entity}
    WHERE (@{Entity}Name IS NULL OR {entity}Name LIKE '%' + @{Entity}Name + '%')
      AND (@IsActive IS NULL OR isActive = @IsActive)
    ORDER BY {entity}Name
    OFFSET (@PageNumber - 1) * @PageSize ROWS
    FETCH NEXT @PageSize ROWS ONLY
END
\`\`\`

## Business Logic Patterns

### Customer-Centric Design
${this.generateCustomerPatterns(intelligence)}

### Audit Trail Implementation
${this.generateAuditPatterns(intelligence)}

### Status Management
${this.generateStatusPatterns(intelligence)}

## View Patterns

### Business Reporting Views
\`\`\`sql
-- Pattern: vwCustomReport_{Entity}
CREATE VIEW vwCustomReport_{Entity} AS
SELECT 
    e.gs{Entity}ID,
    e.{entity}Name,
    -- Include related data via joins
    c.gsCustomersID,
    c.customer,
    -- Calculated fields
    CASE 
        WHEN e.isActive = 1 THEN 'Active'
        ELSE 'Inactive'
    END as Status
FROM gs{Entity} e
INNER JOIN gsCustomers c ON e.gsCustomersID = c.gsCustomersID
WHERE e.isActive = 1
\`\`\`

## Common Anti-Patterns to Avoid

### ❌ Don't Do This
\`\`\`sql
-- Avoid direct table access
SELECT * FROM gsCustomers

-- Avoid inconsistent naming
CREATE TABLE Customer_Data

-- Avoid missing audit fields
CREATE TABLE gsNewEntity (
    id int,
    name nvarchar(50)
)
\`\`\`

### ✅ Do This Instead
\`\`\`sql
-- Use stored procedures
EXEC uspContactGet @gsCustomersID = 123

-- Follow naming conventions
CREATE TABLE gsCustomerData

-- Include standard audit fields
CREATE TABLE gsNewEntity (
    gsNewEntityID int IDENTITY(1,1) PRIMARY KEY,
    entityName nvarchar(100) NOT NULL,
    createdDate datetime DEFAULT GETDATE(),
    createdBy int REFERENCES gsEmployees(gsEmployeesID),
    modifiedDate datetime DEFAULT GETDATE(),
    modifiedBy int REFERENCES gsEmployees(gsEmployeesID)
)
\`\`\`

## Performance Patterns

### Indexing Strategy
\`\`\`sql
-- Primary key (automatic)
gs{Entity}ID

-- Foreign keys
gsCustomersID, gsContractsID, etc.

-- Business keys  
{entity}Name, {entity}Code

-- Date fields for reporting
createdDate, modifiedDate
\`\`\`

### Query Optimization
- Always use stored procedures for data access
- Include WHERE clauses to limit result sets
- Use pagination for large result sets
- Avoid SELECT * in production code
- Index foreign key columns

## Integration Patterns

### RESTful API Mapping
\`\`\`javascript
// GET /api/customers/:id
app.get('/api/customers/:id', async (req, res) => {
    const result = await sql.execute('uspContactGet', {
        gsCustomersID: req.params.id
    });
    res.json(result.recordset[0]);
});

// POST /api/customers
app.post('/api/customers', async (req, res) => {
    const result = await sql.execute('uspContactSave', {
        gsCustomersID: null,
        customer: req.body.name,
        modifiedBy: req.user.id
    });
    res.json({ success: true });
});
\`\`\`

---
*Follow these patterns when extending the template20 database or building new features.*
`;

    await fs.writeFile(path.join(this.outputDir, 'developer-patterns.md'), content);
  }

  /**
   * Generate quick start guide
   */
  async generateQuickStartGuide(intelligence) {
    const topTables = intelligence.tables
      .filter(t => t.businessImportance === 'critical')
      .slice(0, 5);

    const topProcedures = intelligence.procedures
      .filter(p => p.isActive && p.overallConfidence > 0.8)
      .slice(0, 10);

    const content = `# Quick Start Guide

Get up and running with template20 database for new feature development.

## 1. Understanding the Database

Template20 is the master database schema used across all customer environments. It contains:

- **${intelligence.schemaStats.totalTables} tables** organized by business entities
- **${intelligence.schemaStats.totalProcedures} stored procedures** for data access
- **${intelligence.schemaStats.totalViews} views** for reporting and analysis
- **${intelligence.schemaStats.businessEntitiesDetected} business entities** (customer, contract, invoice, etc.)

## 2. Key Tables to Know

| Table | Purpose | Columns | Importance |
|-------|---------|---------|------------|
${topTables
  .map(
    table =>
      `| \`${table.tableName}\` | ${this.inferTablePurpose(table)} | ${table.columns.length} | ${table.businessImportance} |`
  )
  .join('\n')}

## 3. Essential Procedures

| Procedure | Purpose | Confidence | Entity |
|-----------|---------|------------|--------|
${topProcedures
  .map(
    proc =>
      `| \`${proc.procedureName}\` | ${this.inferProcedurePurpose(proc)} | ${Math.round(proc.overallConfidence * 100)}% | ${proc.businessEntity} |`
  )
  .join('\n')}

## 4. Common Development Tasks

### Adding a New Feature Related to Customers

1. **Understand the Customer entity**:
   \`\`\`sql
   -- Get customer structure
   EXEC uspContactGet @gsCustomersID = 1
   \`\`\`

2. **Review related tables**:
   - \`gsCustomers\` - Main customer data
   - \`gsCustomersType\` - Customer categories
   - \`gsAddresses\` - Customer addresses
   - \`gsContacts\` - Contact information

3. **Follow naming patterns**:
   \`\`\`sql
   -- New table
   CREATE TABLE gsCustomerYourFeature (...)
   
   -- New procedure  
   CREATE PROCEDURE uspCustomerYourFeatureGet (...)
   \`\`\`

### Adding a New Business Entity

1. **Create main table**:
   \`\`\`sql
   CREATE TABLE gsYourEntity (
       gsYourEntityID int IDENTITY(1,1) PRIMARY KEY,
       yourEntityName nvarchar(100) NOT NULL,
       -- Add your business columns
       gsCustomersID int REFERENCES gsCustomers(gsCustomersID),
       isActive bit DEFAULT 1,
       -- Standard audit fields
       createdDate datetime DEFAULT GETDATE(),
       createdBy int REFERENCES gsEmployees(gsEmployeesID),
       modifiedDate datetime DEFAULT GETDATE(),
       modifiedBy int REFERENCES gsEmployees(gsEmployeesID)
   );
   \`\`\`

2. **Create CRUD procedures**:
   \`\`\`sql
   -- Get single record
   CREATE PROCEDURE uspYourEntityGet @gsYourEntityID int AS ...
   
   -- Save record
   CREATE PROCEDURE uspYourEntitySave @gsYourEntityID int = NULL, ... AS ...
   
   -- Search records  
   CREATE PROCEDURE uspYourEntityByCriteriaGet @yourEntityName nvarchar(100) = NULL, ... AS ...
   \`\`\`

3. **Create reporting view**:
   \`\`\`sql
   CREATE VIEW vwCustomReport_YourEntity AS
   SELECT 
       ye.gsYourEntityID,
       ye.yourEntityName,
       c.customer,
       ye.createdDate
   FROM gsYourEntity ye
   INNER JOIN gsCustomers c ON ye.gsCustomersID = c.gsCustomersID
   WHERE ye.isActive = 1
   \`\`\`

## 5. Database Connection

### Environment Variables
\`\`\`bash
TEMPLATE_DB_SERVER=AWSSQL1
TEMPLATE_DB_NAME=template20
TEMPLATE_DB_USER=your_username
TEMPLATE_DB_PASSWORD=your_password
\`\`\`

### Node.js Connection Example
\`\`\`javascript
const sql = require('mssql');

const config = {
    server: process.env.TEMPLATE_DB_SERVER,
    database: process.env.TEMPLATE_DB_NAME,
    user: process.env.TEMPLATE_DB_USER,
    password: process.env.TEMPLATE_DB_PASSWORD,
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};

const pool = await sql.connect(config);
const result = await pool.request()
    .input('gsCustomersID', sql.Int, 123)
    .execute('uspContactGet');
\`\`\`

## 6. API Development Pattern

### RESTful Endpoints
\`\`\`javascript
// GET /api/customers/:id
router.get('/customers/:id', async (req, res) => {
    const result = await sql.execute('uspContactGet', {
        gsCustomersID: req.params.id
    });
    res.json(result.recordset[0]);
});

// POST /api/customers  
router.post('/customers', async (req, res) => {
    await sql.execute('uspContactSave', {
        gsCustomersID: null,
        customer: req.body.name,
        modifiedBy: req.user.id
    });
    res.json({ success: true });
});
\`\`\`

## 7. Best Practices Checklist

- [ ] **Follow naming conventions**: \`gs{Entity}\`, \`usp{Entity}{Action}\`
- [ ] **Include audit fields**: createdDate, createdBy, modifiedDate, modifiedBy
- [ ] **Use stored procedures**: Never direct table access in applications
- [ ] **Add proper indexes**: Primary keys, foreign keys, business keys
- [ ] **Test relationships**: Ensure foreign key constraints work
- [ ] **Create views for reporting**: Follow \`vwCustomReport_\` pattern
- [ ] **Document your changes**: Update schema documentation

## 8. Getting Help

### API Endpoints for Intelligence
\`\`\`bash
# Get overview
GET /api/developer-intelligence/overview

# Get business entity details
GET /api/developer-intelligence/entity/customer

# Get table details  
GET /api/developer-intelligence/table/gsCustomers

# Get procedure details
GET /api/developer-intelligence/procedure/uspContactGet
\`\`\`

### Common Queries
\`\`\`sql
-- Find tables for an entity
SELECT tableName FROM template20Intelligence 
WHERE businessEntity = 'customer'

-- Find procedures by pattern
SELECT procedureName FROM sys.procedures 
WHERE name LIKE 'uspCustomer%'

-- Check table relationships
SELECT * FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS
WHERE CONSTRAINT_SCHEMA = 'dbo'
\`\`\`

---
**Next Steps**: 
1. Review [Business Entities](./business-entities.md) for detailed entity information
2. Check [Developer Patterns](./developer-patterns.md) for coding standards
3. Use [API Reference](./api-reference.md) for programmatic access
`;

    await fs.writeFile(path.join(this.outputDir, 'quick-start.md'), content);
  }

  /**
   * Generate API reference documentation
   */
  async generateAPIReference(intelligence) {
    const content = `# Developer Intelligence API Reference

RESTful API for accessing template20 database intelligence programmatically.

## Base URL
\`\`\`
http://localhost:3001/api/developer-intelligence
\`\`\`

## Authentication
Include JWT token in Authorization header:
\`\`\`
Authorization: Bearer your-jwt-token
\`\`\`

## Endpoints

### GET /overview
Get high-level database overview.

**Response:**
\`\`\`json
{
  "success": true,
  "data": {
    "summary": [
      {
        "entityType": "customer",
        "primaryTable": "gsCustomers",
        "tableCount": 5,
        "procedureCount": 12,
        "confidence": 0.95,
        "businessImportance": 10
      }
    ],
    "statistics": {
      "totalTables": ${intelligence.schemaStats.totalTables},
      "totalProcedures": ${intelligence.schemaStats.totalProcedures},
      "totalViews": ${intelligence.schemaStats.totalViews},
      "totalRelationships": ${intelligence.schemaStats.totalRelationships},
      "businessEntities": ${intelligence.schemaStats.businessEntitiesDetected}
    },
    "lastAnalyzed": "${intelligence.lastFullAnalysis.toISOString()}",
    "analysisVersion": "${intelligence.analysisVersion}"
  }
}
\`\`\`

### GET /business-entities
Get all business entities with details.

**Response:**
\`\`\`json
{
  "success": true,
  "data": [
    {
      "entityType": "customer",
      "businessConcept": "Customer relationship management",
      "primaryTable": "gsCustomers",
      "relatedTables": [...],
      "procedures": [...],
      "views": [...],
      "businessImportance": 10,
      "confidence": 0.95
    }
  ]
}
\`\`\`

### GET /entity/:entityType
Get detailed information about specific business entity.

**Parameters:**
- \`entityType\` - Business entity name (customer, contract, invoice, etc.)

**Example:**
\`\`\`bash
GET /api/developer-intelligence/entity/customer
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "data": {
    "entityInfo": {
      "entityType": "customer",
      "businessConcept": "Customer relationship management",
      "primaryTable": "gsCustomers",
      "businessImportance": 10,
      "confidence": 0.95
    },
    "schema": {
      "tables": [
        {
          "tableName": "gsCustomers",
          "businessImportance": "critical",
          "columns": [...],
          "primaryKeys": ["gsCustomersID"],
          "foreignKeys": [...],
          "estimatedRowCount": 15000
        }
      ]
    },
    "procedures": {
      "active": [...],
      "all": [...]
    },
    "relationships": [...],
    "developmentGuidance": {
      "newFeatureTips": [...],
      "commonPatterns": [...],
      "bestPractices": [...]
    }
  }
}
\`\`\`

### GET /table/:tableName
Get detailed table information.

**Parameters:**
- \`tableName\` - Database table name

**Example:**
\`\`\`bash
GET /api/developer-intelligence/table/gsCustomers
\`\`\`

### GET /procedure/:procedureName  
Get detailed procedure information.

**Parameters:**
- \`procedureName\` - Stored procedure name

**Example:**
\`\`\`bash
GET /api/developer-intelligence/procedure/uspContactGet
\`\`\`

### GET /relationships
Get table relationships.

**Query Parameters:**
- \`entityType\` (optional) - Filter by business entity
- \`confidence\` (optional) - Minimum confidence score (default: 0.7)

**Example:**
\`\`\`bash
GET /api/developer-intelligence/relationships?entityType=customer&confidence=0.8
\`\`\`

### POST /analyze
Trigger fresh analysis of template20 database.

**Request:**
\`\`\`json
{}
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "message": "Analysis completed successfully",
  "data": {
    "intelligenceId": "507f1f77bcf86cd799439011",
    "summary": {
      "totalTables": 156,
      "totalProcedures": 423,
      "totalViews": 45,
      "totalRelationships": 189,
      "businessEntitiesFound": 8,
      "highConfidenceProcedures": 287
    },
    "duration": 15420
  }
}
\`\`\`

### GET /patterns
Get architectural and naming patterns.

**Response:**
\`\`\`json
{
  "success": true,
  "data": {
    "naming": {
      "tables": {
        "pattern": "gs{EntityName}",
        "examples": ["gsCustomers", "gsContracts", "gsInvoices"],
        "description": "All business tables use gs prefix"
      },
      "procedures": {
        "patterns": [
          {
            "pattern": "usp{Entity}Get",
            "description": "Retrieve single record",
            "examples": ["uspContactGet", "uspContractGet"]
          }
        ]
      }
    },
    "businessEntities": [...],
    "relationships": {
      "foreignKeys": 89,
      "businessRules": [...]
    }
  }
}
\`\`\`

## Error Responses

### 404 Not Found
\`\`\`json
{
  "success": false,
  "message": "No template20 intelligence found. Run analysis first."
}
\`\`\`

### 500 Internal Server Error
\`\`\`json
{
  "success": false,
  "message": "Failed to get developer overview",
  "error": "Connection timeout"
}
\`\`\`

## Usage Examples

### JavaScript/Node.js
\`\`\`javascript
const axios = require('axios');

// Get business entities
const response = await axios.get('http://localhost:3001/api/developer-intelligence/business-entities', {
  headers: {
    'Authorization': 'Bearer your-jwt-token'
  }
});

console.log(response.data.data);
\`\`\`

### Python
\`\`\`python
import requests

headers = {'Authorization': 'Bearer your-jwt-token'}
response = requests.get('http://localhost:3001/api/developer-intelligence/overview', headers=headers)
data = response.json()

print(data['data']['statistics'])
\`\`\`

### curl
\`\`\`bash
curl -H "Authorization: Bearer your-jwt-token" \\
     http://localhost:3001/api/developer-intelligence/entity/customer
\`\`\`

---
*Use this API to programmatically access template20 intelligence in your development tools and workflows.*
`;

    await fs.writeFile(path.join(this.outputDir, 'api-reference.md'), content);
  }

  /**
   * Generate main index file
   */
  async generateIndexFile(intelligence) {
    const content = `# Template20 Database Intelligence Documentation

> **Generated**: ${new Date().toISOString()}  
> **Analysis Version**: ${intelligence.analysisVersion}  
> **Database**: template20 on AWSSQL1

Welcome to the comprehensive developer reference for the template20 database. This documentation provides deep insights into the database structure, business logic, and development patterns.

## 📚 Documentation Index

### Getting Started
- **[Quick Start Guide](./quick-start.md)** - Get up and running quickly
- **[Overview](./README.md)** - High-level database overview
- **[Developer Patterns](./developer-patterns.md)** - Best practices and coding standards

### Reference Documentation  
- **[Business Entities](./business-entities.md)** - Core business entities and their relationships
- **[Table Reference](./table-reference.md)** - Complete table documentation
- **[Procedure Reference](./procedure-reference.md)** - Stored procedure documentation
- **[Relationships](./relationships.md)** - Database relationship mapping

### API & Integration
- **[API Reference](./api-reference.md)** - RESTful API for programmatic access
- **[Integration Patterns](./developer-patterns.md#integration-patterns)** - Common integration approaches

## 🎯 Quick Navigation

### By Business Entity
${intelligence.businessEntities
  .map(
    entity =>
      `- **[${entity.entityType.charAt(0).toUpperCase() + entity.entityType.slice(1)}](./entities/${entity.entityType}.md)** - ${entity.businessConcept}`
  )
  .join('\n')}

### By Development Task
- **Building Customer Features** → [Customer Entity](./entities/customer.md)
- **Adding Billing Logic** → [Invoice Entity](./entities/invoice.md)
- **Sales Pipeline Features** → [Contract Entity](./entities/contract.md)
- **Production Workflow** → [Production Entity](./entities/production.md)

## 📊 Database Statistics

| Metric | Count | Notes |
|--------|-------|-------|
| Tables | ${intelligence.schemaStats.totalTables} | ${intelligence.tables.filter(t => t.businessImportance === 'critical').length} critical business tables |
| Stored Procedures | ${intelligence.schemaStats.totalProcedures} | ${intelligence.procedures.filter(p => p.isActive && p.overallConfidence > 0.8).length} high-confidence active procedures |
| Views | ${intelligence.schemaStats.totalViews} | Business reporting and analysis |
| Relationships | ${intelligence.schemaStats.totalRelationships} | ${intelligence.relationships.filter(r => r.confidence > 0.9).length} high-confidence relationships |
| Business Entities | ${intelligence.schemaStats.businessEntitiesDetected} | Core business domains |

## 🚀 API Quick Access

Base URL: \`http://localhost:3001/api/developer-intelligence\`

\`\`\`bash
# Get overview
curl -H "Authorization: Bearer token" /overview

# Get customer entity details  
curl -H "Authorization: Bearer token" /entity/customer

# Get table details
curl -H "Authorization: Bearer token" /table/gsCustomers

# Trigger fresh analysis
curl -X POST -H "Authorization: Bearer token" /analyze
\`\`\`

## 🔧 Development Workflow

1. **Identify Business Entity** - Choose from customer, contract, invoice, payment, opportunity, production
2. **Review Entity Documentation** - Understand tables, procedures, and relationships  
3. **Follow Naming Patterns** - Use established gs{Entity} and usp{Entity}{Action} conventions
4. **Use Existing Procedures** - Build on proven patterns and high-confidence procedures
5. **Test Relationships** - Ensure proper foreign key relationships and business logic

## 📁 File Structure

\`\`\`
docs/template20-intelligence/
├── README.md                    # Database overview
├── quick-start.md              # Getting started guide
├── business-entities.md        # Business entity reference
├── table-reference.md          # Complete table documentation
├── procedure-reference.md      # Stored procedure reference
├── relationships.md            # Database relationships
├── developer-patterns.md       # Best practices and patterns
├── api-reference.md           # API documentation
└── entities/                   # Individual entity documentation
    ├── customer.md
    ├── contract.md
    ├── invoice.md
    ├── payment.md
    ├── opportunity.md
    └── production.md
\`\`\`

## 🤝 Contributing

This documentation is automatically generated from template20 database analysis. To update:

1. Make schema changes in template20 database
2. Run fresh analysis: \`POST /api/developer-intelligence/analyze\`
3. Regenerate docs: \`POST /api/developer-intelligence/generate-docs\`

## ⚡ Performance Notes

- Analysis covers ${intelligence.schemaStats.totalTables} tables and ${intelligence.schemaStats.totalProcedures} procedures
- ${Math.round((intelligence.procedures.filter(p => p.overallConfidence > 0.8).length / intelligence.procedures.length) * 100)}% of procedures have high confidence scores
- ${Math.round((intelligence.relationships.filter(r => r.confidence > 0.9).length / intelligence.relationships.length) * 100)}% of relationships have high confidence scores

---
*This documentation serves as the definitive reference for building features and microservices using the template20 database schema.*
`;

    await fs.writeFile(path.join(this.outputDir, 'index.md'), content);
  }

  // Helper methods for generating documentation content

  generateDetailedEntityDoc(entity, tables, procedures, relationships) {
    return `# ${entity.entityType.charAt(0).toUpperCase() + entity.entityType.slice(1)} Entity

**Business Concept**: ${entity.businessConcept}  
**Primary Table**: \`${entity.primaryTable}\`  
**Business Importance**: ${entity.businessImportance}/10  
**Analysis Confidence**: ${Math.round(entity.confidence * 100)}%

## Overview

${this.getEntityDescription(entity.entityType)}

## Tables (${tables.length})

${tables
  .map(
    table => `
### \`${table.tableName}\`

**Purpose**: ${this.inferTablePurpose(table)}  
**Importance**: ${table.businessImportance}  
**Estimated Rows**: ${table.estimatedRowCount.toLocaleString()}

#### Schema
${table.columns
  .map(
    col =>
      `- **\`${col.columnName}\`** (${col.dataType}${col.maxLength ? `(${col.maxLength})` : ''}) - ${this.inferColumnPurpose(col)}${col.isPrimaryKey ? ' [PK]' : ''}${col.isForeignKey ? ' [FK]' : ''}`
  )
  .join('\n')}
`
  )
  .join('\n')}

## Procedures (${procedures.length})

### Active Procedures (${procedures.filter(p => p.isActive).length})

${procedures
  .filter(p => p.isActive && p.overallConfidence > 0.7)
  .map(
    proc => `
#### \`${proc.procedureName}\`
- **Type**: ${proc.procedureType}
- **Confidence**: ${Math.round(proc.overallConfidence * 100)}%
- **Last Modified**: ${proc.daysSinceModified} days ago
- **Purpose**: ${this.inferProcedurePurpose(proc)}
`
  )
  .join('\n')}

## Relationships (${relationships.length})

${relationships
  .map(
    rel => `
### ${rel.fromTable} → ${rel.toTable}
- **Type**: ${rel.relationshipType}
- **Join**: \`${rel.joinColumn}\`
- **Rule**: ${rel.businessRule}
- **Confidence**: ${Math.round(rel.confidence * 100)}%
`
  )
  .join('\n')}

## Development Guide

### Creating New ${entity.entityType.charAt(0).toUpperCase() + entity.entityType.slice(1)} Features

1. **Start with \`${entity.primaryTable}\`** - This is the core table for ${entity.entityType} data
2. **Follow naming patterns**: 
   - Tables: \`gs${entity.entityType.charAt(0).toUpperCase() + entity.entityType.slice(1)}YourFeature\`
   - Procedures: \`usp${entity.entityType.charAt(0).toUpperCase() + entity.entityType.slice(1)}YourFeatureAction\`
3. **Use existing procedures as templates**:
${procedures
  .filter(p => p.isActive)
  .slice(0, 3)
  .map(p => `   - \`${p.procedureName}\` for ${p.procedureType} operations`)
  .join('\n')}

### Common Patterns

${this.generateEntityCommonPatterns(entity, tables, procedures)}

---
*Use this entity reference when building ${entity.entityType}-related features.*
`;
  }

  getEntityDescription(entityType) {
    const descriptions = {
      customer:
        'The customer entity manages all customer relationship data including contact information, addresses, and business relationships. This is typically the starting point for most business operations.',
      contract:
        'The contract entity handles sales agreements, opportunities, and business deals. It connects customers to revenue-generating activities.',
      invoice:
        'The invoice entity manages billing, accounts receivable, and payment tracking. Critical for financial operations and cash flow.',
      payment:
        'The payment entity tracks all payment transactions, receipts, and financial reconciliation activities.',
      opportunity:
        'The opportunity entity manages the sales pipeline, lead tracking, and business development activities.',
      production:
        'The production entity handles job management, workflow stages, and manufacturing/service delivery processes.',
    };
    return (
      descriptions[entityType] ||
      'Core business entity for data management and business operations.'
    );
  }

  inferTablePurpose(table) {
    const name = table.tableName.toLowerCase();
    if (name.includes('type') || name.includes('category')) return 'Lookup/reference data';
    if (name.includes('items') || name.includes('detail')) return 'Line item details';
    if (name.includes('history') || name.includes('audit')) return 'Historical tracking';
    if (name.includes('address')) return 'Location information';
    if (name.includes('contact')) return 'Contact information';
    return 'Core business data';
  }

  inferColumnPurpose(column) {
    const name = column.columnName.toLowerCase();
    if (name.endsWith('id')) return 'Identifier/reference';
    if (name.includes('name') || name.includes('title')) return 'Display name';
    if (name.includes('date') || name.includes('time')) return 'Date/time tracking';
    if (name.includes('amount') || name.includes('total')) return 'Financial amount';
    if (name.includes('status') || name.includes('state')) return 'Status indicator';
    if (name.includes('description') || name.includes('comment')) return 'Descriptive text';
    if (name.includes('created') || name.includes('modified')) return 'Audit trail';
    return 'Business data';
  }

  inferProcedurePurpose(procedure) {
    const name = procedure.procedureName.toLowerCase();
    const type = procedure.procedureType;

    if (type === 'get') return 'Retrieve record(s)';
    if (type === 'save') return 'Insert/update record';
    if (type === 'delete') return 'Remove record';
    if (type === 'search') return 'Search with criteria';
    if (type === 'report') return 'Generate report';
    if (type === 'validation') return 'Validate data';

    return 'Business operation';
  }

  generateEntityDevelopmentTips(entity, tables, procedures) {
    return [
      `Primary table for new features: ${entity.primaryTable}`,
      `Related tables available: ${tables.length}`,
      `Active procedures to reference: ${procedures.filter(p => p.isActive).length}`,
      `Business importance level: ${entity.businessImportance}/10`,
    ];
  }

  generateCustomerPatterns(intelligence) {
    return `
**Core Pattern**: Customer-centric design where most business entities relate back to gsCustomers

\`\`\`sql
-- Customer → Contract → Invoice flow
gsCustomers (1) → gsContracts (M) → gsInvoices (M)

-- Customer → Opportunity → Contract flow  
gsCustomers (1) → gsOpportunities (M) → gsContracts (1)
\`\`\`
`;
  }

  generateAuditPatterns(intelligence) {
    return `
**Standard Audit Fields**: All business tables include audit trail

\`\`\`sql
createdDate datetime DEFAULT GETDATE()
createdBy int REFERENCES gsEmployees(gsEmployeesID)  
modifiedDate datetime DEFAULT GETDATE()
modifiedBy int REFERENCES gsEmployees(gsEmployeesID)
\`\`\`
`;
  }

  generateStatusPatterns(intelligence) {
    return `
**Status Management**: Boolean flags and lookup tables

\`\`\`sql
-- Boolean status flags
isActive bit DEFAULT 1
isDeleted bit DEFAULT 0

-- Status lookup tables
gs{Entity}Status → gs{Entity}.statusID
\`\`\`
`;
  }

  generateRelationshipPatterns(intelligence) {
    const patterns = [];

    // Group relationships by pattern
    const customerRels = intelligence.relationships.filter(
      r => r.fromTable === 'gsCustomers' || r.toTable === 'gsCustomers'
    );

    if (customerRels.length > 0) {
      patterns.push(`
**Customer Entity Relationships**:
${customerRels
  .slice(0, 5)
  .map(r => `- ${r.fromTable} → ${r.toTable} (${r.relationshipType})`)
  .join('\n')}
`);
    }

    return patterns.join('\n');
  }

  generateEntityCommonPatterns(entity, tables, procedures) {
    return `
**Table Naming**: ${tables
      .map(t => t.tableName)
      .slice(0, 3)
      .join(', ')}...
**Procedure Naming**: ${procedures
      .slice(0, 3)
      .map(p => p.procedureName)
      .join(', ')}...
**Primary Key**: gs${entity.primaryTable.replace('gs', '')}ID
**Foreign Key Pattern**: Reference other entities via gs{Entity}ID
`;
  }
}

module.exports = SchemaDocumentationGenerator;

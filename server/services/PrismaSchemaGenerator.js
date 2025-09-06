const Template20Intelligence = require('../models/Template20Intelligence');
const fs = require('fs').promises;
const path = require('path');

/**
 * Prisma Schema Generator
 * Generates Prisma schema files from Template20 intelligence for AI coding assistants
 */
class PrismaSchemaGenerator {
  constructor() {
    this.schemaPath = path.join(__dirname, '../prisma/schema.prisma');
    this.generatedPath = path.join(__dirname, '../prisma/generated');
    this.version = 'v1.0-ai-optimized';
  }

  /**
   * Generate selective Prisma schema from a specific selection
   */
  async generateSelectiveSchema(selection, options = {}) {
    console.log(`🎯 Generating selective Prisma schema for "${selection.selectionName}"...`);

    const {
      includeRelationships = true,
      includeComments = true,
      generateMultipleSchemas = true,
      optimizeForAI = true,
    } = options;

    try {
      const startTime = Date.now();

      // Get intelligence for filtering
      const intelligence = await Template20Intelligence.getLatestIntelligence();
      if (!intelligence) {
        throw new Error('No Template20 intelligence found. Run template20-sync first.');
      }

      // Filter intelligence based on selection
      const filteredIntelligence = this.filterIntelligenceBySelection(intelligence, selection);

      // Ensure output directory exists
      const selectionOutputPath = path.join(
        this.generatedPath,
        'selections',
        selection.selectionName
      );
      await fs.mkdir(selectionOutputPath, { recursive: true });

      // Step 1: Generate base schema configuration
      console.log('⚙️ Step 1: Generating base configuration...');
      const baseSchema = this.generateBaseConfiguration();

      // Step 2: Generate models from selected tables
      console.log('🏗️ Step 2: Generating table models for selection...');
      const tableModels = this.generateTableModels(filteredIntelligence.tables, includeComments);

      // Step 3: Generate relationships for selected tables
      let relationshipModels = '';
      if (includeRelationships) {
        console.log('🔗 Step 3: Generating relationships for selection...');
        relationshipModels = this.generateRelationships(
          filteredIntelligence.relationships,
          filteredIntelligence.tables
        );
      }

      // Step 4: Generate AI-specific documentation
      let aiDocumentation = '';
      if (optimizeForAI) {
        console.log('🤖 Step 4: Generating AI documentation...');
        aiDocumentation = this.generateAIDocumentation(
          filteredIntelligence,
          selection.selectionName
        );
      }

      // Step 5: Combine and write schema
      const completeSchema = [aiDocumentation, baseSchema, tableModels, relationshipModels].join(
        '\n\n'
      );

      const schemaFile = path.join(selectionOutputPath, 'schema.prisma');
      await fs.writeFile(schemaFile, completeSchema);

      // Step 6: Generate entity-specific schemas if requested
      const outputFiles = [schemaFile];
      if (generateMultipleSchemas) {
        console.log('📁 Step 6: Generating entity-specific schemas...');
        const entitySchemas = await this.generateEntitySchemas(
          filteredIntelligence,
          selectionOutputPath
        );
        outputFiles.push(...entitySchemas);
      }

      const duration = Date.now() - startTime;
      console.log(`✅ Selective Prisma generation completed in ${duration}ms`);

      return {
        success: true,
        selectionName: selection.selectionName,
        tablesGenerated: selection.selectedTables.length,
        outputFiles,
        generationTime: duration,
      };
    } catch (error) {
      console.error('❌ Selective Prisma generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate complete Prisma schema from Template20 intelligence
   */
  async generateSchemaFromIntelligence(options = {}) {
    console.log('📋 Generating Prisma schema from Template20 intelligence...');

    const {
      includeRelationships = true,
      includeComments = true,
      generateMultipleSchemas = true,
      optimizeForAI = true,
    } = options;

    try {
      const startTime = Date.now();

      // Get latest Template20 intelligence
      const intelligence = await Template20Intelligence.getLatestIntelligence();
      if (!intelligence) {
        throw new Error('No Template20 intelligence found. Run template20-sync first.');
      }

      // Step 1: Generate base schema configuration
      console.log('⚙️ Step 1: Generating base configuration...');
      const baseSchema = this.generateBaseConfiguration();

      // Step 2: Generate models from table intelligence
      console.log('🏗️ Step 2: Generating table models...');
      const tableModels = this.generateTableModels(intelligence.tables, includeComments);

      // Step 3: Generate relationships
      let relationshipModels = '';
      if (includeRelationships) {
        console.log('🔗 Step 3: Generating relationships...');
        relationshipModels = this.generateRelationships(
          intelligence.relationships,
          intelligence.tables
        );
      }

      // Step 4: Generate AI-optimized metadata
      let aiMetadata = '';
      if (optimizeForAI) {
        console.log('🤖 Step 4: Generating AI metadata...');
        aiMetadata = this.generateAIMetadata(intelligence);
      }

      // Step 5: Combine and write schema
      console.log('📝 Step 5: Writing schema file...');
      const fullSchema = [baseSchema, aiMetadata, tableModels, relationshipModels].join('\n\n');

      await fs.writeFile(this.schemaPath, fullSchema, 'utf8');

      // Step 6: Generate entity-specific schemas if requested
      let entitySchemas = [];
      if (generateMultipleSchemas) {
        console.log('📊 Step 6: Generating entity-specific schemas...');
        entitySchemas = await this.generateEntitySpecificSchemas(intelligence);
      }

      const duration = Date.now() - startTime;
      console.log(`✅ Prisma schema generation completed in ${duration}ms`);

      return {
        success: true,
        schemaPath: this.schemaPath,
        entitySchemas,
        statistics: this.generateSchemaStatistics(intelligence),
        duration,
        nextSteps: this.getNextSteps(),
      };
    } catch (error) {
      console.error('❌ Prisma schema generation failed:', error);
      throw new Error(`Schema generation failed: ${error.message}`);
    }
  }

  /**
   * Generate base Prisma configuration
   */
  generateBaseConfiguration() {
    return `// Prisma Schema for Template20 Database
// Generated from MongoDB Template20 Intelligence
// Version: ${this.version}
// Generated: ${new Date().toISOString()}

generator client {
  provider = "prisma-client-js"
  output   = "./generated/client"
}

generator docs {
  provider = "prisma-docs-generator"
  output   = "./generated/docs"
}

datasource db {
  provider = "sqlserver"
  url      = env("TEMPLATE20_DATABASE_URL")
}

// AI Assistant Configuration
// This schema is optimized for AI coding assistants like Claude, GPT, and Cursor
// Each model includes business context and usage examples`;
  }

  /**
   * Generate table models with AI-friendly documentation
   */
  generateTableModels(tables, includeComments = true) {
    const models = [];

    // Group tables by business entity for better organization
    const tablesByEntity = this.groupTablesByEntity(tables);

    for (const [entityType, entityTables] of Object.entries(tablesByEntity)) {
      if (entityTables.length === 0) continue;

      models.push(`// ${entityType.toUpperCase()} BUSINESS ENTITY`);
      models.push(`// Tables related to ${entityType} management and operations`);
      models.push('');

      for (const table of entityTables) {
        const model = this.generateSingleTableModel(table, includeComments);
        models.push(model);
        models.push('');
      }
    }

    return models.join('\n');
  }

  /**
   * Generate a single table model
   */
  generateSingleTableModel(table, includeComments = true) {
    const modelName = this.toPascalCase(table.tableName);
    const lines = [];

    // Add business context comment
    if (includeComments) {
      lines.push(`/// ${this.generateTableDescription(table)}`);
      lines.push(`/// Business Entity: ${table.businessEntity || 'unknown'}`);
      lines.push(`/// Importance: ${table.businessImportance || 'reference'}`);
      if (table.estimatedRowCount > 0) {
        lines.push(`/// Estimated Records: ${table.estimatedRowCount.toLocaleString()}`);
      }
      lines.push('');
    }

    // Model definition
    lines.push(`model ${modelName} {`);

    // Generate fields from columns
    const fields = this.generateModelFields(table.columns, includeComments);
    lines.push(fields);

    // Add generated metadata
    if (includeComments) {
      lines.push('');
      lines.push('  // Generated metadata');
      lines.push(`  @@map("${table.tableName}")`);

      // Add business entity tag
      if (table.businessEntity) {
        lines.push(`  @@schema("dbo") // Business entity: ${table.businessEntity}`);
      }
    }

    lines.push('}');

    return lines.join('\n');
  }

  /**
   * Generate model fields from table columns
   */
  generateModelFields(columns = [], includeComments = true) {
    if (!columns || columns.length === 0) {
      return '  // No column information available\n  id String @id // Placeholder';
    }

    const fields = [];

    for (const column of columns) {
      const field = this.generateField(column, includeComments);
      fields.push(field);
    }

    return fields.join('\n');
  }

  /**
   * Generate a single field definition
   */
  generateField(column, includeComments = true) {
    const fieldName = this.toCamelCase(column.columnName);
    const fieldType = this.mapSqlTypeToPrisma(column.dataType, column.isNullable);
    const attributes = this.generateFieldAttributes(column);

    let line = `  ${fieldName} ${fieldType}${attributes}`;

    // Add business context comment
    if (includeComments && column.businessRole && column.businessRole !== 'other') {
      line += ` // ${column.businessRole}`;
      if (column.isBusinessKey) {
        line += ' (business key)';
      }
    }

    return line;
  }

  /**
   * Generate field attributes (@id, @default, etc.)
   */
  generateFieldAttributes(column) {
    const attributes = [];

    if (column.isPrimaryKey) {
      attributes.push('@id');
    }

    if (column.defaultValue && column.defaultValue !== 'NULL') {
      const defaultValue = this.formatDefaultValue(column.defaultValue, column.dataType);
      if (defaultValue) {
        attributes.push(`@default(${defaultValue})`);
      }
    }

    if (column.maxLength && this.isStringType(column.dataType)) {
      // Only add @db.VarChar for non-standard lengths
      if (column.maxLength !== 255 && column.maxLength !== -1) {
        attributes.push(`@db.VarChar(${column.maxLength})`);
      }
    }

    return attributes.length > 0 ? ' ' + attributes.join(' ') : '';
  }

  /**
   * Generate relationships between models
   */
  generateRelationships(relationships, tables) {
    const relationshipLines = [];

    relationshipLines.push('// RELATIONSHIPS');
    relationshipLines.push('// Generated from view analysis and foreign key discovery');
    relationshipLines.push('');

    const processedRelationships = new Set();

    for (const rel of relationships) {
      if (rel.confidence < 0.7) continue; // Only high-confidence relationships

      const relationshipKey = `${rel.fromTable}-${rel.toTable}`;
      if (processedRelationships.has(relationshipKey)) continue;
      processedRelationships.add(relationshipKey);

      const fromModel = this.toPascalCase(rel.fromTable);
      const toModel = this.toPascalCase(rel.toTable);

      relationshipLines.push(`// ${rel.businessRule || `${fromModel} relates to ${toModel}`}`);
      relationshipLines.push(
        `// Confidence: ${(rel.confidence * 100).toFixed(1)}% | Discovered via: ${rel.discoveredFrom}`
      );

      // Add relationship field to source model (this would require model modification)
      // For now, we'll generate as comments for AI context
      relationshipLines.push(
        `// ${fromModel}.${this.toCamelCase(toModel)} ${this.mapRelationshipType(rel.relationshipType)}`
      );
      relationshipLines.push('');
    }

    return relationshipLines.join('\n');
  }

  /**
   * Generate AI-optimized metadata
   */
  generateAIMetadata(intelligence) {
    const lines = [];

    lines.push('// AI ASSISTANT METADATA');
    lines.push('// Business intelligence for AI coding assistants');
    lines.push('');

    // Business entities summary
    lines.push('/// BUSINESS ENTITIES SUMMARY:');
    for (const entity of intelligence.businessEntities) {
      const procedures = intelligence.getProceduresForEntity(entity.entityType, 0.7);
      lines.push(
        `/// - ${entity.entityType}: ${entity.businessConcept} (${procedures.length} procedures)`
      );
    }
    lines.push('');

    // Common query patterns
    lines.push('/// COMMON QUERY PATTERNS:');
    lines.push('/// - Customer lookup: Customer.findUnique({ where: { id } })');
    lines.push('/// - Invoice with payments: Invoice.findMany({ include: { payments: true } })');
    lines.push(
      '/// - Contract details: Contract.findFirst({ include: { customer: true, opportunities: true } })'
    );
    lines.push('');

    // Procedure recommendations
    lines.push('/// STORED PROCEDURE INTEGRATION:');
    lines.push(
      '/// Use Template20Intelligence.getProceduresForEntity() to find relevant procedures'
    );
    lines.push('/// High-confidence procedures are recommended for data operations');
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Generate entity-specific schema files
   */
  async generateEntitySpecificSchemas(intelligence) {
    const entitySchemas = [];

    // Ensure generated directory exists
    await fs.mkdir(this.generatedPath, { recursive: true });

    for (const entity of intelligence.businessEntities) {
      try {
        const entityTables = intelligence.getTablesForEntity(entity.entityType);
        const entityProcedures = intelligence.getProceduresForEntity(entity.entityType, 0.5);

        if (entityTables.length === 0) continue;

        const schemaContent = this.generateEntitySchema(entity, entityTables, entityProcedures);
        const filePath = path.join(this.generatedPath, `${entity.entityType}.prisma`);

        await fs.writeFile(filePath, schemaContent, 'utf8');

        entitySchemas.push({
          entityType: entity.entityType,
          filePath,
          tableCount: entityTables.length,
          procedureCount: entityProcedures.length,
        });
      } catch (error) {
        console.warn(`Failed to generate schema for ${entity.entityType}:`, error.message);
      }
    }

    return entitySchemas;
  }

  /**
   * Generate schema for specific business entity
   */
  generateEntitySchema(entity, tables, procedures) {
    const lines = [];

    lines.push(`// ${entity.entityType.toUpperCase()} ENTITY SCHEMA`);
    lines.push(`// ${entity.businessConcept}`);
    lines.push(`// Generated: ${new Date().toISOString()}`);
    lines.push('');

    // Entity overview
    lines.push('/// ENTITY OVERVIEW:');
    lines.push(`/// Business Importance: ${entity.businessImportance}/10`);
    lines.push(`/// Primary Table: ${entity.primaryTable}`);
    lines.push(`/// Total Tables: ${tables.length}`);
    lines.push(`/// Available Procedures: ${procedures.length}`);
    lines.push('');

    // Tables for this entity
    lines.push('/// TABLES:');
    for (const table of tables) {
      const model = this.generateSingleTableModel(table, true);
      lines.push(model);
      lines.push('');
    }

    // Procedures for this entity
    lines.push('/// RECOMMENDED PROCEDURES:');
    for (const proc of procedures.slice(0, 10)) {
      // Top 10 procedures
      lines.push(
        `/// - ${proc.procedureName} (confidence: ${(proc.overallConfidence * 100).toFixed(1)}%)`
      );
      if (proc.parameters && proc.parameters.length > 0) {
        lines.push(`///   Parameters: ${proc.parameters.map(p => p.parameterName).join(', ')}`);
      }
    }
    lines.push('');

    // Usage examples
    lines.push('/// USAGE EXAMPLES:');
    lines.push(
      `/// const ${entity.entityType}s = await prisma.${this.toCamelCase(entity.primaryTable)}.findMany()`
    );
    lines.push(
      `/// const ${entity.entityType} = await prisma.${this.toCamelCase(entity.primaryTable)}.findUnique({ where: { id } })`
    );

    return lines.join('\n');
  }

  // Helper methods
  groupTablesByEntity(tables) {
    const grouped = {};

    for (const table of tables) {
      const entity = table.businessEntity || 'unknown';
      if (!grouped[entity]) {
        grouped[entity] = [];
      }
      grouped[entity].push(table);
    }

    return grouped;
  }

  toPascalCase(str) {
    return str.replace(/(?:^|_)(.)/g, (_, char) => char.toUpperCase());
  }

  toCamelCase(str) {
    const pascal = this.toPascalCase(str);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
  }

  mapSqlTypeToPrisma(sqlType, isNullable = true) {
    const nullable = isNullable ? '?' : '';

    const typeMap = {
      int: 'Int',
      bigint: 'BigInt',
      smallint: 'Int',
      tinyint: 'Int',
      bit: 'Boolean',
      decimal: 'Decimal',
      numeric: 'Decimal',
      money: 'Decimal',
      float: 'Float',
      real: 'Float',
      varchar: 'String',
      nvarchar: 'String',
      char: 'String',
      nchar: 'String',
      text: 'String',
      ntext: 'String',
      datetime: 'DateTime',
      datetime2: 'DateTime',
      date: 'DateTime',
      time: 'DateTime',
      uniqueidentifier: 'String',
      varbinary: 'Bytes',
      image: 'Bytes',
    };

    const baseType = sqlType.toLowerCase().split('(')[0];
    return (typeMap[baseType] || 'String') + nullable;
  }

  mapRelationshipType(relType) {
    const typeMap = {
      'one-to-one': '1:1',
      'one-to-many': '1:N',
      'many-to-one': 'N:1',
      'many-to-many': 'N:N',
    };
    return typeMap[relType] || '1:N';
  }

  generateTableDescription(table) {
    const entity = table.businessEntity || 'business';
    const importance = table.businessImportance || 'reference';

    return `${table.tableName} - ${entity} entity table (${importance} importance)`;
  }

  formatDefaultValue(defaultValue, dataType) {
    if (!defaultValue || defaultValue === 'NULL') return null;

    // Remove SQL Server default value syntax
    let value = defaultValue.replace(/^\(|\)$/g, '').replace(/^'|'$/g, '');

    if (dataType.toLowerCase().includes('int') || dataType.toLowerCase().includes('decimal')) {
      return value;
    }

    if (dataType.toLowerCase().includes('bit')) {
      return value === '1' ? 'true' : 'false';
    }

    return `"${value}"`;
  }

  isStringType(dataType) {
    return (
      dataType.toLowerCase().includes('varchar') ||
      dataType.toLowerCase().includes('char') ||
      dataType.toLowerCase().includes('text')
    );
  }

  generateSchemaStatistics(intelligence) {
    return {
      totalModels: intelligence.tables.length,
      businessEntities: intelligence.businessEntities.length,
      relationships: intelligence.relationships.filter(r => r.confidence >= 0.7).length,
      procedures: intelligence.procedures.length,
      highConfidenceProcedures: intelligence.procedures.filter(p => p.overallConfidence >= 0.8)
        .length,
    };
  }

  getNextSteps() {
    return [
      'Run: npx prisma generate (to create TypeScript client)',
      'Run: npx prisma studio (to explore data visually)',
      'Import: import { PrismaClient } from "@prisma/client"',
      'Use: Template20Intelligence API for procedure recommendations',
    ];
  }

  /**
   * Filter intelligence data based on selection (same logic as GraphQL generator)
   */
  filterIntelligenceBySelection(intelligence, selection) {
    const selectedTableNames = selection.selectedTables.map(t => t.tableName);
    const selectedViewNames = selection.selectedViews.map(v => v.viewName);
    const selectedProcedureNames = selection.selectedProcedures.map(p => p.procedureName);

    // Filter intelligence data
    const filteredIntelligence = {
      ...intelligence,
      tables: intelligence.tables.filter(table => selectedTableNames.includes(table.tableName)),
      views: intelligence.views.filter(view => selectedViewNames.includes(view.viewName)),
      procedures: intelligence.procedures.filter(procedure =>
        selectedProcedureNames.includes(procedure.procedureName)
      ),
      relationships: intelligence.relationships.filter(
        rel =>
          selectedTableNames.includes(rel.fromTable) ||
          selectedTableNames.includes(rel.toTable) ||
          selectedViewNames.includes(rel.fromTable) ||
          selectedViewNames.includes(rel.toTable)
      ),
      businessEntities: intelligence.businessEntities.filter(entity => {
        // Include business entities that have selected tables/procedures
        const hasSelectedTables = entity.keyTables?.some(table =>
          selectedTableNames.includes(table)
        );
        const hasSelectedProcedures = entity.keyProcedures?.some(proc =>
          selectedProcedureNames.includes(proc)
        );
        return hasSelectedTables || hasSelectedProcedures;
      }),
    };

    return filteredIntelligence;
  }

  /**
   * Generate AI documentation for selective schema
   */
  generateAIDocumentation(filteredIntelligence, selectionName) {
    const totalTables = filteredIntelligence.tables.length;
    const totalViews = filteredIntelligence.views.length;
    const totalProcedures = filteredIntelligence.procedures.length;

    return `// Prisma Schema - ${selectionName} Selection
// Generated from Template20 Intelligence
// 
// Selection Statistics:
// - Tables: ${totalTables}
// - Views: ${totalViews} 
// - Procedures: ${totalProcedures}
// - Generated: ${new Date().toISOString()}
//
// Business Entities:
${filteredIntelligence.businessEntities.map(entity => `// - ${entity.entityType}: ${entity.primaryTable} (${entity.keyTables?.length || 0} tables)`).join('\n')}
//
// AI Coding Assistant Notes:
// This schema is optimized for AI understanding with:
// - Clear business entity separation
// - Comprehensive field documentation
// - Relationship mapping
// - Business logic context
//
// Use this schema to understand the business domain and generate appropriate Prisma operations.`;
  }

  /**
   * Generate schema for specific object selection (new method for selective generation)
   */
  static async generateForSelection(templateService, selectionFilter) {
    try {
      const generator = new PrismaSchemaGenerator();

      // Create a mock intelligence structure from the filtered objects
      const intelligence = await generator.createIntelligenceFromSelection(
        templateService,
        selectionFilter
      );

      // Generate schema components
      const baseConfig = generator.generateBaseConfiguration();
      const models = await generator.generateSelectiveModels(intelligence, true);

      const fullSchema = `${baseConfig}\n\n${models}`;

      return {
        success: true,
        data: {
          schema: fullSchema,
          metadata: {
            tablesIncluded: selectionFilter.tables.length,
            viewsIncluded: selectionFilter.views.length,
            proceduresIncluded: selectionFilter.procedures.length,
            generatedAt: new Date(),
            version: generator.version,
          },
        },
      };
    } catch (error) {
      console.error('Error generating Prisma schema for selection:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Create intelligence structure from object selection
   */
  async createIntelligenceFromSelection(templateService, selectionFilter) {
    const databaseService = require('../utils/databaseConnectionManager');

    // Get table schemas for selected tables
    const businessEntities = [];
    const relationships = [];

    for (const tableName of selectionFilter.tables) {
      try {
        // Get table schema
        const columnQuery = `
          SELECT 
            COLUMN_NAME as name,
            DATA_TYPE as dataType,
            IS_NULLABLE as isNullable,
            CHARACTER_MAXIMUM_LENGTH as maxLength,
            NUMERIC_PRECISION as precision,
            NUMERIC_SCALE as scale,
            COLUMN_DEFAULT as defaultValue,
            COLUMNPROPERTY(OBJECT_ID(TABLE_SCHEMA+'.'+TABLE_NAME), COLUMN_NAME, 'IsIdentity') as isIdentity
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_NAME = '${tableName}'
          ORDER BY ORDINAL_POSITION
        `;

        const columnResult = await databaseService.executeQuery(templateService, columnQuery);
        const columns = columnResult.recordset || [];

        // Create business entity for this table
        const entityType = tableName
          .toLowerCase()
          .replace(/^tbl|^t_/, '')
          .replace(/_/g, '');
        businessEntities.push({
          entityType,
          primaryTable: tableName,
          keyTables: [tableName],
          confidence: 0.9,
          businessImportance: 'selected',
          procedureCount: 0,
          keyProcedures: selectionFilter.procedures.filter(
            proc =>
              proc.toLowerCase().includes(entityType) ||
              proc.toLowerCase().includes(tableName.toLowerCase())
          ),
          columns: columns.map(col => ({
            name: col.name,
            type: this.mapSqlTypeToPrisma(col.dataType, col.isNullable === 'YES'),
            isNullable: col.isNullable === 'YES',
            isIdentity: col.isIdentity === 1,
            maxLength: col.maxLength,
            description: `${col.name} field from ${tableName}`,
            source: 'selection',
          })),
        });
      } catch (error) {
        console.warn(`Failed to get schema for table ${tableName}:`, error.message);
      }
    }

    return {
      businessEntities,
      relationships,
      procedures: selectionFilter.procedures.map(proc => ({
        name: proc,
        entityType: 'general',
        confidence: 0.8,
        parameters: [],
        description: `Procedure ${proc} selected for generation`,
      })),
      intelligence: {
        lastUpdated: new Date(),
        source: 'selection',
        version: 'selective-1.0',
      },
    };
  }

  /**
   * Map SQL types to Prisma types
   */
  mapSqlTypeToPrisma(sqlType, isNullable = false) {
    const typeMap = {
      int: 'Int',
      integer: 'Int',
      bigint: 'BigInt',
      smallint: 'Int',
      tinyint: 'Int',
      decimal: 'Decimal',
      numeric: 'Decimal',
      float: 'Float',
      real: 'Float',
      money: 'Decimal',
      varchar: 'String',
      nvarchar: 'String',
      char: 'String',
      nchar: 'String',
      text: 'String',
      ntext: 'String',
      uniqueidentifier: 'String',
      datetime: 'DateTime',
      datetime2: 'DateTime',
      date: 'DateTime',
      time: 'DateTime',
      bit: 'Boolean',
    };

    const baseType = typeMap[sqlType.toLowerCase()] || 'String';
    return isNullable ? `${baseType}?` : baseType;
  }

  /**
   * Generate Prisma schema for a specific package
   */
  static async generateForPackage(packageData, templateConfig) {
    try {
      const generator = new PrismaSchemaGenerator();

      // Create a selection-like structure from package data
      const selection = {
        selectionName: packageData.packageName,
        selectedTables: packageData.tables.map(t => t.tableName),
        selectedViews: packageData.views.map(v => v.viewName),
        selectedProcedures: packageData.procedures.map(p => p.procedureName),
      };

      // Generate the schema using existing selective generation
      const result = await generator.generateSelectiveSchema(selection, {
        includeRelationships: true,
        includeComments: true,
        generateMultipleSchemas: false,
        optimizeForAI: true,
      });

      if (result.success) {
        // Read the generated content
        const schemaPath = path.join(
          generator.generatedPath,
          'selections',
          packageData.packageName,
          'schema.prisma'
        );
        const content = await fs.readFile(schemaPath, 'utf8');

        return {
          success: true,
          content,
          fileName: `${packageData.packageName}-schema.prisma`,
          packageName: packageData.packageName,
        };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error generating Prisma schema for package:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Generate incremental Prisma schema updates for continuous deployment
   */
  static async generateIncrementalUpdate(packageData, existingSchema = '') {
    try {
      const newResult = await this.generateForPackage(packageData);

      if (!newResult.success) {
        throw new Error(newResult.error);
      }

      // If we have existing schema, merge it intelligently
      if (existingSchema) {
        const mergedContent = await this.mergeSchemas(
          existingSchema,
          newResult.content,
          packageData.packageName
        );
        return {
          success: true,
          content: mergedContent,
          fileName: newResult.fileName,
          packageName: packageData.packageName,
          updateType: 'incremental',
        };
      }

      return {
        ...newResult,
        updateType: 'new',
      };
    } catch (error) {
      console.error('Error generating incremental Prisma schema update:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Intelligently merge existing and new Prisma schemas
   */
  static async mergeSchemas(existingSchema, newSchema, packageName) {
    // For Prisma schemas, we need to be more careful about merging
    // Extract the models section from new schema
    const modelRegex = /model\s+\w+\s*{[^}]*}/g;
    const newModels = newSchema.match(modelRegex) || [];

    // Extract the base configuration (generator, datasource)
    const baseConfigRegex = /(generator\s+\w+\s*{[^}]*}|datasource\s+\w+\s*{[^}]*})/g;
    const baseConfigs = newSchema.match(baseConfigRegex) || [];

    const timestamp = new Date().toISOString();

    return `
// Schema for package: ${packageName}
// Last updated: ${timestamp}
// Update type: Incremental merge

${baseConfigs.join('\n\n')}

${newModels.join('\n\n')}

// Previous schema preserved below as comments for reference
${existingSchema
  .split('\n')
  .map(line => `// ${line}`)
  .join('\n')}
    `.trim();
  }

  /**
   * Generate package-specific model with column filtering
   */
  static async generatePackageModel(packageData, tableName, selectedColumns = []) {
    try {
      // If no specific columns selected, include all
      if (selectedColumns.length === 0) {
        return this.generateStandardModel(tableName);
      }

      // Generate model with only selected columns
      const modelName = this.toPascalCase(tableName);
      const fields = selectedColumns
        .map(column => {
          const fieldType = this.mapSqlTypeToPrisma(column.dataType, column.isRequired === false);
          const attributes = [];

          if (column.isPrimaryKey) {
            attributes.push('@id');
          }

          if (column.defaultValue) {
            attributes.push(`@default(${column.defaultValue})`);
          }

          const attributeStr = attributes.length > 0 ? ` ${attributes.join(' ')}` : '';
          return `  ${column.columnName} ${fieldType}${attributeStr}`;
        })
        .join('\n');

      return `
model ${modelName} {
${fields}

  @@map("${tableName}")
}
      `.trim();
    } catch (error) {
      console.error('Error generating package model:', error);
      throw error;
    }
  }

  /**
   * Helper method to convert table names to PascalCase
   */
  static toPascalCase(str) {
    return str
      .replace(/^(gs|tbl|t_)/, '') // Remove common prefixes
      .replace(/[_\-](.)/g, (_, char) => char.toUpperCase())
      .replace(/^(.)/, char => char.toUpperCase());
  }
}

module.exports = PrismaSchemaGenerator;

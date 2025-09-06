const OpenAI = require('openai');
const SchemaIntelligence = require('../models/SchemaIntelligence');
const GeneratedArtifact = require('../models/GeneratedArtifact');
const ViewAnalysisService = require('./ViewAnalysisService');
const Template20Intelligence = require('../models/Template20Intelligence');

/**
 * AISchemaGeneratorService
 * Uses OpenAI to generate GraphQL schemas, resolvers, Prisma models, and documentation
 * from analyzed database schemas
 */

class AISchemaGeneratorService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.model = process.env.OPENAI_MODEL || 'gpt-4';
  }

  /**
   * Generate all artifacts for a service
   */
  async generateArtifactsForService(serviceId, userId, options = {}) {
    try {
      const {
        artifactTypes = [
          'graphql_schema',
          'graphql_resolvers',
          'prisma_schema',
          'typescript_types',
          'documentation',
        ],
        regenerate = false,
        businessContext = true,
      } = options;

      // Get schema intelligence data
      const schemas = await SchemaIntelligence.find({
        serviceId,
        status: 'active',
        ...(regenerate ? {} : { 'aiProcessing.hasBeenAnalyzed': false }),
      })
        .populate('databaseObjectId')
        .lean();

      if (schemas.length === 0) {
        return {
          success: false,
          message: 'No schemas available for generation',
        };
      }

      // Get relationship mapping from view analysis
      const relationshipMap = await ViewAnalysisService.generateRelationshipMapping(serviceId);

      // Get business context from Template20Intelligence
      let businessIntelligence = null;
      if (businessContext) {
        businessIntelligence = await Template20Intelligence.getLatestIntelligence();
      }

      const results = {
        success: true,
        generated: 0,
        errors: 0,
        artifacts: [],
      };

      // Generate each artifact type
      for (const artifactType of artifactTypes) {
        try {
          const artifact = await this.generateArtifact(
            artifactType,
            schemas,
            relationshipMap,
            businessIntelligence,
            userId
          );

          results.generated++;
          results.artifacts.push({
            type: artifactType,
            artifactId: artifact._id,
            status: 'success',
          });

          // Mark schemas as analyzed
          await this.markSchemasAsAnalyzed(
            schemas.map(s => s._id),
            artifact._id,
            artifactType
          );
        } catch (error) {
          console.error(`Failed to generate ${artifactType}:`, error);
          results.errors++;
          results.artifacts.push({
            type: artifactType,
            status: 'error',
            error: error.message,
          });
        }
      }

      return results;
    } catch (error) {
      throw new Error(`Failed to generate artifacts: ${error.message}`);
    }
  }

  /**
   * Generate a specific artifact type
   */
  async generateArtifact(artifactType, schemas, relationshipMap, businessIntelligence, userId) {
    let content, metadata;

    switch (artifactType) {
      case 'graphql_schema':
        ({ content, metadata } = await this.generateGraphQLSchema(
          schemas,
          relationshipMap,
          businessIntelligence
        ));
        break;
      case 'graphql_resolvers':
        ({ content, metadata } = await this.generateGraphQLResolvers(
          schemas,
          relationshipMap,
          businessIntelligence
        ));
        break;
      case 'prisma_schema':
        ({ content, metadata } = await this.generatePrismaSchema(schemas, relationshipMap));
        break;
      case 'typescript_types':
        ({ content, metadata } = await this.generateTypeScriptTypes(schemas));
        break;
      case 'documentation':
        ({ content, metadata } = await this.generateDocumentation(
          schemas,
          relationshipMap,
          businessIntelligence
        ));
        break;
      default:
        throw new Error(`Unknown artifact type: ${artifactType}`);
    }

    // Create GeneratedArtifact record
    const artifact = new GeneratedArtifact({
      serviceId: schemas[0].serviceId,
      artifactType,
      generatedBy: userId,
      sourceSchemas: schemas.map(s => s._id),
      content,
      metadata,
      aiModel: this.model,
      prompt: metadata.prompt || 'Generated without specific prompt',
      status: 'active',
    });

    return await artifact.save();
  }

  /**
   * Generate GraphQL Schema
   */
  async generateGraphQLSchema(schemas, relationshipMap, businessIntelligence) {
    const tables = schemas.filter(s => s.objectType === 'table');
    const views = schemas.filter(s => s.objectType === 'view');

    const systemPrompt = `You are an expert GraphQL schema designer. Generate a production-ready GraphQL schema based on the provided database schema information. Follow these guidelines:
- Use appropriate GraphQL scalar types
- Define proper relationships using GraphQL types
- Include filtering, sorting, and pagination arguments
- Add descriptions from business context where available
- Follow GraphQL best practices and naming conventions
- Include both queries and mutations`;

    const schemaInfo = this.prepareSchemaInfo(tables, views, relationshipMap, businessIntelligence);

    const userPrompt = `Generate a GraphQL schema for the following database structure:

Tables:
${JSON.stringify(schemaInfo.tables, null, 2)}

Views:
${JSON.stringify(schemaInfo.views, null, 2)}

Relationships:
${JSON.stringify(schemaInfo.relationships, null, 2)}

Business Context:
${JSON.stringify(schemaInfo.businessContext, null, 2)}

Please generate:
1. Type definitions for all tables and views
2. Input types for mutations
3. Query type with filtering and pagination
4. Mutation type for CRUD operations
5. Appropriate scalar types for custom data types`;

    const response = await this.callOpenAI(systemPrompt, userPrompt);

    return {
      content: {
        schema: response,
        timestamp: new Date(),
        version: '1.0',
      },
      metadata: {
        prompt: userPrompt,
        tableCount: tables.length,
        viewCount: views.length,
        relationshipCount: schemaInfo.relationships.length,
      },
    };
  }

  /**
   * Generate GraphQL Resolvers
   */
  async generateGraphQLResolvers(schemas, relationshipMap, businessIntelligence) {
    const tables = schemas.filter(s => s.objectType === 'table');
    const procedures = schemas.filter(s => s.objectType === 'procedure');

    const systemPrompt = `You are an expert GraphQL resolver developer. Generate production-ready GraphQL resolvers based on the provided schema information. Follow these guidelines:
- Use DataLoader pattern for N+1 query prevention
- Include proper error handling
- Implement authorization checks using context
- Use database transactions where appropriate
- Follow async/await patterns
- Include comments explaining complex logic`;

    const resolverInfo = this.prepareResolverInfo(tables, procedures, relationshipMap);

    const userPrompt = `Generate GraphQL resolvers for the following schema:

Tables with columns:
${JSON.stringify(resolverInfo.tables, null, 2)}

Stored Procedures:
${JSON.stringify(resolverInfo.procedures, null, 2)}

Relationships:
${JSON.stringify(resolverInfo.relationships, null, 2)}

Please generate:
1. Query resolvers with filtering, sorting, and pagination
2. Mutation resolvers for CRUD operations
3. Field resolvers for relationships
4. Resolvers that utilize stored procedures where appropriate
5. DataLoader implementations for efficient data fetching`;

    const response = await this.callOpenAI(systemPrompt, userPrompt);

    return {
      content: {
        resolvers: response,
        timestamp: new Date(),
        version: '1.0',
      },
      metadata: {
        prompt: userPrompt,
        queryResolverCount:
          tables.length + procedures.filter(p => p.procedureType === 'get').length,
        mutationResolverCount: procedures.filter(p => ['save', 'delete'].includes(p.procedureType))
          .length,
      },
    };
  }

  /**
   * Generate Prisma Schema
   */
  async generatePrismaSchema(schemas, relationshipMap) {
    const tables = schemas.filter(s => s.objectType === 'table');

    const systemPrompt = `You are an expert Prisma schema designer. Generate a production-ready Prisma schema based on the provided database structure. Follow these guidelines:
- Use appropriate Prisma scalar types
- Define proper relations using @relation
- Include all indexes and unique constraints
- Add @map for column name mappings
- Use @@map for table name mappings
- Include proper id strategies`;

    const prismaInfo = this.preparePrismaInfo(tables, relationshipMap);

    const userPrompt = `Generate a Prisma schema for the following database structure:

Tables:
${JSON.stringify(prismaInfo.tables, null, 2)}

Foreign Keys:
${JSON.stringify(prismaInfo.foreignKeys, null, 2)}

Indexes:
${JSON.stringify(prismaInfo.indexes, null, 2)}

Please generate:
1. Model definitions for all tables
2. Proper relation definitions
3. Index definitions
4. Enum types where appropriate
5. Complete datasource configuration`;

    const response = await this.callOpenAI(systemPrompt, userPrompt);

    return {
      content: {
        schema: response,
        timestamp: new Date(),
        version: '1.0',
      },
      metadata: {
        prompt: userPrompt,
        modelCount: tables.length,
        relationCount: prismaInfo.foreignKeys.length,
      },
    };
  }

  /**
   * Generate TypeScript Types
   */
  async generateTypeScriptTypes(schemas) {
    const tables = schemas.filter(s => s.objectType === 'table');
    const views = schemas.filter(s => s.objectType === 'view');

    const systemPrompt = `You are an expert TypeScript developer. Generate comprehensive TypeScript type definitions based on the provided database schema. Follow these guidelines:
- Use appropriate TypeScript types for SQL data types
- Generate interfaces for all tables and views
- Include optional properties for nullable columns
- Create input/output DTOs
- Add JSDoc comments with descriptions
- Use proper naming conventions`;

    const typeInfo = this.prepareTypeInfo(tables, views);

    const userPrompt = `Generate TypeScript type definitions for the following database structure:

Tables:
${JSON.stringify(typeInfo.tables, null, 2)}

Views:
${JSON.stringify(typeInfo.views, null, 2)}

Please generate:
1. Interface definitions for all tables
2. Interface definitions for all views
3. Input DTOs for create/update operations
4. Output DTOs with computed fields
5. Enum types where appropriate
6. Utility types for common patterns`;

    const response = await this.callOpenAI(systemPrompt, userPrompt);

    return {
      content: {
        types: response,
        timestamp: new Date(),
        version: '1.0',
      },
      metadata: {
        prompt: userPrompt,
        interfaceCount: tables.length + views.length,
      },
    };
  }

  /**
   * Generate Documentation
   */
  async generateDocumentation(schemas, relationshipMap, businessIntelligence) {
    const systemPrompt = `You are an expert technical writer. Generate comprehensive developer documentation for a database schema. Follow these guidelines:
- Use clear, concise language
- Include code examples
- Explain business context and rules
- Document relationships and data flows
- Add usage examples and best practices
- Use Markdown formatting`;

    const docInfo = this.prepareDocumentationInfo(schemas, relationshipMap, businessIntelligence);

    const userPrompt = `Generate comprehensive documentation for the following database schema:

Overview:
${JSON.stringify(docInfo.overview, null, 2)}

Business Entities:
${JSON.stringify(docInfo.businessEntities, null, 2)}

Tables and Relationships:
${JSON.stringify(docInfo.tables, null, 2)}

Stored Procedures:
${JSON.stringify(docInfo.procedures, null, 2)}

Please generate:
1. Executive summary of the database structure
2. Detailed documentation for each business entity
3. Relationship diagrams in Mermaid syntax
4. API usage examples
5. Common query patterns
6. Best practices and guidelines`;

    const response = await this.callOpenAI(systemPrompt, userPrompt);

    return {
      content: {
        documentation: response,
        timestamp: new Date(),
        version: '1.0',
      },
      metadata: {
        prompt: userPrompt,
        entityCount: docInfo.businessEntities.length,
        tableCount: docInfo.tables.length,
        procedureCount: docInfo.procedures.length,
      },
    };
  }

  /**
   * Helper method to call OpenAI API
   */
  async callOpenAI(systemPrompt, userPrompt, options = {}) {
    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: options.temperature || 0.3,
        max_tokens: options.maxTokens || 4000,
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error(`AI generation failed: ${error.message}`);
    }
  }

  /**
   * Prepare schema information for AI prompts
   */
  prepareSchemaInfo(tables, views, relationshipMap, businessIntelligence) {
    const schemaInfo = {
      tables: [],
      views: [],
      relationships: relationshipMap.foreignKeys.concat(relationshipMap.inferredRelationships),
      businessContext: {},
    };

    // Process tables
    tables.forEach(table => {
      const tableInfo = {
        name: table.objectName,
        columns: table.tableSchema.columns.map(col => ({
          name: col.columnName,
          type: this.mapSQLTypeToGraphQL(col.dataType),
          nullable: col.isNullable,
          isPrimaryKey: col.isPrimaryKey,
          isForeignKey: col.isForeignKey,
          description: col.businessRole,
        })),
        businessEntity: table.businessContext?.businessEntity,
        businessImportance: table.businessContext?.businessImportance,
      };
      schemaInfo.tables.push(tableInfo);
    });

    // Process views
    views.forEach(view => {
      const viewInfo = {
        name: view.objectName,
        columns: view.viewSchema.columnMappings.map(col => ({
          name: col.viewColumn,
          sourceTable: col.sourceTable,
          isComputed: col.isComputed,
        })),
        complexity: view.viewSchema.complexityScore,
        dependencies: view.viewSchema.dependencies,
      };
      schemaInfo.views.push(viewInfo);
    });

    // Add business context
    if (businessIntelligence) {
      schemaInfo.businessContext = {
        entities: businessIntelligence.businessEntities,
        relationships: businessIntelligence.relationships,
      };
    }

    return schemaInfo;
  }

  /**
   * Prepare resolver information
   */
  prepareResolverInfo(tables, procedures, relationshipMap) {
    return {
      tables: tables.map(table => ({
        name: table.objectName,
        primaryKeys: table.tableSchema.columns.filter(c => c.isPrimaryKey).map(c => c.columnName),
        columns: table.tableSchema.columns.map(c => ({
          name: c.columnName,
          type: c.dataType,
          nullable: c.isNullable,
        })),
      })),
      procedures: procedures.map(proc => ({
        name: proc.objectName,
        type: proc.procedureSchema.procedureType,
        parameters: proc.procedureSchema.parameters,
        complexity: proc.procedureSchema.stats.estimatedExecutionComplexity,
      })),
      relationships: relationshipMap.foreignKeys,
    };
  }

  /**
   * Prepare Prisma information
   */
  preparePrismaInfo(tables, relationshipMap) {
    return {
      tables: tables.map(table => ({
        name: table.objectName,
        columns: table.tableSchema.columns.map(col => ({
          name: col.columnName,
          type: this.mapSQLTypeToPrisma(col.dataType),
          nullable: col.isNullable,
          isPrimaryKey: col.isPrimaryKey,
          isUnique: table.tableSchema.indexes?.some(
            idx =>
              idx.isUnique &&
              idx.columns.length === 1 &&
              idx.columns[0].columnName === col.columnName
          ),
          defaultValue: col.defaultValue,
        })),
      })),
      foreignKeys: relationshipMap.foreignKeys,
      indexes: tables.flatMap(
        table =>
          table.tableSchema.indexes?.map(idx => ({
            tableName: table.objectName,
            indexName: idx.indexName,
            columns: idx.columns,
            isUnique: idx.isUnique,
          })) || []
      ),
    };
  }

  /**
   * Prepare TypeScript type information
   */
  prepareTypeInfo(tables, views) {
    return {
      tables: tables.map(table => ({
        name: table.objectName,
        columns: table.tableSchema.columns.map(col => ({
          name: col.columnName,
          type: this.mapSQLTypeToTypeScript(col.dataType),
          nullable: col.isNullable,
          description: col.businessRole,
        })),
      })),
      views: views.map(view => ({
        name: view.objectName,
        columns: view.viewSchema.columnMappings.map(col => ({
          name: col.viewColumn,
          type: this.mapSQLTypeToTypeScript(col.dataType || 'nvarchar'),
          isComputed: col.isComputed,
        })),
      })),
    };
  }

  /**
   * Prepare documentation information
   */
  prepareDocumentationInfo(schemas, relationshipMap, businessIntelligence) {
    const tables = schemas.filter(s => s.objectType === 'table');
    const procedures = schemas.filter(s => s.objectType === 'procedure');

    return {
      overview: {
        totalTables: tables.length,
        totalViews: schemas.filter(s => s.objectType === 'view').length,
        totalProcedures: procedures.length,
        businessEntities: [
          ...new Set(schemas.map(s => s.businessContext?.businessEntity).filter(Boolean)),
        ],
      },
      businessEntities: businessIntelligence?.businessEntities || [],
      tables: tables.map(table => ({
        name: table.objectName,
        businessEntity: table.businessContext?.businessEntity,
        description: table.businessContext?.businessDescription,
        columns: table.tableSchema.columns.length,
        relationships: relationshipMap.foreignKeys.filter(
          fk => fk.fromTable === table.objectName || fk.toTable === table.objectName
        ).length,
      })),
      procedures: procedures.map(proc => ({
        name: proc.objectName,
        type: proc.procedureSchema.procedureType,
        parameters: proc.procedureSchema.parameters.length,
        complexity: proc.procedureSchema.stats.estimatedExecutionComplexity,
      })),
    };
  }

  /**
   * Mark schemas as analyzed
   */
  async markSchemasAsAnalyzed(schemaIds, artifactId, artifactType) {
    await SchemaIntelligence.updateMany(
      { _id: { $in: schemaIds } },
      {
        $set: {
          'aiProcessing.hasBeenAnalyzed': true,
          'aiProcessing.analyzedAt': new Date(),
          'aiProcessing.analysisVersion': '1.0',
        },
        $push: {
          'aiProcessing.generatedArtifacts': {
            artifactType,
            artifactId,
            generatedAt: new Date(),
            isLatest: true,
          },
        },
      }
    );
  }

  /**
   * Type mapping utilities
   */
  mapSQLTypeToGraphQL(sqlType) {
    const typeMap = {
      int: 'Int',
      bigint: 'Float',
      smallint: 'Int',
      tinyint: 'Int',
      decimal: 'Float',
      numeric: 'Float',
      float: 'Float',
      real: 'Float',
      bit: 'Boolean',
      varchar: 'String',
      nvarchar: 'String',
      char: 'String',
      nchar: 'String',
      text: 'String',
      ntext: 'String',
      date: 'String',
      datetime: 'String',
      datetime2: 'String',
      time: 'String',
      uniqueidentifier: 'ID',
    };
    return typeMap[sqlType.toLowerCase()] || 'String';
  }

  mapSQLTypeToPrisma(sqlType) {
    const typeMap = {
      int: 'Int',
      bigint: 'BigInt',
      smallint: 'Int',
      tinyint: 'Int',
      decimal: 'Decimal',
      numeric: 'Decimal',
      float: 'Float',
      real: 'Float',
      bit: 'Boolean',
      varchar: 'String',
      nvarchar: 'String',
      char: 'String',
      nchar: 'String',
      text: 'String',
      ntext: 'String',
      date: 'DateTime',
      datetime: 'DateTime',
      datetime2: 'DateTime',
      time: 'DateTime',
      uniqueidentifier: 'String',
    };
    return typeMap[sqlType.toLowerCase()] || 'String';
  }

  mapSQLTypeToTypeScript(sqlType) {
    const typeMap = {
      int: 'number',
      bigint: 'number',
      smallint: 'number',
      tinyint: 'number',
      decimal: 'number',
      numeric: 'number',
      float: 'number',
      real: 'number',
      bit: 'boolean',
      varchar: 'string',
      nvarchar: 'string',
      char: 'string',
      nchar: 'string',
      text: 'string',
      ntext: 'string',
      date: 'Date | string',
      datetime: 'Date | string',
      datetime2: 'Date | string',
      time: 'string',
      uniqueidentifier: 'string',
    };
    return typeMap[sqlType.toLowerCase()] || 'string';
  }
}

module.exports = new AISchemaGeneratorService();

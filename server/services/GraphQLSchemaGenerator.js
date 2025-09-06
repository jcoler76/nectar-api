const Template20Intelligence = require('../models/Template20Intelligence');
const fs = require('fs').promises;
const path = require('path');

/**
 * GraphQL Schema Generator
 * Generates GraphQL types, resolvers, and federation schema from Template20 intelligence
 * Optimized for AI coding assistants with comprehensive documentation
 */
class GraphQLSchemaGenerator {
  constructor() {
    this.outputPath = path.join(__dirname, '../graphql/generated');
    this.version = 'v1.0-ai-optimized';
  }

  /**
   * Generate selective GraphQL schema from a specific selection
   */
  async generateSelectiveSchema(selection, options = {}) {
    console.log(`🎯 Generating selective GraphQL schema for "${selection.selectionName}"...`);

    const {
      generateResolvers = true,
      generateFederation = false,
      includeDocumentation = true,
      optimizeForAI = true,
      includeProcedureResolvers = true,
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
      const selectionOutputPath = path.join(this.outputPath, 'selections', selection.selectionName);
      await fs.mkdir(selectionOutputPath, { recursive: true });

      // Step 1: Generate selective schema types
      console.log('📊 Step 1: Generating selective GraphQL types...');
      const typeDefs = await this.generateSelectiveTypeDefs(
        filteredIntelligence,
        includeDocumentation
      );

      // Step 2: Generate selective resolvers
      let resolvers = null;
      if (generateResolvers) {
        console.log('⚙️ Step 2: Generating selective resolvers...');
        resolvers = await this.generateSelectiveResolvers(
          filteredIntelligence,
          includeProcedureResolvers
        );
      }

      // Step 3: Generate selective federation schema
      let federationSchema = null;
      if (generateFederation) {
        console.log('🏗️ Step 3: Generating federation schema...');
        federationSchema = await this.generateFederationSchema(filteredIntelligence);
      }

      // Step 4: Write files
      const outputFiles = [];

      const typeDefsFile = path.join(selectionOutputPath, 'typeDefs.js');
      await fs.writeFile(typeDefsFile, typeDefs);
      outputFiles.push(typeDefsFile);

      if (resolvers) {
        const resolversFile = path.join(selectionOutputPath, 'resolvers.js');
        await fs.writeFile(resolversFile, resolvers);
        outputFiles.push(resolversFile);
      }

      if (federationSchema) {
        const federationFile = path.join(selectionOutputPath, 'federation.js');
        await fs.writeFile(federationFile, federationSchema);
        outputFiles.push(federationFile);
      }

      // Step 5: Generate documentation
      if (includeDocumentation) {
        console.log('📚 Step 5: Generating AI documentation...');
        const docs = await this.generateAIDocumentation(
          filteredIntelligence,
          selection.selectionName
        );
        const docsFile = path.join(selectionOutputPath, 'README.md');
        await fs.writeFile(docsFile, docs);
        outputFiles.push(docsFile);
      }

      const duration = Date.now() - startTime;
      console.log(`✅ Selective GraphQL generation completed in ${duration}ms`);

      return {
        success: true,
        selectionName: selection.selectionName,
        tablesGenerated: selection.selectedTables.length,
        viewsGenerated: selection.selectedViews.length,
        proceduresGenerated: selection.selectedProcedures.length,
        outputFiles,
        generationTime: duration,
      };
    } catch (error) {
      console.error('❌ Selective GraphQL generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate complete GraphQL schema from Template20 intelligence
   */
  async generateFromIntelligence(options = {}) {
    console.log('🔗 Generating GraphQL schema from Template20 intelligence...');

    const {
      generateResolvers = true,
      generateFederation = false,
      includeDocumentation = true,
      optimizeForAI = true,
      includeProcedureResolvers = true,
    } = options;

    try {
      const startTime = Date.now();

      // Get latest Template20 intelligence
      const intelligence = await Template20Intelligence.getLatestIntelligence();
      if (!intelligence) {
        throw new Error('No Template20 intelligence found. Run template20-sync first.');
      }

      // Ensure output directory exists
      await fs.mkdir(this.outputPath, { recursive: true });

      // Step 1: Generate base schema types
      console.log('📊 Step 1: Generating GraphQL types...');
      const typeDefs = await this.generateTypeDefs(intelligence, includeDocumentation);

      // Step 2: Generate resolvers
      let resolvers = null;
      if (generateResolvers) {
        console.log('⚙️ Step 2: Generating resolvers...');
        resolvers = await this.generateResolvers(intelligence, includeProcedureResolvers);
      }

      // Step 3: Generate federation schema
      let federationSchema = null;
      if (generateFederation) {
        console.log('🌐 Step 3: Generating federation schema...');
        federationSchema = await this.generateFederationSchema(intelligence);
      }

      // Step 4: Generate AI-optimized documentation
      let aiDocumentation = null;
      if (optimizeForAI) {
        console.log('🤖 Step 4: Generating AI documentation...');
        aiDocumentation = await this.generateAIDocumentation(intelligence);
      }

      // Step 5: Write files
      console.log('📝 Step 5: Writing schema files...');
      const files = await this.writeSchemaFiles({
        typeDefs,
        resolvers,
        federationSchema,
        aiDocumentation,
      });

      const duration = Date.now() - startTime;
      console.log(`✅ GraphQL schema generation completed in ${duration}ms`);

      return {
        success: true,
        files,
        statistics: this.generateSchemaStatistics(intelligence),
        duration,
        nextSteps: this.getNextSteps(),
      };
    } catch (error) {
      console.error('❌ GraphQL schema generation failed:', error);
      throw new Error(`GraphQL generation failed: ${error.message}`);
    }
  }

  /**
   * Generate GraphQL type definitions
   */
  async generateTypeDefs(intelligence, includeDocumentation = true) {
    const types = [];

    // Schema header
    types.push(this.generateSchemaHeader());

    // Scalar types
    types.push(this.generateScalarTypes());

    // Business entity types
    types.push(await this.generateBusinessEntityTypes(intelligence, includeDocumentation));

    // Input types
    types.push(this.generateInputTypes(intelligence));

    // Query type
    types.push(this.generateQueryType(intelligence));

    // Mutation type (if needed)
    types.push(this.generateMutationType(intelligence));

    // Subscription type (for real-time updates)
    types.push(this.generateSubscriptionType());

    return types.join('\n\n');
  }

  /**
   * Generate schema header with documentation
   */
  generateSchemaHeader() {
    return `"""
Template20 GraphQL Schema
Generated from MongoDB Template20 Intelligence
Version: ${this.version}
Generated: ${new Date().toISOString()}

This schema provides AI-friendly access to Template20 business data
with intelligent procedure recommendations and relationship context.
"""

directive @auth(requires: Role = USER) on OBJECT | FIELD_DEFINITION
directive @deprecated(reason: String = "No longer supported") on FIELD_DEFINITION | ENUM_VALUE
directive @businessEntity(entity: String!) on OBJECT
directive @confidence(score: Float!) on FIELD_DEFINITION

enum Role {
  USER
  ADMIN
  DEVELOPER
}`;
  }

  /**
   * Generate custom scalar types
   */
  generateScalarTypes() {
    return `"""Custom scalar types for business data"""
scalar DateTime
scalar Decimal
scalar JSON

"""Confidence score for AI recommendations (0.0 to 1.0)"""
scalar Confidence`;
  }

  /**
   * Generate business entity types from intelligence
   */
  async generateBusinessEntityTypes(intelligence, includeDocumentation = true) {
    const entityTypes = [];

    // Group tables by business entity
    const entitiesByType = {};
    for (const entity of intelligence.businessEntities) {
      const tables = intelligence.getTablesForEntity(entity.entityType);
      if (tables.length > 0) {
        entitiesByType[entity.entityType] = { entity, tables };
      }
    }

    // Generate types for each business entity
    for (const [entityType, { entity, tables }] of Object.entries(entitiesByType)) {
      const entityTypeDef = await this.generateEntityType(
        entity,
        tables,
        intelligence,
        includeDocumentation
      );
      entityTypes.push(entityTypeDef);

      // Generate related types (connections, edges)
      const connectionTypes = this.generateConnectionTypes(entity, tables);
      entityTypes.push(connectionTypes);
    }

    return entityTypes.join('\n\n');
  }

  /**
   * Generate GraphQL type for a business entity
   */
  async generateEntityType(entity, tables, intelligence, includeDocumentation = true) {
    const primaryTable = tables.find(t => t.tableName === entity.primaryTable) || tables[0];
    const typeName = this.toPascalCase(entity.entityType);

    const lines = [];

    if (includeDocumentation) {
      lines.push(`"""`);
      lines.push(`${entity.businessConcept}`);
      lines.push(`Business Entity: ${entity.entityType}`);
      lines.push(`Primary Table: ${entity.primaryTable}`);
      lines.push(`Confidence: ${(entity.confidence * 100).toFixed(1)}%`);
      lines.push(`"""`);
    }

    lines.push(`type ${typeName} @businessEntity(entity: "${entity.entityType}") {`);

    // Generate fields from primary table columns
    if (primaryTable && primaryTable.columns) {
      for (const column of primaryTable.columns) {
        const field = this.generateGraphQLField(column, includeDocumentation);
        lines.push(`  ${field}`);
      }
    }

    // Add relationship fields
    const relationships = intelligence.relationships.filter(
      rel => rel.fromTable === entity.primaryTable && rel.confidence >= 0.7
    );

    for (const rel of relationships) {
      const relatedEntity = intelligence.businessEntities.find(
        e => e.primaryTable === rel.toTable || (e.keyTables && e.keyTables.includes(rel.toTable))
      );

      if (relatedEntity) {
        const relatedTypeName = this.toPascalCase(relatedEntity.entityType);
        const fieldName = this.toCamelCase(relatedEntity.entityType);
        const cardinality = this.mapRelationshipCardinality(rel.relationshipType);

        if (cardinality === 'many') {
          lines.push(
            `  ${fieldName}: [${relatedTypeName}!]! @confidence(score: ${rel.confidence})`
          );
        } else {
          lines.push(`  ${fieldName}: ${relatedTypeName} @confidence(score: ${rel.confidence})`);
        }
      }
    }

    // Add metadata fields
    lines.push('  ');
    lines.push('  # Metadata fields for AI assistants');
    lines.push(`  _entity: String! @deprecated(reason: "Use __typename instead")`);
    lines.push(`  _procedures: [ProcedureRecommendation!]!`);
    lines.push(`  _relationships: [EntityRelationship!]!`);

    lines.push('}');

    return lines.join('\n');
  }

  /**
   * Generate GraphQL field from table column
   */
  generateGraphQLField(column, includeDocumentation = true) {
    const fieldName = this.toCamelCase(column.columnName);
    const fieldType = this.mapSqlTypeToGraphQL(column.dataType, column.isNullable);

    let field = `${fieldName}: ${fieldType}`;

    // Add directives
    const directives = [];
    if (column.isPrimaryKey) {
      directives.push('@id');
    }
    if (column.isBusinessKey) {
      directives.push('@businessKey');
    }

    if (directives.length > 0) {
      field += ' ' + directives.join(' ');
    }

    // Add documentation comment
    if (includeDocumentation && column.businessRole && column.businessRole !== 'other') {
      field += ` # ${column.businessRole}`;
    }

    return field;
  }

  /**
   * Generate connection types for pagination
   */
  generateConnectionTypes(entity, tables) {
    const typeName = this.toPascalCase(entity.entityType);

    return `"""Connection type for ${entity.entityType} pagination"""
type ${typeName}Connection {
  edges: [${typeName}Edge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

"""Edge type for ${entity.entityType}"""
type ${typeName}Edge {
  node: ${typeName}!
  cursor: String!
}`;
  }

  /**
   * Generate input types for mutations and filters
   */
  generateInputTypes(intelligence) {
    const inputTypes = [];

    // Common input types
    inputTypes.push(`"""Pagination arguments"""
input PaginationInput {
  first: Int
  after: String
  last: Int
  before: String
}

"""Ordering input"""
input OrderBy {
  field: String!
  direction: SortDirection!
}

enum SortDirection {
  ASC
  DESC
}

"""Page info for connections"""
type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}`);

    // Generate entity-specific filter inputs
    for (const entity of intelligence.businessEntities) {
      const filterInput = this.generateEntityFilterInput(entity, intelligence);
      inputTypes.push(filterInput);
    }

    return inputTypes.join('\n\n');
  }

  /**
   * Generate filter input for specific entity
   */
  generateEntityFilterInput(entity, intelligence) {
    const typeName = this.toPascalCase(entity.entityType);
    const tables = intelligence.getTablesForEntity(entity.entityType);
    const primaryTable = tables.find(t => t.tableName === entity.primaryTable) || tables[0];

    const lines = [];
    lines.push(`"""Filter input for ${entity.entityType}"""`);
    lines.push(`input ${typeName}Filter {`);

    if (primaryTable && primaryTable.columns) {
      // Add common filter fields
      const keyColumns = primaryTable.columns.filter(
        c => c.isPrimaryKey || c.isBusinessKey || c.businessRole === 'id'
      );

      for (const column of keyColumns.slice(0, 5)) {
        // Limit to top 5 key columns
        const fieldName = this.toCamelCase(column.columnName);
        const fieldType = this.mapSqlTypeToGraphQL(column.dataType, true);
        lines.push(`  ${fieldName}: ${fieldType}`);
      }
    }

    // Add common business filters
    lines.push('  # Common business filters');
    lines.push('  createdAfter: DateTime');
    lines.push('  createdBefore: DateTime');
    lines.push('  isActive: Boolean');

    lines.push('}');

    return lines.join('\n');
  }

  /**
   * Generate Query type with intelligent resolvers
   */
  generateQueryType(intelligence) {
    const queries = [];

    queries.push(`"""Root Query type with AI-optimized resolvers"""`);
    queries.push(`type Query {`);
    queries.push('  # Schema introspection');
    queries.push('  _schema: SchemaInfo!');
    queries.push('');

    // Generate queries for each business entity
    for (const entity of intelligence.businessEntities) {
      const typeName = this.toPascalCase(entity.entityType);
      const fieldName = this.toCamelCase(entity.entityType);

      queries.push(`  # ${entity.businessConcept}`);
      queries.push(`  ${fieldName}(id: ID!): ${typeName}`);
      queries.push(
        `  ${fieldName}s(filter: ${typeName}Filter, pagination: PaginationInput, orderBy: [OrderBy!]): ${typeName}Connection!`
      );
      queries.push('');
    }

    // Add procedure-based queries
    queries.push('  # Stored procedure queries');
    queries.push('  executeStoredProcedure(procedureName: String!, parameters: JSON): JSON!');
    queries.push(
      '  recommendedProcedures(entityType: String!, minConfidence: Float = 0.7): [ProcedureRecommendation!]!'
    );
    queries.push('');

    // Add relationship queries
    queries.push('  # Relationship queries');
    queries.push('  entityRelationships(entityType: String!): [EntityRelationship!]!');
    queries.push('  tableRelationships(tableName: String!): [TableRelationship!]!');

    queries.push('}');

    return queries.join('\n');
  }

  /**
   * Generate Mutation type for data modifications
   */
  generateMutationType(intelligence) {
    return `"""Mutations for data modification"""
type Mutation {
  # Schema updates
  refreshIntelligence: RefreshResult!
  
  # Procedure execution
  executeProcedure(input: ProcedureExecutionInput!): ProcedureResult!
}

input ProcedureExecutionInput {
  procedureName: String!
  parameters: JSON
  timeout: Int = 30000
}

type ProcedureResult {
  success: Boolean!
  data: JSON
  error: String
  executionTime: Int!
  recordCount: Int
}

type RefreshResult {
  success: Boolean!
  entitiesUpdated: Int!
  proceduresAnalyzed: Int!
  relationshipsDiscovered: Int!
}`;
  }

  /**
   * Generate Subscription type for real-time updates
   */
  generateSubscriptionType() {
    return `"""Subscriptions for real-time updates"""
type Subscription {
  # Schema changes
  intelligenceUpdated: IntelligenceUpdate!
  
  # Procedure recommendations
  procedureRecommendationUpdated(entityType: String!): ProcedureRecommendation!
}

type IntelligenceUpdate {
  type: UpdateType!
  entityType: String
  timestamp: DateTime!
  details: JSON
}

enum UpdateType {
  ENTITY_ADDED
  ENTITY_UPDATED
  PROCEDURES_REFRESHED
  RELATIONSHIPS_UPDATED
}`;
  }

  /**
   * Generate resolvers implementation
   */
  async generateResolvers(intelligence, includeProcedureResolvers = true) {
    const resolvers = {
      Query: {},
      Mutation: {},
      Subscription: {},
    };

    // Generate entity resolvers
    for (const entity of intelligence.businessEntities) {
      const typeName = this.toPascalCase(entity.entityType);
      const fieldName = this.toCamelCase(entity.entityType);

      // Single entity resolver
      resolvers.Query[fieldName] = this.generateEntityResolver(entity, intelligence, false);

      // List entity resolver
      resolvers.Query[`${fieldName}s`] = this.generateEntityResolver(entity, intelligence, true);

      // Entity type resolver
      resolvers[typeName] = this.generateEntityTypeResolver(entity, intelligence);
    }

    // Generate procedure resolvers
    if (includeProcedureResolvers) {
      resolvers.Query.recommendedProcedures = this.generateProcedureRecommendationResolver();
      resolvers.Query.executeStoredProcedure = this.generateProcedureExecutionResolver();
    }

    return this.formatResolvers(resolvers);
  }

  /**
   * Generate resolver for single entity type
   */
  generateEntityTypeResolver(entity, intelligence) {
    const procedures = intelligence.getProceduresForEntity(entity.entityType, 0.7);

    return `{
  _entity: () => "${entity.entityType}",
  _procedures: async (parent, args, context) => {
    const Template20Intelligence = require('../models/Template20Intelligence');
    const intelligence = await Template20Intelligence.getLatestIntelligence();
    return intelligence.getProceduresForEntity("${entity.entityType}", 0.7)
      .map(proc => ({
        name: proc.procedureName,
        confidence: proc.overallConfidence,
        type: proc.procedureType,
        parameters: proc.parameters || [],
        description: \`\${proc.procedureType} procedure for ${entity.entityType} operations\`
      }));
  },
  _relationships: async (parent, args, context) => {
    const Template20Intelligence = require('../models/Template20Intelligence');
    const intelligence = await Template20Intelligence.getLatestIntelligence();
    return intelligence.getRelationshipsForTable("${entity.primaryTable}")
      .map(rel => ({
        fromTable: rel.fromTable,
        toTable: rel.toTable,
        type: rel.relationshipType,
        confidence: rel.confidence,
        businessRule: rel.businessRule
      }));
  }
}`;
  }

  /**
   * Write all schema files to disk
   */
  async writeSchemaFiles({ typeDefs, resolvers, federationSchema, aiDocumentation }) {
    const files = [];

    // Write type definitions
    if (typeDefs) {
      const typeDefsPath = path.join(this.outputPath, 'typeDefs.graphql');
      await fs.writeFile(typeDefsPath, typeDefs, 'utf8');
      files.push({ type: 'typeDefs', path: typeDefsPath });
    }

    // Write resolvers
    if (resolvers) {
      const resolversPath = path.join(this.outputPath, 'resolvers.js');
      await fs.writeFile(resolversPath, resolvers, 'utf8');
      files.push({ type: 'resolvers', path: resolversPath });
    }

    // Write federation schema
    if (federationSchema) {
      const federationPath = path.join(this.outputPath, 'federation.graphql');
      await fs.writeFile(federationPath, federationSchema, 'utf8');
      files.push({ type: 'federation', path: federationPath });
    }

    // Write AI documentation
    if (aiDocumentation) {
      const aiDocsPath = path.join(this.outputPath, 'ai-documentation.md');
      await fs.writeFile(aiDocsPath, aiDocumentation, 'utf8');
      files.push({ type: 'aiDocumentation', path: aiDocsPath });
    }

    // Write index file
    const indexPath = path.join(this.outputPath, 'index.js');
    const indexContent = this.generateIndexFile();
    await fs.writeFile(indexPath, indexContent, 'utf8');
    files.push({ type: 'index', path: indexPath });

    return files;
  }

  /**
   * Generate AI documentation for the schema
   */
  async generateAIDocumentation(intelligence) {
    const lines = [];

    lines.push('# Template20 GraphQL Schema - AI Assistant Guide');
    lines.push('');
    lines.push('Generated from MongoDB Template20 Intelligence');
    lines.push(`Version: ${this.version}`);
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push('');

    // Business entities overview
    lines.push('## Business Entities');
    lines.push('');
    for (const entity of intelligence.businessEntities) {
      const procedures = intelligence.getProceduresForEntity(entity.entityType, 0.7);
      lines.push(`### ${entity.entityType}`);
      lines.push(`- **Concept**: ${entity.businessConcept}`);
      lines.push(`- **Primary Table**: ${entity.primaryTable}`);
      lines.push(`- **Confidence**: ${(entity.confidence * 100).toFixed(1)}%`);
      lines.push(`- **Available Procedures**: ${procedures.length}`);
      lines.push('');

      // Example queries
      lines.push('**Example Queries:**');
      lines.push('```graphql');
      lines.push(`query Get${this.toPascalCase(entity.entityType)} {`);
      lines.push(`  ${this.toCamelCase(entity.entityType)}(id: "123") {`);
      lines.push('    # Add relevant fields here');
      lines.push('    _procedures {');
      lines.push('      name');
      lines.push('      confidence');
      lines.push('      type');
      lines.push('    }');
      lines.push('  }');
      lines.push('}');
      lines.push('```');
      lines.push('');
    }

    // Common patterns
    lines.push('## Common Query Patterns');
    lines.push('');
    lines.push('### 1. Entity with Relationships');
    lines.push('```graphql');
    lines.push('query CustomerWithInvoices {');
    lines.push('  customer(id: "123") {');
    lines.push('    # customer fields');
    lines.push('    invoices {');
    lines.push('      # invoice fields');
    lines.push('    }');
    lines.push('  }');
    lines.push('}');
    lines.push('```');
    lines.push('');

    lines.push('### 2. Procedure Recommendations');
    lines.push('```graphql');
    lines.push('query GetRecommendedProcedures {');
    lines.push('  recommendedProcedures(entityType: "customer", minConfidence: 0.8) {');
    lines.push('    name');
    lines.push('    confidence');
    lines.push('    type');
    lines.push('    parameters {');
    lines.push('      parameterName');
    lines.push('      dataType');
    lines.push('    }');
    lines.push('  }');
    lines.push('}');
    lines.push('```');
    lines.push('');

    // Integration guide
    lines.push('## Integration with AI Coding Assistants');
    lines.push('');
    lines.push('### VS Code/Cursor Integration');
    lines.push('1. Install GraphQL extension');
    lines.push('2. Configure schema endpoint');
    lines.push('3. Use IntelliSense for auto-completion');
    lines.push('');

    lines.push('### Lovable.dev Integration');
    lines.push('1. Import schema into Lovable project');
    lines.push('2. Use generated types for type-safe development');
    lines.push('3. Leverage procedure recommendations for database operations');
    lines.push('');

    return lines.join('\n');
  }

  // Helper methods
  toPascalCase(str) {
    return str.replace(/(?:^|_)(.)/g, (_, char) => char.toUpperCase());
  }

  toCamelCase(str) {
    const pascal = this.toPascalCase(str);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
  }

  mapSqlTypeToGraphQL(sqlType, isNullable = true) {
    const nullable = isNullable ? '' : '!';

    const typeMap = {
      int: 'Int',
      bigint: 'Int',
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
      uniqueidentifier: 'ID',
      varbinary: 'String',
      image: 'String',
    };

    const baseType = sqlType.toLowerCase().split('(')[0];
    return (typeMap[baseType] || 'String') + nullable;
  }

  mapRelationshipCardinality(relationshipType) {
    if (relationshipType && relationshipType.includes('many')) {
      return 'many';
    }
    return 'one';
  }

  formatResolvers(resolvers) {
    return `// Generated GraphQL Resolvers
// Version: ${this.version}

const Template20Intelligence = require('../models/Template20Intelligence');
const DatabaseService = require('../services/databaseService');

module.exports = ${JSON.stringify(resolvers, null, 2).replace(/"/g, '').replace(/\\n/g, '\n')};`;
  }

  generateIndexFile() {
    return `// Template20 GraphQL Schema Index
// Generated from MongoDB Template20 Intelligence

const { readFileSync } = require('fs');
const { join } = require('path');

// Load type definitions
const typeDefs = readFileSync(join(__dirname, 'typeDefs.graphql'), 'utf8');

// Load resolvers
const resolvers = require('./resolvers');

module.exports = {
  typeDefs,
  resolvers,
  version: '${this.version}',
  generated: '${new Date().toISOString()}'
};`;
  }

  generateSchemaStatistics(intelligence) {
    return {
      totalTypes: intelligence.businessEntities.length,
      totalQueries: intelligence.businessEntities.length * 2 + 4, // entity + entities + 4 system queries
      totalResolvers: intelligence.businessEntities.length * 3, // query + type + procedures
      businessEntities: intelligence.businessEntities.length,
      availableProcedures: intelligence.procedures.length,
      relationships: intelligence.relationships.filter(r => r.confidence >= 0.7).length,
    };
  }

  getNextSteps() {
    return [
      'Import schema: const { typeDefs, resolvers } = require("./graphql/generated")',
      'Setup Apollo Server with generated schema',
      'Configure GraphQL playground for testing',
      'Integrate with existing authentication middleware',
      'Test procedure execution resolvers',
    ];
  }

  generateEntityResolver(entity, intelligence, isList = false) {
    if (isList) {
      return `async (parent, { filter, pagination, orderBy }, context) => {
  // TODO: Implement list resolver for ${entity.entityType}
  // Use recommended procedures from Template20Intelligence
  const procedures = await Template20Intelligence.getProceduresForEntity("${entity.entityType}", 0.7);
  // Implement pagination and filtering logic
  return { edges: [], pageInfo: { hasNextPage: false, hasPreviousPage: false } };
}`;
    } else {
      return `async (parent, { id }, context) => {
  // TODO: Implement single entity resolver for ${entity.entityType}
  // Use recommended procedures from Template20Intelligence
  const procedures = await Template20Intelligence.getProceduresForEntity("${entity.entityType}", 0.7);
  // Implement entity lookup logic
  return null;
}`;
    }
  }

  generateProcedureRecommendationResolver() {
    return `async (parent, { entityType, minConfidence }, context) => {
  const intelligence = await Template20Intelligence.getLatestIntelligence();
  return intelligence.getProceduresForEntity(entityType, minConfidence)
    .map(proc => ({
      name: proc.procedureName,
      confidence: proc.overallConfidence,
      type: proc.procedureType,
      parameters: proc.parameters || [],
      description: \`\${proc.procedureType} procedure for \${entityType} operations\`,
      daysSinceModified: proc.daysSinceModified
    }));
}`;
  }

  generateProcedureExecutionResolver() {
    return `async (parent, { procedureName, parameters }, context) => {
  // TODO: Implement safe procedure execution
  // Validate procedure exists and is safe to execute
  // Use DatabaseService for execution
  return {
    success: false,
    error: "Procedure execution not yet implemented",
    executionTime: 0,
    recordCount: 0
  };
}`;
  }

  async generateFederationSchema(intelligence) {
    // TODO: Implement federation schema for microservices
    return `# Federation schema for Template20 GraphQL
# TODO: Implement federation directives and entity keys`;
  }

  /**
   * Filter intelligence data based on selection
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
   * Generate selective TypeDefs (same as regular but with filtered data)
   */
  async generateSelectiveTypeDefs(filteredIntelligence, includeDocumentation = true) {
    return this.generateTypeDefs(filteredIntelligence, includeDocumentation);
  }

  /**
   * Generate selective resolvers (same as regular but with filtered data)
   */
  async generateSelectiveResolvers(filteredIntelligence, includeProcedureResolvers = true) {
    return this.generateResolvers(filteredIntelligence, includeProcedureResolvers);
  }

  /**
   * Generate AI documentation for selective schema
   */
  async generateAIDocumentation(filteredIntelligence, selectionName) {
    const totalTables = filteredIntelligence.tables.length;
    const totalViews = filteredIntelligence.views.length;
    const totalProcedures = filteredIntelligence.procedures.length;

    return `# GraphQL Schema - ${selectionName} Selection

## Overview
This GraphQL schema was generated from a selective subset of the Template20 database intelligence.

**Selection Statistics:**
- Tables: ${totalTables}
- Views: ${totalViews}
- Procedures: ${totalProcedures}
- Generated: ${new Date().toISOString()}

## Business Entities
${filteredIntelligence.businessEntities
  .map(
    entity => `
### ${entity.entityType.charAt(0).toUpperCase() + entity.entityType.slice(1)}
- **Primary Table:** ${entity.primaryTable}
- **Business Importance:** ${entity.businessImportance}/10
- **Confidence:** ${(entity.confidence * 100).toFixed(1)}%
- **Tables:** ${entity.keyTables?.join(', ') || 'None'}
`
  )
  .join('')}

## Selected Tables
${filteredIntelligence.tables
  .map(
    table => `
### ${table.tableName}
- **Business Entity:** ${table.businessEntity}
- **Importance:** ${table.businessImportance}
- **Columns:** ${table.columns?.length || 0}
- **Has Audit Fields:** ${table.hasAuditFields ? 'Yes' : 'No'}
`
  )
  .join('')}

## Selected Views
${filteredIntelligence.views
  .map(
    view => `
### ${view.viewName}
- **Business Entity:** ${view.businessEntity}
- **Related Tables:** ${view.relatedTables?.join(', ') || 'Unknown'}
- **Confidence:** ${(view.confidence * 100).toFixed(1)}%
`
  )
  .join('')}

## Selected Procedures
${filteredIntelligence.procedures
  .map(
    proc => `
### ${proc.procedureName}
- **Type:** ${proc.procedureType}
- **Business Entity:** ${proc.businessEntity}
- **Confidence:** ${(proc.overallConfidence * 100).toFixed(1)}%
- **Parameters:** ${proc.parameters?.length || 0}
- **Days Since Modified:** ${proc.daysSinceModified}
`
  )
  .join('')}

## Usage Examples

\`\`\`graphql
# Query examples for this selection
query {
  # Example queries will be generated based on selected entities
}
\`\`\`

## AI Coding Assistant Notes
This schema is optimized for AI coding assistants with:
- Clear business entity separation
- Comprehensive type documentation
- Procedure confidence scoring
- Relationship mapping
- Business logic recommendations

Use this schema to understand the business domain and generate appropriate GraphQL operations.
`;
  }

  /**
   * Generate schema for specific object selection (new method for selective generation)
   */
  static async generateForSelection(templateService, selectionFilter) {
    try {
      const generator = new GraphQLSchemaGenerator();

      // Create a mock intelligence structure from the filtered objects
      const intelligence = await generator.createIntelligenceFromSelection(
        templateService,
        selectionFilter
      );

      // Generate schema components
      const typeDefs = await generator.generateSelectiveTypeDefs(intelligence, true);
      const resolvers = await generator.generateSelectiveResolvers(intelligence, true);

      return {
        success: true,
        data: {
          typeDefs,
          resolvers,
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
      console.error('Error generating GraphQL schema for selection:', error);
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
            COLUMN_DEFAULT as defaultValue
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
            type: this.mapSqlTypeToGraphQL(col.dataType),
            isNullable: col.isNullable === 'YES',
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
   * Map SQL types to GraphQL types
   */
  mapSqlTypeToGraphQL(sqlType) {
    const typeMap = {
      int: 'Int',
      integer: 'Int',
      bigint: 'Int',
      smallint: 'Int',
      tinyint: 'Int',
      decimal: 'Float',
      numeric: 'Float',
      float: 'Float',
      real: 'Float',
      money: 'Float',
      varchar: 'String',
      nvarchar: 'String',
      char: 'String',
      nchar: 'String',
      text: 'String',
      ntext: 'String',
      uniqueidentifier: 'ID',
      datetime: 'DateTime',
      datetime2: 'DateTime',
      date: 'Date',
      time: 'Time',
      bit: 'Boolean',
    };

    return typeMap[sqlType.toLowerCase()] || 'String';
  }

  /**
   * Generate GraphQL schema for a specific package
   */
  static async generateForPackage(packageData, templateConfig) {
    try {
      const generator = new GraphQLSchemaGenerator();

      // Create a selection-like structure from package data
      const selection = {
        selectionName: packageData.packageName,
        selectedTables: packageData.tables.map(t => t.tableName),
        selectedViews: packageData.views.map(v => v.viewName),
        selectedProcedures: packageData.procedures.map(p => p.procedureName),
      };

      // Generate the schema using existing selective generation
      const result = await generator.generateSelectiveSchema(selection, {
        generateResolvers: false,
        generateFederation: false,
        includeDocumentation: true,
        optimizeForAI: true,
      });

      if (result.success) {
        // Read the generated content
        const typeDefsPath = path.join(
          generator.outputPath,
          'selections',
          packageData.packageName,
          'typeDefs.js'
        );
        const content = await fs.readFile(typeDefsPath, 'utf8');

        return {
          success: true,
          content,
          fileName: `${packageData.packageName}-schema.graphql`,
          packageName: packageData.packageName,
        };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error generating GraphQL schema for package:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Generate GraphQL resolvers for a specific package
   */
  static async generateResolversForPackage(packageData, templateConfig) {
    try {
      const generator = new GraphQLSchemaGenerator();

      // Create a selection-like structure from package data
      const selection = {
        selectionName: packageData.packageName,
        selectedTables: packageData.tables.map(t => t.tableName),
        selectedViews: packageData.views.map(v => v.viewName),
        selectedProcedures: packageData.procedures.map(p => p.procedureName),
      };

      // Generate resolvers using existing selective generation
      const result = await generator.generateSelectiveSchema(selection, {
        generateResolvers: true,
        generateFederation: false,
        includeDocumentation: false,
        optimizeForAI: true,
      });

      if (result.success) {
        // Read the generated resolvers content
        const resolversPath = path.join(
          generator.outputPath,
          'selections',
          packageData.packageName,
          'resolvers.js'
        );
        const content = await fs.readFile(resolversPath, 'utf8');

        return {
          success: true,
          content,
          fileName: `${packageData.packageName}-resolvers.js`,
          packageName: packageData.packageName,
        };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error generating GraphQL resolvers for package:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Generate incremental schema updates for continuous deployment
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
      console.error('Error generating incremental schema update:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Intelligently merge existing and new schemas
   */
  static async mergeSchemas(existingSchema, newSchema, packageName) {
    // Simple merge strategy - can be enhanced with more sophisticated merging
    const timestamp = new Date().toISOString();

    return `
# Schema for package: ${packageName}
# Last updated: ${timestamp}
# Update type: Incremental merge

${newSchema}

# Previous schema preserved below (commented out)
# ${existingSchema
      .split('\n')
      .map(line => `# ${line}`)
      .join('\n')}
    `.trim();
  }
}

module.exports = GraphQLSchemaGenerator;

const { Parser } = require('node-sql-parser');
const path = require('path');
const fs = require('fs').promises;
const DatabaseService = require('./databaseService');

/**
 * Advanced View Parser for vwCustomReport_* Views
 * Extracts relationships, business logic, and intelligence from SQL views
 * Designed for MongoDB intelligence system integration
 */
class AdvancedViewParser {
  constructor() {
    this.sqlParser = new Parser();
    this.relationshipCache = new Map();
    this.businessPatterns = this.initializeBusinessPatterns();
  }

  /**
   * Initialize business entity patterns for classification
   */
  initializeBusinessPatterns() {
    return {
      entityPatterns: {
        customer: /customer|contact|client|account|prospect/i,
        contract: /contract|agreement|deal|sale|opportunity|proposal/i,
        invoice: /invoice|bill|billing|charge|payment|ar_/i,
        production: /production|job|workflow|stage|manufacturing/i,
        opportunity: /opportunity|prospect|lead|pipeline|forecast/i,
        payment: /payment|receipt|transaction|cash|check/i,
        subscription: /subscription|recurring|plan|tier/i,
        employee: /employee|staff|user|person|hr_/i,
        product: /product|item|inventory|catalog|sku/i,
        reference: /state|country|category|type|lookup|ref_/i,
      },

      modulePatterns: {
        customer_management: /customer|contact/i,
        sales_pipeline: /opportunity|proposal|forecast/i,
        order_management: /order|contract|agreement/i,
        billing: /invoice|payment|billing|ar_/i,
        production: /production|job|manufacturing/i,
        reporting: /report|summary|analysis|dashboard/i,
        aging: /aging|overdue|delinquent/i,
        commission: /commission|bonus|incentive/i,
      },

      joinPatterns: {
        primary_relationship: /INNER\s+JOIN/gi,
        optional_relationship: /LEFT\s+(OUTER\s+)?JOIN/gi,
        lookup_relationship: /JOIN.*(?:type|category|status|state|country)/gi,
        audit_relationship: /JOIN.*(?:created|modified|updated|audit)/gi,
      },

      complexityIndicators: {
        subquery: /\(\s*SELECT/gi,
        cte: /WITH\s+\w+\s+AS\s*\(/gi,
        case_statement: /CASE\s+WHEN/gi,
        window_function: /\w+\s*\(\s*.*\)\s+OVER\s*\(/gi,
        aggregate: /(?:SUM|COUNT|AVG|MAX|MIN|GROUP_CONCAT)\s*\(/gi,
        exists: /(?:NOT\s+)?EXISTS\s*\(/gi,
      },
    };
  }

  /**
   * Parse a single view definition and extract comprehensive intelligence
   */
  async parseViewDefinition(viewName, sqlDefinition) {
    try {
      // Clean and prepare SQL for parsing
      const cleanSql = this.preprocessSQL(sqlDefinition);

      // Parse with AST for comprehensive analysis
      const ast = this.sqlParser.astify(cleanSql, { database: 'mssql' });

      // Extract core intelligence
      const intelligence = {
        viewName,
        businessModule: this.extractBusinessModule(viewName),
        businessEntity: this.extractBusinessEntity(viewName, cleanSql),

        // Structural analysis
        complexity: this.assessComplexity(cleanSql, ast),
        tables: this.extractTables(ast),
        relationships: this.extractRelationships(ast, cleanSql),
        columns: this.extractColumns(ast),

        // Business intelligence
        businessLogic: this.extractBusinessLogic(cleanSql, ast),
        dataLineage: this.buildDataLineage(ast),
        performanceCharacteristics: this.assessPerformance(cleanSql, ast),

        // Quality metrics
        confidence: this.calculateConfidence(viewName, ast, cleanSql),
        lastAnalyzed: new Date(),
      };

      return intelligence;
    } catch (error) {
      console.error(`Error parsing view ${viewName}:`, error);
      return this.fallbackParser(viewName, sqlDefinition);
    }
  }

  /**
   * Preprocess SQL to handle MSSQL-specific syntax
   */
  preprocessSQL(sql) {
    return (
      sql
        // Remove SQL Server specific brackets
        .replace(/\[([^\]]+)\]/g, '$1')
        // Handle MSSQL date functions
        .replace(/GETDATE\(\)/gi, 'CURRENT_TIMESTAMP')
        // Handle ISNULL function
        .replace(/ISNULL\s*\(/gi, 'COALESCE(')
        // Remove WITH (NOLOCK) hints
        .replace(/WITH\s*\(\s*NOLOCK\s*\)/gi, '')
        // Clean up extra whitespace
        .replace(/\s+/g, ' ')
        .trim()
    );
  }

  /**
   * Extract business module from view name
   */
  extractBusinessModule(viewName) {
    const moduleMatch = viewName.match(/vwCustomReport_(.+?)(?:_v\d+)?$/i);
    if (!moduleMatch) return 'unknown';

    const moduleName = moduleMatch[1].toLowerCase();

    for (const [module, pattern] of Object.entries(this.businessPatterns.modulePatterns)) {
      if (pattern.test(moduleName)) {
        return module;
      }
    }

    return moduleName.replace(/_/g, ' ');
  }

  /**
   * Extract primary business entity
   */
  extractBusinessEntity(viewName, sql) {
    // First try view name
    const viewBasedEntity = this.classifyByViewName(viewName);
    if (viewBasedEntity !== 'unknown') return viewBasedEntity;

    // Then analyze SQL content
    return this.classifyBySQLContent(sql);
  }

  classifyByViewName(viewName) {
    const viewLower = viewName.toLowerCase();

    for (const [entity, pattern] of Object.entries(this.businessPatterns.entityPatterns)) {
      if (pattern.test(viewLower)) {
        return entity;
      }
    }

    return 'unknown';
  }

  classifyBySQLContent(sql) {
    const sqlLower = sql.toLowerCase();
    const entityScores = {};

    // Score based on table names and column references
    for (const [entity, pattern] of Object.entries(this.businessPatterns.entityPatterns)) {
      const matches = (sqlLower.match(pattern) || []).length;
      if (matches > 0) {
        entityScores[entity] = matches;
      }
    }

    // Return highest scoring entity
    const topEntity = Object.entries(entityScores).sort(([, a], [, b]) => b - a)[0];

    return topEntity ? topEntity[0] : 'unknown';
  }

  /**
   * Extract table relationships from JOIN statements
   */
  extractRelationships(ast, sql) {
    const relationships = [];

    try {
      // Extract from AST if possible
      if (ast && ast.from) {
        relationships.push(...this.extractRelationshipsFromAST(ast));
      }
    } catch (error) {
      console.warn('AST relationship extraction failed, using regex fallback');
    }

    // Fallback to regex parsing
    relationships.push(...this.extractRelationshipsFromRegex(sql));

    // Deduplicate and enrich
    return this.deduplicateRelationships(relationships);
  }

  extractRelationshipsFromAST(ast) {
    const relationships = [];

    const traverseJoins = node => {
      if (node.join && Array.isArray(node.join)) {
        node.join.forEach(joinNode => {
          const relationship = this.parseJoinNode(joinNode);
          if (relationship) {
            relationships.push(relationship);
          }
        });
      }

      // Recursively traverse nested structures
      if (node.left) traverseJoins(node.left);
      if (node.right) traverseJoins(node.right);
    };

    if (ast.from) {
      traverseJoins(ast.from);
    }

    return relationships;
  }

  parseJoinNode(joinNode) {
    try {
      return {
        fromTable: this.extractTableName(joinNode.left || joinNode.table),
        toTable: this.extractTableName(joinNode.right || joinNode.table),
        joinType: joinNode.join || 'INNER',
        joinCondition: this.stringifyCondition(joinNode.on),
        joinColumns: this.extractJoinColumns(joinNode.on),
        confidence: 1.0, // High confidence from AST parsing
        discoveredFrom: 'ast_analysis',
      };
    } catch (error) {
      return null;
    }
  }

  extractRelationshipsFromRegex(sql) {
    const relationships = [];
    const joinPattern =
      /(?:(INNER|LEFT|RIGHT|FULL)\s+)?JOIN\s+(\w+)(?:\s+(?:AS\s+)?(\w+))?\s+ON\s+([^WHERE\s]+?)(?=\s+(?:INNER|LEFT|RIGHT|FULL)?\s*JOIN|\s+WHERE|\s+GROUP|\s+ORDER|\s+$)/gi;

    let match;
    while ((match = joinPattern.exec(sql)) !== null) {
      const [, joinType = 'INNER', tableName, alias, condition] = match;

      const joinColumns = this.parseJoinCondition(condition);

      relationships.push({
        fromTable: joinColumns.leftTable || 'unknown',
        toTable: tableName,
        joinType: joinType.toUpperCase(),
        joinCondition: condition.trim(),
        joinColumns: joinColumns,
        confidence: 0.9, // High confidence from regex parsing
        discoveredFrom: 'regex_analysis',
      });
    }

    return relationships;
  }

  parseJoinCondition(condition) {
    // Extract table.column = table.column patterns
    const equalityPattern = /(\w+)\.(\w+)\s*=\s*(\w+)\.(\w+)/g;
    const columns = [];

    let match;
    while ((match = equalityPattern.exec(condition)) !== null) {
      const [, leftTable, leftColumn, rightTable, rightColumn] = match;
      columns.push({
        leftTable,
        leftColumn,
        rightTable,
        rightColumn,
        operator: '=',
      });
    }

    return {
      leftTable: columns[0]?.leftTable,
      leftColumn: columns[0]?.leftColumn,
      rightTable: columns[0]?.rightTable,
      rightColumn: columns[0]?.rightColumn,
      allColumns: columns,
    };
  }

  /**
   * Assess view complexity for performance planning
   */
  assessComplexity(sql, ast) {
    const complexity = {
      score: 0,
      level: 'simple',
      factors: {},
    };

    // Count complexity indicators
    for (const [factor, pattern] of Object.entries(this.businessPatterns.complexityIndicators)) {
      const matches = (sql.match(pattern) || []).length;
      complexity.factors[factor] = matches;
      complexity.score += matches * this.getComplexityWeight(factor);
    }

    // Determine complexity level
    if (complexity.score >= 20) complexity.level = 'very_complex';
    else if (complexity.score >= 10) complexity.level = 'complex';
    else if (complexity.score >= 5) complexity.level = 'moderate';
    else complexity.level = 'simple';

    return complexity;
  }

  getComplexityWeight(factor) {
    const weights = {
      subquery: 3,
      cte: 2,
      case_statement: 1,
      window_function: 4,
      aggregate: 1,
      exists: 2,
    };
    return weights[factor] || 1;
  }

  /**
   * Extract business logic patterns
   */
  extractBusinessLogic(sql, ast) {
    const logic = {
      businessRules: [],
      calculations: [],
      filters: [],
      aggregations: [],
    };

    // Extract CASE statements as business rules
    const casePattern =
      /CASE\s+WHEN\s+([^THEN]+)\s+THEN\s+([^WHEN\s]+)(?:\s+WHEN\s+([^THEN]+)\s+THEN\s+([^WHEN\s]+))*(?:\s+ELSE\s+([^END]+))?\s+END/gi;
    let match;
    while ((match = casePattern.exec(sql)) !== null) {
      logic.businessRules.push({
        type: 'conditional_logic',
        condition: match[1].trim(),
        result: match[2].trim(),
        confidence: 0.8,
      });
    }

    // Extract WHERE clauses as business filters
    const wherePattern =
      /WHERE\s+([^GROUP\s][^ORDER\s][^HAVING\s]+?)(?=\s+GROUP|\s+ORDER|\s+HAVING|$)/gi;
    match = wherePattern.exec(sql);
    if (match) {
      logic.filters.push({
        type: 'data_filter',
        condition: match[1].trim(),
        confidence: 0.9,
      });
    }

    return logic;
  }

  /**
   * Build data lineage from source tables to output
   */
  buildDataLineage(ast) {
    const lineage = {
      sourceTables: [],
      transformations: [],
      outputColumns: [],
    };

    // Extract source tables
    if (ast && ast.from) {
      lineage.sourceTables = this.extractAllTables(ast.from);
    }

    // Extract column transformations
    if (ast && ast.columns) {
      lineage.outputColumns = ast.columns.map(col => ({
        outputName: col.as || this.extractColumnName(col),
        sourceExpression: this.stringifyExpression(col.expr),
        transformationType: this.classifyTransformation(col.expr),
      }));
    }

    return lineage;
  }

  /**
   * Calculate overall confidence score
   */
  calculateConfidence(viewName, ast, sql) {
    let confidence = 0.5; // Base confidence

    // View name confidence
    if (viewName.includes('vwCustomReport_')) confidence += 0.2;
    if (viewName.includes('_v2') || viewName.includes('_v3')) confidence += 0.1;

    // SQL complexity confidence (simpler = more reliable)
    const complexity = this.assessComplexity(sql, ast);
    if (complexity.level === 'simple') confidence += 0.2;
    else if (complexity.level === 'moderate') confidence += 0.1;

    // AST parsing success
    if (ast) confidence += 0.1;

    // Business entity classification success
    const entity = this.extractBusinessEntity(viewName, sql);
    if (entity !== 'unknown') confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  /**
   * Fallback parser using regex when AST parsing fails
   */
  fallbackParser(viewName, sql) {
    console.warn(`Using fallback parser for ${viewName}`);

    return {
      viewName,
      businessModule: this.extractBusinessModule(viewName),
      businessEntity: this.extractBusinessEntity(viewName, sql),
      complexity: { level: 'unknown', score: 0 },
      tables: this.extractTablesRegex(sql),
      relationships: this.extractRelationshipsFromRegex(sql),
      columns: [],
      businessLogic: { businessRules: [], calculations: [], filters: [] },
      confidence: 0.3, // Lower confidence for fallback
      lastAnalyzed: new Date(),
      parsingMethod: 'fallback_regex',
    };
  }

  extractTablesRegex(sql) {
    const tablePattern = /(?:FROM|JOIN)\s+(\w+)(?:\s+(?:AS\s+)?(\w+))?/gi;
    const tables = [];
    let match;

    while ((match = tablePattern.exec(sql)) !== null) {
      tables.push({
        tableName: match[1],
        alias: match[2] || match[1],
        joinType: match[0].trim().split(/\s+/)[0].toUpperCase(),
      });
    }

    return tables;
  }

  // Helper methods for AST manipulation
  extractTableName(node) {
    if (!node) return 'unknown';
    if (typeof node === 'string') return node;
    if (node.table) return node.table;
    if (node.name) return node.name;
    return 'unknown';
  }

  stringifyCondition(condition) {
    if (!condition) return '';
    if (typeof condition === 'string') return condition;
    // Implement AST to string conversion
    return JSON.stringify(condition);
  }

  extractJoinColumns(condition) {
    // Extract column references from join condition
    return {};
  }

  stringifyExpression(expr) {
    if (!expr) return '';
    if (typeof expr === 'string') return expr;
    // Implement expression to string conversion
    return JSON.stringify(expr);
  }

  classifyTransformation(expr) {
    // Classify the type of transformation being performed
    return 'direct_select';
  }

  extractAllTables(fromNode) {
    // Extract all table references from FROM clause
    return [];
  }

  extractColumnName(col) {
    if (col.as) return col.as;
    if (col.expr && col.expr.column) return col.expr.column;
    return 'unknown';
  }

  extractTables(ast) {
    // Extract table information from AST
    return [];
  }

  extractColumns(ast) {
    // Extract column information from AST
    return [];
  }

  assessPerformance(sql, ast) {
    // Assess query performance characteristics
    return {
      estimatedComplexity: 'medium',
      indexRecommendations: [],
      optimizationOpportunities: [],
    };
  }

  deduplicateRelationships(relationships) {
    const seen = new Set();
    return relationships.filter(rel => {
      const key = `${rel.fromTable}-${rel.toTable}-${rel.joinColumns?.leftColumn}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Parse views directly from database using MongoDB intelligence
   * This method avoids straining the live database by using cached intelligence
   */
  async parseViewsFromIntelligence(intelligence) {
    console.log('📊 Parsing views from MongoDB intelligence...');
    const results = [];

    try {
      // Process existing view intelligence
      for (const view of intelligence.views || []) {
        if (view.viewName && view.viewName.includes('vwCustomReport')) {
          const enhancedView = await this.enhanceViewIntelligence(view);
          results.push(enhancedView);
        }
      }

      console.log(`✅ Enhanced ${results.length} views from intelligence`);
      return results;
    } catch (error) {
      console.error('❌ Failed to parse views from intelligence:', error);
      return [];
    }
  }

  /**
   * Enhance existing view intelligence with additional analysis
   */
  async enhanceViewIntelligence(viewIntelligence) {
    // Add business classification if missing
    if (!viewIntelligence.businessEntity) {
      viewIntelligence.businessEntity = this.extractBusinessEntity(viewIntelligence.viewName, '');
    }

    if (!viewIntelligence.businessModule) {
      viewIntelligence.businessModule = this.extractBusinessModule(viewIntelligence.viewName);
    }

    // Enhance confidence scoring
    if (!viewIntelligence.confidence || viewIntelligence.confidence < 0.5) {
      viewIntelligence.confidence = this.calculateViewConfidenceFromName(viewIntelligence.viewName);
    }

    // Add AI-friendly metadata
    viewIntelligence.aiMetadata = {
      description: this.generateViewDescription(viewIntelligence),
      useCases: this.generateViewUseCases(viewIntelligence),
      relatedEntities: this.identifyRelatedEntities(viewIntelligence),
      queryPatterns: this.generateQueryPatterns(viewIntelligence),
    };

    viewIntelligence.lastAnalyzed = new Date();

    return viewIntelligence;
  }

  /**
   * Calculate confidence score based on view name patterns
   */
  calculateViewConfidenceFromName(viewName) {
    let confidence = 0.5;

    if (viewName.includes('vwCustomReport_')) confidence += 0.3;
    if (viewName.includes('_v2') || viewName.includes('_v3')) confidence += 0.1;
    if (viewName.match(/customer|invoice|contract|payment/i)) confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  /**
   * Generate AI-friendly view description
   */
  generateViewDescription(viewIntelligence) {
    const entity = viewIntelligence.businessEntity || 'business';
    const module = viewIntelligence.businessModule || 'reporting';

    return (
      `Custom report view for ${entity} data in the ${module} module. ` +
      `Provides structured access to ${entity} information with related data joins.`
    );
  }

  /**
   * Generate common use cases for the view
   */
  generateViewUseCases(viewIntelligence) {
    const entity = viewIntelligence.businessEntity || 'business';

    const useCases = [
      `${entity} data reporting and analysis`,
      `Dashboard queries for ${entity} metrics`,
      `Export functionality for ${entity} information`,
    ];

    if (viewIntelligence.businessModule) {
      useCases.push(`${viewIntelligence.businessModule} module integration`);
    }

    return useCases;
  }

  /**
   * Identify related business entities
   */
  identifyRelatedEntities(viewIntelligence) {
    const entities = [];
    const viewName = viewIntelligence.viewName?.toLowerCase() || '';

    // Check for entity patterns in view name
    for (const [entity, pattern] of Object.entries(this.businessPatterns.entityPatterns)) {
      if (pattern.test(viewName)) {
        entities.push(entity);
      }
    }

    // Add related entities based on tables used
    if (viewIntelligence.tablesUsed) {
      for (const table of viewIntelligence.tablesUsed) {
        const tableName = table.toLowerCase();
        if (tableName.includes('customer') && !entities.includes('customer'))
          entities.push('customer');
        if (tableName.includes('invoice') && !entities.includes('invoice'))
          entities.push('invoice');
        if (tableName.includes('contract') && !entities.includes('contract'))
          entities.push('contract');
        if (tableName.includes('payment') && !entities.includes('payment'))
          entities.push('payment');
      }
    }

    return entities.length > 0 ? entities : [viewIntelligence.businessEntity || 'unknown'];
  }

  /**
   * Generate common query patterns for AI assistants
   */
  generateQueryPatterns(viewIntelligence) {
    const viewName = viewIntelligence.viewName;
    const entity = viewIntelligence.businessEntity || 'record';

    return [
      {
        pattern: `SELECT TOP 10 * FROM ${viewName}`,
        description: `Get sample ${entity} data`,
        useCase: 'data_exploration',
      },
      {
        pattern: `SELECT COUNT(*) FROM ${viewName}`,
        description: `Count total ${entity} records`,
        useCase: 'data_validation',
      },
      {
        pattern: `SELECT * FROM ${viewName} WHERE [condition]`,
        description: `Filter ${entity} data by criteria`,
        useCase: 'filtered_reporting',
      },
    ];
  }

  /**
   * Batch process multiple views from file system (fallback method)
   */
  async batchParseViewFiles(viewsDirectory) {
    console.log(`📁 Batch processing views from ${viewsDirectory}...`);
    const results = [];

    try {
      const files = await fs.readdir(viewsDirectory);
      const viewFiles = files.filter(
        file => file.endsWith('.sql') && file.includes('vwCustomReport')
      );

      console.log(`Found ${viewFiles.length} view files to process`);

      for (const file of viewFiles) {
        try {
          const filePath = path.join(viewsDirectory, file);
          const sql = await fs.readFile(filePath, 'utf8');

          const result = await this.parseViewFile(filePath, sql);
          if (result.success) {
            results.push(result);
          }
        } catch (fileError) {
          console.warn(`⚠️ Failed to process ${file}:`, fileError.message);
        }
      }

      console.log(`✅ Successfully processed ${results.length}/${viewFiles.length} view files`);
      return results;
    } catch (error) {
      console.error('❌ Batch view processing failed:', error);
      return [];
    }
  }

  /**
   * Extract view definitions directly from database (if needed)
   * This should be used sparingly to avoid database strain
   */
  async extractViewDefinitionsFromDatabase(connectionId, database, viewNames = []) {
    console.log('🔍 Extracting view definitions from database (limited use)...');

    try {
      const dbService = new DatabaseService();
      const connection = await dbService.getConnection(connectionId);

      const query = `
        SELECT 
          v.TABLE_NAME as ViewName,
          v.VIEW_DEFINITION as Definition
        FROM INFORMATION_SCHEMA.VIEWS v
        WHERE v.TABLE_SCHEMA = 'dbo'
        ${viewNames.length > 0 ? `AND v.TABLE_NAME IN (${viewNames.map(n => `'${n}'`).join(',')})` : ''}
        AND v.TABLE_NAME LIKE 'vwCustomReport%'
        ORDER BY v.TABLE_NAME
      `;

      const result = await connection.request().query(query);

      console.log(`📊 Found ${result.recordset.length} view definitions`);

      const parsedViews = [];
      for (const row of result.recordset) {
        if (row.Definition) {
          const parsed = await this.parseViewSQL(row.ViewName, row.Definition);
          if (parsed.success) {
            parsedViews.push(parsed);
          }
        }
      }

      return parsedViews;
    } catch (error) {
      console.error('❌ Database view extraction failed:', error);
      return [];
    }
  }
}

module.exports = AdvancedViewParser;

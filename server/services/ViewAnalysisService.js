const Parser = require('node-sql-parser').Parser;
const SchemaIntelligence = require('../models/SchemaIntelligence');

/**
 * ViewAnalysisService
 * Parses SQL view definitions to extract table relationships and dependencies
 * Provides intelligent analysis for schema generation
 */

class ViewAnalysisService {
  constructor() {
    this.parser = new Parser();
    this.sqlDialect = 'transactsql'; // SQL Server dialect
  }

  /**
   * Analyze a view definition to extract relationships and dependencies
   */
  async analyzeView(viewName, viewDefinition, options = {}) {
    try {
      const analysis = {
        viewName,
        tables: [],
        relationships: [],
        columns: [],
        complexity: {},
        errors: [],
      };

      // Parse the SQL
      let ast;
      try {
        ast = this.parser.astify(viewDefinition, { database: this.sqlDialect });
      } catch (parseError) {
        // Fallback to regex-based parsing if SQL parser fails
        console.warn(
          `SQL parser failed for view ${viewName}, using fallback method:`,
          parseError.message
        );
        return this.fallbackViewAnalysis(viewName, viewDefinition);
      }

      // Extract information from AST
      if (Array.isArray(ast)) {
        ast = ast[0]; // Handle multiple statements
      }

      // Analyze based on statement type
      if (ast.type === 'select') {
        analysis.tables = this.extractTablesFromAST(ast);
        analysis.relationships = this.extractRelationshipsFromAST(ast);
        analysis.columns = this.extractColumnsFromAST(ast);
        analysis.complexity = this.calculateComplexityFromAST(ast);
      }

      // Enhance with business context if available
      if (options.schemaIntelligence) {
        analysis.businessContext = await this.enrichWithBusinessContext(
          analysis.tables,
          options.schemaIntelligence
        );
      }

      return analysis;
    } catch (error) {
      console.error(`Error analyzing view ${viewName}:`, error);
      return this.fallbackViewAnalysis(viewName, viewDefinition);
    }
  }

  /**
   * Extract tables from AST
   */
  extractTablesFromAST(ast) {
    const tables = [];
    const visitedTables = new Set();

    const extractFromClause = from => {
      if (!from) return;

      from.forEach(table => {
        if (table.table && !visitedTables.has(table.table)) {
          visitedTables.add(table.table);
          tables.push({
            tableName: table.table,
            alias: table.as || table.table,
            schemaName: table.db || 'dbo',
            joinType: table.join ? this.normalizeJoinType(table.join) : 'FROM',
          });
        }

        // Handle joined tables
        if (table.on) {
          // Extract any additional table references from join conditions
          this.extractTablesFromExpression(table.on, tables, visitedTables);
        }
      });
    };

    // Extract from main FROM clause
    if (ast.from) {
      extractFromClause(ast.from);
    }

    // Check for tables in subqueries
    if (ast.where) {
      this.extractTablesFromExpression(ast.where, tables, visitedTables);
    }

    return tables;
  }

  /**
   * Extract relationships from AST
   */
  extractRelationshipsFromAST(ast) {
    const relationships = [];

    if (!ast.from) return relationships;

    ast.from.forEach(table => {
      if (table.on && table.join) {
        const relationship = this.parseJoinCondition(table);
        if (relationship) {
          relationships.push(relationship);
        }
      }
    });

    return relationships;
  }

  /**
   * Extract columns from AST
   */
  extractColumnsFromAST(ast) {
    const columns = [];

    if (!ast.columns) return columns;

    ast.columns.forEach(col => {
      if (col.expr) {
        const column = {
          alias: col.as || this.getColumnName(col.expr),
          expression: this.expressionToString(col.expr),
          type: col.expr.type,
          sourceTable: this.getSourceTable(col.expr),
          isComputed: this.isComputedColumn(col.expr),
        };
        columns.push(column);
      }
    });

    return columns;
  }

  /**
   * Calculate complexity metrics from AST
   */
  calculateComplexityFromAST(ast) {
    const complexity = {
      score: 'simple',
      joinCount: 0,
      subqueryCount: 0,
      caseStatementCount: 0,
      aggregationCount: 0,
      distinctCount: 0,
      unionCount: 0,
      cteCount: 0,
    };

    // Count joins
    if (ast.from) {
      complexity.joinCount = ast.from.filter(t => t.join).length;
    }

    // Count other complexity indicators
    const astString = JSON.stringify(ast);
    complexity.caseStatementCount = (astString.match(/"type":"case"/g) || []).length;
    complexity.aggregationCount = (astString.match(/"type":"aggr_func"/g) || []).length;
    complexity.distinctCount = (astString.match(/"distinct":"true"/g) || []).length;
    complexity.subqueryCount = (
      astString.match(/"parentheses":true.*"type":"select"/g) || []
    ).length;

    // Calculate overall complexity score
    const totalComplexity =
      complexity.joinCount * 2 +
      complexity.subqueryCount * 3 +
      complexity.caseStatementCount +
      complexity.aggregationCount;

    if (totalComplexity <= 2) complexity.score = 'simple';
    else if (totalComplexity <= 5) complexity.score = 'moderate';
    else if (totalComplexity <= 10) complexity.score = 'complex';
    else complexity.score = 'very_complex';

    return complexity;
  }

  /**
   * Fallback view analysis using regex when parser fails
   */
  fallbackViewAnalysis(viewName, viewDefinition) {
    const analysis = {
      viewName,
      tables: [],
      relationships: [],
      columns: [],
      complexity: {
        score: 'moderate',
        joinCount: 0,
        subqueryCount: 0,
        caseStatementCount: 0,
      },
      errors: ['SQL parsing failed, using regex-based analysis'],
    };

    // Clean the SQL
    const cleanSQL = viewDefinition
      .replace(/--.*$/gm, '') // Remove line comments
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
      .replace(/\s+/g, ' ') // Normalize whitespace
      .toUpperCase();

    // Extract tables from FROM clause
    const fromMatch = cleanSQL.match(/FROM\s+([^\s]+)(?:\s+(?:AS\s+)?(\w+))?/i);
    if (fromMatch) {
      analysis.tables.push({
        tableName: fromMatch[1].replace(/\[|\]/g, ''),
        alias: fromMatch[2] || fromMatch[1],
        schemaName: 'dbo',
        joinType: 'FROM',
      });
    }

    // Extract tables from JOINs
    const joinRegex =
      /(INNER|LEFT|RIGHT|FULL|CROSS)?\s*JOIN\s+([^\s]+)(?:\s+(?:AS\s+)?(\w+))?\s+ON/gi;
    let joinMatch;
    while ((joinMatch = joinRegex.exec(cleanSQL)) !== null) {
      const joinType = joinMatch[1] || 'INNER';
      const tableName = joinMatch[2].replace(/\[|\]/g, '');
      const alias = joinMatch[3] || tableName;

      analysis.tables.push({
        tableName,
        alias,
        schemaName: 'dbo',
        joinType: joinType.toUpperCase(),
      });

      analysis.complexity.joinCount++;
    }

    // Extract join relationships
    const onRegex = /ON\s+([^\s]+)\.(\w+)\s*=\s*([^\s]+)\.(\w+)/gi;
    let onMatch;
    while ((onMatch = onRegex.exec(cleanSQL)) !== null) {
      analysis.relationships.push({
        fromTable: onMatch[1],
        fromColumn: onMatch[2],
        toTable: onMatch[3],
        toColumn: onMatch[4],
        joinType: 'INNER', // Default, would need more context
        confidence: 0.7, // Lower confidence for regex parsing
      });
    }

    // Extract columns (simplified)
    const selectMatch = cleanSQL.match(/SELECT\s+(.*?)\s+FROM/i);
    if (selectMatch) {
      const columnsPart = selectMatch[1];
      const columns = columnsPart.split(',').map(col => col.trim());

      columns.forEach(col => {
        const asMatch = col.match(/(.+)\s+AS\s+(\w+)/i);
        if (asMatch) {
          analysis.columns.push({
            alias: asMatch[2],
            expression: asMatch[1],
            isComputed: asMatch[1].includes('(') || asMatch[1].includes('+'),
          });
        } else {
          analysis.columns.push({
            alias: col.split('.').pop(),
            expression: col,
            isComputed: col.includes('(') || col.includes('+'),
          });
        }
      });
    }

    // Count complexity indicators
    analysis.complexity.caseStatementCount = (cleanSQL.match(/CASE\s+WHEN/g) || []).length;
    analysis.complexity.subqueryCount = (cleanSQL.match(/\(\s*SELECT/g) || []).length;

    return analysis;
  }

  /**
   * Parse join condition to extract relationship
   */
  parseJoinCondition(table) {
    if (!table.on || table.on.type !== 'binary_expr') return null;

    const on = table.on;
    if (on.operator !== '=') return null;

    const left = this.parseColumnReference(on.left);
    const right = this.parseColumnReference(on.right);

    if (!left || !right) return null;

    return {
      fromTable: left.table,
      fromColumn: left.column,
      toTable: right.table,
      toColumn: right.column,
      joinType: this.normalizeJoinType(table.join),
      confidence: 0.9,
    };
  }

  /**
   * Parse column reference from expression
   */
  parseColumnReference(expr) {
    if (expr.type === 'column_ref') {
      return {
        table: expr.table || 'unknown',
        column: expr.column,
      };
    }
    return null;
  }

  /**
   * Enrich analysis with business context
   */
  async enrichWithBusinessContext(tables, schemaIntelligenceData) {
    const businessContext = {
      primaryBusinessEntity: null,
      relatedEntities: [],
      businessImportance: 'reference',
    };

    // Find business entities for each table
    for (const table of tables) {
      const tableSchema = schemaIntelligenceData.find(
        schema => schema.objectName === table.tableName && schema.objectType === 'table'
      );

      if (tableSchema && tableSchema.businessContext) {
        const entity = {
          tableName: table.tableName,
          businessEntity: tableSchema.businessContext.businessEntity,
          businessImportance: tableSchema.businessContext.businessImportance,
        };

        if (table.joinType === 'FROM') {
          businessContext.primaryBusinessEntity = entity;
        } else {
          businessContext.relatedEntities.push(entity);
        }
      }
    }

    // Determine overall business importance
    const importanceOrder = ['critical', 'important', 'reference', 'system'];
    let highestImportance = 'reference';

    const allEntities = [
      businessContext.primaryBusinessEntity,
      ...businessContext.relatedEntities,
    ].filter(e => e);

    allEntities.forEach(entity => {
      const entityImportance = entity.businessImportance;
      if (importanceOrder.indexOf(entityImportance) < importanceOrder.indexOf(highestImportance)) {
        highestImportance = entityImportance;
      }
    });

    businessContext.businessImportance = highestImportance;

    return businessContext;
  }

  /**
   * Analyze relationships between multiple views
   */
  async analyzeViewNetwork(serviceId) {
    try {
      // Get all views for the service
      const views = await SchemaIntelligence.find({
        serviceId,
        objectType: 'view',
        status: 'active',
      }).lean();

      const network = {
        nodes: [], // Views
        edges: [], // Relationships between views
        clusters: [], // Groups of related views
      };

      // Create nodes for each view
      views.forEach(view => {
        network.nodes.push({
          id: view._id.toString(),
          name: view.objectName,
          complexity: view.viewSchema?.complexityScore || 'moderate',
          businessEntity: view.businessContext?.businessEntity,
          dependencies: view.viewSchema?.dependencies?.map(d => d.dependentTable) || [],
        });
      });

      // Find relationships between views
      views.forEach(view => {
        const viewDeps = view.viewSchema?.dependencies || [];

        viewDeps.forEach(dep => {
          // Check if the dependency is another view
          const targetView = views.find(v => v.objectName === dep.dependentTable);
          if (targetView) {
            network.edges.push({
              from: view._id.toString(),
              to: targetView._id.toString(),
              type: 'depends_on',
            });
          }
        });
      });

      // Identify clusters (connected components)
      network.clusters = this.findClusters(network.nodes, network.edges);

      return network;
    } catch (error) {
      throw new Error(`Failed to analyze view network: ${error.message}`);
    }
  }

  /**
   * Generate relationship mapping for GraphQL schema generation
   */
  async generateRelationshipMapping(serviceId) {
    try {
      // Get all analyzed schemas
      const schemas = await SchemaIntelligence.find({
        serviceId,
        status: 'active',
        objectType: { $in: ['table', 'view'] },
      }).lean();

      const relationshipMap = {
        tables: {},
        views: {},
        foreignKeys: [],
        inferredRelationships: [],
      };

      // Process tables
      schemas
        .filter(s => s.objectType === 'table')
        .forEach(table => {
          const tableName = table.objectName;
          relationshipMap.tables[tableName] = {
            primaryKeys:
              table.tableSchema?.columns?.filter(c => c.isPrimaryKey).map(c => c.columnName) || [],
            foreignKeys: table.tableSchema?.foreignKeys || [],
            columns:
              table.tableSchema?.columns?.map(c => ({
                name: c.columnName,
                type: c.dataType,
                nullable: c.isNullable,
              })) || [],
          };

          // Add foreign key relationships
          if (table.tableSchema?.foreignKeys) {
            table.tableSchema.foreignKeys.forEach(fk => {
              relationshipMap.foreignKeys.push({
                fromTable: tableName,
                fromColumn: fk.fromColumn,
                toTable: fk.toTable,
                toColumn: fk.toColumn,
                constraintName: fk.constraintName,
                type: 'foreign_key',
              });
            });
          }
        });

      // Process views and infer relationships
      schemas
        .filter(s => s.objectType === 'view')
        .forEach(view => {
          const viewName = view.objectName;
          const dependencies = view.viewSchema?.dependencies || [];

          relationshipMap.views[viewName] = {
            dependencies: dependencies.map(d => d.dependentTable),
            columns:
              view.viewSchema?.columnMappings?.map(c => ({
                name: c.viewColumn,
                sourceTable: c.sourceTable,
                sourceColumn: c.sourceColumn,
                isComputed: c.isComputed,
              })) || [],
          };

          // Infer relationships from view joins
          this.inferRelationshipsFromView(view, relationshipMap.inferredRelationships);
        });

      return relationshipMap;
    } catch (error) {
      throw new Error(`Failed to generate relationship mapping: ${error.message}`);
    }
  }

  /**
   * Helper methods
   */
  normalizeJoinType(join) {
    if (!join) return 'INNER';
    return join.toUpperCase().replace(/\s+JOIN$/i, '');
  }

  getColumnName(expr) {
    if (expr.type === 'column_ref') {
      return expr.column;
    } else if (expr.type === 'function') {
      return expr.name;
    }
    return 'computed';
  }

  getSourceTable(expr) {
    if (expr.type === 'column_ref' && expr.table) {
      return expr.table;
    }
    return null;
  }

  isComputedColumn(expr) {
    return expr.type !== 'column_ref';
  }

  expressionToString(expr) {
    // Simplified expression stringification
    if (expr.type === 'column_ref') {
      return expr.table ? `${expr.table}.${expr.column}` : expr.column;
    } else if (expr.type === 'function') {
      return `${expr.name}(...)`;
    }
    return 'complex_expression';
  }

  extractTablesFromExpression(expr, tables, visitedTables) {
    // Recursively extract table references from expressions
    if (!expr) return;

    if (expr.type === 'column_ref' && expr.table && !visitedTables.has(expr.table)) {
      visitedTables.add(expr.table);
      tables.push({
        tableName: expr.table,
        alias: expr.table,
        schemaName: 'dbo',
        joinType: 'REFERENCE',
      });
    }

    // Handle nested expressions
    ['left', 'right', 'expr', 'args'].forEach(prop => {
      if (expr[prop]) {
        if (Array.isArray(expr[prop])) {
          expr[prop].forEach(e => this.extractTablesFromExpression(e, tables, visitedTables));
        } else {
          this.extractTablesFromExpression(expr[prop], tables, visitedTables);
        }
      }
    });
  }

  findClusters(nodes, edges) {
    const clusters = [];
    const visited = new Set();

    const dfs = (nodeId, cluster) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      cluster.push(nodeId);

      // Find connected nodes
      edges.forEach(edge => {
        if (edge.from === nodeId && !visited.has(edge.to)) {
          dfs(edge.to, cluster);
        } else if (edge.to === nodeId && !visited.has(edge.from)) {
          dfs(edge.from, cluster);
        }
      });
    };

    nodes.forEach(node => {
      if (!visited.has(node.id)) {
        const cluster = [];
        dfs(node.id, cluster);
        if (cluster.length > 0) {
          clusters.push(cluster);
        }
      }
    });

    return clusters;
  }

  inferRelationshipsFromView(view, inferredRelationships) {
    const viewDef = view.viewSchema?.viewDefinition;
    if (!viewDef) return;

    // Simple pattern matching for join conditions
    const joinPattern = /(\w+)\.(\w+)\s*=\s*(\w+)\.(\w+)/gi;
    let match;

    while ((match = joinPattern.exec(viewDef)) !== null) {
      inferredRelationships.push({
        fromTable: match[1],
        fromColumn: match[2],
        toTable: match[3],
        toColumn: match[4],
        type: 'inferred_from_view',
        sourceView: view.objectName,
        confidence: 0.8,
      });
    }
  }
}

module.exports = new ViewAnalysisService();

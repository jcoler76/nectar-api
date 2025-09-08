const sql = require('mssql');
// MongoDB models replaced with Prisma for PostgreSQL migration
// const DatabaseObject = require('../models/DatabaseObject');
// const SchemaIntelligence = require('../models/SchemaIntelligence');
// const Connection = require('../models/Connection');
// const mongoose = require('mongoose');

const { PrismaClient } = require('../prisma/generated/client');
const prisma = new PrismaClient();

/**
 * SchemaIntelligenceService
 * Connects to Template20 database and retrieves schema information
 * Stores retrieved data in SchemaIntelligence model with proper categorization
 */

class SchemaIntelligenceService {
  constructor() {
    this.connectionPool = null;
    this.currentConnectionId = null;
  }

  /**
   * Initialize database connection using stored connection credentials
   */
  async initializeConnection(serviceId) {
    try {
      // TODO: Replace with Prisma query for PostgreSQL migration
      // Get the service to find associated connection
      // const Service = require('../models/Service');
      // const service = await Service.findById(serviceId);
      const service = null; // Placeholder
      if (!service) {
        throw new Error(`Service ${serviceId} not found`);
      }

      // TODO: Replace with Prisma query for PostgreSQL migration
      // Find Template20 connection (assuming it's the connection for this service)
      // const connection = await Connection.findOne({
      //   $or: [{ name: /template20/i }, { database: /template20/i }, { host: service.host }],
      // });
      const connection = null; // Placeholder

      if (!connection) {
        throw new Error('Template20 database connection not found');
      }

      // Create connection pool
      const config = {
        server: connection.host,
        database: connection.database || 'template20',
        user: connection.username,
        password: connection.password,
        port: connection.port || 1433,
        options: {
          encrypt: connection.encrypt || false,
          trustServerCertificate: connection.trustServerCertificate || true,
          connectionTimeout: 30000,
          requestTimeout: 60000,
          pool: {
            max: 10,
            min: 0,
            idleTimeoutMillis: 30000,
          },
        },
      };

      this.connectionPool = await new sql.ConnectionPool(config).connect();
      this.currentConnectionId = connection._id;

      console.log(`Connected to Template20 database: ${connection.host}/${connection.database}`);
      return this.connectionPool;
    } catch (error) {
      console.error('Database connection failed:', error);
      throw new Error(`Failed to connect to Template20 database: ${error.message}`);
    }
  }

  /**
   * Close database connection
   */
  async closeConnection() {
    if (this.connectionPool) {
      await this.connectionPool.close();
      this.connectionPool = null;
      this.currentConnectionId = null;
    }
  }

  /**
   * Retrieve schema information for selected objects
   */
  async retrieveSchemaForSelections(serviceId, userId, options = {}) {
    // TODO: Replace with Prisma transaction for PostgreSQL migration
    // const session = await mongoose.startSession();
    // session.startTransaction();

    try {
      const { objectTypes = ['table', 'view', 'procedure'], batchSize = 10 } = options;

      // Initialize connection
      await this.initializeConnection(serviceId);

      // TODO: Replace with Prisma query for PostgreSQL migration
      // Get pending objects for schema retrieval
      // const pendingObjects = await DatabaseObject.find({
      //   serviceId,
      //   isActive: true,
      //   schemaRetrieved: false,
      //   objectType: { $in: objectTypes },
      // }).sort({ priority: 1, createdAt: 1 });
      const pendingObjects = []; // Placeholder

      const results = {
        success: true,
        processed: 0,
        errors: 0,
        objects: [],
      };

      // Process objects in batches
      for (let i = 0; i < pendingObjects.length; i += batchSize) {
        const batch = pendingObjects.slice(i, i + batchSize);

        for (const dbObject of batch) {
          try {
            let schemaData;

            switch (dbObject.objectType) {
              case 'table':
                schemaData = await this.retrieveTableSchema(dbObject.objectName);
                break;
              case 'view':
                schemaData = await this.retrieveViewSchema(dbObject.objectName);
                break;
              case 'procedure':
                schemaData = await this.retrieveProcedureSchema(dbObject.objectName);
                break;
              default:
                throw new Error(`Unsupported object type: ${dbObject.objectType}`);
            }

            // Create SchemaIntelligence record
            const schemaIntelligence = await this.createSchemaIntelligenceRecord(
              dbObject,
              schemaData,
              userId,
              session
            );

            // TODO: Replace with Prisma query for PostgreSQL migration
            // Mark DatabaseObject as schema retrieved
            // await dbObject.markSchemaRetrieved('v1.0');

            results.processed++;
            results.objects.push({
              objectName: dbObject.objectName,
              objectType: dbObject.objectType,
              schemaIntelligenceId: schemaIntelligence._id,
              status: 'success',
            });
          } catch (error) {
            console.error(`Failed to retrieve schema for ${dbObject.objectName}:`, error);
            results.errors++;
            results.objects.push({
              objectName: dbObject.objectName,
              objectType: dbObject.objectType,
              status: 'error',
              error: error.message,
            });
          }
        }
      }

      // TODO: Replace with Prisma transaction for PostgreSQL migration
      // await session.commitTransaction();
      return results;
    } catch (error) {
      // await session.abortTransaction();
      throw new Error(`Schema retrieval failed: ${error.message}`);
    } finally {
      // await session.endSession();
      await this.closeConnection();
    }
  }

  /**
   * Retrieve table schema using SQL Server system views
   */
  async retrieveTableSchema(tableName) {
    try {
      const request = this.connectionPool.request();
      request.input('tableName', sql.NVarChar, tableName);
      request.input('schemaName', sql.NVarChar, 'dbo');

      // Get table information
      const tableInfoQuery = `
        SELECT 
          t.TABLE_NAME,
          t.TABLE_TYPE,
          CAST(p.rows AS INT) as ROW_COUNT,
          o.create_date as CREATED_DATE,
          o.modify_date as MODIFIED_DATE
        FROM INFORMATION_SCHEMA.TABLES t
        LEFT JOIN sys.objects o ON o.name = t.TABLE_NAME
        LEFT JOIN sys.partitions p ON o.object_id = p.object_id AND p.index_id < 2
        WHERE t.TABLE_NAME = @tableName 
          AND t.TABLE_SCHEMA = @schemaName
          AND t.TABLE_TYPE = 'BASE TABLE'
      `;

      const tableInfo = await request.query(tableInfoQuery);
      if (tableInfo.recordset.length === 0) {
        throw new Error(`Table ${tableName} not found`);
      }

      // Get column information
      const columnsQuery = `
        SELECT 
          c.COLUMN_NAME,
          c.ORDINAL_POSITION,
          c.DATA_TYPE,
          c.CHARACTER_MAXIMUM_LENGTH as MAX_LENGTH,
          c.NUMERIC_PRECISION as PRECISION,
          c.NUMERIC_SCALE as SCALE,
          CASE WHEN c.IS_NULLABLE = 'YES' THEN 1 ELSE 0 END as IS_NULLABLE,
          c.COLUMN_DEFAULT as DEFAULT_VALUE,
          CASE WHEN ic.COLUMN_NAME IS NOT NULL THEN 1 ELSE 0 END as IS_IDENTITY,
          CASE WHEN pk.COLUMN_NAME IS NOT NULL THEN 1 ELSE 0 END as IS_PRIMARY_KEY,
          CASE WHEN fk.COLUMN_NAME IS NOT NULL THEN 1 ELSE 0 END as IS_FOREIGN_KEY,
          fk.REFERENCED_TABLE_NAME,
          fk.REFERENCED_COLUMN_NAME,
          fk.CONSTRAINT_NAME as FK_CONSTRAINT_NAME
        FROM INFORMATION_SCHEMA.COLUMNS c
        LEFT JOIN (
          SELECT 
            c.COLUMN_NAME,
            c.TABLE_NAME
          FROM INFORMATION_SCHEMA.COLUMNS c
          INNER JOIN sys.identity_columns ic ON ic.object_id = OBJECT_ID(c.TABLE_SCHEMA + '.' + c.TABLE_NAME)
            AND ic.name = c.COLUMN_NAME
          WHERE c.TABLE_NAME = @tableName AND c.TABLE_SCHEMA = @schemaName
        ) ic ON ic.COLUMN_NAME = c.COLUMN_NAME AND ic.TABLE_NAME = c.TABLE_NAME
        LEFT JOIN (
          SELECT 
            ku.COLUMN_NAME,
            ku.TABLE_NAME
          FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
          INNER JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE ku ON tc.CONSTRAINT_NAME = ku.CONSTRAINT_NAME
          WHERE tc.CONSTRAINT_TYPE = 'PRIMARY KEY' 
            AND ku.TABLE_NAME = @tableName 
            AND ku.TABLE_SCHEMA = @schemaName
        ) pk ON pk.COLUMN_NAME = c.COLUMN_NAME AND pk.TABLE_NAME = c.TABLE_NAME
        LEFT JOIN (
          SELECT 
            ku.COLUMN_NAME,
            ku.TABLE_NAME,
            ku.CONSTRAINT_NAME,
            r.UNIQUE_CONSTRAINT_NAME,
            ku2.TABLE_NAME AS REFERENCED_TABLE_NAME,
            ku2.COLUMN_NAME AS REFERENCED_COLUMN_NAME
          FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS r
          INNER JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE ku ON r.CONSTRAINT_NAME = ku.CONSTRAINT_NAME
          INNER JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE ku2 ON r.UNIQUE_CONSTRAINT_NAME = ku2.CONSTRAINT_NAME
          WHERE ku.TABLE_NAME = @tableName AND ku.TABLE_SCHEMA = @schemaName
        ) fk ON fk.COLUMN_NAME = c.COLUMN_NAME AND fk.TABLE_NAME = c.TABLE_NAME
        WHERE c.TABLE_NAME = @tableName 
          AND c.TABLE_SCHEMA = @schemaName
        ORDER BY c.ORDINAL_POSITION
      `;

      const columns = await request.query(columnsQuery);

      // Get index information
      const indexesQuery = `
        SELECT 
          i.name as INDEX_NAME,
          i.type_desc as INDEX_TYPE,
          i.is_unique as IS_UNIQUE,
          i.is_primary_key as IS_PRIMARY_KEY,
          ic.key_ordinal as KEY_ORDINAL,
          c.name as COLUMN_NAME,
          ic.is_descending_key as IS_DESCENDING,
          i.filter_definition as FILTER_DEFINITION
        FROM sys.indexes i
        INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
        INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
        WHERE i.object_id = OBJECT_ID(@schemaName + '.' + @tableName)
          AND i.type > 0
        ORDER BY i.name, ic.key_ordinal
      `;

      const indexes = await request.query(indexesQuery);

      // Get foreign key information
      const foreignKeysQuery = `
        SELECT 
          fk.name as CONSTRAINT_NAME,
          c1.name as FROM_COLUMN,
          OBJECT_NAME(fk.referenced_object_id) as TO_TABLE,
          c2.name as TO_COLUMN,
          fk.delete_referential_action_desc as DELETE_RULE,
          fk.update_referential_action_desc as UPDATE_RULE,
          fk.is_disabled as IS_DISABLED
        FROM sys.foreign_keys fk
        INNER JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
        INNER JOIN sys.columns c1 ON fkc.parent_object_id = c1.object_id AND fkc.parent_column_id = c1.column_id
        INNER JOIN sys.columns c2 ON fkc.referenced_object_id = c2.object_id AND fkc.referenced_column_id = c2.column_id
        WHERE fk.parent_object_id = OBJECT_ID(@schemaName + '.' + @tableName)
      `;

      const foreignKeys = await request.query(foreignKeysQuery);

      // Process and structure the data
      return this.processTableSchemaData(
        tableInfo.recordset[0],
        columns.recordset,
        indexes.recordset,
        foreignKeys.recordset
      );
    } catch (error) {
      throw new Error(`Failed to retrieve table schema: ${error.message}`);
    }
  }

  /**
   * Retrieve view schema using sys.views and sys.sql_modules
   */
  async retrieveViewSchema(viewName) {
    try {
      const request = this.connectionPool.request();
      request.input('viewName', sql.NVarChar, viewName);
      request.input('schemaName', sql.NVarChar, 'dbo');

      // Get view definition and metadata
      const viewQuery = `
        SELECT 
          v.name as VIEW_NAME,
          v.create_date as CREATED_DATE,
          v.modify_date as MODIFIED_DATE,
          v.is_schema_bound as IS_SCHEMA_BOUND,
          v.with_check_option as IS_CHECK_OPTION,
          sm.definition as VIEW_DEFINITION,
          CASE WHEN v.is_updatable = 1 THEN 1 ELSE 0 END as IS_UPDATABLE
        FROM sys.views v
        INNER JOIN sys.sql_modules sm ON v.object_id = sm.object_id
        WHERE v.name = @viewName
          AND SCHEMA_NAME(v.schema_id) = @schemaName
      `;

      const viewInfo = await request.query(viewQuery);
      if (viewInfo.recordset.length === 0) {
        throw new Error(`View ${viewName} not found`);
      }

      // Get view column information
      const columnsQuery = `
        SELECT 
          c.name as COLUMN_NAME,
          c.column_id as ORDINAL_POSITION,
          t.name as DATA_TYPE,
          c.max_length as MAX_LENGTH,
          c.precision as PRECISION,
          c.scale as SCALE,
          c.is_nullable as IS_NULLABLE,
          c.is_computed as IS_COMPUTED
        FROM sys.views v
        INNER JOIN sys.columns c ON v.object_id = c.object_id
        INNER JOIN sys.types t ON c.user_type_id = t.user_type_id
        WHERE v.name = @viewName
          AND SCHEMA_NAME(v.schema_id) = @schemaName
        ORDER BY c.column_id
      `;

      const columns = await request.query(columnsQuery);

      // Parse view definition for dependencies and complexity
      const viewDefinition = viewInfo.recordset[0].VIEW_DEFINITION;
      const dependencies = this.parseViewDependencies(viewDefinition);
      const complexity = this.analyzeViewComplexity(viewDefinition);

      return this.processViewSchemaData(
        viewInfo.recordset[0],
        columns.recordset,
        dependencies,
        complexity
      );
    } catch (error) {
      throw new Error(`Failed to retrieve view schema: ${error.message}`);
    }
  }

  /**
   * Retrieve stored procedure schema using sys.procedures and sys.sql_modules
   */
  async retrieveProcedureSchema(procedureName) {
    try {
      const request = this.connectionPool.request();
      request.input('procedureName', sql.NVarChar, procedureName);
      request.input('schemaName', sql.NVarChar, 'dbo');

      // Get procedure definition and metadata
      const procedureQuery = `
        SELECT 
          p.name as PROCEDURE_NAME,
          p.create_date as CREATED_DATE,
          p.modify_date as MODIFIED_DATE,
          sm.definition as PROCEDURE_DEFINITION,
          p.type_desc as PROCEDURE_TYPE
        FROM sys.procedures p
        INNER JOIN sys.sql_modules sm ON p.object_id = sm.object_id
        WHERE p.name = @procedureName
          AND SCHEMA_NAME(p.schema_id) = @schemaName
      `;

      const procedureInfo = await request.query(procedureQuery);
      if (procedureInfo.recordset.length === 0) {
        throw new Error(`Procedure ${procedureName} not found`);
      }

      // Get parameter information
      const parametersQuery = `
        SELECT 
          p.name as PARAMETER_NAME,
          p.parameter_id as ORDINAL_POSITION,
          t.name as DATA_TYPE,
          p.max_length as MAX_LENGTH,
          p.precision as PRECISION,
          p.scale as SCALE,
          p.is_output as IS_OUTPUT,
          p.has_default_value as HAS_DEFAULT_VALUE,
          p.default_value as DEFAULT_VALUE
        FROM sys.procedures proc
        INNER JOIN sys.parameters p ON proc.object_id = p.object_id
        INNER JOIN sys.types t ON p.user_type_id = t.user_type_id
        WHERE proc.name = @procedureName
          AND SCHEMA_NAME(proc.schema_id) = @schemaName
          AND p.parameter_id > 0
        ORDER BY p.parameter_id
      `;

      const parameters = await request.query(parametersQuery);

      // Analyze procedure complexity and referenced objects
      const procedureDefinition = procedureInfo.recordset[0].PROCEDURE_DEFINITION;
      const complexity = this.analyzeProcedureComplexity(procedureDefinition);
      const referencedObjects = this.parseReferencedObjects(procedureDefinition);

      return this.processProcedureSchemaData(
        procedureInfo.recordset[0],
        parameters.recordset,
        complexity,
        referencedObjects
      );
    } catch (error) {
      throw new Error(`Failed to retrieve procedure schema: ${error.message}`);
    }
  }

  /**
   * Process table schema data into structured format
   */
  processTableSchemaData(tableInfo, columns, indexes, foreignKeys) {
    return {
      objectType: 'table',
      tableSchema: {
        tableType: tableInfo.TABLE_TYPE,
        rowCount: tableInfo.ROW_COUNT || 0,
        createdDate: tableInfo.CREATED_DATE,
        modifiedDate: tableInfo.MODIFIED_DATE,

        columns: columns.map(col => ({
          columnName: col.COLUMN_NAME,
          ordinalPosition: col.ORDINAL_POSITION,
          dataType: col.DATA_TYPE,
          maxLength: col.MAX_LENGTH,
          precision: col.PRECISION,
          scale: col.SCALE,
          isNullable: col.IS_NULLABLE === 1,
          defaultValue: col.DEFAULT_VALUE,
          isIdentity: col.IS_IDENTITY === 1,
          isPrimaryKey: col.IS_PRIMARY_KEY === 1,
          isForeignKey: col.IS_FOREIGN_KEY === 1,
          referencedTable: col.REFERENCED_TABLE_NAME,
          referencedColumn: col.REFERENCED_COLUMN_NAME,
          foreignKeyConstraintName: col.FK_CONSTRAINT_NAME,
        })),

        indexes: this.groupIndexes(indexes),

        foreignKeys: foreignKeys.map(fk => ({
          constraintName: fk.CONSTRAINT_NAME,
          fromColumn: fk.FROM_COLUMN,
          toTable: fk.TO_TABLE,
          toColumn: fk.TO_COLUMN,
          deleteRule: fk.DELETE_RULE,
          updateRule: fk.UPDATE_RULE,
          isEnabled: !fk.IS_DISABLED,
        })),
      },
    };
  }

  /**
   * Process view schema data into structured format
   */
  processViewSchemaData(viewInfo, columns, dependencies, complexity) {
    return {
      objectType: 'view',
      viewSchema: {
        viewDefinition: viewInfo.VIEW_DEFINITION,
        isSchemabound: viewInfo.IS_SCHEMA_BOUND === 1,
        isCheckOption: viewInfo.IS_CHECK_OPTION === 1,
        isUpdatable: viewInfo.IS_UPDATABLE === 1,
        complexityScore: complexity.score,
        joinCount: complexity.joinCount,
        subqueryCount: complexity.subqueryCount,
        caseStatementCount: complexity.caseCount,
        unionCount: complexity.unionCount,
        cteCount: complexity.cteCount,
        dependencies: dependencies,
        columnMappings: columns.map(col => ({
          viewColumn: col.COLUMN_NAME,
          dataType: col.DATA_TYPE,
          isComputed: col.IS_COMPUTED === 1,
        })),
      },
    };
  }

  /**
   * Process procedure schema data into structured format
   */
  processProcedureSchemaData(procedureInfo, parameters, complexity, referencedObjects) {
    return {
      objectType: 'procedure',
      procedureSchema: {
        procedureDefinition: procedureInfo.PROCEDURE_DEFINITION,
        createdDate: procedureInfo.CREATED_DATE,
        modifiedDate: procedureInfo.MODIFIED_DATE,
        parameters: parameters.map(param => ({
          parameterName: param.PARAMETER_NAME,
          ordinalPosition: param.ORDINAL_POSITION,
          dataType: param.DATA_TYPE,
          maxLength: param.MAX_LENGTH,
          precision: param.PRECISION,
          scale: param.SCALE,
          isOutput: param.IS_OUTPUT === 1,
          hasDefaultValue: param.HAS_DEFAULT_VALUE === 1,
          defaultValue: param.DEFAULT_VALUE,
        })),
        complexityMetrics: complexity,
        referencedObjects: referencedObjects,
      },
    };
  }

  /**
   * Create SchemaIntelligence record in MongoDB
   */
  async createSchemaIntelligenceRecord(databaseObject, schemaData, userId, session) {
    try {
      // TODO: Replace with Prisma query for PostgreSQL migration
      // const schemaIntelligence = new SchemaIntelligence({
      //   databaseObjectId: databaseObject._id,
      //   serviceId: databaseObject.serviceId,
      //   objectName: databaseObject.objectName,
      //   objectType: databaseObject.objectType,
      //   retrievedBy: userId,
      //   sourceLastModified:
      //     schemaData.tableSchema?.modifiedDate ||
      //     schemaData.viewSchema?.modifiedDate ||
      //     schemaData.procedureSchema?.modifiedDate,
      //   ...schemaData,
      //   businessContext: {
      //     businessEntity: databaseObject.businessEntity,
      //     businessImportance: databaseObject.businessImportance,
      //   },
      // });
      //
      // return await schemaIntelligence.save({ session });
      
      const schemaIntelligenceData = {
        databaseObjectId: databaseObject._id,
        serviceId: databaseObject.serviceId,
        objectName: databaseObject.objectName,
        objectType: databaseObject.objectType,
        retrievedBy: userId,
        sourceLastModified:
          schemaData.tableSchema?.modifiedDate ||
          schemaData.viewSchema?.modifiedDate ||
          schemaData.procedureSchema?.modifiedDate,
        ...schemaData,
        businessContext: {
          businessEntity: databaseObject.businessEntity,
          businessImportance: databaseObject.businessImportance,
        },
      };
      
      // return await prisma.schemaIntelligence.create({ data: schemaIntelligenceData });
      return { id: 'placeholder' }; // Placeholder
    } catch (error) {
      throw new Error(`Failed to create SchemaIntelligence record: ${error.message}`);
    }
  }

  /**
   * Helper methods for parsing and analysis
   */
  groupIndexes(indexes) {
    const grouped = {};

    indexes.forEach(idx => {
      if (!grouped[idx.INDEX_NAME]) {
        grouped[idx.INDEX_NAME] = {
          indexName: idx.INDEX_NAME,
          indexType: idx.INDEX_TYPE,
          isUnique: idx.IS_UNIQUE === 1,
          isPrimaryKey: idx.IS_PRIMARY_KEY === 1,
          filterDefinition: idx.FILTER_DEFINITION,
          columns: [],
        };
      }

      grouped[idx.INDEX_NAME].columns.push({
        columnName: idx.COLUMN_NAME,
        isDescending: idx.IS_DESCENDING === 1,
        keyOrdinal: idx.KEY_ORDINAL,
      });
    });

    return Object.values(grouped);
  }

  parseViewDependencies(viewDefinition) {
    // Simplified dependency parsing - would need more sophisticated SQL parsing
    const dependencies = [];
    const fromRegex = /FROM\s+(\w+\.?\w+)/gi;
    const joinRegex = /JOIN\s+(\w+\.?\w+)/gi;

    let match;
    while ((match = fromRegex.exec(viewDefinition)) !== null) {
      dependencies.push({
        dependentTable: match[1].replace(/^\w+\./, ''), // Remove schema prefix
        isBaseTabe: true,
      });
    }

    while ((match = joinRegex.exec(viewDefinition)) !== null) {
      dependencies.push({
        dependentTable: match[1].replace(/^\w+\./, ''),
        isBaseTabe: false,
      });
    }

    return dependencies;
  }

  analyzeViewComplexity(viewDefinition) {
    return {
      score: 'moderate', // Would need more sophisticated analysis
      joinCount: (viewDefinition.match(/JOIN/gi) || []).length,
      subqueryCount: (viewDefinition.match(/SELECT.*FROM.*SELECT/gi) || []).length,
      caseCount: (viewDefinition.match(/CASE\s+WHEN/gi) || []).length,
      unionCount: (viewDefinition.match(/UNION/gi) || []).length,
      cteCount: (viewDefinition.match(/WITH\s+\w+\s+AS/gi) || []).length,
    };
  }

  analyzeProcedureComplexity(procedureDefinition) {
    return {
      lineCount: procedureDefinition.split('\n').length,
      statementCount: (procedureDefinition.match(/;/g) || []).length,
      ifStatementCount: (procedureDefinition.match(/IF\s+/gi) || []).length,
      whileLoopCount: (procedureDefinition.match(/WHILE\s+/gi) || []).length,
      cursorCount: (procedureDefinition.match(/DECLARE.*CURSOR/gi) || []).length,
      tryBlockCount: (procedureDefinition.match(/BEGIN\s+TRY/gi) || []).length,
      tempTableCount: (viewDefinition.match(/#\w+/g) || []).length,
    };
  }

  parseReferencedObjects(procedureDefinition) {
    // Simplified object reference parsing
    const referencedObjects = [];
    const tableRegex = /(?:FROM|JOIN|UPDATE|INSERT\s+INTO|DELETE\s+FROM)\s+(\w+\.?\w+)/gi;

    let match;
    while ((match = tableRegex.exec(procedureDefinition)) !== null) {
      const objectName = match[1].replace(/^\w+\./, '');
      if (!referencedObjects.find(obj => obj.objectName === objectName)) {
        referencedObjects.push({
          objectName,
          objectType: 'table', // Would need more analysis to determine type
          accessType: 'SELECT', // Would need more analysis to determine access type
          schemaName: 'dbo',
        });
      }
    }

    return referencedObjects;
  }
}

module.exports = new SchemaIntelligenceService();

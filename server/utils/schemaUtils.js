const sql = require('mssql');
const { logger } = require('./logger');

const fetchDatabaseObjects = async config => {
  let pool;
  try {
    // Fetching database objects for schema refresh

    pool = await sql.connect(config);
    logger.info('SQL connection established for schema fetch');

    // Get tables
    const tablesResult = await pool.request().query(`
      SELECT 
        t.name AS table_name,
        s.name AS schema_name,
        'TABLE' AS object_type
      FROM sys.tables t
      INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
      WHERE t.is_ms_shipped = 0
      ORDER BY s.name, t.name
    `);
    logger.info(`Found ${tablesResult.recordset.length} tables`);

    // Get views
    const viewsResult = await pool.request().query(`
      SELECT 
        v.name AS view_name,
        s.name AS schema_name,
        'VIEW' AS object_type
      FROM sys.views v
      INNER JOIN sys.schemas s ON v.schema_id = s.schema_id
      WHERE v.is_ms_shipped = 0
      ORDER BY s.name, v.name
    `);
    logger.info(`Found ${viewsResult.recordset.length} views`);

    // Get procedures
    const proceduresResult = await pool.request().query(`
      SELECT 
        p.name AS procedure_name,
        s.name AS schema_name,
        'PROCEDURE' AS object_type
      FROM sys.procedures p
      INNER JOIN sys.schemas s ON p.schema_id = s.schema_id
      WHERE p.is_ms_shipped = 0
      ORDER BY s.name, p.name
    `);
    logger.info(`Found ${proceduresResult.recordset.length} procedures`);

    return {
      tables: tablesResult.recordset,
      views: viewsResult.recordset,
      procedures: proceduresResult.recordset,
    };
  } catch (error) {
    logger.error('Error fetching database objects:', {
      message: error.message,
      code: error.code,
      state: error.state,
      stack: error.stack,
      database: config.database,
    });
    throw error;
  } finally {
    if (pool) {
      try {
        await pool.close();
        logger.info('SQL connection closed after schema fetch');
      } catch (err) {
        logger.error('Error closing SQL connection after schema fetch:', err);
      }
    }
  }
};

const updateDatabaseObjects = async (serviceId, objects) => {
  try {
    logger.info('Updating database objects for service:', serviceId);

    // Import Service model
    const Service = require('../models/Service');

    // Transform the database objects to include path for MongoDB storage
    const transformedProcedures = objects.procedures.map(proc => ({
      name: proc.procedure_name || proc.name || '',
      schema: proc.schema_name || proc.schema || 'dbo',
      type: 'PROCEDURE',
      path: `/proc/${proc.procedure_name || proc.name || ''}`,
    }));

    const transformedViews = objects.views.map(view => ({
      name: view.view_name || view.name || '',
      schema: view.schema_name || view.schema || 'dbo',
      type: 'VIEW',
      path: `/view/${view.view_name || view.name || ''}`,
    }));

    const transformedTables = objects.tables.map(table => ({
      name: table.table_name || table.name || '',
      schema: table.schema_name || table.schema || 'dbo',
      type: 'TABLE',
      path: `/table/${table.table_name || table.name || ''}`,
    }));

    // Sort each category alphabetically by path
    const sortedProcs = transformedProcedures.sort((a, b) => a.path.localeCompare(b.path));

    const sortedViews = transformedViews.sort((a, b) => a.path.localeCompare(b.path));

    const sortedTables = transformedTables.sort((a, b) => a.path.localeCompare(b.path));

    // Combine in the desired order: procs, views, tables
    const allObjects = [...sortedProcs, ...sortedViews, ...sortedTables];

    logger.info('Transformed object counts:', {
      tables: sortedTables.length,
      views: sortedViews.length,
      procedures: sortedProcs.length,
      total: allObjects.length,
    });

    logger.info('Saving all objects to MongoDB, total count:', allObjects.length);

    // Update the service with the objects array
    const result = await Service.findByIdAndUpdate(
      serviceId,
      {
        objects: allObjects,
      },
      { new: true }
    );

    logger.info('Database objects saved successfully');

    return {
      totalObjects: allObjects.length,
      tables: sortedTables,
      views: sortedViews,
      procedures: sortedProcs,
    };
  } catch (error) {
    logger.error('Error updating database objects:', error);
    throw error;
  }
};

const fetchSchemaFromDatabase = async (serviceOrPool, objectName) => {
  let pool = serviceOrPool;
  let shouldCloseConnection = false;

  try {
    // If service object was passed, create connection
    if (serviceOrPool && !serviceOrPool.request) {
      const config = {
        server: serviceOrPool.host,
        port: serviceOrPool.port,
        database: serviceOrPool.database,
        user: serviceOrPool.username,
        password: serviceOrPool.password, // Password should already be decrypted by caller
        options: {
          encrypt: true,
          trustServerCertificate: true,
        },
      };

      pool = await sql.connect(config);
      shouldCloseConnection = true;
      logger.info('SQL connection established for schema fetch');
    }

    // Clean object name (remove path prefixes if present)
    const cleanObjectName = objectName.replace(/^\/proc\/|^\/view\/|^\/table\//, '');

    // Get stored procedure parameters and metadata
    const procedureQuery = `
      SELECT 
        p.name AS procedure_name,
        s.name AS schema_name,
        p.create_date,
        p.modify_date,
        param.name AS parameter_name,
        param.parameter_id,
        param.system_type_id,
        param.user_type_id,
        param.max_length,
        param.precision,
        param.scale,
        param.is_output,
        param.is_nullable,
        t.name AS type_name
      FROM sys.procedures p
      INNER JOIN sys.schemas s ON p.schema_id = s.schema_id
      LEFT JOIN sys.parameters param ON p.object_id = param.object_id
      LEFT JOIN sys.types t ON param.system_type_id = t.system_type_id
      WHERE p.name = @objectName
      ORDER BY param.parameter_id
    `;

    const request = pool.request();
    request.input('objectName', sql.VarChar, cleanObjectName);
    const result = await request.query(procedureQuery);

    if (result.recordset.length === 0) {
      // Try as a view or table
      const viewTableQuery = `
        SELECT 
          o.name AS object_name,
          s.name AS schema_name,
          o.create_date,
          o.modify_date,
          o.type_desc AS object_type,
          c.name AS column_name,
          c.column_id,
          t.name AS type_name,
          c.max_length,
          c.precision,
          c.scale,
          c.is_nullable
        FROM sys.objects o
        INNER JOIN sys.schemas s ON o.schema_id = s.schema_id
        LEFT JOIN sys.columns c ON o.object_id = c.object_id
        LEFT JOIN sys.types t ON c.system_type_id = t.system_type_id
        WHERE o.name = @objectName AND o.type IN ('U', 'V')
        ORDER BY c.column_id
      `;

      const viewTableRequest = pool.request();
      viewTableRequest.input('objectName', sql.VarChar, cleanObjectName);
      const viewTableResult = await viewTableRequest.query(viewTableQuery);

      if (viewTableResult.recordset.length === 0) {
        throw new Error(`Object '${cleanObjectName}' not found in database`);
      }

      // Process view/table results
      const firstRow = viewTableResult.recordset[0];
      const columns = viewTableResult.recordset.map(row => ({
        name: row.column_name,
        parameterId: row.column_id,
        type: row.type_name,
        maxLength: row.max_length,
        precision: row.precision,
        scale: row.scale,
        isNullable: row.is_nullable,
        isOutput: false,
        description: `Column ${row.column_id} for ${firstRow.object_name}`,
      }));

      return {
        procedure: {
          name: firstRow.object_name,
          schema: firstRow.schema_name,
          created: firstRow.create_date,
          modified: firstRow.modify_date,
          type: firstRow.object_type,
        },
        parameters: columns,
      };
    }

    // Process stored procedure results
    const firstRow = result.recordset[0];
    const parameters = result.recordset
      .filter(row => row.parameter_name) // Filter out rows without parameters
      .map(row => ({
        name: row.parameter_name,
        parameterId: row.parameter_id,
        type: row.type_name,
        maxLength: row.max_length,
        precision: row.precision,
        scale: row.scale,
        isOutput: row.is_output,
        isNullable: row.is_nullable,
        description: `Parameter ${row.parameter_id} for ${firstRow.procedure_name}`,
      }));

    return {
      procedure: {
        name: firstRow.procedure_name,
        schema: firstRow.schema_name,
        created: firstRow.create_date,
        modified: firstRow.modify_date,
        type: 'PROCEDURE',
      },
      parameters,
    };
  } catch (error) {
    logger.error('Error fetching schema from database:', {
      message: error.message,
      code: error.code,
      state: error.state,
      stack: error.stack,
      objectName,
    });
    throw error;
  } finally {
    if (shouldCloseConnection && pool) {
      try {
        await pool.close();
        logger.info('SQL connection closed after schema fetch');
      } catch (err) {
        logger.error('Error closing SQL connection after schema fetch:', err);
      }
    }
  }
};

module.exports = {
  fetchDatabaseObjects,
  updateDatabaseObjects,
  fetchSchemaFromDatabase,
};

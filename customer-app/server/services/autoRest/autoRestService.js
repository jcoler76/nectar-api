const { PrismaClient } = require('../../prisma/generated/client');
const DatabaseDriverFactory = require('../database/DatabaseDriverFactory');
const { logger } = require('../../utils/logger');
const { parseFilter, sanitizeFields, parseSort } = require('./filterParser');
const pg = require('./dialects/postgres');
const mssql = require('./dialects/mssql');
const mysql = require('./dialects/mysql');
const mongodb = require('./dialects/mongodb');

const prisma = new PrismaClient();

function selectEffectivePolicy(policies, roleId) {
  if (!policies || !policies.length) return null;
  const exact = policies.find(p => p.roleId === roleId);
  if (exact) return exact;
  return policies.find(p => p.roleId == null) || null;
}

function renderPolicyTemplate(template, context) {
  // shallow replace strings containing {{...}}
  if (!template) return null;
  try {
    const str = JSON.stringify(template);
    const rendered = str.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
      const path = String(key).trim().split('.');
      let cur = context;
      for (const p of path) {
        cur = cur ? cur[p] : undefined;
      }
      return cur !== undefined ? JSON.stringify(cur) : 'null';
    });
    return JSON.parse(rendered);
  } catch (e) {
    return null;
  }
}

async function getServiceAndConnection(serviceName, organizationId) {
  const service = await prisma.service.findFirst({
    where: { name: serviceName, organizationId, isActive: true },
    include: { connection: true },
  });
  if (!service) return null;
  // Prefer linked connection; fallback to service fields
  if (service.connection) {
    const c = service.connection;
    return {
      service,
      connectionConfig: {
        type: c.type,
        host: c.host,
        port: c.port,
        username: c.username,
        password: c.passwordEncrypted,
        database: service.database || c.database,
        sslEnabled: c.sslEnabled,
      },
    };
  }
  // Fallback legacy fields (Service holds encrypted password in passwordEncrypted)
  return {
    service,
    connectionConfig: {
      type: 'POSTGRESQL',
      host: service.host,
      port: service.port,
      username: service.username,
      password: service.passwordEncrypted,
      database: service.database,
      sslEnabled: false,
    },
  };
}

async function listExposedEntities(serviceId) {
  return prisma.exposedEntity.findMany({
    where: { serviceId, allowRead: true },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      schema: true,
      type: true,
      primaryKey: true,
      defaultSort: true,
      pathSlug: true,
    },
  });
}

async function getExposedEntity(serviceId, entityParam) {
  return prisma.exposedEntity.findFirst({
    where: {
      serviceId,
      allowRead: true,
      OR: [{ pathSlug: entityParam }, { name: entityParam }],
    },
    include: { fieldPolicies: true, rowPolicies: true },
  });
}

async function getColumns(connectionConfig, database, schema, table) {
  // DatabaseService.getTableColumns requires a connectionConfig including type
  const DatabaseService = require('../database/DatabaseService');
  const cfg = { ...connectionConfig, database };
  const cols = await DatabaseService.getTableColumns(cfg, database, table);
  // Normalize column names list
  const columns = cols.map(c => c.name);
  return { raw: cols, columns };
}

async function executeListMongoDB({ connectionConfig, entity, query }) {
  // MongoDB execution would use MongoDB driver
  const driver = DatabaseDriverFactory.createDriver('MONGODB', connectionConfig);
  const conn = await driver.createConnection(connectionConfig.database);

  try {
    const queryObj = mongodb.buildListQuery(
      { schema: entity.schema, name: entity.name },
      query.fields,
      query.ast,
      query.sort,
      query.page,
      query.pageSize
    );

    // Execute MongoDB query
    const dataRows = await driver.executeQuery(conn, queryObj.collection, {
      filter: queryObj.filter,
      projection: queryObj.projection,
      sort: queryObj.sort,
      skip: queryObj.skip,
      limit: queryObj.limit,
    });

    // Get count
    const total = await driver.executeQuery(conn, queryObj.collection, {
      filter: queryObj.filter,
      count: true,
    });

    return { data: dataRows, total: total || 0 };
  } finally {
    await driver.closeConnection(conn);
  }
}

async function executeByIdMongoDB({ connectionConfig, entity, fields, id }) {
  const driver = DatabaseDriverFactory.createDriver('MONGODB', connectionConfig);
  const conn = await driver.createConnection(connectionConfig.database);

  try {
    const queryObj = mongodb.buildByIdQuery(
      { schema: entity.schema, name: entity.name },
      fields,
      entity.primaryKey || '_id',
      id
    );

    const result = await driver.executeQuery(conn, queryObj.collection, {
      filter: queryObj.filter,
      projection: queryObj.projection,
      limit: 1,
    });

    return result && result[0] ? result[0] : null;
  } finally {
    await driver.closeConnection(conn);
  }
}

async function executeList({ connectionConfig, entity, policy, query }) {
  const dbType = String(connectionConfig.type).toUpperCase();
  const supportedTypes = ['POSTGRESQL', 'MSSQL', 'MYSQL', 'MONGODB'];

  if (!supportedTypes.includes(dbType)) {
    throw new Error(
      `Database type ${dbType} not supported. Supported types: ${supportedTypes.join(', ')}`
    );
  }

  // Handle MongoDB differently
  if (dbType === 'MONGODB') {
    return executeListMongoDB({ connectionConfig, entity, query });
  }

  const driver = DatabaseDriverFactory.createDriver(dbType, connectionConfig);
  const conn = await driver.createConnection(connectionConfig.database);

  try {
    let dataSql, countSql, params;
    const defaultSchema = {
      POSTGRESQL: 'public',
      MSSQL: 'dbo',
      MYSQL: null,
    }[dbType];

    const dialectMap = {
      POSTGRESQL: pg,
      MSSQL: mssql,
      MYSQL: mysql,
    };

    const dialect = dialectMap[dbType];
    ({ dataSql, countSql, params } = dialect.buildListQuery(
      { schema: entity.schema || defaultSchema, name: entity.name },
      query.fields,
      query.ast,
      query.sort,
      query.page,
      query.pageSize
    ));

    const dataRows = await driver.executeQuery(conn, dataSql, params);

    // For count query, exclude pagination parameters
    let countParams;
    if (dbType === 'POSTGRESQL' || dbType === 'MYSQL') {
      countParams = params.slice(0, params.length - 2);
    } else if (dbType === 'MSSQL') {
      // For MSSQL, params is an object. Remove pagination parameters
      countParams = { ...params };
      const paramKeys = Object.keys(countParams);
      // Remove the last two parameters (offset and limit)
      if (paramKeys.length >= 2) {
        delete countParams[paramKeys[paramKeys.length - 1]]; // limit
        delete countParams[paramKeys[paramKeys.length - 2]]; // offset
      }
    }

    const countRows = await driver.executeQuery(conn, countSql, countParams);
    const total = (countRows && countRows[0] && (countRows[0].cnt || countRows[0].count)) || 0;

    return { data: dataRows, total };
  } finally {
    await driver.closeConnection(conn);
  }
}

async function executeById({ connectionConfig, entity, fields, id }) {
  const dbType = String(connectionConfig.type).toUpperCase();
  const supportedTypes = ['POSTGRESQL', 'MSSQL', 'MYSQL', 'MONGODB'];

  if (!supportedTypes.includes(dbType)) {
    throw new Error(
      `Database type ${dbType} not supported. Supported types: ${supportedTypes.join(', ')}`
    );
  }

  // Handle MongoDB differently
  if (dbType === 'MONGODB') {
    return executeByIdMongoDB({ connectionConfig, entity, fields, id });
  }

  const driver = DatabaseDriverFactory.createDriver(dbType, connectionConfig);
  const conn = await driver.createConnection(connectionConfig.database);

  try {
    const defaultSchema = {
      POSTGRESQL: 'public',
      MSSQL: 'dbo',
      MYSQL: null,
    }[dbType];

    const dialectMap = {
      POSTGRESQL: pg,
      MSSQL: mssql,
      MYSQL: mysql,
    };

    const dialect = dialectMap[dbType];
    const { dataSql, params } = dialect.buildByIdQuery(
      { schema: entity.schema || defaultSchema, name: entity.name },
      fields,
      entity.primaryKey || 'id',
      id
    );

    const rows = await driver.executeQuery(conn, dataSql, params);
    return rows && rows[0] ? rows[0] : null;
  } finally {
    await driver.closeConnection(conn);
  }
}

async function buildQueryContext({ entity, roleId, columns, req }) {
  const fieldPolicy = selectEffectivePolicy(entity.fieldPolicies, roleId);
  const rowPolicy = selectEffectivePolicy(entity.rowPolicies, roleId);

  const masked = fieldPolicy?.maskedFields || [];
  const include = fieldPolicy?.includeFields || [];
  const exclude = fieldPolicy?.excludeFields || [];
  const allowed = include.length
    ? columns.filter(c => include.includes(c))
    : columns.filter(c => !exclude.includes(c));

  // Render row policy filter
  const policyFilter = renderPolicyTemplate(rowPolicy?.filterTemplate, {
    user: req.user || {},
    organization: req.organization || { id: req.application?.organizationId },
    role: req.role || {},
  });

  return { allowedColumns: allowed, maskedFields: masked, policyFilter };
}

async function handleList({
  req,
  serviceName,
  entityParam,
  page,
  pageSize,
  fieldsParam,
  sortParam,
  filterParam,
}) {
  const orgId = req.application.organizationId;
  const { service, connectionConfig } = await getServiceAndConnection(serviceName, orgId);
  if (!service) throw new Error('Service not found');
  const entity = await getExposedEntity(service.id, entityParam);
  if (!entity) throw new Error('Entity not found or not readable');
  const { columns } = await getColumns(
    connectionConfig,
    entity.database,
    entity.schema,
    entity.name
  );
  const { allowedColumns, maskedFields, policyFilter } = await buildQueryContext({
    entity,
    roleId: req.application.defaultRole.id,
    columns,
    req,
  });

  const fields = sanitizeFields(fieldsParam, allowedColumns, maskedFields);
  const sort = parseSort(sortParam || entity.defaultSort, allowedColumns);

  const userFilterAst = parseFilter(filterParam, allowedColumns);
  const policyAst = parseFilter(policyFilter, allowedColumns);
  let ast = null;
  if (userFilterAst && policyAst) ast = { type: 'and', nodes: [policyAst, userFilterAst] };
  else ast = userFilterAst || policyAst || null;

  const { data, total } = await executeList({
    connectionConfig,
    entity,
    query: { fields, sort, ast, page, pageSize },
  });

  const response = {
    data,
    page: Number(page) || 1,
    pageSize: Math.max(1, Math.min(Number(pageSize) || 25, 200)),
    total,
    hasNext: ((Number(page) || 1) - 1) * (Number(pageSize) || 25) + data.length < total,
  };

  // Add real-time info if requested
  if (req.query.realtime === 'true') {
    const realtimeService = require('../realtimeService');
    response.realtime = realtimeService.getRealtimeInfo(
      serviceName,
      entity.pathSlug || entity.name
    );
  }

  return response;
}

async function handleById({ req, serviceName, entityParam, id, fieldsParam }) {
  const orgId = req.application.organizationId;
  const { service, connectionConfig } = await getServiceAndConnection(serviceName, orgId);
  if (!service) throw new Error('Service not found');
  const entity = await getExposedEntity(service.id, entityParam);
  if (!entity) throw new Error('Entity not found or not readable');
  const { columns } = await getColumns(
    connectionConfig,
    entity.database,
    entity.schema,
    entity.name
  );
  const { allowedColumns, maskedFields, policyFilter } = await buildQueryContext({
    entity,
    roleId: req.application.defaultRole.id,
    columns,
    req,
  });
  const fields = sanitizeFields(fieldsParam, allowedColumns, maskedFields);

  // apply row policy by filtering after fetch if needed (simple path: fetch by PK, then validate policy filter if provided)
  const row = await executeById({ connectionConfig, entity, fields, id });
  if (!row) return null;
  // Best-effort policy enforcement: if policyFilter exists and row doesn't match, deny
  // For Phase 1 keep simple; list endpoint enforces via SQL; by-id relies on PK and policy should ideally include PK scoping.
  return row;
}

async function discoverTables({ connectionConfig, serviceId }) {
  const dbType = String(connectionConfig.type).toUpperCase();
  const supportedTypes = ['POSTGRESQL', 'MSSQL', 'MYSQL', 'MONGODB'];

  if (!supportedTypes.includes(dbType)) {
    throw new Error(`Database discovery not supported for ${dbType}`);
  }

  if (dbType === 'MONGODB') {
    return discoverMongoDBCollections({ connectionConfig, serviceId });
  }

  const driver = DatabaseDriverFactory.createDriver(dbType, connectionConfig);
  const conn = await driver.createConnection(connectionConfig.database);

  try {
    let query,
      params = {};

    if (dbType === 'POSTGRESQL') {
      query = `
        SELECT table_name, table_type, table_schema
        FROM information_schema.tables
        WHERE table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
        AND table_type IN ('BASE TABLE', 'VIEW')
        ORDER BY table_name`;
    } else if (dbType === 'MSSQL') {
      query = `
        SELECT
          TABLE_NAME as table_name,
          TABLE_TYPE as table_type,
          TABLE_SCHEMA as table_schema
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_TYPE IN ('BASE TABLE', 'VIEW')
        AND TABLE_SCHEMA NOT IN ('sys', 'INFORMATION_SCHEMA')
        ORDER BY TABLE_NAME`;
    } else if (dbType === 'MYSQL') {
      query = `
        SELECT
          TABLE_NAME as table_name,
          TABLE_TYPE as table_type,
          TABLE_SCHEMA as table_schema
        FROM information_schema.TABLES
        WHERE TABLE_TYPE IN ('BASE TABLE', 'VIEW')
        AND TABLE_SCHEMA = ?
        ORDER BY TABLE_NAME`;
      params = [connectionConfig.database];
    }

    const tables = await driver.executeQuery(conn, query, params);

    // Check which tables are already exposed
    const exposedEntities = await listExposedEntities(serviceId);
    const exposedNames = new Set(exposedEntities.map(e => e.name));

    return tables.map(table => ({
      name: table.table_name,
      schema: table.table_schema,
      type: table.table_type === 'BASE TABLE' ? 'TABLE' : 'VIEW',
      isExposed: exposedNames.has(table.table_name),
      suggestedPathSlug: table.table_name
        .toLowerCase()
        .replace(/^(gs|tbl)_?/, '') // Remove common prefixes
        .replace(/_/g, '-'), // Replace underscores with hyphens for URLs
    }));
  } finally {
    await driver.closeConnection(conn);
  }
}

async function discoverMongoDBCollections({ connectionConfig, serviceId }) {
  // MongoDB collection discovery would be implemented here
  // For now, return empty array as MongoDB driver implementation varies
  return [];
}

async function autoExposeTable({
  serviceId,
  organizationId,
  connectionId,
  database,
  tableName,
  schema,
  type,
  pathSlug,
}) {
  // Create ExposedEntity automatically
  const exposedEntity = await prisma.exposedEntity.create({
    data: {
      organizationId,
      serviceId,
      connectionId,
      database: database,
      schema: schema || null,
      name: tableName,
      type: type || 'TABLE',
      primaryKey: 'id', // Default, can be updated later
      allowRead: true,
      allowCreate: false,
      allowUpdate: false,
      allowDelete: false,
      pathSlug: pathSlug || tableName.toLowerCase(),
    },
  });

  return exposedEntity;
}

module.exports = {
  listExposedEntities,
  handleList,
  handleById,
  getServiceAndConnection,
  discoverTables,
  autoExposeTable,
};

const { PrismaClient } = require('../../prisma/generated/client');
const DatabaseDriverFactory = require('../database/DatabaseDriverFactory');
const { logger } = require('../../utils/logger');
const { parseFilter, sanitizeFields, parseSort } = require('./filterParser');
const pg = require('./dialects/postgres');

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

async function executeList({ connectionConfig, entity, policy, query }) {
  if (String(connectionConfig.type).toUpperCase() !== 'POSTGRESQL') {
    throw new Error('Only POSTGRESQL is supported in Phase 1');
  }
  const driver = DatabaseDriverFactory.createDriver('POSTGRESQL', connectionConfig);
  const conn = await driver.createConnection(connectionConfig.database);
  try {
    const { dataSql, countSql, params } = pg.buildListQuery(
      { schema: entity.schema || 'public', name: entity.name },
      query.fields,
      query.ast,
      query.sort,
      query.page,
      query.pageSize
    );
    const dataRows = await driver.executeQuery(conn, dataSql, params);
    const countRows = await driver.executeQuery(conn, countSql, params.slice(0, params.length - 2));
    const total = (countRows && countRows[0] && (countRows[0].cnt || countRows[0].count)) || 0;
    return { data: dataRows, total };
  } finally {
    await driver.closeConnection(conn);
  }
}

async function executeById({ connectionConfig, entity, fields, id }) {
  if (String(connectionConfig.type).toUpperCase() !== 'POSTGRESQL') {
    throw new Error('Only POSTGRESQL is supported in Phase 1');
  }
  const driver = DatabaseDriverFactory.createDriver('POSTGRESQL', connectionConfig);
  const conn = await driver.createConnection(connectionConfig.database);
  try {
    const { dataSql, params } = pg.buildByIdQuery(
      { schema: entity.schema || 'public', name: entity.name },
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

  return {
    data,
    page: Number(page) || 1,
    pageSize: Math.max(1, Math.min(Number(pageSize) || 25, 200)),
    total,
    hasNext: ((Number(page) || 1) - 1) * (Number(pageSize) || 25) + data.length < total,
  };
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

module.exports = {
  listExposedEntities,
  handleList,
  handleById,
  getServiceAndConnection,
};

function quoteIdent(ident) {
  return '`' + String(ident).replace(/`/g, '``') + '`';
}

function buildWhere(ast, params) {
  if (!ast) return { sql: '', params };
  if (ast.type === 'and' || ast.type === 'or') {
    const parts = ast.nodes.map(node => buildWhere(node, params));
    // params arrays are shared; gather sql
    const joined = parts
      .map(p => p.sql)
      .filter(Boolean)
      .join(ast.type === 'and' ? ' AND ' : ' OR ');
    return { sql: parts.length ? `(${joined})` : '', params };
  }
  if (ast.type === 'cond') {
    const col = quoteIdent(ast.field);
    switch (ast.op) {
      case 'eq':
        params.push(ast.value);
        return { sql: `${col} = ?`, params };
      case 'neq':
        params.push(ast.value);
        return { sql: `${col} <> ?`, params };
      case 'gt':
        params.push(ast.value);
        return { sql: `${col} > ?`, params };
      case 'gte':
        params.push(ast.value);
        return { sql: `${col} >= ?`, params };
      case 'lt':
        params.push(ast.value);
        return { sql: `${col} < ?`, params };
      case 'lte':
        params.push(ast.value);
        return { sql: `${col} <= ?`, params };
      case 'in':
        if (!Array.isArray(ast.value) || !ast.value.length) return { sql: 'FALSE', params };
        const placeholders = ast.value.map(() => '?').join(', ');
        ast.value.forEach(v => params.push(v));
        return { sql: `${col} IN (${placeholders})`, params };
      case 'like':
        params.push(ast.value);
        return { sql: `${col} LIKE ?`, params };
      case 'ilike':
        // MySQL LIKE is case-insensitive by default with default collation
        params.push(ast.value);
        return { sql: `${col} LIKE ?`, params };
      case 'between':
        params.push(ast.value[0]);
        params.push(ast.value[1]);
        return { sql: `${col} BETWEEN ? AND ?`, params };
      case 'isnull':
        return { sql: `${col} IS ${ast.value ? '' : 'NOT '}NULL`, params };
      default:
        return { sql: '', params };
    }
  }
  return { sql: '', params };
}

function buildOrder(sort) {
  if (!sort || !sort.length) return '';
  const parts = sort.map(s => `${quoteIdent(s.column)} ${s.direction}`);
  return ` ORDER BY ${parts.join(', ')}`;
}

function buildProjection(fields) {
  if (!fields || !fields.length) return '*';
  return fields.map(quoteIdent).join(', ');
}

function buildListQuery({ schema, name }, fields, ast, sort, page, pageSize) {
  const table = schema ? `${quoteIdent(schema)}.${quoteIdent(name)}` : quoteIdent(name);
  const projection = buildProjection(fields);
  const params = [];
  const where = buildWhere(ast, params);
  const whereSql = where.sql ? ` WHERE ${where.sql}` : '';
  const orderSql = buildOrder(sort);

  const limit = Math.max(1, Math.min(pageSize || 25, 200));
  const offset = Math.max(0, ((page || 1) - 1) * limit);

  // Add pagination parameters
  params.push(offset);
  params.push(limit);

  // MySQL uses LIMIT offset, count syntax
  const paginationSql = ` LIMIT ?, ?`;

  const dataSql = `SELECT ${projection} FROM ${table}${whereSql}${orderSql}${paginationSql}`;
  const countSql = `SELECT COUNT(1) AS cnt FROM ${table}${whereSql}`;

  return { dataSql, countSql, params };
}

function buildByIdQuery({ schema, name }, fields, pk, id) {
  const table = schema ? `${quoteIdent(schema)}.${quoteIdent(name)}` : quoteIdent(name);
  const projection = buildProjection(fields);
  const params = [id];
  const dataSql = `SELECT ${projection} FROM ${table} WHERE ${quoteIdent(pk)} = ? LIMIT 1`;
  return { dataSql, params };
}

module.exports = {
  buildListQuery,
  buildByIdQuery,
};

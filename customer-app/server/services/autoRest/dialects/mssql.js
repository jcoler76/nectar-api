function quoteIdent(ident) {
  return '[' + String(ident).replace(/\]/g, ']]') + ']';
}

function buildWhere(ast, params) {
  if (!ast) return { sql: '', params };
  if (ast.type === 'and' || ast.type === 'or') {
    const parts = ast.nodes.map(node => buildWhere(node, params));
    // params objects are shared; gather sql
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
        const paramName1 = `param${Object.keys(params).length + 1}`;
        params[paramName1] = ast.value;
        return { sql: `${col} = @${paramName1}`, params };
      case 'neq':
        const paramName2 = `param${Object.keys(params).length + 1}`;
        params[paramName2] = ast.value;
        return { sql: `${col} <> @${paramName2}`, params };
      case 'gt':
        const paramName3 = `param${Object.keys(params).length + 1}`;
        params[paramName3] = ast.value;
        return { sql: `${col} > @${paramName3}`, params };
      case 'gte':
        const paramName4 = `param${Object.keys(params).length + 1}`;
        params[paramName4] = ast.value;
        return { sql: `${col} >= @${paramName4}`, params };
      case 'lt':
        const paramName5 = `param${Object.keys(params).length + 1}`;
        params[paramName5] = ast.value;
        return { sql: `${col} < @${paramName5}`, params };
      case 'lte':
        const paramName6 = `param${Object.keys(params).length + 1}`;
        params[paramName6] = ast.value;
        return { sql: `${col} <= @${paramName6}`, params };
      case 'in':
        if (!Array.isArray(ast.value) || !ast.value.length) return { sql: '1=0', params };
        const inValues = ast.value.map((v, i) => {
          const pName = `param${Object.keys(params).length + 1}`;
          params[pName] = v;
          return `@${pName}`;
        });
        return { sql: `${col} IN (${inValues.join(', ')})`, params };
      case 'like':
        const paramName7 = `param${Object.keys(params).length + 1}`;
        params[paramName7] = ast.value;
        return { sql: `${col} LIKE @${paramName7}`, params };
      case 'ilike':
        // MSSQL doesn't have ILIKE, use LOWER() for case-insensitive comparison
        const paramName8 = `param${Object.keys(params).length + 1}`;
        params[paramName8] = ast.value.toLowerCase();
        return { sql: `LOWER(${col}) LIKE @${paramName8}`, params };
      case 'between':
        const paramName9 = `param${Object.keys(params).length + 1}`;
        const paramName10 = `param${Object.keys(params).length + 2}`;
        params[paramName9] = ast.value[0];
        params[paramName10] = ast.value[1];
        return { sql: `${col} BETWEEN @${paramName9} AND @${paramName10}`, params };
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
  const params = {};
  const where = buildWhere(ast, params);
  const whereSql = where.sql ? ` WHERE ${where.sql}` : '';
  const orderSql = buildOrder(sort);

  const limit = Math.max(1, Math.min(pageSize || 25, 200));
  const offset = Math.max(0, ((page || 1) - 1) * limit);

  // Add pagination parameters
  const offsetParam = `param${Object.keys(params).length + 1}`;
  const limitParam = `param${Object.keys(params).length + 2}`;
  params[offsetParam] = offset;
  params[limitParam] = limit;

  // MSSQL uses OFFSET/FETCH for pagination (requires ORDER BY)
  let paginationSql = '';
  if (orderSql) {
    paginationSql = ` OFFSET @${offsetParam} ROWS FETCH NEXT @${limitParam} ROWS ONLY`;
  } else {
    // If no explicit order, add a default order by the first field to make OFFSET work
    const defaultOrder =
      fields && fields.length > 0
        ? ` ORDER BY ${quoteIdent(fields[0])}`
        : ' ORDER BY (SELECT NULL)';
    paginationSql = `${defaultOrder} OFFSET @${offsetParam} ROWS FETCH NEXT @${limitParam} ROWS ONLY`;
  }

  const dataSql = `SELECT ${projection} FROM ${table}${whereSql}${orderSql}${paginationSql}`;
  const countSql = `SELECT COUNT(1) AS cnt FROM ${table}${whereSql}`;

  return { dataSql, countSql, params };
}

function buildByIdQuery({ schema, name }, fields, pk, id) {
  const table = schema ? `${quoteIdent(schema)}.${quoteIdent(name)}` : quoteIdent(name);
  const projection = buildProjection(fields);
  const params = {};
  const idParam = 'param1';
  params[idParam] = id;
  const dataSql = `SELECT TOP 1 ${projection} FROM ${table} WHERE ${quoteIdent(pk)} = @${idParam}`;
  return { dataSql, params };
}

module.exports = {
  buildListQuery,
  buildByIdQuery,
};

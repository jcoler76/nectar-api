// MongoDB dialect for auto-REST
// Note: MongoDB uses different query patterns than SQL databases

function buildWhere(ast) {
  if (!ast) return {};

  if (ast.type === 'and') {
    return { $and: ast.nodes.map(node => buildWhere(node)) };
  }

  if (ast.type === 'or') {
    return { $or: ast.nodes.map(node => buildWhere(node)) };
  }

  if (ast.type === 'cond') {
    const field = ast.field;
    switch (ast.op) {
      case 'eq':
        return { [field]: ast.value };
      case 'neq':
        return { [field]: { $ne: ast.value } };
      case 'gt':
        return { [field]: { $gt: ast.value } };
      case 'gte':
        return { [field]: { $gte: ast.value } };
      case 'lt':
        return { [field]: { $lt: ast.value } };
      case 'lte':
        return { [field]: { $lte: ast.value } };
      case 'in':
        if (!Array.isArray(ast.value) || !ast.value.length) return { [field]: { $in: [] } };
        return { [field]: { $in: ast.value } };
      case 'like':
        // Convert SQL LIKE to MongoDB regex
        const likePattern = ast.value.replace(/%/g, '.*').replace(/_/g, '.');
        return { [field]: { $regex: likePattern, $options: '' } };
      case 'ilike':
        // Case-insensitive LIKE
        const ilikePattern = ast.value.replace(/%/g, '.*').replace(/_/g, '.');
        return { [field]: { $regex: ilikePattern, $options: 'i' } };
      case 'between':
        return { [field]: { $gte: ast.value[0], $lte: ast.value[1] } };
      case 'isnull':
        return ast.value ? { [field]: null } : { [field]: { $ne: null } };
      default:
        return {};
    }
  }

  return {};
}

function buildSort(sort) {
  if (!sort || !sort.length) return {};

  const sortObj = {};
  sort.forEach(s => {
    sortObj[s.column] = s.direction.toUpperCase() === 'ASC' ? 1 : -1;
  });

  return sortObj;
}

function buildProjection(fields) {
  if (!fields || !fields.length) return {};

  const projection = {};
  fields.forEach(field => {
    projection[field] = 1;
  });

  return projection;
}

function buildListQuery({ schema, name }, fields, ast, sort, page, pageSize) {
  // MongoDB collections don't use schema in the same way as SQL
  const collection = name;

  const filter = buildWhere(ast);
  const projection = buildProjection(fields);
  const sortObj = buildSort(sort);

  const limit = Math.max(1, Math.min(pageSize || 25, 200));
  const skip = Math.max(0, ((page || 1) - 1) * limit);

  return {
    collection,
    filter,
    projection,
    sort: sortObj,
    skip,
    limit,
  };
}

function buildByIdQuery({ schema, name }, fields, pk, id) {
  const collection = name;
  const filter = { [pk]: id };
  const projection = buildProjection(fields);

  return {
    collection,
    filter,
    projection,
  };
}

module.exports = {
  buildListQuery,
  buildByIdQuery,
};

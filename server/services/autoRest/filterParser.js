const ALLOWED_OPS = new Set([
  'eq',
  'neq',
  'gt',
  'gte',
  'lt',
  'lte',
  'in',
  'like',
  'ilike',
  'between',
  'isnull',
]);

function coerceValue(val) {
  // basic coercion for numeric/boolean strings
  if (val === null || val === undefined) return null;
  if (typeof val === 'string') {
    if (/^(true|false)$/i.test(val)) return val.toLowerCase() === 'true';
    if (/^-?\d+(\.\d+)?$/.test(val)) return Number(val);
  }
  return val;
}

function sanitizeFields(fieldsParam, allowedColumns, masked = []) {
  if (!fieldsParam) return allowedColumns.filter(c => !masked.includes(c));
  const requested = String(fieldsParam)
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  const set = new Set(allowedColumns);
  const maskedSet = new Set(masked);
  return requested.filter(f => set.has(f) && !maskedSet.has(f));
}

function parseSort(sortParam, allowedColumns) {
  if (!sortParam) return [];
  const allowed = new Set(allowedColumns);
  return String(sortParam)
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(token => {
      const desc = token.startsWith('-');
      const col = desc ? token.slice(1) : token;
      if (!allowed.has(col)) return null;
      return { column: col, direction: desc ? 'DESC' : 'ASC' };
    })
    .filter(Boolean);
}

function parseFilterObject(obj, allowedColumns) {
  // supports {and:[...]} {or:[...]} or {field,op,value}
  if (!obj || typeof obj !== 'object') return null;
  if (Array.isArray(obj)) return null;
  if (obj.and && Array.isArray(obj.and)) {
    const nodes = obj.and.map(child => parseFilterObject(child, allowedColumns)).filter(Boolean);
    return nodes.length ? { type: 'and', nodes } : null;
  }
  if (obj.or && Array.isArray(obj.or)) {
    const nodes = obj.or.map(child => parseFilterObject(child, allowedColumns)).filter(Boolean);
    return nodes.length ? { type: 'or', nodes } : null;
  }
  const field = obj.field;
  const op = String(obj.op || '').toLowerCase();
  if (!field || !ALLOWED_OPS.has(op)) return null;
  if (!allowedColumns.includes(field)) return null;
  let value = obj.value;
  if (op === 'between') {
    if (!Array.isArray(value) || value.length !== 2) return null;
    value = [coerceValue(value[0]), coerceValue(value[1])];
  } else if (op === 'in') {
    if (!Array.isArray(value)) return null;
    value = value.map(coerceValue);
  } else if (op === 'isnull') {
    value = Boolean(value);
  } else {
    value = coerceValue(value);
  }
  return { type: 'cond', field, op, value };
}

function parseFilter(filterParam, allowedColumns) {
  if (!filterParam) return null;
  let obj;
  try {
    obj = typeof filterParam === 'string' ? JSON.parse(filterParam) : filterParam;
  } catch (e) {
    return null;
  }
  return parseFilterObject(obj, allowedColumns);
}

module.exports = {
  parseFilter,
  sanitizeFields,
  parseSort,
  ALLOWED_OPS,
};

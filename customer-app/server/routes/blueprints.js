const express = require('express');
const router = express.Router();
const { PrismaClient } = require('../prisma/generated/client');
const prisma = new PrismaClient();
const config = require('../config/blueprints');
const { logger } = require('../utils/logger');

function getModelConfig(modelParam) {
  const key = (modelParam || '').toLowerCase();
  return config.models[key] || null;
}

function parseSelect(selectParam, allowedFields) {
  if (!selectParam) return allowedFields.reduce((acc, f) => ((acc[f] = true), acc), {});
  const fields = String(selectParam)
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .filter(f => allowedFields.includes(f));
  if (fields.length === 0) return allowedFields.reduce((acc, f) => ((acc[f] = true), acc), {});
  return fields.reduce((acc, f) => ((acc[f] = true), acc), {});
}

function parseOrderBy(sortParam, allowedFields) {
  if (!sortParam) return undefined;
  const parts = String(sortParam)
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  const orderBy = [];
  for (const p of parts) {
    let field = p;
    let direction = 'asc';
    if (p.startsWith('-')) {
      field = p.slice(1);
      direction = 'desc';
    }
    if (allowedFields.includes(field)) {
      orderBy.push({ [field]: direction });
    }
  }
  return orderBy.length ? orderBy : undefined;
}

function safeParseJSON(input) {
  if (!input) return null;
  try {
    return JSON.parse(input);
  } catch (e) {
    return null;
  }
}

function buildWhere(whereObj, allowedFields) {
  const where = {};
  if (!whereObj || typeof whereObj !== 'object') return where;
  for (const [key, val] of Object.entries(whereObj)) {
    if (!allowedFields.includes(key)) continue;
    // Support basic Prisma operators
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      const op = {};
      if (typeof val.equals !== 'undefined') op.equals = val.equals;
      if (typeof val.contains !== 'undefined') op.contains = val.contains;
      if (typeof val.startsWith !== 'undefined') op.startsWith = val.startsWith;
      if (typeof val.endsWith !== 'undefined') op.endsWith = val.endsWith;
      if (Array.isArray(val.in)) op.in = val.in;
      if (typeof val.gt !== 'undefined') op.gt = val.gt;
      if (typeof val.gte !== 'undefined') op.gte = val.gte;
      if (typeof val.lt !== 'undefined') op.lt = val.lt;
      if (typeof val.lte !== 'undefined') op.lte = val.lte;
      if (typeof val.not !== 'undefined') op.not = val.not;
      if (Object.keys(op).length) {
        where[key] = op;
        continue;
      }
    }
    // Fallback equality
    if (val === null || ['string', 'number', 'boolean'].includes(typeof val)) {
      where[key] = val;
    }
  }
  return where;
}

// Discovery endpoint: list available models and fields
router.get('/', (req, res) => {
  if (!config.enabled) {
    return res
      .status(404)
      .json({ error: { code: 'NOT_ENABLED', message: 'Blueprints are disabled' } });
  }
  const models = Object.entries(config.models).map(([name, m]) => ({
    name,
    fields: m.fields,
    tenantScoped: !!m.tenantScoped,
  }));
  res.json({ models });
});

// Guard feature flag
router.use((req, res, next) => {
  if (!config.enabled) {
    return res
      .status(404)
      .json({ error: { code: 'NOT_ENABLED', message: 'Blueprints are disabled' } });
  }
  next();
});

// GET list: /api/blueprints/:model
router.get('/:model', async (req, res) => {
  try {
    const mc = getModelConfig(req.params.model);
    if (!mc) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Unknown model' } });
    }

    const delegate = prisma[mc.delegate];
    if (!delegate) {
      return res
        .status(500)
        .json({ error: { code: 'SERVER_ERROR', message: 'Model delegate not available' } });
    }

    const limit = Math.max(
      1,
      Math.min(
        parseInt(req.query.limit || config.defaultLimit, 10) || config.defaultLimit,
        config.maxLimit
      )
    );
    const page = Math.max(1, parseInt(req.query.page || '1', 10) || 1);
    const skip = (page - 1) * limit;

    const select = parseSelect(req.query.select, mc.fields);
    const orderBy = parseOrderBy(req.query.sort, mc.fields);

    // Where: JSON object via ?where={...}
    const whereRaw = safeParseJSON(req.query.where);
    const where = buildWhere(whereRaw, mc.fields);

    // Enforce tenant scope when applicable
    if (mc.tenantScoped && req.user && req.user.organizationId) {
      where.organizationId = req.user.organizationId;
    }

    const [data, total] = await Promise.all([
      delegate.findMany({ where, select, orderBy, skip, take: limit }),
      delegate.count({ where }),
    ]);

    return res.json({
      data,
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    logger.error('Blueprint list error', { error: error.message });
    return res
      .status(500)
      .json({ error: { code: 'SERVER_ERROR', message: 'Failed to list records' } });
  }
});

// GET one: /api/blueprints/:model/:id
router.get('/:model/:id', async (req, res) => {
  try {
    const mc = getModelConfig(req.params.model);
    if (!mc) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Unknown model' } });
    }

    const delegate = prisma[mc.delegate];
    if (!delegate) {
      return res
        .status(500)
        .json({ error: { code: 'SERVER_ERROR', message: 'Model delegate not available' } });
    }

    const select = parseSelect(req.query.select, mc.fields);
    const where = { [mc.idField]: req.params.id };
    if (mc.tenantScoped && req.user && req.user.organizationId) {
      where.organizationId = req.user.organizationId;
    }

    const record = await delegate.findFirst({ where, select });
    if (!record) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Record not found' } });
    }

    return res.json(record);
  } catch (error) {
    logger.error('Blueprint get error', { error: error.message });
    return res
      .status(500)
      .json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch record' } });
  }
});

module.exports = router;

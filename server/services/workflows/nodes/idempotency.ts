import { logger } from '../../../utils/logger.js';

export interface IdempotencyConfig {
  label?: string;
  key: string; // template-interpolated idempotency key
  ttlSeconds?: number; // how long to keep the key
}

export const execute = async (config: IdempotencyConfig, _context: any) => {
  const { getRedisService } = require('../../redisService');
  const service = await getRedisService();

  const key = `wf:idempotency:${config.key}`;
  const ttl = typeof config.ttlSeconds === 'number' ? config.ttlSeconds : 24 * 60 * 60; // default 24h

  if (!service) {
    // No Redis available; pass through while logging
    logger.warn('Idempotency skipped (Redis unavailable)');
    return { success: true, idempotent: false };
  }

  const client = service.getClient();
  // SET key value NX EX ttl
  const setResult = await client.set(key, '1', 'NX', 'EX', ttl);

  if (setResult === null) {
    // Already exists => duplicate
    return { success: true, idempotent: true, skipped: true };
  }

  return { success: true, idempotent: false };
};

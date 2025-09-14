import { get } from '../../../utils/objectUtils.js';
import set from 'lodash/set.js';
import { logger } from '../../../utils/logger.js';

export interface TransformMapping {
  to: string; // e.g., result.customer.id
  from: string; // e.g., input.customer.id or {{some.path}}
}

export interface TransformConfig {
  label?: string;
  mappings: TransformMapping[];
  requireFields?: string[]; // simple validation: paths that must exist after mapping
}

export const execute = async (config: TransformConfig, context: any) => {
  const output: Record<string, any> = {};
  const source = { ...context }; // allow mappings from any prior node via full context

  try {
    for (const mapping of config.mappings || []) {
      const value = get(source, mapping.from.replace(/^\{\{|\}\}$/g, ''));
      set(output, mapping.to, value);
    }

    const missing: string[] = [];
    for (const req of config.requireFields || []) {
      if (get(output, req) === undefined) missing.push(req);
    }

    if (missing.length > 0) {
      return {
        success: false,
        error: `Missing required fields: ${missing.join(', ')}`,
        output,
      };
    }

    return {
      success: true,
      output,
    };
  } catch (error: any) {
    logger.error('Transform node failed', { error: error.message });
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
};

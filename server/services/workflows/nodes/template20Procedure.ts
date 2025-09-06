import { logger } from '../../../utils/logger.js';

export interface Template20ProcedureConfig {
  label?: string;
  entityType: string;
  minConfidence?: number;
  serviceName: string;
  parameters?: Record<string, any>;
}

export const execute = async (config: Template20ProcedureConfig, _context: any) => {
  const minConfidence = typeof config.minConfidence === 'number' ? config.minConfidence : 0.8;

  try {
    const Template20Intelligence = require('../../../models/Template20Intelligence');
    const DatabaseService = require('../../databaseService');
    const Service = require('../../../models/Service');

    if (!config.entityType) {
      throw new Error('entityType is required');
    }
    if (!config.serviceName) {
      throw new Error('serviceName is required');
    }

    // Load latest intelligence and get recommended procedures for the entity
    const intelligence = await Template20Intelligence.getLatestIntelligence();
    const procedures = intelligence.getProceduresForEntity(config.entityType, minConfidence) || [];

    if (procedures.length === 0) {
      return {
        success: false,
        error: `No procedures found for entity '${config.entityType}' above confidence ${minConfidence}`,
      };
    }

    // Choose the highest-confidence procedure
    const best = procedures[0];

    // Validate service and execute stored procedure
    const service = await Service.findOne({ name: config.serviceName }).select('+password');
    if (!service) {
      throw new Error(`Service '${config.serviceName}' not found`);
    }

    const params = config.parameters || {};
    const start = Date.now();
    const records = await DatabaseService.executeStoredProcedure(
      service,
      best.procedureName,
      params
    );
    const durationMs = Date.now() - start;

    logger.info('Template20 procedure executed', {
      entity: config.entityType,
      procedure: best.procedureName,
      confidence: best.overallConfidence,
      durationMs,
      rowCount: Array.isArray(records) ? records.length : 0,
    });

    return {
      success: true,
      entity: config.entityType,
      procedureName: best.procedureName,
      confidence: best.overallConfidence,
      executionTimeMs: durationMs,
      records,
    };
  } catch (error: any) {
    logger.error('Template20 procedure execution failed', { error: error.message });
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
};

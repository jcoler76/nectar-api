const axios = require('axios');
const { logger } = require('../../../utils/logger');

/**
 * CRM Integration Action Node
 * Enhanced HTTP action for integrating ZoomInfo data with CRM systems
 */
module.exports = async (nodeData, workflowData, context) => {
  logger.info(`Executing CRM Integration: ${nodeData.label}`);

  try {
    const {
      crmType = 'custom', // 'salesforce', 'hubspot', 'pipedrive', 'dynamics', 'custom'
      connection = {},
      dataMapping = {},
      operation = 'create', // 'create', 'update', 'upsert'
      batchSettings = {},
      errorHandling = {},
    } = nodeData;

    const inputData = workflowData.input || context.previousNodeData || {};

    // Get CRM configuration based on type
    const crmConfig = getCRMConfiguration(crmType, connection);

    // Apply data mapping transformations
    const mappedData = applyDataMapping(inputData, dataMapping, crmType);

    // Handle batch processing if enabled
    if (batchSettings.enabled && Array.isArray(mappedData)) {
      return await processBatch(mappedData, crmConfig, operation, batchSettings, errorHandling);
    } else {
      return await processSingleRecord(mappedData, crmConfig, operation, errorHandling);
    }
  } catch (error) {
    logger.error(`CRM Integration failed: ${error.message}`);

    return {
      success: false,
      error: error.message,
      data: {
        processed: 0,
        failed: 1,
        errors: [error.message],
        timestamp: new Date().toISOString(),
      },
    };
  }
};

/**
 * Get CRM-specific configuration and endpoints
 */
function getCRMConfiguration(crmType, connection) {
  const baseConfig = {
    baseURL: connection.baseURL || connection.url,
    timeout: connection.timeout || 30000,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'MirabelAPI/1.0',
    },
  };

  switch (crmType) {
    case 'salesforce':
      return {
        ...baseConfig,
        headers: {
          ...baseConfig.headers,
          Authorization: `Bearer ${connection.accessToken}`,
        },
        endpoints: {
          create: '/services/data/v58.0/sobjects/{objectType}',
          update: '/services/data/v58.0/sobjects/{objectType}/{id}',
          upsert: '/services/data/v58.0/sobjects/{objectType}/{externalIdField}/{externalId}',
          batch: '/services/data/v58.0/composite/batch',
        },
        objectTypes: {
          contact: 'Contact',
          lead: 'Lead',
          account: 'Account',
        },
      };

    case 'hubspot':
      return {
        ...baseConfig,
        headers: {
          ...baseConfig.headers,
          Authorization: `Bearer ${connection.accessToken}`,
        },
        endpoints: {
          create: '/crm/v3/objects/{objectType}',
          update: '/crm/v3/objects/{objectType}/{id}',
          upsert: '/crm/v3/objects/{objectType}',
          batch: '/crm/v3/objects/{objectType}/batch/{operation}',
        },
        objectTypes: {
          contact: 'contacts',
          company: 'companies',
          deal: 'deals',
        },
      };

    case 'pipedrive':
      return {
        ...baseConfig,
        headers: {
          ...baseConfig.headers,
          Authorization: `Bearer ${connection.apiToken}`,
        },
        endpoints: {
          create: '/{objectType}',
          update: '/{objectType}/{id}',
        },
        objectTypes: {
          person: 'persons',
          organization: 'organizations',
          deal: 'deals',
        },
      };

    case 'dynamics':
      return {
        ...baseConfig,
        headers: {
          ...baseConfig.headers,
          Authorization: `Bearer ${connection.accessToken}`,
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0',
        },
        endpoints: {
          create: '/{objectType}',
          update: '/{objectType}({id})',
        },
        objectTypes: {
          contact: 'contacts',
          account: 'accounts',
          lead: 'leads',
        },
      };

    default: // custom
      return {
        ...baseConfig,
        headers: {
          ...baseConfig.headers,
          ...connection.customHeaders,
        },
        auth: connection.auth,
      };
  }
}

/**
 * Apply data mapping transformations
 */
function applyDataMapping(inputData, dataMapping, crmType) {
  if (!dataMapping.fields || Object.keys(dataMapping.fields).length === 0) {
    return inputData; // No mapping, return as-is
  }

  // Handle array of records (e.g., from ZoomInfo contact discovery)
  if (Array.isArray(inputData.contacts)) {
    return inputData.contacts.map(contact => mapSingleRecord(contact, dataMapping, crmType));
  } else if (Array.isArray(inputData)) {
    return inputData.map(record => mapSingleRecord(record, dataMapping, crmType));
  } else {
    return mapSingleRecord(inputData, dataMapping, crmType);
  }
}

/**
 * Map a single record according to field mappings
 */
function mapSingleRecord(record, dataMapping, crmType) {
  const mappedRecord = {};

  // Apply field mappings
  for (const [sourceField, targetConfig] of Object.entries(dataMapping.fields)) {
    const value = getNestedValue(record, sourceField);

    if (value !== undefined && value !== null && value !== '') {
      const targetField = typeof targetConfig === 'string' ? targetConfig : targetConfig.field;

      // Apply transformations
      let transformedValue = value;
      if (typeof targetConfig === 'object' && targetConfig.transform) {
        transformedValue = applyTransformation(value, targetConfig.transform);
      }

      mappedRecord[targetField] = transformedValue;
    }
  }

  // Apply CRM-specific defaults
  if (dataMapping.crmDefaults) {
    Object.assign(mappedRecord, dataMapping.crmDefaults);
  }

  // Add ZoomInfo metadata if requested
  if (dataMapping.includeMetadata) {
    mappedRecord._zoomInfoMetadata = {
      sourceId: record.id,
      importedAt: new Date().toISOString(),
      source: 'zoominfo',
    };
  }

  return mappedRecord;
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}

/**
 * Apply transformation to a value
 */
function applyTransformation(value, transform) {
  switch (transform.type) {
    case 'uppercase':
      return typeof value === 'string' ? value.toUpperCase() : value;

    case 'lowercase':
      return typeof value === 'string' ? value.toLowerCase() : value;

    case 'titlecase':
      return typeof value === 'string'
        ? value.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase())
        : value;

    case 'phone_format':
      return formatPhoneNumber(value);

    case 'date_format':
      return formatDate(value, transform.format || 'ISO');

    case 'prefix':
      return `${transform.prefix}${value}`;

    case 'suffix':
      return `${value}${transform.suffix}`;

    case 'replace':
      return typeof value === 'string'
        ? value.replace(new RegExp(transform.find, 'g'), transform.replace)
        : value;

    case 'lookup':
      return transform.mapping[value] || value;

    default:
      return value;
  }
}

/**
 * Format phone number
 */
function formatPhoneNumber(phone) {
  if (!phone) return phone;

  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  } else if (cleaned.length === 11 && cleaned[0] === '1') {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }

  return phone; // Return original if can't format
}

/**
 * Format date
 */
function formatDate(date, format) {
  if (!date) return date;

  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return date;

  switch (format) {
    case 'ISO':
      return dateObj.toISOString();
    case 'US':
      return dateObj.toLocaleDateString('en-US');
    case 'timestamp':
      return dateObj.getTime();
    default:
      return dateObj.toISOString();
  }
}

/**
 * Process a single record
 */
async function processSingleRecord(data, crmConfig, operation, errorHandling) {
  try {
    const url = buildURL(crmConfig, operation, data);
    const method = getHTTPMethod(operation);

    const requestConfig = {
      method,
      url,
      data: method !== 'GET' ? data : undefined,
      headers: crmConfig.headers,
      timeout: crmConfig.timeout,
    };

    // Add authentication if configured
    if (crmConfig.auth) {
      requestConfig.auth = crmConfig.auth;
    }

    const response = await axios(requestConfig);

    logger.info(`CRM record ${operation} successful`);

    return {
      success: true,
      data: {
        processed: 1,
        failed: 0,
        results: [response.data],
        operation,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const shouldRetry = shouldRetryError(error, errorHandling);

    if (shouldRetry && errorHandling.retryCount > 0) {
      logger.warn(`CRM request failed, retrying... (${error.message})`);

      await new Promise(resolve => setTimeout(resolve, errorHandling.retryDelay || 1000));

      const retryConfig = { ...errorHandling, retryCount: errorHandling.retryCount - 1 };
      return await processSingleRecord(data, crmConfig, operation, retryConfig);
    }

    throw error;
  }
}

/**
 * Process batch of records
 */
async function processBatch(dataArray, crmConfig, operation, batchSettings, errorHandling) {
  const batchSize = batchSettings.batchSize || 20;
  const results = [];
  const errors = [];
  let processed = 0;
  let failed = 0;

  for (let i = 0; i < dataArray.length; i += batchSize) {
    const batch = dataArray.slice(i, i + batchSize);

    try {
      const batchResult = await processBatchRequest(batch, crmConfig, operation);
      results.push(...batchResult.results);
      processed += batchResult.processed;
      failed += batchResult.failed;

      if (batchResult.errors) {
        errors.push(...batchResult.errors);
      }
    } catch (error) {
      logger.error(`Batch processing failed:`, error.message);
      failed += batch.length;
      errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
    }

    // Add delay between batches if configured
    if (batchSettings.batchDelay && i + batchSize < dataArray.length) {
      await new Promise(resolve => setTimeout(resolve, batchSettings.batchDelay));
    }
  }

  return {
    success: failed === 0,
    data: {
      processed,
      failed,
      total: dataArray.length,
      results,
      errors,
      operation,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Process a batch request
 */
async function processBatchRequest(batch, crmConfig, operation) {
  // Implementation varies by CRM type
  if (crmConfig.endpoints && crmConfig.endpoints.batch) {
    return await processCRMBatch(batch, crmConfig, operation);
  } else {
    return await processIndividualRequests(batch, crmConfig, operation);
  }
}

/**
 * Process CRM-specific batch requests
 */
async function processCRMBatch(batch, crmConfig, operation) {
  const url = crmConfig.baseURL + crmConfig.endpoints.batch.replace('{operation}', operation);

  const batchRequest = {
    inputs: batch,
  };

  const response = await axios.post(url, batchRequest, {
    headers: crmConfig.headers,
    timeout: crmConfig.timeout,
  });

  return {
    processed: batch.length,
    failed: 0,
    results: response.data.results || [response.data],
  };
}

/**
 * Process individual requests (fallback for CRMs without batch API)
 */
async function processIndividualRequests(batch, crmConfig, operation) {
  const results = [];
  const errors = [];
  let processed = 0;
  let failed = 0;

  for (const record of batch) {
    try {
      const result = await processSingleRecord(record, crmConfig, operation, {});
      results.push(result.data.results[0]);
      processed++;
    } catch (error) {
      errors.push(`Record error: ${error.message}`);
      failed++;
    }
  }

  return {
    processed,
    failed,
    results,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Build URL for CRM request
 */
function buildURL(crmConfig, operation, data) {
  let endpoint = crmConfig.endpoints ? crmConfig.endpoints[operation] : '';

  if (!endpoint) {
    endpoint = '/'; // Default endpoint
  }

  // Replace placeholders
  endpoint = endpoint
    .replace('{objectType}', data.objectType || 'contacts')
    .replace('{id}', data.id || '')
    .replace('{externalIdField}', data.externalIdField || 'Email')
    .replace('{externalId}', data.externalId || data.email || '');

  return crmConfig.baseURL + endpoint;
}

/**
 * Get HTTP method for operation
 */
function getHTTPMethod(operation) {
  switch (operation) {
    case 'create':
      return 'POST';
    case 'update':
      return 'PUT';
    case 'upsert':
      return 'PATCH';
    case 'delete':
      return 'DELETE';
    default:
      return 'POST';
  }
}

/**
 * Determine if error should trigger a retry
 */
function shouldRetryError(error, errorHandling) {
  if (!errorHandling.retryOnError) {
    return false;
  }

  const retryableStatuses = [408, 429, 500, 502, 503, 504];
  const status = error.response?.status;

  return retryableStatuses.includes(status);
}

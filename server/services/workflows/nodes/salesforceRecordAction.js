const { logger } = require('../../../utils/logger');
const SalesforceService = require('../../salesforce/SalesforceService');

const execute = async (config, context) => {
  const {
    label,
    connection = {},
    operation = 'create',
    object = 'Lead',
    dataMapping = {},
    externalIdField,
    recordId,
    search = {},
    campaign = {},
    attachment = {},
  } = config;

  logger.info(`Executing Salesforce Action: "${label}" (${operation})`);

  // Resolve input payload
  const input =
    context[context.currentNodeId]?.data ||
    context.input ||
    context.trigger?.data ||
    context.previousNodeData ||
    context;
  const payload = mapFields(input, dataMapping?.fields);

  try {
    const sf = new SalesforceService({
      instanceUrl: connection.instanceUrl,
      accessToken: connection.accessToken,
      apiVersion: connection.apiVersion || 'v58.0',
      timeout: connection.timeout || 30000,
    });

    let result;
    switch (operation) {
      case 'create':
        result = await sf.createRecord(object, payload);
        break;
      case 'update':
        if (!recordId) throw new Error('recordId is required for update');
        result = await sf.updateRecord(object, recordId, payload);
        break;
      case 'upsert':
        if (!externalIdField) throw new Error('externalIdField is required for upsert');
        if (!payload[externalIdField])
          throw new Error(`Payload must include ${externalIdField} for upsert`);
        result = await sf.upsertRecord(object, externalIdField, payload[externalIdField], payload);
        break;
      case 'find':
        if (!search.field) throw new Error('search.field is required for find');
        result = await sf.findRecord(object, search.field, search.value);
        break;
      case 'findOrCreate':
        if (!search.field) throw new Error('search.field is required for findOrCreate');
        result = await sf.findOrCreate(
          object,
          search.field,
          search.value,
          payload,
          externalIdField
        );
        break;
      case 'createTask':
        result = await sf.createTask(payload);
        break;
      case 'addToCampaign': {
        const memberId = payload[campaign.memberIdField || 'LeadId'];
        result = await sf.addToCampaign({
          campaignId: campaign.campaignId,
          memberIdField: campaign.memberIdField || 'LeadId',
          memberId,
          status: campaign.status || 'Sent',
        });
        break;
      }
      case 'createAttachment':
        result = await sf.createAttachment({
          parentId: attachment.parentId,
          fileName: attachment.fileName,
          contentBase64: attachment.contentBase64,
          contentType: attachment.contentType,
        });
        break;
      case 'createOpportunity':
        result = await sf.createOpportunity(payload);
        break;
      case 'updateOpportunity':
        if (!recordId) throw new Error('recordId is required for updateOpportunity');
        result = await sf.updateOpportunity(recordId, payload);
        break;
      case 'pullOpportunities':
        result = await sf.pullOpportunities({
          fields: config.fields,
          filters: config.filters,
          limit: config.limit,
        });
        break;
      case 'findOpportunityByName':
        if (!search.name) throw new Error('search.name is required for findOpportunityByName');
        result = await sf.findOpportunityByName(search.name);
        break;
      case 'findOrCreateOpportunity':
        if (!search.name) throw new Error('search.name is required for findOrCreateOpportunity');
        result = await sf.findOrCreateOpportunity(search.name, payload);
        break;
      default:
        throw new Error(`Unsupported Salesforce operation: ${operation}`);
    }

    return { status: 'success', data: result };
  } catch (error) {
    logger.error(`Salesforce action failed: ${error.message}`);
    return { status: 'error', error: error.message };
  }
};

function mapFields(input, fieldMap) {
  if (!fieldMap || typeof fieldMap !== 'object') return input || {};
  const out = {};
  for (const [src, dest] of Object.entries(fieldMap)) {
    const value = getByPath(input, src);
    if (dest && typeof dest === 'string') {
      out[dest] = value;
    }
  }
  return out;
}

function getByPath(obj, path) {
  if (!obj || !path) return undefined;
  return path.split('.').reduce((acc, key) => (acc ? acc[key] : undefined), obj);
}

module.exports = { execute };

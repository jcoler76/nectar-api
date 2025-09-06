const { logger } = require('../../../utils/logger');
const HubSpotService = require('../../hubspot/HubSpotService');

const ALLOWED_OBJECTS = [
  'contact',
  'company',
  'deal',
  'ticket',
  'product',
  'line_item',
  'email',
  'call',
];
const SAFE_PROP = /^[a-zA-Z0-9_]+$/;

const execute = async (config, context) => {
  const {
    label,
    connection = {},
    operation = 'create',
    object = 'contact',
    dataMapping = {},
    search = {},
    association = {},
    list = {},
    note = {},
    deal = {},
    workflow: workflowCfg = {},
    timeline = {},
  } = config;

  logger.info(`Executing HubSpot Action: "${label}" (${operation})`);

  if (!ALLOWED_OBJECTS.includes(object)) {
    return { status: 'error', error: `Unsupported HubSpot object: ${object}` };
  }

  const hs = new HubSpotService({
    accessToken: connection.accessToken,
    baseUrl: connection.baseUrl || 'https://api.hubapi.com',
    apiVersion: connection.apiVersion || 'v3',
    timeout: connection.timeout || 30000,
  });

  // Resolve input payload
  const input =
    context[context.currentNodeId]?.data ||
    context.input ||
    context.trigger?.data ||
    context.previousNodeData ||
    context;
  const properties = mapProperties(input, dataMapping?.properties || {});

  try {
    let result;
    switch (operation) {
      case 'create':
        result = await hs.createRecord(object, properties);
        break;
      case 'update':
        if (!search?.value && !config.recordId)
          throw new Error('record ID or search value required');
        if (config.recordId) {
          result = await hs.updateRecord(object, config.recordId, properties);
        } else {
          if (!search?.property || !SAFE_PROP.test(search.property))
            throw new Error('Valid search.property is required');
          const found = await hs.findRecord(object, search.property, search.value);
          if (!found?.id) throw new Error('Record not found for update');
          result = await hs.updateRecord(object, found.id, properties);
        }
        break;
      case 'createOrUpdate': {
        if (!search?.property || !SAFE_PROP.test(search.property))
          throw new Error('Valid search.property is required for createOrUpdate');
        result = await hs.createOrUpdate(object, search.property, search.value, properties);
        break;
      }
      case 'find': {
        if (!search?.property || !SAFE_PROP.test(search.property))
          throw new Error('Valid search.property is required for find');
        result = await hs.findRecord(object, search.property, search.value);
        break;
      }
      case 'findOrCreate': {
        if (!search?.property || !SAFE_PROP.test(search.property))
          throw new Error('Valid search.property is required for findOrCreate');
        result = await hs.findOrCreate(object, search.property, search.value, properties);
        break;
      }
      case 'associate': {
        const { fromObject, toObject, associationType, fromId, toId } = association;
        if (!fromObject || !toObject || !fromId || !toId)
          throw new Error('Association requires fromObject, toObject, fromId, toId');
        result = await hs.associate(fromObject, fromId, toObject, toId, associationType);
        break;
      }
      case 'addToList': {
        const { listId } = list || {};
        if (!listId) throw new Error('list.listId is required');
        const contactId = properties.hs_object_id || properties.id || search?.value;
        if (!contactId) throw new Error('A contact ID is required to add to list');
        result = await hs.addToList(listId, [contactId]);
        break;
      }
      case 'createNote': {
        const content = note?.content || properties.hs_note_body || 'Note from workflow';
        const targetId =
          config.recordId || search?.value || properties.hs_object_id || properties.id;
        if (!targetId) throw new Error('A target record ID is required to attach the note');
        result = await hs.createNote(content, object, targetId);
        break;
      }
      case 'createEmail': {
        const cfg = config.email || {};
        result = await hs.createEmail(
          {
            subject: cfg.subject || properties.hs_email_subject,
            html: cfg.html ?? properties.hs_email_html,
            text: cfg.text ?? properties.hs_email_text,
            direction: cfg.direction || properties.hs_email_direction || 'OUTGOING',
            status: cfg.status || properties.hs_email_status || 'SENT',
            timestamp: cfg.timestamp || properties.hs_timestamp || Date.now(),
          },
          cfg.associate || association
        );
        break;
      }
      case 'createCall': {
        const cfg = config.call || {};
        result = await hs.createCall(
          {
            title: cfg.title || properties.hs_call_title,
            body: cfg.body ?? properties.hs_call_body,
            direction: cfg.direction || properties.hs_call_direction || 'OUTGOING',
            duration: Number(cfg.duration || properties.hs_call_duration || 0),
            timestamp: cfg.timestamp || properties.hs_timestamp || Date.now(),
          },
          cfg.associate || association
        );
        break;
      }
      case 'updateDealStage': {
        const stageId = deal?.stageId || properties.dealstage;
        if (!stageId) throw new Error('deal.stageId is required');
        let dealId = config.recordId || search?.value;
        if (!dealId) {
          if (!search?.property || !SAFE_PROP.test(search.property))
            throw new Error('Valid search.property is required to locate deal');
          const found = await hs.findRecord('deal', search.property, search.value);
          dealId = found?.id;
        }
        if (!dealId) throw new Error('Deal record not found');
        result = await hs.updateDealStage(dealId, stageId);
        break;
      }
      case 'enrollInWorkflow': {
        const wfId = workflowCfg?.workflowId;
        const contact = workflowCfg?.contactEmail || workflowCfg?.contactId;
        const by = workflowCfg?.contactId ? 'id' : 'email';
        if (!wfId || !contact)
          throw new Error('workflow.workflowId and contactEmail/contactId are required');
        result = await hs.enrollContactInWorkflow(wfId, contact, by);
        break;
      }
      case 'createTimelineEvent': {
        const { eventTemplateId, objectType, objectId, tokens } = timeline || {};
        if (!eventTemplateId || !objectType || !objectId)
          throw new Error('timeline.eventTemplateId, objectType and objectId are required');
        result = await hs.createTimelineEvent(eventTemplateId, objectType, objectId, tokens || {});
        break;
      }
      default:
        throw new Error(`Unsupported HubSpot operation: ${operation}`);
    }
    return { status: 'success', data: result };
  } catch (error) {
    logger.error(`HubSpot action failed: ${error.message}`);
    return { status: 'error', error: error.message };
  }
};

function mapProperties(input, propMap) {
  if (!propMap || typeof propMap !== 'object') return input?.properties || input || {};
  const out = {};
  for (const [src, dest] of Object.entries(propMap)) {
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

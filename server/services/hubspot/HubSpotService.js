const axios = require('axios');

class HubSpotService {
  constructor({
    accessToken,
    baseUrl = 'https://api.hubapi.com',
    apiVersion = 'v3',
    timeout = 30000,
  }) {
    if (!accessToken) throw new Error('HubSpot accessToken is required');
    this.client = axios.create({
      baseURL: baseUrl,
      timeout,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    this.apiVersion = apiVersion;
  }

  resolveObjectName(object) {
    const map = {
      contact: 'contacts',
      contacts: 'contacts',
      company: 'companies',
      companies: 'companies',
      deal: 'deals',
      deals: 'deals',
      ticket: 'tickets',
      tickets: 'tickets',
      product: 'products',
      products: 'products',
      line_item: 'line_items',
      line_items: 'line_items',
      note: 'notes',
      notes: 'notes',
      call: 'calls',
      calls: 'calls',
      email: 'emails',
      emails: 'emails',
    };
    return map[object] || object;
  }

  async testConnection() {
    // Get current user info as a simple auth test
    const res = await this.client.get('/oauth/v1/access-tokens/' + 'self', {
      // Some tenants restrict this; fall back to a lightweight request if needed
      // HubSpot will ignore body; using self is allowed for private app tokens
      validateStatus: () => true,
    });
    if (res.status >= 400) {
      // If access-tokens self is restricted, try a simple metadata request
      const ping = await this.client.get('/crm/v3/owners', { validateStatus: () => true });
      if (ping.status >= 400) throw new Error(`HubSpot connection failed: ${ping.status}`);
    }
    return true;
  }

  // Objects: contact, company, deal, ticket, product, line_item
  async createRecord(object, properties) {
    const path = `/crm/v3/objects/${this.resolveObjectName(object)}`;
    const res = await this.client.post(path, { properties });
    return res.data;
  }

  async updateRecord(object, id, properties) {
    const path = `/crm/v3/objects/${this.resolveObjectName(object)}/${encodeURIComponent(id)}`;
    const res = await this.client.patch(path, { properties });
    return res.data;
  }

  async updateDealStage(dealId, stageId) {
    if (!dealId || !stageId) throw new Error('dealId and stageId are required');
    return this.updateRecord('deal', dealId, { dealstage: stageId });
  }

  async findRecord(object, property, value) {
    const path = `/crm/v3/objects/${this.resolveObjectName(object)}/search`;
    const body = {
      filterGroups: [
        {
          filters: [
            {
              propertyName: property,
              operator: 'EQ',
              value: value,
            },
          ],
        },
      ],
      sorts: [{ propertyName: 'createdate', direction: 'DESCENDING' }],
      limit: 1,
      after: 0,
    };
    const res = await this.client.post(path, body);
    const results = res.data?.results || [];
    return results[0] || null;
  }

  async searchRecords(
    object,
    filterGroups = [],
    sorts = [],
    limit = 50,
    after = 0,
    properties = []
  ) {
    const path = `/crm/v3/objects/${this.resolveObjectName(object)}/search`;
    const body = { filterGroups, sorts, limit, after };
    if (properties && properties.length > 0) body.properties = properties;
    const res = await this.client.post(path, body, { validateStatus: () => true });
    if (res.status >= 400) throw new Error(`HubSpot search failed: ${res.status}`);
    return res.data;
  }

  async findOrCreate(object, property, value, properties) {
    const existing = await this.findRecord(object, property, value);
    if (existing && existing.id) {
      const updated = await this.updateRecord(object, existing.id, properties);
      return { action: 'updated', record: updated };
    }
    const created = await this.createRecord(object, properties);
    return { action: 'created', record: created };
  }

  async createOrUpdate(object, property, value, properties) {
    // Alias for findOrCreate
    return this.findOrCreate(object, property, value, properties);
  }

  async addToList(listId, contactIds = []) {
    // Legacy lists API for static list membership
    // POST /contacts/v1/lists/:listId/add
    const path = `/contacts/v1/lists/${encodeURIComponent(listId)}/add`;
    const body = { vids: contactIds.map(id => Number(id)).filter(Boolean) };
    const res = await this.client.post(path, body);
    return res.data;
  }

  async enrollContactInWorkflow(workflowId, identifier, by = 'email') {
    if (!workflowId || !identifier) throw new Error('workflowId and identifier are required');
    const idSegment =
      by === 'id' ? encodeURIComponent(String(identifier)) : encodeURIComponent(String(identifier));
    const path =
      by === 'id'
        ? `/automation/v3/workflows/${encodeURIComponent(String(workflowId))}/enrollments/contacts/${idSegment}`
        : `/automation/v3/workflows/${encodeURIComponent(String(workflowId))}/enrollments/contacts/${idSegment}`;
    const res = await this.client.post(path, {}, { validateStatus: () => true });
    if (res.status >= 400) throw new Error(`Workflow enrollment failed: ${res.status}`);
    return res.data || { success: true };
  }

  async createTimelineEvent(eventTemplateId, objectType, objectId, tokens = {}) {
    if (!eventTemplateId || !objectType || !objectId) {
      throw new Error('eventTemplateId, objectType, and objectId are required');
    }
    const path = `/crm/v3/timeline/events`;
    const body = {
      eventTemplateId: String(eventTemplateId),
      tokens,
      associations: [{ toObjectType: objectType, toObjectId: String(objectId) }],
    };
    const res = await this.client.post(path, body, { validateStatus: () => true });
    if (res.status >= 400) throw new Error(`Timeline event creation failed: ${res.status}`);
    return res.data;
  }

  async associate(fromObject, fromId, toObject, toId, associationType) {
    // v4 batch association create for single pair
    const path = `/crm/v4/associations/${this.resolveObjectName(fromObject)}/${this.resolveObjectName(toObject)}/batch/create`;
    const body = {
      inputs: [
        {
          _from: { id: String(fromId) },
          to: { id: String(toId) },
          types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: undefined }],
        },
      ],
    };
    // If a specific association type is provided and numeric, include it
    if (associationType && !Number.isNaN(Number(associationType))) {
      body.inputs[0].types[0].associationTypeId = Number(associationType);
    } else {
      // Fallback: HubSpot determines default association for the pair
      delete body.inputs[0].types;
    }
    const res = await this.client.post(path, body, { validateStatus: () => true });
    if (res.status >= 400) throw new Error(`Association failed: ${res.status}`);
    return res.data;
  }

  async createNote(content, object, objectId) {
    // Create an engagement note, then associate
    // Create note (Engagements v1 is deprecated; use CRM v3 notes)
    const noteRes = await this.client.post('/crm/v3/objects/notes', {
      properties: { hs_note_body: content },
    });
    const noteId = noteRes.data?.id;
    if (!noteId) throw new Error('Failed to create note');

    // Associate note to target object
    await this.client.put(
      `/crm/v3/objects/notes/${noteId}/associations/${this.resolveObjectName(object)}/${objectId}/note_to_${object}`,
      {}
    );
    return noteRes.data;
  }

  async createEmail(
    { subject, html, text, direction = 'OUTGOING', status = 'SENT', timestamp = Date.now() },
    associate
  ) {
    const properties = {
      hs_email_subject: subject,
      hs_email_html: html,
      hs_email_text: text,
      hs_email_direction: direction,
      hs_email_status: status,
      hs_timestamp: timestamp,
    };
    const created = await this.createRecord('emails', properties);
    if (associate?.object && associate?.objectId) {
      await this.associate('emails', created.id, associate.object, associate.objectId);
    }
    return created;
  }

  async createCall(
    { title, body, direction = 'OUTGOING', duration = 0, timestamp = Date.now() },
    associate
  ) {
    const properties = {
      hs_call_title: title,
      hs_call_body: body,
      hs_call_direction: direction,
      hs_call_duration: duration,
      hs_timestamp: timestamp,
    };
    const created = await this.createRecord('calls', properties);
    if (associate?.object && associate?.objectId) {
      await this.associate('calls', created.id, associate.object, associate.objectId);
    }
    return created;
  }
}

module.exports = HubSpotService;

const axios = require('axios');
const { logger } = require('../../utils/logger');
const { validateUrl } = require('../../middleware/ssrfProtection');

class SalesforceService {
  constructor({ instanceUrl, accessToken, apiVersion = 'v58.0', timeout = 30000 } = {}) {
    // SSRF-style validation: enforce HTTPS + restrict to Salesforce domains
    const validation = instanceUrl
      ? validateUrl(instanceUrl, {
          enforceHttps: true,
          allowedDomains: [
            'salesforce.com',
            'force.com',
            'my.salesforce.com',
            'sandbox.my.salesforce.com',
            'lightning.force.com',
          ],
        })
      : { isValid: false, error: 'Instance URL is required' };

    if (!validation.isValid) {
      throw new Error(`Invalid Salesforce instance URL: ${validation.error}`);
    }

    this.instanceUrl = validation.sanitizedUrl.replace(/\/$/, '');
    this.accessToken = accessToken || '';
    this.apiVersion = apiVersion;
    this.timeout = timeout;
  }

  get client() {
    if (!this.instanceUrl || !this.accessToken) {
      throw new Error('Salesforce instanceUrl and accessToken are required');
    }
    const baseURL = `${this.instanceUrl}/services/data/${this.apiVersion}`;
    return axios.create({
      baseURL,
      timeout: this.timeout,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'MirabelAPI/1.0',
      },
      validateStatus: () => true,
    });
  }

  async testConnection() {
    const url = '/limits';
    const res = await this.client.get(url);
    if (res.status >= 200 && res.status < 300) return true;
    throw new Error(`Salesforce connection failed with status ${res.status}`);
  }

  async createRecord(object, data) {
    this._validateSObjectName(object);
    const url = `/sobjects/${encodeURIComponent(object)}`;
    const res = await this.client.post(url, data);
    return this._handleResponse(res, 'createRecord');
  }

  async updateRecord(object, id, data) {
    this._validateSObjectName(object);
    const url = `/sobjects/${encodeURIComponent(object)}/${encodeURIComponent(id)}`;
    const res = await this.client.patch(url, data);
    return this._handleResponse(res, 'updateRecord');
  }

  async upsertRecord(object, externalIdField, externalId, data) {
    this._validateSObjectName(object);
    this._validateFieldName(externalIdField);
    const url = `/sobjects/${encodeURIComponent(object)}/${encodeURIComponent(
      externalIdField
    )}/${encodeURIComponent(externalId)}`;
    const res = await this.client.patch(url, data);
    return this._handleResponse(res, 'upsertRecord');
  }

  async querySOQL(soql) {
    const url = `/query`;
    const res = await this.client.get(url, { params: { q: soql } });
    return this._handleResponse(res, 'querySOQL');
  }

  async findRecord(object, field, value) {
    if (!field) throw new Error('Search field is required');

    // Validate object name to prevent SOQL injection
    this._validateSObjectName(object);

    // Validate field name to prevent SOQL injection
    this._validateFieldName(field);

    // Use proper escaping for the value
    const escapedValue = this._escapeSoqlValue(value);

    const soql = `SELECT Id FROM ${object} WHERE ${field} = '${escapedValue}' LIMIT 1`;
    const result = await this.querySOQL(soql);
    return result && result.records && result.records[0];
  }

  async findOrCreate(object, field, value, createData = {}, externalIdField) {
    // Validation will be handled by findRecord and createRecord calls
    const found = await this.findRecord(object, field, value);
    if (found) return found;
    if (externalIdField && createData && createData[externalIdField] === undefined) {
      createData[externalIdField] = value;
    }
    return await this.createRecord(object, createData);
  }

  async createTask(taskData) {
    return await this.createRecord('Task', taskData);
  }

  async addToCampaign({ campaignId, memberIdField = 'LeadId', memberId, status = 'Sent' }) {
    if (!campaignId) throw new Error('campaignId is required');
    if (!memberId || !memberIdField) throw new Error('memberId and memberIdField are required');
    const data = { CampaignId: campaignId, Status: status };
    data[memberIdField] = memberId; // LeadId or ContactId
    return await this.createRecord('CampaignMember', data);
  }

  async createAttachment({ parentId, fileName, contentBase64, contentType }) {
    if (!parentId) throw new Error('parentId is required');
    if (!fileName) throw new Error('fileName is required');
    if (!contentBase64) throw new Error('contentBase64 is required');
    const data = {
      ParentId: parentId,
      Name: fileName,
      Body: contentBase64,
      ContentType: contentType || 'application/octet-stream',
    };
    return await this.createRecord('Attachment', data);
  }

  async createOpportunity(opportunityData) {
    const requiredFields = ['Name', 'StageName', 'CloseDate'];
    const missing = requiredFields.filter(field => !opportunityData[field]);
    if (missing.length > 0) {
      throw new Error(`Required opportunity fields missing: ${missing.join(', ')}`);
    }
    return await this.createRecord('Opportunity', opportunityData);
  }

  async updateOpportunity(opportunityId, opportunityData) {
    if (!opportunityId) throw new Error('opportunityId is required');
    return await this.updateRecord('Opportunity', opportunityId, opportunityData);
  }

  async pullOpportunities({
    fields = ['Id', 'Name', 'StageName', 'CloseDate', 'Amount'],
    filters = [],
    limit = 100,
  } = {}) {
    const fieldList = Array.isArray(fields) ? fields.join(', ') : fields;
    const whereClause = filters.length > 0 ? ` WHERE ${filters.join(' AND ')}` : '';
    const limitClause = limit ? ` LIMIT ${limit}` : '';
    const soql = `SELECT ${fieldList} FROM Opportunity${whereClause}${limitClause}`;
    return await this.querySOQL(soql);
  }

  async findOpportunityByName(name) {
    return await this.findRecord('Opportunity', 'Name', name);
  }

  async findOrCreateOpportunity(name, createData = {}) {
    if (!createData.Name) createData.Name = name;
    if (!createData.StageName) createData.StageName = 'Prospecting';
    if (!createData.CloseDate) {
      const closeDate = new Date();
      closeDate.setMonth(closeDate.getMonth() + 3);
      createData.CloseDate = closeDate.toISOString().split('T')[0];
    }
    return await this.findOrCreate('Opportunity', 'Name', name, createData);
  }

  _handleResponse(res, op) {
    if (res.status >= 200 && res.status < 300) {
      return res.data;
    }
    const message = Array.isArray(res.data)
      ? res.data.map(e => e.message).join('; ')
      : res.data?.message || JSON.stringify(res.data);
    logger.error(`Salesforce ${op} failed: ${res.status} ${message}`);
    throw new Error(message || `Salesforce ${op} failed with status ${res.status}`);
  }

  _validateSObjectName(objectName) {
    if (!objectName || typeof objectName !== 'string') {
      throw new Error('Object name must be a non-empty string');
    }

    // Salesforce object names can only contain alphanumeric characters, underscores, and must start with a letter
    const validObjectNamePattern = /^[a-zA-Z][a-zA-Z0-9_]*$/;
    if (!validObjectNamePattern.test(objectName)) {
      throw new Error(`Invalid Salesforce object name: ${objectName}`);
    }

    // Additional length validation (Salesforce has a 40 character limit for custom object names)
    if (objectName.length > 40) {
      throw new Error(`Object name too long: ${objectName}`);
    }
  }

  _validateFieldName(fieldName) {
    if (!fieldName || typeof fieldName !== 'string') {
      throw new Error('Field name must be a non-empty string');
    }

    // Salesforce field names can only contain alphanumeric characters, underscores, and must start with a letter
    const validFieldNamePattern = /^[a-zA-Z][a-zA-Z0-9_]*$/;
    if (!validFieldNamePattern.test(fieldName)) {
      throw new Error(`Invalid Salesforce field name: ${fieldName}`);
    }

    // Additional length validation (Salesforce has a 40 character limit for custom field names)
    if (fieldName.length > 40) {
      throw new Error(`Field name too long: ${fieldName}`);
    }
  }

  _escapeSoqlValue(value) {
    if (value === null || value === undefined) {
      return '';
    }

    // Convert to string and escape single quotes and backslashes
    const stringValue = String(value);
    return stringValue.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }
}

module.exports = SalesforceService;

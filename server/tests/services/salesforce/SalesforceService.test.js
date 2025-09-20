const SalesforceService = require('../../../services/salesforce/SalesforceService');
const axios = require('axios');

jest.mock('axios');
const mockedAxios = axios;

jest.mock('../../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock('../../../middleware/ssrfProtection', () => ({
  validateUrl: jest.fn((url, options) => {
    // Mock SSRF validation - allow valid Salesforce domains
    const validDomains = [
      'salesforce.com',
      'force.com',
      'my.salesforce.com',
      'sandbox.my.salesforce.com',
      'lightning.force.com',
    ];

    if (!url) {
      return { isValid: false, error: 'Instance URL is required' };
    }

    try {
      const urlObj = new URL(url);

      if (urlObj.protocol !== 'https:') {
        return { isValid: false, error: 'HTTPS required' };
      }

      const isValidDomain = validDomains.some(domain => urlObj.hostname.endsWith(domain));

      if (!isValidDomain) {
        return { isValid: false, error: 'Invalid domain' };
      }

      return { isValid: true, sanitizedUrl: url };
    } catch (e) {
      return { isValid: false, error: 'Invalid URL format' };
    }
  }),
}));

describe('SalesforceService', () => {
  let service;
  const validConfig = {
    instanceUrl: 'https://test.salesforce.com',
    accessToken: 'test-token',
    apiVersion: 'v58.0',
    timeout: 30000,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    test('should create service with valid Salesforce domain', () => {
      expect(() => new SalesforceService(validConfig)).not.toThrow();
    });

    test('should throw error for invalid domain', () => {
      expect(
        () => new SalesforceService({ ...validConfig, instanceUrl: 'https://malicious.com' })
      ).toThrow('Invalid Salesforce instance URL');
    });

    test('should throw error for non-HTTPS URL', () => {
      expect(
        () => new SalesforceService({ ...validConfig, instanceUrl: 'http://test.salesforce.com' })
      ).toThrow('Invalid Salesforce instance URL');
    });

    test('should throw error for missing instanceUrl', () => {
      expect(() => new SalesforceService({ accessToken: 'token' })).toThrow(
        'Invalid Salesforce instance URL: Instance URL is required'
      );
    });

    test('should accept valid Salesforce domains', () => {
      const validDomains = [
        'https://test.salesforce.com',
        'https://test.force.com',
        'https://test.my.salesforce.com',
        'https://test.sandbox.my.salesforce.com',
        'https://test.lightning.force.com',
      ];

      validDomains.forEach(url => {
        expect(() => new SalesforceService({ ...validConfig, instanceUrl: url })).not.toThrow();
      });
    });
  });

  describe('Client Configuration', () => {
    beforeEach(() => {
      service = new SalesforceService(validConfig);
    });

    test('should create axios client with correct config', () => {
      mockedAxios.create = jest.fn().mockReturnValue({});

      service.client;

      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://test.salesforce.com/services/data/v58.0',
        timeout: 30000,
        headers: {
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
          'User-Agent': 'NectarStudio/1.0',
        },
        validateStatus: expect.any(Function),
      });
    });

    test('should throw error when missing credentials', () => {
      const invalidService = new SalesforceService({
        instanceUrl: 'https://test.salesforce.com',
      });

      expect(() => invalidService.client).toThrow(
        'Salesforce instanceUrl and accessToken are required'
      );
    });
  });

  describe('testConnection', () => {
    beforeEach(() => {
      service = new SalesforceService(validConfig);
      mockedAxios.create.mockReturnValue({
        get: jest.fn(),
      });
    });

    test('should return true for successful connection', async () => {
      const mockClient = { get: jest.fn().mockResolvedValue({ status: 200 }) };
      mockedAxios.create.mockReturnValue(mockClient);

      const result = await service.testConnection();

      expect(result).toBe(true);
      expect(mockClient.get).toHaveBeenCalledWith('/limits');
    });

    test('should throw error for failed connection', async () => {
      const mockClient = { get: jest.fn().mockResolvedValue({ status: 401 }) };
      mockedAxios.create.mockReturnValue(mockClient);

      await expect(service.testConnection()).rejects.toThrow(
        'Salesforce connection failed with status 401'
      );
    });
  });

  describe('createRecord', () => {
    beforeEach(() => {
      service = new SalesforceService(validConfig);
    });

    test('should create record successfully', async () => {
      const mockResponse = { status: 201, data: { id: 'test-id', success: true } };
      const mockClient = { post: jest.fn().mockResolvedValue(mockResponse) };
      mockedAxios.create.mockReturnValue(mockClient);

      const data = { Name: 'Test Lead', Email: 'test@example.com' };
      const result = await service.createRecord('Lead', data);

      expect(mockClient.post).toHaveBeenCalledWith('/sobjects/Lead', data);
      expect(result).toEqual({ id: 'test-id', success: true });
    });

    test('should handle API errors', async () => {
      const mockResponse = {
        status: 400,
        data: [{ message: 'Required field missing' }],
      };
      const mockClient = { post: jest.fn().mockResolvedValue(mockResponse) };
      mockedAxios.create.mockReturnValue(mockClient);

      const data = { Email: 'test@example.com' };

      await expect(service.createRecord('Lead', data)).rejects.toThrow('Required field missing');
    });
  });

  describe('updateRecord', () => {
    beforeEach(() => {
      service = new SalesforceService(validConfig);
    });

    test('should update record successfully', async () => {
      const mockResponse = { status: 204, data: {} };
      const mockClient = { patch: jest.fn().mockResolvedValue(mockResponse) };
      mockedAxios.create.mockReturnValue(mockClient);

      const data = { Name: 'Updated Lead' };
      await service.updateRecord('Lead', 'test-id', data);

      expect(mockClient.patch).toHaveBeenCalledWith('/sobjects/Lead/test-id', data);
    });
  });

  describe('upsertRecord', () => {
    beforeEach(() => {
      service = new SalesforceService(validConfig);
    });

    test('should upsert record successfully', async () => {
      const mockResponse = { status: 201, data: { id: 'test-id', created: true } };
      const mockClient = { patch: jest.fn().mockResolvedValue(mockResponse) };
      mockedAxios.create.mockReturnValue(mockClient);

      const data = { Email__c: 'test@example.com', Name: 'Test Lead' };
      const result = await service.upsertRecord('Lead', 'Email__c', 'test@example.com', data);

      expect(mockClient.patch).toHaveBeenCalledWith(
        '/sobjects/Lead/Email__c/test%40example.com',
        data
      );
      expect(result).toEqual({ id: 'test-id', created: true });
    });
  });

  describe('querySOQL', () => {
    beforeEach(() => {
      service = new SalesforceService(validConfig);
    });

    test('should execute SOQL query successfully', async () => {
      const mockResponse = {
        status: 200,
        data: {
          totalSize: 1,
          records: [{ Id: 'test-id', Name: 'Test Lead' }],
        },
      };
      const mockClient = { get: jest.fn().mockResolvedValue(mockResponse) };
      mockedAxios.create.mockReturnValue(mockClient);

      const soql = "SELECT Id, Name FROM Lead WHERE Email = 'test@example.com'";
      const result = await service.querySOQL(soql);

      expect(mockClient.get).toHaveBeenCalledWith('/query', { params: { q: soql } });
      expect(result.records).toHaveLength(1);
    });
  });

  describe('findRecord', () => {
    beforeEach(() => {
      service = new SalesforceService(validConfig);
    });

    test('should find existing record', async () => {
      const mockRecord = { Id: 'test-id', Name: 'Test Lead' };
      service.querySOQL = jest.fn().mockResolvedValue({
        records: [mockRecord],
      });

      const result = await service.findRecord('Lead', 'Email', 'test@example.com');

      expect(service.querySOQL).toHaveBeenCalledWith(
        "SELECT Id FROM Lead WHERE Email = 'test@example.com' LIMIT 1"
      );
      expect(result).toEqual(mockRecord);
    });

    test('should return undefined for non-existent record', async () => {
      service.querySOQL = jest.fn().mockResolvedValue({ records: [] });

      const result = await service.findRecord('Lead', 'Email', 'nonexistent@example.com');

      expect(result).toBeUndefined();
    });

    test('should throw error for missing search field', async () => {
      await expect(service.findRecord('Lead', '', 'value')).rejects.toThrow(
        'Search field is required'
      );
    });

    test('should escape single quotes in search value', async () => {
      service.querySOQL = jest.fn().mockResolvedValue({ records: [] });

      await service.findRecord('Lead', 'Name', "John's Company");

      expect(service.querySOQL).toHaveBeenCalledWith(
        "SELECT Id FROM Lead WHERE Name = 'John\\'s Company' LIMIT 1"
      );
    });
  });

  describe('findOrCreate', () => {
    beforeEach(() => {
      service = new SalesforceService(validConfig);
    });

    test('should return existing record when found', async () => {
      const existingRecord = { Id: 'existing-id' };
      service.findRecord = jest.fn().mockResolvedValue(existingRecord);
      service.createRecord = jest.fn();

      const result = await service.findOrCreate('Lead', 'Email', 'test@example.com');

      expect(result).toEqual(existingRecord);
      expect(service.createRecord).not.toHaveBeenCalled();
    });

    test('should create new record when not found', async () => {
      const newRecord = { Id: 'new-id', success: true };
      service.findRecord = jest.fn().mockResolvedValue(undefined);
      service.createRecord = jest.fn().mockResolvedValue(newRecord);

      const createData = { Name: 'New Lead' };
      const result = await service.findOrCreate('Lead', 'Email', 'test@example.com', createData);

      expect(service.createRecord).toHaveBeenCalledWith('Lead', createData);
      expect(result).toEqual(newRecord);
    });

    test('should set external ID field in create data when provided', async () => {
      service.findRecord = jest.fn().mockResolvedValue(undefined);
      service.createRecord = jest.fn().mockResolvedValue({ Id: 'new-id' });

      const createData = { Name: 'New Lead' };
      await service.findOrCreate('Lead', 'Email', 'test@example.com', createData, 'Email__c');

      expect(service.createRecord).toHaveBeenCalledWith('Lead', {
        ...createData,
        Email__c: 'test@example.com',
      });
    });
  });

  describe('createTask', () => {
    beforeEach(() => {
      service = new SalesforceService(validConfig);
    });

    test('should create task successfully', async () => {
      const taskData = { Subject: 'Test Task', WhoId: 'lead-id' };
      const mockResult = { Id: 'task-id', success: true };
      service.createRecord = jest.fn().mockResolvedValue(mockResult);

      const result = await service.createTask(taskData);

      expect(service.createRecord).toHaveBeenCalledWith('Task', taskData);
      expect(result).toEqual(mockResult);
    });
  });

  describe('addToCampaign', () => {
    beforeEach(() => {
      service = new SalesforceService(validConfig);
    });

    test('should add member to campaign successfully', async () => {
      const mockResult = { Id: 'member-id', success: true };
      service.createRecord = jest.fn().mockResolvedValue(mockResult);

      const result = await service.addToCampaign({
        campaignId: 'campaign-id',
        memberId: 'lead-id',
        status: 'Sent',
      });

      expect(service.createRecord).toHaveBeenCalledWith('CampaignMember', {
        CampaignId: 'campaign-id',
        LeadId: 'lead-id',
        Status: 'Sent',
      });
      expect(result).toEqual(mockResult);
    });

    test('should handle ContactId field', async () => {
      service.createRecord = jest.fn().mockResolvedValue({ Id: 'member-id' });

      await service.addToCampaign({
        campaignId: 'campaign-id',
        memberIdField: 'ContactId',
        memberId: 'contact-id',
      });

      expect(service.createRecord).toHaveBeenCalledWith('CampaignMember', {
        CampaignId: 'campaign-id',
        ContactId: 'contact-id',
        Status: 'Sent',
      });
    });

    test('should throw error for missing campaignId', async () => {
      await expect(service.addToCampaign({ memberId: 'lead-id' })).rejects.toThrow(
        'campaignId is required'
      );
    });
  });

  describe('createAttachment', () => {
    beforeEach(() => {
      service = new SalesforceService(validConfig);
    });

    test('should create attachment successfully', async () => {
      const mockResult = { Id: 'attachment-id', success: true };
      service.createRecord = jest.fn().mockResolvedValue(mockResult);

      const attachmentData = {
        parentId: 'parent-id',
        fileName: 'test.pdf',
        contentBase64: 'base64content',
        contentType: 'application/pdf',
      };

      const result = await service.createAttachment(attachmentData);

      expect(service.createRecord).toHaveBeenCalledWith('Attachment', {
        ParentId: 'parent-id',
        Name: 'test.pdf',
        Body: 'base64content',
        ContentType: 'application/pdf',
      });
      expect(result).toEqual(mockResult);
    });

    test('should use default content type when not provided', async () => {
      service.createRecord = jest.fn().mockResolvedValue({ Id: 'attachment-id' });

      await service.createAttachment({
        parentId: 'parent-id',
        fileName: 'test.bin',
        contentBase64: 'base64content',
      });

      expect(service.createRecord).toHaveBeenCalledWith('Attachment', {
        ParentId: 'parent-id',
        Name: 'test.bin',
        Body: 'base64content',
        ContentType: 'application/octet-stream',
      });
    });

    test('should throw error for missing required fields', async () => {
      await expect(service.createAttachment({})).rejects.toThrow('parentId is required');

      await expect(service.createAttachment({ parentId: 'id' })).rejects.toThrow(
        'fileName is required'
      );

      await expect(
        service.createAttachment({
          parentId: 'id',
          fileName: 'test.pdf',
        })
      ).rejects.toThrow('contentBase64 is required');
    });
  });
});

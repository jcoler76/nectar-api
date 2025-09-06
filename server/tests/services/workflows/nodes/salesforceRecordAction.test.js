const { execute } = require('../../../../services/workflows/nodes/salesforceRecordAction');
const SalesforceService = require('../../../../services/salesforce/SalesforceService');

jest.mock('../../../../services/salesforce/SalesforceService');
jest.mock('../../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe('salesforceRecordAction', () => {
  let mockSfService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSfService = {
      createRecord: jest.fn(),
      updateRecord: jest.fn(),
      upsertRecord: jest.fn(),
      findRecord: jest.fn(),
      findOrCreate: jest.fn(),
      createTask: jest.fn(),
      addToCampaign: jest.fn(),
      createAttachment: jest.fn(),
    };
    SalesforceService.mockImplementation(() => mockSfService);
  });

  describe('Configuration and Context', () => {
    test('should initialize SalesforceService with correct config', async () => {
      const config = {
        connection: {
          instanceUrl: 'https://test.salesforce.com',
          accessToken: 'test-token',
          apiVersion: 'v59.0',
          timeout: 60000,
        },
      };
      const context = { input: { Name: 'Test' } };

      mockSfService.createRecord.mockResolvedValue({ Id: 'test-id' });

      await execute(config, context);

      expect(SalesforceService).toHaveBeenCalledWith({
        instanceUrl: 'https://test.salesforce.com',
        accessToken: 'test-token',
        apiVersion: 'v59.0',
        timeout: 60000,
      });
    });

    test('should use default API version and timeout when not provided', async () => {
      const config = {
        connection: {
          instanceUrl: 'https://test.salesforce.com',
          accessToken: 'test-token',
        },
      };
      const context = { input: { Name: 'Test' } };

      mockSfService.createRecord.mockResolvedValue({ Id: 'test-id' });

      await execute(config, context);

      expect(SalesforceService).toHaveBeenCalledWith({
        instanceUrl: 'https://test.salesforce.com',
        accessToken: 'test-token',
        apiVersion: 'v58.0',
        timeout: 30000,
      });
    });
  });

  describe('Data Resolution and Mapping', () => {
    test('should resolve data from context.currentNodeId', async () => {
      const config = {
        connection: { instanceUrl: 'https://test.sf.com', accessToken: 'token' },
        dataMapping: {
          fields: { 'input.name': 'Name', 'input.email': 'Email' },
        },
      };
      const context = {
        currentNodeId: 'node1',
        node1: { data: { input: { name: 'John', email: 'john@example.com' } } },
      };

      mockSfService.createRecord.mockResolvedValue({ Id: 'test-id' });

      await execute(config, context);

      expect(mockSfService.createRecord).toHaveBeenCalledWith('Lead', {
        Name: 'John',
        Email: 'john@example.com',
      });
    });

    test('should fallback to context.input when currentNodeId data not available', async () => {
      const config = {
        connection: { instanceUrl: 'https://test.sf.com', accessToken: 'token' },
        dataMapping: {
          fields: { name: 'Name', email: 'Email' },
        },
      };
      const context = {
        input: { name: 'Jane', email: 'jane@example.com' },
      };

      mockSfService.createRecord.mockResolvedValue({ Id: 'test-id' });

      await execute(config, context);

      expect(mockSfService.createRecord).toHaveBeenCalledWith('Lead', {
        Name: 'Jane',
        Email: 'jane@example.com',
      });
    });

    test('should handle nested field mapping', async () => {
      const config = {
        connection: { instanceUrl: 'https://test.sf.com', accessToken: 'token' },
        dataMapping: {
          fields: { 'user.profile.name': 'Name', 'user.contact.email': 'Email' },
        },
      };
      const context = {
        input: {
          user: {
            profile: { name: 'Deep Name' },
            contact: { email: 'deep@example.com' },
          },
        },
      };

      mockSfService.createRecord.mockResolvedValue({ Id: 'test-id' });

      await execute(config, context);

      expect(mockSfService.createRecord).toHaveBeenCalledWith('Lead', {
        Name: 'Deep Name',
        Email: 'deep@example.com',
      });
    });

    test('should handle missing field mapping gracefully', async () => {
      const config = {
        connection: { instanceUrl: 'https://test.sf.com', accessToken: 'token' },
      };
      const context = {
        input: { name: 'Test', email: 'test@example.com' },
      };

      mockSfService.createRecord.mockResolvedValue({ Id: 'test-id' });

      await execute(config, context);

      expect(mockSfService.createRecord).toHaveBeenCalledWith('Lead', {
        name: 'Test',
        email: 'test@example.com',
      });
    });
  });

  describe('Operations', () => {
    const baseConfig = {
      connection: { instanceUrl: 'https://test.sf.com', accessToken: 'token' },
      dataMapping: {
        fields: { Name: 'Name', Email: 'Email' },
      },
    };
    const baseContext = { input: { Name: 'Test Lead', Email: 'test@example.com' } };

    describe('create operation', () => {
      test('should create record successfully', async () => {
        const config = { ...baseConfig, operation: 'create', object: 'Contact' };
        mockSfService.createRecord.mockResolvedValue({ Id: 'contact-id', success: true });

        const result = await execute(config, baseContext);

        expect(mockSfService.createRecord).toHaveBeenCalledWith('Contact', {
          Name: 'Test Lead',
          Email: 'test@example.com',
        });
        expect(result).toEqual({
          status: 'success',
          data: { Id: 'contact-id', success: true },
        });
      });
    });

    describe('update operation', () => {
      test('should update record successfully', async () => {
        const config = {
          ...baseConfig,
          operation: 'update',
          recordId: 'existing-id',
        };
        mockSfService.updateRecord.mockResolvedValue({ success: true });

        const result = await execute(config, baseContext);

        expect(mockSfService.updateRecord).toHaveBeenCalledWith('Lead', 'existing-id', {
          Name: 'Test Lead',
          Email: 'test@example.com',
        });
        expect(result.status).toBe('success');
      });

      test('should throw error when recordId is missing', async () => {
        const config = { ...baseConfig, operation: 'update' };

        const result = await execute(config, baseContext);

        expect(result.status).toBe('error');
        expect(result.error).toBe('recordId is required for update');
      });
    });

    describe('upsert operation', () => {
      test('should upsert record successfully', async () => {
        const config = {
          ...baseConfig,
          operation: 'upsert',
          externalIdField: 'Email__c',
          dataMapping: {
            fields: { Email: 'Email__c', Name: 'Name' },
          },
        };
        const context = { input: { Email: 'test@example.com', Name: 'Test' } };

        mockSfService.upsertRecord.mockResolvedValue({ Id: 'upserted-id', created: false });

        const result = await execute(config, context);

        expect(mockSfService.upsertRecord).toHaveBeenCalledWith(
          'Lead',
          'Email__c',
          'test@example.com',
          { Email__c: 'test@example.com', Name: 'Test' }
        );
        expect(result.status).toBe('success');
      });

      test('should throw error when externalIdField is missing', async () => {
        const config = { ...baseConfig, operation: 'upsert' };

        const result = await execute(config, baseContext);

        expect(result.status).toBe('error');
        expect(result.error).toBe('externalIdField is required for upsert');
      });

      test('should throw error when payload lacks external ID field', async () => {
        const config = {
          ...baseConfig,
          operation: 'upsert',
          externalIdField: 'CustomId__c',
        };

        const result = await execute(config, baseContext);

        expect(result.status).toBe('error');
        expect(result.error).toBe('Payload must include CustomId__c for upsert');
      });
    });

    describe('find operation', () => {
      test('should find record successfully', async () => {
        const config = {
          ...baseConfig,
          operation: 'find',
          search: { field: 'Email', value: 'test@example.com' },
        };
        mockSfService.findRecord.mockResolvedValue({ Id: 'found-id', Name: 'Found Lead' });

        const result = await execute(config, baseContext);

        expect(mockSfService.findRecord).toHaveBeenCalledWith('Lead', 'Email', 'test@example.com');
        expect(result.data).toEqual({ Id: 'found-id', Name: 'Found Lead' });
      });

      test('should throw error when search field is missing', async () => {
        const config = { ...baseConfig, operation: 'find', search: {} };

        const result = await execute(config, baseContext);

        expect(result.status).toBe('error');
        expect(result.error).toBe('search.field is required for find');
      });
    });

    describe('findOrCreate operation', () => {
      test('should find or create record successfully', async () => {
        const config = {
          ...baseConfig,
          operation: 'findOrCreate',
          search: { field: 'Email', value: 'new@example.com' },
          externalIdField: 'Email__c',
        };
        mockSfService.findOrCreate.mockResolvedValue({ Id: 'new-id', created: true });

        const result = await execute(config, baseContext);

        expect(mockSfService.findOrCreate).toHaveBeenCalledWith(
          'Lead',
          'Email',
          'new@example.com',
          { Name: 'Test Lead', Email: 'test@example.com' },
          'Email__c'
        );
        expect(result.status).toBe('success');
      });
    });

    describe('createTask operation', () => {
      test('should create task successfully', async () => {
        const config = {
          connection: { instanceUrl: 'https://test.sf.com', accessToken: 'token' },
          operation: 'createTask',
          dataMapping: {
            fields: { Subject: 'Subject', WhoId: 'WhoId', Priority: 'Priority' },
          },
        };
        const context = {
          input: { Subject: 'Follow up', WhoId: 'lead-id', Priority: 'High' },
        };
        mockSfService.createTask.mockResolvedValue({ Id: 'task-id', success: true });

        const result = await execute(config, context);

        expect(mockSfService.createTask).toHaveBeenCalledWith({
          Subject: 'Follow up',
          WhoId: 'lead-id',
          Priority: 'High',
        });
        expect(result.status).toBe('success');
      });
    });

    describe('addToCampaign operation', () => {
      test('should add to campaign successfully with LeadId', async () => {
        const config = {
          connection: { instanceUrl: 'https://test.sf.com', accessToken: 'token' },
          operation: 'addToCampaign',
          campaign: {
            campaignId: 'campaign-123',
            status: 'Responded',
          },
          dataMapping: {
            fields: { LeadId: 'LeadId' },
          },
        };
        const context = { input: { LeadId: 'lead-123' } };
        mockSfService.addToCampaign.mockResolvedValue({ Id: 'member-id', success: true });

        const result = await execute(config, context);

        expect(mockSfService.addToCampaign).toHaveBeenCalledWith({
          campaignId: 'campaign-123',
          memberIdField: 'LeadId',
          memberId: 'lead-123',
          status: 'Responded',
        });
        expect(result.status).toBe('success');
      });

      test('should handle ContactId field', async () => {
        const config = {
          connection: { instanceUrl: 'https://test.sf.com', accessToken: 'token' },
          operation: 'addToCampaign',
          campaign: {
            campaignId: 'campaign-123',
            memberIdField: 'ContactId',
          },
          dataMapping: {
            fields: { ContactId: 'ContactId' },
          },
        };
        const context = { input: { ContactId: 'contact-123' } };
        mockSfService.addToCampaign.mockResolvedValue({ Id: 'member-id' });

        await execute(config, context);

        expect(mockSfService.addToCampaign).toHaveBeenCalledWith({
          campaignId: 'campaign-123',
          memberIdField: 'ContactId',
          memberId: 'contact-123',
          status: 'Sent',
        });
      });
    });

    describe('createAttachment operation', () => {
      test('should create attachment successfully', async () => {
        const config = {
          ...baseConfig,
          operation: 'createAttachment',
          attachment: {
            parentId: 'record-123',
            fileName: 'document.pdf',
            contentBase64: 'base64content',
            contentType: 'application/pdf',
          },
        };
        mockSfService.createAttachment.mockResolvedValue({ Id: 'attachment-id', success: true });

        const result = await execute(config, baseContext);

        expect(mockSfService.createAttachment).toHaveBeenCalledWith({
          parentId: 'record-123',
          fileName: 'document.pdf',
          contentBase64: 'base64content',
          contentType: 'application/pdf',
        });
        expect(result.status).toBe('success');
      });
    });

    describe('unsupported operation', () => {
      test('should throw error for unsupported operation', async () => {
        const config = { ...baseConfig, operation: 'unsupported' };

        const result = await execute(config, baseContext);

        expect(result.status).toBe('error');
        expect(result.error).toBe('Unsupported Salesforce operation: unsupported');
      });
    });
  });

  describe('Error Handling', () => {
    const baseConfig = {
      connection: { instanceUrl: 'https://test.sf.com', accessToken: 'token' },
    };
    const baseContext = { input: { Name: 'Test' } };

    test('should handle Salesforce API errors', async () => {
      const config = { ...baseConfig, operation: 'create' };
      mockSfService.createRecord.mockRejectedValue(new Error('API quota exceeded'));

      const result = await execute(config, baseContext);

      expect(result.status).toBe('error');
      expect(result.error).toBe('API quota exceeded');
    });

    test('should handle network errors', async () => {
      const config = { ...baseConfig, operation: 'create' };
      mockSfService.createRecord.mockRejectedValue(new Error('Network timeout'));

      const result = await execute(config, baseContext);

      expect(result.status).toBe('error');
      expect(result.error).toBe('Network timeout');
    });

    test('should handle validation errors from service initialization', async () => {
      const originalImplementation = SalesforceService;
      SalesforceService.mockImplementation(() => {
        throw new Error('Invalid Salesforce instance URL');
      });

      const config = {
        connection: { instanceUrl: 'invalid-url', accessToken: 'token' },
      };

      const result = await execute(config, baseContext);

      expect(result.status).toBe('error');
      expect(result.error).toBe('Invalid Salesforce instance URL');

      // Restore the original implementation
      SalesforceService.mockImplementation(() => mockSfService);
    });
  });

  describe('Field Mapping Utility', () => {
    test('should map simple fields correctly', async () => {
      const config = {
        connection: { instanceUrl: 'https://test.sf.com', accessToken: 'token' },
        dataMapping: {
          fields: {
            firstName: 'FirstName',
            lastName: 'LastName',
            emailAddress: 'Email',
          },
        },
      };
      const context = {
        input: {
          firstName: 'John',
          lastName: 'Doe',
          emailAddress: 'john.doe@example.com',
        },
      };

      mockSfService.createRecord.mockResolvedValue({ Id: 'test-id' });

      await execute(config, context);

      expect(mockSfService.createRecord).toHaveBeenCalledWith('Lead', {
        FirstName: 'John',
        LastName: 'Doe',
        Email: 'john.doe@example.com',
      });
    });

    test('should handle missing source fields gracefully', async () => {
      const config = {
        connection: { instanceUrl: 'https://test.sf.com', accessToken: 'token' },
        dataMapping: {
          fields: {
            missingField: 'Name',
            existingField: 'Email',
          },
        },
      };
      const context = {
        input: { existingField: 'test@example.com' },
      };

      mockSfService.createRecord.mockResolvedValue({ Id: 'test-id' });

      await execute(config, context);

      expect(mockSfService.createRecord).toHaveBeenCalledWith('Lead', {
        Name: undefined,
        Email: 'test@example.com',
      });
    });
  });
});

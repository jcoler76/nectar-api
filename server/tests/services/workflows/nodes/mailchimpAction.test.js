/**
 * Mailchimp Action Workflow Node Tests
 */

const { describe, it, expect, beforeEach, jest } = require('@jest/globals');

// Mock MailchimpService
jest.mock('../../../../services/mailchimp/MailchimpService');
const MailchimpService = require('../../../../services/mailchimp/MailchimpService');

const { execute } = require('../../../../services/workflows/nodes/mailchimpAction');

describe('Mailchimp Action Workflow Node', () => {
  let mockMailchimpService;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock service methods
    mockMailchimpService = {
      addOrUpdateMember: jest.fn(),
      subscribeMember: jest.fn(),
      unsubscribeMember: jest.fn(),
      getMember: jest.fn(),
      addMemberTags: jest.fn(),
      removeMemberTags: jest.fn(),
      updateMemberFields: jest.fn(),
      deleteMember: jest.fn(),
    };

    MailchimpService.mockImplementation(() => mockMailchimpService);
  });

  describe('Configuration Validation', () => {
    it('should require API key', async () => {
      const config = {
        operation: 'subscribe',
        listId: 'list123',
        email: 'test@example.com',
      };

      const result = await execute(config, {});

      expect(result.status).toBe('error');
      expect(result.error).toContain('API key is required');
    });

    it('should require list ID', async () => {
      const config = {
        connection: { apiKey: 'test-key-us1' },
        operation: 'subscribe',
        email: 'test@example.com',
      };

      const result = await execute(config, {});

      expect(result.status).toBe('error');
      expect(result.error).toContain('List ID is required');
    });

    it('should require email for most operations', async () => {
      const config = {
        connection: { apiKey: 'test-key-us1' },
        operation: 'subscribe',
        listId: 'list123',
      };

      const result = await execute(config, {});

      expect(result.status).toBe('error');
      expect(result.error).toContain('Email address is required');
    });

    it('should reject invalid operations', async () => {
      const config = {
        connection: { apiKey: 'test-key-us1' },
        operation: 'invalidOperation',
        listId: 'list123',
        email: 'test@example.com',
      };

      const result = await execute(config, {});

      expect(result.status).toBe('error');
      expect(result.error).toContain('Unsupported Mailchimp operation');
    });
  });

  describe('Subscribe Operation', () => {
    it('should subscribe member successfully', async () => {
      mockMailchimpService.addOrUpdateMember.mockResolvedValue({
        id: 'abc123',
        email_address: 'test@example.com',
        status: 'subscribed',
      });

      const config = {
        label: 'Subscribe User',
        connection: { apiKey: 'test-key-us1' },
        operation: 'subscribe',
        listId: 'list123',
        email: 'test@example.com',
        status: 'subscribed',
      };

      const result = await execute(config, {});

      expect(result.status).toBe('success');
      expect(result.operation).toBe('subscribe');
      expect(result.email).toBe('test@example.com');
      expect(mockMailchimpService.addOrUpdateMember).toHaveBeenCalled();
    });

    it('should subscribe with merge fields mapping', async () => {
      mockMailchimpService.addOrUpdateMember.mockResolvedValue({
        email_address: 'test@example.com',
        status: 'subscribed',
      });

      const config = {
        connection: { apiKey: 'test-key-us1' },
        operation: 'subscribe',
        listId: 'list123',
        email: 'test@example.com',
        dataMapping: {
          mergeFields: {
            FNAME: '{{contact.firstName}}',
            LNAME: '{{contact.lastName}}',
          },
        },
      };

      const context = {
        contact: {
          firstName: 'John',
          lastName: 'Doe',
        },
      };

      const result = await execute(config, context);

      expect(result.status).toBe('success');
      const callArgs = mockMailchimpService.addOrUpdateMember.mock.calls[0][1];
      expect(callArgs.merge_fields.FNAME).toBe('John');
      expect(callArgs.merge_fields.LNAME).toBe('Doe');
    });

    it('should subscribe with tags', async () => {
      mockMailchimpService.addOrUpdateMember.mockResolvedValue({});

      const config = {
        connection: { apiKey: 'test-key-us1' },
        operation: 'subscribe',
        listId: 'list123',
        email: 'test@example.com',
        tags: ['customer', 'vip'],
      };

      const result = await execute(config, {});

      expect(result.status).toBe('success');
      const callArgs = mockMailchimpService.addOrUpdateMember.mock.calls[0][1];
      expect(callArgs.tags).toEqual(['customer', 'vip']);
    });

    it('should handle double opt-in', async () => {
      mockMailchimpService.addOrUpdateMember.mockResolvedValue({});

      const config = {
        connection: { apiKey: 'test-key-us1' },
        operation: 'subscribe',
        listId: 'list123',
        email: 'test@example.com',
        doubleOptIn: true,
      };

      const result = await execute(config, {});

      expect(result.status).toBe('success');
      const callArgs = mockMailchimpService.addOrUpdateMember.mock.calls[0][1];
      expect(callArgs.status).toBe('pending');
    });
  });

  describe('Unsubscribe Operation', () => {
    it('should unsubscribe member successfully', async () => {
      mockMailchimpService.unsubscribeMember.mockResolvedValue({
        status: 'unsubscribed',
      });

      const config = {
        connection: { apiKey: 'test-key-us1' },
        operation: 'unsubscribe',
        listId: 'list123',
        email: 'test@example.com',
      };

      const result = await execute(config, {});

      expect(result.status).toBe('success');
      expect(mockMailchimpService.unsubscribeMember).toHaveBeenCalledWith(
        'list123',
        'test@example.com'
      );
    });
  });

  describe('Update Member Operation', () => {
    it('should update member with merge fields', async () => {
      mockMailchimpService.addOrUpdateMember.mockResolvedValue({});

      const config = {
        connection: { apiKey: 'test-key-us1' },
        operation: 'updateMember',
        listId: 'list123',
        email: 'test@example.com',
        dataMapping: {
          mergeFields: {
            PHONE: '{{contact.phone}}',
          },
        },
      };

      const context = {
        contact: {
          phone: '555-1234',
        },
      };

      const result = await execute(config, context);

      expect(result.status).toBe('success');
      const callArgs = mockMailchimpService.addOrUpdateMember.mock.calls[0][1];
      expect(callArgs.merge_fields.PHONE).toBe('555-1234');
    });
  });

  describe('Tag Operations', () => {
    it('should add tags to member', async () => {
      mockMailchimpService.addMemberTags.mockResolvedValue({});

      const config = {
        connection: { apiKey: 'test-key-us1' },
        operation: 'addTags',
        listId: 'list123',
        email: 'test@example.com',
        tags: 'customer, premium',
      };

      const result = await execute(config, {});

      expect(result.status).toBe('success');
      expect(mockMailchimpService.addMemberTags).toHaveBeenCalledWith(
        'list123',
        'test@example.com',
        ['customer', 'premium']
      );
    });

    it('should remove tags from member', async () => {
      mockMailchimpService.removeMemberTags.mockResolvedValue({});

      const config = {
        connection: { apiKey: 'test-key-us1' },
        operation: 'removeTags',
        listId: 'list123',
        email: 'test@example.com',
        tags: ['old-tag'],
      };

      const result = await execute(config, {});

      expect(result.status).toBe('success');
      expect(mockMailchimpService.removeMemberTags).toHaveBeenCalledWith(
        'list123',
        'test@example.com',
        ['old-tag']
      );
    });
  });

  describe('Get Member Operation', () => {
    it('should get member information', async () => {
      mockMailchimpService.getMember.mockResolvedValue({
        email_address: 'test@example.com',
        status: 'subscribed',
      });

      const config = {
        connection: { apiKey: 'test-key-us1' },
        operation: 'getMember',
        listId: 'list123',
        email: 'test@example.com',
      };

      const result = await execute(config, {});

      expect(result.status).toBe('success');
      expect(result.data.email_address).toBe('test@example.com');
    });

    it('should handle member not found', async () => {
      mockMailchimpService.getMember.mockResolvedValue(null);

      const config = {
        connection: { apiKey: 'test-key-us1' },
        operation: 'getMember',
        listId: 'list123',
        email: 'notfound@example.com',
      };

      const result = await execute(config, {});

      expect(result.status).toBe('success');
      expect(result.found).toBe(false);
    });
  });

  describe('Delete Member Operation', () => {
    it('should delete member permanently', async () => {
      mockMailchimpService.deleteMember.mockResolvedValue({ success: true });

      const config = {
        connection: { apiKey: 'test-key-us1' },
        operation: 'deleteMember',
        listId: 'list123',
        email: 'test@example.com',
      };

      const result = await execute(config, {});

      expect(result.status).toBe('success');
      expect(mockMailchimpService.deleteMember).toHaveBeenCalled();
    });
  });

  describe('Context Data Resolution', () => {
    it('should resolve email from context', async () => {
      mockMailchimpService.addOrUpdateMember.mockResolvedValue({});

      const config = {
        connection: { apiKey: 'test-key-us1' },
        operation: 'subscribe',
        listId: 'list123',
        // email not in config
      };

      const context = {
        input: {
          email: 'context@example.com',
        },
      };

      const result = await execute(config, context);

      expect(result.status).toBe('success');
      expect(result.email).toBe('context@example.com');
    });

    it('should auto-map common fields when no mapping provided', async () => {
      mockMailchimpService.addOrUpdateMember.mockResolvedValue({});

      const config = {
        connection: { apiKey: 'test-key-us1' },
        operation: 'subscribe',
        listId: 'list123',
        email: 'test@example.com',
      };

      const context = {
        firstName: 'Jane',
        lastName: 'Smith',
        phone: '555-9999',
      };

      const result = await execute(config, context);

      expect(result.status).toBe('success');
      const callArgs = mockMailchimpService.addOrUpdateMember.mock.calls[0][1];
      expect(callArgs.merge_fields.FNAME).toBe('Jane');
      expect(callArgs.merge_fields.LNAME).toBe('Smith');
      expect(callArgs.merge_fields.PHONE).toBe('555-9999');
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockMailchimpService.addOrUpdateMember.mockRejectedValue(new Error('Invalid list ID'));

      const config = {
        connection: { apiKey: 'test-key-us1' },
        operation: 'subscribe',
        listId: 'invalid',
        email: 'test@example.com',
      };

      const result = await execute(config, {});

      expect(result.status).toBe('error');
      expect(result.error).toContain('Invalid list ID');
    });
  });
});

/**
 * Mailchimp Service Tests
 * Tests for MailchimpService API integration
 */

const { describe, it, expect, beforeEach, jest } = require('@jest/globals');
const MailchimpService = require('../../../services/mailchimp/MailchimpService');

// Mock axios
jest.mock('axios');
const axios = require('axios');

describe('MailchimpService', () => {
  let mockClient;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock axios client
    mockClient = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
    };

    axios.create.mockReturnValue(mockClient);
  });

  describe('Constructor', () => {
    it('should create service with valid API key', () => {
      const service = new MailchimpService({ apiKey: 'test-key-us1' });
      expect(service.apiKey).toBe('test-key-us1');
      expect(service.datacenter).toBe('us1');
      expect(service.baseURL).toBe('https://us1.api.mailchimp.com/3.0');
    });

    it('should extract datacenter from API key', () => {
      const service = new MailchimpService({ apiKey: '123abc-us12' });
      expect(service.datacenter).toBe('us12');
    });

    it('should use explicit server parameter', () => {
      const service = new MailchimpService({ apiKey: 'test-key-us1', server: 'us5' });
      expect(service.datacenter).toBe('us5');
      expect(service.baseURL).toBe('https://us5.api.mailchimp.com/3.0');
    });

    it('should throw error without API key', () => {
      expect(() => new MailchimpService({})).toThrow('Mailchimp apiKey is required');
    });

    it('should throw error with invalid API key format', () => {
      expect(() => new MailchimpService({ apiKey: 'invalidkey' })).toThrow(
        'Could not determine Mailchimp datacenter'
      );
    });
  });

  describe('testConnection', () => {
    it('should successfully test connection', async () => {
      mockClient.get.mockResolvedValue({
        status: 200,
        data: { health_status: "Everything's Chimpy!" },
      });

      const service = new MailchimpService({ apiKey: 'test-key-us1' });
      const result = await service.testConnection();

      expect(result).toBe(true);
      expect(mockClient.get).toHaveBeenCalledWith('/ping', {
        validateStatus: expect.any(Function),
      });
    });

    it('should handle connection failure', async () => {
      mockClient.get.mockResolvedValue({ status: 401, data: { detail: 'Invalid API key' } });

      const service = new MailchimpService({ apiKey: 'test-key-us1' });

      await expect(service.testConnection()).rejects.toThrow('Mailchimp connection failed');
    });
  });

  describe('addOrUpdateMember', () => {
    it('should add new member successfully', async () => {
      mockClient.put.mockResolvedValue({
        status: 200,
        data: {
          id: 'abc123',
          email_address: 'test@example.com',
          status: 'subscribed',
        },
      });

      const service = new MailchimpService({ apiKey: 'test-key-us1' });
      const result = await service.addOrUpdateMember('list123', {
        email_address: 'test@example.com',
        status: 'subscribed',
      });

      expect(result.email_address).toBe('test@example.com');
      expect(result.status).toBe('subscribed');
      expect(mockClient.put).toHaveBeenCalled();
    });

    it('should update existing member', async () => {
      mockClient.put.mockResolvedValue({
        status: 200,
        data: {
          id: 'abc123',
          email_address: 'test@example.com',
          merge_fields: { FNAME: 'John', LNAME: 'Doe' },
        },
      });

      const service = new MailchimpService({ apiKey: 'test-key-us1' });
      const result = await service.addOrUpdateMember('list123', {
        email_address: 'test@example.com',
        merge_fields: { FNAME: 'John', LNAME: 'Doe' },
      });

      expect(result.merge_fields.FNAME).toBe('John');
    });

    it('should default status to subscribed', async () => {
      mockClient.put.mockResolvedValue({ status: 200, data: {} });

      const service = new MailchimpService({ apiKey: 'test-key-us1' });
      await service.addOrUpdateMember('list123', {
        email_address: 'test@example.com',
      });

      const callArgs = mockClient.put.mock.calls[0][1];
      expect(callArgs.status).toBe('subscribed');
    });

    it('should handle API errors', async () => {
      mockClient.put.mockResolvedValue({
        status: 400,
        data: { detail: 'Invalid email address' },
      });

      const service = new MailchimpService({ apiKey: 'test-key-us1' });

      await expect(
        service.addOrUpdateMember('list123', {
          email_address: 'invalid',
        })
      ).rejects.toThrow('Invalid email address');
    });
  });

  describe('subscribeMember', () => {
    it('should subscribe member with merge fields and tags', async () => {
      mockClient.put.mockResolvedValue({ status: 200, data: { status: 'subscribed' } });

      const service = new MailchimpService({ apiKey: 'test-key-us1' });
      await service.subscribeMember(
        'list123',
        'test@example.com',
        { FNAME: 'John', LNAME: 'Doe' },
        ['customer', 'vip']
      );

      const callArgs = mockClient.put.mock.calls[0][1];
      expect(callArgs.email_address).toBe('test@example.com');
      expect(callArgs.merge_fields.FNAME).toBe('John');
      expect(callArgs.tags).toEqual(['customer', 'vip']);
    });
  });

  describe('unsubscribeMember', () => {
    it('should unsubscribe member successfully', async () => {
      mockClient.patch.mockResolvedValue({
        status: 200,
        data: { status: 'unsubscribed' },
      });

      const service = new MailchimpService({ apiKey: 'test-key-us1' });
      const result = await service.unsubscribeMember('list123', 'test@example.com');

      expect(result.status).toBe('unsubscribed');
    });
  });

  describe('getMember', () => {
    it('should get member information', async () => {
      mockClient.get.mockResolvedValue({
        status: 200,
        data: {
          email_address: 'test@example.com',
          status: 'subscribed',
          merge_fields: { FNAME: 'John' },
        },
      });

      const service = new MailchimpService({ apiKey: 'test-key-us1' });
      const result = await service.getMember('list123', 'test@example.com');

      expect(result.email_address).toBe('test@example.com');
      expect(result.status).toBe('subscribed');
    });

    it('should return null for non-existent member', async () => {
      mockClient.get.mockResolvedValue({ status: 404 });

      const service = new MailchimpService({ apiKey: 'test-key-us1' });
      const result = await service.getMember('list123', 'notfound@example.com');

      expect(result).toBeNull();
    });
  });

  describe('updateMemberTags', () => {
    it('should add tags to member', async () => {
      mockClient.post.mockResolvedValue({ status: 200, data: {} });

      const service = new MailchimpService({ apiKey: 'test-key-us1' });
      await service.updateMemberTags('list123', 'test@example.com', ['tag1', 'tag2'], true);

      const callArgs = mockClient.post.mock.calls[0][1];
      expect(callArgs.tags).toEqual([
        { name: 'tag1', status: 'active' },
        { name: 'tag2', status: 'active' },
      ]);
    });

    it('should remove tags from member', async () => {
      mockClient.post.mockResolvedValue({ status: 200, data: {} });

      const service = new MailchimpService({ apiKey: 'test-key-us1' });
      await service.updateMemberTags('list123', 'test@example.com', ['tag1'], false);

      const callArgs = mockClient.post.mock.calls[0][1];
      expect(callArgs.tags[0].status).toBe('inactive');
    });
  });

  describe('deleteMember', () => {
    it('should delete member permanently', async () => {
      mockClient.delete.mockResolvedValue({ status: 204, data: {} });

      const service = new MailchimpService({ apiKey: 'test-key-us1' });
      const result = await service.deleteMember('list123', 'test@example.com');

      expect(result.success).toBe(true);
    });
  });

  describe('Email Hash Generation', () => {
    it('should generate correct MD5 hash for email', () => {
      const service = new MailchimpService({ apiKey: 'test-key-us1' });
      const hash = service._getEmailHash('test@example.com');

      // MD5 hash of 'test@example.com'
      expect(hash).toBe('55502f40dc8b7c769880b10874abc9d0');
    });

    it('should lowercase email before hashing', () => {
      const service = new MailchimpService({ apiKey: 'test-key-us1' });
      const hash1 = service._getEmailHash('Test@Example.COM');
      const hash2 = service._getEmailHash('test@example.com');

      expect(hash1).toBe(hash2);
    });
  });
});

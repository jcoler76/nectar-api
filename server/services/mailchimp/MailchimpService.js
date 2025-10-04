const axios = require('axios');
const crypto = require('crypto');
const { logger } = require('../../utils/logger');

/**
 * Mailchimp Marketing API Service
 * Provides subscriber management, list operations, and tagging functionality
 *
 * API Documentation: https://mailchimp.com/developer/marketing/api/
 */
class MailchimpService {
  constructor({ apiKey, server, timeout = 30000 } = {}) {
    if (!apiKey) throw new Error('Mailchimp apiKey is required');

    // Extract server/datacenter from API key (format: key-us1)
    const datacenter = server || this._extractDatacenter(apiKey);
    if (!datacenter) {
      throw new Error('Could not determine Mailchimp datacenter from API key');
    }

    this.apiKey = apiKey;
    this.datacenter = datacenter;
    this.baseURL = `https://${datacenter}.api.mailchimp.com/3.0`;

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout,
      headers: {
        'Content-Type': 'application/json',
      },
      auth: {
        username: 'anystring', // Mailchimp requires any username with API key as password
        password: apiKey,
      },
    });
  }

  /**
   * Extract datacenter from API key
   * @private
   */
  _extractDatacenter(apiKey) {
    const parts = apiKey.split('-');
    return parts.length === 2 ? parts[1] : null;
  }

  /**
   * Generate MD5 hash for email (Mailchimp member ID)
   * @private
   */
  _getEmailHash(email) {
    return crypto.createHash('md5').update(email.toLowerCase()).digest('hex');
  }

  /**
   * Test the Mailchimp connection
   */
  async testConnection() {
    try {
      const res = await this.client.get('/ping', { validateStatus: () => true });
      if (res.status >= 400) {
        throw new Error(`Mailchimp connection failed: ${res.status}`);
      }
      return true;
    } catch (error) {
      logger.error('Mailchimp connection test failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Get all lists/audiences
   */
  async getLists({ count = 100, offset = 0 } = {}) {
    const res = await this.client.get('/lists', {
      params: { count, offset },
    });
    return res.data;
  }

  /**
   * Get a specific list by ID
   */
  async getList(listId) {
    if (!listId) throw new Error('listId is required');
    const res = await this.client.get(`/lists/${encodeURIComponent(listId)}`);
    return res.data;
  }

  /**
   * Add or update a list member (subscriber)
   * If the email already exists, updates the member. Otherwise, creates a new member.
   *
   * @param {string} listId - The list ID
   * @param {object} memberData - Member data including email, status, merge_fields, tags, etc.
   */
  async addOrUpdateMember(listId, memberData) {
    if (!listId) throw new Error('listId is required');
    if (!memberData.email_address) throw new Error('email_address is required');

    const emailHash = this._getEmailHash(memberData.email_address);
    const path = `/lists/${encodeURIComponent(listId)}/members/${emailHash}`;

    // Set default status if not provided
    if (!memberData.status) {
      memberData.status = 'subscribed'; // or 'pending' for double opt-in
    }

    try {
      const res = await this.client.put(path, memberData, {
        validateStatus: () => true,
      });

      if (res.status >= 400) {
        const errorDetail = res.data?.detail || res.data?.title || 'Unknown error';
        throw new Error(`Mailchimp member operation failed: ${errorDetail}`);
      }

      return res.data;
    } catch (error) {
      logger.error('Mailchimp addOrUpdateMember failed', {
        listId,
        email: memberData.email_address,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Subscribe a member to a list
   */
  async subscribeMember(listId, email, mergeFields = {}, tags = []) {
    const memberData = {
      email_address: email,
      status: 'subscribed',
    };

    if (Object.keys(mergeFields).length > 0) {
      memberData.merge_fields = mergeFields;
    }

    if (tags.length > 0) {
      memberData.tags = tags.map(tag => (typeof tag === 'string' ? tag : tag.name));
    }

    return this.addOrUpdateMember(listId, memberData);
  }

  /**
   * Unsubscribe a member from a list
   */
  async unsubscribeMember(listId, email) {
    if (!listId) throw new Error('listId is required');
    if (!email) throw new Error('email is required');

    const emailHash = this._getEmailHash(email);
    const path = `/lists/${encodeURIComponent(listId)}/members/${emailHash}`;

    const res = await this.client.patch(
      path,
      { status: 'unsubscribed' },
      { validateStatus: () => true }
    );

    if (res.status >= 400) {
      throw new Error(`Mailchimp unsubscribe failed: ${res.data?.detail || res.status}`);
    }

    return res.data;
  }

  /**
   * Get member information
   */
  async getMember(listId, email) {
    if (!listId) throw new Error('listId is required');
    if (!email) throw new Error('email is required');

    const emailHash = this._getEmailHash(email);
    const path = `/lists/${encodeURIComponent(listId)}/members/${emailHash}`;

    try {
      const res = await this.client.get(path, { validateStatus: () => true });

      if (res.status === 404) {
        return null; // Member not found
      }

      if (res.status >= 400) {
        throw new Error(`Mailchimp getMember failed: ${res.data?.detail || res.status}`);
      }

      return res.data;
    } catch (error) {
      logger.error('Mailchimp getMember failed', { listId, email, error: error.message });
      throw error;
    }
  }

  /**
   * Add or update tags for a member
   */
  async updateMemberTags(listId, email, tags = [], isActive = true) {
    if (!listId) throw new Error('listId is required');
    if (!email) throw new Error('email is required');

    const emailHash = this._getEmailHash(email);
    const path = `/lists/${encodeURIComponent(listId)}/members/${emailHash}/tags`;

    // Format tags for API
    const formattedTags = tags.map(tag => ({
      name: typeof tag === 'string' ? tag : tag.name,
      status: isActive ? 'active' : 'inactive',
    }));

    const res = await this.client.post(
      path,
      { tags: formattedTags },
      { validateStatus: () => true }
    );

    if (res.status >= 400) {
      throw new Error(`Mailchimp tag update failed: ${res.data?.detail || res.status}`);
    }

    return res.data;
  }

  /**
   * Add tags to a member (convenience method)
   */
  async addMemberTags(listId, email, tags) {
    return this.updateMemberTags(listId, email, tags, true);
  }

  /**
   * Remove tags from a member (convenience method)
   */
  async removeMemberTags(listId, email, tags) {
    return this.updateMemberTags(listId, email, tags, false);
  }

  /**
   * Update merge fields for a member
   */
  async updateMemberFields(listId, email, mergeFields) {
    if (!listId) throw new Error('listId is required');
    if (!email) throw new Error('email is required');
    if (!mergeFields || Object.keys(mergeFields).length === 0) {
      throw new Error('mergeFields is required');
    }

    const emailHash = this._getEmailHash(email);
    const path = `/lists/${encodeURIComponent(listId)}/members/${emailHash}`;

    const res = await this.client.patch(
      path,
      { merge_fields: mergeFields },
      { validateStatus: () => true }
    );

    if (res.status >= 400) {
      throw new Error(`Mailchimp field update failed: ${res.data?.detail || res.status}`);
    }

    return res.data;
  }

  /**
   * Delete a member permanently from a list
   */
  async deleteMember(listId, email) {
    if (!listId) throw new Error('listId is required');
    if (!email) throw new Error('email is required');

    const emailHash = this._getEmailHash(email);
    const path = `/lists/${encodeURIComponent(listId)}/members/${emailHash}`;

    const res = await this.client.delete(path, { validateStatus: () => true });

    if (res.status >= 400) {
      throw new Error(`Mailchimp delete member failed: ${res.data?.detail || res.status}`);
    }

    return { success: true };
  }

  /**
   * Search for members in a list
   */
  async searchMembers(listId, query, { count = 100, offset = 0 } = {}) {
    if (!listId) throw new Error('listId is required');

    const res = await this.client.get(`/lists/${encodeURIComponent(listId)}/members`, {
      params: { count, offset },
    });

    // Simple filtering if query is provided
    let members = res.data.members || [];
    if (query) {
      const lowerQuery = query.toLowerCase();
      members = members.filter(
        m =>
          m.email_address?.toLowerCase().includes(lowerQuery) ||
          m.merge_fields?.FNAME?.toLowerCase().includes(lowerQuery) ||
          m.merge_fields?.LNAME?.toLowerCase().includes(lowerQuery)
      );
    }

    return {
      members,
      total_items: res.data.total_items,
    };
  }

  /**
   * Get member activity (recent actions)
   */
  async getMemberActivity(listId, email) {
    if (!listId) throw new Error('listId is required');
    if (!email) throw new Error('email is required');

    const emailHash = this._getEmailHash(email);
    const path = `/lists/${encodeURIComponent(listId)}/members/${emailHash}/activity`;

    const res = await this.client.get(path, { validateStatus: () => true });

    if (res.status >= 400) {
      throw new Error(`Mailchimp get activity failed: ${res.data?.detail || res.status}`);
    }

    return res.data;
  }
}

module.exports = MailchimpService;

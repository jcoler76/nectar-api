const axios = require('axios');
const { logger } = require('../../utils/logger');
const { encrypt, decrypt } = require('../../utils/encryption');

class ZoomInfoService {
  constructor() {
    this.baseURL = 'https://api.zoominfo.com';
    this.rateLimiter = {
      requests: 0,
      resetTime: Date.now() + 60000, // Reset every minute
      maxRequests: 1500, // ZoomInfo's rate limit
    };
  }

  /**
   * Authenticate with ZoomInfo API
   * @param {Object} credentials - Authentication credentials
   * @param {string} credentials.type - 'apikey', 'username_password', or 'pki'
   * @param {string} credentials.apiKey - API Key (for apikey type)
   * @param {string} credentials.username - Username (for username_password type)
   * @param {string} credentials.password - Password (for username_password type)
   * @param {string} credentials.privateKey - Private Key (for pki type)
   * @param {string} credentials.clientId - Client ID (for pki type)
   * @returns {Promise<string>} JWT token
   */
  async authenticate(credentials) {
    try {
      await this.checkRateLimit();

      let authData;
      let endpoint;

      switch (credentials.type) {
        case 'apikey':
          endpoint = '/authenticate/apikey';
          authData = {
            api_key: credentials.apiKey,
          };
          break;

        case 'username_password':
          endpoint = '/authenticate/jwt';
          authData = {
            username: credentials.username,
            password: credentials.password,
          };
          break;

        case 'pki':
          endpoint = '/authenticate/pki';
          authData = {
            private_key: credentials.privateKey,
            client_id: credentials.clientId,
          };
          break;

        default:
          throw new Error(`Unsupported authentication type: ${credentials.type}`);
      }

      const response = await axios.post(`${this.baseURL}${endpoint}`, authData, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'MirabelAPI/1.0',
        },
        timeout: 30000,
      });

      if (response.data && response.data.jwt) {
        logger.info('ZoomInfo authentication successful');
        return response.data.jwt;
      }

      throw new Error('Authentication failed: No JWT token received');
    } catch (error) {
      logger.error('ZoomInfo authentication failed:', error.message);
      throw new Error(`ZoomInfo authentication failed: ${error.message}`);
    }
  }

  /**
   * Search for companies with intent signals
   * @param {string} token - JWT authentication token
   * @param {Object} filters - Search filters
   * @returns {Promise<Array>} Array of companies with intent data
   */
  async getIntentSignals(token, filters = {}) {
    try {
      await this.checkRateLimit();

      const params = {
        intent_topics: filters.intentTopics || [],
        signal_strength: filters.signalStrength || 'moderate',
        company_size: filters.companySize || '',
        industry: filters.industry || '',
        location: filters.location || '',
        technology_stack: filters.technologyStack || [],
        limit: filters.limit || 50,
        offset: filters.offset || 0,
      };

      const response = await axios.post(`${this.baseURL}/intent/search`, params, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'MirabelAPI/1.0',
        },
        timeout: 30000,
      });

      if (response.data && response.data.data) {
        logger.info(`Retrieved ${response.data.data.length} intent signals from ZoomInfo`);
        return response.data.data;
      }

      return [];
    } catch (error) {
      logger.error('Failed to retrieve intent signals:', error.message);
      throw new Error(`Failed to retrieve intent signals: ${error.message}`);
    }
  }

  /**
   * Get company profile by domain or company ID
   * @param {string} token - JWT authentication token
   * @param {Object} searchParams - Company identifier
   * @returns {Promise<Object>} Company profile data
   */
  async getCompanyProfile(token, searchParams) {
    try {
      await this.checkRateLimit();

      const endpoint = searchParams.companyId
        ? `/company/${searchParams.companyId}`
        : `/company/search`;

      const params = searchParams.companyId
        ? {}
        : {
            domain: searchParams.domain,
            name: searchParams.name,
          };

      const response = await axios.get(`${this.baseURL}${endpoint}`, {
        params,
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent': 'MirabelAPI/1.0',
        },
        timeout: 30000,
      });

      if (response.data) {
        logger.info(
          `Retrieved company profile for ${searchParams.domain || searchParams.companyId}`
        );
        return response.data;
      }

      return null;
    } catch (error) {
      logger.error('Failed to retrieve company profile:', error.message);
      throw new Error(`Failed to retrieve company profile: ${error.message}`);
    }
  }

  /**
   * Search for contacts within a company
   * @param {string} token - JWT authentication token
   * @param {Object} searchParams - Contact search parameters
   * @returns {Promise<Array>} Array of contact data
   */
  async searchContacts(token, searchParams) {
    try {
      await this.checkRateLimit();

      const params = {
        company_domain: searchParams.companyDomain,
        company_id: searchParams.companyId,
        job_title: searchParams.jobTitle,
        seniority: searchParams.seniority,
        department: searchParams.department,
        location: searchParams.location,
        limit: searchParams.limit || 25,
        offset: searchParams.offset || 0,
      };

      const response = await axios.post(`${this.baseURL}/contact/search`, params, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'MirabelAPI/1.0',
        },
        timeout: 30000,
      });

      if (response.data && response.data.data) {
        logger.info(`Retrieved ${response.data.data.length} contacts from ZoomInfo`);
        return response.data.data;
      }

      return [];
    } catch (error) {
      logger.error('Failed to search contacts:', error.message);
      throw new Error(`Failed to search contacts: ${error.message}`);
    }
  }

  /**
   * Enrich contact data
   * @param {string} token - JWT authentication token
   * @param {Array} contacts - Array of contact identifiers
   * @returns {Promise<Array>} Array of enriched contact data
   */
  async enrichContacts(token, contacts) {
    try {
      await this.checkRateLimit();

      const params = {
        contacts: contacts.slice(0, 25), // ZoomInfo limit of 25 per request
      };

      const response = await axios.post(`${this.baseURL}/contact/enrich`, params, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'MirabelAPI/1.0',
        },
        timeout: 30000,
      });

      if (response.data && response.data.data) {
        logger.info(`Enriched ${response.data.data.length} contacts`);
        return response.data.data;
      }

      return [];
    } catch (error) {
      logger.error('Failed to enrich contacts:', error.message);
      throw new Error(`Failed to enrich contacts: ${error.message}`);
    }
  }

  /**
   * Get company technology stack
   * @param {string} token - JWT authentication token
   * @param {string} companyId - Company identifier
   * @returns {Promise<Object>} Technology stack data
   */
  async getTechnologyStack(token, companyId) {
    try {
      await this.checkRateLimit();

      const response = await axios.get(`${this.baseURL}/company/${companyId}/technologies`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent': 'MirabelAPI/1.0',
        },
        timeout: 30000,
      });

      if (response.data) {
        logger.info(`Retrieved technology stack for company ${companyId}`);
        return response.data;
      }

      return null;
    } catch (error) {
      logger.error('Failed to retrieve technology stack:', error.message);
      throw new Error(`Failed to retrieve technology stack: ${error.message}`);
    }
  }

  /**
   * Get company news and events
   * @param {string} token - JWT authentication token
   * @param {string} companyId - Company identifier
   * @returns {Promise<Array>} Array of news/events
   */
  async getCompanyNews(token, companyId) {
    try {
      await this.checkRateLimit();

      const response = await axios.get(`${this.baseURL}/company/${companyId}/news`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent': 'MirabelAPI/1.0',
        },
        timeout: 30000,
      });

      if (response.data && response.data.data) {
        logger.info(`Retrieved ${response.data.data.length} news items for company ${companyId}`);
        return response.data.data;
      }

      return [];
    } catch (error) {
      logger.error('Failed to retrieve company news:', error.message);
      throw new Error(`Failed to retrieve company news: ${error.message}`);
    }
  }

  /**
   * Check rate limiting and enforce limits
   */
  async checkRateLimit() {
    const now = Date.now();

    // Reset counter if time window has passed
    if (now > this.rateLimiter.resetTime) {
      this.rateLimiter.requests = 0;
      this.rateLimiter.resetTime = now + 60000;
    }

    // Check if we've exceeded the rate limit
    if (this.rateLimiter.requests >= this.rateLimiter.maxRequests) {
      const waitTime = this.rateLimiter.resetTime - now;
      logger.warn(`ZoomInfo rate limit reached. Waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.rateLimiter.requests = 0;
      this.rateLimiter.resetTime = Date.now() + 60000;
    }

    this.rateLimiter.requests++;
  }

  /**
   * Store encrypted credentials
   * @param {Object} credentials - Credentials to store
   * @returns {Object} Encrypted credentials
   */
  encryptCredentials(credentials) {
    const encryptedCredentials = {};

    for (const [key, value] of Object.entries(credentials)) {
      if (['apiKey', 'password', 'privateKey'].includes(key) && value) {
        encryptedCredentials[key] = encrypt(value);
      } else {
        encryptedCredentials[key] = value;
      }
    }

    return encryptedCredentials;
  }

  /**
   * Decrypt stored credentials
   * @param {Object} encryptedCredentials - Encrypted credentials
   * @returns {Object} Decrypted credentials
   */
  decryptCredentials(encryptedCredentials) {
    const credentials = {};

    for (const [key, value] of Object.entries(encryptedCredentials)) {
      if (['apiKey', 'password', 'privateKey'].includes(key) && value) {
        credentials[key] = decrypt(value);
      } else {
        credentials[key] = value;
      }
    }

    return credentials;
  }

  /**
   * Test connection with provided credentials
   * @param {Object} credentials - Authentication credentials
   * @returns {Promise<boolean>} True if connection successful
   */
  async testConnection(credentials) {
    try {
      const token = await this.authenticate(credentials);

      // Try a simple API call to verify the token works
      await this.checkRateLimit();

      const response = await axios.get(`${this.baseURL}/user/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent': 'MirabelAPI/1.0',
        },
        timeout: 10000,
      });

      return response.status === 200;
    } catch (error) {
      logger.error('ZoomInfo connection test failed:', error.message);
      return false;
    }
  }

  /**
   * Get API usage and credit information
   * @param {string} token - JWT authentication token
   * @returns {Promise<Object>} Usage statistics
   */
  async getUsageStats(token) {
    try {
      await this.checkRateLimit();

      const response = await axios.get(`${this.baseURL}/user/usage`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent': 'MirabelAPI/1.0',
        },
        timeout: 10000,
      });

      if (response.data) {
        return {
          creditsUsed: response.data.credits_used || 0,
          creditsRemaining: response.data.credits_remaining || 0,
          requestsThisMonth: response.data.requests_this_month || 0,
          planType: response.data.plan_type || 'unknown',
        };
      }

      return null;
    } catch (error) {
      logger.error('Failed to retrieve usage stats:', error.message);
      throw new Error(`Failed to retrieve usage stats: ${error.message}`);
    }
  }
}

module.exports = ZoomInfoService;

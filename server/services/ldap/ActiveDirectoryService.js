const ldap = require('ldapjs');
const { logger } = require('../../utils/logger');

/**
 * Active Directory Service
 * Provides integration with Microsoft Active Directory for authentication and user management
 */
class ActiveDirectoryService {
  constructor(config = {}) {
    this.config = {
      url: config.url || 'ldap://localhost:389',
      baseDN: config.baseDN || 'dc=example,dc=com',
      bindDN: config.bindDN || null,
      bindPassword: config.bindPassword || null,
      userSearchBase: config.userSearchBase || 'ou=Users',
      groupSearchBase: config.groupSearchBase || 'ou=Groups',
      userObjectClass: config.userObjectClass || 'user',
      groupObjectClass: config.groupObjectClass || 'group',
      usernameAttribute: config.usernameAttribute || 'sAMAccountName',
      emailAttribute: config.emailAttribute || 'mail',
      displayNameAttribute: config.displayNameAttribute || 'displayName',
      memberAttribute: config.memberAttribute || 'member',
      memberOfAttribute: config.memberOfAttribute || 'memberOf',
      timeout: config.timeout || 30000,
      connectTimeout: config.connectTimeout || 10000,
      reconnect: config.reconnect !== false,
      idleTimeout: config.idleTimeout || 60000,
      tlsOptions: config.tlsOptions || null,
      ...config,
    };

    this.client = null;
    this.isConnected = false;
    this.connectionPool = [];
    this.maxPoolSize = config.maxPoolSize || 5;
    this.userCache = new Map();
    this.groupCache = new Map();
    this.cacheTimeout = config.cacheTimeout || 300000; // 5 minutes
  }

  /**
   * Create LDAP client connection
   */
  createClient() {
    const clientOptions = {
      url: this.config.url,
      timeout: this.config.timeout,
      connectTimeout: this.config.connectTimeout,
      idleTimeout: this.config.idleTimeout,
      reconnect: this.config.reconnect,
    };

    if (this.config.tlsOptions) {
      clientOptions.tlsOptions = this.config.tlsOptions;
    }

    return ldap.createClient(clientOptions);
  }

  /**
   * Connect to Active Directory
   */
  async connect() {
    if (this.isConnected && this.client) {
      return this.client;
    }

    try {
      this.client = this.createClient();

      // Set up event handlers
      this.client.on('error', err => {
        logger.error('LDAP client error:', err.message);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.debug('LDAP client connected');
        this.isConnected = true;
      });

      this.client.on('connectTimeout', () => {
        logger.warn('LDAP connection timeout');
        this.isConnected = false;
      });

      this.client.on('disconnect', () => {
        logger.debug('LDAP client disconnected');
        this.isConnected = false;
      });

      // Bind with service account if provided
      if (this.config.bindDN && this.config.bindPassword) {
        await this.bind(this.config.bindDN, this.config.bindPassword);
      }

      logger.info('Active Directory connection established', {
        url: this.config.url,
        baseDN: this.config.baseDN,
      });

      return this.client;
    } catch (error) {
      logger.error('Active Directory connection failed:', error.message);
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Bind to LDAP with credentials
   */
  async bind(dn, password) {
    return new Promise((resolve, reject) => {
      this.client.bind(dn, password, err => {
        if (err) {
          logger.error('LDAP bind failed:', err.message);
          reject(err);
        } else {
          logger.debug('LDAP bind successful', { dn });
          resolve();
        }
      });
    });
  }

  /**
   * Authenticate user against Active Directory
   */
  async authenticateUser(username, password) {
    try {
      await this.connect();

      // Find user DN
      const user = await this.findUser(username);
      if (!user) {
        return {
          success: false,
          message: 'User not found',
          user: null,
        };
      }

      // Try to bind with user credentials
      const userClient = this.createClient();

      try {
        await new Promise((resolve, reject) => {
          userClient.bind(user.dn, password, err => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        });

        userClient.unbind();

        // Get user details and groups
        const userDetails = await this.getUserDetails(username);
        const userGroups = await this.getUserGroups(user.dn);

        logger.info('User authentication successful', {
          username,
          dn: user.dn,
          groups: userGroups.length,
        });

        return {
          success: true,
          message: 'Authentication successful',
          user: {
            ...userDetails,
            groups: userGroups,
          },
        };
      } catch (bindError) {
        logger.warn('User authentication failed', {
          username,
          error: bindError.message,
        });

        return {
          success: false,
          message: 'Invalid credentials',
          user: null,
        };
      }
    } catch (error) {
      logger.error('Authentication error:', error.message);
      return {
        success: false,
        message: 'Authentication service error',
        user: null,
        error: error.message,
      };
    }
  }

  /**
   * Find user by username
   */
  async findUser(username) {
    const cacheKey = `user:${username}`;
    const cached = this.getCachedResult(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const searchBase = `${this.config.userSearchBase},${this.config.baseDN}`;
      const filter = `(&(objectClass=${this.config.userObjectClass})(${this.config.usernameAttribute}=${username}))`;

      const results = await this.search(searchBase, {
        filter,
        scope: 'sub',
        attributes: [
          'dn',
          this.config.usernameAttribute,
          this.config.emailAttribute,
          this.config.displayNameAttribute,
          'objectClass',
          'whenCreated',
          'whenChanged',
        ],
      });

      if (results.length === 0) {
        return null;
      }

      const user = results[0];
      this.setCachedResult(cacheKey, user);
      return user;
    } catch (error) {
      logger.error('User search failed:', error.message);
      throw error;
    }
  }

  /**
   * Get detailed user information
   */
  async getUserDetails(username) {
    const cacheKey = `userDetails:${username}`;
    const cached = this.getCachedResult(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const searchBase = `${this.config.userSearchBase},${this.config.baseDN}`;
      const filter = `(&(objectClass=${this.config.userObjectClass})(${this.config.usernameAttribute}=${username}))`;

      const results = await this.search(searchBase, {
        filter,
        scope: 'sub',
        attributes: [
          'dn',
          this.config.usernameAttribute,
          this.config.emailAttribute,
          this.config.displayNameAttribute,
          'givenName',
          'sn',
          'title',
          'department',
          'company',
          'telephoneNumber',
          'mobile',
          'manager',
          'directReports',
          'whenCreated',
          'whenChanged',
          'lastLogon',
          'logonCount',
          'userAccountControl',
          this.config.memberOfAttribute,
        ],
      });

      if (results.length === 0) {
        return null;
      }

      const user = this.formatUserDetails(results[0]);
      this.setCachedResult(cacheKey, user);
      return user;
    } catch (error) {
      logger.error('Get user details failed:', error.message);
      throw error;
    }
  }

  /**
   * Format user details from LDAP result
   */
  formatUserDetails(ldapUser) {
    return {
      dn: ldapUser.dn,
      username: ldapUser[this.config.usernameAttribute],
      email: ldapUser[this.config.emailAttribute],
      displayName: ldapUser[this.config.displayNameAttribute],
      firstName: ldapUser.givenName,
      lastName: ldapUser.sn,
      title: ldapUser.title,
      department: ldapUser.department,
      company: ldapUser.company,
      phone: ldapUser.telephoneNumber,
      mobile: ldapUser.mobile,
      manager: ldapUser.manager,
      directReports: Array.isArray(ldapUser.directReports) ? ldapUser.directReports : [],
      whenCreated: ldapUser.whenCreated,
      whenChanged: ldapUser.whenChanged,
      lastLogon: ldapUser.lastLogon,
      logonCount: ldapUser.logonCount,
      enabled: this.isUserEnabled(ldapUser.userAccountControl),
      groups: Array.isArray(ldapUser[this.config.memberOfAttribute])
        ? ldapUser[this.config.memberOfAttribute]
        : [],
    };
  }

  /**
   * Check if user account is enabled
   */
  isUserEnabled(userAccountControl) {
    if (!userAccountControl) return true;
    const uac = parseInt(userAccountControl, 10);
    // Bit 1 (0x0002) indicates account is disabled
    return (uac & 0x0002) === 0;
  }

  /**
   * Get user groups
   */
  async getUserGroups(userDN) {
    const cacheKey = `userGroups:${userDN}`;
    const cached = this.getCachedResult(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const searchBase = this.config.baseDN;
      const filter = `(&(objectClass=${this.config.groupObjectClass})(${this.config.memberAttribute}=${userDN}))`;

      const results = await this.search(searchBase, {
        filter,
        scope: 'sub',
        attributes: ['dn', 'cn', 'displayName', 'description', 'groupType', 'managedBy'],
      });

      const groups = results.map(group => ({
        dn: group.dn,
        name: group.cn,
        displayName: group.displayName || group.cn,
        description: group.description,
        type: group.groupType,
        managedBy: group.managedBy,
      }));

      this.setCachedResult(cacheKey, groups);
      return groups;
    } catch (error) {
      logger.error('Get user groups failed:', error.message);
      return [];
    }
  }

  /**
   * Find group by name
   */
  async findGroup(groupName) {
    const cacheKey = `group:${groupName}`;
    const cached = this.getCachedResult(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const searchBase = `${this.config.groupSearchBase},${this.config.baseDN}`;
      const filter = `(&(objectClass=${this.config.groupObjectClass})(cn=${groupName}))`;

      const results = await this.search(searchBase, {
        filter,
        scope: 'sub',
        attributes: [
          'dn',
          'cn',
          'displayName',
          'description',
          'groupType',
          'managedBy',
          this.config.memberAttribute,
        ],
      });

      if (results.length === 0) {
        return null;
      }

      const group = results[0];
      this.setCachedResult(cacheKey, group);
      return group;
    } catch (error) {
      logger.error('Group search failed:', error.message);
      throw error;
    }
  }

  /**
   * Get group members
   */
  async getGroupMembers(groupName) {
    try {
      const group = await this.findGroup(groupName);
      if (!group) {
        return [];
      }

      const members = Array.isArray(group[this.config.memberAttribute])
        ? group[this.config.memberAttribute]
        : [];

      const memberDetails = [];
      for (const memberDN of members) {
        try {
          const memberResult = await this.search(memberDN, {
            scope: 'base',
            attributes: [
              this.config.usernameAttribute,
              this.config.emailAttribute,
              this.config.displayNameAttribute,
              'objectClass',
            ],
          });

          if (memberResult.length > 0) {
            memberDetails.push({
              dn: memberDN,
              username: memberResult[0][this.config.usernameAttribute],
              email: memberResult[0][this.config.emailAttribute],
              displayName: memberResult[0][this.config.displayNameAttribute],
              isUser: memberResult[0].objectClass.includes(this.config.userObjectClass),
              isGroup: memberResult[0].objectClass.includes(this.config.groupObjectClass),
            });
          }
        } catch (memberError) {
          logger.warn('Failed to get member details:', {
            memberDN,
            error: memberError.message,
          });
        }
      }

      return memberDetails;
    } catch (error) {
      logger.error('Get group members failed:', error.message);
      throw error;
    }
  }

  /**
   * Search LDAP directory
   */
  async search(base, options = {}) {
    if (!this.client || !this.isConnected) {
      await this.connect();
    }

    return new Promise((resolve, reject) => {
      const results = [];

      this.client.search(base, options, (err, res) => {
        if (err) {
          reject(err);
          return;
        }

        res.on('searchEntry', entry => {
          const obj = { dn: entry.dn };
          entry.attributes.forEach(attr => {
            obj[attr.type] = attr.vals.length === 1 ? attr.vals[0] : attr.vals;
          });
          results.push(obj);
        });

        res.on('error', error => {
          reject(error);
        });

        res.on('end', result => {
          if (result.status !== 0) {
            reject(new Error(`LDAP search failed with status: ${result.status}`));
          } else {
            resolve(results);
          }
        });
      });
    });
  }

  /**
   * Test Active Directory connection
   */
  async testConnection() {
    try {
      await this.connect();

      // Try a simple search to verify connectivity
      const results = await this.search(this.config.baseDN, {
        filter: '(objectClass=*)',
        scope: 'base',
        attributes: ['dn'],
      });

      return {
        success: true,
        message: 'Active Directory connection successful',
        details: {
          url: this.config.url,
          baseDN: this.config.baseDN,
          connected: this.isConnected,
          searchResult: results.length > 0,
        },
      };
    } catch (error) {
      logger.error('Active Directory connection test failed:', error.message);
      return {
        success: false,
        error: error.message,
        details: {
          url: this.config.url,
          baseDN: this.config.baseDN,
          connected: this.isConnected,
        },
      };
    }
  }

  /**
   * Synchronize users from Active Directory
   */
  async synchronizeUsers(options = {}) {
    try {
      const searchBase = `${this.config.userSearchBase},${this.config.baseDN}`;
      const filter = options.filter || `(objectClass=${this.config.userObjectClass})`;
      const limit = options.limit || 1000;

      const results = await this.search(searchBase, {
        filter,
        scope: 'sub',
        sizeLimit: limit,
        attributes: [
          'dn',
          this.config.usernameAttribute,
          this.config.emailAttribute,
          this.config.displayNameAttribute,
          'givenName',
          'sn',
          'title',
          'department',
          'company',
          'whenCreated',
          'whenChanged',
          'userAccountControl',
        ],
      });

      const users = results.map(user => this.formatUserDetails(user));

      logger.info('User synchronization completed', {
        totalUsers: users.length,
        enabledUsers: users.filter(u => u.enabled).length,
        disabledUsers: users.filter(u => !u.enabled).length,
      });

      return {
        success: true,
        users,
        statistics: {
          total: users.length,
          enabled: users.filter(u => u.enabled).length,
          disabled: users.filter(u => !u.enabled).length,
        },
      };
    } catch (error) {
      logger.error('User synchronization failed:', error.message);
      throw error;
    }
  }

  /**
   * Synchronize groups from Active Directory
   */
  async synchronizeGroups(options = {}) {
    try {
      const searchBase = `${this.config.groupSearchBase},${this.config.baseDN}`;
      const filter = options.filter || `(objectClass=${this.config.groupObjectClass})`;
      const limit = options.limit || 1000;

      const results = await this.search(searchBase, {
        filter,
        scope: 'sub',
        sizeLimit: limit,
        attributes: [
          'dn',
          'cn',
          'displayName',
          'description',
          'groupType',
          'managedBy',
          this.config.memberAttribute,
        ],
      });

      const groups = results.map(group => ({
        dn: group.dn,
        name: group.cn,
        displayName: group.displayName || group.cn,
        description: group.description,
        type: group.groupType,
        managedBy: group.managedBy,
        memberCount: Array.isArray(group[this.config.memberAttribute])
          ? group[this.config.memberAttribute].length
          : 0,
      }));

      logger.info('Group synchronization completed', {
        totalGroups: groups.length,
      });

      return {
        success: true,
        groups,
        statistics: {
          total: groups.length,
        },
      };
    } catch (error) {
      logger.error('Group synchronization failed:', error.message);
      throw error;
    }
  }

  /**
   * Check if user is member of group
   */
  async isUserMemberOfGroup(username, groupName) {
    try {
      const user = await this.findUser(username);
      if (!user) {
        return false;
      }

      const userGroups = await this.getUserGroups(user.dn);
      return userGroups.some(group => group.name.toLowerCase() === groupName.toLowerCase());
    } catch (error) {
      logger.error('Group membership check failed:', error.message);
      return false;
    }
  }

  /**
   * Get cached result
   */
  getCachedResult(key) {
    const cached = this.userCache.get(key) || this.groupCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  /**
   * Set cached result
   */
  setCachedResult(key, data) {
    const cache = key.startsWith('group') ? this.groupCache : this.userCache;
    cache.set(key, {
      data,
      timestamp: Date.now(),
    });

    // Clean up old cache entries
    if (cache.size > 1000) {
      const oldestKey = cache.keys().next().value;
      cache.delete(oldestKey);
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.userCache.clear();
    this.groupCache.clear();
    logger.debug('Active Directory cache cleared');
  }

  /**
   * Disconnect from Active Directory
   */
  async disconnect() {
    try {
      if (this.client) {
        this.client.unbind();
        this.client = null;
        this.isConnected = false;
      }

      // Clear connection pool
      for (const client of this.connectionPool) {
        try {
          client.unbind();
        } catch (error) {
          // Ignore errors during cleanup
        }
      }
      this.connectionPool = [];

      logger.debug('Active Directory disconnected');
    } catch (error) {
      logger.warn('Error during Active Directory disconnect:', error.message);
    }
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      connected: this.isConnected,
      config: {
        url: this.config.url,
        baseDN: this.config.baseDN,
        userSearchBase: this.config.userSearchBase,
        groupSearchBase: this.config.groupSearchBase,
      },
      cache: {
        userCacheSize: this.userCache.size,
        groupCacheSize: this.groupCache.size,
        cacheTimeout: this.cacheTimeout,
      },
      connectionPool: {
        size: this.connectionPool.length,
        maxSize: this.maxPoolSize,
      },
    };
  }

  /**
   * Get service information
   */
  static getServiceInfo() {
    return {
      type: 'ACTIVE_DIRECTORY',
      name: 'Active Directory',
      description: 'Microsoft Active Directory integration service',
      features: [
        'User authentication',
        'User and group synchronization',
        'Group membership management',
        'LDAP search capabilities',
        'Connection pooling',
        'Result caching',
        'Enterprise integration',
      ],
      category: 'ldap',
    };
  }

  /**
   * Get configuration validation rules
   */
  static getConfigurationValidation() {
    return {
      url: {
        required: true,
        type: 'string',
        description: 'LDAP server URL (e.g., ldap://domain.com:389)',
      },
      baseDN: {
        required: true,
        type: 'string',
        description: 'Base Distinguished Name (e.g., dc=company,dc=com)',
      },
      bindDN: {
        required: false,
        type: 'string',
        description: 'Service account DN for binding',
      },
      bindPassword: {
        required: false,
        type: 'string',
        description: 'Service account password',
        sensitive: true,
      },
      userSearchBase: {
        required: false,
        type: 'string',
        description: 'User search base (relative to baseDN)',
        default: 'ou=Users',
      },
      groupSearchBase: {
        required: false,
        type: 'string',
        description: 'Group search base (relative to baseDN)',
        default: 'ou=Groups',
      },
      usernameAttribute: {
        required: false,
        type: 'string',
        description: 'Username attribute name',
        default: 'sAMAccountName',
      },
      emailAttribute: {
        required: false,
        type: 'string',
        description: 'Email attribute name',
        default: 'mail',
      },
      timeout: {
        required: false,
        type: 'number',
        description: 'Connection timeout in milliseconds',
        default: 30000,
      },
      cacheTimeout: {
        required: false,
        type: 'number',
        description: 'Cache timeout in milliseconds',
        default: 300000,
      },
    };
  }
}

module.exports = ActiveDirectoryService;

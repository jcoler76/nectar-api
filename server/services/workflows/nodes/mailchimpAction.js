const { logger } = require('../../../utils/logger');
const MailchimpService = require('../../mailchimp/MailchimpService');

const ALLOWED_OPERATIONS = [
  'subscribe',
  'unsubscribe',
  'updateMember',
  'addTags',
  'removeTags',
  'updateFields',
  'getMember',
  'deleteMember',
];

/**
 * Mailchimp Action Workflow Node
 * Manages subscribers, tags, and audience operations
 *
 * Operations:
 * - subscribe: Add or update a subscriber
 * - unsubscribe: Unsubscribe a member
 * - updateMember: Update member data
 * - addTags: Add tags to a member
 * - removeTags: Remove tags from a member
 * - updateFields: Update merge fields
 * - getMember: Get member information
 * - deleteMember: Permanently delete a member
 */
const execute = async (config, context) => {
  const {
    label,
    connection = {},
    operation = 'subscribe',
    listId,
    email,
    dataMapping = {},
    tags = [],
    status = 'subscribed',
    doubleOptIn = false,
  } = config;

  logger.info(`Executing Mailchimp Action: "${label}" (${operation})`);

  // Validate operation
  if (!ALLOWED_OPERATIONS.includes(operation)) {
    return { status: 'error', error: `Unsupported Mailchimp operation: ${operation}` };
  }

  // Validate required fields
  if (!connection.apiKey) {
    return { status: 'error', error: 'Mailchimp API key is required' };
  }

  if (!listId) {
    return { status: 'error', error: 'List ID is required' };
  }

  // Create Mailchimp service instance
  const mc = new MailchimpService({
    apiKey: connection.apiKey,
    server: connection.server,
    timeout: connection.timeout || 30000,
  });

  // Resolve input data from context
  const input =
    context[context.currentNodeId]?.data ||
    context.input ||
    context.trigger?.data ||
    context.previousNodeData ||
    context;

  // Get email from config or input
  const memberEmail = email || input.email || input.email_address;
  if (!memberEmail && operation !== 'searchMembers') {
    return { status: 'error', error: 'Email address is required' };
  }

  // Map merge fields from input data
  const mergeFields = mapMergeFields(input, dataMapping?.mergeFields || {});

  try {
    let result;

    switch (operation) {
      case 'subscribe': {
        const memberData = {
          email_address: memberEmail,
          status: doubleOptIn ? 'pending' : status || 'subscribed',
        };

        // Add merge fields if provided
        if (Object.keys(mergeFields).length > 0) {
          memberData.merge_fields = mergeFields;
        }

        // Add tags if provided
        if (tags && tags.length > 0) {
          memberData.tags = Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim());
        }

        result = await mc.addOrUpdateMember(listId, memberData);
        break;
      }

      case 'unsubscribe': {
        result = await mc.unsubscribeMember(listId, memberEmail);
        break;
      }

      case 'updateMember': {
        const memberData = {
          email_address: memberEmail,
        };

        // Add merge fields if provided
        if (Object.keys(mergeFields).length > 0) {
          memberData.merge_fields = mergeFields;
        }

        // Add status if provided
        if (config.newStatus) {
          memberData.status = config.newStatus;
        }

        result = await mc.addOrUpdateMember(listId, memberData);
        break;
      }

      case 'addTags': {
        const tagsArray = Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim());
        result = await mc.addMemberTags(listId, memberEmail, tagsArray);
        break;
      }

      case 'removeTags': {
        const tagsArray = Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim());
        result = await mc.removeMemberTags(listId, memberEmail, tagsArray);
        break;
      }

      case 'updateFields': {
        if (Object.keys(mergeFields).length === 0) {
          throw new Error('Merge fields are required for updateFields operation');
        }
        result = await mc.updateMemberFields(listId, memberEmail, mergeFields);
        break;
      }

      case 'getMember': {
        result = await mc.getMember(listId, memberEmail);
        if (!result) {
          return {
            status: 'success',
            found: false,
            message: 'Member not found',
          };
        }
        break;
      }

      case 'deleteMember': {
        result = await mc.deleteMember(listId, memberEmail);
        break;
      }

      default:
        throw new Error(`Operation "${operation}" not implemented`);
    }

    logger.info(`Mailchimp Action "${label}" completed successfully`, {
      operation,
      email: memberEmail,
    });

    return {
      status: 'success',
      operation,
      email: memberEmail,
      listId,
      data: result,
    };
  } catch (error) {
    logger.error(`Mailchimp Action "${label}" failed`, {
      operation,
      email: memberEmail,
      error: error.message,
    });

    return {
      status: 'error',
      operation,
      email: memberEmail,
      error: error.message,
    };
  }
};

/**
 * Map merge fields from input data
 * @param {object} input - Input data from context
 * @param {object} mapping - Field mapping configuration
 * @returns {object} Mapped merge fields
 */
function mapMergeFields(input, mapping) {
  const mergeFields = {};

  // If mapping is provided, use it
  if (mapping && Object.keys(mapping).length > 0) {
    for (const [mailchimpField, sourcePath] of Object.entries(mapping)) {
      // Skip empty mappings
      if (!sourcePath) continue;

      // Handle simple field names and nested paths
      const value = resolvePath(input, sourcePath);
      if (value !== undefined && value !== null) {
        mergeFields[mailchimpField] = value;
      }
    }
  } else {
    // Auto-map common fields if no mapping provided
    if (input.firstName || input.first_name) {
      mergeFields.FNAME = input.firstName || input.first_name;
    }
    if (input.lastName || input.last_name) {
      mergeFields.LNAME = input.lastName || input.last_name;
    }
    if (input.phone) {
      mergeFields.PHONE = input.phone;
    }
    if (input.address) {
      mergeFields.ADDRESS = input.address;
    }
    if (input.birthday) {
      mergeFields.BIRTHDAY = input.birthday;
    }
  }

  return mergeFields;
}

/**
 * Resolve nested path in object (e.g., "user.profile.name")
 * @param {object} obj - Source object
 * @param {string} path - Dot-notation path
 * @returns {*} Resolved value
 */
function resolvePath(obj, path) {
  if (!path || typeof path !== 'string') return undefined;

  // Handle variable syntax like {{variable.path}}
  const cleanPath = path.replace(/^\{\{/, '').replace(/\}\}$/, '').trim();

  const parts = cleanPath.split('.');
  let current = obj;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }

  return current;
}

module.exports = { execute };

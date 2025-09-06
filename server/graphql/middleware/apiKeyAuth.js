const Application = require('../../models/Application');
const Service = require('../../models/Service');
const Role = require('../../models/Role');
const Endpoint = require('../../models/Endpoint');

const getApiKeyUser = async req => {
  try {
    // Check for API key in headers (support legacy and current headers)
    const apiKey =
      req.headers['x-mirabel-api-key'] ||
      req.headers['x-dreamfactory-api-key'] ||
      req.headers['x-api-key'];

    if (!apiKey) return null;

    // OPTION 1: Check if it's a CLIENT API KEY (Application-based)
    const application = await Application.findOne({
      apiKey: apiKey,
      isActive: true,
    }).populate({
      path: 'defaultRole',
      populate: {
        path: 'permissions',
      },
    });

    if (
      application &&
      application.isActive &&
      application.defaultRole &&
      application.defaultRole.isActive
    ) {
      // Return CLIENT API key context
      return {
        type: 'client',
        applicationId: application._id.toString(),
        application: application,
        role: application.defaultRole,
        permissions: application.defaultRole.permissions,
        // Client API keys are restricted to their specific services/databases
        clientIsolation: true,
      };
    }

    // OPTION 2: Check if it's a DEVELOPER ENDPOINT KEY (Endpoint-based)
    const endpoint = await Endpoint.findOne({
      apiKey: apiKey,
    }).populate('createdBy');

    if (endpoint) {
      // Return DEVELOPER API key context
      return {
        type: 'developer',
        endpointId: endpoint._id.toString(),
        endpoint: endpoint,
        createdBy: endpoint.createdBy,
        // Developer endpoints have more flexibility across databases
        clientIsolation: false,
      };
    }

    // OPTION 3: Check if it's an MCP UNIVERSAL KEY
    const mcpUniversalKeys = [
      process.env.MCP_DEVELOPER_KEY,
      process.env.MCP_UNIVERSAL_KEY_1,
      process.env.MCP_UNIVERSAL_KEY_2,
    ].filter(key => key && key.trim());

    if (mcpUniversalKeys.includes(apiKey)) {
      return {
        type: 'mcp_universal',
        apiKey: apiKey,
        // MCP Universal keys have schema discovery capabilities but restricted from production
        clientIsolation: false,
        schemaDiscovery: true,
      };
    }

    return null;
  } catch (error) {
    console.error('GraphQL API Key Auth Error:', error);
    return null;
  }
};

// Helper function to resolve environment and service based on API key type and optional environment parameter
const resolveEnvironmentAndService = async (
  apiKeyUser,
  serviceName = null,
  explicitEnvironment = null
) => {
  if (!apiKeyUser) {
    throw new Error('No valid API key provided');
  }

  // 1. Determine target environment
  let targetEnvironment;

  if (explicitEnvironment) {
    // Security check: MCP Universal keys cannot access production
    if (apiKeyUser.type === 'mcp_universal' && explicitEnvironment === 'production') {
      throw new Error('MCP Universal keys are restricted from production databases');
    }

    // Log when clients use non-production environments (for monitoring)
    if (apiKeyUser.type === 'client' && explicitEnvironment !== 'production') {
      // Client API key testing in explicit environment
    }

    targetEnvironment = explicitEnvironment;
  } else {
    // Apply smart defaults based on API key type
    const defaultEnvironments = {
      client: 'production', // Client applications default to production
      developer: 'staging', // Developer endpoints default to staging
      mcp_universal: 'staging', // MCP Universal keys default to staging
    };
    targetEnvironment = defaultEnvironments[apiKeyUser.type] || 'production';
  }

  // 2. Log the resolution for audit trail
  if (serviceName) {
    // Service resolved to target environment
  }

  return { environment: targetEnvironment, serviceName };
};

// Helper function to check CLIENT permissions (Service/Role based)
const hasClientPermission = (apiKeyUser, serviceName, procedureName, method = 'GET') => {
  if (!apiKeyUser || apiKeyUser.type !== 'client') return false;

  return apiKeyUser.permissions.some(perm => {
    // Check if permission matches service
    const serviceMatches =
      perm.serviceId &&
      (perm.serviceId.name === serviceName ||
        (typeof perm.serviceId === 'object' && perm.serviceId.name === serviceName));

    // Check if permission matches procedure/view
    const procedureMatches =
      perm.objectName === procedureName ||
      perm.objectName === `/proc/${procedureName}` ||
      perm.objectName === `/proc/dbo.${procedureName}` ||
      perm.objectName === `dbo.${procedureName}` ||
      perm.objectName === `/view/${procedureName}` ||
      perm.objectName === `view/${procedureName}`;

    // Check if method is allowed
    const methodAllowed = perm.actions && perm.actions[method];

    return serviceMatches && procedureMatches && methodAllowed;
  });
};

// Helper function to check DEVELOPER permissions (more flexible)
const hasDeveloperPermission = (apiKeyUser, endpointName) => {
  if (!apiKeyUser || apiKeyUser.type !== 'developer') return false;

  // Developer endpoints are validated by endpoint name match
  return apiKeyUser.endpoint.name === endpointName;
};

// Helper function to check MCP Universal permissions
const hasMCPUniversalPermission = (apiKeyUser, environment) => {
  if (!apiKeyUser || apiKeyUser.type !== 'mcp_universal') return false;

  // MCP Universal keys are blocked from production
  if (environment === 'production') {
    return false;
  }

  // Allow schema discovery in non-production environments
  return true;
};

// Enhanced function to get the appropriate service with optional environment support
const getServiceForApiKey = async (apiKeyUser, serviceName = null, explicitEnvironment = null) => {
  if (!apiKeyUser) return null;

  // Resolve environment
  const { environment } = await resolveEnvironmentAndService(
    apiKeyUser,
    serviceName,
    explicitEnvironment
  );

  if (apiKeyUser.type === 'client') {
    // For client API keys, find the service they have permission for
    if (serviceName) {
      // First try to find environment-specific service (e.g., "icoler-staging")
      const environmentSpecificServiceName = `${serviceName}-${environment}`;
      let service = await Service.findOne({
        name: environmentSpecificServiceName,
        isActive: true,
      }).populate('connectionId');

      // If environment-specific service not found and it's production, try original name
      if (!service && environment === 'production') {
        service = await Service.findOne({
          name: serviceName,
          isActive: true,
        }).populate('connectionId');
      }

      if (service) {
        // Verify the client has permission for this service (check both original and environment-specific names)
        const servicePermission = apiKeyUser.permissions.find(
          perm =>
            perm.serviceId &&
            (perm.serviceId.name === serviceName ||
              perm.serviceId.name === environmentSpecificServiceName ||
              (typeof perm.serviceId === 'object' &&
                (perm.serviceId.name === serviceName ||
                  perm.serviceId.name === environmentSpecificServiceName)))
        );

        if (servicePermission) {
          return service;
        }
      }
    }

    // If no specific service found, return the first service they have permission for
    if (apiKeyUser.permissions.length > 0) {
      const firstPermission = apiKeyUser.permissions[0];
      let service = await Service.findById(
        firstPermission.serviceId._id || firstPermission.serviceId
      ).populate('connectionId');

      // If testing in non-production, try to find environment-specific version
      if (service && environment !== 'production') {
        const environmentSpecificServiceName = `${service.name}-${environment}`;
        const envService = await Service.findOne({
          name: environmentSpecificServiceName,
          isActive: true,
        }).populate('connectionId');

        if (envService) {
          return envService;
        }
      }

      return service;
    }
  }

  if (apiKeyUser.type === 'developer' || apiKeyUser.type === 'mcp_universal') {
    // For developer/MCP keys, find service by name and environment
    if (serviceName) {
      // Try environment-specific service name first
      const environmentSpecificServiceName = `${serviceName}-${environment}`;
      let service = await Service.findOne({
        name: environmentSpecificServiceName,
        isActive: true,
      }).populate('connectionId');

      // If not found and it's production, try original name
      if (!service && environment === 'production') {
        service = await Service.findOne({
          name: serviceName,
          isActive: true,
        }).populate('connectionId');
      }

      return service;
    }

    // If no service specified, return null (must specify service)
    return null;
  }

  return null;
};

module.exports = {
  getApiKeyUser,
  resolveEnvironmentAndService,
  hasClientPermission,
  hasDeveloperPermission,
  hasMCPUniversalPermission,
  getServiceForApiKey,
};

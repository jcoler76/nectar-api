// MongoDB models replaced with Prisma for PostgreSQL migration
// const ApiUsage = require('../models/ApiUsage');
// const Service = require('../models/Service');
const { PrismaClient } = require('../prisma/generated/client');
const prisma = new PrismaClient();

const trackApiUsage = async (req, res, next) => {
  const originalJson = res.json;

  res.json = async function (data) {
    try {
      const application = req.application?._id;
      const role = req.role?._id || req.application?.defaultRole?._id;

      console.log('Role being saved:', role);
      console.log('req.role:', req.role);
      console.log('req.application.defaultRole:', req.application?.defaultRole);

      const fullUrl = new URL(req.originalUrl, `http://${req.headers.host}`);
      const pathWithoutQuery = fullUrl.pathname;
      const pathParts = pathWithoutQuery.split('/').filter(Boolean);

      const isV2Path = pathParts.includes('v2');
      const componentName = isV2Path
        ? pathParts[pathParts.length - 1]
        : pathParts[pathParts.length - 1].toLowerCase();

      // Calculate sizes
      let requestSize = 0;
      if (req.headers['content-length']) {
        requestSize = parseInt(req.headers['content-length']);
      } else if (req.body && typeof req.body === 'object') {
        requestSize = Buffer.byteLength(JSON.stringify(req.body), 'utf8');
      } else if (req.body && typeof req.body === 'string') {
        requestSize = Buffer.byteLength(req.body, 'utf8');
      }

      const responseSize = data ? Buffer.byteLength(JSON.stringify(data), 'utf8') : 0;

      const usageData = {
        timestamp: new Date(),
        endpoint: pathWithoutQuery,
        component: componentName,
        method: req.method,
        application: application,
        role: role,
        statusCode: res.statusCode || 200,
        requestSize: requestSize,
        responseSize: responseSize,
      };

      // Implement proper Prisma queries for API usage tracking
      const organizationId = req.organization?.id || req.user?.memberships?.[0]?.organizationId;
      
      if (req.service?._id && organizationId) {
        // Create API activity log entry
        await prisma.apiActivityLog.create({
          data: {
            requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: usageData.timestamp,
            method: usageData.method,
            url: req.originalUrl,
            endpoint: usageData.endpoint,
            statusCode: usageData.statusCode,
            responseTime: responseSize > 0 ? Math.floor(Math.random() * 100) + 50 : null, // Placeholder response time
            category: 'api',
            endpointType: 'public',
            importance: 'medium',
            organizationId: organizationId,
            userId: req.user?.id || null,
            metadata: {
              requestSize: usageData.requestSize,
              responseSize: usageData.responseSize,
              component: usageData.component
            }
          }
        }).catch(err => {
          console.log('Failed to save API activity log:', err.message);
        });

        // Create usage metric entry for the organization
        await prisma.usageMetric.create({
          data: {
            endpoint: usageData.endpoint,
            method: usageData.method,
            statusCode: usageData.statusCode,
            responseTimeMs: Math.floor(Math.random() * 100) + 50, // Placeholder response time
            organizationId: organizationId,
            apiKeyId: req.apiKey?.id || null
          }
        }).catch(err => {
          console.log('Failed to save usage metric:', err.message);
        });
      } else if (!req.service?._id) {
        const serviceName = isV2Path
          ? pathParts[pathParts.indexOf('v2') + 1]
          : req.params.serviceId;

        if (serviceName && organizationId) {
          const service = await prisma.service.findFirst({ 
            where: { 
              name: serviceName,
              organizationId: organizationId
            } 
          });
          if (service) {
            // Create API activity log entry
            await prisma.apiActivityLog.create({
              data: {
                requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                timestamp: usageData.timestamp,
                method: usageData.method,
                url: req.originalUrl,
                endpoint: usageData.endpoint,
                statusCode: usageData.statusCode,
                responseTime: Math.floor(Math.random() * 100) + 50,
                category: 'api',
                endpointType: 'public',
                importance: 'medium',
                organizationId: organizationId,
                userId: req.user?.id || null,
                metadata: {
                  requestSize: usageData.requestSize,
                  responseSize: usageData.responseSize,
                  component: usageData.component,
                  serviceId: service.id
                }
              }
            }).catch(err => {
              console.log('Failed to save API activity log:', err.message);
            });
          }
        }
      }

      return originalJson.call(this, data);
    } catch (error) {
      return originalJson.call(this, data);
    }
  };

  next();
};

module.exports = trackApiUsage;

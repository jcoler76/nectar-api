const DataLoader = require('dataloader');
const { PrismaClient } = require('../../prisma/generated/client');
const prisma = new PrismaClient();

const createEndpointLoader = () => {
  return new DataLoader(async endpointIds => {
    const endpoints = await prisma.endpoint.findMany({
      where: {
        id: {
          in: endpointIds,
        },
      },
      include: {
        creator: true,
        connection: true,
        organization: true,
      },
    });

    // Return endpoints in the same order as the input IDs
    const endpointMap = {};
    endpoints.forEach(endpoint => {
      endpointMap[endpoint.id] = endpoint;
    });

    return endpointIds.map(id => endpointMap[id] || null);
  });
};

const createEndpointByApiKeyLoader = () => {
  return new DataLoader(async apiKeys => {
    const endpoints = await prisma.endpoint.findMany({
      where: {
        apiKey: {
          in: apiKeys,
        },
      },
      include: {
        creator: true,
        connection: true,
        organization: true,
      },
    });

    // Return endpoints in the same order as the input API keys
    const endpointMap = {};
    endpoints.forEach(endpoint => {
      endpointMap[endpoint.apiKey] = endpoint;
    });

    return apiKeys.map(apiKey => endpointMap[apiKey] || null);
  });
};

const createEndpointUsageStatsLoader = () => {
  return new DataLoader(async endpointIds => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get all logs for these endpoints
    const logs = await prisma.apiActivityLog.findMany({
      where: {
        endpointId: {
          in: endpointIds,
        },
      },
      select: {
        endpointId: true,
        timestamp: true,
      },
    });

    // Group and aggregate by endpoint
    const statsMap = {};
    endpointIds.forEach(id => {
      const endpointLogs = logs.filter(log => log.endpointId === id);
      const totalRequests = endpointLogs.length;
      const requestsToday = endpointLogs.filter(log => log.timestamp >= today).length;
      const requestsThisWeek = endpointLogs.filter(log => log.timestamp >= weekAgo).length;
      const requestsThisMonth = endpointLogs.filter(log => log.timestamp >= monthAgo).length;

      const lastRequest =
        endpointLogs.length > 0
          ? new Date(Math.max(...endpointLogs.map(log => log.timestamp.getTime())))
          : null;

      // Calculate most active day
      const dateCounts = {};
      endpointLogs.forEach(log => {
        const dateStr = log.timestamp.toISOString().split('T')[0];
        dateCounts[dateStr] = (dateCounts[dateStr] || 0) + 1;
      });

      const mostActiveDay =
        Object.keys(dateCounts).length > 0
          ? Object.keys(dateCounts).reduce((a, b) => (dateCounts[a] > dateCounts[b] ? a : b))
          : null;

      const averageRequestsPerDay = requestsThisMonth > 0 ? requestsThisMonth / 30 : 0;

      statsMap[id] = {
        totalRequests,
        requestsToday,
        requestsThisWeek,
        requestsThisMonth,
        averageRequestsPerDay: parseFloat(averageRequestsPerDay.toFixed(2)),
        lastRequest,
        mostActiveDay: mostActiveDay ? new Date(mostActiveDay) : null,
      };
    });

    return endpointIds.map(
      id =>
        statsMap[id] || {
          totalRequests: 0,
          requestsToday: 0,
          requestsThisWeek: 0,
          requestsThisMonth: 0,
          averageRequestsPerDay: 0,
          lastRequest: null,
          mostActiveDay: null,
        }
    );
  });
};

module.exports = {
  createEndpointLoader,
  createEndpointByApiKeyLoader,
  createEndpointUsageStatsLoader,
};

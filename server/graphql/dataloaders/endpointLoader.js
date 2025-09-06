const DataLoader = require('dataloader');
const Endpoint = require('../../models/Endpoint');
const ApiUsage = require('../../models/ApiUsage');

const createEndpointLoader = () => {
  return new DataLoader(async endpointIds => {
    const endpoints = await Endpoint.find({ _id: { $in: endpointIds } }).populate('createdBy');

    // Return endpoints in the same order as the input IDs
    const endpointMap = {};
    endpoints.forEach(endpoint => {
      endpointMap[endpoint._id.toString()] = endpoint;
    });

    return endpointIds.map(id => endpointMap[id.toString()] || null);
  });
};

const createEndpointByApiKeyLoader = () => {
  return new DataLoader(async apiKeys => {
    const endpoints = await Endpoint.find({ apiKey: { $in: apiKeys } }).populate('createdBy');

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

    const stats = await ApiUsage.aggregate([
      { $match: { endpoint: { $in: endpointIds } } },
      {
        $group: {
          _id: '$endpoint',
          totalRequests: { $sum: 1 },
          requestsToday: {
            $sum: { $cond: [{ $gte: ['$timestamp', today] }, 1, 0] },
          },
          requestsThisWeek: {
            $sum: { $cond: [{ $gte: ['$timestamp', weekAgo] }, 1, 0] },
          },
          requestsThisMonth: {
            $sum: { $cond: [{ $gte: ['$timestamp', monthAgo] }, 1, 0] },
          },
          lastRequest: { $max: '$timestamp' },
          dates: { $push: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } } },
        },
      },
    ]);

    const statsMap = {};
    stats.forEach(stat => {
      // Calculate most active day
      const dateCounts = {};
      stat.dates.forEach(date => {
        dateCounts[date] = (dateCounts[date] || 0) + 1;
      });

      const mostActiveDay = Object.keys(dateCounts).reduce(
        (a, b) => (dateCounts[a] > dateCounts[b] ? a : b),
        null
      );

      const averageRequestsPerDay = stat.requestsThisMonth > 0 ? stat.requestsThisMonth / 30 : 0;

      statsMap[stat._id.toString()] = {
        totalRequests: stat.totalRequests,
        requestsToday: stat.requestsToday,
        requestsThisWeek: stat.requestsThisWeek,
        requestsThisMonth: stat.requestsThisMonth,
        averageRequestsPerDay: parseFloat(averageRequestsPerDay.toFixed(2)),
        lastRequest: stat.lastRequest,
        mostActiveDay: mostActiveDay ? new Date(mostActiveDay) : null,
      };
    });

    return endpointIds.map(
      id =>
        statsMap[id.toString()] || {
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

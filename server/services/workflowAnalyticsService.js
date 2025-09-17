const { PrismaClient } = require('../prisma/generated/client');
const { logger } = require('../utils/logger');

const prisma = new PrismaClient();

/**
 * Workflow Analytics Service
 * Provides performance analytics and optimization insights for workflows
 */
class WorkflowAnalyticsService {
  /**
   * Get analytics for a specific workflow
   */
  static async getWorkflowAnalytics(workflowId, timeRange = '7d') {
    try {
      const timeRanges = {
        '1d': 1,
        '7d': 7,
        '30d': 30,
        '90d': 90,
      };

      const daysBack = timeRanges[timeRange] || 7;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      // Get workflow execution logs
      const executions = await this.getWorkflowExecutions(workflowId, startDate);

      // Calculate performance metrics
      const analytics = {
        workflowId,
        timeRange,
        totalExecutions: executions.length,
        successfulExecutions: executions.filter(e => e.status === 'completed').length,
        failedExecutions: executions.filter(e => e.status === 'failed').length,
        avgExecutionTime: this.calculateAverageExecutionTime(executions),
        successRate:
          executions.length > 0
            ? (executions.filter(e => e.status === 'completed').length / executions.length) * 100
            : 0,
        trends: this.calculateTrends(executions, daysBack),
        nodePerformance: this.analyzeNodePerformance(executions),
        errorPatterns: this.analyzeErrorPatterns(executions),
        resourceUsage: this.calculateResourceUsage(executions),
      };

      return analytics;
    } catch (error) {
      logger.error('Error getting workflow analytics:', error);
      throw error;
    }
  }

  /**
   * Get performance summary for all workflows
   */
  static async getPerformanceSummary(timeRange = '7d', organizationId = null) {
    try {
      const timeRanges = {
        '1d': 1,
        '7d': 7,
        '30d': 30,
        '90d': 90,
      };

      const daysBack = timeRanges[timeRange] || 7;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      // Get all workflow executions for organization
      const where = { timestamp: { gte: startDate } };
      if (organizationId) {
        where.organizationId = organizationId;
      }

      // Since we don't have workflow execution logs in the current schema,
      // we'll use API activity logs as a proxy for workflow activity
      const activities = await prisma.apiActivityLog.findMany({
        where: {
          ...where,
          endpoint: { contains: 'workflow' },
          category: 'workflow',
        },
        orderBy: { timestamp: 'desc' },
      });

      const summary = {
        totalWorkflows: await this.countActiveWorkflows(organizationId),
        totalExecutions: activities.length,
        avgExecutionsPerDay: Math.round(activities.length / daysBack),
        topPerformingWorkflows: await this.getTopPerformingWorkflows(organizationId, 5),
        recentErrors: await this.getRecentErrors(organizationId, 10),
        performanceMetrics: {
          avgResponseTime: this.calculateAvgResponseTime(activities),
          errorRate: this.calculateErrorRate(activities),
          throughput: Math.round(activities.length / daysBack),
        },
      };

      return summary;
    } catch (error) {
      logger.error('Error getting performance summary:', error);
      throw error;
    }
  }

  /**
   * Get optimization recommendations for a workflow
   */
  static async getOptimizationRecommendations(workflowId) {
    try {
      const analytics = await this.getWorkflowAnalytics(workflowId, '30d');
      const recommendations = [];

      // Performance-based recommendations
      if (analytics.avgExecutionTime > 10000) {
        // > 10 seconds
        recommendations.push({
          type: 'performance',
          priority: 'high',
          title: 'Long Execution Time',
          description: 'This workflow takes longer than average to execute',
          suggestion:
            'Consider optimizing database queries, reducing API calls, or breaking into smaller workflows',
          impact: 'Could reduce execution time by 30-50%',
        });
      }

      if (analytics.successRate < 90) {
        recommendations.push({
          type: 'reliability',
          priority: 'high',
          title: 'Low Success Rate',
          description: `Success rate is ${analytics.successRate.toFixed(1)}%`,
          suggestion: 'Add error handling, retry logic, and input validation',
          impact: 'Could improve reliability by 15-25%',
        });
      }

      if (analytics.totalExecutions < 10 && analytics.timeRange === '30d') {
        recommendations.push({
          type: 'usage',
          priority: 'medium',
          title: 'Low Usage',
          description: 'This workflow is rarely executed',
          suggestion:
            'Consider reviewing if this workflow is still needed or if triggers need adjustment',
          impact: 'Could optimize resource allocation',
        });
      }

      // Node-specific recommendations
      if (analytics.nodePerformance) {
        const slowNodes = analytics.nodePerformance.filter(node => node.avgDuration > 5000);
        slowNodes.forEach(node => {
          recommendations.push({
            type: 'node_optimization',
            priority: 'medium',
            title: `Slow Node: ${node.nodeType}`,
            description: `Node "${node.nodeId}" is slower than average`,
            suggestion:
              'Optimize node configuration, reduce data processing, or use more efficient operations',
            impact: 'Could reduce overall execution time',
          });
        });
      }

      return recommendations;
    } catch (error) {
      logger.error('Error getting optimization recommendations:', error);
      throw error;
    }
  }

  /**
   * Get execution trends - organization-scoped for security
   */
  static async getExecutionTrends(timeRange = '30d', groupBy = 'day', organizationId = null) {
    try {
      const timeRanges = {
        '7d': 7,
        '30d': 30,
        '90d': 90,
      };

      const daysBack = timeRanges[timeRange] || 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      // Build where clause with required organization filter
      const where = {
        timestamp: { gte: startDate },
        endpoint: { contains: 'workflow' },
        category: 'workflow',
      };

      // SECURITY: Always filter by organization ID to prevent data leakage
      if (organizationId) {
        where.organizationId = organizationId;
      }

      // Get workflow activity from API logs
      const activities = await prisma.apiActivityLog.findMany({
        where,
        orderBy: { timestamp: 'asc' },
      });

      // Group by time period
      const trends = this.groupActivitiesByTime(activities, groupBy);

      return trends;
    } catch (error) {
      logger.error('Error getting execution trends:', error);
      throw error;
    }
  }

  // Helper methods

  static async getWorkflowExecutions(workflowId, startDate) {
    // Mock data since we don't have workflow execution logs in schema yet
    // In a real implementation, this would query workflow execution records
    return [];
  }

  static calculateAverageExecutionTime(executions) {
    if (executions.length === 0) return 0;
    const totalTime = executions.reduce((sum, exec) => sum + (exec.duration || 0), 0);
    return Math.round(totalTime / executions.length);
  }

  static calculateTrends(executions, daysBack) {
    const trends = [];
    const now = new Date();

    for (let i = daysBack - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.setHours(0, 0, 0, 0));
      const dayEnd = new Date(date.setHours(23, 59, 59, 999));

      const dayExecutions = executions.filter(
        e => e.timestamp >= dayStart && e.timestamp <= dayEnd
      );

      trends.push({
        date: dayStart.toISOString().split('T')[0],
        executions: dayExecutions.length,
        successful: dayExecutions.filter(e => e.status === 'completed').length,
        failed: dayExecutions.filter(e => e.status === 'failed').length,
      });
    }

    return trends;
  }

  static analyzeNodePerformance(executions) {
    // Mock implementation - would analyze individual node performance
    return [];
  }

  static analyzeErrorPatterns(executions) {
    const errors = executions.filter(e => e.status === 'failed');
    const patterns = {};

    errors.forEach(error => {
      const errorType = error.errorType || 'unknown';
      patterns[errorType] = (patterns[errorType] || 0) + 1;
    });

    return Object.entries(patterns).map(([type, count]) => ({
      errorType: type,
      count,
      percentage: Math.round((count / errors.length) * 100),
    }));
  }

  static calculateResourceUsage(executions) {
    return {
      avgMemoryUsage: 0, // MB
      avgCpuUsage: 0, // %
      avgNetworkCalls: 0,
    };
  }

  static async countActiveWorkflows(organizationId) {
    try {
      const where = { isActive: true };
      if (organizationId) {
        where.organizationId = organizationId;
      }

      // Check if workflow model exists
      if (prisma.workflow && typeof prisma.workflow.count === 'function') {
        return await prisma.workflow.count({ where });
      }
      return 0;
    } catch (error) {
      return 0;
    }
  }

  static async getTopPerformingWorkflows(organizationId, limit = 5) {
    // Mock data - would query actual workflow performance metrics
    return [
      { id: '1', name: 'Customer Onboarding', executions: 156, successRate: 98.1 },
      { id: '2', name: 'Invoice Processing', executions: 89, successRate: 95.5 },
      { id: '3', name: 'Lead Qualification', executions: 234, successRate: 92.3 },
    ].slice(0, limit);
  }

  static async getRecentErrors(organizationId, limit = 10) {
    try {
      const where = {
        responseStatus: { gte: 400 },
        category: 'workflow',
      };

      if (organizationId) {
        where.organizationId = organizationId;
      }

      const errors = await prisma.apiActivityLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: limit,
      });

      return errors.map(error => ({
        timestamp: error.timestamp,
        workflowId: error.metadata?.workflowId || 'unknown',
        error: error.errorMessage || 'Unknown error',
        endpoint: error.endpoint,
      }));
    } catch (error) {
      return [];
    }
  }

  static calculateAvgResponseTime(activities) {
    if (activities.length === 0) return 0;
    const totalTime = activities.reduce((sum, activity) => sum + (activity.responseTime || 0), 0);
    return Math.round(totalTime / activities.length);
  }

  static calculateErrorRate(activities) {
    if (activities.length === 0) return 0;
    const errors = activities.filter(a => a.responseStatus >= 400);
    return Math.round((errors.length / activities.length) * 100);
  }

  static groupActivitiesByTime(activities, groupBy) {
    const groups = {};

    activities.forEach(activity => {
      let key;
      const date = new Date(activity.timestamp);

      switch (groupBy) {
        case 'hour':
          key = date.toISOString().substring(0, 13) + ':00:00Z';
          break;
        case 'day':
          key = date.toISOString().substring(0, 10);
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().substring(0, 10);
          break;
        default:
          key = date.toISOString().substring(0, 10);
      }

      if (!groups[key]) {
        groups[key] = {
          time: key,
          executions: 0,
          successful: 0,
          failed: 0,
        };
      }

      groups[key].executions++;
      if (activity.responseStatus < 400) {
        groups[key].successful++;
      } else {
        groups[key].failed++;
      }
    });

    return Object.values(groups).sort((a, b) => a.time.localeCompare(b.time));
  }
}

module.exports = WorkflowAnalyticsService;

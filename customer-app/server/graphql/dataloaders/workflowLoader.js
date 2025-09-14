const DataLoader = require('dataloader');
// MongoDB models replaced with Prisma for PostgreSQL migration
// const { Workflow } = require('../../models/workflowModels');
// const WorkflowRun = require('../../models/WorkflowRun');

const { PrismaClient } = require('../../prisma/generated/client');
const prisma = new PrismaClient();

const createWorkflowLoader = () => {
  return new DataLoader(async workflowIds => {
    // TODO: Replace MongoDB query with Prisma query during migration
    // const workflows = await Workflow.find({ _id: { $in: workflowIds } }).populate('userId');
    // For now, return empty array to allow server startup
    const workflows = [];

    // Return workflows in the same order as the input IDs
    const workflowMap = {};
    workflows.forEach(workflow => {
      workflowMap[workflow._id.toString()] = workflow;
    });

    return workflowIds.map(id => workflowMap[id.toString()] || null);
  });
};

const createWorkflowRunLoader = () => {
  return new DataLoader(async runIds => {
    // TODO: Replace MongoDB query with Prisma query during migration
    // const runs = await WorkflowRun.find({ _id: { $in: runIds } }).populate('workflowId');
    // For now, return empty array to allow server startup
    const runs = [];

    // Return runs in the same order as the input IDs
    const runMap = {};
    runs.forEach(run => {
      runMap[run._id.toString()] = run;
    });

    return runIds.map(id => runMap[id.toString()] || null);
  });
};

const createWorkflowRunsByWorkflowLoader = () => {
  return new DataLoader(async workflowIds => {
    // TODO: Replace MongoDB query with Prisma query during migration
    // const runs = await WorkflowRun.find({
    //   workflowId: { $in: workflowIds },
    // }).sort({ createdAt: -1 });
    // For now, return empty array to allow server startup
    const runs = [];

    // Group runs by workflow ID
    const runsByWorkflow = {};
    workflowIds.forEach(id => {
      runsByWorkflow[id.toString()] = [];
    });

    runs.forEach(run => {
      const workflowId = run.workflowId.toString();
      if (runsByWorkflow[workflowId]) {
        runsByWorkflow[workflowId].push(run);
      }
    });

    return workflowIds.map(id => runsByWorkflow[id.toString()] || []);
  });
};

const createLastWorkflowRunLoader = () => {
  return new DataLoader(async workflowIds => {
    // TODO: Replace MongoDB aggregation with Prisma query during migration
    // const runs = await WorkflowRun.aggregate([
    //   { $match: { workflowId: { $in: workflowIds } } },
    //   { $sort: { createdAt: -1 } },
    //   { $group: { _id: '$workflowId', lastRun: { $first: '$$ROOT' } } },
    // ]);
    // For now, return empty array to allow server startup
    const runs = [];

    const runMap = {};
    runs.forEach(result => {
      runMap[result._id.toString()] = result.lastRun;
    });

    return workflowIds.map(id => runMap[id.toString()] || null);
  });
};

const createWorkflowStatsLoader = () => {
  return new DataLoader(async workflowIds => {
    // TODO: Replace MongoDB aggregation with Prisma query during migration
    // const stats = await WorkflowRun.aggregate([
    //   { $match: { workflowId: { $in: workflowIds } } },
    //   {
    //     $group: {
    //       _id: '$workflowId',
    //       totalRuns: { $sum: 1 },
    //       successfulRuns: {
    //         $sum: { $cond: [{ $eq: ['$status', 'succeeded'] }, 1, 0] },
    //       },
    //       averageDuration: {
    //         $avg: {
    //           $subtract: ['$finishedAt', '$startedAt'],
    //         },
    //       },
    //     },
    //   },
    // ]);
    // For now, return empty array to allow server startup
    const stats = [];

    const statsMap = {};
    stats.forEach(stat => {
      const successRate = stat.totalRuns > 0 ? (stat.successfulRuns / stat.totalRuns) * 100 : 0;
      statsMap[stat._id.toString()] = {
        totalRuns: stat.totalRuns,
        successRate: parseFloat(successRate.toFixed(2)),
        averageDuration: stat.averageDuration || 0,
      };
    });

    return workflowIds.map(
      id => statsMap[id.toString()] || { totalRuns: 0, successRate: 0, averageDuration: 0 }
    );
  });
};

module.exports = {
  createWorkflowLoader,
  createWorkflowRunLoader,
  createWorkflowRunsByWorkflowLoader,
  createLastWorkflowRunLoader,
  createWorkflowStatsLoader,
};

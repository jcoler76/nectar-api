const DataLoader = require('dataloader');
const { Workflow } = require('../../models/workflowModels');
const WorkflowRun = require('../../models/WorkflowRun');

const createWorkflowLoader = () => {
  return new DataLoader(async workflowIds => {
    const workflows = await Workflow.find({ _id: { $in: workflowIds } }).populate('userId');

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
    const runs = await WorkflowRun.find({ _id: { $in: runIds } }).populate('workflowId');

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
    const runs = await WorkflowRun.find({
      workflowId: { $in: workflowIds },
    }).sort({ createdAt: -1 });

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
    const runs = await WorkflowRun.aggregate([
      { $match: { workflowId: { $in: workflowIds } } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$workflowId', lastRun: { $first: '$$ROOT' } } },
    ]);

    const runMap = {};
    runs.forEach(result => {
      runMap[result._id.toString()] = result.lastRun;
    });

    return workflowIds.map(id => runMap[id.toString()] || null);
  });
};

const createWorkflowStatsLoader = () => {
  return new DataLoader(async workflowIds => {
    const stats = await WorkflowRun.aggregate([
      { $match: { workflowId: { $in: workflowIds } } },
      {
        $group: {
          _id: '$workflowId',
          totalRuns: { $sum: 1 },
          successfulRuns: {
            $sum: { $cond: [{ $eq: ['$status', 'succeeded'] }, 1, 0] },
          },
          averageDuration: {
            $avg: {
              $subtract: ['$finishedAt', '$startedAt'],
            },
          },
        },
      },
    ]);

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

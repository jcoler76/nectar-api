const DataLoader = require('dataloader');
const { PrismaClient } = require('../../prisma/generated/client');
const prisma = new PrismaClient();

const createWorkflowLoader = () => {
  return new DataLoader(async workflowIds => {
    const workflows = await prisma.workflow.findMany({
      where: {
        id: {
          in: workflowIds,
        },
      },
      include: {
        creator: true,
        organization: true,
      },
    });

    // Return workflows in the same order as the input IDs
    const workflowMap = {};
    workflows.forEach(workflow => {
      workflowMap[workflow.id] = workflow;
    });

    return workflowIds.map(id => workflowMap[id] || null);
  });
};

const createWorkflowRunLoader = () => {
  return new DataLoader(async runIds => {
    const runs = await prisma.workflowExecution.findMany({
      where: {
        id: {
          in: runIds,
        },
      },
      include: {
        workflow: true,
      },
    });

    // Return runs in the same order as the input IDs
    const runMap = {};
    runs.forEach(run => {
      runMap[run.id] = run;
    });

    return runIds.map(id => runMap[id] || null);
  });
};

const createWorkflowRunsByWorkflowLoader = () => {
  return new DataLoader(async workflowIds => {
    const runs = await prisma.workflowExecution.findMany({
      where: {
        workflowId: {
          in: workflowIds,
        },
      },
      orderBy: {
        startedAt: 'desc',
      },
    });

    // Group runs by workflow ID
    const runsByWorkflow = {};
    workflowIds.forEach(id => {
      runsByWorkflow[id] = [];
    });

    runs.forEach(run => {
      if (runsByWorkflow[run.workflowId]) {
        runsByWorkflow[run.workflowId].push(run);
      }
    });

    return workflowIds.map(id => runsByWorkflow[id] || []);
  });
};

const createLastWorkflowRunLoader = () => {
  return new DataLoader(async workflowIds => {
    const runs = await prisma.workflowExecution.findMany({
      where: {
        workflowId: {
          in: workflowIds,
        },
      },
      orderBy: {
        startedAt: 'desc',
      },
      include: {
        workflow: true,
      },
    });

    // Get the first (most recent) run for each workflow
    const runMap = {};
    runs.forEach(run => {
      if (!runMap[run.workflowId]) {
        runMap[run.workflowId] = run;
      }
    });

    return workflowIds.map(id => runMap[id] || null);
  });
};

const createWorkflowStatsLoader = () => {
  return new DataLoader(async workflowIds => {
    const runs = await prisma.workflowExecution.findMany({
      where: {
        workflowId: {
          in: workflowIds,
        },
      },
      select: {
        workflowId: true,
        status: true,
        startedAt: true,
        completedAt: true,
      },
    });

    // Aggregate stats by workflow
    const statsMap = {};
    workflowIds.forEach(id => {
      const workflowRuns = runs.filter(run => run.workflowId === id);
      const totalRuns = workflowRuns.length;
      const successfulRuns = workflowRuns.filter(run => run.status === 'SUCCESS').length;
      const successRate = totalRuns > 0 ? (successfulRuns / totalRuns) * 100 : 0;

      // Calculate average duration for completed runs
      const completedRuns = workflowRuns.filter(run => run.completedAt && run.startedAt);
      const averageDuration =
        completedRuns.length > 0
          ? completedRuns.reduce((sum, run) => {
              return sum + (run.completedAt.getTime() - run.startedAt.getTime());
            }, 0) / completedRuns.length
          : 0;

      statsMap[id] = {
        totalRuns,
        successRate: parseFloat(successRate.toFixed(2)),
        averageDuration: Math.round(averageDuration),
      };
    });

    return workflowIds.map(
      id => statsMap[id] || { totalRuns: 0, successRate: 0, averageDuration: 0 }
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

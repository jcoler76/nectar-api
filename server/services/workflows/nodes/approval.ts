import { logger } from '../../../utils/logger.js';

export interface ApprovalConfig {
  label?: string;
  instructions?: string;
  autoDecision?: 'approve' | 'reject' | '';
}

export const execute = async (config: ApprovalConfig, context: any) => {
  const { label, instructions, autoDecision } = config;

  logger.info('Approval node invoked', {
    label,
    hasAutoDecision: !!autoDecision,
  });

  if (autoDecision === 'approve' || autoDecision === 'reject') {
    return {
      status: 'decided',
      decision: autoDecision,
      nextPath: autoDecision,
      decidedAt: new Date().toISOString(),
    };
  }

  try {
    const WorkflowRun = require('../../../models/WorkflowRun');
    const { Approval } = require('../../../models/Approval');

    const runId = context?.run?._id || context?.runId;
    const workflowId = context?.run?.workflowId || context?.workflowId;

    if (runId && workflowId) {
      await Approval.create({
        workflowId,
        runId,
        nodeId: context?.currentNodeId,
        label,
        instructions,
        approvers: (config as any).approvers || [],
        status: 'pending',
      });

      // Mark run paused (best-effort)
      await WorkflowRun.updateOne({ _id: runId }, { $set: { status: 'paused' } });
    }
  } catch (e: any) {
    logger.warn('Approval persistence failed', { error: e.message });
  }

  return {
    status: 'pending',
    label,
    instructions,
    decidedAt: null as string | null,
  };
};

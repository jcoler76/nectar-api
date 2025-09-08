const mongoose = require('mongoose');

const workflowRunSchema = new mongoose.Schema(
  {
    workflowId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workflow',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['running', 'paused', 'succeeded', 'failed'],
      default: 'running',
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    finishedAt: {
      type: Date,
    },
    trigger: {
      // The data that started the workflow
      type: Object,
    },
    steps: {
      // A map of nodeId to its result
      type: Map,
      of: new mongoose.Schema(
        {
          status: String, // e.g., 'succeeded', 'failed'
          result: mongoose.Schema.Types.Mixed,
          error: String,
        },
        { _id: false }
      ),
    },
  },
  { timestamps: true }
);

const WorkflowRun = mongoose.model('WorkflowRun', workflowRunSchema);

module.exports = WorkflowRun;

const mongoose = require('mongoose');

const jiraAutomationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    // Jira matching criteria
    jiraConfig: {
      // Can match by ticket key(s)
      ticketKeys: [
        {
          type: String,
          uppercase: true,
          trim: true,
        },
      ],
      // Or by JQL query
      jqlQuery: {
        type: String,
        trim: true,
      },
      // Or by pattern matching
      summaryPattern: {
        type: String,
        trim: true,
      },
      // Project keys to limit scope
      projectKeys: [
        {
          type: String,
          uppercase: true,
          trim: true,
        },
      ],
      // Status filters
      validStatuses: [
        {
          type: String,
          default: ['Open', 'To Do', 'In Progress', 'Reopened'],
        },
      ],
      // Transition to apply on success
      successTransition: {
        type: String,
        default: 'Done',
      },
      // Labels to add
      addLabels: [
        {
          type: String,
          trim: true,
        },
      ],
    },
    // Action to perform
    action: {
      type: {
        type: String,
        enum: ['api', 'stored_procedure', 'workflow', 'custom_code'],
        required: true,
      },
      // For API calls
      api: {
        url: String,
        method: {
          type: String,
          enum: ['GET', 'POST', 'PUT', 'DELETE'],
          default: 'GET',
        },
        headers: mongoose.Schema.Types.Mixed,
        body: mongoose.Schema.Types.Mixed,
        timeout: {
          type: Number,
          default: 30000,
        },
      },
      // For stored procedures
      storedProcedure: {
        name: String,
        database: String,
        parameters: mongoose.Schema.Types.Mixed,
      },
      // For workflow triggers
      workflow: {
        workflowId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Workflow',
        },
      },
      // For custom code execution
      customCode: {
        code: String,
        timeout: {
          type: Number,
          default: 30000,
        },
      },
    },
    // Response handling
    responseConfig: {
      // How to extract success/failure from response
      successField: {
        type: String,
        default: 'success',
      },
      // How to extract record count from response
      recordCountField: {
        type: String,
        default: 'recordsUpdated',
      },
      // Custom success message template
      successMessage: {
        type: String,
        default: '✅ Automation completed successfully',
      },
      // Custom failure message template
      failureMessage: {
        type: String,
        default: '❌ Automation failed',
      },
    },
    // Execution history
    lastExecution: {
      timestamp: Date,
      ticketKey: String,
      success: Boolean,
      message: String,
      recordsProcessed: Number,
    },
    executionCount: {
      type: Number,
      default: 0,
    },
    successCount: {
      type: Number,
      default: 0,
    },
    failureCount: {
      type: Number,
      default: 0,
    },
    // Metadata
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
jiraAutomationSchema.index({ enabled: 1 });
jiraAutomationSchema.index({ 'jiraConfig.ticketKeys': 1 });
jiraAutomationSchema.index({ 'jiraConfig.projectKeys': 1 });
jiraAutomationSchema.index({ name: 1 });

// Instance methods
jiraAutomationSchema.methods.matchesTicket = function (ticket) {
  const { jiraConfig } = this;

  // Check if automation is enabled
  if (!this.enabled) return false;

  // Check ticket keys
  if (jiraConfig.ticketKeys?.length > 0) {
    if (jiraConfig.ticketKeys.includes(ticket.key)) {
      return true;
    }
  }

  // Check project keys
  if (jiraConfig.projectKeys?.length > 0) {
    const projectKey = ticket.key.split('-')[0];
    if (!jiraConfig.projectKeys.includes(projectKey)) {
      return false;
    }
  }

  // Check summary pattern
  if (jiraConfig.summaryPattern) {
    const pattern = new RegExp(jiraConfig.summaryPattern, 'i');
    if (!pattern.test(ticket.fields?.summary || '')) {
      return false;
    }
  }

  // Check status
  if (jiraConfig.validStatuses?.length > 0) {
    const status = ticket.fields?.status?.name;
    if (!jiraConfig.validStatuses.includes(status)) {
      return false;
    }
  }

  // If we have a JQL query, we'd need to validate against that
  // This would require calling Jira API, so we skip it here

  return true;
};

jiraAutomationSchema.methods.recordExecution = async function (
  ticketKey,
  success,
  message,
  recordsProcessed = 0
) {
  this.lastExecution = {
    timestamp: new Date(),
    ticketKey,
    success,
    message,
    recordsProcessed,
  };
  this.executionCount += 1;
  if (success) {
    this.successCount += 1;
  } else {
    this.failureCount += 1;
  }
  await this.save();
};

// Static methods
jiraAutomationSchema.statics.findMatchingAutomations = async function (ticket) {
  const automations = await this.find({ enabled: true });
  return automations.filter(automation => automation.matchesTicket(ticket));
};

const JiraAutomation = mongoose.model('JiraAutomation', jiraAutomationSchema);

module.exports = JiraAutomation;

const cron = require('node-cron');
// MongoDB models replaced with Prisma for PostgreSQL migration
// const { Workflow } = require('../models/workflowModels');

const prismaService = require('../services/prismaService');
const prisma = prismaService.getRLSClient();
const HubSpotService = require('./hubspot/HubSpotService');
const axios = require('axios');
const { executeWorkflow } = require('./workflows/engine');
const { getMessageQueue } = require('./messageQueue');
const { refreshAllConnections } = require('./connectionRefreshService');
const { logger } = require('../utils/logger');
const PostgresBackupService = require('./postgresBackupService');
const invitationService = require('./invitationService');

const scheduledTasks = new Map();
const hubSpotPollingIntervals = new Map(); // workflowId -> { handle, intervalMs }
const hubSpotLastChecks = new Map(); // workflowId -> timestamp (ms)
const adaptiveIntervals = new Map(); // Stores adaptive polling intervals for workflows
const activityMetrics = new Map(); // Stores activity metrics for adaptive scheduling

// Initialize backup service
let backupService = null;

// --- Database Trigger Polling ---

const checkDatabaseTriggers = async () => {
  logger.info('Checking for database triggers...');
  try {
    // TODO: Replace with Prisma workflow query during migration
    // const dbTriggerWorkflows = await Workflow.find({
    //   active: true,
    //   'nodes.data.nodeType': 'trigger:database',
    // });
    // For now, skip workflow query to allow server startup
    const dbTriggerWorkflows = [];

    for (const workflow of dbTriggerWorkflows) {
      const dbTriggerNode = workflow.nodes.find(n => n.data.nodeType === 'trigger:database');
      if (
        dbTriggerNode &&
        dbTriggerNode.data.connectionId &&
        dbTriggerNode.data.database &&
        dbTriggerNode.data.table
      ) {
        // Check if this workflow should be polled based on adaptive intervals
        if (shouldPollWorkflow(workflow._id.toString())) {
          await checkDatabaseTriggerEnhanced(workflow, dbTriggerNode);
        }
      }
    }
  } catch (error) {
    logger.error('Error checking database triggers:', error);
  }
};

// Adaptive polling helper functions
const shouldPollWorkflow = workflowId => {
  const lastPoll = activityMetrics.get(workflowId)?.lastPoll || 0;
  const interval = adaptiveIntervals.get(workflowId) || 60000; // Default 1 minute
  return Date.now() - lastPoll >= interval;
};

const updateActivityMetrics = (workflowId, changeCount, queryTime) => {
  const metrics = activityMetrics.get(workflowId) || {
    lastPoll: 0,
    recentActivity: [],
    averageQueryTime: 0,
    totalPolls: 0,
  };

  metrics.lastPoll = Date.now();
  metrics.recentActivity.push({ count: changeCount, time: Date.now() });
  metrics.totalPolls++;

  // Keep only last 10 activity records for moving average
  if (metrics.recentActivity.length > 10) {
    metrics.recentActivity.shift();
  }

  // Update average query time
  metrics.averageQueryTime =
    (metrics.averageQueryTime * (metrics.totalPolls - 1) + queryTime) / metrics.totalPolls;

  activityMetrics.set(workflowId, metrics);
};

const calculateAdaptiveInterval = (workflowId, changeCount, nodeData) => {
  const config = {
    minInterval: nodeData.minInterval || 5000, // 5 seconds
    maxInterval: nodeData.maxInterval || 300000, // 5 minutes
    baseInterval: nodeData.baseInterval || 30000, // 30 seconds
    cdcMode: nodeData.cdcMode || false,
    batchSize: nodeData.batchSize || 1000,
  };

  const currentInterval = adaptiveIntervals.get(workflowId) || config.baseInterval;
  const metrics = activityMetrics.get(workflowId);

  let newInterval;

  if (config.cdcMode) {
    // CDC mode - more aggressive scaling
    if (changeCount >= config.batchSize) {
      // Hit batch limit - poll very frequently
      newInterval = Math.max(config.minInterval, currentInterval * 0.3);
    } else if (changeCount > 100) {
      // High activity - increase frequency significantly
      newInterval = Math.max(config.minInterval, currentInterval * 0.5);
    } else if (changeCount > 10) {
      // Medium activity - moderate increase
      newInterval = Math.max(config.minInterval, currentInterval * 0.75);
    } else if (changeCount === 0) {
      // No activity - back off more aggressively
      newInterval = Math.min(config.maxInterval, currentInterval * 1.8);
    } else {
      // Low activity - slight back off
      newInterval = Math.min(config.maxInterval, currentInterval * 1.2);
    }
  } else {
    // Standard mode - conservative scaling
    if (changeCount > 50) {
      newInterval = Math.max(config.minInterval, currentInterval * 0.6);
    } else if (changeCount > 10) {
      newInterval = Math.max(config.minInterval, currentInterval * 0.8);
    } else if (changeCount === 0) {
      newInterval = Math.min(config.maxInterval, currentInterval * 1.5);
    } else {
      newInterval = Math.min(config.maxInterval, currentInterval * 1.1);
    }
  }

  // Consider recent activity pattern
  if (metrics && metrics.recentActivity.length >= 3) {
    const recentCounts = metrics.recentActivity.slice(-3).map(a => a.count);
    const avgRecentActivity = recentCounts.reduce((a, b) => a + b, 0) / recentCounts.length;

    if (avgRecentActivity > 20 && config.cdcMode) {
      // Sustained high activity in CDC mode
      newInterval = Math.max(config.minInterval, newInterval * 0.8);
    }
  }

  adaptiveIntervals.set(workflowId, newInterval);

  if (newInterval !== currentInterval) {
    logger.info(
      `Adaptive interval updated for workflow ${workflowId}: ${currentInterval}ms -> ${newInterval}ms (activity: ${changeCount})`
    );
  }

  return newInterval;
};

// Enhanced CDC-optimized database trigger checker
const checkDatabaseTriggerEnhanced = async (workflow, triggerNode) => {
  const { connectionId, database, table, eventType, column, dateColumn, timeadd } =
    triggerNode.data;
  const workflowId = workflow._id.toString();
  const startTime = Date.now();

  try {
    // MongoDB models replaced with Prisma for PostgreSQL migration
    // const Connection = require('../models/Connection');
    const { decryptDatabasePassword } = require('../utils/encryption');
    const sql = require('mssql');

    // TODO: Replace with Prisma connection query during migration
    // const connection = await Connection.findById(connectionId).select('+password');
    // For now, skip connection query to allow server startup
    const connection = null;
    if (!connection) {
      logger.error(`Database connection not found: ${connectionId}`);
      return;
    }

    // Establish database connection
    const decryptedPassword = decryptDatabasePassword(connection.password);
    const config = {
      user: connection.username,
      password: decryptedPassword,
      server: connection.host,
      port: connection.port,
      database: database,
      options: {
        encrypt: true,
        trustServerCertificate: true,
        connectTimeout: 15000,
      },
    };

    const pool = await sql.connect(config);

    try {
      let query = '';
      let newRows = [];

      // TODO: Replace with Prisma workflow query during migration
      // const latestWorkflow = await Workflow.findById(workflow._id);
      // For now, skip workflow query to allow server startup
      const latestWorkflow = workflow;

      // Get the last check time for this workflow (stored in workflow metadata)
      const lastCheck = latestWorkflow.lastDatabaseCheck || new Date(Date.now() - 60000); // Default to 1 minute ago

      // Parse timeadd value (default to 0 for EST if not specified)
      const timeaddMinutes = timeadd ? parseInt(timeadd) : 0;

      // CDC mode configuration - use larger batch sizes and processed marker support
      const batchSize = triggerNode.data.cdcMode ? triggerNode.data.batchSize || 5000 : 100;
      const cleanupStrategy = triggerNode.data.cleanupStrategy || 'time-based';

      if (eventType === 'newRow') {
        // Parse table name and schema
        const tableName = table.includes('.') ? table.split('.').pop() : table;
        const schemaName = table.includes('.') ? table.split('.')[0] : 'dbo';

        let timestampColumn;

        if (dateColumn) {
          // Use user-specified column
          timestampColumn = dateColumn;
        } else {
          // Auto-detect timestamp column
          const timestampColumns = [
            'dateAdded',
            'created_at',
            'created_date',
            'CreatedAt',
            'CreatedDate',
            'created',
            'timestamp',
          ];

          // Try to find a suitable timestamp column
          const schemaQuery = `
                        SELECT COLUMN_NAME 
                        FROM INFORMATION_SCHEMA.COLUMNS 
                        WHERE TABLE_NAME = @tableName 
                        AND TABLE_SCHEMA = @schemaName
                        AND DATA_TYPE IN ('datetime', 'datetime2', 'timestamp', 'date')
                    `;

          const schemaRequest = pool.request();
          schemaRequest.input('tableName', sql.NVarChar, tableName);
          schemaRequest.input('schemaName', sql.NVarChar, schemaName);
          const schemaResult = await schemaRequest.query(schemaQuery);
          const availableTimestampColumns = schemaResult.recordset.map(r => r.COLUMN_NAME);

          // Find the best timestamp column to use
          timestampColumn =
            timestampColumns.find(col =>
              availableTimestampColumns.some(dbCol => dbCol.toLowerCase() === col.toLowerCase())
            ) || availableTimestampColumns[0];
        }

        if (timestampColumn) {
          // Validate column name to prevent SQL injection
          const validColumnName = validateColumnName(timestampColumn);
          const validTableName = validateTableName(table);

          if (!validColumnName || !validTableName) {
            logger.error(`Invalid column or table name: ${timestampColumn}, ${table}`);
            return;
          }

          if (cleanupStrategy === 'processed-marker' && triggerNode.data.cdcMode) {
            // CDC mode with processed marker
            query = `
                            SELECT TOP ${batchSize} * 
                            FROM ${validTableName} 
                            WHERE (processed IS NULL OR processed = 0)
                            ORDER BY ${validColumnName} ASC
                        `;

            const request = pool.request();
            const result = await request.query(query);
            newRows = result.recordset;
          } else {
            // Standard time-based approach
            query = `
                            SELECT TOP ${batchSize} * 
                            FROM ${validTableName} 
                            WHERE DATEADD(hour, 4, ${validColumnName}) > @lastCheck
                            ORDER BY ${validColumnName} DESC
                        `;

            const request = pool.request();
            request.input('lastCheck', sql.DateTime, lastCheck);
            const result = await request.query(query);
            newRows = result.recordset;
          }
        } else {
          logger.warn(
            `No suitable timestamp column found for table ${table}. Cannot detect new rows.`
          );
        }
      } else if (eventType === 'updatedRow' && column) {
        // Validate column and table names to prevent SQL injection
        const validColumnName = validateColumnName(column);
        const validTableName = validateTableName(table);

        if (!validColumnName || !validTableName) {
          logger.error(`Invalid column or table name: ${column}, ${table}`);
          return;
        }

        // Check for updated rows based on specified column with timezone adjustment
        const estNormalizationMinutes = -timeaddMinutes; // Convert "behind EST" to "add to reach EST"
        query = `
                    SELECT TOP ${batchSize} * 
                    FROM ${validTableName} 
                    WHERE DATEADD(minute, @estNormalizationMinutes, ${validColumnName}) > DATEADD(hour, -5, @lastCheck)
                    ORDER BY ${validColumnName} DESC
                `;

        const request = pool.request();
        request.input('lastCheck', sql.DateTime, lastCheck);
        request.input('estNormalizationMinutes', sql.Int, estNormalizationMinutes);
        const result = await request.query(query);
        newRows = result.recordset;
      }

      // Update activity metrics and calculate next interval
      const queryTime = Date.now() - startTime;
      updateActivityMetrics(workflowId, newRows.length, queryTime);
      calculateAdaptiveInterval(workflowId, newRows.length, triggerNode.data);

      // Only execute workflow if there are new rows
      if (newRows.length > 0) {
        logger.info(
          `Found ${newRows.length} new rows for table ${table}, processing with CDC optimizations`
        );

        // Get message queue instance
        const messageQueue = getMessageQueue();

        if (triggerNode.data.cdcMode && triggerNode.data.enableBatching && newRows.length > 10) {
          // Process in batches for CDC mode
          await processBatches(newRows, workflow, triggerNode.data, messageQueue);
        } else {
          // Standard individual processing
          for (const row of newRows) {
            try {
              await messageQueue.addDatabaseEvent({
                eventType: eventType,
                table: table,
                database: database,
                connectionId: connectionId,
                data: row,
                sourceWorkflowId: workflow._id, // Prevent triggering the same workflow
              });
            } catch (queueError) {
              logger.error(`Error adding database event to queue:`, queueError);
            }
          }
        }

        // Handle cleanup for CDC mode
        if (
          triggerNode.data.cdcMode &&
          cleanupStrategy === 'processed-marker' &&
          newRows.length > 0
        ) {
          await markRowsAsProcessed(pool, table, newRows, triggerNode.data);
        }

        // TODO: Replace with Prisma workflow update during migration
        // await Workflow.findByIdAndUpdate(workflow._id, {
        //   lastDatabaseCheck: new Date(),
        // });
      } else {
        // TODO: Replace with Prisma workflow update during migration
        // await Workflow.findByIdAndUpdate(workflow._id, {
        //   lastDatabaseCheck: new Date(),
        // });
      }
    } finally {
      await pool.close();
    }
  } catch (error) {
    logger.error(`Error checking enhanced database trigger for workflow ${workflow.name}:`, error);
  }
};

// Batch processing helper for CDC mode
const processBatches = async (rows, workflow, nodeData, messageQueue) => {
  const batchSize = nodeData.batchSize || 1000;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);

    try {
      // Add batch as a single job with batch metadata
      await messageQueue.addDatabaseEventBatch({
        eventType: nodeData.eventType,
        table: nodeData.table,
        database: nodeData.database,
        connectionId: nodeData.connectionId,
        batch: batch,
        batchInfo: {
          batchIndex: Math.floor(i / batchSize) + 1,
          totalBatches: Math.ceil(rows.length / batchSize),
          batchSize: batch.length,
          totalRows: rows.length,
        },
        sourceWorkflowId: workflow._id,
      });
    } catch (queueError) {
      logger.error(`Error adding batch to queue:`, queueError);
    }

    // Small delay between batches to prevent overwhelming
    if (i + batchSize < rows.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
};

// Helper to mark rows as processed in CDC mode
const markRowsAsProcessed = async (pool, table, rows, nodeData) => {
  try {
    const validTableName = validateTableName(table);
    if (!validTableName || rows.length === 0) return;

    // Assume primary key is 'id' - this could be configurable
    const ids = rows.map(row => row.id || row.Id || row.ID).filter(id => id);

    if (ids.length > 0) {
      // Use parameterized query to safely update processed status
      const placeholders = ids.map((_, index) => `@id${index}`).join(',');
      const updateQuery = `
                UPDATE ${validTableName} 
                SET processed = 1, processed_at = GETDATE() 
                WHERE id IN (${placeholders})
            `;

      const request = pool.request();
      ids.forEach((id, index) => {
        request.input(`id${index}`, sql.Int, id);
      });

      await request.query(updateQuery);
      logger.info(`Marked ${ids.length} rows as processed in ${table}`);
    }
  } catch (error) {
    logger.error(`Error marking rows as processed:`, error);
  }
};

const checkDatabaseTrigger = async (workflow, triggerNode) => {
  const { connectionId, database, table, eventType, column, dateColumn, timeadd } =
    triggerNode.data;

  try {
    // MongoDB models replaced with Prisma for PostgreSQL migration
    // const Connection = require('../models/Connection');
    const { decryptDatabasePassword } = require('../utils/encryption');
    const sql = require('mssql');

    // TODO: Replace with Prisma connection query during migration
    // const connection = await Connection.findById(connectionId).select('+password');
    // For now, skip connection query to allow server startup
    const connection = null;
    if (!connection) {
      logger.error(`Database connection not found: ${connectionId}`);
      return;
    }

    // Establish database connection
    const decryptedPassword = decryptDatabasePassword(connection.password);
    const config = {
      user: connection.username,
      password: decryptedPassword,
      server: connection.host,
      port: connection.port,
      database: database,
      options: {
        encrypt: true,
        trustServerCertificate: true,
        connectTimeout: 15000,
      },
    };

    const pool = await sql.connect(config);

    try {
      let query = '';
      let newRows = [];

      // TODO: Replace with Prisma workflow query during migration
      // const latestWorkflow = await Workflow.findById(workflow._id);
      // For now, skip workflow query to allow server startup
      const latestWorkflow = workflow;

      // Get the last check time for this workflow (stored in workflow metadata)
      const lastCheck = latestWorkflow.lastDatabaseCheck || new Date(Date.now() - 60000); // Default to 1 minute ago

      // Parse timeadd value (default to 0 for EST if not specified)
      const timeaddMinutes = timeadd ? parseInt(timeadd) : 0;

      if (eventType === 'newRow') {
        // Parse table name and schema
        const tableName = table.includes('.') ? table.split('.').pop() : table;
        const schemaName = table.includes('.') ? table.split('.')[0] : 'dbo';

        let timestampColumn;

        if (dateColumn) {
          // Use user-specified column
          timestampColumn = dateColumn;
        } else {
          // Auto-detect timestamp column
          const timestampColumns = [
            'dateAdded',
            'created_at',
            'created_date',
            'CreatedAt',
            'CreatedDate',
            'created',
            'timestamp',
          ];

          // Try to find a suitable timestamp column
          const schemaQuery = `
                        SELECT COLUMN_NAME 
                        FROM INFORMATION_SCHEMA.COLUMNS 
                        WHERE TABLE_NAME = @tableName 
                        AND TABLE_SCHEMA = @schemaName
                        AND DATA_TYPE IN ('datetime', 'datetime2', 'timestamp', 'date')
                    `;

          const schemaRequest = pool.request();
          schemaRequest.input('tableName', sql.NVarChar, tableName);
          schemaRequest.input('schemaName', sql.NVarChar, schemaName);
          const schemaResult = await schemaRequest.query(schemaQuery);
          const availableTimestampColumns = schemaResult.recordset.map(r => r.COLUMN_NAME);

          // Find the best timestamp column to use
          timestampColumn =
            timestampColumns.find(col =>
              availableTimestampColumns.some(dbCol => dbCol.toLowerCase() === col.toLowerCase())
            ) || availableTimestampColumns[0];
        }

        if (timestampColumn) {
          // Validate column name to prevent SQL injection
          const validColumnName = validateColumnName(timestampColumn);
          const validTableName = validateTableName(table);

          if (!validColumnName || !validTableName) {
            logger.error(`Invalid column or table name: ${timestampColumn}, ${table}`);
            return;
          }

          // Convert database EDT time to UTC for comparison with our UTC lastCheck
          // Database stores EDT (Eastern Daylight Time), so we add 4 hours to convert EDT to UTC
          query = `
                        SELECT TOP 100 * 
                        FROM ${validTableName} 
                        WHERE DATEADD(hour, 4, ${validColumnName}) > @lastCheck
                        ORDER BY ${validColumnName} DESC
                    `;

          const request = pool.request();
          request.input('lastCheck', sql.DateTime, lastCheck);
          const result = await request.query(query);
          newRows = result.recordset;
        } else {
          logger.warn(
            `No suitable timestamp column found for table ${table}. Cannot detect new rows.`
          );
        }
      } else if (eventType === 'updatedRow' && column) {
        // Validate column and table names to prevent SQL injection
        const validColumnName = validateColumnName(column);
        const validTableName = validateTableName(table);

        if (!validColumnName || !validTableName) {
          logger.error(`Invalid column or table name: ${column}, ${table}`);
          return;
        }

        // Check for updated rows based on specified column with timezone adjustment
        const estNormalizationMinutes = -timeaddMinutes; // Convert "behind EST" to "add to reach EST"
        query = `
                    SELECT TOP 100 * 
                    FROM ${validTableName} 
                    WHERE DATEADD(minute, @estNormalizationMinutes, ${validColumnName}) > DATEADD(hour, -5, @lastCheck)
                    ORDER BY ${validColumnName} DESC
                `;

        const request = pool.request();
        request.input('lastCheck', sql.DateTime, lastCheck);
        request.input('estNormalizationMinutes', sql.Int, estNormalizationMinutes);
        const result = await request.query(query);
        newRows = result.recordset;
      }

      // Only execute workflow if there are new rows
      if (newRows.length > 0) {
        logger.info(`Found ${newRows.length} new rows for table ${table}, adding to message queue`);

        // Get message queue instance
        const messageQueue = getMessageQueue();

        // Add each new row to the message queue instead of executing directly
        for (const row of newRows) {
          try {
            await messageQueue.addDatabaseEvent({
              eventType: eventType,
              table: table,
              database: database,
              connectionId: connectionId,
              data: row,
              sourceWorkflowId: workflow._id, // Prevent triggering the same workflow
            });
          } catch (queueError) {
            logger.error(`Error adding database event to queue:`, queueError);
          }
        }

        // TODO: Replace with Prisma workflow update during migration
        // await Workflow.findByIdAndUpdate(workflow._id, {
        //   lastDatabaseCheck: new Date(),
        // });
      } else {
        // TODO: Replace with Prisma workflow update during migration
        // await Workflow.findByIdAndUpdate(workflow._id, {
        //   lastDatabaseCheck: new Date(),
        // });
      }
    } finally {
      await pool.close();
    }
  } catch (error) {
    logger.error(`Error checking database trigger for workflow ${workflow.name}:`, error);
  }
};

// --- Workflow Scheduling (Cron) ---

const scheduleWorkflow = async workflow => {
  try {
    logger.info(`Attempting to schedule workflow: ${workflow.name} (${workflow._id})`);
    logger.info(`Workflow active: ${workflow.active}`);

    if (!workflow.active) {
      logger.info(`Workflow ${workflow.name} is not active, skipping scheduling`);
      return;
    }

    // Remove existing task if it exists
    if (scheduledTasks.has(workflow._id.toString())) {
      const existingTask = scheduledTasks.get(workflow._id.toString());
      existingTask.destroy();
      logger.info(`Removed existing scheduled task for workflow: ${workflow.name}`);
    }

    // Find the scheduler trigger node
    const schedulerNode = workflow.nodes.find(node => node.data.nodeType === 'trigger:schedule');
    if (!schedulerNode) {
      logger.info(`No scheduler trigger node found for workflow: ${workflow.name}`);
      return;
    }

    logger.info(`Found scheduler node for workflow: ${workflow.name}`, {
      cronPattern: schedulerNode.data.cronPattern,
      timezone: schedulerNode.data.timezone,
    });

    const cronPattern = schedulerNode.data.pattern || schedulerNode.data.cronPattern;
    if (!cronPattern) {
      logger.error(`No cron pattern found for workflow ${workflow._id}: ${workflow.name}`);
      return;
    }

    if (!cron.validate(cronPattern)) {
      logger.error(`Invalid cron pattern for workflow ${workflow._id}: ${cronPattern}`);
      return;
    }

    // Schedule new task
    const task = cron.schedule(
      cronPattern,
      async () => {
        try {
          logger.info(
            `Executing scheduled workflow: ${workflow.name} (${workflow._id}) at ${new Date().toISOString()}`
          );
          await executeWorkflow(workflow, { trigger: 'scheduler' });
          logger.info(`Successfully executed scheduled workflow: ${workflow.name}`);
        } catch (error) {
          logger.error(`Error executing scheduled workflow ${workflow.name}:`, error);
        }
      },
      {
        scheduled: true,
        timezone: schedulerNode.data.timezone || 'America/New_York',
      }
    );

    scheduledTasks.set(workflow._id.toString(), task);
    logger.info(`✅ Workflow ${workflow.name} scheduled successfully with pattern: ${cronPattern}`);
    logger.info(`Next execution will be around: ${getNextExecutionTime(cronPattern)}`);
  } catch (error) {
    logger.error(`Error scheduling workflow ${workflow.name}:`, error);
  }
};

const unscheduleWorkflow = workflowId => {
  const task = scheduledTasks.get(workflowId);
  if (task) {
    task.destroy();
    scheduledTasks.delete(workflowId);
    logger.info(`Unscheduled workflow: ${workflowId}`);
  }
};

// Helper function to get next execution time (approximate)
const getNextExecutionTime = cronPattern => {
  try {
    // For "every X minutes" pattern like "*/5 * * * *"
    if (cronPattern.startsWith('*/')) {
      const minutes = parseInt(cronPattern.split(' ')[0].substring(2));
      const nextExecution = new Date();
      nextExecution.setMinutes(nextExecution.getMinutes() + minutes);
      return nextExecution.toISOString();
    }
    return 'Next execution time varies based on cron pattern';
  } catch (error) {
    return 'Unable to calculate next execution time';
  }
};

// Function to get current scheduler status
const getSchedulerStatus = () => {
  const status = {
    totalScheduledTasks: scheduledTasks.size,
    scheduledWorkflows: [],
  };

  for (const [workflowId, task] of scheduledTasks) {
    status.scheduledWorkflows.push({
      workflowId,
      isRunning: task.running || false,
    });
  }

  return status;
};

// Security: Validate SQL identifiers to prevent injection
const validateColumnName = columnName => {
  // Allow only alphanumeric characters, underscores, and dots (for schema.table.column)
  const validPattern = /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)*$/;
  return validPattern.test(columnName) ? columnName : null;
};

const validateTableName = tableName => {
  // Allow only alphanumeric characters, underscores, and dots (for schema.table)
  const validPattern = /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)*$/;
  return validPattern.test(tableName) ? tableName : null;
};

const initializeScheduler = async () => {
  try {
    logger.info('🚀 Initializing scheduler...');
    // TODO: Replace with Prisma workflow query during migration
    // const workflows = await Workflow.find({
    //   active: true,
    //   'nodes.data.nodeType': 'trigger:schedule',
    // });
    // For now, skip workflow query to allow server startup
    const workflows = [];

    logger.info(`Found ${workflows.length} active workflows with scheduler triggers`);

    for (const workflow of workflows) {
      logger.info(`Processing workflow: ${workflow.name}`);
      await scheduleWorkflow(workflow);
    }

    logger.info(`✅ Scheduler initialized with ${workflows.length} active scheduled workflows.`);
    logger.info('Current scheduler status:', getSchedulerStatus());

    // Start polling for database triggers
    // This runs every minute. Adjust as needed.
    cron.schedule('* * * * *', checkDatabaseTriggers);
    logger.info('Database trigger polling scheduled.');

    // HubSpot polling sync: only activates when workflows with HubSpot triggers exist
    // Runs every 2 minutes to align intervals with workflow configs
    cron.schedule('*/2 * * * *', syncHubSpotPolling);
    logger.info('HubSpot polling sync scheduled (gated by presence of HubSpot trigger workflows).');

    // Schedule daily connection database refresh at midnight EST (5:00 AM UTC)
    cron.schedule(
      '0 5 * * *',
      async () => {
        try {
          logger.info('🔄 Starting scheduled daily connection database refresh at midnight EST');
          await refreshAllConnections();
        } catch (error) {
          logger.error('❌ Error in scheduled connection refresh:', error);
        }
      },
      {
        timezone: 'UTC',
      }
    );
    logger.info('📅 Daily connection database refresh scheduled for midnight EST (5:00 AM UTC)');

    // Schedule daily cleanup of expired invitations at 2 AM UTC
    cron.schedule(
      '0 2 * * *',
      async () => {
        try {
          logger.info('🧹 Starting daily cleanup of expired invitations');
          const count = await invitationService.cleanupExpiredInvitations();
          logger.info(`✅ Cleaned up ${count} expired invitations`);
        } catch (error) {
          logger.error('❌ Error in invitation cleanup:', error);
        }
      },
      {
        timezone: 'UTC',
      }
    );
    logger.info('📅 Daily invitation cleanup scheduled for 2 AM UTC');

    // Initialize PostgreSQL backup service
    backupService = new PostgresBackupService();
    await backupService.initialize();

    // Schedule PostgreSQL backups if enabled
    if (backupService.isEnabled()) {
      const backupSchedule = backupService.getBackupSchedule();

      cron.schedule(
        backupSchedule,
        async () => {
          try {
            logger.info('🔄 Starting scheduled PostgreSQL backup');
            await backupService.createBackup();
          } catch (error) {
            logger.error('❌ Scheduled PostgreSQL backup failed:', error);
          }
        },
        {
          timezone: 'UTC',
        }
      );

      logger.info('📅 PostgreSQL backup scheduled', {
        schedule: backupSchedule,
        retentionDays: backupService.getRetentionDays(),
      });

      // Schedule backup cleanup - run weekly on Sundays at 3 AM UTC
      cron.schedule(
        '0 3 * * 0',
        async () => {
          try {
            logger.info('🧹 Starting weekly backup cleanup');
            await backupService.cleanupOldBackups();
          } catch (error) {
            logger.error('❌ Backup cleanup failed:', error);
          }
        },
        {
          timezone: 'UTC',
        }
      );

      logger.info('📅 Weekly backup cleanup scheduled for Sundays at 3 AM UTC');
    } else {
      logger.info('ℹ️ PostgreSQL backup is disabled (DB_BACKUP_ENABLED=false)');
    }

    // Initialize storage billing service for monitoring
    const StorageBillingService = require('./storageBillingService');
    const storageBillingService = new StorageBillingService();

    // Schedule daily storage usage tracking at 1 AM UTC
    cron.schedule(
      '0 1 * * *',
      async () => {
        try {
          logger.info('📊 Starting daily storage usage tracking');

          // Get all active organizations
          const organizations = await prisma.organization.findMany({
            where: { isActive: true },
            select: { id: true, name: true },
          });

          let recordedCount = 0;
          for (const org of organizations) {
            try {
              await storageBillingService.recordDailyUsage(org.id);
              recordedCount++;
            } catch (error) {
              logger.error('Failed to record storage usage for organization', {
                organizationId: org.id,
                organizationName: org.name,
                error: error.message,
              });
            }
          }

          logger.info(
            `✅ Daily storage usage recorded for ${recordedCount}/${organizations.length} organizations`
          );
        } catch (error) {
          logger.error('❌ Error in daily storage usage tracking:', error);
        }
      },
      {
        timezone: 'UTC',
      }
    );
    logger.info('📅 Daily storage usage tracking scheduled for 1 AM UTC');

    // Schedule monthly overage calculation on the 1st of each month at 6 AM UTC
    cron.schedule(
      '0 6 1 * *',
      async () => {
        try {
          logger.info('💰 Starting monthly storage overage calculation');

          // Get previous month
          const now = new Date();
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

          // Get all active organizations
          const organizations = await prisma.organization.findMany({
            where: { isActive: true },
            include: { subscription: true },
          });

          let processedCount = 0;
          let totalOverageCost = 0;

          for (const org of organizations) {
            try {
              const overageData = await storageBillingService.calculateMonthlyOverage(
                org.id,
                lastMonth
              );

              if (overageData.overage.overageCost > 0) {
                logger.info('Storage overage calculated', {
                  organizationId: org.id,
                  organizationName: org.name,
                  plan: org.subscription?.plan || 'FREE',
                  overageCost: overageData.overage.overageCost,
                  overageGB: overageData.overage.overageGB,
                });
                totalOverageCost += overageData.overage.overageCost;
              }

              processedCount++;
            } catch (error) {
              logger.error('Failed to calculate monthly overage for organization', {
                organizationId: org.id,
                organizationName: org.name,
                error: error.message,
              });
            }
          }

          logger.info(
            `✅ Monthly overage calculated for ${processedCount}/${organizations.length} organizations`,
            {
              totalOverageCost: Math.round(totalOverageCost * 100) / 100,
              month: lastMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
            }
          );
        } catch (error) {
          logger.error('❌ Error in monthly overage calculation:', error);
        }
      },
      {
        timezone: 'UTC',
      }
    );
    logger.info(
      '📅 Monthly storage overage calculation scheduled for 1st of each month at 6 AM UTC'
    );

    // Schedule storage cleanup - remove old usage records quarterly
    cron.schedule(
      '0 4 1 */3 *', // Every 3 months on the 1st at 4 AM UTC
      async () => {
        try {
          logger.info('🧹 Starting quarterly storage usage cleanup');
          const deletedCount = await storageBillingService.cleanupOldRecords(365); // Keep 1 year
          logger.info(`✅ Cleaned up ${deletedCount} old storage usage records`);
        } catch (error) {
          logger.error('❌ Error in storage usage cleanup:', error);
        }
      },
      {
        timezone: 'UTC',
      }
    );
    logger.info('📅 Quarterly storage usage cleanup scheduled');

    // Schedule daily storage purchase expiration check at 2 AM UTC
    cron.schedule(
      '0 2 * * *',
      async () => {
        try {
          logger.info('⏰ Starting daily storage purchase expiration check');
          const expiredCount = await storageBillingService.expireOldPurchases();
          logger.info(`✅ Expired ${expiredCount} old storage purchases`);
        } catch (error) {
          logger.error('❌ Error in storage purchase expiration check:', error);
        }
      },
      {
        timezone: 'UTC',
      }
    );
    logger.info('📅 Daily storage purchase expiration check scheduled for 2 AM UTC');
  } catch (error) {
    logger.error('❌ Failed to initialize scheduler:', error);
  }
};

module.exports = {
  initializeScheduler,
  scheduleWorkflow,
  unscheduleWorkflow,
  getSchedulerStatus,
  checkDatabaseTrigger, // Export for debugging
  getBackupService: () => backupService, // Export backup service for API access
};

// --- HubSpot Trigger Polling (Gated) ---

async function syncHubSpotPolling() {
  try {
    // TODO: Replace with Prisma workflow query during migration
    // const workflows = await Workflow.find({
    //   active: true,
    //   'nodes.data.nodeType': 'trigger:hubspot:record',
    // });
    // For now, skip workflow query to allow server startup
    const workflows = [];

    const activeIds = new Set();
    for (const workflow of workflows) {
      const wfId = workflow._id.toString();
      activeIds.add(wfId);
      const triggerNode = workflow.nodes.find(n => n.data.nodeType === 'trigger:hubspot:record');
      if (!triggerNode) continue;
      const intervalMs = Math.max(Number(triggerNode.data?.pollingInterval) || 300000, 15000);

      const existing = hubSpotPollingIntervals.get(wfId);
      if (existing && existing.intervalMs === intervalMs) {
        continue; // already scheduled with same interval
      }
      if (existing?.handle) {
        clearInterval(existing.handle);
      }

      const handle = setInterval(async () => {
        try {
          await pollHubSpotWorkflow(workflow, triggerNode);
        } catch (err) {
          logger.error(`HubSpot poll error for workflow ${workflow.name}:`, err);
        }
      }, intervalMs);
      hubSpotPollingIntervals.set(wfId, { handle, intervalMs });
      if (!hubSpotLastChecks.has(wfId)) {
        const last = workflow.lastHubSpotCheck
          ? new Date(workflow.lastHubSpotCheck).getTime()
          : Date.now() - intervalMs;
        hubSpotLastChecks.set(wfId, last);
      }
      logger.info(`HubSpot polling enabled for workflow ${workflow.name} every ${intervalMs}ms`);
    }

    // Clear intervals for workflows that no longer have HubSpot triggers or are inactive
    for (const [wfId, entry] of hubSpotPollingIntervals) {
      if (!activeIds.has(wfId)) {
        clearInterval(entry.handle);
        hubSpotPollingIntervals.delete(wfId);
        hubSpotLastChecks.delete(wfId);
        logger.info(`HubSpot polling disabled for workflow ${wfId}`);
      }
    }
  } catch (error) {
    logger.error('Failed to sync HubSpot polling:', error);
  }
}

async function pollHubSpotWorkflow(workflow, triggerNode) {
  const wfId = workflow._id.toString();
  const nodeData = triggerNode.data || {};
  const { connection = {}, object = 'contact', eventType = 'new', advanced = {} } = nodeData;

  if (!connection?.accessToken) {
    logger.warn(`HubSpot polling skipped for ${workflow.name}: missing access token`);
    return;
  }
  const hs = new HubSpotService({
    accessToken: connection.accessToken,
    baseUrl: connection.baseUrl || 'https://api.hubapi.com',
    apiVersion: connection.apiVersion || 'v3',
    timeout: connection.timeout || 30000,
  });

  const lastCheck =
    hubSpotLastChecks.get(wfId) || Date.now() - (Number(nodeData.pollingInterval) || 300000);
  const now = Date.now();

  const propName = eventType === 'updated' ? 'hs_lastmodifieddate' : 'createdate';
  const filters = [
    {
      filters: [
        {
          propertyName: propName,
          operator: 'GT',
          value: lastCheck,
        },
      ],
    },
  ];

  const sorts = [{ propertyName: propName, direction: 'DESCENDING' }];
  const limit = Math.min(Number(advanced.batchSize) || 50, 100);

  const data = await hs.searchRecords(
    object,
    filters,
    sorts,
    limit,
    0,
    nodeData.propertiesToMonitor || []
  );
  const results = Array.isArray(data?.results) ? data.results : [];

  if (results.length > 0) {
    logger.info(`HubSpot poll found ${results.length} ${object}(s) for ${workflow.name}`);
    for (const rec of results) {
      try {
        await executeWorkflow(workflow, { data: rec, source: 'hubspot' });
      } catch (err) {
        logger.error(`Error executing workflow ${workflow.name} for HubSpot record:`, err);
      }
    }
  }

  hubSpotLastChecks.set(wfId, now);
  try {
    // TODO: Replace with Prisma workflow update during migration
    // await Workflow.findByIdAndUpdate(workflow._id, { lastHubSpotCheck: new Date(now) });
  } catch (e) {
    logger.warn('Failed to persist lastHubSpotCheck:', e.message);
  }
}

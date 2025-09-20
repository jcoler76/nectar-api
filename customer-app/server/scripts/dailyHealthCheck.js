#!/usr/bin/env node

const { MongoClient } = require('mongodb');
const nodemailer = require('nodemailer');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

// Configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nectar_db';
const DB_NAME = process.env.DB_NAME || 'nectar-api';
const EMAIL_TO = 'jcoler@nectarstudio.ai';

async function runHealthCheck() {
  let client;

  try {
    // Connect to MongoDB
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(DB_NAME);

    console.log('Connected to MongoDB, collecting metrics...');

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Collect API metrics
    const apiStats = await db
      .collection('apiactivitylogs')
      .aggregate([
        { $match: { timestamp: { $gte: oneDayAgo } } },
        {
          $group: {
            _id: null,
            totalCalls: { $sum: 1 },
            successfulCalls: { $sum: { $cond: [{ $eq: ['$success', true] }, 1, 0] } },
            avgDuration: { $avg: '$duration' },
            maxDuration: { $max: '$duration' },
            slowCalls: { $sum: { $cond: [{ $gt: ['$duration', 5000] }, 1, 0] } },
            timeoutCalls: { $sum: { $cond: [{ $gt: ['$duration', 30000] }, 1, 0] } },
            uniqueClients: { $addToSet: '$ipAddress' },
          },
        },
      ])
      .toArray();

    // Hourly breakdown
    const hourlyData = [];
    for (let i = 23; i >= 0; i--) {
      const hourStart = new Date(now.getTime() - (i + 1) * 60 * 60 * 1000);
      const hourEnd = new Date(now.getTime() - i * 60 * 60 * 1000);

      const hourStats = await db
        .collection('apiactivitylogs')
        .aggregate([
          { $match: { timestamp: { $gte: hourStart, $lt: hourEnd } } },
          {
            $group: {
              _id: null,
              calls: { $sum: 1 },
              avgDuration: { $avg: '$duration' },
              errors: { $sum: { $cond: [{ $eq: ['$success', false] }, 1, 0] } },
            },
          },
        ])
        .toArray();

      if (hourStats.length > 0) {
        const stats = hourStats[0];
        hourlyData.push({
          hour: `${hourEnd.getHours().toString().padStart(2, '0')}:00`,
          calls: stats.calls,
          avgDuration: Math.round(stats.avgDuration || 0),
          errors: stats.errors,
          successRate:
            stats.calls > 0
              ? (((stats.calls - stats.errors) / stats.calls) * 100).toFixed(1)
              : '100',
        });
      }
    }

    // Workflow metrics
    const workflowStats = await db
      .collection('workflowexecutions')
      .aggregate([
        { $match: { startedAt: { $gte: oneDayAgo } } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();

    const workflowSummary = {
      total: 0,
      completed: 0,
      failed: 0,
      running: 0,
    };

    workflowStats.forEach(stat => {
      workflowSummary.total += stat.count;
      if (stat._id === 'completed') workflowSummary.completed = stat.count;
      if (stat._id === 'failed') workflowSummary.failed = stat.count;
      if (stat._id === 'running') workflowSummary.running = stat.count;
    });

    // Top errors
    const topErrors = await db
      .collection('apiactivitylogs')
      .aggregate([
        {
          $match: {
            timestamp: { $gte: oneDayAgo },
            success: false,
          },
        },
        {
          $group: {
            _id: { $ifNull: ['$errorType', 'Unknown'] },
            count: { $sum: 1 },
            lastOccurrence: { $max: '$timestamp' },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ])
      .toArray();

    // Prepare metrics
    const metrics = {
      api: apiStats[0] || { totalCalls: 0, successfulCalls: 0, avgDuration: 0 },
      hourly: hourlyData,
      workflows: workflowSummary,
      errors: topErrors,
    };

    // Calculate health score
    let healthScore = 100;
    const issues = [];

    if (metrics.api.totalCalls > 0) {
      const successRate = (metrics.api.successfulCalls / metrics.api.totalCalls) * 100;
      if (successRate < 99) {
        healthScore -= 10;
        issues.push(`API success rate: ${successRate.toFixed(1)}%`);
      }
      if (successRate < 95) {
        healthScore -= 20;
        issues.push('Critical: API success rate below 95%');
      }
      if (metrics.api.avgDuration > 2000) {
        healthScore -= 5;
        issues.push(`Slow response time: ${Math.round(metrics.api.avgDuration)}ms`);
      }
      if (metrics.api.timeoutCalls > 0) {
        healthScore -= 15;
        issues.push(`${metrics.api.timeoutCalls} timeouts detected`);
      }
    }

    if (workflowSummary.failed > workflowSummary.total * 0.1) {
      healthScore -= 10;
      issues.push(`High workflow failure rate: ${workflowSummary.failed}/${workflowSummary.total}`);
    }

    // Generate HTML email
    const html = generateEmailHTML(metrics, healthScore, issues, now, oneDayAgo);

    // Send email
    await sendEmail(html, healthScore);

    console.log('Health check completed successfully');
  } catch (error) {
    console.error('Health check failed:', error);
    // Try to send error notification
    try {
      await sendEmail(`<h1>Health Check Failed</h1><p>Error: ${error.message}</p>`, 0);
    } catch (emailError) {
      console.error('Failed to send error email:', emailError);
    }
  } finally {
    if (client) {
      await client.close();
    }
  }
}

function generateEmailHTML(metrics, healthScore, issues, now, oneDayAgo) {
  const statusColor = healthScore >= 90 ? '#4CAF50' : healthScore >= 70 ? '#FF9800' : '#f44336';
  const status = healthScore >= 90 ? 'Healthy' : healthScore >= 70 ? 'Warning' : 'Critical';

  const successRate =
    metrics.api.totalCalls > 0
      ? ((metrics.api.successfulCalls / metrics.api.totalCalls) * 100).toFixed(1)
      : '100';

  const workflowSuccessRate =
    metrics.workflows.total > 0
      ? ((metrics.workflows.completed / metrics.workflows.total) * 100).toFixed(1)
      : '100';

  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }
    .container { max-width: 800px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; }
    .header h1 { margin: 0 0 10px 0; }
    .health-score { display: inline-block; padding: 10px 20px; background: ${statusColor}; border-radius: 20px; font-weight: bold; margin-top: 10px; }
    .content { padding: 30px; }
    .metric-card { background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
    .metric-card h2 { margin: 0 0 15px 0; color: #333; font-size: 18px; }
    .metric-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e0e0e0; }
    .metric-row:last-child { border-bottom: none; }
    .metric-label { color: #666; }
    .metric-value { font-weight: bold; }
    .success { color: #4CAF50; }
    .warning { color: #FF9800; }
    .error { color: #f44336; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f0f0f0; padding: 10px; text-align: left; font-size: 12px; }
    td { padding: 10px; border-bottom: 1px solid #f0f0f0; }
    .issues { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Daily Health Report - Nectar Studio</h1>
      <div>${now.toLocaleDateString()} ${now.toLocaleTimeString()}</div>
      <div class="health-score">Health Score: ${healthScore}/100 - ${status}</div>
    </div>
    
    <div class="content">
      <!-- 24 Hour Summary -->
      <div class="metric-card">
        <h2>📊 24-Hour Summary</h2>
        <div class="metric-row">
          <span class="metric-label">Total API Calls</span>
          <span class="metric-value">${metrics.api.totalCalls.toLocaleString()}</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">Success Rate</span>
          <span class="metric-value ${successRate >= 99 ? 'success' : successRate >= 95 ? 'warning' : 'error'}">${successRate}%</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">Avg Response Time</span>
          <span class="metric-value ${metrics.api.avgDuration > 2000 ? 'warning' : 'success'}">${Math.round(metrics.api.avgDuration || 0)}ms</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">Slow Requests (>5s)</span>
          <span class="metric-value ${metrics.api.slowCalls > 0 ? 'warning' : 'success'}">${metrics.api.slowCalls || 0}</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">Timeouts (>30s)</span>
          <span class="metric-value ${metrics.api.timeoutCalls > 0 ? 'error' : 'success'}">${metrics.api.timeoutCalls || 0}</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">Unique Clients</span>
          <span class="metric-value">${metrics.api.uniqueClients ? metrics.api.uniqueClients.length : 0}</span>
        </div>
      </div>

      <!-- Workflow Summary -->
      <div class="metric-card">
        <h2>⚙️ Workflow Summary</h2>
        <div class="metric-row">
          <span class="metric-label">Total Executions</span>
          <span class="metric-value">${metrics.workflows.total}</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">Success Rate</span>
          <span class="metric-value ${workflowSuccessRate >= 90 ? 'success' : 'warning'}">${workflowSuccessRate}%</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">Failed</span>
          <span class="metric-value ${metrics.workflows.failed > 0 ? 'error' : 'success'}">${metrics.workflows.failed}</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">Still Running</span>
          <span class="metric-value ${metrics.workflows.running > 0 ? 'warning' : 'success'}">${metrics.workflows.running}</span>
        </div>
      </div>

      <!-- Hourly Breakdown -->
      <div class="metric-card">
        <h2>📈 Hourly Activity (Last 6 Hours)</h2>
        <table>
          <thead>
            <tr>
              <th>Hour</th>
              <th>Requests</th>
              <th>Avg Response</th>
              <th>Success Rate</th>
              <th>Errors</th>
            </tr>
          </thead>
          <tbody>
            ${metrics.hourly
              .slice(-6)
              .map(
                h => `
              <tr>
                <td>${h.hour}</td>
                <td>${h.calls}</td>
                <td>${h.avgDuration}ms</td>
                <td class="${h.successRate >= 99 ? 'success' : h.successRate >= 95 ? 'warning' : 'error'}">${h.successRate}%</td>
                <td class="${h.errors > 0 ? 'error' : 'success'}">${h.errors}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>

      <!-- Top Errors -->
      ${
        metrics.errors.length > 0
          ? `
      <div class="metric-card">
        <h2>❌ Top Errors (Last 24 Hours)</h2>
        <table>
          <thead>
            <tr>
              <th>Error Type</th>
              <th>Count</th>
              <th>Last Occurrence</th>
            </tr>
          </thead>
          <tbody>
            ${metrics.errors
              .map(
                e => `
              <tr>
                <td>${e._id}</td>
                <td class="error">${e.count}</td>
                <td>${new Date(e.lastOccurrence).toLocaleTimeString()}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
      `
          : ''
      }

      <!-- Issues Detected -->
      ${
        issues.length > 0
          ? `
      <div class="issues">
        <strong>⚠️ Issues Detected:</strong>
        <ul>
          ${issues.map(issue => `<li>${issue}</li>`).join('')}
        </ul>
      </div>
      `
          : ''
      }
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #666; font-size: 12px;">
        Period: ${oneDayAgo.toLocaleString()} to ${now.toLocaleString()}
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

async function sendEmail(html, healthScore) {
  const transporter = nodemailer.createTransporter({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const status = healthScore >= 90 ? 'Healthy' : healthScore >= 70 ? 'Warning' : 'Critical';

  await transporter.sendMail({
    from: process.env.SMTP_USER || 'health@nectarstudio.ai',
    to: EMAIL_TO,
    subject: `Daily Health Report - ${new Date().toLocaleDateString()} - Status: ${status} (${healthScore}/100)`,
    html: html,
  });

  console.log(`Email sent to ${EMAIL_TO}`);
}

// Run the health check
runHealthCheck().catch(console.error);

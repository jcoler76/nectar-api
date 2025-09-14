import { Box, Typography, TextField, Alert, Chip, Stack } from '@mui/material';
import React, { Suspense, useEffect, useState } from 'react';
import { lazy } from 'react';

// Lazy-load the heavy Ace editor only when this panel is rendered
const LazyAceEditor = lazy(() => import('react-ace'));

const CodePanel = ({ nodeData, onNodeDataChange }) => {
  const [showExample, setShowExample] = useState(false);

  // Load Ace modes/themes dynamically to avoid bundling them upfront
  useEffect(() => {
    let mounted = true;
    const loadAceDeps = async () => {
      try {
        await Promise.all([
          import('ace-builds/src-noconflict/mode-javascript'),
          import('ace-builds/src-noconflict/theme-github'),
          import('ace-builds/src-noconflict/ext-language_tools'),
        ]);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('Ace assets failed to load', e);
      }
    };
    if (mounted) loadAceDeps();
    return () => {
      mounted = false;
    };
  }, []);

  if (!nodeData) {
    return null;
  }

  const handleCodeChange = newCode => {
    onNodeDataChange({ code: newCode });
  };

  const handleLabelChange = event => {
    onNodeDataChange({ label: event.target.value });
  };

  const handleTimeoutChange = event => {
    const value = parseInt(event.target.value) || 30000;
    onNodeDataChange({ timeout: value });
  };

  // Sample code for daily health check
  const healthCheckExample = `// Daily Health Check Example
// Connect to MongoDB and send email report

const client = new MongoClient(env.MONGODB_URI);
await client.connect();
const db = client.db(env.DB_NAME || 'nectar-api');

const now = new Date();
const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

// Query API metrics
const apiStats = await db.collection('apiactivitylogs').aggregate([
  { $match: { timestamp: { $gte: oneDayAgo } } },
  {
    $group: {
      _id: null,
      totalCalls: { $sum: 1 },
      successfulCalls: { $sum: { $cond: [{ $eq: ['$success', true] }, 1, 0] } },
      avgDuration: { $avg: '$duration' }
    }
  }
]).toArray();

const stats = apiStats[0] || {};
const successRate = stats.totalCalls > 0 ? 
  ((stats.successfulCalls / stats.totalCalls) * 100).toFixed(1) : '100';

// Create email HTML
const html = \`
  <h2>Daily Health Report</h2>
  <p>Total API Calls: \${stats.totalCalls || 0}</p>
  <p>Success Rate: \${successRate}%</p>
  <p>Avg Response: \${Math.round(stats.avgDuration || 0)}ms</p>
\`;

// Send email
const transporter = nodemailer.createTransporter({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS
  }
});

await transporter.sendMail({
  from: env.SMTP_USER,
  to: 'jcoler@mirabeltechnologies.com',
  subject: \`Health Report - \${new Date().toLocaleDateString()}\`,
  html: html
});

await client.close();
console.log('Health check email sent');

return { success: true, successRate };`;

  return (
    <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h6" gutterBottom>
        Configure Code
      </Typography>

      <TextField
        label="Node Label"
        name="label"
        value={nodeData.label || ''}
        onChange={handleLabelChange}
        fullWidth
        margin="normal"
        variant="outlined"
      />

      <TextField
        label="Timeout (ms)"
        name="timeout"
        type="number"
        value={nodeData.timeout || 30000}
        onChange={handleTimeoutChange}
        fullWidth
        margin="normal"
        variant="outlined"
        helperText="Maximum execution time in milliseconds (default: 30000)"
      />

      <Alert severity="info" sx={{ mt: 2, mb: 1 }}>
        <Typography variant="body2" sx={{ mb: 1 }}>
          <strong>Enhanced Code Node - Now with async/await support!</strong>
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          Available modules and variables:
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 1 }}>
          <Chip label="axios" size="small" color="primary" />
          <Chip label="nodemailer" size="small" color="primary" />
          <Chip label="MongoClient" size="small" color="primary" />
          <Chip label="env (filtered)" size="small" color="success" />
          <Chip label="input" size="small" color="success" />
          <Chip label="context" size="small" color="success" />
        </Stack>
        <Typography
          variant="caption"
          sx={{
            cursor: 'pointer',
            textDecoration: 'underline',
            color: 'primary.main',
          }}
          onClick={() => setShowExample(!showExample)}
        >
          {showExample ? 'Hide' : 'Show'} health check example
        </Typography>
      </Alert>

      {showExample && (
        <Alert severity="success" sx={{ mb: 2 }}>
          <Typography variant="caption" sx={{ fontFamily: 'monospace', whiteSpace: 'pre' }}>
            Click in the code editor and paste this example
          </Typography>
        </Alert>
      )}

      <Typography variant="body2" sx={{ mb: 1 }}>
        Write JavaScript with async/await support. The return value will be the node's output.
      </Typography>

      <Box sx={{ flexGrow: 1, border: '1px solid #ccc', borderRadius: 1, overflow: 'hidden' }}>
        <Suspense
          fallback={
            <Typography variant="body2" sx={{ p: 2 }}>
              Loading editor…
            </Typography>
          }
        >
          <LazyAceEditor
            mode="javascript"
            theme="github"
            onChange={handleCodeChange}
            name="workflow-editor"
            editorProps={{ $blockScrolling: true }}
            value={nodeData.code || ''}
            placeholder={
              showExample
                ? healthCheckExample
                : '// Your code here\n\nreturn { result: "Hello World" };'
            }
            width="100%"
            height="100%"
            fontSize={14}
            showPrintMargin
            showGutter
            highlightActiveLine
            setOptions={{
              enableBasicAutocompletion: true,
              enableLiveAutocompletion: true,
              enableSnippets: true,
              showLineNumbers: true,
              tabSize: 2,
            }}
          />
        </Suspense>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        <strong>Available environment variables:</strong> MONGODB_URI, DB_NAME, SMTP_HOST,
        SMTP_PORT, SMTP_USER, SMTP_PASS, OPENAI_API_KEY
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        <strong>Security:</strong> This runs in a sandboxed environment. File system access and
        dangerous operations are restricted.
      </Typography>
    </Box>
  );
};

export default CodePanel;

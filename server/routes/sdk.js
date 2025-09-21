const express = require('express');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');
const axios = require('axios');
const { logger } = require('../middleware/logger');

const router = express.Router();

// Input validation to prevent path traversal attacks
function validatePathInput(input, paramName) {
  if (!input || typeof input !== 'string') {
    throw new Error(`${paramName} must be a non-empty string`);
  }

  // Check for path traversal sequences
  if (input.includes('..') || input.includes('/') || input.includes('\\')) {
    throw new Error(
      `${paramName} contains invalid characters. Only alphanumeric characters, hyphens, and underscores are allowed`
    );
  }

  // Validate against whitelist pattern (alphanumeric, hyphens, underscores only)
  if (!/^[a-zA-Z0-9_-]+$/.test(input)) {
    throw new Error(
      `${paramName} contains invalid characters. Only alphanumeric characters, hyphens, and underscores are allowed`
    );
  }

  return input;
}

// GET root: General info and Blueprints SDK commands
router.get('/', async (req, res) => {
  try {
    const host = `${req.protocol}://${req.get('host')}`;
    const blueprintsOpenapiUrl = `${host}/api/documentation/blueprints/openapi`;

    const examples = {
      blueprints: {
        typescript: `openapi-generator-cli generate -i ${blueprintsOpenapiUrl} -g typescript-axios -o ./artifacts/sdk/blueprints/typescript`,
        python: `openapi-generator-cli generate -i ${blueprintsOpenapiUrl} -g python -o ./artifacts/sdk/blueprints/python`,
      },
      roleBased: {
        note: 'Use /api/documentation/sdk/:roleId for role-scoped APIs',
        template: `${host}/api/documentation/openapi/{roleId}`,
      },
    };

    res.json({
      message:
        'SDK generation helper. Use this info or POST to this endpoint to generate SDKs server-side.',
      blueprints: {
        openapiUrl: blueprintsOpenapiUrl,
        commands: examples.blueprints,
      },
      roleBased: examples.roleBased,
    });
  } catch (err) {
    logger.error('SDK root info error', { error: err.message });
    res.status(500).json({ error: { message: 'Failed to build SDK helper info.' } });
  }
});

// GET: Provide SDK generation info and quick commands for role-based OpenAPI
router.get('/:roleId', async (req, res) => {
  try {
    const { roleId } = req.params;

    // Validate roleId to prevent path traversal attacks
    validatePathInput(roleId, 'roleId');
    const host = `${req.protocol}://${req.get('host')}`;

    // We can’t assume documentation routes are mounted; provide a conventional URL
    const openapiUrl = `${host}/api/documentation/openapi/${roleId}`;
    const blueprintsOpenapiUrl = `${host}/api/documentation/blueprints/openapi`;

    const examples = {
      typescript: `openapi-generator-cli generate -i ${openapiUrl} -g typescript-axios -o ./artifacts/sdk/${roleId}/typescript`,
      python: `openapi-generator-cli generate -i ${openapiUrl} -g python -o ./artifacts/sdk/${roleId}/python`,
      docker: `docker run --rm -v ${process.cwd().replace(/\\/g, '/')}:/local openapitools/openapi-generator-cli generate -i /local/server/openapi-${roleId}.json -g typescript-axios -o /local/artifacts/sdk/${roleId}/typescript`,
    };

    res.json({
      roleId,
      openapiUrl,
      message:
        'Use the commands below or POST to this endpoint to generate SDKs server-side if openapi-generator-cli is installed.',
      commands: examples,
      blueprints: {
        openapiUrl: blueprintsOpenapiUrl,
        commands: {
          typescript: `openapi-generator-cli generate -i ${blueprintsOpenapiUrl} -g typescript-axios -o ./artifacts/sdk/blueprints/typescript`,
          python: `openapi-generator-cli generate -i ${blueprintsOpenapiUrl} -g python -o ./artifacts/sdk/blueprints/python`,
        },
      },
      notes: [
        'If /api/documentation/openapi/:roleId is not enabled, supply openapiUrl in POST body or enable documentation routes.',
        'Server-side generation requires openapi-generator-cli available on PATH or OPENAPI_GENERATOR_CLI env var.',
      ],
    });
  } catch (err) {
    if (err.message.includes('invalid characters')) {
      logger.warn('Path traversal attempt detected in GET route', {
        roleId: req.params.roleId,
        error: err.message,
        ip: req.ip,
      });
      return res.status(400).json({
        error: {
          message: err.message,
        },
      });
    }
    logger.error('SDK info error', { error: err.message });
    res.status(500).json({ error: { message: 'Failed to build SDK info.' } });
  }
});

// POST: Generate SDK on server if the generator is available
// Body: { lang: 'typescript'|'python'|'java'|'csharp', openapiUrl?: string, openapiSpec?: object }
router.post('/:roleId', express.json({ limit: '2mb' }), async (req, res) => {
  const { roleId } = req.params;
  const { lang = 'typescript', openapiUrl, openapiSpec } = req.body || {};

  try {
    // Validate inputs to prevent path traversal attacks
    validatePathInput(roleId, 'roleId');
    validatePathInput(lang, 'lang');
  } catch (validationError) {
    logger.warn('Path traversal attempt detected', {
      roleId,
      lang,
      error: validationError.message,
      ip: req.ip,
    });
    return res.status(400).json({
      error: {
        message: validationError.message,
      },
    });
  }

  const langMap = {
    typescript: 'typescript-axios',
    python: 'python',
    java: 'java',
    csharp: 'csharp',
  };
  const generatorName = langMap[lang] || 'typescript-axios';

  try {
    // Resolve OpenAPI spec
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nectar-sdk-'));
    const specPath = path.join(tmpDir, `openapi-${roleId}.json`);

    if (openapiSpec) {
      fs.writeFileSync(specPath, JSON.stringify(openapiSpec, null, 2), 'utf8');
    } else {
      // Build default URL if none provided
      const host = `${req.protocol}://${req.get('host')}`;
      const url = openapiUrl || `${host}/api/documentation/openapi/${roleId}`;
      const resp = await axios.get(url, { timeout: 15000 });
      fs.writeFileSync(specPath, JSON.stringify(resp.data, null, 2), 'utf8');
    }

    // Determine generator binary
    const cliPath = process.env.OPENAPI_GENERATOR_CLI || 'openapi-generator-cli';
    const outDir = path.join(process.cwd(), 'artifacts', 'sdk', roleId, lang);
    fs.mkdirSync(outDir, { recursive: true });

    // Spawn generator
    const args = ['generate', '-i', specPath, '-g', generatorName, '-o', outDir];
    const child = spawn(cliPath, args, { stdio: 'pipe', shell: true });

    let stderr = '';
    child.stderr.on('data', d => (stderr += d.toString()));

    child.on('close', code => {
      if (code === 0) {
        return res.json({
          roleId,
          lang,
          outputDir: outDir,
          message: 'SDK generated successfully.',
        });
      }
      logger.warn('SDK generation failed', { code, stderr });
      return res.status(501).json({
        error: {
          message:
            'openapi-generator-cli not available or generation failed. Install it or set OPENAPI_GENERATOR_CLI, then retry.',
          stderr,
          suggested:
            'npm i -g @openapitools/openapi-generator-cli OR use Docker image openapitools/openapi-generator-cli',
        },
      });
    });
  } catch (err) {
    logger.error('SDK generation error', { error: err.message });
    return res.status(500).json({ error: { message: err.message } });
  }
});

module.exports = router;

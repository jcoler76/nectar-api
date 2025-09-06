const express = require('express');
const router = express.Router();
const PrismaSchemaGenerator = require('../services/PrismaSchemaGenerator');
const GraphQLSchemaGenerator = require('../services/GraphQLSchemaGenerator');
const AIDocumentationService = require('../services/AIDocumentationService');

/**
 * AI Schema Generation Routes
 * Endpoints for generating Prisma schemas, GraphQL schemas, and AI documentation
 */

/**
 * POST /api/ai-schema/prisma/generate
 * Generate Prisma schema from Template20 intelligence
 */
router.post('/prisma/generate', async (req, res) => {
  try {
    const options = {
      includeRelationships: req.body.includeRelationships !== false,
      includeComments: req.body.includeComments !== false,
      generateMultipleSchemas: req.body.generateMultipleSchemas !== false,
      optimizeForAI: req.body.optimizeForAI !== false,
    };

    const generator = new PrismaSchemaGenerator();
    const result = await generator.generateSchemaFromIntelligence(options);

    res.json({
      success: true,
      message: 'Prisma schema generated successfully',
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Prisma schema generation failed:', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Prisma schema generation failed',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/ai-schema/graphql/generate
 * Generate GraphQL schema from Template20 intelligence
 */
router.post('/graphql/generate', async (req, res) => {
  try {
    const options = {
      generateResolvers: req.body.generateResolvers !== false,
      generateFederation: req.body.generateFederation || false,
      includeDocumentation: req.body.includeDocumentation !== false,
      optimizeForAI: req.body.optimizeForAI !== false,
      includeProcedureResolvers: req.body.includeProcedureResolvers !== false,
    };

    const generator = new GraphQLSchemaGenerator();
    const result = await generator.generateFromIntelligence(options);

    res.json({
      success: true,
      message: 'GraphQL schema generated successfully',
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('GraphQL schema generation failed:', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'GraphQL schema generation failed',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/ai-schema/documentation/generate
 * Generate AI-powered documentation for stored procedures
 */
router.post('/documentation/generate', async (req, res) => {
  try {
    const options = {
      entityFilter: req.body.entityFilter || null,
      minConfidence: req.body.minConfidence || 0.7,
      includeParameters: req.body.includeParameters !== false,
      includeBusinessContext: req.body.includeBusinessContext !== false,
      generateExamples: req.body.generateExamples !== false,
      batchSize: req.body.batchSize || 5,
    };

    const docService = new AIDocumentationService();
    const result = await docService.generateProcedureDocumentation(options);

    res.json({
      success: true,
      message: 'AI documentation generated successfully',
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('AI documentation generation failed:', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'AI documentation generation failed',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/ai-schema/generate-all
 * Generate all schemas and documentation in one operation
 */
router.post('/generate-all', async (req, res) => {
  try {
    const results = {
      prisma: null,
      graphql: null,
      documentation: null,
      errors: [],
    };

    const startTime = Date.now();

    // Generate Prisma schema
    if (req.body.generatePrisma !== false) {
      try {
        logger.info('Generating Prisma schema...');
        const prismaGenerator = new PrismaSchemaGenerator();
        results.prisma = await prismaGenerator.generateSchemaFromIntelligence({
          includeRelationships: true,
          includeComments: true,
          generateMultipleSchemas: true,
          optimizeForAI: true,
        });
      } catch (error) {
        results.errors.push({ service: 'prisma', error: error.message });
      }
    }

    // Generate GraphQL schema
    if (req.body.generateGraphQL !== false) {
      try {
        logger.info('Generating GraphQL schema...');
        const graphqlGenerator = new GraphQLSchemaGenerator();
        results.graphql = await graphqlGenerator.generateFromIntelligence({
          generateResolvers: true,
          generateFederation: false,
          includeDocumentation: true,
          optimizeForAI: true,
          includeProcedureResolvers: true,
        });
      } catch (error) {
        results.errors.push({ service: 'graphql', error: error.message });
      }
    }

    // Generate AI documentation
    if (req.body.generateDocumentation !== false) {
      try {
        logger.info('Generating AI documentation...');
        const docService = new AIDocumentationService();
        results.documentation = await docService.generateProcedureDocumentation({
          minConfidence: req.body.minConfidence || 0.7,
          batchSize: req.body.batchSize || 3, // Smaller batch for full generation
        });
      } catch (error) {
        results.errors.push({ service: 'documentation', error: error.message });
      }
    }

    const duration = Date.now() - startTime;
    const successCount = [results.prisma, results.graphql, results.documentation].filter(
      r => r && r.success
    ).length;

    res.json({
      success: successCount > 0,
      message: `Generated ${successCount}/3 schemas successfully`,
      results,
      duration,
      summary: {
        prismaGenerated: results.prisma?.success || false,
        graphqlGenerated: results.graphql?.success || false,
        documentationGenerated: results.documentation?.success || false,
        errorsCount: results.errors.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Schema generation batch failed:', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Schema generation batch failed',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/ai-schema/status
 * Get status of generated schemas and documentation
 */
router.get('/status', async (req, res) => {
  try {
    const fs = require('fs').promises;
    const path = require('path');

    const status = {
      prisma: {
        exists: false,
        path: null,
        lastModified: null,
        entitySchemas: [],
      },
      graphql: {
        exists: false,
        path: null,
        lastModified: null,
        files: [],
      },
      documentation: {
        exists: false,
        path: null,
        lastModified: null,
        procedureCount: 0,
      },
    };

    // Check Prisma schema
    try {
      const prismaPath = path.join(__dirname, '../prisma/schema.prisma');
      const prismaStat = await fs.stat(prismaPath);
      status.prisma.exists = true;
      status.prisma.path = prismaPath;
      status.prisma.lastModified = prismaStat.mtime;

      // Check for entity-specific schemas
      const generatedPath = path.join(__dirname, '../prisma/generated');
      try {
        const files = await fs.readdir(generatedPath);
        status.prisma.entitySchemas = files.filter(f => f.endsWith('.prisma'));
      } catch (e) {
        // Generated directory doesn't exist yet
      }
    } catch (e) {
      // Prisma schema doesn't exist
    }

    // Check GraphQL schema
    try {
      const graphqlPath = path.join(__dirname, '../graphql/generated');
      const files = await fs.readdir(graphqlPath);
      status.graphql.exists = files.length > 0;
      status.graphql.path = graphqlPath;
      status.graphql.files = files;

      if (files.length > 0) {
        const indexStat = await fs.stat(path.join(graphqlPath, 'index.js'));
        status.graphql.lastModified = indexStat.mtime;
      }
    } catch (e) {
      // GraphQL directory doesn't exist
    }

    // Check documentation
    try {
      const docsPath = path.join(__dirname, '../docs/generated');
      const indexPath = path.join(docsPath, 'index.json');

      const indexStat = await fs.stat(indexPath);
      status.documentation.exists = true;
      status.documentation.path = docsPath;
      status.documentation.lastModified = indexStat.mtime;

      const indexContent = await fs.readFile(indexPath, 'utf8');
      const indexData = JSON.parse(indexContent);
      status.documentation.procedureCount = indexData.procedures?.length || 0;
    } catch (e) {
      // Documentation doesn't exist
    }

    res.json({
      success: true,
      status,
      recommendations: generateRecommendations(status),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Status check failed:', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to check schema status',
      error: error.message,
    });
  }
});

/**
 * DELETE /api/ai-schema/clean
 * Clean up generated schemas and documentation
 */
router.delete('/clean', async (req, res) => {
  try {
    const fs = require('fs').promises;
    const path = require('path');

    const cleanupResults = {
      prisma: false,
      graphql: false,
      documentation: false,
      errors: [],
    };

    // Clean Prisma generated files
    if (req.body.cleanPrisma !== false) {
      try {
        const generatedPath = path.join(__dirname, '../prisma/generated');
        await fs.rm(generatedPath, { recursive: true, force: true });
        cleanupResults.prisma = true;
      } catch (error) {
        cleanupResults.errors.push({ service: 'prisma', error: error.message });
      }
    }

    // Clean GraphQL generated files
    if (req.body.cleanGraphQL !== false) {
      try {
        const generatedPath = path.join(__dirname, '../graphql/generated');
        await fs.rm(generatedPath, { recursive: true, force: true });
        cleanupResults.graphql = true;
      } catch (error) {
        cleanupResults.errors.push({ service: 'graphql', error: error.message });
      }
    }

    // Clean documentation files
    if (req.body.cleanDocumentation !== false) {
      try {
        const generatedPath = path.join(__dirname, '../docs/generated');
        await fs.rm(generatedPath, { recursive: true, force: true });
        cleanupResults.documentation = true;
      } catch (error) {
        cleanupResults.errors.push({ service: 'documentation', error: error.message });
      }
    }

    res.json({
      success: cleanupResults.errors.length === 0,
      message: 'Cleanup completed',
      cleanupResults,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Cleanup failed:', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Cleanup failed',
      error: error.message,
    });
  }
});

// Helper function
function generateRecommendations(status) {
  const recommendations = [];

  if (!status.prisma.exists) {
    recommendations.push({
      action: 'generate_prisma',
      priority: 'high',
      description: 'Generate Prisma schema for type-safe database access',
    });
  }

  if (!status.graphql.exists) {
    recommendations.push({
      action: 'generate_graphql',
      priority: 'high',
      description: 'Generate GraphQL schema for AI coding assistants',
    });
  }

  if (!status.documentation.exists) {
    recommendations.push({
      action: 'generate_documentation',
      priority: 'medium',
      description: 'Generate AI-powered stored procedure documentation',
    });
  }

  if (status.prisma.exists && status.graphql.exists && status.documentation.exists) {
    recommendations.push({
      action: 'setup_integrations',
      priority: 'low',
      description: 'Set up VS Code/Cursor integrations with generated schemas',
    });
  }

  return recommendations;
}

/**
 * GET /api/ai-schema/view/prisma
 * View Prisma schema content
 */
router.get('/view/prisma', async (req, res) => {
  try {
    const fs = require('fs').promises;
    const path = require('path');

    const schemaPath = path.join(__dirname, '../prisma/schema.prisma');

    try {
      const content = await fs.readFile(schemaPath, 'utf8');
      const stats = await fs.stat(schemaPath);

      res.json({
        success: true,
        data: {
          content,
          path: 'server/prisma/schema.prisma',
          lastModified: stats.mtime,
          size: stats.size,
        },
      });
    } catch (error) {
      if (error.code === 'ENOENT') {
        return res.status(404).json({
          success: false,
          message: 'Prisma schema not found. Please generate it first.',
        });
      }
      throw error;
    }
  } catch (error) {
    logger.error('Error reading Prisma schema:', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to read Prisma schema',
      error: error.message,
    });
  }
});

/**
 * GET /api/ai-schema/view/graphql/:filename?
 * View GraphQL schema content
 */
router.get('/view/graphql/:filename?', async (req, res) => {
  try {
    const fs = require('fs').promises;
    const path = require('path');

    const filename = req.params.filename || 'typeDefs.graphql';
    const schemaPath = path.join(__dirname, '../graphql/generated', filename);

    try {
      const content = await fs.readFile(schemaPath, 'utf8');
      const stats = await fs.stat(schemaPath);

      res.json({
        success: true,
        data: {
          content,
          filename,
          path: `server/graphql/generated/${filename}`,
          lastModified: stats.mtime,
          size: stats.size,
        },
      });
    } catch (error) {
      if (error.code === 'ENOENT') {
        return res.status(404).json({
          success: false,
          message: `GraphQL file '${filename}' not found. Please generate it first.`,
        });
      }
      throw error;
    }
  } catch (error) {
    logger.error('Error reading GraphQL schema:', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to read GraphQL schema',
      error: error.message,
    });
  }
});

/**
 * GET /api/ai-schema/view/documentation/:filename?
 * View AI-generated documentation content
 */
router.get('/view/documentation/:filename?', async (req, res) => {
  try {
    const fs = require('fs').promises;
    const path = require('path');
    const { logger } = require('../middleware/logger');

    const filename = req.params.filename || 'index.json';
    const docPath = path.join(__dirname, '../docs/generated', filename);

    try {
      const content = await fs.readFile(docPath, 'utf8');
      const stats = await fs.stat(docPath);

      let parsedContent = content;
      if (filename.endsWith('.json')) {
        try {
          parsedContent = JSON.parse(content);
        } catch (e) {
          // Keep as string if not valid JSON
        }
      }

      res.json({
        success: true,
        data: {
          content: parsedContent,
          filename,
          path: `server/docs/generated/${filename}`,
          lastModified: stats.mtime,
          size: stats.size,
        },
      });
    } catch (error) {
      if (error.code === 'ENOENT') {
        return res.status(404).json({
          success: false,
          message: `Documentation file '${filename}' not found. Please generate it first.`,
        });
      }
      throw error;
    }
  } catch (error) {
    logger.error('Error reading documentation:', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to read documentation',
      error: error.message,
    });
  }
});

module.exports = router;

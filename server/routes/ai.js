const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const { asyncHandler, errorResponses } = require('../utils/errorHandler');
const { logger } = require('../middleware/logger');
const AISecurityMiddleware = require('../middleware/aiSecurity');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function analyzeStoredProcedure(definition) {
  const operationType = {
    isSelect: /SELECT.*FROM/i.test(definition),
    isInsert: /INSERT\s+INTO/i.test(definition),
    isUpdate: /UPDATE.*SET/i.test(definition),
    isDelete: /DELETE\s+FROM/i.test(definition),
  };

  // Extract affected tables
  const tableMatches = definition.match(/(?:FROM|INTO|UPDATE)\s+([^\s,;]+)/gi) || [];
  const tables = tableMatches.map(match => match.replace(/(?:FROM|INTO|UPDATE)/i, '').trim());

  // Extract columns for different operations
  let columns = [];
  if (operationType.isSelect) {
    const selectMatches = definition.match(/SELECT(.*?)FROM/gi) || [];
    columns = selectMatches
      .map(match =>
        match
          .replace(/SELECT/i, '')
          .replace(/FROM/i, '')
          .trim()
          .split(',')
          .map(col => col.trim().split(' ').pop())
      )
      .flat();
  } else if (operationType.isInsert) {
    const insertMatch = definition.match(/INSERT\s+INTO\s+\w+\s*\((.*?)\)/i);
    if (insertMatch) {
      columns = insertMatch[1].split(',').map(col => col.trim());
    }
  }

  // Extract error handling
  const errorHandling = {
    hasErrorHandling: /RAISERROR|THROW|TRY|CATCH/i.test(definition),
    errorCodes: (definition.match(/RAISERROR\s*\(.*?(\d+).*?\)/g) || [])
      .map(match => {
        const code = match.match(/\d+/);
        return code ? parseInt(code[0]) : null;
      })
      .filter(code => code !== null),
  };

  return {
    operationType,
    tables,
    columns,
    errorHandling,
  };
}

function generateExampleResponse(analysis, procedureName) {
  const { operationType, tables, errorHandling } = analysis;

  const successResponse = {
    isSelect: {
      status: 'success',
      resultSet: [
        {
          ...analysis.columns.reduce(
            (acc, col) => ({
              ...acc,
              [col]: 'sample value',
            }),
            {}
          ),
        },
      ],
    },
    isInsert: {
      status: 'success',
      affectedRows: 1,
      insertedId: 12345,
      message: `Successfully inserted record into ${tables[0]}`,
    },
    isUpdate: {
      status: 'success',
      affectedRows: 5,
      message: `Successfully updated ${tables[0]}`,
    },
    isDelete: {
      status: 'success',
      affectedRows: 3,
      message: `Successfully deleted records from ${tables[0]}`,
    },
  };

  const errorResponse = {
    status: 'error',
    errorCode: errorHandling.errorCodes[0] || 50000,
    message: 'Sample error message',
    details: {
      procedure: procedureName,
      severity: 16,
      state: 1,
    },
  };

  return {
    success: successResponse[Object.keys(operationType).find(key => operationType[key])] || {
      status: 'success',
      message: `Successfully executed ${procedureName}`,
    },
    error: errorResponse,
  };
}

// Apply AI security middleware to documentation endpoints
router.post('/generate-samples', AISecurityMiddleware.forDocumentation(), async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        message: 'OpenAI API key not configured',
        useDefault: true,
      });
    }

    const { procedureName, definition, parameters } = req.body;
    const analysis = analyzeStoredProcedure(definition);

    const systemPrompt = `You are a SQL stored procedure documentation assistant.
    Your task is to generate sample JSON responses for both success and error cases.
    ONLY respond with a JSON object containing 'success' and 'error' examples.
    DO NOT include any explanatory text or markdown - ONLY valid JSON.`;

    const userPrompt = `Generate sample success and error responses for this stored procedure:
    Name: ${procedureName}
    Operation: ${Object.keys(analysis.operationType).find(key => analysis.operationType[key])}
    Tables: ${analysis.tables.join(', ')}
    Columns: ${analysis.columns.join(', ')}
    Error Codes: ${analysis.errorHandling.errorCodes.join(', ') || 'Standard SQL Server errors'}

    Response must be a JSON object with this exact structure:
    {
      "success": { /* successful response */ },
      "error": { /* error response */ }
    }

    For success responses:
    - SELECT: Include resultSet array
    - INSERT: Include affectedRows and insertedId
    - UPDATE/DELETE: Include affectedRows
    - All: Include status and message

    For error responses:
    - Include errorCode, status="error", message
    - Include procedure name and SQL Server error details
    - Use actual error codes from the procedure if available`;

    logger.info('Generating AI sample for:', procedureName);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1000,
      response_format: { type: 'json_object' },
    });

    let sampleData;
    try {
      sampleData = JSON.parse(completion.choices[0].message.content);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      sampleData = generateExampleResponse(analysis, procedureName);
    }

    res.json({
      samples: sampleData,
      metadata: {
        operationType: Object.entries(analysis.operationType)
          .filter(([_, value]) => value)
          .map(([key]) => key)[0],
        affectedTables: analysis.tables,
        errorHandling: analysis.errorHandling,
      },
    });
  } catch (error) {
    logger.error('AI sample generation error:', { error: error.message });
    errorResponses.serverError(res, error);
  }
});

// Understand business question endpoint
router.post('/understand-business-question', async (req, res) => {
  try {
    const { businessQuestion, serviceName = 'salesdemo', environment } = req.body;

    if (!businessQuestion) {
      return res.status(400).json({
        success: false,
        error: 'Business question is required',
      });
    }

    // Business intelligence tools have been removed
    res.json({
      success: false,
      message:
        'Business Intelligence tools are no longer available. This feature has been removed.',
    });
  } catch (error) {
    logger.error('Error understanding business question:', { error: error.message });
    errorResponses.serverError(res, error);
  }
});

// Discover business capabilities endpoint
router.post('/discover-business-capabilities', async (req, res) => {
  try {
    const { domain = 'all', serviceName = 'salesdemo', environment } = req.body;

    // Business intelligence tools have been removed
    res.json({
      success: false,
      message:
        'Business Intelligence tools are no longer available. This feature has been removed.',
    });
  } catch (error) {
    logger.error('Error discovering business capabilities:', { error: error.message });
    errorResponses.serverError(res, error);
  }
});

// Build intelligent query endpoint
router.post('/build-intelligent-query', async (req, res) => {
  try {
    const {
      requirement,
      timeframe = 'past_year',
      grouping = 'by_customer',
      serviceName = 'salesdemo',
      environment,
    } = req.body;

    if (!requirement) {
      return res.status(400).json({
        success: false,
        error: 'Requirement is required',
      });
    }

    // Business intelligence tools have been removed
    res.json({
      success: false,
      message:
        'Business Intelligence tools are no longer available. This feature has been removed.',
    });
  } catch (error) {
    logger.error('Error building intelligent query:', { error: error.message });
    errorResponses.serverError(res, error);
  }
});

// Get business domain help endpoint
router.post('/get-business-domain-help', async (req, res) => {
  try {
    const { domain } = req.body;

    if (!domain) {
      return res.status(400).json({
        success: false,
        error: 'Domain is required',
      });
    }

    // Business intelligence tools have been removed
    res.json({
      success: false,
      message:
        'Business Intelligence tools are no longer available. This feature has been removed.',
    });
  } catch (error) {
    logger.error('Error getting business domain help:', { error: error.message });
    errorResponses.serverError(res, error);
  }
});

// Natural Language Query endpoint - main interface for BI queries
router.post(
  '/nl-query',
  AISecurityMiddleware.forGeneral(),
  asyncHandler(async (req, res) => {
    try {
      const { query, serviceName, context = {} } = req.body;

      if (!query) {
        return res.status(400).json({
          success: false,
          error: 'Query is required',
        });
      }

      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({
          success: false,
          error: 'AI service not configured',
        });
      }

      // SECURITY: Ensure user is authenticated and has organization access
      const userOrganizationId = req.user?.organizationId;
      if (!userOrganizationId) {
        return res.status(403).json({
          success: false,
          error: 'User must belong to an organization to use AI queries',
        });
      }

      // Get available data schema for context (organization-scoped)
      const schemaContext = await getAvailableSchemaContext(serviceName, userOrganizationId);

      const systemPrompt = `You are a business intelligence assistant that converts natural language questions into database queries.

Available data schema:
${JSON.stringify(schemaContext, null, 2)}

Your task is to:
1. Understand the business intent
2. Generate appropriate database query (SQL or MongoDB)
3. Provide clear visualization suggestions
4. Return structured JSON response

Response format:
{
  "query": "generated database query",
  "queryType": "sql|mongodb",
  "visualization": {
    "type": "chart|table|metric",
    "chartType": "line|bar|pie|area",
    "xAxis": "field name",
    "yAxis": "field name"
  },
  "explanation": "what this query does",
  "sampleResult": "example of expected data structure"
}`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Natural language query: "${query}"` },
        ],
        temperature: 0.3,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(completion.choices[0].message.content);

      // Execute the query if it's safe and valid (organization-scoped)
      let queryResult = null;
      if (result.query && isQuerySafe(result.query)) {
        try {
          queryResult = await executeQuery(
            result.query,
            result.queryType,
            serviceName,
            userOrganizationId
          );
        } catch (queryError) {
          logger.warn('Query execution failed:', queryError.message);
          result.executionError = queryError.message;
        }
      }

      res.json({
        success: true,
        data: {
          nlQuery: query,
          generatedQuery: result.query,
          queryType: result.queryType,
          visualization: result.visualization,
          explanation: result.explanation,
          sampleResult: result.sampleResult,
          actualResult: queryResult,
          executionError: result.executionError,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Error in NL query endpoint:', { error: error.message });
      errorResponses.serverError(res, error);
    }
  })
);

// Chat endpoint - simplified version for basic interactions
router.post('/chat', AISecurityMiddleware.forGeneral(), async (req, res) => {
  try {
    const { message, context = {} } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required',
      });
    }

    // For now, redirect to nl-query for better handling
    if (
      message.includes('?') ||
      message.toLowerCase().includes('show') ||
      message.toLowerCase().includes('get')
    ) {
      return res.redirect(307, '/api/ai/nl-query');
    }

    res.json({
      success: true,
      data: {
        response:
          'I can help you analyze your business data. Try asking questions like "Show me top customers" or "What are our sales trends?"',
        suggestions: generateDefaultSuggestions(),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Error in chat endpoint:', { error: error.message });
    errorResponses.serverError(res, error);
  }
});

/**
 * Parse business intelligence tool response into structured data
 */
function parseBusinessIntelligenceResponse(result) {
  try {
    if (!result || !result.content) {
      return { error: 'No content in response' };
    }

    const content = Array.isArray(result.content) ? result.content[0]?.text : result.content;
    if (!content) {
      return { error: 'No text content found' };
    }

    // Extract structured information from the response text
    const analysis = {
      rawContent: content,
      suggestions: [],
    };

    // Extract business domain
    const domainMatch = content.match(/\*\*Business Domain:\*\*\s*([^\n]+)/);
    if (domainMatch) {
      analysis.businessDomain = domainMatch[1].trim();
    }

    // Extract business concept
    const conceptMatch = content.match(/\*\*Business Concept:\*\*\s*([^\n]+)/);
    if (conceptMatch) {
      analysis.concept = conceptMatch[1].trim();
    }

    // Extract recommended approach
    const approachMatch = content.match(/\*\*Recommended Approach:\*\*\s*([^#]+)/);
    if (approachMatch) {
      analysis.recommendedApproach = approachMatch[1].trim();
    }

    // Extract GraphQL queries from code blocks
    const queryMatches = content.match(/```graphql\n([\s\S]*?)\n```/g);
    if (queryMatches) {
      analysis.queries = queryMatches.map(match =>
        match.replace(/```graphql\n/, '').replace(/\n```/, '')
      );
    }

    // Extract suggestions from sections like "Option 1:", "Option 2:", etc.
    const optionPattern =
      /### Option \d+: ([^\n]+)\n\n\*\*Why this matches:\*\* ([^\n]+)\n\n\*\*Business Logic:\*\* ([^\n]+)\n\n\*\*Sample GraphQL Query:\*\*\n```graphql\n([\s\S]*?)\n```\n\n\*\*Expected Data Structure:\*\*\n```json\n([\s\S]*?)\n```/g;

    let optionMatch;
    while ((optionMatch = optionPattern.exec(content)) !== null) {
      analysis.suggestions.push({
        procedure: optionMatch[1],
        reasoning: optionMatch[2],
        businessLogic: optionMatch[3],
        sampleQuery: optionMatch[4],
        expectedOutput: JSON.parse(optionMatch[5] || '{}'),
        confidence: 0.9,
      });
    }

    return analysis;
  } catch (error) {
    logger.error('Error parsing business intelligence response:', { error: error.message });
    return {
      error: 'Failed to parse response',
      rawContent: result?.content || 'No content',
    };
  }
}

/**
 * Extract executable GraphQL query from text
 */
function extractGraphQLQuery(queryText) {
  // Remove comments and extra whitespace
  let cleanQuery = queryText
    .replace(/\/\/ .*/g, '') // Remove single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();

  // Ensure it starts with query/mutation
  if (!cleanQuery.match(/^(query|mutation|subscription)/i)) {
    return null;
  }

  return cleanQuery;
}

/**
 * Extract variables from query text
 */
function extractVariables(queryText) {
  const variables = {};

  // Look for variable definitions like $startDate: String!
  const variablePattern = /\$(\w+):\s*(\w+!?)/g;
  let match;

  while ((match = variablePattern.exec(queryText)) !== null) {
    const varName = match[1];
    const varType = match[2];

    // Set default values based on type
    if (varType.includes('String')) {
      if (varName.includes('Date')) {
        variables[varName] = new Date().toISOString().split('T')[0];
      } else {
        variables[varName] = '';
      }
    } else if (varType.includes('Int')) {
      variables[varName] = 0;
    } else if (varType.includes('Boolean')) {
      variables[varName] = false;
    }
  }

  return variables;
}

/**
 * Get available schema context for AI query generation (organization-scoped)
 */
async function getAvailableSchemaContext(serviceName, organizationId) {
  try {
    const { PrismaClient } = require('../prisma/generated/client');
    const prisma = new PrismaClient();

    const context = {
      tables: [],
      commonFields: ['id', 'createdAt', 'updatedAt', 'name', 'email', 'status'],
      sampleQueries: [
        'SELECT COUNT(*) FROM users WHERE organizationId = ? AND status = "active"',
        'SELECT name, email FROM users WHERE organizationId = ? ORDER BY createdAt DESC LIMIT 10',
        'SELECT COUNT(*) as total FROM apiActivityLog WHERE organizationId = ? AND timestamp > NOW() - INTERVAL 7 DAY',
      ],
      organizationId, // Include for query scoping
    };

    // Get available tables/models from Prisma (only organization-accessible ones)
    if (prisma && organizationId) {
      context.tables = [
        'user',
        'service',
        'apiActivityLog',
        'workflow',
        'subscription',
        'usageMetric',
      ];

      // Add note about organization scoping
      context.securityNote = 'All queries must include organizationId filter for data isolation';
    }

    return context;
  } catch (error) {
    logger.error('Error getting schema context:', error.message);
    return { tables: [], commonFields: [], sampleQueries: [], organizationId };
  }
}

/**
 * Check if a query is safe to execute
 */
function isQuerySafe(query) {
  if (!query || typeof query !== 'string') return false;

  const dangerousPatterns = [
    /DROP\s+/i,
    /DELETE\s+/i,
    /UPDATE\s+/i,
    /INSERT\s+/i,
    /ALTER\s+/i,
    /CREATE\s+/i,
    /TRUNCATE\s+/i,
    /EXEC\s+/i,
    /EXECUTE\s+/i,
    /xp_/i,
    /sp_/i,
  ];

  return !dangerousPatterns.some(pattern => pattern.test(query));
}

/**
 * Execute a query safely with organization scoping
 */
async function executeQuery(query, queryType, serviceName, organizationId) {
  try {
    const { PrismaClient } = require('../prisma/generated/client');
    const prisma = new PrismaClient();

    // SECURITY: Validate that organizationId is provided
    if (!organizationId) {
      throw new Error('Organization ID is required for query execution');
    }

    if (queryType === 'sql') {
      // SECURITY: For SQL queries, validate that they include organization filtering
      if (!query.toLowerCase().includes('organizationid')) {
        throw new Error('SQL queries must include organizationId filter for security');
      }

      // Replace ? placeholders with actual organizationId (basic implementation)
      const parameterizedQuery = query.replace(/\?/g, `'${organizationId}'`);

      // Use Prisma raw query with limitations
      const result = await prisma.$queryRaw`${parameterizedQuery}`;
      return Array.isArray(result) ? result.slice(0, 100) : result; // Limit results
    } else if (queryType === 'mongodb') {
      // For MongoDB-style queries, convert to Prisma operations with organization filter
      return await executeMongoStyleQuery(query, prisma, organizationId);
    }

    return null;
  } catch (error) {
    logger.error('Query execution error:', error.message);
    throw new Error('Query execution failed: ' + error.message);
  }
}

/**
 * Execute MongoDB-style queries using Prisma with organization scoping
 */
async function executeMongoStyleQuery(queryString, prisma, organizationId) {
  try {
    // Parse basic MongoDB-style operations
    const query = JSON.parse(queryString);

    if (query.collection && query.operation) {
      const model = prisma[query.collection];
      if (!model) throw new Error('Invalid collection');

      // SECURITY: Always inject organizationId filter to prevent data leakage
      const secureFilter = {
        ...query.filter,
        organizationId: organizationId, // Force organization scoping
      };

      switch (query.operation) {
        case 'find':
          return await model.findMany({
            where: secureFilter,
            take: Math.min(query.limit || 50, 100),
            orderBy: query.sort || { createdAt: 'desc' },
          });
        case 'count':
          return await model.count({ where: secureFilter });
        case 'aggregate':
          // Basic aggregation support with organization filter
          const pipeline = query.pipeline || {};
          pipeline.where = { ...pipeline.where, organizationId };
          return await model.groupBy(pipeline);
        default:
          throw new Error('Unsupported operation');
      }
    }

    throw new Error('Invalid query format');
  } catch (error) {
    throw new Error('MongoDB query parsing failed: ' + error.message);
  }
}

/**
 * Generate default suggestions for chat
 */
function generateDefaultSuggestions() {
  return [
    {
      text: 'Show me API usage trends for the last 7 days',
      confidence: 0.9,
    },
    {
      text: 'How many active users do we have?',
      confidence: 0.9,
    },
    {
      text: 'What are the top performing workflows?',
      confidence: 0.8,
    },
    {
      text: 'Show me error rates by service',
      confidence: 0.8,
    },
    {
      text: 'Display subscription usage metrics',
      confidence: 0.7,
    },
  ];
}

module.exports = router;

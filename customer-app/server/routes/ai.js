const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const { asyncHandler, errorResponses } = require('../utils/errorHandler');
const { logger } = require('../middleware/logger');

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

router.post('/generate-samples', async (req, res) => {
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

// Chat endpoint - main interface for natural language business queries
router.post('/chat', async (req, res) => {
  try {
    const { message, context = {} } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required',
      });
    }

    // Business intelligence tools have been removed
    const analysis = {
      message:
        'Business Intelligence tools are no longer available. This feature has been removed.',
      suggestions: [],
    };

    // If we have a high-confidence suggestion, try to build a query
    if (analysis.suggestions && analysis.suggestions.length > 0) {
      const topSuggestion = analysis.suggestions[0];

      if (topSuggestion.confidence > 0.8 && topSuggestion.sampleQuery) {
        try {
          // Extract GraphQL query from the suggestion
          const graphqlQuery = extractGraphQLQuery(topSuggestion.sampleQuery);

          if (graphqlQuery) {
            analysis.suggestedQuery = graphqlQuery;
            analysis.variables = extractVariables(topSuggestion.sampleQuery);
          }
        } catch (queryError) {
          logger.info('Could not extract executable query:', queryError.message);
        }
      }
    }

    res.json({
      success: true,
      data: {
        response: analysis.businessDomain
          ? `I understand you're asking about **${analysis.businessDomain}**. ${analysis.concept || ''}`
          : 'I can help you analyze your business data.',
        analysis,
        suggestions: analysis.suggestions || generateDefaultSuggestions(),
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
 * Generate default suggestions for chat
 */
function generateDefaultSuggestions() {
  return [
    {
      text: 'Show me top customers by revenue',
      confidence: 0.8,
    },
    {
      text: "What's our current sales pipeline?",
      confidence: 0.8,
    },
    {
      text: 'Outstanding invoices report',
      confidence: 0.8,
    },
    {
      text: 'Customer acquisition trends',
      confidence: 0.8,
    },
  ];
}

module.exports = router;

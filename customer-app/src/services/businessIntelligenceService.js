import api from './api';

class BusinessIntelligenceService {
  /**
   * Ask a business question and get an intelligent response
   */
  async askBusinessQuestion(question, serviceName = 'salesdemo') {
    try {
      // Check if user is asking for actionable statements
      const isActionableRequest = this.isActionableRequest(question);

      // First, try to get an intelligent response from the MCP tools
      try {
        const response = await api.post('/ai/understand-business-question', {
          question,
          context: {
            serviceName: serviceName,
            environment: 'staging',
          },
        });

        if (response.data.success && response.data.data) {
          const analysis = response.data.data.analysis;

          if (analysis && analysis.suggestions && analysis.suggestions.length > 0) {
            const topSuggestion = analysis.suggestions[0];

            // If confidence is high, try to execute or suggest
            if (topSuggestion.confidence > 0.7) {
              if (isActionableRequest) {
                return this.formatActionableResponse(analysis, topSuggestion);
              } else {
                return this.tryExecuteIntelligentQuery(topSuggestion, question, serviceName);
              }
            }
          }
        }
      } catch (error) {
        // Fallback to simple queries if MCP tools are not available
      }

      // Fallback to our simple query generation
      return await this.tryFlexibleQuery(question, serviceName);
    } catch (error) {
      console.error('Error in askBusinessQuestion:', error);
      throw new Error(
        'I encountered an error while processing your question. Please try rephrasing it.'
      );
    }
  }

  /**
   * Check if the user is asking for actionable statements (data modification)
   */
  isActionableRequest(question) {
    const q = question.toLowerCase();

    // Keywords that indicate user wants action statements
    const actionKeywords = [
      'how to update',
      'how to insert',
      'how to delete',
      'how to add',
      'how to remove',
      'update query',
      'insert query',
      'delete query',
      'sql to update',
      'sql to insert',
      'sql to delete',
      'create sql',
      'write sql',
      'generate sql',
      'show sql for',
      'how would i',
      'what sql would',
      'give me sql',
      'provide sql',
    ];

    const modificationKeywords = [
      'update',
      'insert',
      'delete',
      'add',
      'remove',
      'create',
      'modify',
      'change',
    ];

    // Check for explicit action request keywords
    const hasActionKeywords = actionKeywords.some(keyword => q.includes(keyword));

    // Check for modification keywords combined with question words
    const hasModificationIntent =
      modificationKeywords.some(keyword => q.includes(keyword)) &&
      (q.includes('how') || q.includes('what') || q.includes('give') || q.includes('show'));

    return hasActionKeywords || hasModificationIntent;
  }

  /**
   * Try to execute an intelligent query from MCP analysis
   */
  async tryExecuteIntelligentQuery(suggestion, originalQuestion, serviceName = 'salesdemo') {
    try {
      // Extract SQL or GraphQL from the suggestion
      let query = null;

      if (suggestion.sampleQuery) {
        // Try to extract SQL from GraphQL or direct SQL
        query = this.extractExecutableSQL(suggestion.sampleQuery);
      }

      if (!query) {
        throw new Error('No executable query found in suggestion');
      }

      const response = await api.post('/graphql', {
        query: `
          query ExecuteQuery($query: String!, $serviceName: String!) {
            executeQuery(input: {
              query: $query
              serviceName: $serviceName
            }) {
              success
              data
              error
              recordCount
              safetyInfo {
                canExecute
                executableStatements
                actionableStatements {
                  sql
                  type
                  description
                }
                warnings
              }
            }
          }
        `,
        variables: {
          query: query,
          serviceName: serviceName,
        },
      });

      const result = response.data.data?.executeQuery;

      if (result?.success) {
        return {
          content: `Here's what I found for "${originalQuestion}":\n\n${suggestion.businessLogic || suggestion.reasoning}`,
          data: result.data,
          queryGenerated: query,
          suggestions: this.getRelatedSuggestions(suggestion.procedure),
          type: 'data_analysis',
        };
      } else if (result?.safetyInfo) {
        return this.formatSafetyResponse(result.safetyInfo, originalQuestion);
      }

      throw new Error(result?.error || 'Query execution failed');
    } catch (error) {
      console.error('Intelligent query execution failed:', error);
      throw error;
    }
  }

  /**
   * Try flexible query with safety controls
   */
  async tryFlexibleQuery(question, serviceName = 'salesdemo') {
    const possibleQueries = this.generateSimpleQueries(question);

    for (const queryInfo of possibleQueries) {
      try {
        const response = await api.post('/graphql', {
          query: `
            query ExecuteQuery($query: String!, $serviceName: String!) {
              executeQuery(input: {
                query: $query
                serviceName: $serviceName
              }) {
                success
                data
                error
                recordCount
                safetyInfo {
                  canExecute
                  executableStatements
                  actionableStatements {
                    sql
                    type
                    description
                  }
                  warnings
                }
              }
            }
          `,
          variables: {
            query: queryInfo.sql,
            serviceName: serviceName,
          },
        });

        const result = response.data.data?.executeQuery;

        if (result?.success) {
          return {
            content: `Here's what I found for "${question}":\n\n${queryInfo.description}`,
            data: result.data,
            queryGenerated: queryInfo.sql,
            suggestions: this.getRelatedSuggestions(queryInfo.type),
            type: 'data_analysis',
          };
        } else if (result?.safetyInfo) {
          return this.formatSafetyResponse(result.safetyInfo, question);
        }
      } catch (error) {
        // Query attempt failed, trying next option
        continue;
      }
    }

    throw new Error('No suitable query found');
  }

  /**
   * Format response when actionable statements are requested
   */
  formatActionableResponse(analysis, suggestion) {
    const actionableSQL = this.generateActionableSQL(suggestion);

    return {
      content: `I understand you want actionable SQL statements. Here are some examples based on your question:`,
      type: 'actionable_sql',
      actionableStatements: actionableSQL,
      queryGenerated: null, // No execution
      suggestions: [
        'Show me how to add a new customer',
        'How to update customer information',
        'SQL to delete old records',
        'How to insert a new order',
      ],
    };
  }

  /**
   * Format response when queries can't be executed due to safety
   */
  formatSafetyResponse(safetyInfo, originalQuestion) {
    return {
      content: `I can help you with "${originalQuestion}", but this would require data modification statements that I cannot execute automatically for safety reasons.`,
      type: 'safety_blocked',
      safetyInfo: safetyInfo,
      queryGenerated: null,
      suggestions: [
        'Show me current data instead',
        'How to view related information',
        'Generate read-only reports',
        'Provide actionable SQL statements',
      ],
    };
  }

  /**
   * Generate actionable SQL statements for common business operations
   */
  generateActionableSQL(suggestion) {
    const statements = [];

    // Example actionable statements based on business context
    if (suggestion.procedure?.toLowerCase().includes('customer')) {
      statements.push({
        type: 'INSERT',
        description: 'Add a new customer',
        sql: `
INSERT INTO gsCustomers (customer, firstName, lastName, email, phone, dateadded)
VALUES ('New Company Inc', 'John', 'Doe', 'john.doe@newcompany.com', '555-1234', GETDATE())
        `.trim(),
        warning: 'Review all required fields before executing',
      });

      statements.push({
        type: 'UPDATE',
        description: 'Update customer contact information',
        sql: `
UPDATE gsCustomers 
SET email = 'newemail@company.com',
    phone = '555-9999'
WHERE gsCustomersID = 123
        `.trim(),
        warning: 'Always specify WHERE clause to avoid updating all records',
      });
    }

    if (
      suggestion.procedure?.toLowerCase().includes('sales') ||
      suggestion.procedure?.toLowerCase().includes('revenue')
    ) {
      statements.push({
        type: 'INSERT',
        description: 'Create a new sales opportunity',
        sql: `
INSERT INTO tblSalesOpportunity (gsCustomersID, Amount, CloseDate, AssignedTo, Description)
VALUES (123, 50000.00, '2025-03-01', 456, 'New product opportunity')
        `.trim(),
        warning: 'Ensure customer and employee IDs exist',
      });

      statements.push({
        type: 'UPDATE',
        description: 'Mark opportunity as won',
        sql: `
UPDATE tblSalesOpportunity 
SET isWon = 1,
    CloseDate = GETDATE()
WHERE ID = 789
        `.trim(),
        warning: 'Verify opportunity ID before updating',
      });
    }

    return statements;
  }

  /**
   * Extract executable SQL from various formats
   */
  extractExecutableSQL(queryText) {
    // Remove GraphQL wrapper if present
    let sql = queryText;

    // Extract from GraphQL query blocks
    const graphqlMatch = queryText.match(/executeQuery\s*\(\s*input:\s*\{\s*query:\s*"([^"]+)"/);
    if (graphqlMatch) {
      sql = graphqlMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n');
    }

    // Extract from SQL code blocks
    const sqlMatch = queryText.match(/```sql\n([\s\S]*?)\n```/);
    if (sqlMatch) {
      sql = sqlMatch[1];
    }

    return sql.trim();
  }

  /**
   * Generate simple queries based on question content
   */
  generateSimpleQueries(question) {
    const q = question.toLowerCase();
    const queries = [];

    // Customer-related queries
    if (q.includes('customer') || q.includes('client')) {
      if (q.includes('revenue') || q.includes('money') || q.includes('payment')) {
        queries.push({
          type: 'customer_revenue',
          description: 'Customer revenue analysis',
          sql: `
            SELECT TOP 20
              c.customer as CustomerName,
              COUNT(*) as InvoiceCount,
              SUM(i.Total) as TotalRevenue,
              MAX(i.InvoiceDate) as LastInvoice
            FROM tblInvoice i
            INNER JOIN gsCustomers c ON i.gsCustomersID = c.gsCustomersID
            WHERE i.InvoiceDate >= DATEADD(year, -1, GETDATE())
            GROUP BY c.customer, c.gsCustomersID
            ORDER BY TotalRevenue DESC
          `,
        });
      } else {
        queries.push({
          type: 'customer_list',
          description: 'Recent customer activity',
          sql: `
            SELECT TOP 20
              customer as CompanyName,
              firstName + ' ' + lastName as ContactName,
              gsCustomersID as CustomerID,
              dateadded as DateAdded
            FROM gsCustomers
            WHERE dateadded >= DATEADD(month, -6, GETDATE())
            ORDER BY dateadded DESC
          `,
        });
      }
    }

    // Sales rep performance queries (check FIRST for actual sales/revenue)
    if (
      (q.includes('rep') ||
        q.includes('salesperson') ||
        q.includes('sales rep') ||
        q.includes('sales person')) &&
      (q.includes('total sales') ||
        q.includes('revenue') ||
        q.includes('sales for') ||
        q.includes('orders') ||
        q.includes('highest selling') ||
        q.includes('top sales') ||
        q.includes('best rep') ||
        q.includes('sales performance'))
    ) {
      queries.push({
        type: 'sales_rep_performance',
        description: 'Sales rep performance analysis',
        sql: `
          SELECT TOP 20
            e.firstName + ' ' + e.lastName as SalesRep,
            COUNT(DISTINCT c.gsContractsID) as TotalContracts,
            SUM(c.Net * (sr.Percentage / 100.0)) as CommissionableRevenue,
            SUM(c.Net) as TotalRevenue,
            AVG(c.Net) as AverageContractValue,
            MIN(c.DateAdded) as FirstSale,
            MAX(c.DateAdded) as LastSale
          FROM gsContracts c
          INNER JOIN tblSplitReps sr ON c.gsContractsID = sr.gsContractsID
          INNER JOIN gsEmployees e ON sr.gsEmployeesID = e.gsEmployeesID
          WHERE c.DateAdded >= DATEADD(year, -1, GETDATE())
          GROUP BY e.gsEmployeesID, e.firstName, e.lastName
          ORDER BY TotalRevenue DESC
        `,
      });
    }
    // General sales/revenue queries (contracts, not opportunities)
    else if (
      (q.includes('total sales') ||
        q.includes('revenue') ||
        q.includes('orders') ||
        q.includes('contracts')) &&
      !q.includes('pipeline') &&
      !q.includes('forecast')
    ) {
      queries.push({
        type: 'sales_revenue',
        description: 'Sales revenue analysis',
        sql: `
          SELECT TOP 20
            c.customer as CustomerName,
            COUNT(co.gsContractsID) as TotalContracts,
            SUM(co.Net) as TotalRevenue,
            AVG(co.Net) as AverageContractValue,
            MAX(co.DateAdded) as LastContract
          FROM gsContracts co
          INNER JOIN gsCustomers c ON co.CustomerID = c.gsCustomersID
          WHERE co.DateAdded >= DATEADD(year, -1, GETDATE())
          GROUP BY c.gsCustomersID, c.customer
          ORDER BY TotalRevenue DESC
        `,
      });
    }
    // Sales pipeline queries (only for specific pipeline/forecast questions)
    else if (
      q.includes('pipeline') ||
      q.includes('opportunity') ||
      q.includes('forecast') ||
      q.includes('closing')
    ) {
      queries.push({
        type: 'sales_pipeline',
        description: 'Sales pipeline overview',
        sql: `
          SELECT TOP 20
            c.customer as CustomerName,
            so.Amount,
            sp.Stage,
            sp.PercentClosed,
            so.CloseDate,
            LTRIM(RTRIM(ISNULL(e.firstName,'') + ' '+ ISNULL(e.lastName,''))) AS AssignedRep
          FROM tblSalesOpportunity so
          INNER JOIN gsCustomers c ON so.gsCustomersID = c.gsCustomersID
          LEFT JOIN tblSalesPipeline sp ON so.PipelineStageID = sp.ID
          LEFT JOIN gsEmployees e ON so.AssignedTo = e.gsEmployeesID
          WHERE so.isWon IS NULL OR so.isWon = -1
          ORDER BY so.Amount DESC
        `,
      });
    }

    // Invoice queries
    if (
      q.includes('invoice') ||
      q.includes('bill') ||
      q.includes('owe') ||
      q.includes('outstanding')
    ) {
      queries.push({
        type: 'outstanding_invoices',
        description: 'Outstanding invoices analysis',
        sql: `
          SELECT TOP 20
            c.customer as CustomerName,
            i.InvoiceNumber,
            i.Total as InvoiceTotal,
            i.InvoiceDate,
            CASE WHEN p.TotalPaid >= i.Total THEN 'Yes' ELSE 'No' END as Paid
          FROM tblInvoice i
          INNER JOIN gsCustomers c ON i.gsCustomersID = c.gsCustomersID
          LEFT JOIN (
            SELECT InvoiceID, SUM(AmountPaid) as TotalPaid
            FROM tblInvoicePayment
            GROUP BY InvoiceID
          ) p ON i.InvoiceID = p.InvoiceID
          WHERE ISNULL(p.TotalPaid, 0) < i.Total
            AND i.InvoiceDate >= DATEADD(month, -12, GETDATE())
          ORDER BY i.Total DESC
        `,
      });
    }

    // Proposal queries
    if (q.includes('proposal') || q.includes('conversion')) {
      queries.push({
        type: 'proposals',
        description: 'Proposal performance analysis',
        sql: `
          SELECT TOP 20
            c.customer as CustomerName,
            p.Net as ProposalNet,
            CASE WHEN p.gsContractsID IS NOT NULL THEN 'Yes' ELSE 'No' END as ConvertedToContract,
            p.DateAdded as CreateDate,
            e.firstName + ' ' + e.lastName as SalesRep
          FROM tblproposalinsertion p
          INNER JOIN gsCustomers c ON p.CustomerID = c.gsCustomersID
          INNER JOIN tblSplitReps sr ON p.insertionID = sr.insertionID
          INNER JOIN gsEmployees e ON sr.gsEmployeesID = e.gsEmployeesID
          WHERE p.DateAdded >= DATEADD(month, -6, GETDATE())
          ORDER BY p.DateAdded DESC
        `,
      });
    }

    // Default fallback query
    if (queries.length === 0) {
      queries.push({
        type: 'general_overview',
        description: 'General business overview',
        sql: `
          SELECT TOP 10
            customer as CustomerName,
            gsCustomersID as CustomerID,
            dateadded as DateAdded
          FROM gsCustomers
          ORDER BY dateadded DESC
        `,
      });
    }

    return queries;
  }

  /**
   * Format successful response with data
   */
  formatSuccessResponse(analysis, data) {
    let response = `Great! I found the following insights:\n\n`;

    if (analysis.businessDomain) {
      response += `**Business Domain:** ${analysis.businessDomain}\n`;
    }

    if (analysis.concept) {
      response += `**Analysis Type:** ${analysis.concept}\n\n`;
    }

    // Add data summary
    const dataKeys = Object.keys(data);
    if (dataKeys.length > 0) {
      const firstKey = dataKeys[0];
      const records = data[firstKey];

      if (Array.isArray(records) && records.length > 0) {
        response += `**Found ${records.length} records**\n\n`;
        response += `The data shows key metrics and insights for your analysis. You can view the detailed results in the table below and download the complete dataset if needed.`;
      }
    }

    return response;
  }

  /**
   * Format analysis response without executable data
   */
  formatAnalysisResponse(analysis) {
    let response = `I understand you're asking about **${analysis.businessDomain || 'business data'}**.\n\n`;

    if (analysis.concept) {
      response += `**Analysis Type:** ${analysis.concept}\n\n`;
    }

    if (analysis.recommendedApproach) {
      response += `**Recommended Approach:**\n${analysis.recommendedApproach}\n\n`;
    }

    if (analysis.businessLogic && analysis.businessLogic.length > 0) {
      response += `**Key Business Rules:**\n`;
      analysis.businessLogic.forEach(rule => {
        response += `• ${rule}\n`;
      });
      response += '\n';
    }

    response += `To get the actual data, you might need to be more specific about:\n`;
    response += `• Time period (e.g., "past 6 months")\n`;
    response += `• Specific metrics (e.g., "revenue", "count", "average")\n`;
    response += `• Grouping preferences (e.g., "by customer", "by month")`;

    return response;
  }

  /**
   * Extract data from GraphQL response
   */
  extractDataFromResponse(data) {
    // Handle executeQuery responses
    if (data.executeQuery && data.executeQuery.data) {
      return data.executeQuery.data;
    }

    // Handle direct query responses
    const keys = Object.keys(data);
    for (const key of keys) {
      if (Array.isArray(data[key])) {
        return data[key];
      }

      // Handle connection patterns
      if (data[key] && data[key].edges && Array.isArray(data[key].edges)) {
        return data[key].edges.map(edge => edge.node);
      }
    }

    return null;
  }

  /**
   * Get default suggestions
   */
  getDefaultSuggestions() {
    return [
      'Show me top customers by revenue',
      "What's our current sales pipeline?",
      'Outstanding invoices report',
      'Customer acquisition trends',
      'Proposal conversion rates',
    ];
  }

  /**
   * Get related suggestions based on query type
   */
  getRelatedSuggestions(queryType) {
    const suggestions = {
      customer_revenue: [
        'Show customer payment history',
        "Which customers haven't paid recently?",
        'Customer lifetime value analysis',
      ],
      customer_list: [
        'Customer acquisition by month',
        'Customer category breakdown',
        'Most active customers',
      ],
      sales_pipeline: ['Pipeline by sales rep', 'Close rate analysis', 'Forecast vs actual sales'],
      sales_rep_performance: [
        'Sales rep commission breakdown',
        'Rep performance vs targets',
        'Top performing reps by quarter',
        'Rep contract count trends',
      ],
      sales_revenue: [
        'Revenue by customer',
        'Monthly sales trends',
        'Average deal size analysis',
        'Contract performance by product',
      ],
      outstanding_invoices: [
        'Aging report for collections',
        'Payment trends by customer',
        'Invoice vs payment timing',
      ],
      proposals: ['Proposal win rate trends', 'Average proposal size', 'Time to close analysis'],
    };

    return suggestions[queryType] || this.getDefaultSuggestions();
  }

  /**
   * Get available business capabilities
   */
  async getBusinessCapabilities(serviceName = 'salesdemo') {
    try {
      const response = await api.post('/api/ai/discover-business-capabilities', {
        domain: 'all',
        serviceName: serviceName,
      });

      return response.data;
    } catch (error) {
      console.error('Error getting business capabilities:', error);
      return {
        success: false,
        error: 'Unable to fetch business capabilities',
      };
    }
  }

  /**
   * Build intelligent query based on requirements
   */
  async buildIntelligentQuery(
    requirement,
    timeframe = 'past_year',
    grouping = 'by_customer',
    serviceName = 'salesdemo'
  ) {
    try {
      const response = await api.post('/api/ai/build-intelligent-query', {
        requirement,
        timeframe,
        grouping,
        serviceName: serviceName,
      });

      return response.data;
    } catch (error) {
      console.error('Error building intelligent query:', error);
      throw new Error('Unable to build query for this requirement');
    }
  }
}

export const businessIntelligenceService = new BusinessIntelligenceService();
export default businessIntelligenceService;

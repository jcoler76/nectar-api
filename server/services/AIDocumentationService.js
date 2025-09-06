const Template20Intelligence = require('../models/Template20Intelligence');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

/**
 * AI Documentation Service
 * Generates comprehensive documentation for stored procedures using AI
 * Integrates with OpenAI API for intelligent documentation generation
 */
class AIDocumentationService {
  constructor() {
    this.outputPath = path.join(__dirname, '../docs/generated');
    this.apiKey = process.env.OPENAI_API_KEY;
    this.model = 'gpt-4o-mini'; // Use cost-effective model for documentation
    this.version = 'v1.0-ai-powered';
    this.maxRetries = 3;
    this.batchSize = 5; // Process procedures in batches to manage API costs
  }

  /**
   * Generate selective documentation from a specific selection
   */
  async generateSelectiveDocumentation(selection, options = {}) {
    console.log(`📚 Generating selective AI documentation for "${selection.selectionName}"...`);

    if (!this.apiKey) {
      console.warn('⚠️ OPENAI_API_KEY not found - using template-based documentation');
      return this.generateSelectiveTemplateDocumentation(selection, options);
    }

    const {
      includeEntityOverview = true,
      includeBusinessContext = true,
      includeUsageExamples = true,
      generateMarkdown = true,
    } = options;

    try {
      const startTime = Date.now();

      // Get intelligence for filtering
      const intelligence = await Template20Intelligence.getLatestIntelligence();
      if (!intelligence) {
        throw new Error('No Template20 intelligence found. Run template20-sync first.');
      }

      // Filter intelligence based on selection
      const filteredIntelligence = this.filterIntelligenceBySelection(intelligence, selection);

      // Ensure output directory exists
      const selectionOutputPath = path.join(this.outputPath, 'selections', selection.selectionName);
      await fs.mkdir(selectionOutputPath, { recursive: true });

      // Generate documentation for selected items
      const outputFiles = [];

      // 1. Generate overview documentation
      if (includeEntityOverview) {
        console.log('📋 Generating selection overview...');
        const overview = await this.generateSelectionOverview(filteredIntelligence, selection);
        const overviewFile = path.join(selectionOutputPath, 'overview.md');
        await fs.writeFile(overviewFile, overview);
        outputFiles.push(overviewFile);
      }

      // 2. Generate procedure documentation
      if (filteredIntelligence.procedures.length > 0) {
        console.log(
          `📝 Generating documentation for ${filteredIntelligence.procedures.length} procedures...`
        );
        const procDocs = await this.generateAIProcedureDocumentation(
          filteredIntelligence.procedures
        );
        const procFile = path.join(selectionOutputPath, 'procedures.md');
        await fs.writeFile(procFile, procDocs);
        outputFiles.push(procFile);
      }

      // 3. Generate table documentation
      if (filteredIntelligence.tables.length > 0) {
        console.log(
          `📊 Generating documentation for ${filteredIntelligence.tables.length} tables...`
        );
        const tableDocs = await this.generateTableDocumentation(filteredIntelligence.tables);
        const tableFile = path.join(selectionOutputPath, 'tables.md');
        await fs.writeFile(tableFile, tableDocs);
        outputFiles.push(tableFile);
      }

      // 4. Generate usage examples
      if (includeUsageExamples) {
        console.log('💡 Generating usage examples...');
        const examples = await this.generateUsageExamples(
          filteredIntelligence,
          selection.selectionName
        );
        const examplesFile = path.join(selectionOutputPath, 'examples.md');
        await fs.writeFile(examplesFile, examples);
        outputFiles.push(examplesFile);
      }

      const duration = Date.now() - startTime;
      console.log(`✅ Selective documentation generation completed in ${duration}ms`);

      return {
        success: true,
        selectionName: selection.selectionName,
        outputFiles,
        generationTime: duration,
      };
    } catch (error) {
      console.error('❌ Selective documentation generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate AI-powered documentation for all stored procedures
   */
  async generateProcedureDocumentation(options = {}) {
    console.log('📚 Generating AI-powered procedure documentation...');

    if (!this.apiKey) {
      console.warn('⚠️ OPENAI_API_KEY not found - using template-based documentation');
      return this.generateTemplateDocumentation(options);
    }

    const {
      entityFilter = null, // null = all entities
      minConfidence = 0.7,
      includeParameters = true,
      includeBusinessContext = true,
      generateExamples = true,
      batchSize = this.batchSize,
    } = options;

    try {
      const startTime = Date.now();

      // Get Template20 intelligence
      const intelligence = await Template20Intelligence.getLatestIntelligence();
      if (!intelligence) {
        throw new Error('No Template20 intelligence found. Run template20-sync first.');
      }

      // Filter procedures to document
      const proceduresToDocument = this.filterProcedures(intelligence, {
        entityFilter,
        minConfidence,
      });

      console.log(`📋 Found ${proceduresToDocument.length} procedures to document`);

      // Ensure output directory exists
      await fs.mkdir(this.outputPath, { recursive: true });

      // Process procedures in batches
      const batches = this.createBatches(proceduresToDocument, batchSize);
      const results = [];

      for (let i = 0; i < batches.length; i++) {
        console.log(
          `🔄 Processing batch ${i + 1}/${batches.length} (${batches[i].length} procedures)...`
        );

        const batchResults = await this.processBatch(batches[i], intelligence, {
          includeParameters,
          includeBusinessContext,
          generateExamples,
        });

        results.push(...batchResults);

        // Add delay between batches to respect API rate limits
        if (i < batches.length - 1) {
          await this.delay(1000); // 1 second delay
        }
      }

      // Generate summary documentation
      console.log('📄 Generating summary documentation...');
      const summaryDoc = await this.generateSummaryDocumentation(results, intelligence);

      // Write documentation files
      console.log('💾 Writing documentation files...');
      const files = await this.writeDocumentationFiles(results, summaryDoc);

      const duration = Date.now() - startTime;
      console.log(`✅ AI documentation generation completed in ${duration}ms`);

      return {
        success: true,
        proceduresDocumented: results.length,
        files,
        statistics: this.generateDocumentationStatistics(results),
        duration,
        nextSteps: this.getNextSteps(),
      };
    } catch (error) {
      console.error('❌ AI documentation generation failed:', error);

      // Fallback to template documentation if AI fails
      console.log('🔄 Falling back to template-based documentation...');
      return this.generateTemplateDocumentation(options);
    }
  }

  /**
   * Filter procedures based on criteria
   */
  filterProcedures(intelligence, { entityFilter, minConfidence }) {
    let procedures = intelligence.procedures.filter(
      proc => proc.overallConfidence >= minConfidence && proc.isActive
    );

    if (entityFilter) {
      procedures = procedures.filter(proc => proc.businessEntity === entityFilter);
    }

    // Sort by confidence and recency
    procedures.sort((a, b) => {
      const confidenceDiff = b.overallConfidence - a.overallConfidence;
      if (Math.abs(confidenceDiff) > 0.1) return confidenceDiff;
      return (a.daysSinceModified || 9999) - (b.daysSinceModified || 9999);
    });

    return procedures;
  }

  /**
   * Create batches for processing
   */
  createBatches(items, batchSize) {
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Process a batch of procedures with AI
   */
  async processBatch(procedures, intelligence, options) {
    const batchResults = [];

    for (const procedure of procedures) {
      try {
        console.log(`  📝 Documenting ${procedure.procedureName}...`);

        const documentation = await this.generateProcedureDocumentation(
          procedure,
          intelligence,
          options
        );

        if (documentation) {
          batchResults.push({
            procedure,
            documentation,
            status: 'success',
          });
        } else {
          batchResults.push({
            procedure,
            documentation: this.generateFallbackDocumentation(procedure),
            status: 'fallback',
          });
        }
      } catch (error) {
        console.warn(`  ⚠️ Failed to document ${procedure.procedureName}:`, error.message);
        batchResults.push({
          procedure,
          documentation: this.generateFallbackDocumentation(procedure),
          status: 'error',
          error: error.message,
        });
      }
    }

    return batchResults;
  }

  /**
   * Generate AI documentation for a single procedure
   */
  async generateProcedureDocumentation(procedure, intelligence, options) {
    const businessContext = this.buildBusinessContext(procedure, intelligence);
    const prompt = this.buildDocumentationPrompt(procedure, businessContext, options);

    try {
      const response = await this.callOpenAI(prompt);
      return this.parseAIResponse(response, procedure);
    } catch (error) {
      if (error.message.includes('rate limit')) {
        console.log('  ⏳ Rate limit hit, waiting 60 seconds...');
        await this.delay(60000);
        return this.generateProcedureDocumentation(procedure, intelligence, options);
      }
      throw error;
    }
  }

  /**
   * Build business context for AI prompt
   */
  buildBusinessContext(procedure, intelligence) {
    const entity = intelligence.businessEntities.find(
      e => e.entityType === procedure.businessEntity
    );
    const relatedTables = intelligence.getTablesForEntity(procedure.businessEntity);
    const relatedProcedures = intelligence
      .getProceduresForEntity(procedure.businessEntity, 0.6)
      .filter(p => p.procedureName !== procedure.procedureName)
      .slice(0, 3);

    return {
      entity: entity
        ? {
            type: entity.entityType,
            concept: entity.businessConcept,
            primaryTable: entity.primaryTable,
            importance: entity.businessImportance,
          }
        : null,
      relatedTables: relatedTables.map(t => ({
        name: t.tableName,
        importance: t.businessImportance,
        columns: t.columns?.length || 0,
      })),
      relatedProcedures: relatedProcedures.map(p => ({
        name: p.procedureName,
        type: p.procedureType,
        confidence: p.overallConfidence,
      })),
    };
  }

  /**
   * Build AI prompt for procedure documentation
   */
  buildDocumentationPrompt(procedure, businessContext, options) {
    const lines = [];

    lines.push(
      'You are a database documentation expert. Generate comprehensive documentation for this SQL Server stored procedure.'
    );
    lines.push('');

    lines.push('PROCEDURE INFORMATION:');
    lines.push(`- Name: ${procedure.procedureName}`);
    lines.push(`- Business Entity: ${procedure.businessEntity || 'unknown'}`);
    lines.push(`- Type: ${procedure.procedureType || 'unknown'}`);
    lines.push(`- Confidence Score: ${(procedure.overallConfidence * 100).toFixed(1)}%`);
    lines.push(`- Days Since Modified: ${procedure.daysSinceModified || 'unknown'}`);

    if (procedure.parameters && procedure.parameters.length > 0) {
      lines.push('');
      lines.push('PARAMETERS:');
      for (const param of procedure.parameters) {
        lines.push(
          `- ${param.parameterName} (${param.dataType}${param.isOutput ? ', OUTPUT' : ''}): ${param.businessContext || 'No description'}`
        );
      }
    }

    if (businessContext.entity) {
      lines.push('');
      lines.push('BUSINESS CONTEXT:');
      lines.push(`- Entity: ${businessContext.entity.concept}`);
      lines.push(`- Primary Table: ${businessContext.entity.primaryTable}`);
      lines.push(`- Business Importance: ${businessContext.entity.importance}/10`);
    }

    if (businessContext.relatedTables.length > 0) {
      lines.push('');
      lines.push('RELATED TABLES:');
      for (const table of businessContext.relatedTables.slice(0, 5)) {
        lines.push(`- ${table.name} (${table.columns} columns, importance: ${table.importance})`);
      }
    }

    lines.push('');
    lines.push('DOCUMENTATION REQUIREMENTS:');
    lines.push('1. Provide a clear, concise description of what this procedure does');
    lines.push('2. Explain the business purpose and when to use it');
    lines.push('3. Document all parameters with their purpose and expected values');
    lines.push('4. Include any important business rules or constraints');
    lines.push('5. Provide usage examples if appropriate');
    lines.push('6. Note any performance considerations or best practices');
    lines.push('');
    lines.push(
      'Format your response as structured markdown that would be helpful for developers and AI coding assistants.'
    );
    lines.push('Keep the documentation concise but comprehensive, focusing on practical usage.');

    return lines.join('\n');
  }

  /**
   * Call OpenAI API with retry logic
   */
  async callOpenAI(prompt, retryCount = 0) {
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: this.model,
          messages: [
            {
              role: 'system',
              content:
                'You are a database documentation expert who creates clear, concise, and developer-friendly documentation for stored procedures.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: 1000,
          temperature: 0.3, // Lower temperature for more consistent documentation
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      return response.data.choices[0].message.content;
    } catch (error) {
      if (retryCount < this.maxRetries && error.response?.status === 429) {
        console.log(
          `    ⏳ Rate limit hit, retry ${retryCount + 1}/${this.maxRetries} in 30 seconds...`
        );
        await this.delay(30000);
        return this.callOpenAI(prompt, retryCount + 1);
      }

      if (error.response?.status === 429) {
        throw new Error('OpenAI rate limit exceeded');
      }

      throw new Error(`OpenAI API error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Parse AI response into structured documentation
   */
  parseAIResponse(response, procedure) {
    return {
      title: `${procedure.procedureName} Documentation`,
      aiGenerated: true,
      content: response.trim(),
      metadata: {
        procedureName: procedure.procedureName,
        businessEntity: procedure.businessEntity,
        confidence: procedure.overallConfidence,
        generatedAt: new Date().toISOString(),
        model: this.model,
      },
    };
  }

  /**
   * Generate fallback documentation without AI
   */
  generateFallbackDocumentation(procedure) {
    const lines = [];

    lines.push(`# ${procedure.procedureName}`);
    lines.push('');
    lines.push('## Overview');
    lines.push(`**Business Entity:** ${procedure.businessEntity || 'Unknown'}`);
    lines.push(`**Procedure Type:** ${procedure.procedureType || 'Unknown'}`);
    lines.push(`**Confidence Score:** ${(procedure.overallConfidence * 100).toFixed(1)}%`);
    lines.push('');

    lines.push('## Description');
    lines.push(
      `This is a ${procedure.procedureType || 'database'} procedure for ${procedure.businessEntity || 'business'} operations.`
    );
    lines.push('');

    if (procedure.parameters && procedure.parameters.length > 0) {
      lines.push('## Parameters');
      lines.push('');
      for (const param of procedure.parameters) {
        lines.push(
          `- **${param.parameterName}** (${param.dataType}${param.isOutput ? ', OUTPUT' : ''}): ${param.businessContext || 'No description available'}`
        );
      }
      lines.push('');
    }

    lines.push('## Usage');
    lines.push('```sql');
    lines.push(`EXEC ${procedure.procedureName}`);
    if (procedure.parameters && procedure.parameters.length > 0) {
      const paramList = procedure.parameters
        .filter(p => !p.isOutput)
        .map(p => `@${p.parameterName} = ?`)
        .join(', ');
      if (paramList) {
        lines.push(`  ${paramList}`);
      }
    }
    lines.push('```');
    lines.push('');

    lines.push('## Notes');
    lines.push('- This documentation was auto-generated from database metadata');
    lines.push(`- Last modified: ${procedure.daysSinceModified || 'Unknown'} days ago`);
    lines.push('- For detailed business logic, consult the procedure source code');

    return {
      title: `${procedure.procedureName} Documentation`,
      aiGenerated: false,
      content: lines.join('\n'),
      metadata: {
        procedureName: procedure.procedureName,
        businessEntity: procedure.businessEntity,
        confidence: procedure.overallConfidence,
        generatedAt: new Date().toISOString(),
        method: 'template',
      },
    };
  }

  /**
   * Generate template-based documentation (fallback when AI is unavailable)
   */
  async generateTemplateDocumentation(options) {
    console.log('📋 Generating template-based documentation...');

    const intelligence = await Template20Intelligence.getLatestIntelligence();
    if (!intelligence) {
      throw new Error('No Template20 intelligence found. Run template20-sync first.');
    }

    const procedures = this.filterProcedures(intelligence, options);
    const results = [];

    for (const procedure of procedures) {
      const documentation = this.generateFallbackDocumentation(procedure);
      results.push({
        procedure,
        documentation,
        status: 'template',
      });
    }

    // Generate summary
    const summaryDoc = await this.generateSummaryDocumentation(results, intelligence);

    // Write files
    const files = await this.writeDocumentationFiles(results, summaryDoc);

    return {
      success: true,
      proceduresDocumented: results.length,
      files,
      statistics: this.generateDocumentationStatistics(results),
      method: 'template',
      nextSteps: this.getNextSteps(),
    };
  }

  /**
   * Generate summary documentation
   */
  async generateSummaryDocumentation(results, intelligence) {
    const lines = [];

    lines.push('# Template20 Stored Procedures Documentation');
    lines.push('');
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push(`Version: ${this.version}`);
    lines.push(`Total Procedures Documented: ${results.length}`);
    lines.push('');

    // Statistics by entity
    const byEntity = {};
    for (const result of results) {
      const entity = result.procedure.businessEntity || 'unknown';
      if (!byEntity[entity]) {
        byEntity[entity] = [];
      }
      byEntity[entity].push(result);
    }

    lines.push('## Procedures by Business Entity');
    lines.push('');
    for (const [entity, entityResults] of Object.entries(byEntity)) {
      lines.push(`### ${entity} (${entityResults.length} procedures)`);
      lines.push('');

      for (const result of entityResults.slice(0, 10)) {
        // Top 10 per entity
        const confidence = (result.procedure.overallConfidence * 100).toFixed(1);
        lines.push(
          `- [${result.procedure.procedureName}](./${result.procedure.procedureName}.md) (${confidence}% confidence)`
        );
      }
      lines.push('');
    }

    // Usage guide
    lines.push('## Usage Guide for AI Coding Assistants');
    lines.push('');
    lines.push('### High Confidence Procedures (>80%)');
    const highConfidence = results.filter(r => r.procedure.overallConfidence >= 0.8);
    lines.push(`These ${highConfidence.length} procedures are recommended for production use:`);
    lines.push('');

    for (const result of highConfidence.slice(0, 15)) {
      lines.push(
        `- **${result.procedure.procedureName}** - ${result.procedure.procedureType} for ${result.procedure.businessEntity}`
      );
    }
    lines.push('');

    lines.push('### Integration Examples');
    lines.push('');
    lines.push('```javascript');
    lines.push('// Get recommended procedures for an entity');
    lines.push('const intelligence = await Template20Intelligence.getLatestIntelligence();');
    lines.push('const procedures = intelligence.getProceduresForEntity("customer", 0.8);');
    lines.push('');
    lines.push('// Execute high-confidence procedure');
    lines.push(
      'const result = await dbService.executeProcedure(procedures[0].procedureName, params);'
    );
    lines.push('```');

    return {
      title: 'Template20 Procedures Documentation Summary',
      content: lines.join('\n'),
      metadata: {
        totalProcedures: results.length,
        entitiesCount: Object.keys(byEntity).length,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Write documentation files to disk
   */
  async writeDocumentationFiles(results, summaryDoc) {
    const files = [];

    // Write individual procedure docs
    for (const result of results) {
      const fileName = `${result.procedure.procedureName}.md`;
      const filePath = path.join(this.outputPath, fileName);

      await fs.writeFile(filePath, result.documentation.content, 'utf8');
      files.push({
        type: 'procedure',
        procedureName: result.procedure.procedureName,
        path: filePath,
        status: result.status,
      });
    }

    // Write summary documentation
    const summaryPath = path.join(this.outputPath, 'README.md');
    await fs.writeFile(summaryPath, summaryDoc.content, 'utf8');
    files.push({
      type: 'summary',
      path: summaryPath,
      status: 'success',
    });

    // Write index file for programmatic access
    const indexData = {
      version: this.version,
      generated: new Date().toISOString(),
      procedures: results.map(r => ({
        name: r.procedure.procedureName,
        businessEntity: r.procedure.businessEntity,
        confidence: r.procedure.overallConfidence,
        file: `${r.procedure.procedureName}.md`,
        status: r.status,
      })),
    };

    const indexPath = path.join(this.outputPath, 'index.json');
    await fs.writeFile(indexPath, JSON.stringify(indexData, null, 2), 'utf8');
    files.push({
      type: 'index',
      path: indexPath,
      status: 'success',
    });

    return files;
  }

  // Helper methods
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  generateDocumentationStatistics(results) {
    const byStatus = results.reduce((acc, result) => {
      acc[result.status] = (acc[result.status] || 0) + 1;
      return acc;
    }, {});

    const byEntity = results.reduce((acc, result) => {
      const entity = result.procedure.businessEntity || 'unknown';
      acc[entity] = (acc[entity] || 0) + 1;
      return acc;
    }, {});

    return {
      total: results.length,
      byStatus,
      byEntity,
      aiGenerated: results.filter(r => r.documentation.aiGenerated).length,
      averageConfidence:
        results.reduce((sum, r) => sum + r.procedure.overallConfidence, 0) / results.length,
    };
  }

  getNextSteps() {
    return [
      'Review generated documentation in docs/generated/',
      'Integrate documentation with GraphQL schema descriptions',
      'Set up documentation CI/CD pipeline for updates',
      'Configure VS Code/Cursor extensions to use documentation',
      'Add documentation links to Prisma schema comments',
    ];
  }

  /**
   * Filter intelligence data based on selection (consistent with other generators)
   */
  filterIntelligenceBySelection(intelligence, selection) {
    const selectedTableNames = selection.selectedTables.map(t => t.tableName);
    const selectedViewNames = selection.selectedViews.map(v => v.viewName);
    const selectedProcedureNames = selection.selectedProcedures.map(p => p.procedureName);

    return {
      ...intelligence,
      tables: intelligence.tables.filter(table => selectedTableNames.includes(table.tableName)),
      views: intelligence.views.filter(view => selectedViewNames.includes(view.viewName)),
      procedures: intelligence.procedures.filter(procedure =>
        selectedProcedureNames.includes(procedure.procedureName)
      ),
      relationships: intelligence.relationships.filter(
        rel =>
          selectedTableNames.includes(rel.fromTable) ||
          selectedTableNames.includes(rel.toTable) ||
          selectedViewNames.includes(rel.fromTable) ||
          selectedViewNames.includes(rel.toTable)
      ),
      businessEntities: intelligence.businessEntities.filter(entity => {
        const hasSelectedTables = entity.keyTables?.some(table =>
          selectedTableNames.includes(table)
        );
        const hasSelectedProcedures = entity.keyProcedures?.some(proc =>
          selectedProcedureNames.includes(proc)
        );
        return hasSelectedTables || hasSelectedProcedures;
      }),
    };
  }

  /**
   * Generate overview documentation for a selection
   */
  async generateSelectionOverview(filteredIntelligence, selection) {
    return `# ${selection.selectionName} - Database Schema Selection

## Overview
${selection.description || 'Custom database schema selection for focused development'}

**Generated:** ${new Date().toISOString()}

## Selection Statistics
- **Tables:** ${selection.selectedTables.length}
- **Views:** ${selection.selectedViews.length}
- **Procedures:** ${selection.selectedProcedures.length}
- **Total Objects:** ${selection.selectedTables.length + selection.selectedViews.length + selection.selectedProcedures.length}

## Business Domain Coverage
${filteredIntelligence.businessEntities
  .map(
    entity => `
### ${entity.entityType.charAt(0).toUpperCase() + entity.entityType.slice(1)}
- **Primary Table:** ${entity.primaryTable}
- **Business Importance:** ${entity.businessImportance}/10
- **Confidence Level:** ${(entity.confidence * 100).toFixed(1)}%
- **Key Tables:** ${entity.keyTables?.join(', ') || 'None'}
- **Key Procedures:** ${entity.keyProcedures?.join(', ') || 'None'}
`
  )
  .join('')}

## Data Architecture Notes
This selection focuses on ${filteredIntelligence.businessEntities.map(e => e.entityType).join(', ')} business entities, providing a targeted view of the database schema for efficient development and reduced complexity.

## Usage Recommendations
1. Use this selection for focused feature development
2. Generate GraphQL and Prisma schemas from this subset
3. Implement business logic using the included procedures
4. Leverage the documented relationships for efficient queries
`;
  }

  /**
   * Generate usage examples for a selection
   */
  async generateUsageExamples(filteredIntelligence, selectionName) {
    return `# Usage Examples - ${selectionName}

## GraphQL Query Examples

\`\`\`graphql
# Example queries for ${selectionName} selection
${filteredIntelligence.businessEntities
  .map(
    entity => `
# ${entity.entityType.charAt(0).toUpperCase() + entity.entityType.slice(1)} Operations
query get${entity.entityType.charAt(0).toUpperCase() + entity.entityType.slice(1)}ById($id: ID!) {
  ${entity.entityType}(id: $id) {
    # Add relevant fields based on ${entity.primaryTable}
  }
}

query list${entity.entityType.charAt(0).toUpperCase() + entity.entityType.slice(1)}s($limit: Int, $offset: Int) {
  ${entity.entityType}s(limit: $limit, offset: $offset) {
    # Add relevant fields
  }
}
`
  )
  .join('')}
\`\`\`

## Prisma Client Examples

\`\`\`typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

${filteredIntelligence.businessEntities
  .map(
    entity => `
// ${entity.entityType.charAt(0).toUpperCase() + entity.entityType.slice(1)} operations
async function get${entity.entityType.charAt(0).toUpperCase() + entity.entityType.slice(1)}(id: string) {
  return await prisma.${entity.primaryTable?.toLowerCase() || entity.entityType}.findUnique({
    where: { id },
    include: {
      // Add relevant relations
    }
  });
}

async function create${entity.entityType.charAt(0).toUpperCase() + entity.entityType.slice(1)}(data: any) {
  return await prisma.${entity.primaryTable?.toLowerCase() || entity.entityType}.create({
    data
  });
}
`
  )
  .join('')}
\`\`\`

## Recommended Procedures

${
  filteredIntelligence.procedures.length > 0
    ? `
\`\`\`sql
${filteredIntelligence.procedures
  .slice(0, 5)
  .map(
    proc => `
-- ${proc.procedureName}
-- Confidence: ${(proc.overallConfidence * 100).toFixed(1)}%
-- Type: ${proc.procedureType}
-- Parameters: ${proc.parameters?.length || 0}
EXEC ${proc.procedureName} ${proc.parameters?.map((p, i) => `@param${i + 1}`).join(', ') || ''};
`
  )
  .join('')}
\`\`\`
`
    : 'No procedures selected in this subset.'
}

## Next Steps
1. Run schema generation with this selection
2. Implement the generated GraphQL resolvers
3. Create Prisma client operations
4. Add business logic using the recommended procedures
5. Set up proper testing for the selected entities
`;
  }

  /**
   * Fallback template documentation for selections when AI is not available
   */
  async generateSelectiveTemplateDocumentation(selection, options = {}) {
    console.log('📝 Generating template-based selective documentation...');

    const intelligence = await Template20Intelligence.getLatestIntelligence();
    const filteredIntelligence = this.filterIntelligenceBySelection(intelligence, selection);

    const selectionOutputPath = path.join(this.outputPath, 'selections', selection.selectionName);
    await fs.mkdir(selectionOutputPath, { recursive: true });

    const outputFiles = [];

    // Generate basic overview
    const overview = await this.generateSelectionOverview(filteredIntelligence, selection);
    const overviewFile = path.join(selectionOutputPath, 'overview.md');
    await fs.writeFile(overviewFile, overview);
    outputFiles.push(overviewFile);

    return {
      success: true,
      selectionName: selection.selectionName,
      outputFiles,
      generationTime: 0,
    };
  }
}

module.exports = AIDocumentationService;

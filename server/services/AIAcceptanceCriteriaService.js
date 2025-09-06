const OpenAI = require('openai');
const fs = require('fs').promises;
const path = require('path');

class AIAcceptanceCriteriaService {
  constructor() {
    // SAFETY CHECK: Only allow in development environment
    if (process.env.NODE_ENV === 'production') {
      console.warn('⚠️ AIAcceptanceCriteriaService disabled in production for safety');
      this.disabled = true;
      return;
    }

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.projectContext = null;
    this.disabled = false;
  }

  async generateAcceptanceCriteria(issueData, options = {}) {
    // Safety check for production
    if (this.disabled) {
      return {
        success: false,
        error: 'AI service is disabled in production environment for safety',
      };
    }

    const {
      issueType = 'feature',
      includeTestCases = true,
      includeTechnicalSpecs = true,
      includeBusinessContext = true,
      customPromptAdditions = '',
    } = options;

    // Analyze project context if not cached
    if (!this.projectContext) {
      this.projectContext = await this.analyzeProjectContext();
    }

    const prompt = this.buildPrompt(issueData, issueType, {
      includeTestCases,
      includeTechnicalSpecs,
      includeBusinessContext,
      customPromptAdditions,
    });

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: this.getSystemPrompt() },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 2500,
      response_format: { type: 'json_object' },
    });

    return this.parseResponse(completion.choices[0].message.content);
  }

  getSystemPrompt() {
    return `You are an expert business analyst and technical writer specializing in creating comprehensive acceptance criteria for GitHub issues in software development projects.

Your role is to analyze issue descriptions and generate detailed, actionable acceptance criteria that ensure complete implementation and testing.

You must respond with a JSON object containing structured acceptance criteria. The criteria should be:
- Specific and measurable
- Technology-appropriate for the project context
- Include both functional and non-functional requirements
- Follow Behavior-Driven Development (BDD) format where appropriate
- Include edge cases and error handling
- Be testable and verifiable

Always consider:
- User experience implications
- Security considerations
- Performance requirements
- Accessibility requirements
- Integration points
- Error scenarios
- Data validation requirements`;
  }

  async analyzeProjectContext() {
    try {
      const [models, routes, components] = await Promise.all([
        this.scanDirectory(path.join(__dirname, '../models')),
        this.scanDirectory(path.join(__dirname, '../routes')),
        this.scanDirectory(path.join(__dirname, '../../src/components')),
      ]);

      return {
        architecture: 'Full-stack React/Node.js with MongoDB and SQL Server',
        techStack: {
          frontend: ['React 18', 'Material-UI', 'TailwindCSS', 'React Router'],
          backend: ['Express.js', 'GraphQL (Apollo)', 'MongoDB (Mongoose)', 'JWT Auth'],
          queues: ['Bull.js', 'Redis'],
          testing: ['Jest'],
        },
        patterns: {
          auth: 'JWT with role-based permissions',
          api: 'REST + GraphQL hybrid',
          state: 'Context API + hooks',
          validation: 'express-validator',
          errorHandling: 'Structured error responses',
        },
        businessDomains: models.map(m => m.replace('.js', '')),
        features: routes.map(r => r.replace('.js', '')),
        uiComponents: components.slice(0, 20), // Limit for token efficiency
      };
    } catch (error) {
      // Fallback context if scanning fails
      return {
        architecture: 'Full-stack React/Node.js with MongoDB and SQL Server',
        techStack: {
          frontend: ['React 18', 'Material-UI'],
          backend: ['Express.js', 'MongoDB', 'JWT Auth'],
        },
      };
    }
  }

  async scanDirectory(dirPath) {
    try {
      const files = await fs.readdir(dirPath);
      return files.filter(file => file.endsWith('.js') || file.endsWith('.jsx'));
    } catch (error) {
      return [];
    }
  }

  buildPrompt(issueData, issueType, options) {
    const basePrompt = `
Project Context:
${JSON.stringify(this.projectContext, null, 2)}

GitHub Issue Information:
- Title: ${issueData.title}
- Description: ${issueData.body || 'No description provided'}
- Issue Type: ${issueType}
- Labels: ${issueData.labels?.map(l => l.name).join(', ') || 'None'}

Generate comprehensive acceptance criteria for this ${issueType} issue.
`;

    const typeSpecificInstructions = this.getTypeSpecificInstructions(issueType);
    const contextualRequirements = this.getContextualRequirements(options);

    return `${basePrompt}\n${typeSpecificInstructions}\n${contextualRequirements}\n${options.customPromptAdditions}`;
  }

  getTypeSpecificInstructions(issueType) {
    const instructions = {
      feature: `
For this FEATURE request, include:
1. Functional Requirements - What the feature should do
2. User Interface Requirements - UI/UX specifications
3. API Requirements - Backend endpoints and data flow
4. Database Requirements - Schema changes, data operations
5. Integration Requirements - How it connects to existing features
6. Performance Requirements - Response times, scalability
7. Security Requirements - Authentication, authorization, data protection
8. Test Scenarios - Unit, integration, and user acceptance tests
9. Edge Cases - Error conditions, boundary conditions`,

      bug: `
For this BUG report, include:
1. Root Cause Analysis - Expected vs actual behavior
2. Fix Requirements - What needs to be corrected
3. Regression Prevention - Tests to prevent reoccurrence
4. Impact Assessment - Affected components and users
5. Verification Steps - How to confirm the fix works
6. Compatibility Requirements - Cross-browser, device testing
7. Monitoring Requirements - Logging, error tracking`,

      technical: `
For this TECHNICAL task, include:
1. Technical Objectives - What technical goals to achieve
2. Implementation Requirements - Code structure, patterns
3. Architecture Changes - System design modifications
4. Code Quality Requirements - Standards, documentation
5. Testing Requirements - Unit tests, integration tests
6. Documentation Requirements - Code comments, README updates
7. Deployment Requirements - Build, deployment considerations`,

      enhancement: `
For this ENHANCEMENT, include:
1. Enhancement Scope - What's being improved and why
2. User Experience Improvements - UX/UI enhancements
3. Performance Improvements - Speed, efficiency gains
4. Backward Compatibility - Ensuring existing functionality works
5. Rollout Strategy - How to deploy the enhancement`,
    };

    return instructions[issueType] || instructions.feature;
  }

  getContextualRequirements(options) {
    let requirements = '';

    if (options.includeBusinessContext) {
      requirements += `
Business Context Requirements:
- Consider impact on business intelligence workflows
- Ensure compatibility with existing database connections (MongoDB/SQL Server)
- Account for role-based access control requirements
- Consider workflow automation implications`;
    }

    if (options.includeTechnicalSpecs) {
      requirements += `
Technical Specifications:
- Follow existing code patterns and architecture
- Include proper error handling and logging
- Consider rate limiting and security middleware
- Include proper validation using express-validator`;
    }

    if (options.includeTestCases) {
      requirements += `
Testing Requirements:
- Include Jest test cases for new functionality
- Specify frontend testing patterns
- Include API endpoint testing
- Consider accessibility testing requirements`;
    }

    return requirements;
  }

  parseResponse(content) {
    try {
      const parsed = JSON.parse(content);
      return {
        success: true,
        acceptanceCriteria: parsed,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      return {
        success: false,
        error: 'Failed to parse AI response',
        rawContent: content,
      };
    }
  }

  formatAcceptanceCriteriaForGitHub(criteria) {
    let formatted = `## 🤖 AI-Generated Acceptance Criteria\n\n`;

    if (criteria.summary) {
      formatted += `**Summary:** ${criteria.summary}\n\n`;
    }

    if (criteria.acceptanceCriteria) {
      const ac = criteria.acceptanceCriteria;

      if (ac.functional) {
        formatted += `### Functional Requirements\n`;
        ac.functional.forEach((item, index) => {
          formatted += `- [ ] **${item.title}**: ${item.description}\n`;
        });
        formatted += '\n';
      }

      if (ac.technical) {
        formatted += `### Technical Requirements\n`;
        ac.technical.forEach((item, index) => {
          formatted += `- [ ] **${item.title}**: ${item.description}\n`;
        });
        formatted += '\n';
      }

      if (ac.testScenarios) {
        formatted += `### Test Scenarios\n`;
        ac.testScenarios.forEach((test, index) => {
          formatted += `- [ ] ${test}\n`;
        });
        formatted += '\n';
      }

      if (ac.edgeCases) {
        formatted += `### Edge Cases\n`;
        ac.edgeCases.forEach((edge, index) => {
          formatted += `- [ ] ${edge}\n`;
        });
        formatted += '\n';
      }
    }

    formatted += `---\n*Generated by Mirabel API AI Assistant on ${new Date().toLocaleString()}*`;

    return formatted;
  }
}

module.exports = AIAcceptanceCriteriaService;

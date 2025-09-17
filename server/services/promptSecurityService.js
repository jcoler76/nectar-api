const { logger } = require('../middleware/logger');

/**
 * Prompt Security Service
 * Comprehensive protection against AI/ML prompt injection attacks
 */
class PromptSecurityService {
  constructor() {
    this.injectionPatterns = this.initializePatterns();
    this.contextBoundaries = this.initializeContextBoundaries();
    this.threatStatistics = {
      totalAnalyzed: 0,
      threatsDetected: 0,
      falsePositives: 0,
      patternMatches: new Map(),
    };
  }

  /**
   * Initialize comprehensive prompt injection detection patterns
   */
  initializePatterns() {
    return [
      // System prompt overrides
      {
        pattern:
          /ignore.{0,20}(previous|prior|initial|original).{0,20}(instructions?|prompts?|rules?)/i,
        severity: 'HIGH',
        category: 'SYSTEM_OVERRIDE',
        description: 'Attempts to ignore system instructions',
      },
      {
        pattern: /disregard.{0,20}(all|any).{0,20}(prior|previous|earlier)/i,
        severity: 'HIGH',
        category: 'SYSTEM_OVERRIDE',
        description: 'Attempts to disregard prior instructions',
      },
      {
        pattern: /forget.{0,20}(everything|all).{0,20}(above|before|prior)/i,
        severity: 'HIGH',
        category: 'SYSTEM_OVERRIDE',
        description: 'Attempts to forget previous context',
      },

      // Role manipulation
      {
        pattern: /(you.{0,10}are.{0,10}now|from.{0,10}now.{0,10}on).{0,30}(act|behave|respond)/i,
        severity: 'HIGH',
        category: 'ROLE_MANIPULATION',
        description: 'Attempts to change AI role or behavior',
      },
      {
        pattern:
          /you.{0,10}are.{0,10}now.{0,50}(dan|do.{0,10}anything|unrestricted|helpful.{0,20}assistant)/i,
        severity: 'HIGH',
        category: 'ROLE_MANIPULATION',
        description: 'DAN or unrestricted assistant role assignment',
      },
      {
        pattern:
          /(forget|discard|abandon).{0,10}everything.{0,20}(and|then).{0,20}(pretend|act|behave)/i,
        severity: 'HIGH',
        category: 'ROLE_MANIPULATION',
        description: 'Attempts to reset AI memory and change behavior',
      },
      {
        pattern: /pretend.{0,10}(to.{0,10}be|that.{0,10}you.{0,10}are)/i,
        severity: 'HIGH',
        category: 'ROLE_MANIPULATION',
        description: 'Role pretending attempts',
      },
      {
        pattern:
          /(act|behave).{0,10}as.{0,10}(if|though).{0,50}(safety|filter|restriction|limitation).{0,20}(disabled|removed|off)/i,
        severity: 'HIGH',
        category: 'ROLE_MANIPULATION',
        description: 'Attempts to disable safety systems',
      },
      {
        pattern: /(act|behave).{0,10}as.{0,10}(if|though)/i,
        severity: 'MEDIUM',
        category: 'ROLE_MANIPULATION',
        description: 'Conditional role changes',
      },

      // Jailbreak attempts
      {
        pattern: /(jailbreak|jail.{0,5}break)/i,
        severity: 'CRITICAL',
        category: 'JAILBREAK',
        description: 'Direct jailbreak attempt',
      },
      {
        pattern: /(bypass|circumvent|override).{0,20}(restrictions?|limitations?|safety|filters?)/i,
        severity: 'HIGH',
        category: 'JAILBREAK',
        description: 'Attempts to bypass safety measures',
      },
      {
        pattern: /(disable|turn.{0,10}off|remove).{0,20}(safety|restrictions?|filters?)/i,
        severity: 'HIGH',
        category: 'JAILBREAK',
        description: 'Attempts to disable safety features',
      },

      // Data extraction
      {
        pattern:
          /(reveal|show|tell.{0,10}me).{0,20}(your|the).{0,20}(system.{0,10}prompt|instructions?|rules?)/i,
        severity: 'HIGH',
        category: 'DATA_EXTRACTION',
        description: 'Attempts to extract system prompts',
      },
      {
        pattern:
          /(what|how).{0,20}(are|were).{0,20}(your|the).{0,20}(original|initial).{0,20}(instructions?|prompts?)/i,
        severity: 'HIGH',
        category: 'DATA_EXTRACTION',
        description: 'Queries about original instructions',
      },
      {
        pattern:
          /(list|enumerate|describe).{0,20}(your|the).{0,20}(constraints?|limitations?|rules?)/i,
        severity: 'MEDIUM',
        category: 'DATA_EXTRACTION',
        description: 'Attempts to enumerate system constraints',
      },

      // Structured injection formats
      {
        pattern: /\[INST\].*\[\/INST\]/s,
        severity: 'HIGH',
        category: 'STRUCTURED_INJECTION',
        description: 'Llama/Alpaca instruction format injection',
      },
      {
        pattern: /<<<.*>>>/s,
        severity: 'MEDIUM',
        category: 'STRUCTURED_INJECTION',
        description: 'XML-style instruction injection',
      },
      {
        pattern: /###.{0,20}(new.{0,10})?(instruction|prompt|system)/i,
        severity: 'HIGH',
        category: 'STRUCTURED_INJECTION',
        description: 'Markdown-style instruction injection',
      },
      {
        pattern: /---\s*\n.*system.{0,20}:/is,
        severity: 'HIGH',
        category: 'STRUCTURED_INJECTION',
        description: 'YAML frontmatter injection',
      },

      // Encoding and obfuscation
      {
        pattern: /\\u[0-9a-fA-F]{4}|\\x[0-9a-fA-F]{2}|&#x?[0-9a-fA-F]+;/,
        severity: 'MEDIUM',
        category: 'ENCODING',
        description: 'Unicode or hex encoding detected',
      },
      {
        pattern: /base64|atob|btoa/i,
        severity: 'MEDIUM',
        category: 'ENCODING',
        description: 'Base64 encoding references',
      },
      {
        pattern: /eval|exec|Function\(/i,
        severity: 'HIGH',
        category: 'CODE_INJECTION',
        description: 'JavaScript execution attempts',
      },

      // Prompt leaking
      {
        pattern: /(repeat|echo|output).{0,20}(the|your).{0,20}(above|previous|first)/i,
        severity: 'MEDIUM',
        category: 'PROMPT_LEAKING',
        description: 'Attempts to leak previous prompts',
      },
      {
        pattern: /(what|how).{0,20}(did|was).{0,20}(I|the.{0,10}user).{0,20}(say|ask|prompt)/i,
        severity: 'LOW',
        category: 'PROMPT_LEAKING',
        description: 'Attempts to extract user prompts',
      },

      // Context manipulation
      {
        pattern:
          /(end|stop|terminate).{0,20}(previous|current).{0,20}(conversation|context|session)/i,
        severity: 'MEDIUM',
        category: 'CONTEXT_MANIPULATION',
        description: 'Attempts to manipulate conversation context',
      },
      {
        pattern: /(new|fresh|clean).{0,20}(conversation|context|session)/i,
        severity: 'LOW',
        category: 'CONTEXT_MANIPULATION',
        description: 'Attempts to reset context',
      },

      // Multi-language injection attempts
      {
        pattern: /(ignorez|ignorar|ignorer).{0,20}(les|las|toutes).{0,20}(instructions|règles)/i,
        severity: 'HIGH',
        category: 'MULTILINGUAL_INJECTION',
        description: 'Non-English injection attempts',
      },
    ];
  }

  /**
   * Initialize context boundaries for different AI use cases
   */
  initializeContextBoundaries() {
    return {
      GENERAL: {
        maxPromptLength: 4000,
        allowedTopics: ['business', 'data', 'analysis', 'technical'],
        forbiddenPatterns: ['personal', 'private', 'secret', 'confidential'],
        requiresFiltering: true,
      },
      WORKFLOW: {
        maxPromptLength: 2000,
        allowedTopics: ['automation', 'data processing', 'formatting'],
        forbiddenPatterns: ['system', 'configuration', 'access'],
        requiresFiltering: true,
      },
      DOCUMENTATION: {
        maxPromptLength: 1500,
        allowedTopics: ['api', 'database', 'procedures'],
        forbiddenPatterns: ['credentials', 'keys', 'passwords'],
        requiresFiltering: true,
      },
    };
  }

  /**
   * Analyze prompt for injection attempts
   * @param {string} prompt - The prompt to analyze
   * @param {string} context - Context type (GENERAL, WORKFLOW, DOCUMENTATION)
   * @returns {Object} Analysis result
   */
  analyzePrompt(prompt, context = 'GENERAL') {
    this.threatStatistics.totalAnalyzed++;

    const analysis = {
      isSecure: true,
      threats: [],
      sanitizedPrompt: prompt,
      confidence: 0,
      context: context,
      metadata: {
        originalLength: prompt.length,
        sanitizedLength: prompt.length,
        analysisTime: Date.now(),
      },
    };

    try {
      // 1. Basic validation
      const basicValidation = this.performBasicValidation(prompt, context);
      if (!basicValidation.isValid) {
        analysis.isSecure = false;
        analysis.threats.push(...basicValidation.threats);
      }

      // 2. Pattern matching
      const patternAnalysis = this.detectInjectionPatterns(prompt);
      if (patternAnalysis.threatsFound.length > 0) {
        analysis.isSecure = false;
        analysis.threats.push(...patternAnalysis.threatsFound);
      }

      // 3. Structural analysis
      const structuralAnalysis = this.analyzeStructure(prompt);
      if (structuralAnalysis.suspicious) {
        analysis.isSecure = false;
        analysis.threats.push(...structuralAnalysis.threats);
      }

      // 4. Content sanitization
      analysis.sanitizedPrompt = this.sanitizePrompt(prompt, analysis.threats);
      analysis.metadata.sanitizedLength = analysis.sanitizedPrompt.length;

      // 5. Calculate confidence score
      analysis.confidence = this.calculateConfidenceScore(analysis.threats);

      // 6. Update statistics
      if (!analysis.isSecure) {
        this.threatStatistics.threatsDetected++;
        analysis.threats.forEach(threat => {
          const count = this.threatStatistics.patternMatches.get(threat.category) || 0;
          this.threatStatistics.patternMatches.set(threat.category, count + 1);
        });
      }

      // 7. Log analysis result
      this.logAnalysis(prompt, analysis);

      return analysis;
    } catch (error) {
      logger.error('Error in prompt analysis:', error);
      return {
        isSecure: false,
        threats: [
          {
            severity: 'HIGH',
            category: 'ANALYSIS_ERROR',
            description: 'Failed to analyze prompt safely',
          },
        ],
        sanitizedPrompt: '', // Fail secure
        confidence: 1.0,
        context: context,
        metadata: analysis.metadata,
      };
    }
  }

  /**
   * Perform basic validation checks
   */
  performBasicValidation(prompt, context) {
    const threats = [];
    const boundaries = this.contextBoundaries[context] || this.contextBoundaries.GENERAL;

    // Length validation
    if (prompt.length > boundaries.maxPromptLength) {
      threats.push({
        severity: 'MEDIUM',
        category: 'LENGTH_VIOLATION',
        description: `Prompt exceeds maximum length (${prompt.length}/${boundaries.maxPromptLength})`,
      });
    }

    // Empty or suspicious prompt
    if (!prompt || prompt.trim().length === 0) {
      threats.push({
        severity: 'LOW',
        category: 'EMPTY_PROMPT',
        description: 'Empty or whitespace-only prompt',
      });
    }

    // Control character detection
    if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(prompt)) {
      threats.push({
        severity: 'HIGH',
        category: 'CONTROL_CHARACTERS',
        description: 'Contains control characters',
      });
    }

    // Excessive whitespace or formatting
    if (/\s{50,}/.test(prompt) || /\n{10,}/.test(prompt)) {
      threats.push({
        severity: 'LOW',
        category: 'FORMATTING_ABUSE',
        description: 'Excessive whitespace or line breaks',
      });
    }

    return {
      isValid: threats.length === 0,
      threats: threats,
    };
  }

  /**
   * Detect injection patterns in prompt
   */
  detectInjectionPatterns(prompt) {
    const threatsFound = [];

    for (const patternDef of this.injectionPatterns) {
      try {
        if (patternDef.pattern.test(prompt)) {
          threatsFound.push({
            severity: patternDef.severity,
            category: patternDef.category,
            description: patternDef.description,
            pattern: patternDef.pattern.toString(),
            match: prompt.match(patternDef.pattern)?.[0] || 'Pattern matched',
          });
        }
      } catch (error) {
        logger.warn('Error testing pattern:', {
          pattern: patternDef.pattern.toString(),
          error: error.message,
        });
      }
    }

    return { threatsFound };
  }

  /**
   * Analyze prompt structure for suspicious elements
   */
  analyzeStructure(prompt) {
    const threats = [];
    let suspicious = false;

    // Multiple instruction markers
    const instructionMarkers = prompt.match(/(?:instruction|prompt|system|command)/gi) || [];
    if (instructionMarkers.length > 3) {
      suspicious = true;
      threats.push({
        severity: 'MEDIUM',
        category: 'EXCESSIVE_INSTRUCTIONS',
        description: `Multiple instruction markers detected (${instructionMarkers.length})`,
      });
    }

    // Nested delimiters
    const nestedDelimiters = /[<{\[\(]{3,}|[>\}\]\)]{3,}/.test(prompt);
    if (nestedDelimiters) {
      suspicious = true;
      threats.push({
        severity: 'MEDIUM',
        category: 'NESTED_DELIMITERS',
        description: 'Suspicious nested delimiter patterns',
      });
    }

    // Repetitive patterns (possible obfuscation)
    const repetitivePattern = /(.{3,})\1{5,}/.test(prompt);
    if (repetitivePattern) {
      suspicious = true;
      threats.push({
        severity: 'LOW',
        category: 'REPETITIVE_PATTERN',
        description: 'Repetitive character patterns detected',
      });
    }

    // Mixed scripts (possible evasion)
    const hasLatin = /[a-zA-Z]/.test(prompt);
    const hasCyrillic = /[\u0400-\u04FF]/.test(prompt);
    const hasArabic = /[\u0600-\u06FF]/.test(prompt);
    const hasCJK = /[\u4E00-\u9FFF\u3400-\u4DBF]/.test(prompt);

    const scriptCount = [hasLatin, hasCyrillic, hasArabic, hasCJK].filter(Boolean).length;
    if (scriptCount > 2) {
      suspicious = true;
      threats.push({
        severity: 'MEDIUM',
        category: 'MIXED_SCRIPTS',
        description: 'Multiple writing systems detected (possible evasion)',
      });
    }

    return { suspicious, threats };
  }

  /**
   * Sanitize prompt by removing/replacing threats
   */
  sanitizePrompt(prompt, threats) {
    let sanitized = prompt;

    // Apply sanitization based on threat types
    for (const threat of threats) {
      switch (threat.category) {
        case 'CONTROL_CHARACTERS':
          sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
          break;

        case 'EXCESSIVE_INSTRUCTIONS':
          // Limit instruction-related words
          sanitized = sanitized.replace(/(instruction|prompt|system|command)/gi, match => {
            const count = (sanitized.match(new RegExp(match, 'gi')) || []).length;
            return count > 2 ? '' : match;
          });
          break;

        case 'FORMATTING_ABUSE':
          sanitized = sanitized.replace(/\s{10,}/g, ' ').replace(/\n{5,}/g, '\n');
          break;

        case 'ENCODING':
          // Remove potential encoding attacks
          sanitized = sanitized.replace(
            /\\u[0-9a-fA-F]{4}|\\x[0-9a-fA-F]{2}|&#x?[0-9a-fA-F]+;/g,
            ''
          );
          break;

        case 'STRUCTURED_INJECTION':
          // Remove structured injection patterns
          sanitized = sanitized.replace(/\[INST\].*?\[\/INST\]/gs, '');
          sanitized = sanitized.replace(/<<<.*?>>>/gs, '');
          sanitized = sanitized.replace(/###.*?instruction.*?\n/gi, '');
          break;

        default:
          // For high-severity threats, consider more aggressive sanitization
          if (threat.severity === 'CRITICAL') {
            // For critical threats, replace with safe alternative
            if (threat.match) {
              sanitized = sanitized.replace(
                new RegExp(escapeRegExp(threat.match), 'gi'),
                '[CONTENT_FILTERED]'
              );
            }
          }
      }
    }

    return sanitized.trim();
  }

  /**
   * Calculate confidence score for threat detection
   */
  calculateConfidenceScore(threats) {
    if (threats.length === 0) return 0;

    const severityWeights = {
      CRITICAL: 1.0,
      HIGH: 0.8,
      MEDIUM: 0.5,
      LOW: 0.2,
    };

    const maxScore = threats.reduce((sum, threat) => {
      return sum + (severityWeights[threat.severity] || 0.1);
    }, 0);

    // Normalize to 0-1 scale
    return Math.min(maxScore / threats.length, 1.0);
  }

  /**
   * Log analysis for security monitoring
   */
  logAnalysis(prompt, analysis) {
    if (!analysis.isSecure) {
      logger.warn('Potential prompt injection detected:', {
        promptLength: prompt.length,
        threatsDetected: analysis.threats.length,
        severity: Math.max(
          ...analysis.threats.map(t => {
            const weights = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
            return weights[t.severity] || 0;
          })
        ),
        categories: [...new Set(analysis.threats.map(t => t.category))],
        confidence: analysis.confidence,
        context: analysis.context,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get threat statistics
   */
  getStatistics() {
    const patternStats = {};
    for (const [category, count] of this.threatStatistics.patternMatches) {
      patternStats[category] = count;
    }

    return {
      ...this.threatStatistics,
      patternMatches: patternStats,
      detectionRate:
        this.threatStatistics.totalAnalyzed > 0
          ? (
              (this.threatStatistics.threatsDetected / this.threatStatistics.totalAnalyzed) *
              100
            ).toFixed(2)
          : 0,
    };
  }

  /**
   * Update patterns (for dynamic learning)
   */
  addPattern(pattern, severity, category, description) {
    this.injectionPatterns.push({
      pattern: new RegExp(pattern, 'i'),
      severity: severity,
      category: category,
      description: description,
    });
  }

  /**
   * Validate response from AI for potential data leakage
   */
  validateResponse(response, originalPrompt = '') {
    const issues = [];

    // Check for system prompt leakage
    if (response.toLowerCase().includes('system') && response.toLowerCase().includes('prompt')) {
      issues.push({
        severity: 'HIGH',
        category: 'SYSTEM_PROMPT_LEAK',
        description: 'Response may contain system prompt information',
      });
    }

    // Check for credential patterns
    const credentialPatterns = [
      /(?:password|pwd|passwd)\s*[:=]\s*\S+/i,
      /(?:api[_-]?key|token)\s*[:=]\s*\S+/i,
      /(?:secret|private[_-]?key)\s*[:=]\s*\S+/i,
    ];

    for (const pattern of credentialPatterns) {
      if (pattern.test(response)) {
        issues.push({
          severity: 'CRITICAL',
          category: 'CREDENTIAL_LEAK',
          description: 'Response may contain credentials or sensitive keys',
        });
      }
    }

    // Check for internal system information
    const systemInfoPatterns = [
      /(?:server|host|database)\s*[:=]\s*\S+/i,
      /(?:localhost|127\.0\.0\.1|\d+\.\d+\.\d+\.\d+):\d+/,
      /[a-zA-Z]:[\\\/](?:users|windows|system32)/i,
    ];

    for (const pattern of systemInfoPatterns) {
      if (pattern.test(response)) {
        issues.push({
          severity: 'MEDIUM',
          category: 'SYSTEM_INFO_LEAK',
          description: 'Response may contain internal system information',
        });
      }
    }

    return {
      isSecure: issues.length === 0,
      issues: issues,
      sanitizedResponse: this.sanitizeResponse(response, issues),
    };
  }

  /**
   * Sanitize AI response
   */
  sanitizeResponse(response, issues) {
    let sanitized = response;

    for (const issue of issues) {
      switch (issue.category) {
        case 'CREDENTIAL_LEAK':
          sanitized = sanitized.replace(
            /(?:password|pwd|passwd|api[_-]?key|token|secret|private[_-]?key)\s*[:=]\s*\S+/gi,
            '[REDACTED]'
          );
          break;
        case 'SYSTEM_INFO_LEAK':
          sanitized = sanitized.replace(/(?:server|host|database)\s*[:=]\s*\S+/gi, '[REDACTED]');
          sanitized = sanitized.replace(/\d+\.\d+\.\d+\.\d+:\d+/g, '[IP:PORT]');
          break;
      }
    }

    return sanitized;
  }
}

// Utility function to escape regex special characters
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = PromptSecurityService;

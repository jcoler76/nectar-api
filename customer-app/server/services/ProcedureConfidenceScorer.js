/**
 * Procedure Confidence Scoring System
 * Multi-factor confidence calculation for stored procedures
 * Uses modification dates, naming patterns, business classification, and usage analytics
 */
class ProcedureConfidenceScorer {
  constructor() {
    this.scoringWeights = this.initializeScoringWeights();
    this.namingPatterns = this.initializeNamingPatterns();
    this.businessEntityMappings = this.initializeBusinessEntityMappings();
  }

  /**
   * Initialize scoring weights for different confidence factors
   */
  initializeScoringWeights() {
    return {
      temporal: 0.3, // 30% - Modification date recency
      pattern: 0.25, // 25% - Naming pattern confidence
      business: 0.2, // 20% - Business entity classification
      usage: 0.15, // 15% - Usage frequency/analytics
      validation: 0.1, // 10% - Manual validation/review
    };
  }

  /**
   * Initialize naming pattern confidence mapping
   */
  initializeNamingPatterns() {
    return {
      // Active procedure patterns (high confidence)
      active: {
        patterns: [
          {
            regex: /^usp[A-Z][a-zA-Z]+$/,
            confidence: 0.95,
            description: 'Standard USP naming convention',
          },
          {
            regex: /^usp[A-Z][a-zA-Z]+Get$/,
            confidence: 0.98,
            description: 'Standard Get procedure',
          },
          {
            regex: /^usp[A-Z][a-zA-Z]+Save$/,
            confidence: 0.98,
            description: 'Standard Save procedure',
          },
          {
            regex: /^usp[A-Z][a-zA-Z]+Delete$/,
            confidence: 0.9,
            description: 'Standard Delete procedure',
          },
          {
            regex: /^usp[A-Z][a-zA-Z]+ByCriteriaGet$/,
            confidence: 0.95,
            description: 'Standard Search procedure',
          },
        ],
        baseConfidence: 0.85,
      },

      // Reporting procedures (medium-high confidence)
      reporting: {
        patterns: [
          {
            regex: /^uspReport[A-Z][a-zA-Z]+Get$/,
            confidence: 0.9,
            description: 'Standard reporting procedure',
          },
          {
            regex: /^usp[A-Z][a-zA-Z]+Report$/,
            confidence: 0.85,
            description: 'Business report procedure',
          },
          {
            regex: /^uspSummary[A-Z][a-zA-Z]+$/,
            confidence: 0.8,
            description: 'Summary report procedure',
          },
        ],
        baseConfidence: 0.75,
      },

      // Validation/calculation procedures (medium confidence)
      validation: {
        patterns: [
          {
            regex: /^uspValidate[A-Z][a-zA-Z]+$/,
            confidence: 0.8,
            description: 'Validation procedure',
          },
          {
            regex: /^uspCalculate[A-Z][a-zA-Z]+$/,
            confidence: 0.8,
            description: 'Calculation procedure',
          },
          {
            regex: /^uspProcess[A-Z][a-zA-Z]+$/,
            confidence: 0.75,
            description: 'Processing procedure',
          },
        ],
        baseConfidence: 0.7,
      },

      // Legacy patterns (lower confidence)
      legacy: {
        patterns: [
          { regex: /^sp_[a-zA-Z]+$/, confidence: 0.5, description: 'Legacy sp_ procedure' },
          { regex: /^proc_[a-zA-Z]+$/, confidence: 0.45, description: 'Legacy proc_ procedure' },
          { regex: /.*_old$/, confidence: 0.3, description: 'Archived procedure' },
          { regex: /.*_backup$/, confidence: 0.25, description: 'Backup procedure' },
          { regex: /.*_temp$/, confidence: 0.2, description: 'Temporary procedure' },
        ],
        baseConfidence: 0.4,
      },

      // System procedures (exclude from business logic)
      system: {
        patterns: [
          { regex: /^sp_help.*$/, confidence: 0.1, description: 'System help procedure' },
          { regex: /^sp_MS_.*$/, confidence: 0.05, description: 'Microsoft system procedure' },
          { regex: /^xp_.*$/, confidence: 0.05, description: 'Extended system procedure' },
          { regex: /^dt_.*$/, confidence: 0.05, description: 'Developer tools procedure' },
        ],
        baseConfidence: 0.05,
      },
    };
  }

  /**
   * Initialize business entity mapping patterns
   */
  initializeBusinessEntityMappings() {
    return {
      customer: {
        patterns: [/contact/i, /customer/i, /client/i, /account/i, /prospect/i],
        importance: 10, // Critical business entity
        confidence: 0.95,
      },
      contract: {
        patterns: [/contract/i, /agreement/i, /deal/i, /sale/i, /opportunity/i, /proposal/i],
        importance: 9,
        confidence: 0.9,
      },
      invoice: {
        patterns: [/invoice/i, /bill/i, /billing/i, /charge/i, /payment/i, /receipt/i],
        importance: 9,
        confidence: 0.9,
      },
      payment: {
        patterns: [/payment/i, /receipt/i, /transaction/i, /cash/i, /check/i, /card/i],
        importance: 8,
        confidence: 0.85,
      },
      opportunity: {
        patterns: [/opportunity/i, /prospect/i, /lead/i, /pipeline/i, /forecast/i],
        importance: 8,
        confidence: 0.85,
      },
      production: {
        patterns: [/production/i, /job/i, /workflow/i, /stage/i, /manufacturing/i],
        importance: 7,
        confidence: 0.8,
      },
      subscription: {
        patterns: [/subscription/i, /recurring/i, /plan/i, /tier/i, /service/i],
        importance: 7,
        confidence: 0.8,
      },
      employee: {
        patterns: [/employee/i, /staff/i, /user/i, /person/i, /hr/i, /payroll/i],
        importance: 6,
        confidence: 0.75,
      },
      reference: {
        patterns: [/state/i, /country/i, /category/i, /type/i, /lookup/i, /ref/i],
        importance: 4,
        confidence: 0.7,
      },
      system: {
        patterns: [/audit/i, /log/i, /system/i, /config/i, /setting/i, /admin/i],
        importance: 2,
        confidence: 0.6,
      },
    };
  }

  /**
   * Calculate comprehensive confidence score for a procedure
   */
  calculateProcedureConfidence(procedure) {
    const scores = {
      temporal: this.calculateTemporalScore(procedure),
      pattern: this.calculatePatternScore(procedure),
      business: this.calculateBusinessScore(procedure),
      usage: this.calculateUsageScore(procedure),
      validation: this.calculateValidationScore(procedure),
    };

    // Calculate weighted average
    const overallConfidence = Object.entries(scores).reduce((total, [factor, score]) => {
      return total + score * this.scoringWeights[factor];
    }, 0);

    return {
      overallConfidence: Math.min(overallConfidence, 1.0),
      componentScores: scores,
      details: this.generateScoreDetails(procedure, scores),
      lastCalculated: new Date(),
    };
  }

  /**
   * Calculate temporal confidence based on modification dates
   */
  calculateTemporalScore(procedure) {
    if (!procedure.modifyDate && !procedure.createDate) {
      return 0.5; // Default score when no date information available
    }

    const now = new Date();
    const modifyDate = new Date(procedure.modifyDate || procedure.createDate);
    const createDate = new Date(procedure.createDate || procedure.modifyDate);

    const daysSinceModified = Math.floor((now - modifyDate) / (1000 * 60 * 60 * 24));
    const daysSinceCreated = Math.floor((now - createDate) / (1000 * 60 * 60 * 24));

    // Base recency score
    let recencyScore = 1.0;
    if (daysSinceModified <= 30)
      recencyScore = 1.0; // Very recent (last month)
    else if (daysSinceModified <= 90)
      recencyScore = 0.95; // Recent (last 3 months)
    else if (daysSinceModified <= 180)
      recencyScore = 0.9; // Fairly recent (last 6 months)
    else if (daysSinceModified <= 365)
      recencyScore = 0.8; // This year
    else if (daysSinceModified <= 730)
      recencyScore = 0.65; // Last 2 years
    else if (daysSinceModified <= 1095)
      recencyScore = 0.5; // Last 3 years
    else if (daysSinceModified <= 1825)
      recencyScore = 0.35; // Last 5 years
    else recencyScore = 0.2; // Very old

    // Maintenance bonus (procedure modified after creation shows active maintenance)
    let maintenanceBonus = 0;
    if (modifyDate > createDate) {
      const maintenanceFrequency = (modifyDate - createDate) / (1000 * 60 * 60 * 24);
      if (maintenanceFrequency < 365)
        maintenanceBonus = 0.1; // Modified within a year of creation
      else maintenanceBonus = 0.05; // Modified but longer ago
    }

    // Age penalty (very old procedures get penalty even if recently modified)
    let agePenalty = 0;
    if (daysSinceCreated > 2555)
      agePenalty = 0.1; // Created more than 7 years ago
    else if (daysSinceCreated > 1825) agePenalty = 0.05; // Created more than 5 years ago

    return Math.max(recencyScore + maintenanceBonus - agePenalty, 0.1);
  }

  /**
   * Calculate pattern-based confidence from procedure naming
   */
  calculatePatternScore(procedure) {
    const procedureName = procedure.procedureName || procedure.name || '';

    // Check each pattern category
    for (const [category, config] of Object.entries(this.namingPatterns)) {
      for (const pattern of config.patterns) {
        if (pattern.regex.test(procedureName)) {
          return pattern.confidence;
        }
      }
    }

    // No specific pattern matched, use generic heuristics
    return this.calculateGenericPatternScore(procedureName);
  }

  calculateGenericPatternScore(procedureName) {
    let score = 0.5; // Base score

    // Positive indicators
    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(procedureName)) score += 0.1; // Valid identifier
    if (procedureName.length >= 5 && procedureName.length <= 50) score += 0.1; // Reasonable length
    if (/^[A-Z]/.test(procedureName)) score += 0.05; // Proper capitalization
    if (/_/.test(procedureName)) score += 0.05; // Uses underscores appropriately

    // Negative indicators
    if (/\d{8,}/.test(procedureName)) score -= 0.2; // Long numbers (likely generated)
    if (/test|temp|tmp|debug/i.test(procedureName)) score -= 0.3; // Test/temp indicators
    if (procedureName.length > 64) score -= 0.2; // Too long
    if (procedureName.length < 3) score -= 0.3; // Too short

    return Math.max(Math.min(score, 1.0), 0.1);
  }

  /**
   * Calculate business entity classification confidence
   */
  calculateBusinessScore(procedure) {
    const procedureName = (procedure.procedureName || procedure.name || '').toLowerCase();

    let bestMatch = null;
    let highestScore = 0;

    // Find best matching business entity
    for (const [entity, config] of Object.entries(this.businessEntityMappings)) {
      for (const pattern of config.patterns) {
        if (pattern.test(procedureName)) {
          const score = config.confidence * (config.importance / 10);
          if (score > highestScore) {
            highestScore = score;
            bestMatch = entity;
          }
        }
      }
    }

    if (bestMatch) {
      return highestScore;
    }

    // No business entity match found
    return 0.3;
  }

  /**
   * Calculate usage-based confidence (placeholder for future analytics)
   */
  calculateUsageScore(procedure) {
    // This would be enhanced with actual usage analytics
    const usage = procedure.estimatedUsageFrequency || procedure.usageFrequency || 'unknown';

    switch (usage.toLowerCase()) {
      case 'very_high':
        return 1.0;
      case 'high':
        return 0.9;
      case 'medium':
        return 0.7;
      case 'low':
        return 0.5;
      case 'very_low':
        return 0.3;
      default:
        return 0.6; // Unknown usage gets neutral score
    }
  }

  /**
   * Calculate validation-based confidence from manual reviews
   */
  calculateValidationScore(procedure) {
    if (procedure.manualValidation) {
      if (procedure.manualValidation.approved) return 1.0;
      if (procedure.manualValidation.reviewed) return 0.8;
    }

    if (procedure.isValidated) return 0.9;

    // Default score for unvalidated procedures
    return 0.5;
  }

  /**
   * Generate detailed explanation of confidence scoring
   */
  generateScoreDetails(procedure, scores) {
    const details = {
      temporal: this.explainTemporalScore(procedure, scores.temporal),
      pattern: this.explainPatternScore(procedure, scores.pattern),
      business: this.explainBusinessScore(procedure, scores.business),
      usage: this.explainUsageScore(procedure, scores.usage),
      validation: this.explainValidationScore(procedure, scores.validation),
    };

    return details;
  }

  explainTemporalScore(procedure, score) {
    if (!procedure.modifyDate && !procedure.createDate) {
      return 'No date information available - using default score';
    }

    const daysSinceModified = procedure.daysSinceModified || 0;

    if (daysSinceModified <= 30) return 'Very recent modification - high confidence';
    if (daysSinceModified <= 90) return 'Recent modification - high confidence';
    if (daysSinceModified <= 365) return 'Modified within last year - good confidence';
    if (daysSinceModified <= 1095) return 'Older modification - medium confidence';
    return 'Very old modification - lower confidence';
  }

  explainPatternScore(procedure, score) {
    const name = procedure.procedureName || procedure.name || '';

    // Find which pattern matched
    for (const [category, config] of Object.entries(this.namingPatterns)) {
      for (const pattern of config.patterns) {
        if (pattern.regex.test(name)) {
          return `Matches ${category} pattern: ${pattern.description}`;
        }
      }
    }

    return 'No specific naming pattern matched - using heuristic scoring';
  }

  explainBusinessScore(procedure, score) {
    const name = (procedure.procedureName || procedure.name || '').toLowerCase();

    for (const [entity, config] of Object.entries(this.businessEntityMappings)) {
      for (const pattern of config.patterns) {
        if (pattern.test(name)) {
          return `Classified as ${entity} entity (importance: ${config.importance}/10)`;
        }
      }
    }

    return 'No clear business entity classification';
  }

  explainUsageScore(procedure, score) {
    const usage = procedure.estimatedUsageFrequency || 'unknown';
    return `Usage frequency: ${usage}`;
  }

  explainValidationScore(procedure, score) {
    if (procedure.manualValidation?.approved) return 'Manually validated and approved';
    if (procedure.manualValidation?.reviewed) return 'Manually reviewed';
    if (procedure.isValidated) return 'Validated procedure';
    return 'Not manually validated';
  }

  /**
   * Classify procedure type based on name and patterns
   */
  classifyProcedureType(procedure) {
    const name = procedure.procedureName || procedure.name || '';

    if (/Get$|Select$|Find$|Search$/i.test(name)) return 'get';
    if (/Save$|Insert$|Update$|Upsert$/i.test(name)) return 'save';
    if (/Delete$|Remove$/i.test(name)) return 'delete';
    if (/ByCriteria|Search|Find/i.test(name)) return 'search';
    if (/Report|Summary/i.test(name)) return 'report';
    if (/Validate|Check|Verify/i.test(name)) return 'validation';
    if (/Calculate|Compute|Process/i.test(name)) return 'calculation';

    return 'other';
  }

  /**
   * Determine if procedure should be considered active/primary
   */
  isPrimaryProcedure(procedure, confidence) {
    const score = confidence.overallConfidence;
    const type = this.classifyProcedureType(procedure);

    // High confidence procedures are primary
    if (score >= 0.8) return true;

    // Core CRUD operations with decent confidence
    if (['get', 'save', 'delete'].includes(type) && score >= 0.7) return true;

    // Recent modifications with good patterns
    if (procedure.daysSinceModified <= 90 && score >= 0.6) return true;

    return false;
  }

  /**
   * Batch calculate confidence for multiple procedures
   */
  batchCalculateConfidence(procedures) {
    return procedures.map(procedure => ({
      ...procedure,
      confidence: this.calculateProcedureConfidence(procedure),
      procedureType: this.classifyProcedureType(procedure),
      isPrimary: this.isPrimaryProcedure(procedure, this.calculateProcedureConfidence(procedure)),
    }));
  }

  /**
   * Get confidence distribution statistics
   */
  getConfidenceStatistics(procedures) {
    const confidences = procedures.map(p => p.confidence?.overallConfidence || 0);

    return {
      total: procedures.length,
      highConfidence: confidences.filter(c => c >= 0.8).length,
      mediumConfidence: confidences.filter(c => c >= 0.6 && c < 0.8).length,
      lowConfidence: confidences.filter(c => c < 0.6).length,
      averageConfidence: confidences.reduce((a, b) => a + b, 0) / confidences.length,
      distribution: {
        '0.9-1.0': confidences.filter(c => c >= 0.9).length,
        '0.8-0.9': confidences.filter(c => c >= 0.8 && c < 0.9).length,
        '0.7-0.8': confidences.filter(c => c >= 0.7 && c < 0.8).length,
        '0.6-0.7': confidences.filter(c => c >= 0.6 && c < 0.7).length,
        '0.0-0.6': confidences.filter(c => c < 0.6).length,
      },
    };
  }
}

module.exports = ProcedureConfidenceScorer;

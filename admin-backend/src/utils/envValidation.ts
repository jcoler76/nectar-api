/**
 * Environment Variable Validation Utility
 * Validates required environment variables on startup
 */

interface EnvironmentConfig {
  NODE_ENV: string;
  PORT: string;
  ADMIN_PORT: string;
  ADMIN_JWT_SECRET: string;
  DATABASE_URL: string;
  LICENSE_ADMIN_KEY?: string;
  ALLOWED_ORIGINS?: string;
}

interface ValidationRule {
  key: keyof EnvironmentConfig;
  required: boolean;
  minLength?: number;
  validator?: (value: string) => boolean;
  description: string;
}

const VALIDATION_RULES: ValidationRule[] = [
  {
    key: 'NODE_ENV',
    required: true,
    description: 'Application environment (development, production, test)',
    validator: (value) => ['development', 'production', 'test'].includes(value)
  },
  {
    key: 'PORT',
    required: true,
    description: 'Main application port',
    validator: (value) => !isNaN(parseInt(value)) && parseInt(value) > 0 && parseInt(value) < 65536
  },
  {
    key: 'ADMIN_PORT',
    required: true,
    description: 'Admin backend port',
    validator: (value) => !isNaN(parseInt(value)) && parseInt(value) > 0 && parseInt(value) < 65536
  },
  {
    key: 'ADMIN_JWT_SECRET',
    required: true,
    minLength: 32,
    description: 'JWT secret for admin authentication (minimum 32 characters)',
    validator: (value) => value.length >= 32
  },
  {
    key: 'DATABASE_URL',
    required: true,
    description: 'PostgreSQL database connection URL',
    validator: (value) => value.startsWith('postgresql://') || value.startsWith('postgres://')
  },
  {
    key: 'LICENSE_ADMIN_KEY',
    required: true,
    minLength: 16,
    description: 'License server admin key for API authentication'
  },
  {
    key: 'ALLOWED_ORIGINS',
    required: false,
    description: 'CORS allowed origins (comma-separated)'
  }
];

export class EnvironmentValidator {
  private static errors: string[] = [];
  private static warnings: string[] = [];

  /**
   * Validate all required environment variables
   */
  static validate(): { isValid: boolean; errors: string[]; warnings: string[] } {
    this.errors = [];
    this.warnings = [];

    console.log('🔍 Validating environment configuration...');

    for (const rule of VALIDATION_RULES) {
      this.validateRule(rule);
    }

    // Additional security checks
    this.validateSecuritySettings();

    const isValid = this.errors.length === 0;

    if (isValid) {
      console.log('✅ Environment validation passed');
      if (this.warnings.length > 0) {
        console.log('⚠️  Environment warnings:');
        this.warnings.forEach(warning => console.log(`   ${warning}`));
      }
    } else {
      console.error('❌ Environment validation failed:');
      this.errors.forEach(error => console.error(`   ${error}`));
    }

    return {
      isValid,
      errors: [...this.errors],
      warnings: [...this.warnings]
    };
  }

  /**
   * Validate a single environment rule
   */
  private static validateRule(rule: ValidationRule): void {
    const value = process.env[rule.key];

    // Check if required variable is missing
    if (rule.required && (!value || value.trim() === '')) {
      this.errors.push(`Missing required environment variable: ${rule.key} (${rule.description})`);
      return;
    }

    // Skip validation if optional and not provided
    if (!rule.required && (!value || value.trim() === '')) {
      return;
    }

    // Validate minimum length
    if (rule.minLength && value && value.length < rule.minLength) {
      this.errors.push(`${rule.key} must be at least ${rule.minLength} characters long`);
    }

    // Run custom validator
    if (rule.validator && value && !rule.validator(value)) {
      this.errors.push(`${rule.key} has invalid format: ${rule.description}`);
    }
  }

  /**
   * Additional security-specific validations
   */
  private static validateSecuritySettings(): void {
    const nodeEnv = process.env.NODE_ENV;
    const jwtSecret = process.env.ADMIN_JWT_SECRET;

    // Production security checks
    if (nodeEnv === 'production') {
      // Check for weak JWT secrets in production
      if (jwtSecret && this.isWeakSecret(jwtSecret)) {
        this.errors.push('ADMIN_JWT_SECRET appears to be a default or weak secret. Use a cryptographically secure random string in production.');
      }

      // Ensure HTTPS enforcement in production
      if (!process.env.FORCE_HTTPS) {
        this.warnings.push('Consider setting FORCE_HTTPS=true for production environments');
      }
    }

    // Development warnings
    if (nodeEnv === 'development') {
      if (!process.env.LICENSE_ADMIN_KEY) {
        this.warnings.push('LICENSE_ADMIN_KEY not set - license management features will fail');
      }
    }
  }

  /**
   * Check if JWT secret is weak or commonly used
   */
  private static isWeakSecret(secret: string): boolean {
    const weakSecrets = [
      'secret',
      'your-secret-key',
      'jwt-secret',
      'admin-secret',
      'default-secret',
      'Kx9mP2vN8qR5tY7uI3oL6wE1zX4sD0fG', // Example secret from documentation
      '12345678901234567890123456789012' // Simple repeated pattern
    ];

    // Check against known weak secrets
    if (weakSecrets.includes(secret)) {
      return true;
    }

    // Check for simple patterns
    if (/^(.)\1{10,}$/.test(secret)) { // Repeated character
      return true;
    }

    if (/^(012|123|abc|ABC)+/.test(secret)) { // Sequential patterns
      return true;
    }

    return false;
  }

  /**
   * Exit the application if validation fails
   */
  static validateOrExit(): void {
    const result = this.validate();

    if (!result.isValid) {
      console.error('\n💥 Application startup failed due to environment configuration errors.');
      console.error('Please fix the above issues and restart the application.\n');
      process.exit(1);
    }
  }
}
/**
 * Environment Variable Validation Utility
 * Validates required environment variables on startup
 */
export declare class EnvironmentValidator {
    private static errors;
    private static warnings;
    /**
     * Validate all required environment variables
     */
    static validate(): {
        isValid: boolean;
        errors: string[];
        warnings: string[];
    };
    /**
     * Validate a single environment rule
     */
    private static validateRule;
    /**
     * Additional security-specific validations
     */
    private static validateSecuritySettings;
    /**
     * Check if JWT secret is weak or commonly used
     */
    private static isWeakSecret;
    /**
     * Exit the application if validation fails
     */
    static validateOrExit(): void;
}
//# sourceMappingURL=envValidation.d.ts.map
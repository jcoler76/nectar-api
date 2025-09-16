export declare const authRateLimiter: import("express-rate-limit").RateLimitRequestHandler;
export declare const passwordChangeRateLimiter: import("express-rate-limit").RateLimitRequestHandler;
export declare const apiRateLimiter: import("express-rate-limit").RateLimitRequestHandler;
export declare const trackFailedLogin: (identifier: string) => void;
export declare const getFailedAttempts: (identifier: string) => number;
export declare const clearFailedAttempts: (identifier: string) => void;
//# sourceMappingURL=rateLimiter.d.ts.map
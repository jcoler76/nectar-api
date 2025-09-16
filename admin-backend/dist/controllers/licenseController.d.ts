import { Request, Response } from 'express';
declare class LicenseController {
    private makeRequest;
    getLicenses(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    getLicense(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    createLicense(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    updateLicense(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    suspendLicense(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    reactivateLicense(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    getCustomers(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    getCustomer(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    createCustomer(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    getDashboardStats(req: Request, res: Response): Promise<void>;
    getSystemHealth(req: Request, res: Response): Promise<void>;
    getLicenseUsage(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    getCustomerUsage(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
}
export declare const validateLicenseQuery: import("express-validator").ValidationChain[];
export declare const validateLicenseId: import("express-validator").ValidationChain[];
export declare const validateCustomerId: import("express-validator").ValidationChain[];
export declare const validateLicenseCreate: import("express-validator").ValidationChain[];
export declare const validateLicenseUpdate: import("express-validator").ValidationChain[];
export declare const validateCustomerCreate: import("express-validator").ValidationChain[];
export declare const validateSuspendLicense: import("express-validator").ValidationChain[];
export declare const licenseController: LicenseController;
export {};
//# sourceMappingURL=licenseController.d.ts.map
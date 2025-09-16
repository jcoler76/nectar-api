// License Service for Admin Portal
interface LicenseData {
  id: string;
  customerId: string;
  licenseKey: string;
  plan: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE' | 'CUSTOM';
  licenseType: 'TRIAL' | 'STANDARD' | 'ENTERPRISE' | 'CUSTOM';
  features: string[];
  maxUsers?: number;
  maxWorkflows?: number;
  maxIntegrations?: number;
  issuedAt: string;
  expiresAt?: string;
  isActive: boolean;
  isSuspended: boolean;
  deploymentId?: string;
  instanceUrl?: string;
  lastHeartbeat?: string;
  version?: string;
  billingCycle: 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'LIFETIME';
  amount?: number;
  currency?: string;
  customer: {
    id: string;
    email: string;
    companyName?: string;
    isActive: boolean;
  };
}

interface CustomerData {
  id: string;
  email: string;
  companyName?: string;
  contactName?: string;
  phone?: string;
  address?: string;
  country?: string;
  stripeCustomerId?: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  licenses: LicenseData[];
}

interface UsageData {
  id: string;
  customerId: string;
  licenseId: string;
  recordDate: string;
  activeUsers: number;
  workflowRuns: number;
  apiCalls: number;
  storageUsed: string; // BigInt as string
  integrationsUsed: number;
  dataProcessed: string; // BigInt as string
}

interface SystemHealth {
  status: 'healthy' | 'warning' | 'unhealthy';
  database: string;
  issues: string[];
  timestamp: string;
}

interface DashboardStats {
  customers: {
    total: number;
    active: number;
    inactive: number;
  };
  licenses: {
    total: number;
    active: number;
    suspended: number;
    inactive: number;
  };
  activity: {
    validationsLast30Days: number;
    totalUsageLast30Days: {
      activeUsers: number;
      workflowRuns: number;
      apiCalls: number;
    };
  };
}

class LicenseService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = (import.meta.env.VITE_ADMIN_API_URL || 'http://localhost:4001').trim();
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // Use httpOnly cookies for authentication
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  }

  // License Management
  async getLicenses(params: {
    page?: number;
    limit?: number;
    customerId?: string;
    plan?: string;
    licenseType?: string;
    isActive?: boolean;
    isSuspended?: boolean;
    search?: string;
  } = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });

    const result = await this.makeRequest(`/api/licenses/licenses?${queryParams}`);
    return {
      licenses: result.licenses || [],
      pagination: result.pagination,
    };
  }

  async getLicense(id: string) {
    const result = await this.makeRequest(`/api/licenses/licenses/${id}`);
    return result.license;
  }

  async createLicense(licenseData: {
    customerId: string;
    plan: string;
    licenseType: string;
    features?: string[];
    maxUsers?: number;
    maxWorkflows?: number;
    maxIntegrations?: number;
    expiresAt?: string;
    billingCycle?: string;
    amount?: number;
    currency?: string;
    deploymentId?: string;
  }) {
    const result = await this.makeRequest('/api/licenses/licenses', {
      method: 'POST',
      body: JSON.stringify(licenseData),
    });
    return result.license;
  }

  async updateLicense(id: string, updates: {
    plan?: string;
    features?: string[];
    maxUsers?: number;
    maxWorkflows?: number;
    maxIntegrations?: number;
    expiresAt?: string;
    isActive?: boolean;
  }) {
    const result = await this.makeRequest(`/api/licenses/licenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return result.license;
  }

  async suspendLicense(id: string, reason?: string) {
    return this.makeRequest(`/api/licenses/licenses/${id}/suspend`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async reactivateLicense(id: string) {
    return this.makeRequest(`/api/licenses/licenses/${id}/reactivate`, {
      method: 'POST',
    });
  }

  // Customer Management
  async getCustomers(params: {
    page?: number;
    limit?: number;
    search?: string;
  } = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });

    const result = await this.makeRequest(`/api/licenses/customers?${queryParams}`);
    return {
      customers: result.customers || [],
      pagination: result.pagination,
    };
  }

  async getCustomer(id: string) {
    const result = await this.makeRequest(`/api/licenses/customers/${id}`);
    return result.customer;
  }

  async createCustomer(customerData: {
    email: string;
    companyName?: string;
    contactName?: string;
    phone?: string;
    address?: string;
    country?: string;
    stripeCustomerId?: string;
  }) {
    const result = await this.makeRequest('/api/licenses/customers', {
      method: 'POST',
      body: JSON.stringify(customerData),
    });
    return result.customer;
  }

  // Usage Analytics
  async getLicenseUsage(licenseId: string, params: {
    startDate?: string;
    endDate?: string;
    granularity?: 'daily' | 'weekly' | 'monthly';
  } = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });

    const result = await this.makeRequest(`/api/licenses/usage/license/${licenseId}?${queryParams}`);
    return result.usage;
  }

  async getCustomerUsage(customerId: string, params: {
    startDate?: string;
    endDate?: string;
  } = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });

    const result = await this.makeRequest(`/api/licenses/usage/customer/${customerId}?${queryParams}`);
    return result.usage;
  }

  // System Administration
  async getDashboardStats(): Promise<DashboardStats> {
    const result = await this.makeRequest('/api/licenses/admin/dashboard');
    return result.stats;
  }

  async getSystemHealth(): Promise<SystemHealth> {
    const result = await this.makeRequest('/api/licenses/admin/health');
    return result.health;
  }

  // License Validation (for testing)
  async validateLicense(licenseKey: string, deploymentInfo?: {
    deploymentId?: string;
    instanceUrl?: string;
    version?: string;
  }) {
    return this.makeRequest('/api/validation/validate', {
      method: 'POST',
      body: JSON.stringify({
        licenseKey,
        ...deploymentInfo,
      }),
    });
  }

  async validateLicenseStatus(licenseKey: string) {
    return this.makeRequest(`/api/validation/status/${licenseKey}`);
  }

  // Utility methods
  formatCurrency(amount: number, currency: string = 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  }

  formatBytes(bytes: number | string) {
    const numBytes = typeof bytes === 'string' ? parseInt(bytes) : bytes;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (numBytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(numBytes) / Math.log(1024));
    return Math.round(numBytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  formatRelativeTime(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = (now.getTime() - date.getTime()) / 1000;

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;

    return date.toLocaleDateString();
  }

  getLicenseStatus(license: LicenseData): {
    status: 'active' | 'suspended' | 'expired' | 'inactive';
    color: string;
    label: string;
  } {
    if (!license.isActive) {
      return { status: 'inactive', color: 'gray', label: 'Inactive' };
    }
    if (license.isSuspended) {
      return { status: 'suspended', color: 'red', label: 'Suspended' };
    }
    if (license.expiresAt && new Date(license.expiresAt) < new Date()) {
      return { status: 'expired', color: 'orange', label: 'Expired' };
    }
    return { status: 'active', color: 'green', label: 'Active' };
  }
}

export const licenseService = new LicenseService();
export type { LicenseData, CustomerData, UsageData, SystemHealth, DashboardStats };
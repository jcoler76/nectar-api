/**
 * Comprehensive API Type Definitions
 *
 * IMPORTANT: This file only defines types for existing APIs.
 * NO actual API endpoints or behaviors are modified.
 *
 * These types are based on analysis of existing service layer calls
 * and response patterns from the actual backend implementation.
 */

// ==================== BASE TYPES ====================

/**
 * Standard API response wrapper used throughout the application
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

/**
 * Error response structure from backend
 */
export interface ApiError {
  success: false;
  message: string;
  error?: string;
  details?: Record<string, any>;
}

/**
 * CRUD operation base types
 */
export interface BaseEntity {
  _id: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Pagination parameters for list endpoints
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  filter?: Record<string, any>;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ==================== USER TYPES ====================

export interface User extends BaseEntity {
  email: string;
  firstName: string;
  lastName: string;
  isAdmin: boolean;
  isActive: boolean;
  roles: string[];
  loginAttempts: number;
  passwordChangedAt?: string;
  trustedDevices: string[];
  twoFactorOTP?: {
    attempts: number;
  };
  twoFactorBackupCodes: string[];
  notificationPreferences: {
    email: {
      security: boolean;
      system: boolean;
      workflow: boolean;
      user_message: boolean;
    };
    inbox: {
      security: boolean;
      system: boolean;
      workflow: boolean;
      user_message: boolean;
    };
  };
}

export interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  isAdmin?: boolean;
  isActive?: boolean;
  roles?: string[];
}

export interface UpdateUserRequest {
  email?: string;
  firstName?: string;
  lastName?: string;
  password?: string;
  isAdmin?: boolean;
  isActive?: boolean;
  roles?: string[];
}

export interface GenerateApiKeyResponse {
  apiKey: string;
  keyId: string;
  expiresAt?: string;
}

// ==================== APPLICATION TYPES ====================

export interface Application extends BaseEntity {
  name: string;
  description?: string;
  clientId: string;
  apiKey: string;
  isActive: boolean;
  permissions: string[];
  rateLimits: {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
  };
  lastUsed?: string;
  userId: string;
}

export interface CreateApplicationRequest {
  name: string;
  description?: string;
  permissions?: string[];
  rateLimits?: {
    requestsPerMinute?: number;
    requestsPerHour?: number;
    requestsPerDay?: number;
  };
}

export interface UpdateApplicationRequest {
  name?: string;
  description?: string;
  isActive?: boolean;
  permissions?: string[];
  rateLimits?: {
    requestsPerMinute?: number;
    requestsPerHour?: number;
    requestsPerDay?: number;
  };
}

// ==================== SERVICE TYPES ====================

export interface Service extends BaseEntity {
  name: string;
  description?: string;
  type: 'database' | 'api' | 'file' | 'integration';
  active: boolean;
  configuration: Record<string, any>;
  endpoints: ServiceEndpoint[];
  connectionStatus: 'connected' | 'disconnected' | 'error';
  lastTested?: string;
  metadata?: {
    version?: string;
    author?: string;
    tags?: string[];
  };
}

export interface ServiceEndpoint {
  id: string;
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  description?: string;
  parameters: EndpointParameter[];
  responseSchema?: Record<string, any>;
  isActive: boolean;
}

export interface EndpointParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  description?: string;
  defaultValue?: any;
}

export interface CreateServiceRequest {
  name: string;
  description?: string;
  type: 'database' | 'api' | 'file' | 'integration';
  configuration: Record<string, any>;
  active?: boolean;
}

export interface UpdateServiceRequest {
  name?: string;
  description?: string;
  configuration?: Record<string, any>;
  active?: boolean;
  endpoints?: ServiceEndpoint[];
}

export interface TestServiceConnectionResponse {
  success: boolean;
  message: string;
  details?: {
    responseTime: number;
    status: string;
    metadata?: Record<string, any>;
  };
}

// ==================== CONNECTION TYPES ====================

export interface Connection extends BaseEntity {
  name: string;
  type: 'database' | 'api' | 'ftp' | 'sftp' | 'http' | 'webhook';
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string; // Encrypted in storage
  ssl?: boolean;
  isActive: boolean;
  lastTested?: string;
  testResult?: {
    success: boolean;
    message: string;
    timestamp: string;
  };
  configuration: Record<string, any>;
}

export interface CreateConnectionRequest {
  name: string;
  type: 'database' | 'api' | 'ftp' | 'sftp' | 'http' | 'webhook';
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  ssl?: boolean;
  configuration?: Record<string, any>;
}

export interface UpdateConnectionRequest {
  name?: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  ssl?: boolean;
  isActive?: boolean;
  configuration?: Record<string, any>;
}

// ==================== WORKFLOW TYPES ====================

export interface Workflow extends BaseEntity {
  name: string;
  description?: string;
  isActive: boolean;
  trigger: WorkflowTrigger;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  schedule?: WorkflowSchedule;
  lastRun?: string;
  runCount: number;
  successCount: number;
  errorCount: number;
  metadata: {
    version: string;
    author: string;
    tags: string[];
  };
}

export interface WorkflowTrigger {
  type: 'manual' | 'schedule' | 'webhook' | 'database' | 'file' | 'email' | 'form';
  configuration: Record<string, any>;
}

export interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    [key: string]: any;
  };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  data?: Record<string, any>;
}

export interface WorkflowSchedule {
  cron: string;
  timezone: string;
  enabled: boolean;
}

export interface CreateWorkflowRequest {
  name: string;
  description?: string;
  trigger: WorkflowTrigger;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  schedule?: WorkflowSchedule;
  isActive?: boolean;
}

export interface UpdateWorkflowRequest {
  name?: string;
  description?: string;
  trigger?: WorkflowTrigger;
  nodes?: WorkflowNode[];
  edges?: WorkflowEdge[];
  schedule?: WorkflowSchedule;
  isActive?: boolean;
}

export interface WorkflowExecution extends BaseEntity {
  workflowId: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: string;
  endTime?: string;
  duration?: number;
  triggerData: Record<string, any>;
  logs: WorkflowLog[];
  error?: string;
  result?: Record<string, any>;
}

export interface WorkflowLog {
  id: string;
  nodeId: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: string;
  data?: Record<string, any>;
}

// ==================== ROLE TYPES ====================

export interface Role extends BaseEntity {
  name: string;
  description?: string;
  permissions: string[];
  isSystem: boolean;
  userCount: number;
}

export interface CreateRoleRequest {
  name: string;
  description?: string;
  permissions: string[];
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string;
  permissions?: string[];
}

// ==================== REPORTS TYPES ====================

export interface ApiUsageReport {
  dateRange: {
    start: string;
    end: string;
  };
  totalRequests: number;
  requestsByEndpoint: Array<{
    endpoint: string;
    method: string;
    count: number;
    avgResponseTime: number;
  }>;
  requestsByApplication: Array<{
    applicationId: string;
    applicationName: string;
    count: number;
  }>;
  errorStats: {
    total: number;
    by4xx: number;
    by5xx: number;
    topErrors: Array<{
      message: string;
      count: number;
    }>;
  };
  performanceMetrics: {
    avgResponseTime: number;
    p95ResponseTime: number;
    slowestEndpoints: Array<{
      endpoint: string;
      avgResponseTime: number;
    }>;
  };
}

export interface WorkflowExecutionReport {
  dateRange: {
    start: string;
    end: string;
  };
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  avgExecutionTime: number;
  executionsByWorkflow: Array<{
    workflowId: string;
    workflowName: string;
    executions: number;
    successRate: number;
    avgDuration: number;
  }>;
  executionsByTrigger: Array<{
    triggerType: string;
    count: number;
    successRate: number;
  }>;
  topErrors: Array<{
    error: string;
    count: number;
    workflows: string[];
  }>;
}

export interface ActivityLogsReport {
  dateRange: {
    start: string;
    end: string;
  };
  totalActivities: number;
  activitiesByType: Array<{
    type: string;
    count: number;
  }>;
  activitiesByUser: Array<{
    userId: string;
    userName: string;
    count: number;
  }>;
  securityEvents: Array<{
    type: 'login' | 'logout' | 'failed_login' | 'password_change' | 'api_key_generated';
    count: number;
  }>;
  systemEvents: Array<{
    type: string;
    count: number;
    description: string;
  }>;
}

// ==================== AUTHENTICATION TYPES ====================

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  success: boolean;
  user: User;
  token: string;
  refreshToken: string;
  expiresIn: number;
  message?: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface ResetPasswordRequest {
  email: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// ==================== CSRF TYPES ====================

export interface CSRFTokenResponse {
  csrfToken: string;
}

// ==================== CRUD SERVICE TYPES ====================

/**
 * Generic CRUD service interface
 */
export interface CRUDService<TEntity, TCreateRequest, TUpdateRequest> {
  getAll(): Promise<TEntity[]>;
  getById(id: string): Promise<TEntity>;
  create(data: TCreateRequest): Promise<TEntity>;
  update(id: string, data: TUpdateRequest): Promise<TEntity>;
  delete(id: string): Promise<void>;
  action?(id: string, actionName: string, data?: any): Promise<any>;
}

/**
 * Extended service with custom operations
 */
export interface ExtendedCRUDService<TEntity, TCreateRequest, TUpdateRequest>
  extends CRUDService<TEntity, TCreateRequest, TUpdateRequest> {
  [key: string]: any; // Allow for custom methods
}

// ==================== TYPE UNIONS ====================

/**
 * Union of all entity types
 */
export type AnyEntity = User | Application | Service | Connection | Workflow | Role;

/**
 * Union of all create request types
 */
export type AnyCreateRequest =
  | CreateUserRequest
  | CreateApplicationRequest
  | CreateServiceRequest
  | CreateConnectionRequest
  | CreateWorkflowRequest
  | CreateRoleRequest;

/**
 * Union of all update request types
 */
export type AnyUpdateRequest =
  | UpdateUserRequest
  | UpdateApplicationRequest
  | UpdateServiceRequest
  | UpdateConnectionRequest
  | UpdateWorkflowRequest
  | UpdateRoleRequest;

// ==================== UTILITY TYPES ====================

/**
 * Extract the ID type from an entity
 */
export type EntityId<T extends BaseEntity> = T['_id'];

/**
 * Make all properties optional except ID
 */
export type PartialEntity<T extends BaseEntity> = Partial<Omit<T, '_id'>> & { _id: string };

/**
 * Remove base entity fields (for create requests)
 */
export type CreateFields<T extends BaseEntity> = Omit<T, '_id' | 'createdAt' | 'updatedAt'>;

/**
 * HTTP method types
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

/**
 * API endpoint configuration
 */
export interface ApiEndpoint {
  method: HttpMethod;
  url: string;
  headers?: Record<string, string>;
  params?: Record<string, any>;
  data?: any;
}

// ==================== VALIDATION TYPES ====================

/**
 * Field validation error
 */
export interface FieldError {
  field: string;
  message: string;
  code?: string;
}

/**
 * Validation error response
 */
export interface ValidationError extends ApiError {
  errors: FieldError[];
}

/**
 * Type guard for API responses
 */
export function isApiError(response: any): response is ApiError {
  return response && response.success === false && typeof response.message === 'string';
}

/**
 * Type guard for validation errors
 */
export function isValidationError(response: any): response is ValidationError {
  return isApiError(response) && Array.isArray((response as ValidationError).errors);
}

// All types are already exported above individually
// No need for additional exports to avoid conflicts

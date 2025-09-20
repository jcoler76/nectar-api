/**
 * Business Entity Types for Nectar Studio
 * These types provide type safety for business data and API integration
 */

// Core business entity types
export type BusinessEntityType = 'customer' | 'invoice' | 'contract' | 'opportunity' | 'payment';

// Database Procedure Types
export interface ProcedureParameter {
  parameterName: string;
  dataType: 'varchar' | 'int' | 'datetime' | 'decimal' | 'bit';
  isRequired: boolean;
  defaultValue?: string | number | boolean;
}

export interface ProcedureRecommendation {
  procedureName: string;
  confidence: number;
  businessEntity: BusinessEntityType;
  type: 'Get' | 'Save' | 'Delete' | 'Report';
  parameters: ProcedureParameter[];
  description?: string;
}

// Customer Entity Types
export interface CustomerData {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  status: 'active' | 'inactive' | 'suspended';
  createdDate: Date;
  lastModified: Date;
}

// Invoice Entity Types
export interface InvoiceData {
  id: string;
  customerId: string;
  amount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  dueDate: Date;
  createdDate: Date;
  items: InvoiceItem[];
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

// Contract Entity Types
export interface ContractData {
  id: string;
  customerId: string;
  title: string;
  status: 'draft' | 'active' | 'expired' | 'terminated';
  startDate: Date;
  endDate: Date;
  value: number;
  opportunityId?: string;
}

// Opportunity Entity Types
export interface OpportunityData {
  id: string;
  customerId: string;
  title: string;
  stage: 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'closed-won' | 'closed-lost';
  value: number;
  probability: number;
  expectedCloseDate: Date;
  activities: OpportunityActivity[];
}

export interface OpportunityActivity {
  id: string;
  type: 'call' | 'email' | 'meeting' | 'task';
  description: string;
  date: Date;
  userId: string;
}

// Payment Entity Types
export interface PaymentData {
  id: string;
  invoiceId: string;
  amount: number;
  method: 'credit_card' | 'bank_transfer' | 'check' | 'cash';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  transactionDate: Date;
  reference?: string;
}

// Business Intelligence Types
export interface BusinessIntelligence {
  lastSyncDate: Date;
  entities: BusinessEntityType[];
  procedures: ProcedureRecommendation[];
  relationships: EntityRelationship[];
  confidence: number;
}

export interface EntityRelationship {
  fromEntity: BusinessEntityType;
  toEntity: BusinessEntityType;
  relationshipType: 'one-to-one' | 'one-to-many' | 'many-to-many';
  foreignKey: string;
  confidence: number;
}

// API Response Types
export interface BusinessApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  metadata?: {
    procedureUsed?: string;
    confidence?: number;
    executionTime?: number;
  };
}

// Workflow Integration Types
export interface BusinessWorkflowTrigger {
  entityType: BusinessEntityType;
  eventType: 'created' | 'updated' | 'deleted';
  conditions?: Record<string, any>;
}

export interface BusinessWorkflowData {
  entity: BusinessEntityType;
  entityId: string;
  data: CustomerData | InvoiceData | ContractData | OpportunityData | PaymentData;
  changeType: 'insert' | 'update' | 'delete';
  timestamp: Date;
}

// GraphQL Schema Generation Types
export interface GraphQLFieldRecommendation {
  fieldName: string;
  fieldType: string;
  isRequired: boolean;
  description?: string;
  relationshipTarget?: BusinessEntityType;
}

export interface GraphQLTypeRecommendation {
  typeName: string;
  businessEntity: BusinessEntityType;
  fields: GraphQLFieldRecommendation[];
  procedures: ProcedureRecommendation[];
}

// Error Types
export interface BusinessDataError {
  code: 'PROCEDURE_NOT_FOUND' | 'INVALID_PARAMETERS' | 'EXECUTION_FAILED' | 'PERMISSION_DENIED';
  message: string;
  entity?: BusinessEntityType;
  procedure?: string;
  details?: Record<string, any>;
}

// Utility Types
export type EntityKey<T extends BusinessEntityType> = T extends 'customer'
  ? keyof CustomerData
  : T extends 'invoice'
    ? keyof InvoiceData
    : T extends 'contract'
      ? keyof ContractData
      : T extends 'opportunity'
        ? keyof OpportunityData
        : T extends 'payment'
          ? keyof PaymentData
          : never;

export type EntityData<T extends BusinessEntityType> = T extends 'customer'
  ? CustomerData
  : T extends 'invoice'
    ? InvoiceData
    : T extends 'contract'
      ? ContractData
      : T extends 'opportunity'
        ? OpportunityData
        : T extends 'payment'
          ? PaymentData
          : never;

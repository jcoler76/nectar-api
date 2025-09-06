# Template20 GraphQL Schema - AI Assistant Guide

Generated from MongoDB Template20 Intelligence
Version: v1.0-ai-optimized
Generated: 2025-07-13T15:31:20.220Z

## Business Entities

### customer
- **Concept**: Customer and contact management
- **Primary Table**: gsCustomers
- **Confidence**: 95.0%
- **Available Procedures**: 0

**Example Queries:**
```graphql
query GetCustomer {
  customer(id: "123") {
    # Add relevant fields here
    _procedures {
      name
      confidence
      type
    }
  }
}
```

### contract
- **Concept**: Sales contracts and opportunities
- **Primary Table**: gsContracts
- **Confidence**: 95.0%
- **Available Procedures**: 0

**Example Queries:**
```graphql
query GetContract {
  contract(id: "123") {
    # Add relevant fields here
    _procedures {
      name
      confidence
      type
    }
  }
}
```

### invoice
- **Concept**: Billing and invoicing
- **Primary Table**: tblInvoice
- **Confidence**: 95.0%
- **Available Procedures**: 0

**Example Queries:**
```graphql
query GetInvoice {
  invoice(id: "123") {
    # Add relevant fields here
    _procedures {
      name
      confidence
      type
    }
  }
}
```

### payment
- **Concept**: Payment processing and tracking
- **Primary Table**: tblPayment
- **Confidence**: 90.0%
- **Available Procedures**: 0

**Example Queries:**
```graphql
query GetPayment {
  payment(id: "123") {
    # Add relevant fields here
    _procedures {
      name
      confidence
      type
    }
  }
}
```

### opportunity
- **Concept**: Sales pipeline and opportunity tracking
- **Primary Table**: tblSalesOpportunity
- **Confidence**: 90.0%
- **Available Procedures**: 0

**Example Queries:**
```graphql
query GetOpportunity {
  opportunity(id: "123") {
    # Add relevant fields here
    _procedures {
      name
      confidence
      type
    }
  }
}
```

## Common Query Patterns

### 1. Entity with Relationships
```graphql
query CustomerWithInvoices {
  customer(id: "123") {
    # customer fields
    invoices {
      # invoice fields
    }
  }
}
```

### 2. Procedure Recommendations
```graphql
query GetRecommendedProcedures {
  recommendedProcedures(entityType: "customer", minConfidence: 0.8) {
    name
    confidence
    type
    parameters {
      parameterName
      dataType
    }
  }
}
```

## Integration with AI Coding Assistants

### VS Code/Cursor Integration
1. Install GraphQL extension
2. Configure schema endpoint
3. Use IntelliSense for auto-completion

### Lovable.dev Integration
1. Import schema into Lovable project
2. Use generated types for type-safe development
3. Leverage procedure recommendations for database operations

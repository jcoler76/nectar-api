/**
 * GraphQL Configuration for AI Coding Assistants
 * Configures schema discovery and IntelliSense for GraphQL schemas
 */

module.exports = {
  name: 'Nectar API GraphQL Configuration',
  schemaPath: './server/graphql/generated/typeDefs.graphql',
  includes: [
    './src/**/*.{js,jsx,ts,tsx}',
    './server/**/*.{js,ts}',
    './server/graphql/**/*.{graphql,gql}'
  ],
  excludes: [
    './node_modules/**/*',
    './dist/**/*',
    './build/**/*'
  ],
  extensions: {
    endpoints: {
      default: {
        url: 'http://localhost:3001/graphql',
        headers: {
          'Authorization': 'Bearer ${env:API_TOKEN}'
        },
        introspect: true
      },
      production: {
        url: '${env:GRAPHQL_ENDPOINT}',
        headers: {
          'Authorization': 'Bearer ${env:PRODUCTION_API_TOKEN}'
        }
      }
    },
    
    // AI Assistant Integration (using OpenAI SDK)
    aiAssistant: {
      contextFiles: [
        './server/prisma/schema.prisma',
        './README.md'
      ],
      businessEntities: [
        'customer',
        'invoice',
        'contract',
        'opportunity',
        'payment',
        'production'
      ]
    },
    
    // Code Generation
    codegen: {
      generates: {
        './src/generated/graphql.tsx': {
          documents: './src/**/*.{graphql,gql}',
          plugins: [
            'typescript',
            'typescript-operations',
            'typescript-react-apollo'
          ],
          config: {
            withHooks: true,
            withHOC: false,
            withComponent: false,
            businessContext: true
          }
        },
        
        './server/generated/resolvers.ts': {
          plugins: [
            'typescript',
            'typescript-resolvers'
          ],
          config: {
            useIndexSignature: true,
            contextType: './types#GraphQLContext',
            procedureRecommendations: true
          }
        }
      }
    },
    
    // Schema Validation
    validate: {
      rules: [
        'no-unused-fragments',
        'no-duplicate-fields',
        'fields-on-correct-type'
      ]
    }
  },
  
  // Project-specific configuration
  projects: {
    client: {
      schema: './server/graphql/generated/typeDefs.graphql',
      documents: './src/**/*.{graphql,gql,js,jsx,ts,tsx}',
      extensions: {
        endpoints: {
          default: 'http://localhost:3001/graphql'
        }
      }
    },
    
    server: {
      schema: './server/graphql/**/*.{graphql,gql}',
      documents: './server/**/*.{js,ts}',
      extensions: {
        endpoints: {
          introspection: 'http://localhost:3001/graphql'
        }
      }
    },
    
    // Entity-specific schemas for AI context
    customer: {
      schema: './server/prisma/schema.prisma',
      documents: './src/components/customer/**/*.{js,jsx,ts,tsx}',
      businessEntity: 'customer'
    },

    invoice: {
      schema: './server/prisma/schema.prisma',
      documents: './src/components/invoice/**/*.{js,jsx,ts,tsx}',
      businessEntity: 'invoice'
    },

    contract: {
      schema: './server/prisma/schema.prisma',
      documents: './src/components/contract/**/*.{js,jsx,ts,tsx}',
      businessEntity: 'contract'
    }
  }
};
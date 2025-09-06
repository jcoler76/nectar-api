/**
 * AI Integration Demo
 * Demonstrates Template20 Schema Intelligence integration for AI coding assistants
 * 
 * This example shows how AI tools (Lovable, VS Code, Cursor) can leverage
 * the Template20 intelligence system for building business applications.
 */

const Template20Intelligence = require('../server/models/Template20Intelligence');

/**
 * Demo 1: Business Entity Discovery
 * Shows how AI assistants can discover and use business entities
 */
async function demoBusinessEntityDiscovery() {
  console.log('🔍 Demo 1: Business Entity Discovery');
  console.log('===================================');
  
  try {
    // Get the latest Template20 intelligence
    const intelligence = await Template20Intelligence.getLatestIntelligence();
    
    if (!intelligence) {
      console.log('❌ No intelligence available. Run: npm run sync:template20');
      return;
    }
    
    // Get business entity summary - perfect for AI context
    const entities = intelligence.getBusinessEntitySummary();
    
    console.log(`Found ${entities.length} business entities:`);
    for (const entity of entities) {
      console.log(`\n📊 ${entity.entityType.toUpperCase()}`);
      console.log(`   Concept: ${entity.businessConcept || 'Customer and contact management'}`);
      console.log(`   Primary Table: ${entity.primaryTable}`);
      console.log(`   Tables: ${entity.tableCount}`);
      console.log(`   Procedures: ${entity.procedureCount}`);
      console.log(`   Confidence: ${(entity.confidence * 100).toFixed(1)}%`);
      console.log(`   Business Importance: ${entity.businessImportance}/10`);
    }
    
    return entities;
    
  } catch (error) {
    console.error('❌ Business entity discovery failed:', error.message);
  }
}

/**
 * Demo 2: Intelligent Procedure Recommendations
 * Shows how AI can get high-confidence procedure recommendations
 */
async function demoProcedureRecommendations(entityType = 'customer') {
  console.log(`\n🤖 Demo 2: AI Procedure Recommendations for ${entityType}`);
  console.log('=====================================================');
  
  try {
    const intelligence = await Template20Intelligence.getLatestIntelligence();
    
    // Get high-confidence procedures for the entity
    const procedures = intelligence.getProceduresForEntity(entityType, 0.7);
    
    if (procedures.length === 0) {
      console.log(`❌ No procedures found for entity: ${entityType}`);
      return;
    }
    
    console.log(`Found ${procedures.length} procedures for ${entityType} entity:`);
    
    // Sort by confidence and show top recommendations
    const sortedProcedures = procedures
      .sort((a, b) => b.overallConfidence - a.overallConfidence)
      .slice(0, 5);
      
    for (const proc of sortedProcedures) {
      const confidence = (proc.overallConfidence * 100).toFixed(1);
      const recency = proc.daysSinceModified ? `${proc.daysSinceModified} days ago` : 'unknown';
      
      console.log(`\n⚙️  ${proc.procedureName}`);
      console.log(`    Type: ${proc.procedureType || 'unknown'}`);
      console.log(`    Confidence: ${confidence}% ${confidence >= 80 ? '✅' : confidence >= 60 ? '⚠️' : '❌'}`);
      console.log(`    Last Modified: ${recency}`);
      console.log(`    Active: ${proc.isActive ? '✅' : '❌'}`);
      
      if (proc.parameters && proc.parameters.length > 0) {
        console.log(`    Parameters: ${proc.parameters.length}`);
        for (const param of proc.parameters.slice(0, 3)) {
          console.log(`      - ${param.parameterName} (${param.dataType})`);
        }
      }
    }
    
    // AI recommendation
    const bestProcedure = sortedProcedures[0];
    console.log(`\n🎯 AI Recommendation: Use "${bestProcedure.procedureName}" (${(bestProcedure.overallConfidence * 100).toFixed(1)}% confidence)`);
    
    return sortedProcedures;
    
  } catch (error) {
    console.error('❌ Procedure recommendation failed:', error.message);
  }
}

/**
 * Demo 3: Relationship Discovery
 * Shows how AI can discover table relationships for intelligent JOINs
 */
async function demoRelationshipDiscovery(tableName = 'gsCustomers') {
  console.log(`\n🔗 Demo 3: Relationship Discovery for ${tableName}`);
  console.log('===============================================');
  
  try {
    const intelligence = await Template20Intelligence.getLatestIntelligence();
    
    // Get relationships for the table
    const relationships = intelligence.getRelationshipsForTable(tableName);
    
    if (relationships.length === 0) {
      console.log(`❌ No relationships found for table: ${tableName}`);
      return;
    }
    
    console.log(`Found ${relationships.length} relationships:`);
    
    // Group by relationship type
    const byType = {};
    for (const rel of relationships) {
      const type = rel.relationshipType || 'unknown';
      if (!byType[type]) byType[type] = [];
      byType[type].push(rel);
    }
    
    for (const [type, rels] of Object.entries(byType)) {
      console.log(`\n📋 ${type.toUpperCase()} relationships:`);
      
      for (const rel of rels.slice(0, 5)) {
        const confidence = (rel.confidence * 100).toFixed(1);
        const arrow = rel.fromTable === tableName ? '→' : '←';
        const relatedTable = rel.fromTable === tableName ? rel.toTable : rel.fromTable;
        
        console.log(`   ${tableName} ${arrow} ${relatedTable}`);
        console.log(`     Join: ${rel.joinColumn || 'unknown'}`);
        console.log(`     Confidence: ${confidence}%`);
        console.log(`     Source: ${rel.discoveredFrom}`);
        console.log(`     Business Rule: ${rel.businessRule || 'No rule specified'}`);
      }
    }
    
    // AI suggestions for GraphQL/Prisma
    console.log(`\n🎯 AI Suggestions for ${tableName}:`);
    const highConfidenceRels = relationships.filter(r => r.confidence >= 0.8);
    
    console.log('\n   Prisma Include Pattern:');
    console.log('   {');
    console.log(`     include: {`);
    for (const rel of highConfidenceRels.slice(0, 3)) {
      const relatedTable = rel.fromTable === tableName ? rel.toTable : rel.fromTable;
      const fieldName = relatedTable.toLowerCase().replace(/^tbl|^gs/, '').replace(/s$/, '');
      console.log(`       ${fieldName}: true, // ${rel.businessRule || 'Related data'}`);
    }
    console.log(`     }`);
    console.log('   }');
    
    return relationships;
    
  } catch (error) {
    console.error('❌ Relationship discovery failed:', error.message);
  }
}

/**
 * Demo 4: AI-Optimized Query Generation
 * Shows how AI can generate optimized queries using intelligence
 */
async function demoAIOptimizedQueries() {
  console.log('\n🧠 Demo 4: AI-Optimized Query Generation');
  console.log('========================================');
  
  try {
    const intelligence = await Template20Intelligence.getLatestIntelligence();
    
    // Example: Generate a customer lookup query with AI optimization
    console.log('🎯 Example: AI-Optimized Customer Lookup');
    console.log('');
    
    // Get customer entity information
    const customerEntity = intelligence.businessEntities.find(e => e.entityType === 'customer');
    const customerProcedures = intelligence.getProceduresForEntity('customer', 0.8);
    const customerRelationships = intelligence.getRelationshipsForTable('gsCustomers');
    
    console.log('AI Analysis:');
    console.log(`- Primary Table: ${customerEntity?.primaryTable || 'gsCustomers'}`);
    console.log(`- Business Importance: ${customerEntity?.businessImportance || 10}/10`);
    console.log(`- High-Confidence Procedures: ${customerProcedures.length}`);
    console.log(`- Available Relationships: ${customerRelationships.length}`);
    
    // Generate optimized query suggestions
    console.log('\n🔧 AI-Generated Query Options:');
    
    // Option 1: Procedure-based (highest performance)
    if (customerProcedures.length > 0) {
      const bestProc = customerProcedures[0];
      console.log('\n1. Procedure-Based (Recommended):');
      console.log(`   // Confidence: ${(bestProc.overallConfidence * 100).toFixed(1)}%`);
      console.log(`   const result = await dbService.executeProcedure('${bestProc.procedureName}', {`);
      console.log(`     customerId: id`);
      console.log(`   });`);
    }
    
    // Option 2: Prisma with intelligent relationships
    const highConfidenceRels = customerRelationships.filter(r => r.confidence >= 0.8);
    console.log('\n2. Prisma with AI Relationships:');
    console.log('   const customer = await prisma.gsCustomers.findUnique({');
    console.log('     where: { id },');
    console.log('     include: {');
    
    for (const rel of highConfidenceRels.slice(0, 3)) {
      const relatedTable = rel.fromTable === 'gsCustomers' ? rel.toTable : rel.fromTable;
      const fieldName = relatedTable.toLowerCase().replace(/^tbl|^gs/, '').replace(/s$/, '');
      const confidence = (rel.confidence * 100).toFixed(1);
      console.log(`       ${fieldName}: true, // Relationship confidence: ${confidence}%`);
    }
    
    console.log('     }');
    console.log('   });');
    
    // Option 3: GraphQL with procedure recommendations
    console.log('\n3. GraphQL with Procedure Metadata:');
    console.log('   query GetCustomerWithIntelligence($id: ID!) {');
    console.log('     customer(id: $id) {');
    console.log('       id');
    console.log('       name');
    console.log('       # AI-discovered relationships');
    
    for (const rel of highConfidenceRels.slice(0, 2)) {
      const relatedTable = rel.fromTable === 'gsCustomers' ? rel.toTable : rel.fromTable;
      const fieldName = relatedTable.toLowerCase().replace(/^tbl|^gs/, '').replace(/s$/, '');
      console.log(`       ${fieldName} { id, name }`);
    }
    
    console.log('       # Procedure recommendations');
    console.log('       _procedures {');
    console.log('         name');
    console.log('         confidence');
    console.log('         type');
    console.log('       }');
    console.log('     }');
    console.log('   }');
    
    // Performance recommendations
    console.log('\n⚡ AI Performance Recommendations:');
    console.log(`- Use procedures for complex business logic (${customerProcedures.length} available)`);
    console.log(`- Use Prisma for simple CRUD with relationships (${highConfidenceRels.length} high-confidence)`);
    console.log('- Cache procedure recommendations to avoid repeated intelligence queries');
    console.log('- Consider batch operations for multiple entity queries');
    
  } catch (error) {
    console.error('❌ AI query generation failed:', error.message);
  }
}

/**
 * Demo 5: Real-time API Integration
 * Shows how to integrate with the Template20 intelligence APIs
 */
async function demoAPIIntegration() {
  console.log('\n🌐 Demo 5: API Integration Examples');
  console.log('=================================');
  
  console.log('AI assistants can use these API endpoints for real-time intelligence:');
  console.log('');
  
  // API examples for AI assistants
  const apiExamples = [
    {
      name: 'Get All Business Entities',
      method: 'GET',
      url: '/api/template20-sync/entities',
      description: 'Get complete business entity information for context',
      response: '{ entities: [{ entityType, businessConcept, confidence, procedures }] }'
    },
    {
      name: 'Get Entity Procedures',
      method: 'GET', 
      url: '/api/template20-sync/procedures/customer?minConfidence=0.8',
      description: 'Get high-confidence procedures for specific entity',
      response: '{ procedures: [{ name, confidence, type, parameters }] }'
    },
    {
      name: 'Get Table Relationships',
      method: 'GET',
      url: '/api/template20-sync/relationships?table=gsCustomers',
      description: 'Get relationship intelligence for JOIN optimization',
      response: '{ relationships: [{ fromTable, toTable, type, confidence }] }'
    },
    {
      name: 'Generate Prisma Schema',
      method: 'POST',
      url: '/api/ai-schema/prisma/generate',
      description: 'Generate type-safe Prisma schema with business context',
      response: '{ success: true, schemaPath, entitySchemas, statistics }'
    },
    {
      name: 'Generate GraphQL Schema',
      method: 'POST',
      url: '/api/ai-schema/graphql/generate',
      description: 'Generate GraphQL schema with procedure resolvers',
      response: '{ success: true, files, statistics }'
    },
    {
      name: 'Check Schema Status',
      method: 'GET',
      url: '/api/ai-schema/status',
      description: 'Check what schemas are generated and available',
      response: '{ prisma: { exists }, graphql: { exists }, documentation: { exists } }'
    }
  ];
  
  for (const example of apiExamples) {
    console.log(`📋 ${example.name}`);
    console.log(`   ${example.method} ${example.url}`);
    console.log(`   Purpose: ${example.description}`);
    console.log(`   Returns: ${example.response}`);
    console.log('');
  }
  
  console.log('🔧 Integration Examples:');
  console.log('');
  console.log('// Lovable.dev - Get entity context');
  console.log('const entities = await fetch("/api/template20-sync/entities").then(r => r.json());');
  console.log('');
  console.log('// VS Code Extension - Get procedure recommendations');
  console.log('const procedures = await fetch("/api/template20-sync/procedures/customer?minConfidence=0.8");');
  console.log('');
  console.log('// Cursor AI - Generate schemas on demand');  
  console.log('await fetch("/api/ai-schema/generate-all", { method: "POST" });');
}

/**
 * Main Demo Runner
 * Runs all demos to showcase AI integration capabilities
 */
async function runAllDemos() {
  console.log('🤖 Template20 AI Integration Demo');
  console.log('=================================');
  console.log('This demo showcases how AI coding assistants can leverage');
  console.log('Template20 database intelligence for building business applications.');
  console.log('');
  
  try {
    // Check MongoDB connection
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/mirabel';
      await mongoose.connect(mongoUri);
      console.log('✅ Connected to MongoDB');
    }
    
    // Run all demos
    await demoBusinessEntityDiscovery();
    await demoProcedureRecommendations('customer');
    await demoRelationshipDiscovery('gsCustomers');
    await demoAIOptimizedQueries();
    await demoAPIIntegration();
    
    console.log('\n🎉 All demos completed successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Configure your AI coding assistant (VS Code, Cursor, or Lovable)');
    console.log('2. Use the generated schemas in your development workflow');
    console.log('3. Leverage procedure recommendations for business logic');
    console.log('4. Use relationship intelligence for optimized queries');
    console.log('');
    console.log('For more information, see: AI-CODING-ASSISTANT-INTEGRATION.md');
    
  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    console.log('');
    console.log('Troubleshooting:');
    console.log('1. Ensure MongoDB is running and accessible');
    console.log('2. Run Template20 sync: curl -X POST http://localhost:3001/api/template20-sync/run');
    console.log('3. Check server is running: curl http://localhost:3001/api/template20-sync/status');
  } finally {
    // Don't disconnect if already connected externally
    if (process.env.NODE_ENV !== 'test') {
      await mongoose.disconnect();
    }
  }
}

// Export functions for use in other demos
module.exports = {
  demoBusinessEntityDiscovery,
  demoProcedureRecommendations,
  demoRelationshipDiscovery,
  demoAIOptimizedQueries,
  demoAPIIntegration,
  runAllDemos
};

// Run all demos if executed directly
if (require.main === module) {
  runAllDemos();
}
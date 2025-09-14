// Load environment variables
require('dotenv').config();

const mongoose = require('mongoose');
const Connection = require('./models/Connection');
const sql = require('mssql');
const { decryptDatabasePassword } = require('./utils/encryption');

async function queryStoredProcedures() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;

    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get the AWSSQL4 connection
    const connection = await Connection.findOne({ name: 'AWSSQL4' });
    if (!connection) {
      throw new Error('Connection AWSSQL1 not found');
    }

    console.log('Found connection:', connection.name);

    // Decrypt password and connect to SQL Server
    const decryptedPassword = decryptDatabasePassword(connection.password);

    const config = {
      user: connection.username,
      password: decryptedPassword,
      server: connection.host,
      port: parseInt(connection.port) || 1433,
      database: 'template20',
      options: {
        encrypt: true,
        trustServerCertificate: true,
        connectTimeout: 30000,
      },
    };

    console.log('Connecting to SQL Server...');
    const pool = await sql.connect(config);

    // Query for stored procedures
    const query = `
    SELECT 
        SCHEMA_NAME(p.schema_id) as SchemaName,
        p.name as ProcedureName,
        p.create_date,
        p.modify_date
    FROM sys.procedures p
    WHERE p.is_ms_shipped = 0
    ORDER BY p.name
    `;

    const result = await pool.request().query(query);

    console.log('Found', result.recordset.length, 'stored procedures in template20 database:');
    console.log('');

    // Group procedures by prefix
    const mcProcs = [];
    const uspProcs = [];
    const otherProcs = [];

    for (const proc of result.recordset) {
      const fullName =
        proc.SchemaName !== 'dbo' ? `${proc.SchemaName}.${proc.ProcedureName}` : proc.ProcedureName;

      if (proc.ProcedureName.startsWith('mc_')) {
        mcProcs.push(fullName);
      } else if (proc.ProcedureName.startsWith('usp')) {
        uspProcs.push(fullName);
      } else {
        otherProcs.push(fullName);
      }
    }

    console.log(
      `Procedures with mc_ prefix (${mcProcs.length} found - these don't exist in template20):`
    );
    if (mcProcs.length > 0) {
      console.log('  WARNING: mc_ procedures are not used in template20 database');
      for (const proc of mcProcs.sort()) {
        console.log(`  - ${proc}`);
      }
    } else {
      console.log('  - None found (expected - template20 uses usp prefix)');
    }

    console.log('');
    console.log(`Procedures with usp prefix (${uspProcs.length} found):`);
    for (const proc of uspProcs.sort().slice(0, 20)) {
      console.log(`  - ${proc}`);
    }
    if (uspProcs.length > 20) {
      console.log(`  ... and ${uspProcs.length - 20} more`);
    }

    console.log('');
    console.log(`Other procedures (${otherProcs.length} found):`);
    for (const proc of otherProcs.sort().slice(0, 10)) {
      console.log(`  - ${proc}`);
    }
    if (otherProcs.length > 10) {
      console.log(`  ... and ${otherProcs.length - 10} more`);
    }

    // Now search for procedures related to business entities
    console.log('\n=== SEARCHING FOR BUSINESS ENTITY PROCEDURES ===\n');

    // Search for customer-related procedures
    const customerProcs = result.recordset.filter(
      proc =>
        proc.ProcedureName.toLowerCase().includes('customer') ||
        proc.ProcedureName.toLowerCase().includes('contact') ||
        proc.ProcedureName.toLowerCase().includes('client')
    );

    console.log(`Customer/Contact related procedures (${customerProcs.length} found):`);
    for (const proc of customerProcs) {
      console.log(`  - ${proc.ProcedureName}`);
    }

    // Search for contract-related procedures
    const contractProcs = result.recordset.filter(
      proc =>
        proc.ProcedureName.toLowerCase().includes('contract') ||
        proc.ProcedureName.toLowerCase().includes('order') ||
        proc.ProcedureName.toLowerCase().includes('sale')
    );

    console.log(`\nContract/Order/Sale related procedures (${contractProcs.length} found):`);
    for (const proc of contractProcs) {
      console.log(`  - ${proc.ProcedureName}`);
    }

    // Search for invoice-related procedures
    const invoiceProcs = result.recordset.filter(
      proc =>
        proc.ProcedureName.toLowerCase().includes('invoice') ||
        proc.ProcedureName.toLowerCase().includes('bill') ||
        proc.ProcedureName.toLowerCase().includes('payment')
    );

    console.log(`\nInvoice/Billing/Payment related procedures (${invoiceProcs.length} found):`);
    for (const proc of invoiceProcs) {
      console.log(`  - ${proc.ProcedureName}`);
    }

    // Search for opportunity-related procedures
    const opportunityProcs = result.recordset.filter(
      proc =>
        proc.ProcedureName.toLowerCase().includes('opportunity') ||
        proc.ProcedureName.toLowerCase().includes('prospect') ||
        proc.ProcedureName.toLowerCase().includes('lead')
    );

    console.log(
      `\nOpportunity/Prospect/Lead related procedures (${opportunityProcs.length} found):`
    );
    for (const proc of opportunityProcs) {
      console.log(`  - ${proc.ProcedureName}`);
    }

    // Search for production-related procedures
    const productionProcs = result.recordset.filter(
      proc =>
        proc.ProcedureName.toLowerCase().includes('production') ||
        proc.ProcedureName.toLowerCase().includes('workflow') ||
        proc.ProcedureName.toLowerCase().includes('stage')
    );

    console.log(`\nProduction/Workflow related procedures (${productionProcs.length} found):`);
    for (const proc of productionProcs) {
      console.log(`  - ${proc.ProcedureName}`);
    }

    await pool.close();
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

queryStoredProcedures();

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const Connection = require('../models/Connection');
const { decryptDatabasePassword } = require('../utils/encryption');

async function connectionHealthCheck() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in the .env file');
    }

    console.log('🔍 Connection Health Check Report');
    console.log('='.repeat(50));

    await mongoose.connect(mongoUri);

    // Get all connections
    const connections = await Connection.find({});

    console.log(`📊 Total Connections: ${connections.length}`);

    if (connections.length === 0) {
      console.log('ℹ️  No connections found in database');
      return;
    }

    let healthyCount = 0;
    let unhealthyCount = 0;
    let plaintextCount = 0;
    const issues = [];

    for (const connection of connections) {
      const status = {
        name: connection.name,
        host: `${connection.host}:${connection.port}`,
        username: connection.username,
        active: connection.isActive,
        hasPassword: !!connection.password,
        encrypted: false,
        canDecrypt: false,
        issue: null,
      };

      if (!connection.password) {
        status.issue = 'No password stored';
        unhealthyCount++;
      } else if (!connection.password.includes(':')) {
        status.issue = 'Password stored in plaintext';
        plaintextCount++;
        unhealthyCount++;
      } else {
        status.encrypted = true;
        try {
          decryptDatabasePassword(connection.password);
          status.canDecrypt = true;
          healthyCount++;
        } catch (error) {
          status.issue = 'Cannot decrypt password (wrong encryption key?)';
          unhealthyCount++;
        }
      }

      // Show status
      const statusIcon = status.canDecrypt ? '✅' : status.issue ? '❌' : '⚠️ ';
      console.log(`${statusIcon} ${status.name} (${status.host})`);
      if (status.issue) {
        console.log(`   Issue: ${status.issue}`);
      }

      if (status.issue) {
        issues.push(status);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📋 HEALTH SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Healthy connections: ${healthyCount}`);
    console.log(`❌ Unhealthy connections: ${unhealthyCount}`);
    if (plaintextCount > 0) {
      console.log(`⚠️  Plaintext passwords: ${plaintextCount}`);
    }

    if (issues.length > 0) {
      console.log('\n🔧 ISSUES FOUND:');
      issues.forEach(issue => {
        console.log(`- ${issue.name}: ${issue.issue}`);
      });

      console.log('\n💡 RECOMMENDATIONS:');
      if (plaintextCount > 0) {
        console.log('- Run re-encryption script to encrypt plaintext passwords');
      }
      if (unhealthyCount - plaintextCount > 0) {
        console.log('- Check ENCRYPTION_KEY environment variable');
        console.log('- Use fixConnectionDecryption.js to update problematic connections');
      }
    } else {
      console.log('\n🎉 All connections are healthy!');
    }
  } catch (error) {
    console.error('\n❌ Health check failed:', error.message);
    process.exit(1);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
  }
}

connectionHealthCheck();

const mongoose = require('mongoose');
const path = require('path');
const readline = require('readline');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const Connection = require('../models/Connection');
const { decryptDatabasePassword, encryptDatabasePassword } = require('../utils/encryption');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askQuestion(question) {
  return new Promise(resolve => {
    rl.question(question, answer => {
      resolve(answer);
    });
  });
}

async function fixConnectionDecryption() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in the .env file');
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB successfully\n');

    // Find connections with decryption issues
    const connections = await Connection.find({});
    const problematicConnections = [];

    console.log('🔍 Checking all connections for decryption issues...\n');

    for (const connection of connections) {
      if (connection.password && connection.password.includes(':')) {
        try {
          decryptDatabasePassword(connection.password);
          console.log(`✅ ${connection.name}: Decryption OK`);
        } catch (error) {
          console.log(`❌ ${connection.name}: Decryption FAILED`);
          problematicConnections.push(connection);
        }
      }
    }

    if (problematicConnections.length === 0) {
      console.log('\n🎉 All connections can be decrypted successfully! No fixes needed.');
      return;
    }

    console.log(
      `\n🔧 Found ${problematicConnections.length} connection(s) with decryption issues:`
    );
    problematicConnections.forEach((conn, index) => {
      console.log(`${index + 1}. ${conn.name} (${conn.host}:${conn.port})`);
    });

    const proceed = await askQuestion('\nDo you want to fix these connections? (y/N): ');
    if (proceed.toLowerCase() !== 'y' && proceed.toLowerCase() !== 'yes') {
      console.log('Operation cancelled.');
      return;
    }

    // Fix each problematic connection
    for (const connection of problematicConnections) {
      console.log(`\n--- Fixing Connection: ${connection.name} ---`);
      console.log(`Host: ${connection.host}:${connection.port}`);
      console.log(`Username: ${connection.username}`);

      const options = await askQuestion(`
Choose an option for ${connection.name}:
1. Enter new password
2. Skip this connection
3. Delete this connection (DESTRUCTIVE)
Enter choice (1/2/3): `);

      switch (options) {
        case '1':
          // Get new password
          const newPassword = await askQuestion('Enter new password: ');
          if (!newPassword.trim()) {
            console.log('❌ Empty password provided, skipping...');
            break;
          }

          try {
            // Update with new password (will be encrypted by pre-save middleware)
            connection.password = newPassword;
            await connection.save();
            console.log(`✅ Password updated successfully for ${connection.name}`);

            // Test the connection if requested
            const testConn = await askQuestion('Test the connection? (y/N): ');
            if (testConn.toLowerCase() === 'y' || testConn.toLowerCase() === 'yes') {
              console.log('🔌 Testing connection...');
              const testResult = await connection.testConnection();
              if (testResult.success) {
                console.log('✅ Connection test SUCCESSFUL');
              } else {
                console.log(`❌ Connection test FAILED: ${testResult.error}`);
              }
            }
          } catch (error) {
            console.log(`❌ Failed to update password: ${error.message}`);
          }
          break;

        case '2':
          console.log(`⏭️  Skipping ${connection.name}`);
          break;

        case '3':
          const confirmDelete = await askQuestion(
            `⚠️  Are you sure you want to DELETE ${connection.name}? This cannot be undone! (type 'DELETE' to confirm): `
          );
          if (confirmDelete === 'DELETE') {
            try {
              await Connection.findByIdAndDelete(connection._id);
              console.log(`🗑️  Successfully deleted ${connection.name}`);
            } catch (error) {
              console.log(`❌ Failed to delete connection: ${error.message}`);
            }
          } else {
            console.log('Delete cancelled');
          }
          break;

        default:
          console.log('Invalid option, skipping...');
          break;
      }
    }

    console.log('\n🎉 Fix operation completed!');
  } catch (error) {
    console.error('\n❌ Script execution failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    // Close readline and MongoDB connection
    rl.close();
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('\n🔌 MongoDB connection closed');
    }
  }
}

// Show usage information
console.log('🔧 Connection Decryption Fixer');
console.log('This script helps fix Connection records with decryption issues');
console.log('It will identify problematic connections and allow you to:');
console.log('- Update passwords that cannot be decrypted');
console.log('- Test connections after fixing');
console.log('- Remove connections that are no longer needed\n');

// Run the fixer
fixConnectionDecryption();

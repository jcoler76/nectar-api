const mongoose = require('mongoose');
const { encryptDatabasePassword, decryptDatabasePassword } = require('../utils/encryption');
const sql = require('mssql');
const net = require('net');

const connectionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    host: { type: String, required: true },
    port: { type: Number, required: true },
    username: { type: String, required: true },
    password: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    failoverHost: { type: String, required: false },
    databases: { type: [String], default: [] },
  },
  { timestamps: true }
);

// Add indexes for better query performance
connectionSchema.index({ createdBy: 1 }); // Index for user-specific queries
connectionSchema.index({ name: 1 }); // Index for name lookups (unique constraint already exists)
connectionSchema.index({ isActive: 1 }); // Index for active/inactive filtering
connectionSchema.index({ createdBy: 1, isActive: 1 }); // Compound index for common queries

// Pre-save middleware to encrypt password
connectionSchema.pre('save', function (next) {
  // only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) {
    return next();
  }

  // Check if password is already in encrypted format (contains colon separator)
  if (this.password && typeof this.password === 'string' && this.password.includes(':')) {
    // Password appears to be already encrypted, skip encryption
    return next();
  }

  // Encrypt the plaintext password
  this.password = encryptDatabasePassword(this.password);
  next();
});

// Method to test connection
connectionSchema.methods.testConnection = async function () {
  try {
    // If password is new (plain text), use it directly.
    // If it's existing (encrypted), decrypt it.
    const isEncrypted = this.password && this.password.includes(':');
    const decryptedPassword = isEncrypted ? decryptDatabasePassword(this.password) : this.password;

    const config = {
      user: this.username,
      password: decryptedPassword,
      server: this.host,
      port: parseInt(this.port) || 1433,
      options: {
        encrypt: true,
        trustServerCertificate: true,
        connectTimeout: 30000,
      },
    };

    const pool = await sql.connect(config);
    await pool.request().query('SELECT 1');
    await pool.close();

    return {
      success: true,
      message: 'Connection successful',
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

// Method to get effective host (with failover support)
connectionSchema.methods.getEffectiveHost = async function () {
  // Try primary host first
  try {
    await new Promise((resolve, reject) => {
      const socket = new net.Socket();
      const timeout = 2000; // 2 second timeout

      socket.setTimeout(timeout);
      socket.on('connect', () => {
        socket.destroy();
        resolve();
      });

      socket.on('timeout', () => {
        socket.destroy();
        reject(new Error('Connection timeout'));
      });

      socket.on('error', err => {
        socket.destroy();
        reject(err);
      });

      socket.connect(this.port, this.host);
    });

    return this.host;
  } catch (error) {
    // If primary fails and failover exists, use failover
    if (this.failoverHost) {
      try {
        await new Promise((resolve, reject) => {
          const socket = new net.Socket();
          const timeout = 2000;

          socket.setTimeout(timeout);
          socket.on('connect', () => {
            socket.destroy();
            resolve();
          });

          socket.on('timeout', () => {
            socket.destroy();
            reject(new Error('Connection timeout'));
          });

          socket.on('error', err => {
            socket.destroy();
            reject(err);
          });

          socket.connect(this.port, this.failoverHost);
        });

        return this.failoverHost;
      } catch (failoverError) {
        throw new Error('Both primary and failover hosts are unreachable');
      }
    }
    throw new Error('Primary host is unreachable and no failover configured');
  }
};

module.exports = mongoose.model('Connection', connectionSchema);

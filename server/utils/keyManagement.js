const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

/**
 * Improved Key Management System
 * Prevents encryption key loss by implementing backup and rotation strategies
 */

const KEY_BACKUP_DIR = path.join(process.cwd(), '.keys');
const CURRENT_KEY_FILE = path.join(KEY_BACKUP_DIR, 'current.key');
const KEY_HISTORY_FILE = path.join(KEY_BACKUP_DIR, 'key-history.json');

class KeyManager {
  constructor() {
    this.ensureKeyDirectoryExists();
  }

  async ensureKeyDirectoryExists() {
    try {
      await fs.access(KEY_BACKUP_DIR);
    } catch (error) {
      await fs.mkdir(KEY_BACKUP_DIR, { recursive: true });
      // Set restrictive permissions (owner read/write only)
      await fs.chmod(KEY_BACKUP_DIR, 0o700);
    }
  }

  /**
   * Backup the current encryption key with timestamp
   */
  async backupCurrentKey() {
    try {
      const currentKey = process.env.ENCRYPTION_KEY;
      if (!currentKey) {
        throw new Error('No encryption key found in environment');
      }

      // Create secure backup file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(KEY_BACKUP_DIR, `key-backup-${timestamp}.key`);

      // Encrypt the key before storing (using a secondary key derived from system info)
      const encrypted = this.encryptKeyForStorage(currentKey);
      await fs.writeFile(backupFile, encrypted);
      await fs.chmod(backupFile, 0o600); // Owner read/write only

      // Update key history
      await this.updateKeyHistory(currentKey, timestamp);

      console.log(`✅ Encryption key backed up to: ${backupFile}`);
      return backupFile;
    } catch (error) {
      console.error('❌ Failed to backup encryption key:', error.message);
      throw error;
    }
  }

  /**
   * Load the most recent backup key
   */
  async loadLatestBackup() {
    try {
      const history = await this.getKeyHistory();
      if (history.length === 0) {
        throw new Error('No key backups found');
      }

      const latest = history[history.length - 1];
      const backupFile = path.join(KEY_BACKUP_DIR, `key-backup-${latest.timestamp}.key`);

      const encryptedKey = await fs.readFile(backupFile, 'utf8');
      const decryptedKey = this.decryptKeyFromStorage(encryptedKey);

      return decryptedKey;
    } catch (error) {
      console.error('❌ Failed to load backup key:', error.message);
      throw error;
    }
  }

  /**
   * Create a system-specific key for encrypting stored keys
   */
  getSystemKey() {
    const systemInfo = process.env.COMPUTERNAME || process.env.HOSTNAME || 'default';
    const nodeVersion = process.version;
    return crypto
      .createHash('sha256')
      .update(systemInfo + nodeVersion + 'nectarstudio-key-storage')
      .digest();
  }

  /**
   * Encrypt a key for secure storage
   */
  encryptKeyForStorage(key) {
    const systemKey = this.getSystemKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', systemKey, iv);

    let encrypted = cipher.update(key, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt a key from secure storage
   */
  decryptKeyFromStorage(encryptedData) {
    const systemKey = this.getSystemKey();
    const [ivHex, encrypted] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-cbc', systemKey, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Update key history with new key info
   */
  async updateKeyHistory(key, timestamp) {
    try {
      let history = [];
      try {
        const historyData = await fs.readFile(KEY_HISTORY_FILE, 'utf8');
        history = JSON.parse(historyData);
      } catch (error) {
        // File doesn't exist yet, start with empty history
      }

      // Don't store the actual key, just a hash for verification
      const keyHash = crypto.createHash('sha256').update(key).digest('hex');

      history.push({
        timestamp,
        keyHash,
        created: new Date().toISOString(),
      });

      // Keep only last 10 entries
      if (history.length > 10) {
        history = history.slice(-10);
      }

      await fs.writeFile(KEY_HISTORY_FILE, JSON.stringify(history, null, 2));
      await fs.chmod(KEY_HISTORY_FILE, 0o600);
    } catch (error) {
      console.error('Failed to update key history:', error.message);
    }
  }

  /**
   * Get key history
   */
  async getKeyHistory() {
    try {
      const historyData = await fs.readFile(KEY_HISTORY_FILE, 'utf8');
      return JSON.parse(historyData);
    } catch (error) {
      return [];
    }
  }

  /**
   * Verify if current environment key matches any backup
   */
  async verifyCurrentKey() {
    try {
      const currentKey = process.env.ENCRYPTION_KEY;
      if (!currentKey) {
        return { valid: false, error: 'No encryption key in environment' };
      }

      const currentHash = crypto.createHash('sha256').update(currentKey).digest('hex');
      const history = await this.getKeyHistory();

      const match = history.find(entry => entry.keyHash === currentHash);

      return {
        valid: true,
        isKnownKey: !!match,
        keyAge: match ? match.created : 'Unknown',
        historyCount: history.length,
      };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Generate a new secure encryption key
   */
  generateNewKey() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Safe key rotation with backup
   */
  async rotateKey() {
    try {
      // Backup current key first
      await this.backupCurrentKey();

      // Generate new key
      const newKey = this.generateNewKey();

      console.log('🔄 Key rotation completed');
      console.log('📝 Update your .env file with the new key:');
      console.log(`ENCRYPTION_KEY=${newKey}`);
      console.log('⚠️  Remember to re-encrypt all existing connection passwords');

      return newKey;
    } catch (error) {
      console.error('❌ Key rotation failed:', error.message);
      throw error;
    }
  }
}

module.exports = KeyManager;

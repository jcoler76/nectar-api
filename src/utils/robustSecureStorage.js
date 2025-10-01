/**
 * Robust Secure Storage - Prevents corruption issues
 * Replaces the fragile encryption system with a more stable approach
 */
class RobustSecureStorage {
  constructor() {
    this.storageKey = 'nectar_session';
    this.fallbackKey = 'nectar_session_fallback';
    this.versionKey = 'nectar_storage_version';
    this.currentVersion = '1.0';
  }

  // Generate a more stable encryption key
  generateStableKey() {
    // Use only stable browser characteristics
    const stableFingerprint = [
      navigator.language || 'en-US',
      new Date().getTimezoneOffset().toString(),
      'nectar-v2-stable',
    ].join('|');

    return btoa(stableFingerprint).substring(0, 32);
  }

  // Simple but robust encryption
  encrypt(data) {
    try {
      const jsonString = JSON.stringify(data);
      const key = this.generateStableKey();

      // Add version and checksum for validation
      const payload = {
        version: this.currentVersion,
        data: jsonString,
        checksum: this.generateChecksum(jsonString),
        timestamp: Date.now(),
      };

      const payloadString = JSON.stringify(payload);
      const encrypted = [];

      for (let i = 0; i < payloadString.length; i++) {
        encrypted.push(
          (payloadString.charCodeAt(i) ^ key.charCodeAt(i % key.length))
            .toString(16)
            .padStart(2, '0')
        );
      }

      return encrypted.join('');
    } catch (error) {
      console.error('Encryption failed:', error);
      return null;
    }
  }

  // Robust decryption with fallbacks
  decrypt(encryptedData) {
    if (!encryptedData || typeof encryptedData !== 'string') {
      return null;
    }

    try {
      const key = this.generateStableKey();

      // Convert hex back to string
      const hexPairs = encryptedData.match(/.{2}/g) || [];
      const decrypted = hexPairs
        .map(hex =>
          String.fromCharCode(
            parseInt(hex, 16) ^ key.charCodeAt(hexPairs.indexOf(hex) % key.length)
          )
        )
        .join('');

      // Parse the payload
      const payload = JSON.parse(decrypted);

      // Validate version and checksum
      if (
        payload.version === this.currentVersion &&
        this.generateChecksum(payload.data) === payload.checksum
      ) {
        return JSON.parse(payload.data);
      }

      console.warn('Storage validation failed, clearing corrupted data');
      return null;
    } catch (error) {
      console.warn('Decryption failed:', error.message);
      return null;
    }
  }

  // Generate simple checksum for validation
  generateChecksum(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  // Set item with automatic fallback
  setItem(data) {
    try {
      const encrypted = this.encrypt(data);
      if (!encrypted) return false;

      // Store main data
      localStorage.setItem(this.storageKey, encrypted);

      // Store fallback (unencrypted but base64 for simple obfuscation)
      const fallbackData = {
        data: data,
        timestamp: Date.now(),
        version: this.currentVersion,
      };
      localStorage.setItem(this.fallbackKey, btoa(JSON.stringify(fallbackData)));
      localStorage.setItem(this.versionKey, this.currentVersion);

      // Trigger storage event
      this.triggerStorageEvent(encrypted, localStorage.getItem(this.storageKey));

      return true;
    } catch (error) {
      console.error('Failed to store data:', error);
      return false;
    }
  }

  // Get item with automatic fallback recovery
  getItem() {
    try {
      // Try main storage first
      const encrypted = localStorage.getItem(this.storageKey);
      if (encrypted) {
        const data = this.decrypt(encrypted);
        if (data) return data;
      }

      // Try fallback storage
      if (process.env.NODE_ENV === 'development') {
        console.warn('Main storage failed, attempting fallback recovery...');
      }
      const fallbackData = localStorage.getItem(this.fallbackKey);
      if (fallbackData) {
        try {
          const parsed = JSON.parse(atob(fallbackData));
          if (parsed.data && parsed.version === this.currentVersion) {
            if (process.env.NODE_ENV === 'development') {
              // eslint-disable-next-line no-console
              console.log('✅ Fallback recovery successful');
            }
            // Restore main storage
            this.setItem(parsed.data);
            return parsed.data;
          }
        } catch (fallbackError) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('Fallback recovery failed:', fallbackError);
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Storage retrieval failed:', error);
      return null;
    }
  }

  // Remove item and cleanup
  removeItem() {
    const oldValue = localStorage.getItem(this.storageKey);

    localStorage.removeItem(this.storageKey);
    localStorage.removeItem(this.fallbackKey);
    localStorage.removeItem(this.versionKey);
    localStorage.removeItem('nectar_session_id'); // Legacy cleanup

    this.triggerStorageEvent(null, oldValue);
  }

  // Trigger storage event for cross-tab sync
  triggerStorageEvent(newValue, oldValue) {
    try {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: this.storageKey,
          newValue: newValue,
          oldValue: oldValue,
        })
      );
    } catch (error) {
      console.warn('Failed to trigger storage event:', error);
    }
  }

  // Migration from old storage
  migrateFromOldStorage() {
    try {
      // Try to get data from old storage format
      const oldStorageData = localStorage.getItem('nectar_session');
      if (oldStorageData) {
        // Try to decrypt using old method patterns
        const possibleData = this.attemptOldStorageDecryption(oldStorageData);
        if (possibleData) {
          if (process.env.NODE_ENV === 'development') {
            // eslint-disable-next-line no-console
            console.log('🔄 Migrating from old storage format...');
          }
          this.setItem(possibleData);
          if (process.env.NODE_ENV === 'development') {
            // eslint-disable-next-line no-console
            console.log('✅ Migration completed');
          }
          return true;
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Migration failed:', error);
      }
    }
    return false;
  }

  // Attempt to decrypt old storage data using common patterns
  attemptOldStorageDecryption(encryptedData) {
    // Common browser fingerprint patterns that might have been used
    const fingerprints = [
      btoa(
        navigator.userAgent +
          '|' +
          navigator.language +
          '|' +
          new Date().getTimezoneOffset() +
          '|nectar-stable-key'
      ).substring(0, 16),
      btoa('nectar-stable-key').substring(0, 16),
    ];

    const sessionIds = [
      localStorage.getItem('nectar_session_id'),
      'fallback-session-id',
      Date.now().toString(36).substring(0, 10),
    ].filter(Boolean);

    // Try different key combinations
    for (const fingerprint of fingerprints) {
      for (const sessionId of sessionIds) {
        try {
          const key = btoa(fingerprint + sessionId).substring(0, 32);
          const decrypted = this.tryDecryptWithOldMethod(encryptedData, key);
          if (decrypted) {
            return decrypted;
          }
        } catch (e) {
          // Continue trying other combinations
        }
      }
    }

    return null;
  }

  // Try to decrypt using old XOR method
  tryDecryptWithOldMethod(encryptedData, key) {
    try {
      const hexPairs = encryptedData.match(/.{2}/g) || [];
      const encrypted = hexPairs.map(hex => parseInt(hex, 16));
      const decrypted = [];

      for (let i = 0; i < encrypted.length; i++) {
        const originalChar = String.fromCharCode(encrypted[i] ^ key.charCodeAt(i % key.length));
        decrypted.push(originalChar);
      }

      const decryptedString = decrypted.join('');

      // Try to parse as JSON
      const parsed = JSON.parse(decryptedString);

      // Validate it looks like user data
      if (parsed && (parsed.token || parsed.user || parsed.email)) {
        return parsed;
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  // Diagnostic method for debugging
  diagnose() {
    return {
      hasMainStorage: !!localStorage.getItem(this.storageKey),
      hasFallbackStorage: !!localStorage.getItem(this.fallbackKey),
      version: localStorage.getItem(this.versionKey),
      storageKeys: Object.keys(localStorage).filter(key => key.includes('nectar')),
      canDecrypt: !!this.getItem(),
    };
  }
}

export default RobustSecureStorage;

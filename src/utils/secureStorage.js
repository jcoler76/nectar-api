// Secure session storage utility
class SecureSessionStorage {
  constructor() {
    this.storageKey = 'nectar_session';
    this.encryptionKey = this.generateEncryptionKey();
  }

  generateEncryptionKey() {
    // Generate a key based on browser fingerprint and session
    const fingerprint = this.getBrowserFingerprint();
    let sessionId = localStorage.getItem('nectar_session_id');

    // Only generate new session ID if none exists to maintain consistency
    if (!sessionId) {
      sessionId = this.generateSessionId();
      localStorage.setItem('nectar_session_id', sessionId);
    }

    return btoa(fingerprint + sessionId).substring(0, 32);
  }

  getBrowserFingerprint() {
    // Create a stable browser fingerprint for encryption
    // Removed canvas and screen dimensions for stability
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      new Date().getTimezoneOffset(),
      'nectar-stable-key', // Static component for additional stability
    ].join('|');

    return btoa(fingerprint).substring(0, 16);
  }

  generateSessionId() {
    return (
      Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    );
  }

  // Simple XOR encryption for client-side storage
  encrypt(data) {
    try {
      const jsonString = JSON.stringify(data);
      const encrypted = [];

      for (let i = 0; i < jsonString.length; i++) {
        const xorResult =
          jsonString.charCodeAt(i) ^ this.encryptionKey.charCodeAt(i % this.encryptionKey.length);
        encrypted.push(xorResult);
      }

      // Convert to hex to avoid control character issues
      return encrypted.map(byte => byte.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      console.error('Encryption error:', error);
      return null;
    }
  }

  decrypt(encryptedData) {
    try {
      // Validate input format
      if (!encryptedData || typeof encryptedData !== 'string') {
        console.warn('Invalid encrypted data format');
        return null;
      }

      // Convert hex string back to bytes
      const hexPairs = encryptedData.match(/.{2}/g) || [];
      if (hexPairs.length === 0) {
        console.warn('Invalid hex format in encrypted data');
        return null;
      }

      const encrypted = hexPairs.map(hex => parseInt(hex, 16));
      const decrypted = [];

      for (let i = 0; i < encrypted.length; i++) {
        const originalChar = String.fromCharCode(
          encrypted[i] ^ this.encryptionKey.charCodeAt(i % this.encryptionKey.length)
        );
        decrypted.push(originalChar);
      }

      const decryptedString = decrypted.join('');

      // Validate JSON before parsing
      if (!this.isValidJSON(decryptedString)) {
        console.warn('Decryption failed with current key, attempting session recovery...');

        // Try session recovery with fallback session IDs
        const recoveredData = this.attemptSessionRecovery(encryptedData);
        if (recoveredData) {
          // eslint-disable-next-line no-console
          console.log('Session recovery successful');
          return recoveredData;
        }

        // Try to recover by removing trailing/leading whitespace and null chars
        // eslint-disable-next-line no-control-regex
        const cleanedString = decryptedString
          // eslint-disable-next-line no-control-regex
          .replace(/[\u0000\s]+$/g, '')
          // eslint-disable-next-line no-control-regex
          .replace(/^[\u0000\s]+/g, '');

        if (this.isValidJSON(cleanedString)) {
          return JSON.parse(cleanedString);
        }

        console.warn('Unable to recover data, clearing corrupted storage');
        this.removeItem();
        return null;
      }

      return JSON.parse(decryptedString);
    } catch (error) {
      console.error('Decryption error:', error);
      // Try session recovery before giving up
      const recoveredData = this.attemptSessionRecovery(encryptedData);
      if (recoveredData) {
        // eslint-disable-next-line no-console
        console.log('Session recovery successful after error');
        return recoveredData;
      }
      console.warn('Decryption failed completely, but preserving data');
      return null;
    }
  }

  setItem(data) {
    const encrypted = this.encrypt(data);
    if (encrypted) {
      const oldValue = localStorage.getItem(this.storageKey);
      localStorage.setItem(this.storageKey, encrypted);

      // Manually trigger storage event for cross-tab synchronization
      // This ensures other tabs/windows know about the auth state change
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: this.storageKey,
          newValue: encrypted,
          oldValue: oldValue,
        })
      );

      return true;
    }
    return false;
  }

  getItem() {
    const encrypted = localStorage.getItem(this.storageKey);
    if (encrypted) {
      return this.decrypt(encrypted);
    }
    return null;
  }

  removeItem() {
    const oldValue = localStorage.getItem(this.storageKey);
    localStorage.removeItem(this.storageKey);
    localStorage.removeItem('nectar_session_id');

    // Manually trigger storage event for logout synchronization
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: this.storageKey,
        newValue: null,
        oldValue: oldValue,
      })
    );
  }

  // Validate if a string is valid JSON
  isValidJSON(str) {
    try {
      // Check for control characters that could cause parsing issues
      // eslint-disable-next-line no-control-regex
      if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(str)) {
        return false;
      }
      JSON.parse(str);
      return true;
    } catch (error) {
      return false;
    }
  }

  // Attempt to recover session data using alternative session IDs
  attemptSessionRecovery(encryptedData) {
    try {
      const fingerprint = this.getBrowserFingerprint();

      // Try with potential legacy session IDs from sessionStorage
      const legacySessionId = sessionStorage.getItem('session_id');
      if (legacySessionId) {
        const legacyKey = btoa(fingerprint + legacySessionId).substring(0, 32);
        const recoveredData = this.decryptWithKey(encryptedData, legacyKey);
        if (recoveredData) {
          // Update to use localStorage and re-encrypt with current key
          localStorage.setItem('nectar_session_id', legacySessionId);
          sessionStorage.removeItem('session_id');
          this.encryptionKey = this.generateEncryptionKey();
          this.setItem(recoveredData);
          return recoveredData;
        }
      }

      // Try generating a few alternative session ID patterns that might have been used
      const sessionIdPatterns = [
        Date.now().toString(36), // Current timestamp
        Math.random().toString(36).substring(2, 15), // New random
      ];

      for (const sessionId of sessionIdPatterns) {
        const testKey = btoa(fingerprint + sessionId).substring(0, 32);
        const recoveredData = this.decryptWithKey(encryptedData, testKey);
        if (recoveredData) {
          // Update session ID and re-encrypt with current key
          localStorage.setItem('nectar_session_id', sessionId);
          this.encryptionKey = this.generateEncryptionKey();
          this.setItem(recoveredData);
          return recoveredData;
        }
      }

      return null;
    } catch (error) {
      console.error('Session recovery error:', error);
      return null;
    }
  }

  // Decrypt with a specific key (used for recovery)
  decryptWithKey(encryptedData, key) {
    try {
      const hexPairs = encryptedData.match(/.{2}/g) || [];
      const encrypted = hexPairs.map(hex => parseInt(hex, 16));
      const decrypted = [];

      for (let i = 0; i < encrypted.length; i++) {
        const originalChar = String.fromCharCode(encrypted[i] ^ key.charCodeAt(i % key.length));
        decrypted.push(originalChar);
      }

      const decryptedString = decrypted.join('');

      if (this.isValidJSON(decryptedString)) {
        return JSON.parse(decryptedString);
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  // Check if token is expired
  isTokenExpired(token) {
    if (!token) return true;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;

      // Only consider token expired if it's actually past the expiration time
      // Add a small buffer (30 seconds) but not 5 minutes which was causing premature logout
      return payload.exp < currentTime + 30;
    } catch (error) {
      return true;
    }
  }
}

export default SecureSessionStorage;

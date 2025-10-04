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
    try {
      const encrypted = this.encrypt(data);
      if (encrypted) {
        localStorage.setItem(this.storageKey, encrypted);

        // SAFETY: Create fallback storage in case main storage gets corrupted
        try {
          const fallbackData = {
            data: data,
            timestamp: Date.now(),
            version: '1.0',
          };
          localStorage.setItem('nectar_session_backup', btoa(JSON.stringify(fallbackData)));
        } catch (fallbackError) {
          console.warn('Failed to create backup storage:', fallbackError);
        }

        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to set storage item:', error);
      this.emergencyCleanup();
      return false;
    }
  }

  getItem() {
    try {
      const encrypted = localStorage.getItem(this.storageKey);
      if (!encrypted) {
        // No encrypted data - likely logged out, return null without warnings
        return null;
      }

      const decrypted = this.decrypt(encrypted);
      if (decrypted) {
        return decrypted;
      }

      // SAFETY: Try fallback storage if main storage fails
      console.warn('Main storage failed, attempting fallback recovery...');
      const fallbackData = localStorage.getItem('nectar_session_backup');
      if (fallbackData) {
        try {
          const parsed = JSON.parse(atob(fallbackData));
          if (parsed.data && parsed.version === '1.0') {
            // Fallback recovery successful
            // Restore main storage
            this.setItem(parsed.data);
            return parsed.data;
          }
        } catch (fallbackError) {
          console.warn('Fallback recovery failed:', fallbackError);
        }
      }

      return null;
    } catch (error) {
      console.error('Storage retrieval failed:', error);
      this.emergencyCleanup();
      return null;
    }
  }

  removeItem() {
    // Remove ALL nectar-related storage to prevent encryption key mismatch
    localStorage.removeItem(this.storageKey);
    localStorage.removeItem('nectar_session_id');
    localStorage.removeItem('nectar_session_backup');

    // Clear superadmin temporary storage
    localStorage.removeItem('superadmin_temp_session');
    localStorage.removeItem('superadmin_temp_user');
  }

  // Emergency cleanup when storage is corrupted
  emergencyCleanup() {
    try {
      console.warn('🚨 Emergency storage cleanup initiated');

      // Clear all nectar-related storage
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('nectar') || key.includes('session'))) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => {
        try {
          localStorage.removeItem(key);
          // Removed corrupted key
        } catch (e) {
          console.warn(`Failed to remove ${key}:`, e);
        }
      });

      // Show user notification
      this.showCleanupNotification();

      // Emergency cleanup completed
    } catch (error) {
      console.error('Emergency cleanup failed:', error);
      // Last resort - reload page
      if (typeof window !== 'undefined' && window.confirm) {
        if (window.confirm('Storage corruption detected. Reload page to fix?')) {
          window.location.reload();
        }
      }
    }
  }

  // Show non-intrusive notification to user
  showCleanupNotification() {
    try {
      if (typeof document === 'undefined') return;

      const notification = document.createElement('div');
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ff9800;
        color: white;
        padding: 12px 16px;
        border-radius: 4px;
        font-family: Arial, sans-serif;
        font-size: 14px;
        z-index: 10000;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        max-width: 300px;
      `;
      notification.innerHTML = `
        🔧 Storage cleared due to corruption<br>
        <small>Please log in again if needed</small>
      `;

      document.body.appendChild(notification);

      // Auto-remove after 5 seconds
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 5000);
    } catch (error) {
      console.warn('Failed to show cleanup notification:', error);
    }
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

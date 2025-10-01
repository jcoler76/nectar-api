/**
 * Storage Error Boundary - Wraps storage operations to prevent corruption
 * Can be used with existing SecureSessionStorage to add resilience
 */
class StorageErrorBoundary {
  constructor(baseStorage) {
    this.baseStorage = baseStorage;
    this.errorCount = 0;
    this.maxErrors = 3;
    this.lastClearTime = 0;
    this.clearCooldown = 60000; // 1 minute cooldown between clears
  }

  // Wrapped getItem with error handling
  getItem() {
    try {
      const data = this.baseStorage.getItem();

      // Reset error count on successful retrieval
      if (data) {
        this.errorCount = 0;
      }

      return data;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Storage retrieval error:', error);
      }
      this.handleError('getItem');
      return null;
    }
  }

  // Wrapped setItem with error handling
  setItem(data) {
    try {
      const result = this.baseStorage.setItem(data);

      // Reset error count on successful storage
      if (result) {
        this.errorCount = 0;
      }

      return result;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Storage write error:', error);
      }
      this.handleError('setItem');
      return false;
    }
  }

  // Safe removeItem
  removeItem() {
    try {
      this.baseStorage.removeItem();
      this.errorCount = 0;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Storage removal error:', error);
      }
      // Force clear if remove fails
      this.forceCleanStorage();
    }
  }

  // Handle storage errors
  handleError(operation) {
    this.errorCount++;

    if (process.env.NODE_ENV === 'development') {
      console.warn(
        `Storage error count: ${this.errorCount}/${this.maxErrors} for operation: ${operation}`
      );
    }

    if (this.errorCount >= this.maxErrors) {
      const now = Date.now();

      if (now - this.lastClearTime > this.clearCooldown) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('⚠️ Storage corruption detected, performing emergency cleanup');
        }
        this.emergencyCleanup();
        this.lastClearTime = now;
      }
    }
  }

  // Emergency cleanup of corrupted storage
  emergencyCleanup() {
    try {
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
          if (process.env.NODE_ENV === 'development') {
            // eslint-disable-next-line no-console
            console.log(`🧹 Removed corrupted key: ${key}`);
          }
        } catch (e) {
          if (process.env.NODE_ENV === 'development') {
            console.warn(`Failed to remove ${key}:`, e);
          }
        }
      });

      // Clear session storage as well
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (key.includes('nectar') || key.includes('session'))) {
          try {
            sessionStorage.removeItem(key);
            if (process.env.NODE_ENV === 'development') {
              // eslint-disable-next-line no-console
              console.log(`🧹 Removed session key: ${key}`);
            }
          } catch (e) {
            if (process.env.NODE_ENV === 'development') {
              console.warn(`Failed to remove session ${key}:`, e);
            }
          }
        }
      }

      // Reset error count
      this.errorCount = 0;

      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.log('✅ Emergency cleanup completed');
      }

      // Notify user
      this.notifyUser();
    } catch (error) {
      console.error('Emergency cleanup failed:', error);
      // Last resort - reload page
      if (window.confirm('Storage corruption detected. Reload page to fix?')) {
        window.location.reload();
      }
    }
  }

  // Force clean storage using multiple methods
  forceCleanStorage() {
    const methods = [
      () => localStorage.clear(),
      () => sessionStorage.clear(),
      () => {
        // Manual key removal
        Object.keys(localStorage).forEach(key => {
          if (key.includes('nectar')) localStorage.removeItem(key);
        });
      },
    ];

    for (const method of methods) {
      try {
        method();
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.log('✅ Storage force cleaned');
        }
        break;
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Force clean method failed:', error);
        }
      }
    }
  }

  // Notify user of storage issues
  notifyUser() {
    // Create a non-intrusive notification
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
  }

  // Diagnostic information
  getDiagnostics() {
    return {
      errorCount: this.errorCount,
      maxErrors: this.maxErrors,
      lastClearTime: this.lastClearTime,
      cooldownRemaining: Math.max(0, this.clearCooldown - (Date.now() - this.lastClearTime)),
      storageKeys: Object.keys(localStorage).filter(key => key.includes('nectar')),
      baseStorageType: this.baseStorage.constructor.name,
    };
  }
}

export default StorageErrorBoundary;

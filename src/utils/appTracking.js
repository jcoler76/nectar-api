import api from '../services/api';

/**
 * Application Usage Tracking Utility
 * Integrates with existing session management and API infrastructure
 */
class AppTracker {
  constructor() {
    this.sessionId = this.getOrCreateSessionId();
    this.eventQueue = [];
    this.batchSize = 50; // Max events before auto-send
    this.batchTimeout = 30000; // 30 seconds timeout for batch send
    this.isInitialized = false;
    this.batchTimer = null;
    this.pageStartTime = Date.now();
    this.currentPage = null;
    this.userId = null;
    this.organizationId = null;

    // Initialize tracking when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initialize());
    } else {
      this.initialize();
    }
  }

  /**
   * Get or create session ID using existing secureStorage infrastructure
   */
  getOrCreateSessionId() {
    try {
      // Use existing session ID from secureStorage if available
      let sessionId = localStorage.getItem('nectar_session_id');

      if (!sessionId) {
        // Generate new session ID compatible with existing system
        sessionId = this.generateSessionId();
        localStorage.setItem('nectar_session_id', sessionId);
      }

      return sessionId;
    } catch (error) {
      console.warn('Failed to get session ID, using temporary ID:', error);
      return this.generateSessionId();
    }
  }

  /**
   * Generate session ID (compatible with existing secureStorage)
   */
  generateSessionId() {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15) +
      Date.now().toString(36)
    );
  }

  /**
   * Initialize tracking system
   */
  initialize() {
    if (this.isInitialized) return;

    try {
      // Get current user info from existing auth system
      this.updateUserInfo();

      // Track initial page view
      this.trackPageView(window.location.pathname);

      // Set up automatic tracking
      this.setupAutoTracking();

      // Set up batch sending
      this.startBatchTimer();

      // Set up cleanup on page unload
      this.setupPageUnloadTracking();

      this.isInitialized = true;
      // App tracking successfully initialized
    } catch (error) {
      console.error('Failed to initialize app tracking:', error);
    }
  }

  /**
   * Update user information from current auth state
   */
  updateUserInfo() {
    try {
      // Try to get user info from existing secureStorage or API headers
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (token && api.defaults.headers.common.Authorization) {
        // Extract user info from existing auth context if available
        // This will be set by the auth system when user logs in
        const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          this.userId = user.id || user.userId;
          this.organizationId = user.organizationId;
        }
      }
    } catch (error) {
      // No user auth info available - tracking will be anonymous
    }
  }

  /**
   * Set up automatic click and form tracking
   */
  setupAutoTracking() {
    // Track clicks on buttons, links, and interactive elements
    document.addEventListener(
      'click',
      event => {
        this.handleClickEvent(event);
      },
      { passive: true }
    );

    // Track form submissions
    document.addEventListener(
      'submit',
      event => {
        this.handleFormSubmit(event);
      },
      { passive: true }
    );

    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.trackEvent('page_view', window.location.pathname, {
          action: 'page_visible',
        });
      }
    });
  }

  /**
   * Handle click events with intelligent element detection
   */
  handleClickEvent(event) {
    try {
      const element = event.target;
      const tagName = element.tagName.toLowerCase();

      // Only track meaningful clicks
      if (
        !['button', 'a', 'input', 'select', 'textarea'].includes(tagName) &&
        !element.getAttribute('role') &&
        !element.onclick &&
        !element.classList.contains('clickable')
      ) {
        return;
      }

      const elementId = this.getElementIdentifier(element);
      const elementText = this.getElementText(element);
      const elementPath = this.getElementPath(element);

      this.trackEvent('click', elementId, {
        elementText,
        elementPath,
        tagName,
        href: element.href || null,
        type: element.type || null,
        className: element.className || null,
      });
    } catch (error) {
      // Silently handle click event tracking errors
    }
  }

  /**
   * Handle form submission events
   */
  handleFormSubmit(event) {
    try {
      const form = event.target;
      const formId = form.id || form.name || form.action || 'unknown-form';

      this.trackEvent('form_submit', formId, {
        action: form.action,
        method: form.method,
        fieldCount: form.elements.length,
      });
    } catch (error) {
      // Silently handle form submit tracking errors
    }
  }

  /**
   * Get element identifier for tracking
   */
  getElementIdentifier(element) {
    // Priority: id > data-track-id > aria-label > text content > tag+class
    if (element.id) return element.id;
    if (element.dataset.trackId) return element.dataset.trackId;
    if (element.getAttribute('aria-label')) return element.getAttribute('aria-label');

    const text = this.getElementText(element);
    if (text) return text.substring(0, 50);

    const className = element.className ? `.${element.className.split(' ')[0]}` : '';
    return `${element.tagName.toLowerCase()}${className}`;
  }

  /**
   * Get clean text content from element
   */
  getElementText(element) {
    if (element.getAttribute('aria-label')) return element.getAttribute('aria-label');
    if (element.title) return element.title;
    if (element.alt) return element.alt;
    if (element.value && element.type !== 'password') return element.value;

    const text = element.textContent || element.innerText || '';
    return text.trim().substring(0, 100);
  }

  /**
   * Generate CSS selector path for element
   */
  getElementPath(element) {
    try {
      const path = [];
      let current = element;

      while (current && current.nodeType === Node.ELEMENT_NODE && path.length < 5) {
        let selector = current.tagName.toLowerCase();

        if (current.id) {
          selector += `#${current.id}`;
          path.unshift(selector);
          break;
        }

        if (current.className) {
          const classes = current.className
            .split(' ')
            .filter(c => c)
            .slice(0, 2);
          if (classes.length) {
            selector += `.${classes.join('.')}`;
          }
        }

        path.unshift(selector);
        current = current.parentElement;
      }

      return path.join(' > ');
    } catch (error) {
      return null;
    }
  }

  /**
   * Set up page unload tracking to capture time on page
   */
  setupPageUnloadTracking() {
    const trackPageExit = () => {
      if (this.currentPage) {
        const timeOnPage = Math.round((Date.now() - this.pageStartTime) / 1000);
        this.trackEvent('page_exit', this.currentPage, {
          timeOnPage,
          exitType: 'unload',
        });
        this.sendBatch(); // Force send remaining events
      }
    };

    window.addEventListener('beforeunload', trackPageExit);
    window.addEventListener('pagehide', trackPageExit);
  }

  /**
   * Track page view with performance metrics
   */
  trackPageView(page, metadata = {}) {
    // Track exit from previous page
    if (this.currentPage && this.currentPage !== page) {
      const timeOnPage = Math.round((Date.now() - this.pageStartTime) / 1000);
      this.trackEvent('page_exit', this.currentPage, { timeOnPage });
    }

    // Track new page view
    this.currentPage = page;
    this.pageStartTime = Date.now();

    // Get page load performance if available
    let pageLoadTime = null;
    try {
      if (window.performance && window.performance.timing) {
        const timing = window.performance.timing;
        if (timing.loadEventEnd && timing.navigationStart) {
          pageLoadTime = timing.loadEventEnd - timing.navigationStart;
        }
      }
    } catch (error) {
      // Performance timing not available - continuing without load time data
    }

    this.trackEvent('page_view', page, {
      referrer: document.referrer || null,
      pageLoadTime,
      title: document.title,
      ...metadata,
    });
  }

  /**
   * Track feature usage
   */
  trackFeatureUse(featureName, metadata = {}) {
    this.trackEvent('feature_use', featureName, metadata);
  }

  /**
   * Track search actions
   */
  trackSearch(query, resultsCount = null, metadata = {}) {
    this.trackEvent('search', 'search_performed', {
      query: query.substring(0, 100), // Limit query length
      resultsCount,
      ...metadata,
    });
  }

  /**
   * Track file downloads
   */
  trackDownload(fileName, fileType = null, metadata = {}) {
    this.trackEvent('download', fileName, {
      fileType,
      ...metadata,
    });
  }

  /**
   * Core event tracking method
   */
  trackEvent(eventType, elementId, metadata = {}) {
    try {
      const event = {
        sessionId: this.sessionId,
        eventType,
        elementId,
        page: window.location.pathname,
        referrerPage: document.referrer || null,
        metadata,
        timestamp: new Date().toISOString(),
      };

      // Add to queue
      this.eventQueue.push(event);

      // Send immediately if queue is full
      if (this.eventQueue.length >= this.batchSize) {
        this.sendBatch();
      }

      // Event successfully queued for tracking
    } catch (error) {
      console.error('Failed to track event:', error);
    }
  }

  /**
   * Start batch timer for automatic sending
   */
  startBatchTimer() {
    if (this.batchTimer) clearInterval(this.batchTimer);

    this.batchTimer = setInterval(() => {
      if (this.eventQueue.length > 0) {
        this.sendBatch();
      }
    }, this.batchTimeout);
  }

  /**
   * Send batch of events to server
   */
  async sendBatch() {
    if (this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    try {
      await api.post('/api/tracking/batch', { events });
      // Successfully sent tracking events batch
    } catch (error) {
      // Handle 404 error gracefully (endpoint might not be available)
      if (error.response?.status === 404) {
        console.warn('Tracking endpoint not available - events will be dropped');
        return;
      }

      console.warn('Failed to send tracking batch:', error);
      // Don't re-queue events to avoid infinite loops
    }
  }

  /**
   * Force send all queued events
   */
  async flush() {
    await this.sendBatch();
  }

  /**
   * Update user info when authentication state changes
   */
  setUserInfo(userId, organizationId) {
    this.userId = userId;
    this.organizationId = organizationId;
    // User tracking info updated for authenticated events
  }

  /**
   * Clear user info on logout
   */
  clearUserInfo() {
    this.userId = null;
    this.organizationId = null;
    // User tracking info cleared - events will be anonymous
  }

  /**
   * Cleanup tracking resources
   */
  destroy() {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }

    this.sendBatch(); // Send remaining events
    this.isInitialized = false;
  }
}

// Create singleton instance
const appTracker = new AppTracker();

// Export both the instance and class for flexibility
export default appTracker;
export { AppTracker };

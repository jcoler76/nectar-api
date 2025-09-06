/**
 * Bundle Split Validation Utility
 * Helps verify that code splitting is working correctly
 */

class BundleSplitValidator {
  constructor() {
    this.loadedChunks = new Set();
    this.performanceMarks = new Map();

    // Monitor chunk loading
    this.monitorChunkLoading();
  }

  monitorChunkLoading() {
    // Track dynamic imports
    const originalImport = window.__webpack_require__;
    if (originalImport) {
      window.__webpack_require__ = (...args) => {
        // eslint-disable-next-line no-console
        console.log('🚀 Loading chunk:', args);
        this.logChunkLoad(args[0]);
        return originalImport.apply(this, args);
      };
    }

    // Track performance for route changes
    if ('performance' in window && 'mark' in window.performance) {
      this.startPerformanceTracking();
    }
  }

  logChunkLoad(chunkId) {
    this.loadedChunks.add(chunkId);
    // eslint-disable-next-line no-console
    console.log(`📦 Chunk ${chunkId} loaded. Total chunks: ${this.loadedChunks.size}`);
  }

  markRouteStart(routeName) {
    const markName = `route-${routeName}-start`;
    if (window.performance && window.performance.mark) {
      window.performance.mark(markName);
      this.performanceMarks.set(routeName, { start: Date.now() });
    }
  }

  markRouteEnd(routeName) {
    const startMark = `route-${routeName}-start`;
    const endMark = `route-${routeName}-end`;

    if (window.performance && window.performance.mark) {
      window.performance.mark(endMark);

      try {
        window.performance.measure(`route-${routeName}`, startMark, endMark);
        const measure = window.performance.getEntriesByName(`route-${routeName}`)[0];

        if (measure) {
          // eslint-disable-next-line no-console
          console.log(`⚡ ${routeName} route loaded in ${measure.duration.toFixed(2)}ms`);

          const existing = this.performanceMarks.get(routeName) || {};
          this.performanceMarks.set(routeName, {
            ...existing,
            end: Date.now(),
            duration: measure.duration,
          });
        }
      } catch (error) {
        console.warn('Performance measurement failed:', error);
      }
    }
  }

  getLoadedChunks() {
    return Array.from(this.loadedChunks);
  }

  getPerformanceData() {
    return Object.fromEntries(this.performanceMarks.entries());
  }

  validateCodeSplitting() {
    const report = {
      chunksLoaded: this.getLoadedChunks().length,
      chunks: this.getLoadedChunks(),
      performance: this.getPerformanceData(),
      timestamp: new Date().toISOString(),
      codeSplittingWorking: this.loadedChunks.size > 1, // More than just main chunk
    };

    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.group('🎯 Code Splitting Validation Report');
      // eslint-disable-next-line no-console
      console.log('Chunks loaded:', report.chunksLoaded);
      // eslint-disable-next-line no-console
      console.log('Chunks:', report.chunks);
      // eslint-disable-next-line no-console
      console.log('Performance data:', report.performance);
      // eslint-disable-next-line no-console
      console.log('Code splitting working:', report.codeSplittingWorking);
      // eslint-disable-next-line no-console
      console.groupEnd();
    }

    return report;
  }

  startPerformanceTracking() {
    // Track initial load
    window.addEventListener('load', () => {
      this.validateCodeSplitting();
    });

    // Track route changes (for SPAs)
    let currentPath = window.location.pathname;
    const observer = new MutationObserver(() => {
      if (window.location.pathname !== currentPath) {
        currentPath = window.location.pathname;
        this.markRouteStart(currentPath);

        // Wait a bit for lazy loading to complete
        setTimeout(() => {
          this.markRouteEnd(currentPath);
        }, 100);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }
}

// Global validator instance
const bundleSplitValidator = new BundleSplitValidator();

// Make it available globally for debugging
window.bundleSplitValidator = bundleSplitValidator;

export default bundleSplitValidator;

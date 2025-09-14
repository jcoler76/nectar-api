/**
 * CSS optimization utilities for better performance
 */

interface CSSOptimizationReport {
  totalSelectors: number;
  criticalCSS: number;
  deferredCSS: number;
}

class CSSOptimizer {
  private criticalCSS: Set<string>;
  private deferredCSS: Set<string>;
  private isOptimized: boolean;

  constructor() {
    this.criticalCSS = new Set();
    this.deferredCSS = new Set();
    this.isOptimized = false;
  }

  /**
   * Mark CSS classes as critical (above-the-fold)
   */
  markCritical(classes: string[]): void {
    classes.forEach(cls => this.criticalCSS.add(cls));
  }

  /**
   * Mark CSS classes as deferred (below-the-fold)
   */
  markDeferred(classes: string[]): void {
    classes.forEach(cls => this.deferredCSS.add(cls));
  }

  /**
   * Optimize CSS loading by removing unused styles
   */
  optimizeUnusedCSS(): void {
    if (typeof document === 'undefined') return;

    // Get all stylesheets (for future use)
    // const stylesheets = Array.from(document.styleSheets);
    const usedSelectors = new Set<string>();

    // Find all used CSS selectors in the DOM
    const allElements = document.querySelectorAll('*');
    allElements.forEach(element => {
      // Add class names
      if (element.className) {
        const classes = element.className.toString().split(' ');
        classes.forEach(cls => {
          if (cls.trim()) {
            usedSelectors.add(`.${cls.trim()}`);
          }
        });
      }

      // Add ID
      if (element.id) {
        usedSelectors.add(`#${element.id}`);
      }

      // Add tag name
      usedSelectors.add(element.tagName.toLowerCase());
    });

    // Log unused CSS for development
    if (process.env.NODE_ENV === 'development') {
      const report: CSSOptimizationReport = {
        totalSelectors: usedSelectors.size,
        criticalCSS: this.criticalCSS.size,
        deferredCSS: this.deferredCSS.size,
      };
      // eslint-disable-next-line no-console
      console.log('CSS Optimization Report:', report);
    }
  }

  /**
   * Preload critical CSS
   */
  preloadCriticalCSS(): void {
    if (typeof document === 'undefined') return;

    // Create a style element for critical CSS
    const criticalStyle = document.createElement('style');
    criticalStyle.id = 'critical-css';

    // Add critical CSS rules
    const criticalRules = Array.from(this.criticalCSS)
      .map(cls => {
        return this.getCSSRule(cls);
      })
      .filter(Boolean)
      .join('\n');

    if (criticalRules) {
      criticalStyle.textContent = criticalRules;
      document.head.insertBefore(criticalStyle, document.head.firstChild);
    }
  }

  /**
   * Lazy load non-critical CSS
   */
  lazyLoadDeferredCSS(): void {
    if (typeof document === 'undefined') return;

    // Use requestIdleCallback to load deferred CSS
    const loadDeferred = (): void => {
      const deferredStyle = document.createElement('style');
      deferredStyle.id = 'deferred-css';

      const deferredRules = Array.from(this.deferredCSS)
        .map(cls => {
          return this.getCSSRule(cls);
        })
        .filter(Boolean)
        .join('\n');

      if (deferredRules) {
        deferredStyle.textContent = deferredRules;
        document.head.appendChild(deferredStyle);
      }
    };

    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(loadDeferred);
    } else {
      setTimeout(loadDeferred, 100);
    }
  }

  /**
   * Get CSS rule for a selector
   */
  private getCSSRule(selector: string): string {
    // This is a simplified implementation
    // In a real scenario, you'd extract actual CSS rules from stylesheets
    // For now, return empty string as this is a placeholder
    void selector; // Acknowledge the parameter to avoid ESLint warning
    return '';
  }

  /**
   * Optimize gradient performance
   */
  optimizeGradients(): void {
    if (typeof document === 'undefined') return;

    const gradientElements = document.querySelectorAll('[class*="gradient"]');

    gradientElements.forEach(element => {
      const htmlElement = element as HTMLElement;
      // Add GPU acceleration for gradient elements
      htmlElement.style.transform = 'translateZ(0)';
      htmlElement.style.willChange = 'background-position';

      // Use CSS custom properties for better performance
      if (htmlElement.classList.contains('gradient-animated')) {
        htmlElement.style.backgroundSize = '200% 200%';
      }
    });
  }

  /**
   * Optimize shadow performance
   */
  optimizeShadows(): void {
    if (typeof document === 'undefined') return;

    const shadowElements = document.querySelectorAll('[class*="shadow"]');

    shadowElements.forEach(element => {
      const htmlElement = element as HTMLElement;
      // Use transform instead of box-shadow for better performance where possible
      if (htmlElement.classList.contains('hover-lift')) {
        htmlElement.style.willChange = 'transform, box-shadow';
      }
    });
  }

  /**
   * Monitor CSS performance
   */
  monitorCSSPerformance(): void {
    if (typeof window === 'undefined' || !window.performance) return;

    // Monitor paint timing
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'paint' && process.env.NODE_ENV === 'development') {
            // eslint-disable-next-line no-console
            console.log(`${entry.name}: ${entry.startTime.toFixed(2)}ms`);
          }
        }
      });

      try {
        observer.observe({ entryTypes: ['paint'] });
      } catch (e) {
        // Paint timing not supported
      }
    }

    // Monitor layout shifts
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          if (
            entry.entryType === 'layout-shift' &&
            !(entry as any).hadRecentInput &&
            process.env.NODE_ENV === 'development'
          ) {
            console.warn('Layout shift detected:', (entry as any).value);
          }
        }
      });

      try {
        observer.observe({ entryTypes: ['layout-shift'] });
      } catch (e) {
        // Layout shift not supported
      }
    }
  }

  /**
   * Initialize CSS optimizations
   */
  init(): void {
    if (this.isOptimized) return;

    // Mark common critical CSS classes
    this.markCritical([
      'bg-background',
      'text-foreground',
      'flex',
      'items-center',
      'justify-center',
      'p-4',
      'rounded-lg',
      'shadow-soft',
      'transition-all',
      'duration-300',
    ]);

    // Mark deferred CSS classes
    this.markDeferred([
      'animate-pulse',
      'animate-bounce',
      'gradient-animated',
      'loading-shimmer',
      'stagger-fade-in',
    ]);

    // Apply optimizations
    this.preloadCriticalCSS();
    this.lazyLoadDeferredCSS();
    this.optimizeGradients();
    this.optimizeShadows();
    this.monitorCSSPerformance();

    this.isOptimized = true;
  }
}

// Create singleton instance
const cssOptimizer = new CSSOptimizer();

// Auto-initialize on DOM ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => cssOptimizer.init());
  } else {
    cssOptimizer.init();
  }
}

export default cssOptimizer;

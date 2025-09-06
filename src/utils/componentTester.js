/**
 * Component performance testing utilities
 */

import { act, render } from '@testing-library/react';

import performanceMonitor from './performanceMonitor';

class ComponentTester {
  constructor() {
    this.testResults = new Map();
  }

  /**
   * Test component render performance
   * @param {React.Component} Component - Component to test
   * @param {Object} props - Props to pass to component
   * @param {Object} options - Test options
   */
  async testRenderPerformance(Component, props = {}, options = {}) {
    const {
      iterations = 10,
      warmupRuns = 3,
      name = Component.displayName || 'Component',
    } = options;

    const renderTimes = [];

    // Warmup runs
    for (let i = 0; i < warmupRuns; i++) {
      const { unmount } = render(<Component {...props} />);
      unmount();
    }

    // Actual test runs
    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();

      await act(async () => {
        const { unmount } = render(<Component {...props} />);

        // Wait for any async operations
        await new Promise(resolve => setTimeout(resolve, 0));

        const endTime = performance.now();
        renderTimes.push(endTime - startTime);

        unmount();
      });
    }

    const avgRenderTime = renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length;
    const minRenderTime = Math.min(...renderTimes);
    const maxRenderTime = Math.max(...renderTimes);

    const results = {
      name,
      avgRenderTime: parseFloat(avgRenderTime.toFixed(2)),
      minRenderTime: parseFloat(minRenderTime.toFixed(2)),
      maxRenderTime: parseFloat(maxRenderTime.toFixed(2)),
      iterations,
      isOptimal: avgRenderTime < 16.67, // 60fps threshold
      renderTimes,
    };

    this.testResults.set(name, results);

    return results;
  }

  /**
   * Test component memory usage
   * @param {React.Component} Component - Component to test
   * @param {Object} props - Props to pass to component
   */
  async testMemoryUsage(Component, props = {}) {
    if (!performance.memory) {
      console.warn('Memory testing not supported in this browser');
      return null;
    }

    const initialMemory = performance.memory.usedJSHeapSize;
    const components = [];

    // Create multiple instances
    for (let i = 0; i < 100; i++) {
      const { unmount } = render(<Component {...props} />);
      components.push(unmount);
    }

    const peakMemory = performance.memory.usedJSHeapSize;

    // Cleanup
    components.forEach(unmount => unmount());

    // Force garbage collection if available
    if (window.gc) {
      window.gc();
    }

    await new Promise(resolve => setTimeout(resolve, 100));
    const finalMemory = performance.memory.usedJSHeapSize;

    return {
      initialMemory,
      peakMemory,
      finalMemory,
      memoryIncrease: peakMemory - initialMemory,
      memoryLeaked: finalMemory - initialMemory,
      isOptimal: finalMemory - initialMemory < 1024 * 1024, // Less than 1MB leak
    };
  }

  /**
   * Test animation performance
   * @param {HTMLElement} element - Element with animations
   * @param {string} animationName - Name of the animation
   */
  testAnimationPerformance(element, animationName) {
    return new Promise(resolve => {
      performanceMonitor.monitorFrameRate(animationName, 1000);

      // Monitor the specific element
      performanceMonitor.monitorElementPerformance(element, animationName);

      // Check overall animation performance
      performanceMonitor.checkAnimationPerformance(results => {
        resolve({
          animationName,
          ...results,
          element: element.tagName,
        });
      });
    });
  }

  /**
   * Test gradient and shadow performance impact
   * @param {HTMLElement} element - Element with gradients/shadows
   */
  testVisualEffectsPerformance(element) {
    const startTime = performance.now();

    // Apply heavy visual effects
    element.style.background = 'linear-gradient(45deg, #ff0000, #00ff00, #0000ff)';
    element.style.boxShadow = '0 10px 25px rgba(0,0,0,0.3), 0 20px 50px rgba(0,0,0,0.2)';
    element.style.filter = 'blur(0.5px) brightness(1.1)';

    // Force reflow
    void element.offsetHeight;

    const endTime = performance.now();

    // Reset styles
    element.style.background = '';
    element.style.boxShadow = '';
    element.style.filter = '';

    return {
      renderTime: endTime - startTime,
      isOptimal: endTime - startTime < 16.67,
    };
  }

  /**
   * Benchmark component against performance budget
   * @param {React.Component} Component - Component to benchmark
   * @param {Object} budget - Performance budget
   */
  async benchmarkComponent(Component, budget = {}) {
    const defaultBudget = {
      maxRenderTime: 16.67, // 60fps
      maxMemoryIncrease: 1024 * 1024, // 1MB
      maxMemoryLeak: 1024 * 100, // 100KB
    };

    const actualBudget = { ...defaultBudget, ...budget };
    const name = Component.displayName || 'Component';

    // Test render performance
    const renderResults = await this.testRenderPerformance(Component);

    // Test memory usage
    const memoryResults = await this.testMemoryUsage(Component);

    const benchmarkResults = {
      name,
      renderPerformance: {
        actual: renderResults.avgRenderTime,
        budget: actualBudget.maxRenderTime,
        passed: renderResults.avgRenderTime <= actualBudget.maxRenderTime,
      },
      memoryUsage: memoryResults
        ? {
            actualIncrease: memoryResults.memoryIncrease,
            budgetIncrease: actualBudget.maxMemoryIncrease,
            passedIncrease: memoryResults.memoryIncrease <= actualBudget.maxMemoryIncrease,
            actualLeak: memoryResults.memoryLeaked,
            budgetLeak: actualBudget.maxMemoryLeak,
            passedLeak: memoryResults.memoryLeaked <= actualBudget.maxMemoryLeak,
          }
        : null,
      overallPassed:
        renderResults.avgRenderTime <= actualBudget.maxRenderTime &&
        (!memoryResults ||
          (memoryResults.memoryIncrease <= actualBudget.maxMemoryIncrease &&
            memoryResults.memoryLeaked <= actualBudget.maxMemoryLeak)),
    };

    return benchmarkResults;
  }

  /**
   * Get all test results
   */
  getAllResults() {
    return Object.fromEntries(this.testResults);
  }

  /**
   * Clear test results
   */
  clearResults() {
    this.testResults.clear();
  }

  /**
   * Generate performance report
   */
  generateReport() {
    const results = this.getAllResults();
    const totalComponents = Object.keys(results).length;
    const optimalComponents = Object.values(results).filter(r => r.isOptimal).length;

    return {
      summary: {
        totalComponents,
        optimalComponents,
        optimizationRate:
          totalComponents > 0 ? ((optimalComponents / totalComponents) * 100).toFixed(2) : 0,
      },
      details: results,
      recommendations: this.generateRecommendations(results),
    };
  }

  /**
   * Generate optimization recommendations
   * @param {Object} results - Test results
   */
  generateRecommendations(results) {
    const recommendations = [];

    Object.values(results).forEach(result => {
      if (!result.isOptimal) {
        if (result.avgRenderTime > 50) {
          recommendations.push(`${result.name}: Consider lazy loading or code splitting`);
        } else if (result.avgRenderTime > 16.67) {
          recommendations.push(`${result.name}: Optimize render performance`);
        }
      }
    });

    return recommendations;
  }
}

// Create singleton instance
const componentTester = new ComponentTester();

export default componentTester;

// Export individual functions for convenience
export const {
  testRenderPerformance,
  testMemoryUsage,
  testAnimationPerformance,
  benchmarkComponent,
  generateReport,
} = componentTester;

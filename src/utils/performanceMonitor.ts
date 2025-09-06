// Performance monitoring utilities
import { useEffect } from 'react';

export class PerformanceMonitor {
  private static timers = new Map<string, number>();
  private static enabled = process.env.NODE_ENV === 'development';

  static start(label: string): void {
    if (!this.enabled) return;
    this.timers.set(label, performance.now());
  }

  static end(label: string): number | undefined {
    if (!this.enabled) return;
    const startTime = this.timers.get(label);
    if (startTime) {
      const duration = performance.now() - startTime;
      this.timers.delete(label);
      return duration;
    }
  }

  static measure<T>(label: string, fn: () => T): T {
    if (!this.enabled) return fn();
    this.start(label);
    const result = fn();
    this.end(label);
    return result;
  }

  static async measureAsync<T>(label: string, asyncFn: () => Promise<T>): Promise<T> {
    if (!this.enabled) return asyncFn();
    this.start(label);
    const result = await asyncFn();
    this.end(label);
    return result;
  }
}

// React hook for component render timing
export const useRenderTimer = (componentName: string): void => {
  const renderStart = performance.now();

  useEffect(() => {
    // Component render completed
  }, [componentName, renderStart]);
};

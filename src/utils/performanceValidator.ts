// Performance validation utilities

type ComponentName = 'ServiceList' | 'DataTable' | string;

interface PerformanceThresholds {
  ServiceList: number;
  DataTable: number;
  default: number;
}

interface MemoryInfo {
  used: number;
  total: number;
  limit: number;
}

interface PerformanceReport {
  timestamp: string;
  memory: MemoryInfo | null;
  navigation: PerformanceNavigationTiming | null;
  resources: number;
}

export const validateComponentPerformance = (
  componentName: ComponentName,
  renderTime: number
): boolean => {
  const thresholds: PerformanceThresholds = {
    ServiceList: 100, // 100ms threshold for ServiceList
    DataTable: 50, // 50ms threshold for DataTable
    default: 30, // 30ms default threshold
  };

  const threshold = thresholds[componentName as keyof PerformanceThresholds] || thresholds.default;

  if (renderTime > threshold) {
    // eslint-disable-next-line no-console
    console.warn(
      `⚠️ ${componentName} render time (${renderTime.toFixed(2)}ms) exceeds threshold (${threshold}ms)`
    );
    return false;
  }

  // eslint-disable-next-line no-console
  console.log(
    `✅ ${componentName} render time (${renderTime.toFixed(2)}ms) is within threshold (${threshold}ms)`
  );
  return true;
};

export const measureDataProcessing = <T, R>(
  label: string,
  data: T[],
  processingFn: (data: T[]) => R
): R => {
  const start = performance.now();
  const result = processingFn(data);
  const end = performance.now();

  // eslint-disable-next-line no-console
  console.log(`📊 ${label}: processed ${data.length} items in ${(end - start).toFixed(2)}ms`);

  return result;
};

export const createPerformanceReport = (): PerformanceReport => {
  const report: PerformanceReport = {
    timestamp: new Date().toISOString(),
    memory: (performance as any).memory
      ? {
          used: Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024),
          total: Math.round((performance as any).memory.totalJSHeapSize / 1024 / 1024),
          limit: Math.round((performance as any).memory.jsHeapSizeLimit / 1024 / 1024),
        }
      : null,
    navigation:
      (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming) || null,
    resources: performance.getEntriesByType('resource').length,
  };

  // eslint-disable-next-line no-console
  console.table(report);
  return report;
};

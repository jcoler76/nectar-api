import { useCallback } from 'react';

import { exportTableToCSV, ExportData } from '../utils/exportUtils';

interface UseCsvExportReturn {
  exportToCsv: (
    data: ExportData,
    filename?: string,
    options?: {
      includeTimestamp?: boolean;
      customHeaders?: Record<string, string>;
    }
  ) => Promise<void>;
}

export const useCsvExport = (): UseCsvExportReturn => {
  const exportToCsv = useCallback(
    async (
      data: ExportData,
      filename = 'export',
      options?: {
        includeTimestamp?: boolean;
        customHeaders?: Record<string, string>;
      }
    ) => {
      if (!data || data.length === 0) {
        console.warn('No data to export');
        return;
      }

      try {
        await exportTableToCSV(data, filename, {
          includeTimestamp: true,
          ...options,
        });
      } catch (error) {
        console.error('CSV export failed:', error);
        // Could add toast notification here if available
      }
    },
    []
  );

  return { exportToCsv };
};

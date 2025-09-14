import { useCallback } from 'react';

// Type for CSV export data
type CsvExportData = Record<string, string | number | boolean | null | undefined>[];

interface UseCsvExportReturn {
  exportToCsv: (data: CsvExportData, filename?: string) => void;
}

export const useCsvExport = (): UseCsvExportReturn => {
  const exportToCsv = useCallback((data: CsvExportData, filename = 'export.csv') => {
    if (!data || data.length === 0) return;

    const csv = [
      Object.keys(data[0]).join(','),
      ...data.map(row => Object.values(row).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }, []);

  return { exportToCsv };
};

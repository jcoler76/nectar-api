import { useCallback } from 'react';

import { exportTableToCSV, exportToExcel as exportToExcelUtil } from '../../../utils/exportUtils';

const useReportExport = (prepareDataFunction, defaultFilename = 'report.csv') => {
  // Fallback CSV export for backwards compatibility
  const fallbackCSVExport = useCallback(
    (data, filename) => {
      const csvContent = prepareDataFunction ? prepareDataFunction(data) : data;

      let csv;
      if (Array.isArray(csvContent) && csvContent.length > 0) {
        const headers = Object.keys(csvContent[0]);
        const csvRows = [
          headers.join(','),
          ...csvContent.map(row =>
            headers
              .map(header => {
                const value = row[header];
                if (
                  value &&
                  (value.toString().includes(',') ||
                    value.toString().includes('"') ||
                    value.toString().includes('\n'))
                ) {
                  return `"${value.toString().replace(/"/g, '""')}"`;
                }
                return value !== null && value !== undefined ? value : '';
              })
              .join(',')
          ),
        ];
        csv = csvRows.join('\n');
      } else {
        csv = csvContent;
      }

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      window.URL.revokeObjectURL(url);
    },
    [prepareDataFunction]
  );

  const exportToCSV = useCallback(
    async (data, filename = defaultFilename) => {
      if (!data || data.length === 0) {
        console.warn('No data to export');
        return;
      }

      try {
        // Use provided prepare function or default to raw data
        const csvContent = prepareDataFunction ? prepareDataFunction(data) : data;

        // Remove .csv extension from filename for the utility function
        const baseFilename = filename.replace(/\.csv$/, '');

        await exportTableToCSV(csvContent, baseFilename, {
          includeTimestamp: true,
        });
      } catch (error) {
        console.error('CSV export failed:', error);
        // Fallback to simple download if the enhanced export fails
        fallbackCSVExport(data, filename);
      }
    },
    [prepareDataFunction, defaultFilename, fallbackCSVExport]
  );

  const exportToExcel = useCallback(
    async (data, filename = defaultFilename.replace('.csv', '.xlsx')) => {
      if (!data || data.length === 0) {
        console.warn('No data to export');
        return;
      }

      try {
        const excelContent = prepareDataFunction ? prepareDataFunction(data) : data;
        const baseFilename = filename.replace(/\.xlsx?$/, '');
        await exportToExcelUtil(excelContent, baseFilename);
      } catch (error) {
        console.error('Excel export failed:', error);
      }
    },
    [prepareDataFunction, defaultFilename]
  );

  const exportToJSON = useCallback(
    (data, filename = defaultFilename.replace('.csv', '.json')) => {
      if (!data || data.length === 0) {
        console.warn('No data to export');
        return;
      }

      const jsonContent = prepareDataFunction ? prepareDataFunction(data) : data;
      const blob = new Blob([JSON.stringify(jsonContent, null, 2)], {
        type: 'application/json',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();

      window.URL.revokeObjectURL(url);
    },
    [prepareDataFunction, defaultFilename]
  );

  return {
    exportToCSV,
    exportToExcel,
    exportToJSON,
  };
};

export default useReportExport;

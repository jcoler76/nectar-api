import { useCallback } from 'react';

const useReportExport = (prepareDataFunction, defaultFilename = 'report.csv') => {
  const exportToCSV = useCallback(
    (data, filename = defaultFilename) => {
      if (!data || data.length === 0) {
        console.warn('No data to export');
        return;
      }

      // Use provided prepare function or default to raw data
      const csvContent = prepareDataFunction ? prepareDataFunction(data) : data;

      // Convert to CSV format
      let csv;
      if (Array.isArray(csvContent) && csvContent.length > 0) {
        // Get headers from first object
        const headers = Object.keys(csvContent[0]);
        const csvRows = [
          headers.join(','), // Header row
          ...csvContent.map(row =>
            headers
              .map(header => {
                const value = row[header];
                // Escape values containing commas, quotes, or newlines
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
        // If it's already a string, use it directly
        csv = csvContent;
      }

      // Create blob and download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();

      // Clean up
      window.URL.revokeObjectURL(url);
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
    exportToJSON,
  };
};

export default useReportExport;

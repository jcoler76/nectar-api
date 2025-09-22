// Export utilities for the admin frontend
// Type for data that can be exported (array of objects with string values)
export type ExportData = Record<string, string | number | boolean | null | undefined>[];

export const exportToCSV = async (data: ExportData, filename: string): Promise<void> => {
  const csvContent = convertToCSV(data);
  downloadCSV(csvContent, `${filename}.csv`);
};

// Enhanced export function with better date/time formatting
export const exportTableToCSV = async (
  data: ExportData,
  filename: string,
  options?: {
    includeTimestamp?: boolean;
    customHeaders?: Record<string, string>;
  }
): Promise<void> => {
  // Add timestamp to filename if requested
  const finalFilename = options?.includeTimestamp
    ? `${filename}_${new Date().toISOString().split('T')[0]}`
    : filename;

  // Transform data if custom headers provided
  let processedData = data;
  if (options?.customHeaders && data.length > 0) {
    processedData = data.map(row => {
      const newRow: Record<string, any> = {};
      Object.keys(row).forEach(key => {
        const displayKey = options.customHeaders![key] || key;
        newRow[displayKey] = row[key];
      });
      return newRow;
    });
  }

  const csvContent = convertToCSV(processedData);
  downloadCSV(csvContent, `${finalFilename}.csv`);
};

const convertToCSV = (data: ExportData): string => {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csvRows: string[] = [];

  // Add headers
  csvRows.push(headers.join(','));

  // Add data
  for (const row of data) {
    const values = headers.map(header => {
      let value = row[header];

      // Handle null/undefined
      if (value === null || value === undefined) {
        value = '';
      }

      // Handle objects/arrays (stringify them)
      if (typeof value === 'object') {
        value = JSON.stringify(value);
      }

      // Convert to string and escape quotes
      const stringValue = String(value).replace(/"/g, '""');

      // Wrap in quotes to handle commas, newlines, and quotes
      return `"${stringValue}"`;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
};

const downloadCSV = (csvContent: string, filename: string): void => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');

  if (link.download !== undefined) {
    // Feature detection for download attribute
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};
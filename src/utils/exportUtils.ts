// Defer heavy download helpers to reduce initial bundle size

// Type for data that can be exported (array of objects with string values)
export type ExportData = Record<string, string | number | boolean | null | undefined>[];

export const exportToCSV = async (data: ExportData, filename: string): Promise<void> => {
  const { saveAs } = await import('file-saver');
  const csvContent = convertToCSV(data);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, `${filename}.csv`);
};

export const exportToExcel = async (data: ExportData, filename: string): Promise<void> => {
  const { saveAs } = await import('file-saver');
  const ExcelJS = await import('exceljs');

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Sheet1');

  if (data.length > 0) {
    const headers = Object.keys(data[0]);
    worksheet.addRow(headers);

    data.forEach(row => {
      const values = headers.map(header => row[header]);
      worksheet.addRow(values);
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  saveAs(blob, `${filename}.xlsx`);
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

// Enhanced export function with better date/time formatting
export const exportTableToCSV = async (
  data: ExportData,
  filename: string,
  options?: {
    includeTimestamp?: boolean;
    customHeaders?: Record<string, string>;
  }
): Promise<void> => {
  const { saveAs } = await import('file-saver');

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
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, `${finalFilename}.csv`);
};

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
      const value = row[header];
      return `"${value}"`; // Wrap in quotes to handle commas in values
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
};

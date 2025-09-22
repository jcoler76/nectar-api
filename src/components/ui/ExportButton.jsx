import { Download, FileText, FileSpreadsheet } from 'lucide-react';
import React, { useState } from 'react';

import { exportTableToCSV, exportToExcel } from '../../utils/exportUtils';

const ExportButton = ({
  data,
  filename,
  customHeaders,
  className = '',
  variant = 'csv', // 'csv', 'excel', 'both'
  disabled = false,
  showLabel = true,
}) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async type => {
    if (!data || data.length === 0) {
      alert('No data to export');
      return;
    }

    setIsExporting(true);
    try {
      if (type === 'csv') {
        await exportTableToCSV(data, filename, {
          includeTimestamp: true,
          customHeaders,
        });
      } else if (type === 'excel') {
        await exportToExcel(data, filename);
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  if (variant === 'both') {
    return (
      <div className={`flex gap-2 ${className}`}>
        <button
          onClick={() => handleExport('csv')}
          disabled={disabled || isExporting}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Export as CSV"
        >
          <FileText size={16} />
          {showLabel && 'CSV'}
        </button>
        <button
          onClick={() => handleExport('excel')}
          disabled={disabled || isExporting}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Export as Excel"
        >
          <FileSpreadsheet size={16} />
          {showLabel && 'Excel'}
        </button>
      </div>
    );
  }

  const isCSV = variant === 'csv';
  const exportType = isCSV ? 'csv' : 'excel';
  const Icon = isCSV ? FileText : FileSpreadsheet;
  const bgColor = isCSV ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700';

  return (
    <button
      onClick={() => handleExport(exportType)}
      disabled={disabled || isExporting}
      className={`flex items-center gap-2 px-3 py-2 text-sm ${bgColor} text-white rounded disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      title={`Export as ${exportType.toUpperCase()}`}
    >
      {isExporting ? (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
      ) : (
        <Icon size={16} />
      )}
      {showLabel && (isExporting ? 'Exporting...' : exportType.toUpperCase())}
    </button>
  );
};

export default ExportButton;

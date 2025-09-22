import ReactJson from '@microlink/react-json-view';
import { Copy, Download } from 'lucide-react';
import React, { useState } from 'react';

import { sanitizeWorkflowData } from '../../utils/xssProtection';

const JsonViewer = ({
  data,
  name = false,
  collapsed = 1,
  theme = 'rjv-default',
  className = '',
  enableActions = true,
  displayDataTypes = false,
  displayObjectSize = false,
  displayArrayKey = false,
  quotesOnKeys = true,
  sortKeys = false,
  enableClipboard = true,
  onCopy,
  onDownload,
  title,
  maxHeight = '400px',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Sanitize the data before displaying
  const sanitizedData = sanitizeWorkflowData(data) || {};

  const handleCopy = () => {
    const jsonString = JSON.stringify(sanitizedData, null, 2);
    navigator.clipboard.writeText(jsonString).then(() => {
      if (onCopy) {
        onCopy(jsonString);
      } else {
        // You could add a toast notification here
        // JSON copied to clipboard - silent operation
      }
    });
  };

  const handleDownload = () => {
    const jsonString = JSON.stringify(sanitizedData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || 'data'}.json`;
    a.click();
    URL.revokeObjectURL(url);

    if (onDownload) {
      onDownload(jsonString);
    }
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
    return (
      <div className={`p-3 bg-gray-50 rounded border text-sm text-gray-500 ${className}`}>
        No data available
      </div>
    );
  }

  return (
    <div className={`json-viewer-container ${className}`}>
      {/* Header with title and actions */}
      {(title || enableActions) && (
        <div className="flex items-center justify-between mb-2">
          {title && <h4 className="text-sm font-medium text-gray-900">{title}</h4>}
          {enableActions && (
            <div className="flex items-center gap-2">
              <button
                onClick={toggleExpanded}
                className="text-xs text-gray-500 hover:text-gray-700"
                title={isExpanded ? 'Collapse all' : 'Expand all'}
              >
                {isExpanded ? 'Collapse' : 'Expand'}
              </button>
              {enableClipboard && (
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                  title="Copy JSON to clipboard"
                >
                  <Copy size={12} />
                  Copy
                </button>
              )}
              <button
                onClick={handleDownload}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                title="Download JSON file"
              >
                <Download size={12} />
                Download
              </button>
            </div>
          )}
        </div>
      )}

      {/* JSON Viewer */}
      <div className="json-viewer border rounded bg-white p-2 overflow-auto" style={{ maxHeight }}>
        <ReactJson
          src={sanitizedData}
          theme={theme}
          collapsed={isExpanded ? false : collapsed}
          displayDataTypes={displayDataTypes}
          displayObjectSize={displayObjectSize}
          displayArrayKey={displayArrayKey}
          quotesOnKeys={quotesOnKeys}
          sortKeys={sortKeys}
          name={name}
          enableClipboard={enableClipboard}
          onEdit={false} // Disable editing for security
          onAdd={false} // Disable adding for security
          onDelete={false} // Disable deleting for security
        />
      </div>
    </div>
  );
};

export default JsonViewer;

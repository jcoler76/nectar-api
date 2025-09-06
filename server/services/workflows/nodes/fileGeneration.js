const { logger } = require('../../../utils/logger');
const { create } = require('xmlbuilder2');
const { getFileStorageService } = require('../../fileStorageService');

const execute = async (config, context) => {
  try {
    logger.info(`Executing File Generation Node: "${config.label}"`);

    const {
      format = 'csv',
      sourceData = '{{previousNodeId.data}}',
      filename = 'generated_file',
      csvConfig = {},
      xmlConfig = {},
      jsonConfig = {},
    } = config;

    // Validate format
    if (!['csv', 'xml', 'json'].includes(format)) {
      return {
        status: 'error',
        message: 'File format must be "csv", "xml", or "json"',
      };
    }

    // Get data from context
    let data;
    try {
      // If sourceData is a string, try to parse it as a path to context data
      if (typeof sourceData === 'string' && sourceData.includes('{{')) {
        // Data should already be interpolated by the engine
        data = sourceData;
      } else {
        data = sourceData;
      }

      // Ensure data is an array or object
      if (!data || (typeof data !== 'object' && !Array.isArray(data))) {
        return {
          status: 'error',
          message: 'Source data must be an array or object',
        };
      }
    } catch (error) {
      return {
        status: 'error',
        message: `Failed to parse source data: ${error.message}`,
      };
    }

    let fileContent;
    let mimeType;
    let fileExtension;

    if (format === 'csv') {
      const result = generateCSV(data, csvConfig);
      if (result.error) {
        return {
          status: 'error',
          message: result.error,
        };
      }
      fileContent = result.content;
      mimeType = 'text/csv';
      fileExtension = 'csv';
    } else if (format === 'xml') {
      const result = generateXML(data, xmlConfig);
      if (result.error) {
        return {
          status: 'error',
          message: result.error,
        };
      }
      fileContent = result.content;
      mimeType = 'application/xml';
      fileExtension = 'xml';
    } else if (format === 'json') {
      const result = generateJSON(data, jsonConfig);
      if (result.error) {
        return {
          status: 'error',
          message: result.error,
        };
      }
      fileContent = result.content;
      mimeType = 'application/json';
      fileExtension = 'json';
    }

    // Store file in temporary storage
    const fileStorageService = getFileStorageService();
    const buffer = Buffer.from(fileContent, 'utf8');

    const metadata = {
      originalname: `${filename}.${fileExtension}`,
      mimetype: mimeType,
      size: buffer.length,
      generatedAt: new Date().toISOString(),
      format: format,
    };

    const { fileId, expiresAt } = await fileStorageService.storeFile(buffer, metadata);

    logger.info(
      `Generated ${format.toUpperCase()} file: ${metadata.originalname} (${metadata.size} bytes)`
    );

    return {
      status: 'success',
      data: {
        fileId,
        filename: metadata.originalname,
        format,
        size: metadata.size,
        mimeType,
        expiresAt,
        recordCount: Array.isArray(data)
          ? data.length
          : data && typeof data === 'object'
            ? Object.keys(data).length
            : 0,
      },
    };
  } catch (error) {
    logger.error(`File Generation node "${config.label}" failed:`, error.message);
    return {
      status: 'error',
      message: `File generation failed: ${error.message}`,
    };
  }
};

const generateCSV = (data, csvConfig) => {
  try {
    const {
      delimiter = ',',
      includeHeaders = true,
      headers = [],
      quoteStrings = true,
      escapeQuotes = true,
    } = csvConfig;

    let rows = [];

    if (Array.isArray(data)) {
      if (data.length === 0) {
        return { content: '' };
      }

      // If no headers specified, use keys from first object
      let csvHeaders = headers;
      if (csvHeaders.length === 0 && typeof data[0] === 'object') {
        csvHeaders = Object.keys(data[0]);
      }

      // Add headers row if requested
      if (includeHeaders && csvHeaders.length > 0) {
        rows.push(csvHeaders);
      }

      // Add data rows
      data.forEach(item => {
        if (typeof item === 'object') {
          const row = csvHeaders.map(header => {
            const value = item[header];
            return formatCSVValue(value, { quoteStrings, escapeQuotes, delimiter });
          });
          rows.push(row);
        } else {
          // Simple value
          rows.push([formatCSVValue(item, { quoteStrings, escapeQuotes, delimiter })]);
        }
      });
    } else if (typeof data === 'object') {
      // Convert object to key-value pairs
      if (includeHeaders) {
        rows.push(['Key', 'Value']);
      }

      Object.entries(data).forEach(([key, value]) => {
        const formattedKey = formatCSVValue(key, { quoteStrings, escapeQuotes, delimiter });
        const formattedValue = formatCSVValue(value, { quoteStrings, escapeQuotes, delimiter });
        rows.push([formattedKey, formattedValue]);
      });
    }

    // Join rows with newlines
    const content = rows.map(row => row.join(delimiter)).join('\n');

    return { content };
  } catch (error) {
    return { error: `CSV generation failed: ${error.message}` };
  }
};

const formatCSVValue = (value, options) => {
  const { quoteStrings, escapeQuotes, delimiter } = options;

  if (value === null || value === undefined) {
    return '';
  }

  let stringValue = String(value);

  // Check if value contains delimiter, quotes, or newlines
  const needsQuoting =
    stringValue.includes(delimiter) ||
    stringValue.includes('"') ||
    stringValue.includes('\n') ||
    stringValue.includes('\r') ||
    (quoteStrings && typeof value === 'string');

  if (escapeQuotes) {
    stringValue = stringValue.replace(/"/g, '""');
  }

  if (needsQuoting) {
    return `"${stringValue}"`;
  }

  return stringValue;
};

const generateXML = (data, xmlConfig) => {
  try {
    const {
      rootElement = 'data',
      itemElement = 'item',
      encoding = 'UTF-8',
      pretty = true,
      xmlDeclaration = true,
    } = xmlConfig;

    let xmlData = {};

    if (Array.isArray(data)) {
      xmlData[rootElement] = {};
      if (data.length > 0) {
        xmlData[rootElement][itemElement] = data.map(item => {
          if (typeof item === 'object') {
            return sanitizeForXML(item);
          } else {
            return { value: item };
          }
        });
      }
    } else if (typeof data === 'object') {
      xmlData[rootElement] = sanitizeForXML(data);
    } else {
      xmlData[rootElement] = { value: data };
    }

    const doc = create({ encoding }, xmlData);

    const options = {
      prettyPrint: pretty,
      headless: !xmlDeclaration,
    };

    const content = doc.end(options);

    return { content };
  } catch (error) {
    return { error: `XML generation failed: ${error.message}` };
  }
};

const sanitizeForXML = obj => {
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForXML(item));
  } else if (obj && typeof obj === 'object') {
    const sanitized = {};
    Object.entries(obj).forEach(([key, value]) => {
      // Sanitize key to be valid XML element name
      const sanitizedKey = key.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/^[^a-zA-Z_]/, '_');
      sanitized[sanitizedKey] = sanitizeForXML(value);
    });
    return sanitized;
  } else {
    return obj;
  }
};

const generateJSON = (data, jsonConfig) => {
  try {
    const { pretty = true, sortKeys = false, includeMetadata = false } = jsonConfig;

    let outputData = data;

    // Add metadata if requested
    if (includeMetadata) {
      outputData = {
        metadata: {
          generatedAt: new Date().toISOString(),
          recordCount: Array.isArray(data)
            ? data.length
            : data && typeof data === 'object'
              ? Object.keys(data).length
              : 1,
          dataType: Array.isArray(data) ? 'array' : typeof data,
        },
        data: data,
      };
    }

    // Sort keys if requested
    if (sortKeys && outputData && typeof outputData === 'object') {
      outputData = sortObjectKeys(outputData);
    }

    // Generate JSON with or without pretty printing
    const content = pretty ? JSON.stringify(outputData, null, 2) : JSON.stringify(outputData);

    return { content };
  } catch (error) {
    return { error: `JSON generation failed: ${error.message}` };
  }
};

const sortObjectKeys = obj => {
  if (Array.isArray(obj)) {
    return obj.map(item => sortObjectKeys(item));
  } else if (obj && typeof obj === 'object') {
    const sorted = {};
    Object.keys(obj)
      .sort()
      .forEach(key => {
        sorted[key] = sortObjectKeys(obj[key]);
      });
    return sorted;
  } else {
    return obj;
  }
};

module.exports = {
  execute,
};

import axios from 'axios';
import crypto from 'crypto';
import { parse } from 'csv-parse/sync';
import { logger } from '../../../utils/logger.js';

export interface CsvParseConfig {
  label?: string;
  mode?: 'context' | 'url' | 'inline';
  text?: string; // when mode is inline or interpolated from context
  url?: string; // when mode is url (http/https or presigned s3)
  delimiter?: string;
  hasHeader?: boolean;
  trim?: boolean;
  skipEmpty?: boolean;
  columns?: string[] | string; // optional explicit column names (array or comma-separated string)
  outputMode?: 'objects' | 'rows';
  previewRows?: number;
  encoding?: BufferEncoding;
}

type CsvParseResult = {
  success: boolean;
  rowCount?: number;
  headers?: string[];
  preview?: any[];
  rows?: any[]; // included when reasonably small
  fileHash?: string;
  error?: string;
};

export const execute = async (config: CsvParseConfig, _context: any): Promise<CsvParseResult> => {
  const {
    label,
    mode = 'context',
    text,
    url,
    delimiter = ',',
    hasHeader = true,
    trim = true,
    skipEmpty = true,
    columns,
    outputMode = 'objects',
    previewRows = 10,
    encoding = 'utf-8',
  } = config;

  try {
    logger.info('CSV Parse node invoked', { label, mode });

    let csvText: string = '';

    if (mode === 'url') {
      if (!url) {
        return { success: false, error: 'CSV Parse: url is required for mode=url' };
      }
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      csvText = Buffer.from(response.data).toString(encoding);
    } else {
      // inline or context-interpolated
      if (!text || typeof text !== 'string' || text.length === 0) {
        return { success: false, error: 'CSV Parse: text is empty' };
      }
      csvText = text;
    }

    const fileHash = crypto.createHash('sha1').update(csvText).digest('hex');

    // Configure csv-parse
    const parseOptions: any = {
      delimiter,
      trim,
      skip_empty_lines: skipEmpty,
    };

    let columnArray: string[] | undefined;
    if (Array.isArray(columns) && columns.length > 0) {
      columnArray = columns;
    } else if (typeof columns === 'string' && columns.trim().length > 0) {
      columnArray = columns
        .split(',')
        .map(c => c.trim())
        .filter(Boolean);
    }

    if (columnArray && columnArray.length > 0) {
      parseOptions.columns = columnArray;
    } else if (hasHeader) {
      parseOptions.columns = true;
    } else {
      // return arrays; will optionally map to objects below if requested
      parseOptions.columns = false;
    }

    const records: any[] = parse(csvText, parseOptions);

    let headers: string[] | undefined;
    let outputRows: any[] = records;

    if (!parseOptions.columns && outputMode === 'objects') {
      // No header and no explicit columns; map arrays to objects with col1..coln
      const maxLen = records.reduce((m, r) => (Array.isArray(r) ? Math.max(m, r.length) : m), 0);
      headers = Array.from({ length: maxLen }, (_, i) => `col${i + 1}`);
      outputRows = records.map((arr: any[]) => {
        const obj: any = {};
        headers!.forEach((h, idx) => {
          obj[h] = arr[idx];
        });
        return obj;
      });
    } else if (parseOptions.columns === true) {
      // csv-parse returns objects and attaches header info implicitly
      // infer headers from first record
      headers = records.length > 0 ? Object.keys(records[0]) : [];
    } else if (columnArray && columnArray.length > 0) {
      headers = columnArray;
    }

    const preview = outputRows.slice(0, Math.max(0, previewRows));

    // Avoid putting huge arrays into context; cap at 5k rows inline
    const inlineLimit = 5000;
    const includeRows = outputRows.length <= inlineLimit;

    const result: CsvParseResult = {
      success: true,
      rowCount: outputRows.length,
      headers,
      preview,
      fileHash,
    };

    if (includeRows) {
      result.rows = outputRows;
    }

    return result;
  } catch (error: any) {
    logger.error('CSV Parse node failed', { error: error.message });
    return { success: false, error: error.message || 'Unknown error' };
  }
};

export default { execute };

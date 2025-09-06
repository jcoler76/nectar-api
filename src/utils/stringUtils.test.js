import {
  formatStringToTitleCase,
  truncateString,
  capitalizeFirst,
  normalizeWhitespace,
} from './stringUtils';

describe('stringUtils', () => {
  describe('formatStringToTitleCase', () => {
    test('converts string to title case', () => {
      expect(formatStringToTitleCase('hello world')).toBe('Hello World');
      expect(formatStringToTitleCase('the quick brown fox')).toBe('The Quick Brown Fox');
      expect(formatStringToTitleCase('UPPERCASE STRING')).toBe('Uppercase String');
    });

    test('handles single word', () => {
      expect(formatStringToTitleCase('hello')).toBe('Hello');
      expect(formatStringToTitleCase('WORLD')).toBe('World');
    });

    test('handles empty and invalid inputs', () => {
      expect(formatStringToTitleCase('')).toBe('');
      expect(formatStringToTitleCase(null)).toBe('');
      expect(formatStringToTitleCase(undefined)).toBe('');
      expect(formatStringToTitleCase(123)).toBe('');
    });

    test('handles strings with multiple spaces', () => {
      expect(formatStringToTitleCase('hello  world')).toBe('Hello  World');
      expect(formatStringToTitleCase('  spaced  out  ')).toBe('  Spaced  Out  ');
    });
  });

  describe('truncateString', () => {
    test('truncates string longer than maxLength', () => {
      expect(truncateString('Hello World', 5)).toBe('He...');
      expect(truncateString('This is a long string', 10)).toBe('This is...');
    });

    test('returns original string if shorter than maxLength', () => {
      expect(truncateString('Short', 10)).toBe('Short');
      expect(truncateString('Hello', 5)).toBe('Hello');
    });

    test('handles custom ellipsis', () => {
      expect(truncateString('Hello World', 8, '***')).toBe('Hello***');
      expect(truncateString('Test string', 6, ' [...]')).toBe(' [...]');
    });

    test('handles edge cases', () => {
      expect(truncateString('', 5)).toBe('');
      expect(truncateString('Hello', 0)).toBe('...');
      expect(truncateString('Test', -1)).toBe('Test');
    });

    test('handles invalid inputs', () => {
      expect(truncateString(null, 5)).toBe('');
      expect(truncateString(undefined, 5)).toBe('');
      expect(truncateString(123, 5)).toBe('');
      expect(truncateString('Hello', 'invalid')).toBe('Hello');
    });
  });

  describe('capitalizeFirst', () => {
    test('capitalizes first letter', () => {
      expect(capitalizeFirst('hello')).toBe('Hello');
      expect(capitalizeFirst('WORLD')).toBe('World');
      expect(capitalizeFirst('tEST')).toBe('Test');
    });

    test('handles single character', () => {
      expect(capitalizeFirst('a')).toBe('A');
      expect(capitalizeFirst('Z')).toBe('Z');
    });

    test('handles invalid inputs', () => {
      expect(capitalizeFirst('')).toBe('');
      expect(capitalizeFirst(null)).toBe('');
      expect(capitalizeFirst(undefined)).toBe('');
      expect(capitalizeFirst(123)).toBe('');
    });

    test('only affects first character', () => {
      expect(capitalizeFirst('hello WORLD')).toBe('Hello world');
      expect(capitalizeFirst('mIXeD cAsE')).toBe('Mixed case');
    });
  });

  describe('normalizeWhitespace', () => {
    test('removes extra whitespace', () => {
      expect(normalizeWhitespace('hello    world')).toBe('hello world');
      expect(normalizeWhitespace('  multiple   spaces  ')).toBe('multiple spaces');
    });

    test('handles tabs and newlines', () => {
      expect(normalizeWhitespace('hello\t\nworld')).toBe('hello world');
      expect(normalizeWhitespace('line1\n\nline2')).toBe('line1 line2');
    });

    test('trims leading and trailing whitespace', () => {
      expect(normalizeWhitespace('  hello world  ')).toBe('hello world');
      expect(normalizeWhitespace('\t\nhello\t\n')).toBe('hello');
    });

    test('handles invalid inputs', () => {
      expect(normalizeWhitespace('')).toBe('');
      expect(normalizeWhitespace(null)).toBe('');
      expect(normalizeWhitespace(undefined)).toBe('');
      expect(normalizeWhitespace(123)).toBe('');
    });

    test('handles strings with only whitespace', () => {
      expect(normalizeWhitespace('   ')).toBe('');
      expect(normalizeWhitespace('\t\n\r')).toBe('');
    });
  });
});

import { expect, test } from 'vitest';
import {
  formatPublishedAtLabel,
  parsePositiveIntegerOption,
  resolveCategoryFilters,
} from '../src/index';

test('parsePositiveIntegerOption parses valid integer', () => {
  expect(parsePositiveIntegerOption('5', '--limit')).toBe(5);
});

test('parsePositiveIntegerOption throws on invalid input', () => {
  expect(() => parsePositiveIntegerOption('0', '--limit')).toThrow(
    '--limit must be a positive integer.',
  );
  expect(() => parsePositiveIntegerOption('abc', '--limit')).toThrow(
    '--limit must be a positive integer.',
  );
});

test('resolveCategoryFilters merges shortcuts and comma-separated categories', () => {
  const filters = resolveCategoryFilters({
    category: 'Japan, International,Japan',
    others: true,
  });

  expect(filters).toEqual(['Japan', 'International', 'Others']);
});

test('formatPublishedAtLabel keeps iso-like timestamp text', () => {
  expect(formatPublishedAtLabel('2026-02-21T08:13:59+09:00')).toBe('2026-02-21 08:13');
});

test('formatPublishedAtLabel falls back to Unknown for invalid or empty value', () => {
  expect(formatPublishedAtLabel(undefined)).toBe('Unknown');
  expect(formatPublishedAtLabel('not-a-date')).toBe('Unknown');
});

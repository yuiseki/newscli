import { expect, test } from 'vitest';
import {
  defaultListDateKeys,
  formatPublishedAtLabel,
  parseDateOption,
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

test('parseDateOption resolves today when omitted', () => {
  const parsed = parseDateOption(undefined, new Date(2026, 1, 20));
  expect(parsed).toEqual({ dateKey: '2026-02-20', isToday: true });
});

test('defaultListDateKeys resolves today and yesterday', () => {
  const keys = defaultListDateKeys(new Date(2026, 1, 21));
  expect(keys).toEqual(['2026-02-21', '2026-02-20']);
});

test('parseDateOption parses explicit date', () => {
  const parsed = parseDateOption('2026-02-19', new Date(2026, 1, 20));
  expect(parsed).toEqual({ dateKey: '2026-02-19', isToday: false });
});

test('parseDateOption rejects invalid formats', () => {
  expect(() => parseDateOption('2026-02', new Date(2026, 1, 20))).toThrow(
    '--date format must be yyyy-mm-dd.',
  );
  expect(() => parseDateOption('2026-02-30', new Date(2026, 1, 20))).toThrow(
    '--date must be a valid calendar date.',
  );
});

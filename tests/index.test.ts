import { expect, test } from 'vitest';
import { parsePositiveIntegerOption, resolveCategoryFilters } from '../src/index';

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

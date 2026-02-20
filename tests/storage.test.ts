import path from 'node:path';
import { expect, test } from 'vitest';
import { formatDateKey, getCachePath } from '../src/storage';

test('formatDateKey creates yyyy-mm-dd label', () => {
  expect(formatDateKey(new Date(2026, 1, 21))).toBe('2026-02-21');
});

test('getCachePath uses daily directory layout', () => {
  const cachePath = getCachePath('/tmp/news-cache', '2026-02-21');
  expect(cachePath).toBe(path.join('/tmp/news-cache', '2026', '02', '21', 'news.json'));
});

test('getCachePath rejects invalid date key', () => {
  expect(() => getCachePath('/tmp/news-cache', '2026-02-30')).toThrow(
    'dateKey must be a valid calendar date.',
  );
});

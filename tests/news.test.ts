import { expect, test } from 'vitest';
import {
  applyPerFeedLimit,
  filterArticlesByDateKey,
  filterArticlesWithKnownPublishedDate,
  groupArticlesByPublishedDate,
  resolvePublishedDateKey,
} from '../src/news';
import { type Article } from '../src/types';

test('resolvePublishedDateKey returns date key from iso-like timestamp', () => {
  expect(resolvePublishedDateKey('2026-02-18T20:34:59+09:00')).toBe('2026-02-18');
  expect(resolvePublishedDateKey('2026-02-18 20:34:59')).toBe('2026-02-18');
});

test('resolvePublishedDateKey returns null for empty or invalid values', () => {
  expect(resolvePublishedDateKey(undefined)).toBeNull();
  expect(resolvePublishedDateKey('not-a-date')).toBeNull();
  expect(resolvePublishedDateKey('2026-02-30T20:34:59+09:00')).toBeNull();
});

test('groupArticlesByPublishedDate groups by publishedAt and falls back to sync date', () => {
  const articles: Article[] = [
    {
      category: 'International',
      source: 'Foreign Policy',
      title: 'A',
      link: 'https://example.com/a',
      publishedAt: '2026-02-18T20:34:59+09:00',
    },
    {
      category: 'International',
      source: 'BBC',
      title: 'B',
      link: 'https://example.com/b',
      publishedAt: '2026-02-19 09:00:00',
    },
    {
      category: 'International',
      source: 'CNA',
      title: 'C',
      link: 'https://example.com/c',
      publishedAt: undefined,
    },
  ];

  const grouped = groupArticlesByPublishedDate(articles, '2026-02-21');

  expect(grouped.get('2026-02-18')?.map((item) => item.title)).toEqual(['A']);
  expect(grouped.get('2026-02-19')?.map((item) => item.title)).toEqual(['B']);
  expect(grouped.get('2026-02-21')?.map((item) => item.title)).toEqual(['C']);
});

test('applyPerFeedLimit trims each feed independently', () => {
  const articles: Article[] = [
    {
      category: 'International',
      source: 'Foreign Policy',
      title: 'A-1',
      link: 'https://example.com/a1',
      publishedAt: '2026-02-18T20:34:59+09:00',
    },
    {
      category: 'International',
      source: 'Foreign Policy',
      title: 'A-2',
      link: 'https://example.com/a2',
      publishedAt: '2026-02-18T20:35:59+09:00',
    },
    {
      category: 'International',
      source: 'BBC',
      title: 'B-1',
      link: 'https://example.com/b1',
      publishedAt: '2026-02-18T20:36:59+09:00',
    },
    {
      category: 'International',
      source: 'BBC',
      title: 'B-2',
      link: 'https://example.com/b2',
      publishedAt: '2026-02-18T20:37:59+09:00',
    },
  ];

  expect(applyPerFeedLimit(articles, 1).map((item) => item.title)).toEqual(['A-1', 'B-1']);
});

test('filterArticlesByDateKey keeps only target date bucket', () => {
  const articles: Article[] = [
    {
      category: 'International',
      source: 'Foreign Policy',
      title: 'A-1',
      link: 'https://example.com/a1',
      publishedAt: '2026-02-18T20:34:59+09:00',
    },
    {
      category: 'International',
      source: 'Foreign Policy',
      title: 'A-2',
      link: 'https://example.com/a2',
      publishedAt: '2026-02-21T09:00:00+09:00',
    },
    {
      category: 'International',
      source: 'BBC',
      title: 'B-unknown',
      link: 'https://example.com/b',
      publishedAt: undefined,
    },
  ];

  const filtered = filterArticlesByDateKey(articles, '2026-02-21');
  expect(filtered.map((item) => item.title)).toEqual(['A-2']);
});

test('filterArticlesWithKnownPublishedDate drops unknown publishedAt', () => {
  const articles: Article[] = [
    {
      category: 'Others',
      source: 'Known Source',
      title: 'Known',
      link: 'https://example.com/known',
      publishedAt: '2026-02-21T01:02:03+09:00',
    },
    {
      category: 'Others',
      source: 'Unknown Source',
      title: 'Unknown',
      link: 'https://example.com/unknown',
      publishedAt: undefined,
    },
  ];

  expect(filterArticlesWithKnownPublishedDate(articles).map((item) => item.title)).toEqual(['Known']);
});

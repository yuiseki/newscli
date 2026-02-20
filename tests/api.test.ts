import { expect, test } from 'vitest';
import { fetchArticlesFromSources } from '../src/api';
import { type FeedSource } from '../src/types';

test('fetchArticlesFromSources keeps input order and respects limit', async () => {
  const sources: FeedSource[] = [
    { category: 'Japan', name: 'Source A', url: 'https://example.com/a.xml' },
    { category: 'Japan', name: 'Source B', url: 'https://example.com/b.xml' },
  ];

  const result = await fetchArticlesFromSources(sources, 2, async (url) => {
    if (url.endsWith('/a.xml')) {
      return {
        items: [
          { title: 'A-1', link: 'https://example.com/a/1', isoDate: '2026-01-01T00:00:00Z' },
          { title: 'A-2', link: 'https://example.com/a/2', isoDate: '2026-01-01T01:00:00Z' },
          { title: 'A-3', link: 'https://example.com/a/3', isoDate: '2026-01-01T02:00:00Z' },
        ],
      };
    }

    return {
      items: [
        { title: 'B-1', link: 'https://example.com/b/1', pubDate: 'Fri, 01 Jan 2026 00:00:00 GMT' },
      ],
    };
  });

  expect(result.warnings).toEqual([]);
  expect(result.articles.map((item) => item.title)).toEqual(['A-1', 'A-2', 'B-1']);
  expect(result.articles[0]?.category).toBe('Japan');
  expect(result.articles[0]?.source).toBe('Source A');
});

test('fetchArticlesFromSources returns warning when one feed fails', async () => {
  const sources: FeedSource[] = [
    { category: 'Japan', name: 'Source A', url: 'https://example.com/a.xml' },
    { category: 'Japan', name: 'Source B', url: 'https://example.com/b.xml' },
  ];

  const result = await fetchArticlesFromSources(sources, 3, async (url) => {
    if (url.endsWith('/a.xml')) {
      throw new Error('request failed');
    }

    return {
      items: [{ title: 'B-1', link: 'https://example.com/b/1' }],
    };
  });

  expect(result.articles).toEqual([
    {
      category: 'Japan',
      source: 'Source B',
      title: 'B-1',
      link: 'https://example.com/b/1',
      publishedAt: undefined,
    },
  ]);

  expect(result.warnings).toEqual([
    {
      category: 'Japan',
      source: 'Source A',
      url: 'https://example.com/a.xml',
      message: 'request failed',
    },
  ]);
});

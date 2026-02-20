import Parser from 'rss-parser';
import { type Article, type FeedSource, type FetchWarning } from './types';

const parser = new Parser();

function buildErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

type RssItem = {
  title?: string;
  link?: string;
  pubDate?: string;
  isoDate?: string;
};

type ParseFeedFn = (url: string) => Promise<{ items?: RssItem[] }>;

export async function fetchArticlesFromSources(
  sources: FeedSource[],
  limitPerFeed: number,
  parseFeed: ParseFeedFn = (url) => parser.parseURL(url),
): Promise<{ articles: Article[]; warnings: FetchWarning[] }> {
  const tasks = sources.map(async (source) => {
    try {
      const feed = await parseFeed(source.url);
      const items = Array.isArray(feed.items) ? feed.items : [];

      const articles = items.slice(0, limitPerFeed).map((item) => ({
        category: source.category,
        source: source.name,
        title: item.title || 'No Title',
        link: item.link || '',
        publishedAt: item.isoDate || item.pubDate,
      }));

      return {
        articles,
        warning: null,
      };
    } catch (error) {
      const warning: FetchWarning = {
        category: source.category,
        source: source.name,
        url: source.url,
        message: buildErrorMessage(error),
      };
      return {
        articles: [],
        warning,
      };
    }
  });

  const taskResults = await Promise.all(tasks);

  const articles: Article[] = [];
  const warnings: FetchWarning[] = [];

  for (const result of taskResults) {
    articles.push(...result.articles);
    if (result.warning) warnings.push(result.warning);
  }

  return { articles, warnings };
}

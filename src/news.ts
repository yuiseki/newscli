import {
  getCacheDir,
  formatDateKey,
  isCacheFresh,
  loadCache,
  saveCache,
} from './storage';
import { readFeedSourcesFromOpml } from './opml';
import { fetchArticlesFromSources } from './api';
import { type Article, type LoadedNews, type NewsCache } from './types';

export type LoadNewsOptions = {
  cacheDir: string;
  dateKey: string;
  opmlPath: string;
  forceSync: boolean;
  limitPerFeed: number;
  cacheTtlMinutes: number;
};

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function isValidDateKey(dateKey: string): boolean {
  const match = dateKey.match(DATE_KEY_PATTERN);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const probe = new Date(year, month - 1, day);
  return (
    probe.getFullYear() === year &&
    probe.getMonth() === month - 1 &&
    probe.getDate() === day
  );
}

export function resolvePublishedDateKey(publishedAt?: string): string | null {
  if (!publishedAt) return null;

  const leadingDateMatch = publishedAt.match(/^(\d{4}-\d{2}-\d{2})/);
  if (leadingDateMatch) {
    return isValidDateKey(leadingDateMatch[1]) ? leadingDateMatch[1] : null;
  }

  const parsed = new Date(publishedAt);
  if (!Number.isFinite(parsed.getTime())) return null;
  return formatDateKey(parsed);
}

export function groupArticlesByPublishedDate(
  articles: Article[],
  fallbackDateKey: string,
): Map<string, Article[]> {
  const grouped = new Map<string, Article[]>();

  for (const article of articles) {
    const dateKey = resolvePublishedDateKey(article.publishedAt) ?? fallbackDateKey;
    const bucket = grouped.get(dateKey);
    if (bucket) {
      bucket.push(article);
      continue;
    }

    grouped.set(dateKey, [article]);
  }

  return grouped;
}

export async function loadNews(options: LoadNewsOptions): Promise<LoadedNews> {
  const cacheDir = getCacheDir(options.cacheDir);
  const todayDateKey = formatDateKey(new Date());
  const isTargetToday = options.dateKey === todayDateKey;
  const cached = loadCache(cacheDir, options.dateKey);

  if (cached && !options.forceSync) {
    if (!isTargetToday) {
      return {
        fromCache: true,
        updatedAt: cached.updatedAt,
        categories: cached.categories,
        articles: cached.articles,
        warnings: [],
      };
    }

    if (
      cached.opmlPath === options.opmlPath &&
      cached.limitPerFeed === options.limitPerFeed &&
      isCacheFresh(cached, options.cacheTtlMinutes)
    ) {
      return {
        fromCache: true,
        updatedAt: cached.updatedAt,
        categories: cached.categories,
        articles: cached.articles,
        warnings: [],
      };
    }
  }

  if (!isTargetToday) {
    if (options.forceSync) {
      throw new Error('--sync is only supported for today. Past dates are cache-only.');
    }

    throw new Error(
      `No cache snapshot for ${options.dateKey}. Run "news sync" to ingest articles into published-date cache.`,
    );
  }

  const { sources, categories } = await readFeedSourcesFromOpml(options.opmlPath);
  const fetched = await fetchArticlesFromSources(sources, options.limitPerFeed);
  const updatedAt = new Date().toISOString();

  const cacheData: NewsCache = {
    version: 1,
    snapshotDate: options.dateKey,
    opmlPath: options.opmlPath,
    limitPerFeed: options.limitPerFeed,
    updatedAt,
    categories,
    articles: fetched.articles,
  };

  saveCache(cacheDir, options.dateKey, cacheData);
  const groupedByDate = groupArticlesByPublishedDate(fetched.articles, options.dateKey);
  for (const [dateKey, articles] of groupedByDate) {
    if (dateKey === options.dateKey) continue;
    saveCache(cacheDir, dateKey, {
      ...cacheData,
      snapshotDate: dateKey,
      articles,
    });
  }

  return {
    fromCache: false,
    updatedAt,
    categories,
    articles: fetched.articles,
    warnings: fetched.warnings,
  };
}

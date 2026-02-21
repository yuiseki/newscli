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

export function applyPerFeedLimit(articles: Article[], limitPerFeed: number): Article[] {
  const feedCounters = new Map<string, number>();
  const limited: Article[] = [];

  for (const article of articles) {
    const feedKey = `${article.category}\u0000${article.source}`;
    const count = feedCounters.get(feedKey) ?? 0;
    if (count >= limitPerFeed) continue;

    limited.push(article);
    feedCounters.set(feedKey, count + 1);
  }

  return limited;
}

export function filterArticlesWithKnownPublishedDate(articles: Article[]): Article[] {
  return articles.filter((article) => resolvePublishedDateKey(article.publishedAt) !== null);
}

export function filterArticlesByDateKey(
  articles: Article[],
  dateKey: string,
): Article[] {
  return articles.filter((article) => {
    const resolvedDateKey = resolvePublishedDateKey(article.publishedAt);
    return resolvedDateKey === dateKey;
  });
}

export async function loadNews(options: LoadNewsOptions): Promise<LoadedNews> {
  const cacheDir = getCacheDir(options.cacheDir);
  const todayDateKey = formatDateKey(new Date());
  const isTargetToday = options.dateKey === todayDateKey;
  const cached = loadCache(cacheDir, options.dateKey);

  if (cached && !options.forceSync) {
    const datedCachedArticles = filterArticlesWithKnownPublishedDate(cached.articles);
    const dateScopedCachedArticles = filterArticlesByDateKey(datedCachedArticles, options.dateKey);

    if (!isTargetToday) {
      return {
        fromCache: true,
        updatedAt: cached.updatedAt,
        categories: cached.categories,
        articles: applyPerFeedLimit(dateScopedCachedArticles, options.limitPerFeed),
        warnings: [],
      };
    }

    if (
      cached.opmlPath === options.opmlPath &&
      cached.limitPerFeed >= options.limitPerFeed &&
      isCacheFresh(cached, options.cacheTtlMinutes)
    ) {
      return {
        fromCache: true,
        updatedAt: cached.updatedAt,
        categories: cached.categories,
        articles: applyPerFeedLimit(dateScopedCachedArticles, options.limitPerFeed),
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
  const datedFetchedArticles = filterArticlesWithKnownPublishedDate(fetched.articles);

  const cacheData: NewsCache = {
    version: 1,
    snapshotDate: options.dateKey,
    opmlPath: options.opmlPath,
    limitPerFeed: options.limitPerFeed,
    updatedAt,
    categories,
    articles: datedFetchedArticles,
  };

  const groupedByDate = groupArticlesByPublishedDate(datedFetchedArticles, options.dateKey);
  if (!groupedByDate.has(options.dateKey)) {
    groupedByDate.set(options.dateKey, []);
  }
  for (const [dateKey, articles] of groupedByDate) {
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
    articles: datedFetchedArticles,
    warnings: fetched.warnings,
  };
}

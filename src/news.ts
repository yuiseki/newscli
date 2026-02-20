import {
  getCacheDir,
  formatDateKey,
  isCacheFresh,
  loadCache,
  saveCache,
} from './storage';
import { readFeedSourcesFromOpml } from './opml';
import { fetchArticlesFromSources } from './api';
import { type LoadedNews, type NewsCache } from './types';

export type LoadNewsOptions = {
  cacheDir: string;
  dateKey: string;
  opmlPath: string;
  forceSync: boolean;
  limitPerFeed: number;
  cacheTtlMinutes: number;
};

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
      `No cache snapshot for ${options.dateKey}. Run "news sync" on that day to keep history.`,
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

  return {
    fromCache: false,
    updatedAt,
    categories,
    articles: fetched.articles,
    warnings: fetched.warnings,
  };
}

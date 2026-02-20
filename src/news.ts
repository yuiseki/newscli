import {
  getCacheDir,
  getCachePath,
  isCacheFresh,
  loadCache,
  saveCache,
} from './storage';
import { readFeedSourcesFromOpml } from './opml';
import { fetchArticlesFromSources } from './api';
import { type LoadedNews, type NewsCache } from './types';

export type LoadNewsOptions = {
  cacheDir: string;
  opmlPath: string;
  forceSync: boolean;
  limitPerFeed: number;
  cacheTtlMinutes: number;
};

export async function loadNews(options: LoadNewsOptions): Promise<LoadedNews> {
  const cacheDir = getCacheDir(options.cacheDir);
  const cachePath = getCachePath(cacheDir);

  if (!options.forceSync) {
    const cached = loadCache(cachePath);
    if (
      cached &&
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

  const { sources, categories } = await readFeedSourcesFromOpml(options.opmlPath);
  const fetched = await fetchArticlesFromSources(sources, options.limitPerFeed);
  const updatedAt = new Date().toISOString();

  const cacheData: NewsCache = {
    version: 1,
    opmlPath: options.opmlPath,
    limitPerFeed: options.limitPerFeed,
    updatedAt,
    categories,
    articles: fetched.articles,
  };

  saveCache(cachePath, cacheData);

  return {
    fromCache: false,
    updatedAt,
    categories,
    articles: fetched.articles,
    warnings: fetched.warnings,
  };
}

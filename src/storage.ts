import fs from 'fs';
import path from 'path';
import { type NewsCache } from './types';

function ensureDirectory(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function getCacheDir(baseDir: string): string {
  ensureDirectory(baseDir);
  return baseDir;
}

export function getCachePath(cacheDir: string): string {
  return path.join(cacheDir, 'news.json');
}

function isArticleLike(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.category === 'string' &&
    typeof record.source === 'string' &&
    typeof record.title === 'string' &&
    typeof record.link === 'string'
  );
}

function isNewsCache(value: unknown): value is NewsCache {
  if (!value || typeof value !== 'object') return false;

  const record = value as Record<string, unknown>;
  return (
    record.version === 1 &&
    typeof record.opmlPath === 'string' &&
    typeof record.limitPerFeed === 'number' &&
    typeof record.updatedAt === 'string' &&
    Array.isArray(record.categories) &&
    record.categories.every((item) => typeof item === 'string') &&
    Array.isArray(record.articles) &&
    record.articles.every((item) => isArticleLike(item))
  );
}

export function loadCache(cachePath: string): NewsCache | null {
  if (!fs.existsSync(cachePath)) return null;

  try {
    const parsed = JSON.parse(fs.readFileSync(cachePath, 'utf8')) as unknown;
    if (!isNewsCache(parsed)) return null;
    return parsed;
  } catch (_error) {
    return null;
  }
}

export function saveCache(cachePath: string, cache: NewsCache): void {
  const dir = path.dirname(cachePath);
  ensureDirectory(dir);
  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), 'utf8');
}

export function isCacheFresh(cache: NewsCache, ttlMinutes: number, nowMs: number = Date.now()): boolean {
  const updatedAtMs = new Date(cache.updatedAt).getTime();
  if (!Number.isFinite(updatedAtMs)) return false;

  const ttlMs = ttlMinutes * 60 * 1000;
  return nowMs - updatedAtMs < ttlMs;
}

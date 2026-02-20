import fs from 'fs';
import path from 'path';
import { type NewsCache } from './types';

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function ensureDirectory(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function getCacheDir(baseDir: string): string {
  ensureDirectory(baseDir);
  return baseDir;
}

export function formatDateKey(date: Date): string {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDatePathParts(dateKey: string): { year: string; month: string; day: string } {
  const match = dateKey.match(DATE_KEY_PATTERN);
  if (!match) {
    throw new Error('dateKey must be yyyy-mm-dd.');
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const probe = new Date(year, month - 1, day);
  if (
    probe.getFullYear() !== year ||
    probe.getMonth() !== month - 1 ||
    probe.getDate() !== day
  ) {
    throw new Error('dateKey must be a valid calendar date.');
  }

  return {
    year: match[1],
    month: match[2],
    day: match[3],
  };
}

export function getCachePath(cacheDir: string, dateKey: string): string {
  const parts = getDatePathParts(dateKey);
  return path.join(cacheDir, parts.year, parts.month, parts.day, 'news.json');
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
    (typeof record.snapshotDate === 'undefined' || typeof record.snapshotDate === 'string') &&
    typeof record.opmlPath === 'string' &&
    typeof record.limitPerFeed === 'number' &&
    typeof record.updatedAt === 'string' &&
    Array.isArray(record.categories) &&
    record.categories.every((item) => typeof item === 'string') &&
    Array.isArray(record.articles) &&
    record.articles.every((item) => isArticleLike(item))
  );
}

export function loadCache(cacheDir: string, dateKey: string): NewsCache | null {
  const cachePath = getCachePath(cacheDir, dateKey);
  if (!fs.existsSync(cachePath)) return null;

  try {
    const parsed = JSON.parse(fs.readFileSync(cachePath, 'utf8')) as unknown;
    if (!isNewsCache(parsed)) return null;
    return parsed;
  } catch (_error) {
    return null;
  }
}

export function saveCache(cacheDir: string, dateKey: string, cache: NewsCache): void {
  const cachePath = getCachePath(cacheDir, dateKey);
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

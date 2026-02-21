#!/usr/bin/env node
import path from 'path';
import { Command } from 'commander';
import { config, setConfigOverrides, type NewsCliConfig } from './config';
import { filterArticlesByDateKey, loadNews } from './news';
import { formatDateKey } from './storage';
import { type Article } from './types';

type ListCommandOptions = {
  sync?: boolean;
  date?: string;
  category?: string;
  japan?: boolean;
  international?: boolean;
  others?: boolean;
  limit?: string;
  json?: boolean;
  opml?: string;
  cacheDir?: string;
  cacheTtlMinutes?: string;
};

type SyncCommandOptions = {
  limit?: string;
  json?: boolean;
  opml?: string;
  cacheDir?: string;
  cacheTtlMinutes?: string;
};

type LoadedDateChunk = {
  dateKey: string;
  fromCache: boolean;
  updatedAt: string;
  categories: string[];
  articles: Article[];
  warnings: Array<{ category: string; source: string; url: string; message: string }>;
};

export function parsePositiveIntegerOption(value: string, optionName: string): number {
  if (!/^\d+$/.test(value)) {
    throw new Error(`${optionName} must be a positive integer.`);
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${optionName} must be a positive integer.`);
  }

  return parsed;
}

export function parseDateOption(
  value: string | undefined,
  now: Date = new Date(),
): { dateKey: string; isToday: boolean } {
  const todayDateKey = formatDateKey(now);
  if (!value) {
    return {
      dateKey: todayDateKey,
      isToday: true,
    };
  }

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new Error('--date format must be yyyy-mm-dd.');
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
    throw new Error('--date must be a valid calendar date.');
  }

  const dateKey = `${match[1]}-${match[2]}-${match[3]}`;
  return {
    dateKey,
    isToday: dateKey === todayDateKey,
  };
}

export function defaultListDateKeys(now: Date = new Date()): string[] {
  const today = new Date(now);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  return [formatDateKey(today), formatDateKey(yesterday)];
}

function normalizeCategory(value: string): string {
  return value.trim().toLowerCase();
}

export function resolveCategoryFilters(options: {
  category?: string;
  japan?: boolean;
  international?: boolean;
  others?: boolean;
}): string[] {
  const values: string[] = [];

  if (options.category) {
    const chunks = options.category
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
    values.push(...chunks);
  }

  if (options.japan) values.push('Japan');
  if (options.international) values.push('International');
  if (options.others) values.push('Others');

  const deduped = new Map<string, string>();
  for (const value of values) {
    const key = normalizeCategory(value);
    if (!deduped.has(key)) deduped.set(key, value);
  }

  return Array.from(deduped.values());
}

export function formatPublishedAtLabel(publishedAt?: string): string {
  if (!publishedAt) return 'Unknown';

  const isoLikeMatch = publishedAt.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/);
  if (isoLikeMatch) {
    return `${isoLikeMatch[1]} ${isoLikeMatch[2]}`;
  }

  const parsed = new Date(publishedAt);
  if (!Number.isFinite(parsed.getTime())) return 'Unknown';

  const year = String(parsed.getFullYear());
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  const hour = String(parsed.getHours()).padStart(2, '0');
  const minute = String(parsed.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function filterArticles(articles: Article[], categoryFilters: string[]): Article[] {
  if (categoryFilters.length === 0) return articles;

  const filterKeys = new Set(categoryFilters.map((value) => normalizeCategory(value)));
  return articles.filter((article) => filterKeys.has(normalizeCategory(article.category)));
}

function filterCategories(categories: string[], categoryFilters: string[]): string[] {
  if (categoryFilters.length === 0) return categories;

  const filterKeys = new Set(categoryFilters.map((value) => normalizeCategory(value)));
  return categories.filter((category) => filterKeys.has(normalizeCategory(category)));
}

function configureRuntimeOptions(options: {
  opml?: string;
  cacheDir?: string;
  cacheTtlMinutes?: string;
}): void {
  const overrides: Partial<NewsCliConfig> = {};

  if (options.opml) {
    overrides.NEWSCLI_OPML_PATH = path.resolve(options.opml);
  }
  if (options.cacheDir) {
    overrides.NEWSCLI_CACHE_DIR = path.resolve(options.cacheDir);
  }
  if (options.cacheTtlMinutes) {
    overrides.NEWSCLI_CACHE_TTL_MINUTES = parsePositiveIntegerOption(
      options.cacheTtlMinutes,
      '--cache-ttl-minutes',
    );
  }

  if (Object.keys(overrides).length > 0) {
    setConfigOverrides(overrides);
  }
}

function isNoCacheSnapshotError(error: unknown): boolean {
  return error instanceof Error && error.message.startsWith('No cache snapshot for ');
}

function mergeCategoriesInOrder(chunks: LoadedDateChunk[]): string[] {
  const merged: string[] = [];
  const seen = new Set<string>();

  for (const chunk of chunks) {
    for (const category of chunk.categories) {
      if (seen.has(category)) continue;
      seen.add(category);
      merged.push(category);
    }
  }

  return merged;
}

function resolveLatestUpdatedAt(chunks: LoadedDateChunk[]): string {
  if (chunks.length === 0) return new Date(0).toISOString();

  let latest = chunks[0].updatedAt;
  let latestMs = new Date(latest).getTime();

  for (const chunk of chunks.slice(1)) {
    const currentMs = new Date(chunk.updatedAt).getTime();
    if (!Number.isFinite(currentMs)) continue;
    if (!Number.isFinite(latestMs) || currentMs > latestMs) {
      latest = chunk.updatedAt;
      latestMs = currentMs;
    }
  }

  return latest;
}

function printTextOutput(payload: {
  fromCache: boolean;
  dateKey: string;
  updatedAt: string;
  categories: string[];
  articles: Article[];
  warnings: Array<{ source: string; message: string }>;
  categoryFilters: string[];
}): void {
  console.log(`news (${payload.fromCache ? 'Cache' : 'Fresh'})`);
  console.log(`Date: ${payload.dateKey}`);
  console.log(`Updated: ${payload.updatedAt}`);

  if (payload.categoryFilters.length > 0) {
    console.log(`Filter: ${payload.categoryFilters.join(', ')}`);
  }

  if (payload.categories.length === 0) {
    console.log('No matching categories.');
    return;
  }

  for (const category of payload.categories) {
    const categoryArticles = payload.articles.filter((article) => article.category === category);
    if (categoryArticles.length === 0) continue;

    console.log(`\n>>> ${category} <<<`);
    for (const article of categoryArticles) {
      const publishedAtLabel = formatPublishedAtLabel(article.publishedAt);
      console.log(`- [${publishedAtLabel}] [${article.source}] ${article.title}`);
      console.log(`  ${article.link}`);
    }
  }

  if (payload.articles.length === 0) {
    console.log('No articles found for the selected categories.');
  }

  if (payload.warnings.length > 0) {
    console.error(`\nWarnings: ${payload.warnings.length} feeds failed.`);
    for (const warning of payload.warnings) {
      console.error(`- ${warning.source}: ${warning.message}`);
    }
  }
}

async function executeList(options: ListCommandOptions): Promise<void> {
  configureRuntimeOptions(options);

  const limitPerFeed = options.limit
    ? parsePositiveIntegerOption(options.limit, '--limit')
    : 3;

  const dateChunks: LoadedDateChunk[] = [];

  if (options.date) {
    const dateOption = parseDateOption(options.date);
    const loaded = await loadNews({
      cacheDir: config.NEWSCLI_CACHE_DIR,
      dateKey: dateOption.dateKey,
      opmlPath: config.NEWSCLI_OPML_PATH,
      forceSync: Boolean(options.sync),
      limitPerFeed,
      cacheTtlMinutes: config.NEWSCLI_CACHE_TTL_MINUTES,
    });

    dateChunks.push({
      dateKey: dateOption.dateKey,
      fromCache: loaded.fromCache,
      updatedAt: loaded.updatedAt,
      categories: loaded.categories,
      articles: filterArticlesByDateKey(loaded.articles, dateOption.dateKey),
      warnings: loaded.warnings,
    });
  } else {
    const [todayDateKey, yesterdayDateKey] = defaultListDateKeys();
    const loadedToday = await loadNews({
      cacheDir: config.NEWSCLI_CACHE_DIR,
      dateKey: todayDateKey,
      opmlPath: config.NEWSCLI_OPML_PATH,
      forceSync: Boolean(options.sync),
      limitPerFeed,
      cacheTtlMinutes: config.NEWSCLI_CACHE_TTL_MINUTES,
    });

    dateChunks.push({
      dateKey: todayDateKey,
      fromCache: loadedToday.fromCache,
      updatedAt: loadedToday.updatedAt,
      categories: loadedToday.categories,
      articles: filterArticlesByDateKey(loadedToday.articles, todayDateKey),
      warnings: loadedToday.warnings,
    });

    try {
      const loadedYesterday = await loadNews({
        cacheDir: config.NEWSCLI_CACHE_DIR,
        dateKey: yesterdayDateKey,
        opmlPath: config.NEWSCLI_OPML_PATH,
        forceSync: false,
        limitPerFeed,
        cacheTtlMinutes: config.NEWSCLI_CACHE_TTL_MINUTES,
      });

      dateChunks.push({
        dateKey: yesterdayDateKey,
        fromCache: loadedYesterday.fromCache,
        updatedAt: loadedYesterday.updatedAt,
        categories: loadedYesterday.categories,
        articles: filterArticlesByDateKey(loadedYesterday.articles, yesterdayDateKey),
        warnings: loadedYesterday.warnings,
      });
    } catch (error) {
      if (!isNoCacheSnapshotError(error)) {
        throw error;
      }
    }
  }

  const dateLabel = dateChunks
    .map((chunk) => chunk.dateKey)
    .sort()
    .join(', ');
  const allCategories = mergeCategoriesInOrder(dateChunks);
  const allArticles = dateChunks.flatMap((chunk) => chunk.articles);
  const allWarnings = dateChunks.flatMap((chunk) => chunk.warnings);
  const fromCache = dateChunks.every((chunk) => chunk.fromCache);
  const updatedAt = resolveLatestUpdatedAt(dateChunks);

  const categoryFilters = resolveCategoryFilters(options);
  const categories = filterCategories(allCategories, categoryFilters);
  const articles = filterArticles(allArticles, categoryFilters);
  const warningFilters =
    categoryFilters.length === 0
      ? allWarnings
      : allWarnings.filter((warning) =>
          categoryFilters.some(
            (categoryFilter) => normalizeCategory(categoryFilter) === normalizeCategory(warning.category),
          ),
        );

  const jsonPayload = {
    fromCache,
    date: dateLabel,
    dateKeys: dateChunks.map((chunk) => chunk.dateKey).sort(),
    updatedAt,
    categories,
    articles,
    warnings: warningFilters,
  };

  if (options.json) {
    console.log(JSON.stringify(jsonPayload, null, 2));
    return;
  }

  printTextOutput({
    ...jsonPayload,
    dateKey: dateLabel,
    warnings: warningFilters.map((warning) => ({
      source: warning.source,
      message: warning.message,
    })),
    categoryFilters,
  });
}

async function executeSync(options: SyncCommandOptions): Promise<void> {
  configureRuntimeOptions(options);
  const todayDateKey = formatDateKey(new Date());

  const limitPerFeed = options.limit
    ? parsePositiveIntegerOption(options.limit, '--limit')
    : Number.MAX_SAFE_INTEGER;

  const loaded = await loadNews({
    cacheDir: config.NEWSCLI_CACHE_DIR,
    dateKey: todayDateKey,
    opmlPath: config.NEWSCLI_OPML_PATH,
    forceSync: true,
    limitPerFeed,
    cacheTtlMinutes: config.NEWSCLI_CACHE_TTL_MINUTES,
  });

  const summaryPayload = {
    date: todayDateKey,
    updatedAt: loaded.updatedAt,
    categories: loaded.categories,
    articleCount: loaded.articles.length,
    warningCount: loaded.warnings.length,
    cacheDir: config.NEWSCLI_CACHE_DIR,
  };

  if (options.json) {
    console.log(JSON.stringify(summaryPayload, null, 2));
    return;
  }

  console.log('Sync completed.');
  console.log(`Date: ${summaryPayload.date}`);
  console.log(`Updated: ${summaryPayload.updatedAt}`);
  console.log(`Categories: ${summaryPayload.categories.length}`);
  console.log(`Articles: ${summaryPayload.articleCount}`);
  console.log(`Cache dir: ${summaryPayload.cacheDir}`);

  if (loaded.warnings.length > 0) {
    console.error(`Warnings: ${loaded.warnings.length} feeds failed.`);
  }
}

function configureListLikeOptions(command: Command): Command {
  return command
    .option('--sync', 'Force refresh and ignore fresh cache')
    .option('-d, --date <yyyy-mm-dd>', 'Read cache snapshot for a specific date')
    .option('-c, --category <category>', 'Filter categories (comma separated)')
    .option('--japan', 'Shortcut for --category Japan')
    .option('--international', 'Shortcut for --category International')
    .option('--others', 'Shortcut for --category Others')
    .option('-l, --limit <number>', 'Number of items per feed (default: 3)')
    .option('-j, --json', 'Output as JSON')
    .option('--opml <path>', 'Override OPML feed file path')
    .option('--cache-dir <path>', 'Override cache directory')
    .option('--cache-ttl-minutes <minutes>', 'Cache freshness window in minutes');
}

function buildProgram(): Command {
  const program = new Command();

  program
    .name('news')
    .description('Global and Japan news CLI with OPML-based RSS feeds')
    .version('0.1.0');

  configureListLikeOptions(
    program.command('list', { isDefault: true })
      .alias('ls')
      .description('List news headlines from cache or RSS feeds'),
  ).action(async (options) => {
    await executeList(options as ListCommandOptions);
  });

  program
    .command('sync')
    .description('Refresh feed cache now')
    .option('-l, --limit <number>', 'Optional per-feed cap for sync (default: all items)')
    .option('-j, --json', 'Output as JSON')
    .option('--opml <path>', 'Override OPML feed file path')
    .option('--cache-dir <path>', 'Override cache directory')
    .option('--cache-ttl-minutes <minutes>', 'Cache freshness window in minutes')
    .action(async (options) => {
      await executeSync(options as SyncCommandOptions);
    });

  return program;
}

export async function runCli(argv: string[] = process.argv): Promise<void> {
  const program = buildProgram();
  await program.parseAsync(argv);
}

if (require.main === module) {
  runCli()
    .then(() => {
      process.exit(0);
    })
    .catch((error: unknown) => {
      if (error instanceof Error) {
        console.error(`Error: ${error.message}`);
      } else {
        console.error('Error:', error);
      }
      process.exit(1);
    });
}

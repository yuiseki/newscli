#!/usr/bin/env node
import path from 'path';
import { Command } from 'commander';
import { config, setConfigOverrides, type NewsCliConfig } from './config';
import { loadNews } from './news';
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
  const dateOption = parseDateOption(options.date);

  const limitPerFeed = options.limit
    ? parsePositiveIntegerOption(options.limit, '--limit')
    : 3;

  const loaded = await loadNews({
    cacheDir: config.NEWSCLI_CACHE_DIR,
    dateKey: dateOption.dateKey,
    opmlPath: config.NEWSCLI_OPML_PATH,
    forceSync: Boolean(options.sync),
    limitPerFeed,
    cacheTtlMinutes: config.NEWSCLI_CACHE_TTL_MINUTES,
  });

  const categoryFilters = resolveCategoryFilters(options);
  const categories = filterCategories(loaded.categories, categoryFilters);
  const articles = filterArticles(loaded.articles, categoryFilters);
  const warningFilters =
    categoryFilters.length === 0
      ? loaded.warnings
      : loaded.warnings.filter((warning) =>
          categoryFilters.some(
            (categoryFilter) => normalizeCategory(categoryFilter) === normalizeCategory(warning.category),
          ),
        );

  const jsonPayload = {
    fromCache: loaded.fromCache,
    date: dateOption.dateKey,
    updatedAt: loaded.updatedAt,
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
    dateKey: dateOption.dateKey,
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
    : 3;

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
    .option('-l, --limit <number>', 'Number of items per feed (default: 3)')
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

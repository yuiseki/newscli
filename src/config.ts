import dotenv from 'dotenv';
import os from 'os';
import path from 'path';
import { z } from 'zod';

dotenv.config({ quiet: true });

export type NewsCliConfig = {
  NEWSCLI_OPML_PATH: string;
  NEWSCLI_CACHE_DIR: string;
  NEWSCLI_CACHE_TTL_MINUTES: number;
};

const envSchema = z.object({
  NEWSCLI_OPML_PATH: z.string().optional(),
  NEWSCLI_CACHE_DIR: z.string().optional(),
  NEWSCLI_CACHE_TTL_MINUTES: z.string().optional(),
});

function defaultCacheDir(): string {
  const cacheBase = process.env.XDG_CACHE_HOME || path.join(os.homedir(), '.cache');
  return path.join(cacheBase, 'news');
}

function defaultOpmlPath(): string {
  return path.resolve(__dirname, '..', 'feeds.opml');
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  if (!/^\d+$/.test(value)) return fallback;

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) return fallback;

  return parsed;
}

function loadConfigFromEnv(): NewsCliConfig {
  const parsed = envSchema.parse({
    NEWSCLI_OPML_PATH: process.env.NEWSCLI_OPML_PATH,
    NEWSCLI_CACHE_DIR: process.env.NEWSCLI_CACHE_DIR,
    NEWSCLI_CACHE_TTL_MINUTES: process.env.NEWSCLI_CACHE_TTL_MINUTES,
  });

  return {
    NEWSCLI_OPML_PATH: parsed.NEWSCLI_OPML_PATH
      ? path.resolve(parsed.NEWSCLI_OPML_PATH)
      : defaultOpmlPath(),
    NEWSCLI_CACHE_DIR: parsed.NEWSCLI_CACHE_DIR
      ? path.resolve(parsed.NEWSCLI_CACHE_DIR)
      : defaultCacheDir(),
    NEWSCLI_CACHE_TTL_MINUTES: parsePositiveInteger(parsed.NEWSCLI_CACHE_TTL_MINUTES, 30),
  };
}

export let config = loadConfigFromEnv();

export function setConfigOverrides(overrides: Partial<NewsCliConfig>): void {
  config = {
    ...config,
    ...overrides,
  };
}

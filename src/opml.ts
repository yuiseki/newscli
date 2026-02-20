import fs from 'fs/promises';
import { parseStringPromise } from 'xml2js';
import { type FeedSource } from './types';

type OutlineNode = {
  $?: {
    text?: string;
    title?: string;
    xmlUrl?: string;
    type?: string;
  };
  outline?: OutlineNode[];
};

function normalizeText(value: string | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function getOutlineText(outline: OutlineNode): string | null {
  return normalizeText(outline.$?.text) ?? normalizeText(outline.$?.title);
}

export async function parseFeedSourcesFromOpmlString(
  opmlXml: string,
): Promise<{ sources: FeedSource[]; categories: string[] }> {
  const parsed = await parseStringPromise(opmlXml);
  const rootOutlines: OutlineNode[] = parsed?.opml?.body?.[0]?.outline ?? [];

  const categories: string[] = [];
  const categorySet = new Set<string>();
  const sources: FeedSource[] = [];

  for (const categoryOutline of rootOutlines) {
    const category = getOutlineText(categoryOutline);
    if (!category) continue;

    const categoryKey = category.toLowerCase();
    if (!categorySet.has(categoryKey)) {
      categorySet.add(categoryKey);
      categories.push(category);
    }

    const feedOutlines = Array.isArray(categoryOutline.outline) ? categoryOutline.outline : [];
    for (const feedOutline of feedOutlines) {
      const url = normalizeText(feedOutline.$?.xmlUrl);
      if (!url) continue;

      const name = getOutlineText(feedOutline) ?? url;
      sources.push({
        category,
        name,
        url,
      });
    }
  }

  if (sources.length === 0) {
    throw new Error('No RSS feed sources found in OPML file.');
  }

  return { sources, categories };
}

export async function readFeedSourcesFromOpml(
  opmlPath: string,
): Promise<{ sources: FeedSource[]; categories: string[] }> {
  const opmlXml = await fs.readFile(opmlPath, 'utf8');
  return parseFeedSourcesFromOpmlString(opmlXml);
}

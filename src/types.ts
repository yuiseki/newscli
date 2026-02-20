export type FeedSource = {
  category: string;
  name: string;
  url: string;
};

export type Article = {
  category: string;
  source: string;
  title: string;
  link: string;
  publishedAt?: string;
};

export type FetchWarning = {
  category: string;
  source: string;
  url: string;
  message: string;
};

export type NewsCache = {
  version: 1;
  snapshotDate?: string;
  opmlPath: string;
  limitPerFeed: number;
  updatedAt: string;
  categories: string[];
  articles: Article[];
};

export type LoadedNews = {
  fromCache: boolean;
  updatedAt: string;
  categories: string[];
  articles: Article[];
  warnings: FetchWarning[];
};

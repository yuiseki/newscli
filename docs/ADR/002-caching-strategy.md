# ADR 002: Cache Strategy and Storage Layout

## Status
Accepted

## Context
News feeds are remote resources, and repeated access should avoid unnecessary network calls.

## Decision
Use an XDG-style local cache with TTL-based freshness.

### 1. Cache root
- If `NEWSCLI_CACHE_DIR` is set:
  - `<NEWSCLI_CACHE_DIR>`
- Else if `XDG_CACHE_HOME` is set:
  - `<XDG_CACHE_HOME>/news`
- Otherwise:
  - `~/.cache/news`

### 2. Cache file
- Path: `<cache-root>/YYYY/MM/DD/news.json`
- Stored fields:
  - cache version
  - snapshot date
  - OPML path
  - per-feed limit
  - updated timestamp
  - categories
  - articles

### 3. Cache usage rules
- `news sync` stores:
  - today's primary snapshot at today's date path
  - additional snapshots partitioned by each article's `publishedAt` date
- `news sync` default behavior is uncapped per-feed ingestion (all items available in each RSS response).
- `news list --date YYYY-MM-DD` reads that date's snapshot.
- Default `news list` (without `--date`) reads yesterday and today snapshots.
- If yesterday snapshot is missing, default `news list` continues with today's snapshot only.
- Date reads are strict to the target day bucket: articles outside the target day are excluded.
- Articles with unknown/unparseable `publishedAt` are excluded from cache and output.
- For today's snapshot, TTL and option compatibility are checked:
  - `opmlPath` must match
  - cache `limitPerFeed` must be greater than or equal to requested `--limit`
- When reading cache with a larger `limitPerFeed`, output is trimmed per feed to the requested `--limit`.
- For past snapshots, cache is read-only and returned as-is.
- `--sync` is only supported for today.

## Consequences
- Stable repeated reads without network access within TTL.
- Past-date lookup works even when articles were fetched on a later sync date.
- Cache invalidates safely when input shape changes.

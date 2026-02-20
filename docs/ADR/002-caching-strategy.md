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
- `news sync` stores today's snapshot under today's date path.
- `news list --date YYYY-MM-DD` reads that day's snapshot.
- For today's snapshot, TTL and option compatibility (`opmlPath` / `limit`) are checked.
- For past snapshots, cache is read-only and returned as-is.
- `--sync` is only supported for today.

## Consequences
- Stable repeated reads without network access within TTL.
- Cache invalidates safely when input shape changes.

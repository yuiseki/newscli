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
  - `<XDG_CACHE_HOME>/newscli`
- Otherwise:
  - `~/.cache/newscli`

### 2. Cache file
- Path: `<cache-root>/news.json`
- Stored fields:
  - cache version
  - OPML path
  - per-feed limit
  - updated timestamp
  - categories
  - articles

### 3. Cache usage rules
- `newscli list` uses cache when all conditions are met:
  - TTL is valid
  - OPML path matches
  - per-feed limit matches
- `newscli --sync` and `newscli sync` always refresh cache.

## Consequences
- Stable repeated reads without network access within TTL.
- Cache invalidates safely when input shape changes.

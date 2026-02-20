# @yuiseki/newscli

Global and Japan news CLI with OPML-based RSS feeds and local cache.

## Install

```bash
npm i -g @yuiseki/newscli
```

Installed command:

- `news` (recommended)
- `newscli` (compatibility alias)

## Usage

```bash
news --help
```

### Main commands

- `news` / `news list` / `news ls`: list headlines (cache-first)
- `news sync`: fetch feeds now and refresh cache

Text output format example:
- `- [2026-02-21 08:13] [NHK ニュース] headline title`

### Options

- `--sync`: force refresh when listing
- `--date <yyyy-mm-dd>`: read a specific day snapshot from cache
- `--category <name>`: filter category (comma-separated)
- `--japan`, `--international`, `--others`: category shortcuts
- `--limit <number>`: max items per feed (default: `3`)
- `--json`: JSON output
- `--opml <path>`: override OPML file path
- `--cache-dir <path>`: override cache directory
- `--cache-ttl-minutes <minutes>`: cache TTL (default: `30`)

Examples:

```bash
news --japan
news ls --date 2026-02-20
news list --category International --limit 5
news sync --json
```

## Cache

Default cache directory:

- `$XDG_CACHE_HOME/news` if `XDG_CACHE_HOME` is set
- `~/.cache/news` otherwise

Cache file layout:

- `<cache-root>/YYYY/MM/DD/news.json`

Notes:

- `news sync` stores today's snapshot and also stores per-article `publishedAt` date snapshots.
- `news ls --date YYYY-MM-DD` reads that date's snapshot.
- Past date snapshots are cache-only (`--sync` is today-only).

## Development

```bash
npm install
npm run build
npm test
```

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

- `news` / `news list` / `news ls`: list headlines (cache-first, default range: yesterday + today)
- `news sync`: fetch feeds now and refresh cache (all available RSS items by default)

Text output format example:
- `- [2026-02-21 08:13] [NHK ニュース] headline title`

### Options

- `--sync`: force refresh when listing
- `--date <yyyy-mm-dd>`: read only that specific day snapshot
- `--category <name>`: filter category (comma-separated)
- `--japan`, `--international`, `--others`: category shortcuts
- `--limit <number>`: max items per feed for `news ls` (default: `3`)
- `--json`: JSON output
- `--opml <path>`: override OPML file path
- `--cache-dir <path>`: override cache directory
- `--cache-ttl-minutes <minutes>`: cache TTL (default: `30`)

Examples:

```bash
news ls
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
- `news sync` fetches all items by default. Use `news sync --limit <n>` only if you want to cap it.
- `news ls` default is yesterday + today. Use `--date` for a single day.
- `news ls --sync` (without `--date`) refreshes today, and reads yesterday from cache if available.
- If yesterday snapshot is missing, default `news ls` shows only today.
- `news ls --date YYYY-MM-DD` reads only that date bucket (older/newer articles are excluded).
- Articles without usable `publishedAt` are ignored.
- Past date snapshots are cache-only (`--sync` is today-only).
- JSON output includes `date` and `dateKeys` (`dateKeys` is one item for `--date`, two items for default range).

## Development

```bash
npm install
npm run build
npm test
```

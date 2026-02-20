# @yuiseki/newscli

Global and Japan news CLI with OPML-based RSS feeds and local cache.

## Install

```bash
npm i -g @yuiseki/newscli
```

## Usage

```bash
newscli --help
```

### Main commands

- `newscli` / `newscli list` / `newscli ls`: list headlines (cache-first)
- `newscli sync`: fetch feeds now and refresh cache

### Options

- `--sync`: force refresh when listing
- `--category <name>`: filter category (comma-separated)
- `--japan`, `--international`, `--others`: category shortcuts
- `--limit <number>`: max items per feed (default: `3`)
- `--json`: JSON output
- `--opml <path>`: override OPML file path
- `--cache-dir <path>`: override cache directory
- `--cache-ttl-minutes <minutes>`: cache TTL (default: `30`)

Examples:

```bash
newscli --japan
newscli list --category International --limit 5
newscli sync --json
```

## Cache

Default cache directory:

- `$XDG_CACHE_HOME/newscli` if `XDG_CACHE_HOME` is set
- `~/.cache/newscli` otherwise

Cache file:

- `news.json`

## Development

```bash
npm install
npm run build
npm test
```

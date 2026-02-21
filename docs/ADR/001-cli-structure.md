# ADR 001: CLI Structure and Commands

## Status
Accepted

## Context
The original implementation had all logic in a single file and relied on implicit flag parsing.

## Decision
Define a `commander`-based CLI with explicit commands and compatibility flags.

### 1. Root command
- Binary: `news` (`newscli` alias is kept for compatibility)
- Version: `news --version`

### 2. List command
- `news`
- `news list` (alias: `news ls`)
- Default date range (without `--date`): yesterday + today
- Options:
  - `--sync`
  - `--date <yyyy-mm-dd>`
  - `--category <name>`
  - `--japan` / `--international` / `--others`
  - `--limit <number>`
  - `--json`
  - `--opml <path>`
  - `--cache-dir <path>`
  - `--cache-ttl-minutes <minutes>`
- Behavior notes:
  - `--date` switches to single-day mode.
  - default `news ls --sync` refreshes today and reads yesterday from cache if available.

### 3. Sync command
- `news sync`
- Options:
  - `--limit <number>` (optional cap; default is uncapped/all available items)
  - `--json`
  - `--opml <path>`
  - `--cache-dir <path>`
  - `--cache-ttl-minutes <minutes>`

## Consequences
- Runtime behavior is explicit and testable.
- Legacy category shortcut flags continue to work.
- Output can be consumed as text or JSON (`dateKeys` is included in JSON list output).

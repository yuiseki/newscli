# ADR 001: CLI Structure and Commands

## Status
Accepted

## Context
The original implementation had all logic in a single file and relied on implicit flag parsing.

## Decision
Define a `commander`-based CLI with explicit commands and compatibility flags.

### 1. Root command
- Binary: `newscli`
- Version: `newscli --version`

### 2. List command
- `newscli`
- `newscli list` (alias: `newscli ls`)
- Options:
  - `--sync`
  - `--category <name>`
  - `--japan` / `--international` / `--others`
  - `--limit <number>`
  - `--json`
  - `--opml <path>`
  - `--cache-dir <path>`
  - `--cache-ttl-minutes <minutes>`

### 3. Sync command
- `newscli sync`
- Options:
  - `--limit <number>`
  - `--json`
  - `--opml <path>`
  - `--cache-dir <path>`
  - `--cache-ttl-minutes <minutes>`

## Consequences
- Runtime behavior is explicit and testable.
- Legacy category shortcut flags continue to work.
- Output can be consumed as text or JSON.

# Blueprint

> Design tool for coding agents.

AI-driven design tool where a coding agent generates HTML-based designs from user prompts. Users curate and iterate via a chat interface on an infinite canvas.

## Prerequisites

- [Bun](https://bun.sh/)
- [Claude CLI](https://docs.anthropic.com/en/docs/claude-code)

## Setup

```bash
bun install
```

## Usage

```bash
bun run dev
```

This starts both the Vite dev server and the backend server. To run them separately:

```bash
bun run dev:client   # Frontend only
bun run dev:server   # Backend only
```

## Build

```bash
bun run build
```

## Lint & Typecheck

```bash
bun run lint
bun run typecheck
```

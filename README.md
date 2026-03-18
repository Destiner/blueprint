# Blueprint

> Design tool for coding agents.

AI-driven design tool where a coding agent generates HTML-based designs from user prompts. Users curate and iterate via a chat interface on an infinite canvas.

Inspired by [Paper](https://paper.design).

https://github.com/user-attachments/assets/f356d017-dd43-40d9-abd9-5b432e969635

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

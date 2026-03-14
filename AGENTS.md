# Blueprint

AI-driven design tool where a coding agent generates HTML-based designs from user prompts. Users curate and iterate via a chat interface on an infinite canvas.

## Tech Stack

- **Framework**: Vue 3 (Composition API, `<script setup>`)
- **Language**: TypeScript (strict mode)
- **Build**: Vite
- **Package manager**: Bun
- **Routing**: Vue Router
- **Icons**: Phosphor Icons (`@phosphor-icons/vue`)

## Project Structure

```
src/
├── components/ # Reusable Vue components
├── pages/ # Route-level page components
├── App.vue # Root component
├── main.ts # Entry point
└── shims.d.ts # Type declarations
```

## Commands

```bash
bun run dev          # Start dev server
bun run build        # Production build
bun run lint         # Run all linters (prettier + eslint + stylelint)
bun run typecheck    # Type check (tsc + vue-tsc)
```

Fix linting issues:

```bash
bunx prettier --write "src/**/*.{json,js,ts,vue}"
bunx eslint --fix "src/**/*.{js,ts,vue}"
bunx stylelint --fix "src/**/*.{css,vue}"
```

## Code Conventions

- Explicit return types on all functions
- Single quotes, single attribute per line in templates
- CSS properties sorted by SMACSS order
- Import order enforced by eslint-plugin-import-x: builtin → external → internal → relative
- Path alias: `@/*` maps to `src/*`
- Keep comments minimal — only for non-obvious logic

## Architecture

- **Infinite Canvas** (`InfiniteCanvas.vue`): viewport with pan (mouse wheel) and zoom (Ctrl+wheel), dotted grid background, renders slotted content
- **Chat Sidebar** (`ChatSidebar.vue`): floating overlay (top-right, 360px), message feed with user/assistant roles, text input with send button
- **Home Page** (`Home.vue`): composes canvas + sidebar, canvas fills viewport

## Features

- Infinite canvas with pan/zoom
- Chat sidebar with message feed and input composer
- Dynamic HTML design rendering on canvas
- Design persistence via local storage
- Coding agent integration via CLI (Codex/Codey)
- Error handling with retry UX
- Design themes (color palettes, fonts)
- Element selection feedback on canvas
- HTML export

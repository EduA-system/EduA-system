# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

This is a monorepo with two top-level apps:

- `fe/` — Next.js frontend (the only code that currently exists).
- `be/` — backend. **Currently empty** (no code, no chosen stack yet). Confirm the language/framework with the user before scaffolding anything here.

There is no root-level build/test orchestration. Each app is developed independently from its own directory.

## Frontend (`fe/`)

Stack: **Next.js 16.2.6** (App Router), **React 19.2.4**, **Tailwind CSS v4**, **TypeScript (strict)**. The package is named `fe-edua-system`.

Commands (run from `fe/`):

```bash
npm run dev      # dev server at http://localhost:3000
npm run build    # production build
npm run start    # serve the production build
npm run lint     # eslint (flat config in eslint.config.mjs, extends eslint-config-next)
```

There is no test runner configured yet.

Conventions:
- App Router lives in `fe/app/` (`layout.tsx`, `page.tsx`, `globals.css`). Routes are folders under `app/`.
- Import alias: `@/*` maps to the `fe/` root (e.g. `@/app/...`).
- Tailwind v4 is wired through PostCSS (`@tailwindcss/postcss`), not a `tailwind.config.js`.
- Global styles in `app/globals.css`; fonts (Geist / Geist Mono) loaded via `next/font/google` in `app/layout.tsx`.

## Critical: Next.js 16 has breaking changes

Per `fe/AGENTS.md`: this Next.js version differs from older versions APIs, conventions, and file structure may not match prior training data. **Before writing frontend code, read the relevant guide in `fe/node_modules/next/dist/docs/`** and heed deprecation notices rather than relying on remembered Next.js patterns.

`fe/CLAUDE.md` simply re-exports `fe/AGENTS.md`, so this rule is the authoritative frontend instruction.

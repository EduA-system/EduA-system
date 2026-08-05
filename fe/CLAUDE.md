@AGENTS.md

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Frontend Stack

- **Next.js 16.2.6** (App Router), **React 19.2.4**, **TypeScript (strict)**
- **Tailwind CSS v4** via `@tailwindcss/postcss` — no `tailwind.config.js`
- **Package name:** `fe-edua-system`

## Commands (run from `fe/`)

```bash
npm run dev        # http://localhost:3000
npm run build      # production build
npm run lint       # eslint (flat config in eslint.config.mjs)
npm run typecheck  # tsc --noEmit
npm test           # vitest run (slide-editor/lib, lib/api, lib/slide-create, lib/slide-layout, simulations)
```

## Project Conventions

- **Routes:** `fe/app/` — folders under `app/` are routes; for the current route list and feature grouping see the "Frontend Architecture" section in the root `CLAUDE.md` (routes have grown well beyond lesson planning — classroom/exam workflows, blog/community, admin screens, etc.). Don't hardcode a route list here; it drifts fast — check `fe/app/` directly.
- **Import alias:** `@/*` maps to the `fe/` root.
- **Tailwind v4:** Utility classes only. No theme config file. Global styles in `app/globals.css`.
- **Fonts:** Inter (Google Fonts, Latin + Vietnamese subsets) + SVN-Linux Libertine (local TTF, weights 400/700, normal/italic). CSS variables: `--font-inter`, `--font-libertine`.
- **Language:** `<html lang="vi">`.
- **Components:** Shared components under `fe/components/`, organized by product area (see root `CLAUDE.md`).
- **Static assets:** `fe/public/` (dashboard icons in `dashboard/icons/`, home page assets in `home/`, screenshots at root).

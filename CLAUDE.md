# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**EDUA System** — An AI assistant system for educators. FPT University capstone project (SU26). A monorepo with two independently built/run apps. Project language is primarily Vietnamese (comments, docs, UI); code identifiers are in English.

## Repository Layout

```
├── fe/          Next.js 16 frontend (App Router, React 19, TypeScript strict, Tailwind v4)
├── be/          Spring Boot 3.4.5 backend (Java 21, Maven, PostgreSQL, Spring AI)
├── designs/     Architecture & API design documents
├── scripts/     start.ps1 — full-stack orchestrator (cloud-first DB, local Docker fallback)
├── requirements/ Feature requirement specs
├── sprints/     Sprint planning docs
├── .github/workflows/ci.yml  CI for frontend (Node 20/22/24 matrix)
└── .husky/pre-commit         Runs lint + typecheck + build on FE before every commit
```

No root-level build/test orchestration. Each app is developed independently from its own directory.

## Quick Reference — Commands

```bash
# Frontend (from fe/)
npm run dev          # dev server at http://localhost:3000
npm run build        # production build
npm run lint         # eslint (flat config)
npm run typecheck    # tsc --noEmit

# Backend (from be/)
mvnw.cmd spring-boot:run        # Windows
./mvnw spring-boot:run          # macOS/Linux
mvnw.cmd test                   # backend tests (Windows)
./mvnw test                     # backend tests (macOS/Linux)

# Full-stack start
pwsh scripts\start.ps1          # handles DB, BE, FE; flags: -SkipBe, -SkipFe

# Root
npm install                     # installs husky and activates Git hooks
```

## Frontend (`fe/`)

**Stack:** Next.js 16.2.6 (App Router), React 19.2.4, Tailwind CSS v4, TypeScript (strict).
**Package name:** `fe-edua-system`.

### Key Conventions
- **App Router** lives in `fe/app/`. Routes are folders under `app/`.
  - `/` → re-exports `fe/app/home/page.tsx`
  - `/home` → landing page (hero, ticker, video blocks)
  - `/lesson-create`, `/lesson-edit`, `/homepage`
- **Import alias:** `@/*` maps to the `fe/` root (e.g. `@/app/...`).
- **Tailwind v4** is wired through PostCSS (`@tailwindcss/postcss`), **not** a `tailwind.config.js`.
- **Fonts:** Inter (Google Fonts, Latin + Vietnamese) + SVN-Linux Libertine (local TTF). Loaded in `app/layout.tsx`.
- **Language:** `lang="vi"` on `<html>`.
- **Metadata:** title "EDUA", description "AI assistant system for educators".
- **Components:** Shared components under `fe/components/` (LessonEditor, dashboard, layout, ui).
- **Static assets:** `fe/public/` (dashboard icons, home page SVGs/videos, screenshots).

### Critical: Next.js 16 Has Breaking Changes

Per `fe/AGENTS.md`: this Next.js version differs from older versions — APIs, conventions, and file structure may not match prior training data. **Before writing frontend code, read the relevant guide in `fe/node_modules/next/dist/docs/`** and heed deprecation notices rather than relying on remembered Next.js patterns.

## Backend (`be/`)

**Stack:** Spring Boot 3.4.5, Java 21, Maven, PostgreSQL (Flyway migrations), Spring AI 1.0.0, SpringDoc OpenAPI 2.8.8, WebSocket (STOMP), AWS S3 SDK 2.26.12 (Cloudflare R2), Lombok.
**Base package:** `com.edua.beeduasystem`.

### Layered Architecture (Strictly Enforced)

Follow `designs/layered-architecture.md` and `.codex/skills/edua-backend-layered-architecture/SKILL.md`.

```
presentation/   → REST controllers, DTOs, exception advice
service/         → Use-case orchestration
domain/          → Core models, rules, domain exceptions
repository/      → Service-facing repository & gateway interfaces (ports)
infrastructure/  → JPA, AI adapters, storage (R2), external API, messaging (STOMP)
config/          → Spring configuration & bean wiring
```

**Dependency direction:** `presentation → service → domain`. Services depend on repository/gateway **interfaces**; infrastructure **implements** them.

**Rules:**
- **Constructor injection only.** No field injection.
- **Thin controllers:** receive request → call service → return response.
- **No HTTP concerns in services or domain.**

### Package Structure

```
com.edua.beeduasystem/
├── config/              OpenApiConfig, VirtualThreadExecutorConfig, WebSocketConfig
├── domain/model/        ApplicationHealth, textbook/TextbookCatalog
├── presentation/
│   ├── controller/      HealthController, TextbookController, UploadController
│   ├── dto/             HealthResponse, LessonPlan5512Dto, UploadResponse
│   └── advice/          GlobalExceptionHandler
├── service/             HealthService, TextbookService, UploadService
├── repository/
│   ├── repositories/    TextbookCatalogRepository (port interface)
│   └── gateways/        AiClient, StorageClient, LessonPlanStreamPort, LessonPlanEvent
└── infrastructure/
    ├── ai/              FallbackAiClient (OpenAI primary → DeepSeek fallback)
    ├── persistence/     JPA entities, repositories, seed data importer
    ├── storage/         R2StorageAdapter (Cloudflare R2)
    └── messaging/       StompLessonPlanStreamAdapter
```

### Key Features Implemented
- Textbook catalog CRUD (physics textbooks, chapters, lessons)
- File upload to Cloudflare R2
- Dual AI providers with fallback (OpenAI → DeepSeek)
- Lesson plan generation with real-time streaming via WebSocket/STOMP
- Health check (`/api/health`)
- Swagger UI at `/swagger-ui/index.html`

## CI & Git Hooks

- **CI** (`.github/workflows/ci.yml`): Frontend only — matrix build on Node 20/22/24. Steps: `npm ci → lint → typecheck → build`.
- **Pre-commit** (`.husky/pre-commit`): Runs `npm run lint && npm run typecheck && npm run build` in `fe/`.
- Before opening a PR, run the same FE checks plus `mvnw.cmd test` for backend changes.

## Commit Style

Short, imperative subjects. Use conventional commit prefixes:
- `feat(fe): add lesson editor component`
- `fix(be): handle null textbook response`
- `docs: update README with deploy instructions`

PRs should state which app changed (`fe` or `be`), summarize behavior changes, link related issues, and include screenshots for UI work.

## Environment

Secrets are managed via `.env` (see `.env.example` for template). The startup script (`scripts/start.ps1`) handles cloud-first DB with local Docker PostgreSQL fallback.

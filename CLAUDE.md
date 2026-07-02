# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

**EDUA System** is an AI assistant system for educators and an FPT University capstone project. The repository is a small monorepo with two independently built apps:

- `fe/`: educator-facing Next.js application.
- `be/`: Spring Boot API for textbook data, upload, lesson-plan generation, slide generation, AI integrations, storage, and streaming updates.

Project copy and documents are primarily Vietnamese. Code identifiers should stay in English.

## Repository Layout

```text
.
├── fe/                         Next.js 16 frontend
├── be/                         Spring Boot 3.4.5 backend
├── designs/                    Architecture, API, slide, prompt, and editor design docs
├── requirements/               Requirement specs
├── sprints/                    Sprint planning notes
├── scripts/start.ps1           Full-stack launcher with DB resolution
├── docker-compose.yml          Local PostgreSQL fallback
├── .github/workflows/ci.yml    Frontend CI
└── .husky/pre-commit           Frontend checks before commit
```

There is no root build orchestration beyond Husky setup. Work from `fe/` or `be/` for app-specific commands.

## Quick Commands

```bash
# Root
npm install

# Full stack from root
pwsh scripts/start.ps1
pwsh scripts/start.ps1 -SkipBe
pwsh scripts/start.ps1 -SkipFe

# Frontend from fe/
npm install
npm run dev
npm run lint
npm run typecheck
npm run build

# Backend from be/
./mvnw spring-boot:run
./mvnw test

# Windows backend commands from be/
mvnw.cmd spring-boot:run
mvnw.cmd test
```

## Frontend (`fe/`)

**Stack:** Next.js 16.2.6 App Router, React 19.2.4, TypeScript strict mode, Tailwind CSS v4, TipTap 3, STOMP, Zustand.

**Package name:** `fe-edua-system`.

### Critical Next.js Rule

This is Next.js 16, which has breaking changes compared with older remembered patterns. Before changing Next.js code, read the relevant guide in `fe/node_modules/next/dist/docs/` and respect deprecation notices. Also check `fe/AGENTS.md`.

### Frontend Structure

```text
fe/app/
├── page.tsx                    / re-exports the home experience
├── home/                       landing page blocks, hero media, ticker
├── homepage/                   dashboard/homepage route
├── help/                       help route
├── lesson-create/              lesson plan creation workspace
├── lesson-edit/                lesson editor route
├── slide-create/               slide creation flow
│   └── outline/                generated outline review route
└── slide-maker/                slide editor/maker route

fe/components/
├── LessonEditor/
├── dashboard/
├── layout/
├── lesson-plan/
├── outline-editor/
├── slide-editor/
├── slide-maker/
└── ui/
```

### Frontend Conventions

- `@/*` maps to the `fe/` root.
- Tailwind v4 is wired through PostCSS (`@tailwindcss/postcss`), not `tailwind.config.js`.
- Global styles live in `fe/app/globals.css`.
- Fonts are configured in `fe/app/layout.tsx`: Inter plus local SVN-Linux Libertine files from `fe/app/fonts/`.
- HTML language is Vietnamese: `<html lang="vi">`.
- Static assets live in `fe/public/`, including dashboard icons, home media, screenshots, and slide assets.
- Keep route folders lowercase and React component files PascalCase.
- No frontend test runner is configured yet; quality gates are lint, typecheck, and build.

## Backend (`be/`)

**Stack:** Spring Boot 3.4.5, Java 21, Maven, PostgreSQL, Flyway, Spring AI 1.0.0, SpringDoc OpenAPI 2.8.8, WebSocket/STOMP, AWS S3 SDK 2.26.12 for Cloudflare R2, Lombok, Jsoup.

**Base package:** `com.edua.beeduasystem`.

### Layered Architecture

Follow `designs/layered-architecture.md` and `.codex/skills/edua-backend-layered-architecture/SKILL.md`.

```text
presentation/    REST controllers, DTOs, exception advice
service/         Use-case orchestration, prompt builders, parsers, validators
domain/          Core models, rules, domain exceptions
repository/      Service-facing repository and gateway interfaces
infrastructure/  JPA, AI adapters, storage adapters, messaging/STOMP
config/          Spring configuration and bean wiring
```

Dependency direction:

```text
presentation -> service -> domain
service -> repository interfaces
infrastructure -> repository/gateway interfaces and domain
config -> wiring only
```

Rules:

- Use constructor injection only.
- Keep controllers thin: receive request, call service, return response.
- Keep HTTP status, request, and response concerns out of service/domain code.
- Services depend on interfaces in `repository/`; infrastructure implements those interfaces.

### Backend Package Snapshot

```text
com.edua.beeduasystem/
├── config/                    CORS, OpenAPI, virtual threads, WebSocket
├── domain/model/              health, lesson context, slide models, textbook catalog
├── presentation/
│   ├── advice/                GlobalExceptionHandler
│   ├── controller/            Health, Textbook, Upload, Slide, SlideDesign
│   └── dto/                   health, lesson plan, slide, slide design, upload DTOs
├── service/
│   ├── slidedesign/           HTML slide design generation
│   ├── slides/                outline and slide deck generation
│   ├── textbook/              textbook catalog use cases
│   └── upload/                upload use cases
├── repository/
│   ├── gateways/              AiClient, StorageClient, stream ports/events, diagnostics
│   └── repositories/          TextbookCatalogRepository
└── infrastructure/
    ├── ai/                    OpenAI, DeepSeek, fallback AI client
    ├── messaging/             STOMP stream adapters and diagnostics bridge
    ├── persistence/           JPA entities, repositories, textbook importer
    └── storage/               Cloudflare R2 adapter and config
```

### Backend Features

- Health check at `/api/health`.
- Swagger UI at `/swagger-ui/index.html`.
- Textbook catalog backed by PostgreSQL/Flyway and seeded resource data.
- File upload to Cloudflare R2.
- AI provider abstraction with OpenAI primary and DeepSeek fallback.
- Lesson plan and slide generation workflows with STOMP streaming events.
- Slide HTML design generation and post-processing.

## Environment

Copy `.env.example` to `.env` for local development.

Important variables:

- PostgreSQL: `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, plus Docker fallback values `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_PORT`.
- OpenAI: `APP_AI_OPENAI_API_KEY`, optional base URL and default model.
- DeepSeek: `APP_AI_DEEPSEEK_API_KEY`, optional base URL and default model.
- Cloudflare R2: `APP_R2_ENDPOINT`, `APP_R2_ACCESS_KEY_ID`, `APP_R2_SECRET_ACCESS_KEY`, `APP_R2_BUCKET`, `APP_R2_PUBLIC_URL`.

`scripts/start.ps1` loads `.env`, checks ports 8080 and 3000, resolves cloud DB versus Docker PostgreSQL fallback, starts the backend, waits for `/api/health`, and then starts the frontend.

## CI, Hooks, and Validation

- CI runs frontend checks on Node 20, 22, and 24: `npm ci`, `npm run lint`, `npm run typecheck`, `npm run build`.
- Husky pre-commit runs the same frontend lint/typecheck/build sequence from `fe/`.
- Run backend tests with `./mvnw test` or `mvnw.cmd test` when backend code changes.

## Working Rules

- Keep changes scoped to the requested feature or fix.
- Prefer existing project patterns over new abstractions.
- Do not move code across layers to make a quick import work; keep the backend dependency direction intact.
- Use Vietnamese copy for user-facing text where the surrounding UI uses Vietnamese.
- Keep secrets out of the repository.

## Commit Style

Use short, imperative subjects. Conventional prefixes are welcome:

```text
feat(fe): add slide outline editor
fix(be): handle upload failure
docs: refresh agent guide
chore: update husky setup
```

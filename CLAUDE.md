# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**EDUA System** is an AI assistant system for educators and an FPT University capstone project. The repository is a small monorepo with two independently built apps:

- `fe/`: educator-facing Next.js application.
- `be/`: Spring Boot API for textbook data, authentication, library content, blog/community features, lesson-plan generation, slide generation, molecule generation, uploads, and streaming updates.

Project copy and documents are primarily Vietnamese. Code identifiers should stay in English.

For Iter3 work, keep the docs synchronized with the code. The canonical status file is `WBS_CHECKLIST.md` (verified against actual code reality, not just the raw WBS tracker status).

## Repository Layout

```text
.
├── fe/                         Next.js 16 frontend
├── be/                         Spring Boot 3.4.5 backend
├── designs/                    Architecture, API, slide, prompt, and editor design docs
├── requirements/               Requirement specs
├── sprints/                    Sprint planning notes
├── plans/                      Working implementation plans
├── WBS_CHECKLIST.md            Canonical code-vs-WBS status (Iter1–3)
├── UNIT_TEST_CHECKLIST.md      Test coverage plan
├── TEST_FUNCTION_INVENTORY.md  Per-function test inventory
├── scripts/start.ps1           Full-stack launcher with DB resolution
├── docker-compose.yml          Local PostgreSQL fallback
├── .github/workflows/ci.yml    Frontend CI
└── .husky/pre-commit           Frontend checks before commit
```

There is no root build orchestration beyond Husky setup. Work from `fe/` or `be/` for app-specific commands.

`AGENTS.md` (root) and `fe/AGENTS.md` also exist for other agent tools. The root `AGENTS.md` has drifted: it names `ITER3_CODE_CHECKLIST.md` (renamed to `WBS_CHECKLIST.md`), says no frontend test runner is configured (Vitest is), and says backend tests are named `*Tests.java` only (both `*Test.java` and `*Tests.java` are in use). Where the two disagree, this file is current.

## Common Commands

```bash
# Root
npm install                     # installs Husky only
pwsh scripts/start.ps1          # start backend + frontend, auto-resolving cloud DB vs local Docker Postgres
pwsh scripts/start.ps1 -SkipBe
pwsh scripts/start.ps1 -SkipFe

# Frontend from fe/
npm install
npm run dev
npm run lint
npm run typecheck
npm run build
npm test                        # Vitest; see the include list in fe/vitest.config.ts
npm test -- lib/slide-layout/engine.test.ts
npm run test:watch
npm run audit:periodic-table    # node scripts/audit-periodic-table.mjs
npm run sync:periodic-table     # node scripts/sync-periodic-table-data.mjs

# Backend from be/
./mvnw spring-boot:run
./mvnw test
./mvnw test -Dtest=GenerateSlideOutlineUseCaseTest
./mvnw test -Dtest=GenerateSlideOutlineUseCaseTest#methodName

# Windows backend commands from be/
mvnw.cmd spring-boot:run
mvnw.cmd test
mvnw.cmd test -Dtest=GenerateSlideOutlineUseCaseTest
```

Backend test classes live under `be/src/test/java/com/edua/beeduasystem/` and are a mix of `*Test.java` and `*Tests.java` — match the sibling files in whatever package you're adding to.

## Frontend (`fe/`)

**Stack:** Next.js 16.2.6 App Router, React 19.2.4, TypeScript strict mode, Tailwind CSS v4, TipTap 3, STOMP, Zustand, Vitest, Three.js / React Three Fiber.

**Package name:** `fe-edua-system`.

### Critical Next.js Rule

This is Next.js 16, which has breaking changes compared with older remembered patterns. Before changing Next.js code, read the relevant guide in `fe/node_modules/next/dist/docs/` and respect deprecation notices. Also check `fe/AGENTS.md`.

### Frontend Architecture

- `fe/app/` uses the App Router. `app/page.tsx` re-exports the landing page. Routes group into lesson planning (`lesson-create`, `lesson-edit`, `lesson-plan-approval`), slides (`slide-create`, `slide-maker`, `slide-present`, `slide-layout-gallery`), classroom/exam/weekly-task workflows (`class-detail`, `create-class`, `list-class`, `add-student`, `class-resource-*`, `exam-*-new`, `weekly-schedule`, `weekly-task-document`), content/community (`blog`, `blog-moderator`, `community-hub`, `hub-moderation`, `library`, `detail-resource`, `molecules`, `periodic-table`, `mo-phong-vat-ly`), and account/admin (`dashboard`, `user-profile`, `user-management`, `it-staff`, `login`, `auth-debug`). The route set grows often — read `fe/app/` rather than trusting a list.
- `/sandbox` (and `/sandbox/[id]`) is a developer-facing library that compiles simulation source in-browser with Sandpack. Its file-collection and CSS-injection helpers are in `fe/lib/sandbox/`.
- `fe/components/` is organized by product area rather than by primitive type: `LessonEditor`, `lesson-plan`, `outline-editor`, `slide-editor`, `slide-maker`, `slide-presentation`, `blog`, `classroom`, `dashboard`, `hub`, `molecules`, `periodic-table`, `simulations`, `layout`, and shared `ui` components.
- Most frontend API calls go through same-origin `/api/*`, which Next rewrites to the backend via `fe/next.config.ts`. This avoids CORS for standard REST calls.
- Slide generation/design clients are a separate path: `fe/lib/api/slides.ts` and `fe/lib/api/slide-design.ts` call the backend directly via `NEXT_PUBLIC_API_URL` instead of the Next rewrite.
- Real-time generation flows use raw STOMP over WebSocket, not SockJS. Frontend clients in `fe/lib/ws/` connect to `NEXT_PUBLIC_WS_URL` (default `ws://localhost:8080`) and pass the JWT in the STOMP `CONNECT` headers.
- Rich lesson and blog editing is built on TipTap. The lesson editor extends TipTap with custom nodes/extensions in `fe/components/LessonEditor/` for streaming-generated pending sections and activities.
- Slide editing and rendering logic is concentrated under `fe/components/slide-editor/`, with conversion helpers for backend HTML/design output under `fe/components/slide-editor/lib/`.
- Physics simulations live under `fe/components/simulations/`, one folder per experiment plus shared `presets/`, `renderers/`, and `engines/`; `HUONG_DAN_THEM_THI_NGHIEM.md` there documents how to add a new experiment.
- Vitest runs in a Node environment (no DOM/React), so only pure-TS logic is testable: simulation kernels, `components/slide-editor/lib/`, several `components/LessonEditor/` helpers, `lib/api/`, `lib/slide-create/`, `lib/slide-layout/`, and the practice-exam-math / slide-deck-library / slide-html-export helpers. `fe/vitest.config.ts` lists the exact includes — add new test files there or they will not run.
- Lightweight client state uses Zustand stores such as `fe/stores/slide-editor-store.ts`.

### Frontend Conventions

- `@/*` maps to the `fe/` root.
- Tailwind v4 is wired through PostCSS (`@tailwindcss/postcss`), not `tailwind.config.js`.
- Global styles live in `fe/app/globals.css`.
- Fonts are configured in `fe/app/layout.tsx`: Inter plus local SVN-Linux Libertine files from `fe/app/fonts/`.
- HTML language is Vietnamese: `<html lang="vi">`.
- Static assets live in `fe/public/`.
- Keep route folders lowercase and React component files PascalCase.
- Frontend quality gates in CI and Husky are `lint`, `typecheck`, and `build`; Vitest exists but is not part of CI yet.

## Backend (`be/`)

**Stack:** Spring Boot 3.4.5, Java 21, Maven, PostgreSQL, Flyway, Spring AI 1.0.0, Spring Security, SpringDoc OpenAPI 2.8.8, WebSocket/STOMP, AWS S3 SDK 2.26.12 for Cloudflare R2, Lombok, Jsoup.

**Base package:** `com.edua.beeduasystem`.

### Layered Architecture

Follow `designs/layered-architecture.md`.

```text
presentation/    REST controllers, DTOs, exception advice
service/         Use-case orchestration, prompt builders, parsers, sanitizers, validators
domain/          Core models, rules, domain exceptions
repository/      Service-facing repository and gateway interfaces
infrastructure/  JPA, AI adapters, storage adapters, security, messaging/STOMP
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

### Backend Architecture

- The backend is feature-oriented inside the service layer: current areas are `activitylog`, `ai`, `auth`, `blog`, `classroom`, `lessonplan`, `library`, `molecule`, `notification`, `physicssimulation`, `practiceexam`, `slidedesign`, `slides`, `textbook`, `upload`, and `weeklytask`.
- Persistence is PostgreSQL + Flyway, `be/src/main/resources/db/migration/` (currently through `V39`). Coverage spans textbook catalog, auth, roles/user roles, account-management audit, blog (comments/replies/thumbnails/soft-hide), library content, classroom membership, weekly tasks/submissions/grades, notification targets, and user profile fields. Migrations are append-only: never edit an applied `V*` file — the shared Supabase DB runs with checksum validation on.
- Authentication is stateless JWT. Google sign-in starts in the frontend, then backend auth endpoints issue/refresh tokens. Request auth is enforced by `JwtAuthenticationFilter`, and role checks are done with method security.
- WebSocket streaming is part of the main architecture, not a side feature. Spring exposes a raw STOMP endpoint at `/ws`; JWT is validated on STOMP `CONNECT` via `StompAuthChannelInterceptor`; lesson-plan, outline, and notification flows publish progress/events through stream port interfaces (`LessonPlanStreamPort`, `OutlineStreamPort`, `NotificationStreamPort`) and STOMP adapters.
- AI access is abstracted behind `repository/gateways/AiClient`. `infrastructure/ai/config/AiClientConfig.java` wires a `FallbackAiClient` that tries the OpenAI adapter first (vision-capable) and falls back to DeepSeek; a separate `jsonAiClient` bean forces OpenAI's `json_object` response format for prompts that always request JSON (not safe for HTML-generating prompts).
- Storage abstractions live behind repository gateways as well. Upload flows go through `StorageClient`, with the current implementation targeting Cloudflare R2.
- The backend serves both synchronous REST flows and asynchronous generation pipelines. Prompt builders, HTML extractors, and output post-processing are part of the service layer rather than controllers.

### Backend Package Snapshot

```text
com.edua.beeduasystem/
├── config/                    CORS, OpenAPI, security, virtual threads, WebSocket
├── domain/                    core models and domain exceptions
├── presentation/              controllers, DTOs, exception advice
├── service/                   feature use cases and generation pipelines
├── repository/
│   ├── gateways/              AiClient, StorageClient, TokenService, stream ports, identity verifier
│   └── repositories/          service-facing persistence interfaces
└── infrastructure/
    ├── ai/                    provider adapters, fallback client, Spring AI config
    ├── logging/               request logging filters
    ├── messaging/             STOMP stream adapters
    ├── persistence/           JPA entities, repositories, adapters, importers
    ├── security/              JWT, Google token verification, STOMP auth, rate limiting
    └── storage/               Cloudflare R2 adapter and config
```

## Environment

Copy `.env.example` to `.env` for local development.

Important variables:

- PostgreSQL: `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, plus Docker fallback values `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_PORT`.
- Frontend/backend routing: `BACKEND_URL` for Next rewrite target, `NEXT_PUBLIC_API_URL` for direct slide/slide-design HTTP calls, `NEXT_PUBLIC_WS_URL` for STOMP WebSocket clients.
- OpenAI: `APP_AI_OPENAI_API_KEY`, optional base URL and default model.
- DeepSeek: `APP_AI_DEEPSEEK_API_KEY`, optional base URL and default model.
- Cloudflare R2: `APP_R2_ENDPOINT`, `APP_R2_ACCESS_KEY_ID`, `APP_R2_SECRET_ACCESS_KEY`, `APP_R2_BUCKET`, `APP_R2_PUBLIC_URL`.
- Auth/rate limiting: JWT and Google auth settings are read from Spring properties/environment; see `be/src/main/java/com/edua/beeduasystem/config/SecurityConfig.java` and the auth/security infrastructure package when changing auth flows.

`scripts/start.ps1` loads `.env`, checks ports 8080 and 3000, prompts to free occupied ports, resolves cloud DB versus Docker PostgreSQL fallback, starts the backend, waits for `/api/health`, and then starts the frontend. It also forces `SPRING_FLYWAY_BASELINE_ON_MIGRATE=false` and `SPRING_FLYWAY_VALIDATE_ON_MIGRATE=true` on every launch, overriding the more permissive defaults in `application.properties` (`baseline-on-migrate=true`, `validate-on-migrate=false`), so schema drift on `DB_URL` (a shared Supabase DB) fails the startup loudly instead of Flyway silently auto-baselining or skipping checksum validation.

If a DB schema change is needed (new migration, or fixing drift on the shared DB), write and run that migration/fix as its own deliberate step first, then start the backend — never rely on backend startup to apply or repair a schema change for you, and never add auto-repair logic to `scripts/start.ps1`.

A deployed backend is documented in `README.md` at `http://q0k0k4c0ss00cc4004k4okss.103.72.56.152.sslip.io` (Swagger UI at `/swagger-ui/index.html`, health at `/api/health`) for trying live API responses without running the stack locally.

## CI, Hooks, and Validation

- CI runs frontend checks on Node 20, 22, and 24: `npm ci`, `npm run lint`, `npm run typecheck`, `npm run build`.
- Husky pre-commit runs the same frontend lint/typecheck/build sequence from `fe/`.
- Run backend tests with `./mvnw test` or `mvnw.cmd test` when backend code changes.
- Run `npm test` in `fe/` when changing slide-editor conversion logic, slide-create helpers, slide-layout engine, or physics simulation code; that Vitest suite is currently separate from CI.

## Working Rules

- Keep changes scoped to the requested feature or fix.
- Prefer existing project patterns over new abstractions.
- Do not move code across layers to make a quick import work; keep the backend dependency direction intact.
- Use Vietnamese copy for user-facing text where the surrounding UI uses Vietnamese.
- Keep secrets out of the repository.
- After Iter3 code changes, update `WBS_CHECKLIST.md` and any affected `designs/` docs in the same pass.
- In repo-facing docs, use `Principal` for school-level account management and `IT Staff` for prompt/system-prompt management and activity/audit log review.
- Never let the backend auto-repair the database on startup (no Flyway auto-baseline, no ad-hoc repair SQL run on your own initiative). If the DB needs a schema change or drift fix, run that command explicitly and deliberately *before* starting the backend, and only after confirming the exact fix with the user for anything touching the shared Supabase DB.

## Commit Style

Use short, imperative subjects. Conventional prefixes are welcome:

```text
feat(fe): add slide outline editor
fix(be): handle upload failure
docs: refresh agent guide
chore: update husky setup
```

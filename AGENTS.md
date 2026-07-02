# Repository Guidelines

## Project Structure & Module Organization
This repository is the EDUA monorepo with two independent apps:

- `fe/`: Next.js 16 frontend using App Router, React 19, TypeScript strict mode, Tailwind CSS v4, TipTap, STOMP, and Zustand. Routes live in `fe/app/`, shared UI/editor components live in `fe/components/`, and static assets live in `fe/public/`.
- `be/`: Spring Boot 3.4.5 backend using Java 21, Maven, PostgreSQL, Flyway, Spring AI, WebSocket/STOMP, SpringDoc OpenAPI, Cloudflare R2 through the S3 SDK, Lombok, and Jsoup.
- `designs/`: architecture, API, prompt-security, slide-generation, and slide-editor design notes.
- `requirements/` and `sprints/`: product requirements and sprint planning notes.
- `scripts/start.ps1`: full-stack launcher. It loads `.env`, resolves cloud PostgreSQL versus Docker fallback, starts backend, then starts frontend.
- `.github/workflows/ci.yml`: frontend CI on Node 20, 22, and 24.
- `.husky/pre-commit`: frontend lint, typecheck, and build before commits.

## Build, Test, and Development Commands
Run commands from the app directory unless noted otherwise.

- Root setup: `npm install` installs Husky and activates Git hooks.
- Full stack: `pwsh scripts/start.ps1`; add `-SkipBe` or `-SkipFe` to run only one side.
- Frontend setup: `cd fe && npm install`.
- Frontend dev: `cd fe && npm run dev` at `http://localhost:3000`.
- Frontend checks: `cd fe && npm run lint`, `npm run typecheck`, `npm run build`.
- Backend dev: `cd be && mvnw.cmd spring-boot:run` on Windows, or `cd be && ./mvnw spring-boot:run` on macOS/Linux.
- Backend tests: `cd be && mvnw.cmd test` on Windows, or `cd be && ./mvnw test` on macOS/Linux.
- Local PostgreSQL fallback: `docker compose up -d postgres`.

## Frontend Conventions
Check `fe/AGENTS.md` before editing frontend code. This project uses Next.js 16, which has breaking changes from older Next.js versions. Read the relevant guide in `fe/node_modules/next/dist/docs/` before writing Next.js code.

- Main routes: `/`, `/home`, `/homepage`, `/help`, `/lesson-create`, `/lesson-edit`, `/slide-create`, `/slide-create/outline`, and `/slide-maker`.
- Shared component areas: `components/LessonEditor`, `components/lesson-plan`, `components/outline-editor`, `components/slide-editor`, `components/slide-maker`, `components/dashboard`, `components/layout`, and `components/ui`.
- Use `@/*` imports from the `fe/` root.
- Tailwind v4 is configured through PostCSS (`@tailwindcss/postcss`); do not add `tailwind.config.js` unless the project intentionally changes that setup.
- Keep React component files PascalCase and route folders lowercase.
- User-facing UI copy is primarily Vietnamese. Keep code identifiers in English.

## Backend Layered Architecture Workflow
For backend changes under `be/`, follow `designs/layered-architecture.md` and `.codex/skills/edua-backend-layered-architecture/SKILL.md`.

- Put REST controllers, request/response DTOs, and exception advice in `presentation/`.
- Put use-case orchestration in `service/`.
- Put core models, rules, and domain exceptions in `domain/`.
- Put service-facing repository or gateway interfaces in `repository/`.
- Put JPA, AI, storage, external API, and messaging implementations in `infrastructure/`.
- Put Spring configuration and bean wiring in `config/`.
- Keep dependency direction as `presentation -> service -> domain`, with services depending on repository/gateway interfaces and infrastructure implementing them.
- Use constructor injection. Do not use field injection.
- Keep controllers thin: receive request, call service, return response.
- Keep HTTP concerns out of services and domain.

## Coding Style & Naming Conventions
- Frontend uses TypeScript strict checking, 2-space indentation, ESLint flat config, and Next.js conventions.
- Backend uses base package `com.edua.beeduasystem`; class names are PascalCase and package names are lowercase.
- Keep changes surgical and avoid unrelated refactors.
- Prefer existing local helpers, component patterns, DTO style, and service/gateway boundaries over new abstractions.

## Testing Guidelines
- Frontend quality is enforced through lint, typecheck, and production build; no frontend test runner is configured yet.
- Backend tests use Spring Boot test support with JUnit 5. Place tests under `be/src/test/java/` and name them `*Tests.java`.
- Run frontend checks for frontend changes and backend tests for backend changes.
- Before opening a PR, run the same frontend checks as Husky and CI; include backend tests when backend code changed.

## Environment
- Copy `.env.example` to `.env` and fill DB, AI provider, and Cloudflare R2 secrets.
- `application.properties` reads `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `APP_AI_OPENAI_*`, `APP_AI_DEEPSEEK_*`, and `APP_R2_*`.
- Backend health check: `/api/health`.
- Swagger UI: `/swagger-ui/index.html`.

## Commit & Pull Request Guidelines
- Use short, imperative commit subjects. Conventional prefixes are fine, for example `feat(fe): add slide outline editor`, `fix(be): handle upload failure`, or `docs: refresh agent guide`.
- Keep commits focused on one change.
- PRs should state which app changed (`fe`, `be`, or both), summarize behavior changes, link the related issue if any, and include screenshots for UI work.

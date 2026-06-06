# Repository Guidelines

## Project Structure & Module Organization
This repository is a small monorepo with two independent apps:

- `fe/`: Next.js 16 frontend using the App Router, React 19, TypeScript, and Tailwind v4. Main routes live in `fe/app/`, shared UI for the home page is under `fe/app/home/`, and static assets live in `fe/public/`.
- `be/`: Spring Boot backend. Java sources live in `be/src/main/java/`, configuration is in `be/src/main/resources/application.properties`, and tests live in `be/src/test/java/`.
- `.github/workflows/ci.yml` defines CI for the frontend, and `.husky/pre-commit` runs local checks before each commit.

## Build, Test, and Development Commands
Run commands from the app directory unless noted otherwise.

- Root: `npm install` installs Husky and activates Git hooks.
- Frontend: `cd fe && npm install`
- Frontend dev: `cd fe && npm run dev`
- Frontend checks: `cd fe && npm run lint`, `npm run typecheck`, `npm run build`
- Backend dev: `cd be && mvnw.cmd spring-boot:run` on Windows, or `./mvnw spring-boot:run` on macOS/Linux
- Backend tests: `cd be && mvnw.cmd test` on Windows, or `./mvnw test`

## Coding Style & Naming Conventions
Match the existing style in each app.

- Frontend uses TypeScript with strict checking, 2-space indentation, and Next.js ESLint presets from `fe/eslint.config.mjs`.
- Keep React components in PascalCase files such as `TitleTicker.tsx`; use lowercase route folders such as `app/home/`.
- Backend uses standard Spring Boot structure under `com.edua.beeduasystem`; keep class names PascalCase and package names lowercase.

## Testing Guidelines
Frontend quality is enforced through lint, type-check, and production build; there is no separate FE test suite yet. Backend tests use Spring Boot’s test support with JUnit 5. Place backend tests under `be/src/test/java/` and name them `*Tests.java`. Before opening a PR, run the same FE checks as Husky and CI, plus `mvnw.cmd test` for backend changes.

## Commit & Pull Request Guidelines
Recent commits use short, imperative subjects such as `Add husky pre-commit hook and root README` and `init BE`. Keep commits focused and descriptive. PRs should state which app changed (`fe` or `be`), summarize behavior changes, link the related issue if there is one, and include screenshots for UI work.

## Agent-Specific Notes
Check `fe/AGENTS.md` before editing frontend code; it notes project-specific Next.js constraints. Keep changes surgical and avoid unrelated refactors.

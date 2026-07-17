# Iteration 2 Completion Checklist

## 1. Stabilize the foundation

- [ ] Fix `be/mvnw.cmd` so `mvnw.cmd test` runs successfully.
- [ ] Run the backend test suite and retain the resulting test report.
- [ ] Add focused tests for `LibraryContentService`, blog flows, and molecule APIs.
- [ ] Verify `.env` contains the required database, Google OAuth, AI provider, and R2 settings for a local demo.
- [x] Run frontend checks: `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` from `fe/` (validated for presentation mode and HTML export on 2026-07-17; existing lint warnings remain outside this flow).

## 2. Finish partially implemented features

### Personal Library (core persistence implemented)

- [x] Persist lesson plans, slide decks, and saved molecule simulations in PostgreSQL.
- [x] Provide owner-scoped create, list/search, detail, update, and soft-delete APIs.
- [x] Provide the `/library` screen with filtering, search, open, rename, and delete actions.
- [x] Save and reopen lesson-plan and slide-deck edits through the library API.
- [ ] Add focused service/controller tests for the library flow (also tracked in section 1).
- [ ] Persist customized Physics Hub simulations after that feature exists.
- [ ] Add a separate shared Simulation & Asset Library with authoring pickers.

### RBAC

- [ ] Add frontend route guards for Teacher, Moderator, and Admin roles.
- [ ] Verify direct navigation to protected URLs is blocked for unauthorized users.

### Molecule models

- [ ] Add a 2D molecule rendering mode.
- [ ] Allow a molecule model to be embedded into a lesson plan or slide.

### Periodic table

- [ ] Add an action to insert an element or periodic-table view into a lesson plan or slide.

### Physics simulation hub

- [ ] Replace the mock AI customization flow with a backend API, or explicitly remove it from the Iteration 2 scope.
- [ ] Persist customized simulations in Personal Library.

### Blog

- [ ] Add an edit-post UI that calls `PATCH /api/blog-posts/{id}`.
- [ ] Decide whether guest post preview belongs to Iteration 2 or is deferred to Iteration 3.

## 3. Implement currently missing Iteration 2 features

- [ ] Export lesson plan: implement one format first, preferably PDF.
- [x] Export slide deck: generate a self-contained offline HTML file with presenter controls, inline CSS, and embedded assets where available.
- [x] Presentation mode: add the `/slide-present` route with previous, next, keyboard navigation, slide selection, fullscreen, and exit controls.
- [ ] Click-to-simulate: open an embedded simulation while presenting a slide.
- [ ] Chemistry virtual lab: define the approved textbook reaction dataset, then implement API, UI, and simulation engine.
- [ ] Shared simulation and asset library: define the asset model and provide a picker for lessons and slides.
- [ ] Test/exam export: do this only after Create Test and Edit Test are functional.

## 4. Recommended implementation order

1. [ ] Fix Maven wrapper, add library tests, and run all checks.
2. [ ] Embed molecule models and periodic-table content into slides.
3. [ ] Implement blog post editing.
4. [ ] Persist customized physics simulations once Physics Hub exists.
5. [ ] Move Chemistry Virtual Lab and test/exam work to Iteration 3 if schedule is insufficient.

## 5. Definition of done

- [ ] The feature is accessible from the primary user flow or sidebar.
- [ ] Stateful functionality uses a real backend API and persistence where needed.
- [ ] The demo flow does not rely on mock data or a mock AI action.
- [ ] Loading, error, and empty states are handled.
- [ ] Backend behavior has a focused unit or integration test.
- [ ] The full flow is demonstrated locally from UI to backend response.

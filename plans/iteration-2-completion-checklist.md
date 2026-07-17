# Iteration 2 Completion Checklist

## 1. Stabilize the foundation

- [ ] Fix `be/mvnw.cmd` so `mvnw.cmd test` runs successfully.
- [ ] Run the backend test suite and retain the resulting test report.
- [ ] Add focused tests for `LibraryContentService`, blog flows, and molecule APIs.
- [ ] Verify `.env` contains the required database, Google OAuth, AI provider, and R2 settings for a local demo.
- [ ] Run frontend checks: `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` from `fe/`.

## 2. Finish partially implemented features

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
- [ ] Export slide deck: generate an offline HTML package with its required CSS and assets.
- [ ] Presentation mode: add a full-screen route with previous, next, and slide selection controls.
- [ ] Click-to-simulate: open an embedded simulation while presenting a slide.
- [ ] Chemistry virtual lab: define the approved textbook reaction dataset, then implement API, UI, and simulation engine.
- [ ] Shared simulation and asset library: define the asset model and provide a picker for lessons and slides.
- [ ] Test/exam export: do this only after Create Test and Edit Test are functional.

## 4. Recommended implementation order

1. [ ] Fix Maven wrapper and run all checks.
2. [ ] Implement presentation mode.
3. [ ] Complete either lesson-plan PDF export or slide HTML export.
4. [ ] Implement blog post editing.
5. [ ] Persist customized physics simulations in Personal Library.
6. [ ] Embed molecule models and periodic-table content into slides.
7. [ ] Move Chemistry Virtual Lab and test/exam work to Iteration 3 if schedule is insufficient.

## 5. Definition of done

- [ ] The feature is accessible from the primary user flow or sidebar.
- [ ] Stateful functionality uses a real backend API and persistence where needed.
- [ ] The demo flow does not rely on mock data or a mock AI action.
- [ ] Loading, error, and empty states are handled.
- [ ] Backend behavior has a focused unit or integration test.
- [ ] The full flow is demonstrated locally from UI to backend response.

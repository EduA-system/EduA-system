# Iteration 2 — Remaining Tasks

> Last audited on `feat/slide-presentation-mode` after implementing presentation mode
> and offline HTML slide export (2026-07-17).
>
> Source of scope: Report 2 Project Tracking, WBS sheet. This checklist reflects
> the current codebase, not only the status recorded in the tracking workbook.

## Priority 1 — Complete the teaching flow

- [x] **Add a dedicated slide presentation mode**
  - [x] Create `/slide-present` with next/previous controls, keyboard navigation,
    slide picker, fullscreen, and an exit action.
  - [x] Reuse the current slide data model; presenter mode does not expose editor controls.
  - [x] Load a saved deck through `libraryId`, or the current local deck when opened from the editor.

- [x] **Export a slide deck as offline HTML**
  - [x] Export the edited deck as one self-contained HTML file with embedded assets where available.
  - [x] Include presenter controls, keyboard navigation, slide picker, and fullscreen in the exported file.
  - [x] Keep JSON download as an optional technical import/export format.
  - [x] Replace non-embeddable images with a placeholder and show an export warning.

- [ ] **Export lesson plans to PDF and/or DOCX**
  - Export the rendered 5512 lesson plan with Vietnamese text and the activity tables intact.
  - Provide an explicit download action and error feedback.

- [ ] **Add click-to-simulate support in presentation mode**
  - Define an embeddable simulation element in a slide.
  - In presenter mode, clicking that element opens/runs the referenced simulation.

## Priority 2 — Persist and organize generated content

- [ ] **Complete Personal Library**
  - [x] Persist lesson plans, slide decks, and saved molecule simulations in `library_contents`.
  - [x] Add owner-scoped APIs to list, search, open, update, and soft-delete content.
  - [x] Create `/library` with filters, search, open, rename, and delete actions.
  - [x] Save and reopen lesson-plan and slide-deck edits through the library API.
  - [ ] Add backend service/controller coverage for the library APIs.
  - [ ] Persist customized Physics Hub simulations when Physics Hub is implemented.
  - [ ] Decide whether a dedicated library-detail route is needed; current Open actions route
    directly into the relevant lesson, slide, or molecule workflow.

- [ ] **Connect simulations to lessons and slides**
  - Allow a teacher to select a periodic-table element, atom model, or molecule model
    and embed it in lesson/slide content.
  - Store the reference with the content item so it works after reload and in presentation mode.

- [ ] **Add the shared Simulation & Asset Library**
  - Store reusable simulations and visual assets with metadata, owner, and subject.
  - Support browsing/selecting assets when authoring lessons and slides.

## Priority 3 — Build the missing simulation features

- [ ] **Implement Chemistry Virtual Lab**
  - Add a route, UI, domain model, and API for selecting reactants and running an experiment.
  - Limit reactions to the approved SGK equation dataset.
  - Show equation, conditions, products, and an understandable reaction visualization/result.
  - Add tests for valid, unsupported, and invalid reactant combinations.

- [ ] **Implement Physics Hub**
  - Add hub list and phenomenon-detail routes.
  - Provide interactive physics simulations and AI-assisted customization.
  - Allow teachers to save a customized phenomenon to their Personal Library.

## Priority 4 — Finish test and blog scope

- [ ] **Export tests/exams to DOCX or PDF**
  - Include questions, answer key, score/duration metadata, and a printable layout.

- [ ] **Add guest blog preview**
  - Make published blog list/detail readable without authentication as defined in the WBS.
  - Keep authoring, commenting, editing, and moderation authenticated.

- [x] **Add the blog post edit UI**
  - [x] Reuse the rich editor for an author-owned post.
  - [x] Call the existing `PATCH /api/blog-posts/{id}` endpoint.
  - [x] Show validation and success/error feedback.

## Cross-cutting fixes required before marking Iteration 2 complete

- [ ] **Complete route and API authorization**
  - [x] Require authentication for slide creation and slide editing routes in the frontend.
  - Require authentication for lesson creation/editing, slide creation/editing, uploads,
    and molecule generation.
  - Apply role checks where necessary; do not leave protected features in `PUBLIC_PATHS`.
  - Update frontend route permissions to match backend access rules.

- [ ] **Add automated coverage for new flows**
  - Backend: service/controller tests for persistence, export, authorization, and simulations.
  - Frontend: at minimum run lint, typecheck, and production build after each feature.

## Suggested implementation order

1. Add tests for the completed Personal Library APIs and run the full backend/frontend checks.
2. Lesson-plan export.
3. Connect molecule/periodic-table/simulation references to lessons and slides.
4. Blog editing and authorization hardening.
5. Chemistry Virtual Lab and Physics Hub.
6. Shared Simulation & Asset Library and test/exam export, or defer these to Iteration 3.

## Status corrections for Project Tracking

- `Run Chemistry Virtual Lab Experiment` is marked **Coded** in WBS but is not present
  in the current `main` source.
- `Physics Hub` is marked **Coded** in WBS but is not present in the current `main` source.
- `View 3D Atomic / Molecule Models` has advanced beyond the WBS note: the main branch now
  contains molecule rendering and AI molecule generation, but embedding/persistence remains.

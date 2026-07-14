# Iteration 2 — Remaining Tasks

> Branch reviewed: `main` at commit `38962d8`.
>
> Source of scope: Report 2 Project Tracking, WBS sheet. This checklist reflects
> the current codebase, not only the status recorded in the tracking workbook.

## Priority 1 — Complete the teaching flow

- [ ] **Add a dedicated slide presentation mode**
  - Create a presenter/full-screen route or view with next/previous slide controls,
    keyboard navigation, and an exit action.
  - Reuse the current slide data model; do not expose editor controls in presenter mode.
  - The existing fullscreen button in the editor is not sufficient as a presentation mode.

- [ ] **Export a slide deck as offline HTML**
  - Export the edited deck as a self-contained HTML file, including required assets.
  - Keep the current JSON download only as an optional developer/export format.

- [ ] **Export lesson plans to PDF and/or DOCX**
  - Export the rendered 5512 lesson plan with Vietnamese text and the activity tables intact.
  - Provide an explicit download action and error feedback.

- [ ] **Add click-to-simulate support in presentation mode**
  - Define an embeddable simulation element in a slide.
  - In presenter mode, clicking that element opens/runs the referenced simulation.

## Priority 2 — Persist and organize generated content

- [ ] **Implement Personal Library**
  - Add persistence for lesson plans, slide decks, and custom simulations.
  - Add APIs to list, search, open, update, and delete only the current user's content.
  - Create the library screen and content-detail screen.
  - Save generated content to the library and persist edits instead of relying on
    `localStorage`/session-only data.

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

- [ ] **Add the blog post edit UI**
  - Reuse the rich editor for an author-owned post.
  - Call the existing `PATCH /api/blog-posts/{id}` endpoint.
  - Show validation and success/error feedback.

## Cross-cutting fixes required before marking Iteration 2 complete

- [ ] **Complete route and API authorization**
  - Require authentication for lesson creation/editing, slide creation/editing, uploads,
    and molecule generation.
  - Apply role checks where necessary; do not leave protected features in `PUBLIC_PATHS`.
  - Update frontend route permissions to match backend access rules.

- [ ] **Add automated coverage for new flows**
  - Backend: service/controller tests for persistence, export, authorization, and simulations.
  - Frontend: at minimum run lint, typecheck, and production build after each feature.

## Suggested implementation order

1. Personal Library data model and APIs.
2. Persist lesson/slide content and connect the library UI.
3. Slide presentation mode and HTML export.
4. Lesson/test export.
5. Chemistry Virtual Lab and Physics Hub.
6. Simulation/asset embedding and shared library.
7. Blog gaps and authorization hardening.

## Status corrections for Project Tracking

- `Run Chemistry Virtual Lab Experiment` is marked **Coded** in WBS but is not present
  in the current `main` source.
- `Physics Hub` is marked **Coded** in WBS but is not present in the current `main` source.
- `View 3D Atomic / Molecule Models` has advanced beyond the WBS note: the main branch now
  contains molecule rendering and AI molecule generation, but embedding/persistence remains.

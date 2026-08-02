# Iteration 2 — Implementation Checklist

> Updated 2026-07-18. This is the single source of truth for the remaining
> Iteration 2 work, ordered by code dependencies and current implementation.

## Current baseline

- [x] Google SSO, profile management, Personal Library, slide presentation,
  offline HTML slide export, molecule viewer, periodic-table route, and the
  Physics Hub frontend are available on `main`.
- [x] Physics Hub is available at `/mo-phong-vat-ly` with reviewed presets and
  interactive simulations.
- [ ] RBAC is only partially complete; backend roles exist but frontend route
  coverage requires completion.

## 1. RBAC and IT Management

Complete this first because Classroom permissions and system-prompt management
depend on it.

- [ ] Add `IT_MANAGEMENT` to the backend role model, database role data, and
  Spring security rules.
- [ ] Add `IT_MANAGEMENT` to `fe/lib/auth/permissions.ts` and the frontend
  route guards.
- [ ] Audit protected routes and verify unauthorized direct navigation is
  rejected.
- [ ] Implement backend API and UI for IT Management to view and update AI
  system prompts.

Relevant existing code:

- `be/src/main/java/com/edua/beeduasystem/domain/model/auth/Role.java`
- `fe/lib/auth/permissions.ts`
- `fe/lib/auth/RouteGuard.tsx`

## 2. Classroom foundation

Classroom is the dependency for membership, class resources, and assignments.

- [ ] Create `Classroom` domain model, persistence schema, repository, service,
  REST API, and teacher-owned CRUD flow.
- [ ] Add the class list and create/edit/delete UI.
- [ ] Create class membership/enrollment data and APIs.
- [ ] Let a teacher add, remove, and list students by their Gmail address.
- [ ] Validate that the Gmail address belongs to an existing user before
  enrollment.

## 3. Class resources

Reuse Personal Library instead of creating another file-storage mechanism.

- [ ] Add a `classroom_id` to `library_content` mapping or an equivalent
  `classroom_resources` mapping.
- [ ] Let a teacher attach an existing lesson, slide deck, or resource from
  Personal Library to a class.
- [ ] Add a student read-only class-resource page, restricted to enrolled
  students.

Relevant existing code:

- `be/src/main/java/com/edua/beeduasystem/service/library/LibraryContentService.java`
- `be/src/main/java/com/edua/beeduasystem/presentation/controller/LibraryContentController.java`
- `fe/app/library/page.tsx`
- `fe/lib/library.ts`

## 4. Lesson-plan PDF export

Finish one reliable export format before considering DOCX.

- [ ] Turn the current print flow into an explicit lesson-plan PDF export with
  a clear download/print action, filename, loading state, and error feedback.
- [ ] Verify Vietnamese text and activity tables render correctly.

Relevant existing code:

- `fe/lib/lesson-plan-pdf-export.ts`
- `fe/components/dashboard/LessonEditDashboard.tsx`

## 5. Embed simulations in lessons and slides

- [ ] Define a reusable embedded simulation/asset reference in lesson and slide
  payloads.
- [ ] Allow molecule models and periodic-table elements to be inserted into a
  lesson plan or slide.
- [ ] Allow Physics Hub simulations to be inserted into a lesson plan or slide.
- [ ] Persist the reference through Personal Library and reload it correctly.

## 6. Complete Physics Hub integration

- [ ] Persist a teacher's customized Physics Hub simulation in Personal Library
  as `SIMULATION` content.
- [ ] Add AI-assisted customization only through a real backend API; do not
  ship a mock-only flow.
- [ ] Defer a shared Simulation & Asset Library until the embedded-reference and
  persistence model are stable.

Relevant existing code:

- `fe/app/mo-phong-vat-ly/page.tsx`
- `fe/components/simulations/`
- `be/src/main/java/com/edua/beeduasystem/domain/model/library/LibraryContentType.java`

## 7. Presentation interaction

Do this after embedded simulation references exist.

- [ ] In presentation mode, detect a simulation block and open/run its linked
  simulation when clicked.
- [ ] Verify slide navigation and fullscreen still work with an open simulation.

Relevant existing code:

- `fe/app/slide-present/page.tsx`
- `fe/components/slide-presentation/SlidePresentationClient.tsx`

## 8. Test/exam export

`Create Test` and `Edit Test` are available through `/exam-create-new` and
`/exam-edit-new`. The current AI flow validates the proposed configuration,
generates questions from the selected SGK scope, and saves drafts in Personal
Library.

- [ ] If capacity remains, implement Word/PDF exam export with questions, answer
  key, score, duration, and print layout.

## Definition of done

- [ ] The UI is reachable from its intended teacher, moderator, administrator,
  or student workflow.
- [ ] A protected flow has matching backend authorization and frontend route
  protection.
- [ ] Stateful data uses a real API and persistence, not mock state.
- [ ] Loading, error, and empty states are available.
- [ ] Appropriate backend and frontend checks have passed.

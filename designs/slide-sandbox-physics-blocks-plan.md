# Embed physics experiments (Sandpack) in slides

Status: implemented (2026-08-09).

## Context

Slides could embed Chemistry simulations only — `SimulationElement` was a two-branch union of
`molecule` (Three.js) and `periodic-element | periodic-table` (local data). The 60 physics
experiments in `fe/components/simulations/presets/` had no path into a slide: they lived in
`/mo-phong-vat-ly` (the teacher-facing page) and `/sandbox` (a developer workbench that no UI
links to and that `WBS_CHECKLIST.md` never tracked).

A slide is **not** an HTML page. The canonical model is JSON (`Slide { id, bg, elements[] }` on a
fixed 960×540 canvas) rendered by React; HTML is only the intermediate format the AI emits, which
`components/slide-editor/lib/html-to-slide.ts` converts into elements and discards. That is what
makes embedding a live React simulation feasible at all.

This change adds a third branch, `kind: "sandbox"`, reachable two ways: a teacher inserts it from
the editor, or the AI proposes it while generating slides for a Physics lesson — mirroring how
`molecule`/`periodic` already work.

## Constraint that shaped the design

`fe/next.config.ts` rewrites `/api/:path*` to the Spring backend. Per the Next 16 docs
(`node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/rewrites.md`),
routing order is: non-dynamic pages served → `afterFiles` rewrites → dynamic routes. A **dynamic**
route handler such as `app/api/sandbox/[id]/route.ts` would therefore be proxied to Spring and
404. The three pre-existing local handlers (`app/api/exams/…`, `app/api/practice-exams/…`) all use
static paths for this reason.

→ The new endpoint is `GET /api/sandbox-experiment?id=…`, a **static** path.

Two further constraints:

- `lib/sandbox/collect-files.ts` reads from disk with `node:fs`, so it is server-only. The slide
  editor and presentation are client components; the file map must come over HTTP.
- Sandpack's bundler is third-party and version-pinned:
  `BUNDLER_URL = https://2-19-8-sandpack.codesandbox.io/`
  (`@codesandbox/sandpack-client/dist/clients/runtime/index.js:332`). A sandbox slide needs network
  at presentation time. Accepted deliberately.

## Data flow

```
Slide JSON:  { type:"simulation", kind:"sandbox", experimentId, presetId, title }
                                     │
Editor    poster ────── nút "Chạy thử" (Properties) ─┐
Present   poster ────── click "Nhấn để mô phỏng" ────┤
                                                     ▼
                     GET /api/sandbox-experiment?id=…  (static path)
                        → getExperiment(id) + loadAppTailwindCss()   [both pre-existing]
                                     ▼
                     <SandpackProvider> + <SandpackPreview>
```

The slide stores **only identifiers**. Source is fetched on activation, so decks stay small and a
saved slide picks up edits to `components/simulations/` instead of freezing a copy — the property
`/sandbox` already relies on.

## Implementation

### 1. Model and endpoint

- `fe/components/slide-editor/types.ts` — `SandboxSimulationElement` added to the
  `SimulationElement` union, plus a matching arm in `ElementPatch`. Adding the branch intentionally
  breaks every `el.kind !== "molecule"` narrowing that then read `el.periodic`; `npm run typecheck`
  enumerated them.
- `fe/app/api/sandbox-experiment/route.ts` — no `id` returns the catalogue (metadata only, so the
  editor picker does not pull hundreds of KB); with `id` returns `getExperiment(id)` plus
  `tailwindCss`. `dynamic = "force-dynamic"` because the built CSS does not exist at prerender time.
- `fe/lib/api/sandbox-experiments.ts` — client wrapper caching both the catalogue and per-id
  results, including in-flight promises so two elements activating together fire one request.

### 2. Rendering

- `fe/lib/sandbox/sandpack-project.ts` (new) — `SANDPACK_DEPENDENCIES`, the index/HTML/CSS
  scaffolding and `buildSandpackFiles()`, extracted from `SandboxWorkbench` so `/sandbox` and the
  slide view cannot drift apart.
- `fe/components/slide-editor/SandboxSimulationView.tsx` (new) — preview-only: no code editor, no
  console, no toolbar.
- `fe/components/slide-editor/ElementView.tsx` — `SimulationBlock` gained a `sandbox` branch.
  **Sandbox never auto-runs on `previewLive`** the way molecule/periodic do: those render in place
  and are cheap, while sandbox spawns a bundler iframe, so opening a deck with three sandbox slides
  would spawn three at once. It requires an explicit action in both editor and presentation. The
  poster reuses `<Thumb>` from `components/simulations/shared/simulation-thumb.tsx`, loaded through
  `next/dynamic` because that file is ~3400 lines of SVG.
- `fe/stores/slide-editor-store.ts` — `activeSandboxIds` is runtime-only state, deliberately outside
  `slides` so it never enters a history snapshot or a saved deck.
- `fe/lib/slide-html-export.ts` — static poster, like the molecule branch; offline export has no
  runtime to host Sandpack.

### 3. Manual insertion

`factory.ts` gained `makeSandboxSimulation()` (default 640×360, wider than molecule's 280×280
because these experiments render a scene beside a parameter panel) and a `makeByType` arm.
`LeftPanel.tsx` gained a "Thí nghiệm vật lý" section grouped by domain. Thumbnails key off
`presetId`, **not** the file name — 13 presets differ between the two.

### 4. AI insertion (Physics only)

Backend emits the *request*; the frontend resolves it — the rule `molecule`/`periodic` already
follow, where the fill fields are frontend-only (`lib/api/slide-design.ts`).

- `ContentPlan.java` — `PhysicsBlock(… String physicsRequest)` added to the sealed `permits` list.
- `GenerateSlideOutlineUseCase.java` — `case "physics"` in `parseBlock()`.
- `SlidePromptBuilder.java` — the `physics` kind described in **both** parallel prompt bodies
  (~L293 and ~L383), each stating that a physics block must be the slide's only block. Only
  `expandSlidePrompt` carries the `GIỚI HẠN ĐỘ DÀI` block, so the per-slide char-limit lines exist
  once, at ~L414.
- `lib/slide-layout/types.ts`, `metrics.ts`, `engine.ts`, `renderer.ts` — `physics` threaded through
  as a visual-like slot. `engine.ts` gained `isVisualLikeSlot()`, replacing three copies of the same
  three-way `slot.kind` comparison.

### The simulation owns the whole slide (`physics-stage`)

A physics slot is *not* laid out like an illustration. `engine.ts` branches on the presence of a
physics block before every family branch and emits topology `physics-stage`:

```text
title           slot inside contentBounds, unchanged
simulation      { x: 0, y: titleBottom + 14, w: canvas.width, h: canvas.height - y }
other blocks    dropped (collected in `omitted`, excluded from the `required` constraint)
```

Why, given the first implementation reused the aside-sized media slot:

- `splitHorizontal(body, ~0.45)` produced roughly **390×347** — a near-square portrait box. Every
  experiment under `components/simulations/` is a *landscape* UI (scene on the left, parameter panel
  on the right) built for the full-screen `/mo-phong-vat-ly` page, so that box left the scene a
  thumbnail and made the parameter panel scroll. The stage rect is ~**960×383**, 2.7× the area and
  2.5:1 instead of 1.1:1.
- `balancedImageRect()` is skipped for `physics` — clamping to a 0.75–1.5 ratio would crop a
  full-width stage back to ~580px.
- `inside(slot.rect, bounds)` is skipped for `physics` via `slotMayBleed()`. The stage deliberately
  bleeds past the 40px slide margins; it is a stage, not a content block.
- The accompanying text block is dropped because the experiment already renders its own title,
  description and parameter labels inside the iframe. The outline prompt asks the AI not to emit it;
  the engine drops it anyway, since prompts are advisory.

Consequence for step 3: a physics slide has **no** fillable text slot, so an unresolved
`physicsRequest` would leave `mergedSlots` empty. `run-design-pipeline.ts` therefore only treats an
empty result as an error when `fillableSlots.length > 0`, and `apply-content-slots.ts` counts a
sandbox element as filled unconditionally — otherwise one unmatched preset would fail the entire
slide, title included.
- **`lib/slide-layout/resolve-physics-preset.ts` (new)** — pure function mapping free-text
  `physicsRequest` to a preset. Strips Vietnamese diacritics, drops filler words
  (`thí nghiệm`, `định luật`, …), scores title → id → desc → domain, and returns `null` below a
  deliberately conservative threshold. Free text resolved on the frontend keeps `presets/` the
  single source of truth rather than duplicating a 60-item catalogue into a backend prompt.
- `run-design-pipeline.ts` — a fourth `Promise.all` arm; unresolved slots are dropped, exactly as
  `resolvePeriodicPayload` returning `null` already does.
- `apply-content-slots.ts` — sandbox arms in both the "did the AI fill anything" guard and the write.
- An unresolved placeholder keeps `experimentId: ""`; `ElementView` and the Properties button both
  refuse to activate it and say "Chưa gán được thí nghiệm" rather than calling the endpoint with an
  empty id (which would return the catalogue, not an experiment).

## Tests

- `be/…/SlideContentPlanParsingTests.java` — parses a physics block, rejects one missing
  `physicsRequest`, and asserts **both** prompt bodies describe the kind (a one-sided edit is a
  silent bug affecting only one generation path).
- `fe/lib/slide-layout/resolve-physics-preset.test.ts` — diacritics, filler words, near-miss presets,
  `presetId` differing from file name, and the null cases. Picked up automatically by the existing
  `lib/slide-layout/**/*.test.ts` include in `vitest.config.ts`.
- `fe/lib/slide-layout/engine.test.ts` — the `physics-stage` topology: full canvas width, bottom edge
  at 540, landscape ratio (i.e. `balancedImageRect` did not run), the accompanying text block gone,
  and the rendered element being a full-bleed sandbox placeholder. The existing "inside content
  bounds" sweep still holds because it only covers slide *families*, and `physics` is a block kind.

## Known trade-offs

- Presentation needs network and a few seconds of in-browser compilation on activation. Lazy
  activation confines that cost to slides the teacher actually runs.
- `BUNDLER_URL` is pinned to the installed Sandpack version. Upgrading changes the host; it does not
  break saved decks (the URL is derived at runtime), but if CodeSandbox retires the old host before
  an upgrade, every sandbox slide stops working at once.

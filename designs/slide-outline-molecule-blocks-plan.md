# Auto-generate molecule simulations during slide outline creation (plan)

Status: implemented.

2026-08-09 update: the same Chemistry-only slide-generation path also supports periodic-table visualizations. Backend `ContentPlan` now accepts `kind: "periodic"` with `periodicRequest`, optional `mode`, `elementSymbols`, and `focus`. Frontend Step 2 lays it out as a visual-like `periodic` slot; Step 3 resolves it locally from committed periodic-table data instead of calling `/api/slide-design/fill-content` or a heavy AI endpoint. The resulting slide editor element uses `SimulationElement.kind: "periodic-element" | "periodic-table"` and renders compact element/table views in editor, presentation, and offline HTML export.

## Context

The Slide Editor already lets a teacher manually insert a 3D molecule element (`SimulationElement`, `kind: "molecule"`), but only by picking from a hardcoded 8-molecule list (`MOLECULE_CATALOG`) — a chemistry lesson about, say, benzene or acetic acid currently has no way to get a matching 3D model into its slides. Separately, a real AI molecule-structure generator already exists and works (`MoleculeService`/`MoleculePromptBuilder`, `POST /api/molecules/build`), but it only runs on the standalone `/molecules` explorer page, disconnected from slide generation.

The goal is to have the AI decide **during outline generation** (chemistry lessons only) that a given slide needs a molecule visualization, and have the **actual 3D structure built later, in Step 3 of the 3-step slide-creation pipeline** (`fe/lib/slide-create/run-design-pipeline.ts`), reusing the existing molecule-build service/prompt completely unchanged. This mirrors how `VisualBlock` (image) content already works: the outline decides *that* a visual is needed and *what* it should depict; a later step resolves the actual asset.

Because the resolved molecule (atoms/bonds) gets embedded directly into the slide's `SimulationElement` data (same as today's manual flow), presentation stays instant — no AI call happens when clicking "▶ Nhấn để mô phỏng" during a live lecture.

## Approach

Add `"molecule"` as a new sibling content-block kind, parallel to the existing `"visual"` kind, threaded through the same three architectural layers that already carry `"visual"` end-to-end. Gate it to chemistry lessons via a prompt instruction (subject is already passed into the outline prompt).

### 1. Backend — outline generation decides *that* + *what*

- **`be/src/main/java/com/edua/beeduasystem/domain/model/slide/ContentPlan.java`**
  Add `MoleculeBlock(String id, String kind, String role, String semanticType, String priority, boolean required, String groupId, String chemicalRequest)` to the sealed `Block` interface's `permits` list, alongside `VisualBlock`. `chemicalRequest` holds the chemical name/formula the AI wants visualized (e.g. `"etanol"`, `"C2H5OH"`) — same free-form input shape `MoleculeService.build(String input)` already accepts.

- **`be/src/main/java/com/edua/beeduasystem/service/slides/GenerateSlideOutlineUseCase.java`**
  `parseBlock()` (~L1000): add `case "molecule" -> new ContentPlan.MoleculeBlock(id, kind, role, semanticType, priority, required, groupId, requiredText(node, "chemicalRequest"));`

- **`be/src/main/java/com/edua/beeduasystem/service/slides/SlidePromptBuilder.java`**
  In both `expandPartPrompt` (~L260) and `expandSlidePrompt` (~L321), add one line to the "Các kind:" list, right after the `visual` line:
  `- molecule: CHỈ dùng khi môn học là Hoá học và nội dung slide cần mô hình phân tử 3D trực quan; thêm chemicalRequest (tên hoặc công thức hoá học, vd "etanol" hoặc "C2H5OH"). Không dùng cho môn khác.`
  This is the only prompt touched — it's the *outline* prompt, not the molecule-build prompt (see below).

  Before implementing, grep the backend for any other exhaustive `switch`/pattern-match over `ContentPlan.Block` besides `ContentPlan.validate()`'s `instanceof` checks (which are non-exhaustive and safe to leave as-is) — Java will fail to compile if one exists and isn't updated.

- **`MoleculeService` / `MoleculePromptBuilder` — unchanged.** Step 3 will call the existing `POST /api/molecules/build` as-is; this is the "prompt tạo vẫn giữ nguyên như cũ" requirement.

### 2. Frontend types — mirror the new block kind

- **`fe/lib/slide-layout/types.ts`**: add `MoleculeContentBlock = BaseContentBlock & { kind: "molecule"; chemicalRequest: string }` to the `ContentBlock` union; add `"molecule"` to `LayoutSlot["kind"]` (currently `"text" | "image"`).
- **`fe/lib/slide-layout/metrics.ts`**: `blockText()`'s switch is exhaustive over `ContentBlock["kind"]` — add `case "molecule": return block.chemicalRequest;`. TypeScript will flag any other exhaustive switch that needs a case, which is the safety net for this change.

### 3. Frontend Step 2 (`runStructuralStep`) — lay out a placeholder molecule element

- **`fe/lib/slide-layout/engine.ts`**: currently branches on `block.kind === "visual"` at ~7 call sites (aside placement, slot sizing via `balancedImageRect`, slide-type selection for `text-image`/`experiment` layouts, `slot.kind === "image"` min-size/scoring checks). Introduce a small local helper (e.g. `isVisualLikeKind(kind)` returning true for `"visual"` and `"molecule"`) and use it at those sites so molecule blocks get the same "aside visual" placement as images, but produce `slot.kind: "molecule"` instead of `"image"`.
- **`fe/lib/slide-layout/renderer.ts`**: `slotElement()` currently returns an `ImageElement` when `slot.kind === "image"`. Add a branch for `slot.kind === "molecule"` that builds a placeholder `SimulationElement` via the existing `makeSimulation()` factory (`fe/components/slide-editor/lib/factory.ts`), setting `contentSlot: slot.id` and geometry from `slot.rect`/`zIndex` (same pattern as the image branch). Use `MOLECULE_CATALOG[0]` as the transient placeholder molecule — it gets overwritten in Step 3.

### 4. Frontend Step 3 (`runContentFillStep`) — resolve the real structure

- **New file `fe/lib/api/molecule-build.ts`**: `buildMolecule(input: string): Promise<Molecule>`, calling `POST {NEXT_PUBLIC_API_URL}/api/molecules/build` directly (same direct-to-backend pattern as `fe/lib/api/slide-design.ts`, not the same-origin `/api/*` rewrite `MoleculeExplorer.tsx` happens to use). Same request/response shape already exercised by `MoleculeExplorer.tsx:45`.
- **`fe/lib/slide-create/run-design-pipeline.ts`**, `runContentFillStep()`: split each slide's `fillableSlots` into `textImageSlots` (sent to `fillSlideContent` exactly as today — **this backend call/prompt stays untouched**) and `moleculeSlots` (`kind === "molecule"`). For molecule slots, call `buildMolecule(slot.sourceText)` inside the same `runPool` concurrency gate. Merge results into the slots array passed to `onSlideReady` by extending the in-memory `SlideContentFillSlot` with an optional `molecule?: Molecule` field (frontend-only; never sent to/received from the `fill-content` backend contract). A failed required molecule build throws, caught by the existing per-slide try/catch → `failedSlideIds`/`onSlideFailed`, identical to how a failed text/image fill behaves today.
- **`fe/lib/slide-create/apply-content-slots.ts`**, `applyContentSlots()`: add a branch — when `element.type === "simulation"` and its `fill.molecule` is present, return `{ ...element, molecule: fill.molecule }`.

### Not touched (by design)
- `fe/lib/api/slide-design.ts` (`SlideContentSlot.kind`, backend `fill-content` request contract) — molecule slots never get sent there.
- Backend `slidedesign` package / `SlideDesignPromptBuilder` — operates on flattened generic slots, not on `ContentPlan.Block`, so it never sees the new kind.
- `MoleculeService`, `MoleculePromptBuilder`, `MoleculeController` — reused verbatim.
- Slide Presentation (`SlidePresentationClient.tsx`, `ElementView.tsx`) — already reads `element.molecule` from saved data; nothing to change.
- The manual "Mô phỏng" tab in `LeftPanel.tsx` (static catalog) — separate, existing feature, left as-is.

## Open product decision (resolved)

AI should only propose `molecule` blocks when the lesson's subject is Hoá học (Chemistry) — enforced via the prompt instruction above, not a separate gate in code. Non-chemistry subjects (Toán, Vật lý...) should never see this block kind.

## Verification

1. Backend: `cd be && ./mvnw test -Dtest=GenerateSlideOutlineUseCaseTest` (or `mvnw.cmd` on Windows) — confirm `parseBlock` handles the new kind and existing outline tests still pass.
2. Frontend: `cd fe && npm run typecheck` — confirms every exhaustive switch over `ContentBlock`/`LayoutSlot` kinds was updated (compiler enforces this).
3. `cd fe && npm test -- lib/slide-layout` and `npm test -- lib/slide-create` — layout engine and pipeline unit tests.
4. Manual end-to-end: run the stack (`pwsh scripts/start.ps1`), go to `/slide-create`, generate an outline for a Hoá học lesson containing a specific compound not in `MOLECULE_CATALOG` (e.g. benzen), confirm the outline stream includes a `molecule` block for the relevant slide, then run through Step 2/3 in `/slide-maker` and confirm the resulting slide has a `SimulationElement` with the correct AI-built structure (not the `MOLECULE_CATALOG[0]` placeholder). Also generate an outline for a non-chemistry subject and confirm no molecule blocks appear.

---
name: drawio-drive-edit
description: Edit .drawio diagrams that live in Google Drive (mounted at H:\ via Drive Desktop) by patching the XML file directly, because writes made through the drawio MCP server never reach Drive and are lost on reload. Use when asked to draw, update, fix, or check a diagram in a .drawio file (system architecture, ERD, sequence, class diagram), or when MCP-made changes disappear after F5.
---

# Edit draw.io files stored on Google Drive

## The rule

**MCP writes, Drive loses.** `mcp__drawio__import-diagram` / `add-*` / `edit-cell`
change the live graph in the browser tab — the user sees the diagram — but
draw.io does not serialize those changes when it saves to Google Drive. The page
comes back empty after F5. This was verified on `sds_sau_16_8.drawio`: the tab
showed 39 cells while the synced file still held only `mxCell id="0"` and `id="1"`.

So:

| Task | Tool |
|---|---|
| Write / change / delete cells | Patch the `.drawio` XML file directly (scripts below) |
| Read the model, render a preview PNG | drawio MCP (`list-paged-model`, `export-diagram`) |

Never report a diagram as saved because the MCP call returned `success: true`.
Only the file on disk counts.

## Where the file is

Google Drive Desktop mounts shared drives under `H:\`. Shared-folder shortcuts
resolve through `.shortcut-targets-by-id`, e.g. the EDUA SDS file:

```text
H:\.shortcut-targets-by-id\1c_y2P_yZ_gA3rn0pPGsXgvJ9CIoQaTm8\SEP490_SU26_G20\AAA_docs_sau_khi_nop_9_8\sds_sau_16_8.drawio
```

In Node scripts use the `H:/...` form. A `/h/...` POSIX path resolves against
`D:\` and fails with ENOENT.

## Workflow

### 1. Ask the user to close the draw.io tab first

Non-negotiable. An open tab holds its own copy of the file and will overwrite
your patch on its next autosave. If it prompts to save on close, the user must
choose **not** to save.

### 2. Inspect the file

```bash
node .claude/skills/drawio-drive-edit/scripts/drawio-page.mjs list "<file>"
```

Prints every page with its `id`, `name`, and cell count. A page holding just
2 cells (`0` and `1`) is empty.

### 3. Back up and extract what already exists

```bash
node .claude/skills/drawio-drive-edit/scripts/drawio-page.mjs extract "<file>" "<page-id-or-name>" out.xml
```

`extract` writes the page's `<mxGraphModel>` block, which is exactly what
`patch` takes back in. Keep the extract in `designs/` when the diagram is
worth versioning with the repo.

### 4. Write the new model, then patch

Author a standalone `<mxGraphModel>…</mxGraphModel>` file (see conventions
below), then:

```bash
node .claude/skills/drawio-drive-edit/scripts/drawio-page.mjs patch "<file>" "<page-id-or-name>" model.xml
```

`patch` refuses to run on compressed diagrams, backs the original up to
`%TEMP%\drawio-backups\` before touching anything, replaces only the target
page, and prints per-page cell counts before and after. Other pages must keep
their counts — if page 1 loses its embedded `image=data:` cells, restore the
backup immediately.

### 5. Verify

```bash
node .claude/skills/drawio-drive-edit/scripts/drawio-page.mjs list "<file>"
```

Then have the user wait for the Drive Desktop tray icon to finish syncing and
reopen the file. If Drive produces a conflicted copy (`... (1).drawio`), a tab
was still open — close it and patch again.

### 6. Optional visual check

Once the user has the file open again, render it and actually look at it:

```text
mcp__drawio__export-diagram { target_page: {index: N}, format: "png", scale: 0.85, output_path: "<scratchpad>/check.png" }
```

Check for labels colliding with boxes, edges crossing through shapes, and text
overflowing its box. Fix by patching the file, not through MCP.

## Fallback when Drive Desktop is not mounted

Hand the user the `<mxGraphModel>` file and these steps: select the page tab →
**Bổ sung → Chỉnh sửa biểu đồ…** (Extras → Edit Diagram) → `Ctrl+A`, paste, OK →
`Ctrl+S`. That path goes through draw.io's own edit pipeline, so it does persist.

## Diagram conventions

Follow the container/component style already used in `sds_sau_16_8.drawio`
page `system_architecture_2`:

- Three grey swimlane containers, title at top:
  `fillColor=#f5f5f5;strokeColor=#666666;verticalAlign=top;fontStyle=1;fontSize=14;`
- Components as white boxes inside them:
  `fillColor=#ffffff;strokeColor=#000000;fontSize=11;`, first line `<b>name</b>`,
  following lines listing the real classes/packages.
- External systems as grey boxes: `fillColor=#eeeeee;strokeColor=#666666;`
- Solid arrows for outbound calls, dashed (`dashed=1;endArrow=open;endFill=0;`)
  for callbacks, polling, and `«uses»` / `«implements»` dependencies.
- Every edge carries a short protocol label (`REST /api/* (Bearer JWT)`,
  `JDBC / JPA · Flyway`, `verify idToken`) with
  `labelBackgroundColor=#ffffff;fontSize=10;`.
- No vendor logos, no fill colors beyond the greys above.

Draw the backend from the code, not from memory: read `be/src/main/java/com/edua/beeduasystem/`
for the layer packages and `fe/lib/`, `fe/app/api/`, `fe/next.config.ts` for how
the frontend reaches it. Counts quoted in labels (controllers, migrations,
feature packages) must be re-derived from the tree each time — they drift.

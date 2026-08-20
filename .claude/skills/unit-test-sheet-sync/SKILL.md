---
name: unit-test-sheet-sync
description: Sync a method sheet in Report5.1_Unit Test.xlsx (Google Drive, H:) with the real backend code — derive test cases from the actual branches, rewrite the sheet by patching XML inside the zip, recompute the Statistics totals, then publish to Drive. Use when asked to check or fix whether the Unit Test document matches the code, to redo a sheet for a service method, or to add test cases to Report5.1.
---

# Sync a Unit Test sheet with the code

File: `H:\.shortcut-targets-by-id\1c_y2P_yZ_gA3rn0pPGsXgvJ9CIoQaTm8\SEP490_SU26_G20\AAA_docs_sau_khi_nop_9_8\Report5.1_Unit Test.xlsx`
Audit of every sheet vs code (as of 20/08/2026): `review/unit-test-param-mismatch.md`.

## Never save with openpyxl

The workbook holds 32 drawings, 2 charts, 2 comment parts, vml and an image — 118 zip
entries. `load_workbook()` + `save()` drops charts, comments and vml, and the file still
opens fine, so nobody notices. Use openpyxl **for reading only**.

Patch with `scripts/patch_xlsx.py` (takes a JSON spec of cells to clear/set, rewrites just
the target sheet XML, copies every other entry byte-for-byte, and aborts if the entry list
changes). Values: strings become inline strings so `sharedStrings.xml` stays untouched;
numbers become numeric cells; `null`/`""` clears a cell but keeps its style.

```json
{"src": "ut.xlsx", "out": "ut.new.xlsx",
 "sheets": {"deleteTeacher": {"clear": ["B9:Z30"], "set": {"F7": "UTC-DT-01", "A5": 7}}}}
```

Sheet name → `sheetN.xml` is resolved through `xl/workbook.xml` + rels; the numbers do
**not** follow sheet order (`deleteTeacher` is sheet11, `deleteBlogPost` is sheet14).

## Always start from the file currently on H:

Copy the Drive file down before every edit. A Google Sheets tab left open re-serializes
the whole workbook on autosave, so a byte diff always shows every sheet changed even when
nothing was edited. Compare **cell values**, not bytes, against your previous copy — that is
how a single hand-typed cell (`deleteTeacher!B24`) was caught before it got overwritten.
After copying back, re-read from the H: path and compare md5; if a Sheets tab is still open
it can overwrite you minutes later.

## Deriving the test cases

Read the service method and every helper it calls, then list the branches **in execution
order** — order decides which exception a case actually gets, and getting it wrong is the
single most common defect in the existing document.

- Input block holds **only real parameters**, with the real type. `deleteTeacher(UUID id)`
  takes a UUID, never `123`. Check the current signature: `replaceModerator` and `addTeacher`
  each grew a 4th parameter in August 2026 that the document never picked up.
- Implicit inputs (`currentUserProvider.require()`, its `subject()`, roles from the
  repository) belong in **Precondition**, never in Input value.
- Record/entity state (status, ownership, existing rows) belongs in **Precondition** too.
- One case = one bundle of inputs. Never write "missing, disabled, or wrong subject" in a
  single cell — that is three cases with three different exceptions.
- Quote exception type **and** message verbatim from the code, including the Vietnamese text.
- Return value must name every component the method really returns, including fields that
  are easy to forget (`LoginResult` carries `grades`, not just user/roles/tokens).
- **No fake boundary cases.** A method whose only parameter is a `UUID` has no boundary
  domain; an "all-zero UUID" is just a non-existent id and duplicates the not-found case.
  `B = 0` is a valid answer. Real boundaries come from limits in the code:
  `MAX_TITLE_LENGTH`, `MAX_CLASS_SIZE`, grade 10..12, `size` clamped to 1..100.
- Precondition rows written as "X holds **unless** the UTC tests Y" must not be ticked for
  the very case that tests Y. 14 such inverted ticks exist in the untouched sheets.

## Sheet layout contract

The reference the school grades against is `7719_APHL_SEP490_G116_Report5.1_Unit_Test.xlsx`
(its `Guideline` sheet states the rules; `CreateSalesOrder` is a clean worked example).
**Three blocks, labelled in column A: `Condition` → `Input` → `Confirm`, then the result rows.**

| Column A label | Column B | Column D | Case columns |
|---|---|---|---|
| `Condition` | `Precondition` | one precondition per row | `O` per case it holds for |
| `Input` | `<paramName> (<Type>)` — **one sub-header per parameter**, in signature order | one **candidate value for that parameter** per row | `O` on the case that uses that value |
| `Confirm` | `Return`, then `Exception` (add `Log message` only if the method logs) | one expected outcome per row | `O` per case |
| `Result` | `Type(N : Normal, A : Abnormal, B : Boundary)` / `Passed/Failed` / `Executed Date` / `Defect ID` | — | `N`/`A`/`B`, then `P`, date on the first case column |

Rows 1–5 stay as they are: `A1` Code Module + `C1` class name, `F1` Method + `L1` method name,
`A5` Passed, `C5` Failed, `F5` Untested, `L5`/`M5`/`N5` = N/A/B counts, `O5` total.
Row 7 carries the case ids from column F rightwards.

**Input is its own block, never a row inside Condition.** One parameter per sub-header, one
value per row — never `id=…; name=…; subject=…` crammed into a single cell. A case is read by
going down the input rows and picking the value ticked in its column, so each case ticks at
most one value per parameter group. This is the single biggest difference between the graded
reference and what an agent writes if left to itself.

Per the `Guideline` sheet, the value types drive the N/A/B classification: normal values are
the ones the function is meant to work with, boundary values are the limits themselves, and
abnormal values are the unexpected ones that trigger exceptions.

**All prose is English** — preconditions, input descriptions, expected results. The only
Vietnamese left is inside quoted exception/log messages, which must stay verbatim as the code
emits them.

The template only styles ~14 case columns (in these sheets `F`–`S`, with `T`/`U` carrying the
closing border). A sheet with more cases spills outside the printed grid — no header fill, no
borders, visibly broken. Before writing content, widen the grid with `clone_styles`, moving the
edge columns right and cloning a case column into the gap:

```json
"clone_styles": [
  {"from": "T", "to": ["X"], "rows": [1, 60]},
  {"from": "U", "to": ["Y"], "rows": [1, 60]},
  {"from": "F", "to": ["T", "U", "V", "W"], "rows": [1, 60]}
]
```

The template only leaves four rows for exceptions (39–42), which is exactly why the original
document crams several different exceptions into one cell. Do not follow it: add rows with
`insert_rows: {at: 39, count: 3}` in the patch spec — it shifts everything below down,
including mergeCells, data validations and the whole Result block, and clones the row styles
into the gap. One exception message per row, one tick per case. Row numbers of the Result
block therefore differ between sheets; that is fine, the block order is what matters.

Clear the whole old region (`B9:Z30`, `C31:Z42`, `F43:Z44`) before writing — stray `O` marks
from the previous layout are the easiest thing to leave behind.

## Statistics sheet

Each method has a row (`deleteTeacher` = row 19, `deleteBlogPost` = row 22).
- `C` (Passed) is a literal — update it.
- `F:I` (N, A, B, Total) are formulas pointing at the method sheet's `L5:O5` — they recalc
  themselves; the cached values stay stale until Excel opens the file, which is expected.
- Row 40 `Sub total` and the percentage rows 42–46 are **literals** — recompute by hand:
  totals shift by the delta of that one method, percentages are N/A/B ÷ total × 100 rounded
  to 2 decimals, and the three must add up to 100.

## Verify before publishing

1. Zip entry list identical before/after, 118 entries, 32 sheets.
2. Only the target sheet XML and `sheet3.xml` (Statistics) differ.
3. Dump every non-empty cell of the sheet and read it against the code branches once more.
4. `N + A + B == Total` on both the sheet and the Statistics subtotal.
5. Blocks `Condition` / `Input` / `Confirm` all present in column A, and every parameter of
   the signature has its own sub-header in the Input block.
6. Every case ticks at most one value per input parameter group, and has both a precondition
   and an expected outcome.
7. The last case column is still inside the styled grid (its header cell carries the case
   style, not the default one).
8. No Vietnamese outside quoted code messages.
9. After copying to H:, re-read from H: and compare md5.

## Handing the work to opencode

The mechanical half (patching, repacking, verifying) is a good fit for `opencode run` — see
the `opencode-delegate` skill. It follows a cell-level brief accurately and handled the
style renumbering after a Sheets autosave on its own. It will, however, faithfully reproduce
flaws it was not warned about: told to redo `deleteBlogPost`, it kept the bogus all-zero-UUID
boundary case inherited from the old sheet. State the rules above in the brief, and verify
its output against the code yourself.

## Done so far

- `deleteTeacher` — 7 cases (N1 A5 B1), published 20/08/2026.
- `deleteBlogPost` — 5 cases (N1 A4 B0), published 20/08/2026.
- `createBlogPost` — 11 cases (N3 A4 B4), `updateBlogPost` — 12 (N3 A5 B4),
  `removeBlogPostByModerator` — 8 (N2 A6 B0); BlogPostService module complete, published 20/08/2026.
- `replaceModerator` — 17 cases (N3 A12 B2), `addTeacher` — 18 (N2 A9 B7),
  `updateCurrentUserProfile` — 14 (N2 A4 B8), published 20/08/2026. All four missing
  parameters (`previousTeacherGrades`, `grades`, `bio`, `phoneNumber`) are now covered.
- **All high-severity sheets are done.** Statistics subtotal is now 276 (N76 A126 B74).
  What remains is the medium/low tier in the audit report: missing implicit inputs
  (TeacherGrade for the three Class sheets, current-user subject for the four Hub sheets)
  and the 14 inverted unless ticks in the WeeklyTask and addClassMember sheets.

Both delegates sag on the same branches: told to derive cases from code, opencode dropped the
"not authenticated" and "not the owner" branches in two of three sheets, and codex — which is
much faster and otherwise accurate — ran out of exception rows and merged three different
exceptions into the label row rather than asking for space. Check the exception block row by
row before publishing.

---
name: report-docx-sync
description: Edit the SEP490 Word reports (Report1/2/3/4/7) that live on Google Drive at H: — patching document.xml safely, importing content or figures from one report into another, keeping Report 7 in sync with Report 4, and diagnosing Word's "file appears to be corrupted" message. Use when asked to change, import into, re-figure, or repair any Report*.docx in the team Drive folder.
---

# Editing the SEP490 Word reports on Drive

Folder: `H:\.shortcut-targets-by-id\1c_y2P_yZ_gA3rn0pPGsXgvJ9CIoQaTm8\SEP490_SU26_G20\AAA_docs_sau_khi_nop_9_8\`

Run `scripts/check_docx.py <file>` before and after every edit. It runs all five checks that
produce Word's identical, useless error message, and exits with the problem count so it can
gate a publish. `--repack <out>` rebuilds the container with clean zip flags.

## Which Report 7 is real

Two files, and the names lie:

- `Report7_Final Project Report.docx` (~51 KB, 1 EMF) — **empty FPT template**, headings still
  read `<<Feature/Workflow Name1>>`.
- `Bản sao của (chưa làm) Report7_Final Project Report.docx` (~10 MB, 162 images) — **the real
  one**. Ignore the "(chưa làm)" in the name.

Report 7 section **IV. Software Design Description** is a copy of Report 4 section
**2. Detailed Design**; only the numbering prefix differs (`Report4 = 2.<feat>.2.<y>` ↔
`Report7 = 3.<feat>.2.<y>`), same feature/UC order as `designs/sds-diagrams/features.json`,
same 107 sequence + 21 class diagrams with the same `wp:extent` / `srcRect` geometry. A script
that maps figures by heading works for both after swapping the prefix. **Changing SDS figures
in Report 4 without doing Report 7 leaves stale figures behind** — that happened on 19/08/2026.
Report 7 has both A3 portrait and landscape sections; the design part is portrait, like Report 4.

## Google Docs autosave overwrites you

If a Docs tab has the file open, Docs re-exports the whole document on every save — it does not
merge, and it renumbers XML structure (tables, runs, `w:r` splits) so byte comparison against
your version is meaningless. On 18/08/2026 a patch written at 16:14 was gone by 16:42.

1. `cp` the original to scratchpad as a backup before writing.
2. Re-read the Drive file immediately before each write and patch **that** copy — never re-apply
   an older scratchpad version, or you delete whatever the user just typed in Docs.
3. For a long multi-step job, freeze one snapshot and do all patch + repack work **from that
   snapshot**; do not re-read the Drive file midway through repacking.
4. After writing, read the file back from H: and verify. Tell the user to close the Docs tab
   entirely — F5 is not enough.
5. When verifying with regex, Docs writes decimal measurements (`w:w="14433.0"`) where Word and
   your own edits write integers. An integer-only regex will report your changes as "all lost".

## "Word found unreadable content" — container, not content

Every entry has zip general-purpose flag bit 3 set ("sizes live in a data descriptor") while no
data descriptor follows the data. unzip, .NET `ZipArchive` and LibreOffice tolerate it; Word's
OPC reader believes the flag and refuses the file. Seen on Report4 SDS v1.3 and Report1.

Do not go hunting through `document.xml` or `styles.xml` for this — duplicate styleIds like
`TableNormal` are normal in Google Docs exports. Fix by clearing bit `0x08` in both the central
directory (offset +8) and each local header (offset +6), or repack the whole zip
(`check_docx.py --repack`). Verify with Word COM:
`$w.Documents.OpenNoRepairDialog($path, ...)` returns an error instead of showing the repair dialog.
Re-scan after fixing — Drive may sync an old copy back over it.

## Importing XML between reports

Copying a block from one report's `word/document.xml` into another means remapping **five**
resource kinds. Miss any one and Word says "the file appears to be corrupted" while
`XmlDocument.Load` still calls the XML valid — well-formed is not the same as valid OPC.

1. **`r:embed`** (images) — copy the file into `word/media/`, add a new `<Relationship>`, change the id.
2. **`r:id`** (hyperlinks) — the one people forget. Report 2's `1.1 Cost & Time Estimations` holds
   a hyperlink `r:id="rId8"` to `about:blank`; carrying it over without a new relationship breaks
   the file immediately. Always grep `r:(id|embed)=`, never just `r:embed`.
3. **`<w:tblStyle>`** — two reports can both define `Table122` with **different** contents. Copy the
   source definition under a new name (`R3Table122`) and repoint the reference; never reuse the name.
4. **`<w:numId>`** — Google Docs emits one numId per list (Report 3 has 814, Report 7 has 1). Copy
   both `abstractNum` and `num` with an offset (+2000, +4000…) so existing ids are not clobbered.
5. **`[Content_Types].xml`** — Report 1 uses **.gif** images while Report 7 declares only png/jpg.
   A missing `<Default ContentType="image/gif" Extension="gif"/>` breaks the file.

Also strip `w14:paraId` and `bookmarkStart`/`bookmarkEnd` from the imported block so ids do not collide.

If it still fails, bisect: build a version containing **one** group of changes, open it with Word
COM `OpenNoRepairDialog`, repeat. Four or five rounds finds the culprit.

## Delegating

The patching, repacking and figure-mapping loops are good `opencode run` work — see the
`opencode-delegate` skill; that folder is already writable in its permission config. Put the five
resource rules and the snapshot rule in the brief explicitly, require `check_docx.py` to exit 0
before it copies anything to H:, and verify the result here afterwards.

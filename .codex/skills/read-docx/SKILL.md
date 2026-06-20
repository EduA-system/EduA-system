---
name: read-docx
description: Read and extract content from a .docx file as Office Open XML (no Word, no pandoc, no python-docx). Use when a user asks to read, analyze, extract text/tables/headings or embedded images (diagrams, wireframes, use-case diagrams) from any .docx (SRS reports, specs, lesson plans, appendices). Works on Windows via Windows PowerShell 5.1+.
---

# Read DOCX

Read a `.docx` by treating it as a ZIP of Office Open XML (`word/document.xml`,
`word/media/*`), using the PowerShell scripts in `scripts/`. This needs no
Microsoft Word, no `pandoc`, and no `python-docx` — only Windows PowerShell,
which is always present on this team's Windows machines.

## When to use

- User asks to read / analyze / extract a `.docx` (e.g. "đọc file SRS Report3",
  "xem trong docx này có gì về lesson plan", "trích nội dung báo cáo").
- You need text + tables + headings from a spec/report.
- You need to SEE diagrams / wireframes / use-case / ERD images embedded in a
  `.docx` (the text extraction alone skips images).

## Prerequisites

- Windows PowerShell 5.1+ (`powershell.exe`). PowerShell 7 (`pwsh`) also works.
  Do NOT assume `pandoc` is installed — it is not on this machine.

## Step 1 — Extract text, tables, and headings

```pwsh
powershell.exe -NoProfile -ExecutionPolicy Bypass -File `
  ".codex/skills/read-docx/scripts/extract-text.ps1" `
  -Path "C:\path\to\file.docx"
```

Output (stdout):
- Plain paragraphs render as their text.
- Styled paragraphs (`Heading1..9`, `Title`, `TOC*`) get a `[Style] ` prefix.
- Tables render as `cell | cell` rows, wrapped in `<TABLE> ... </TABLE>`.
- Body blocks (paragraphs + tables) are in true document order.

Add `-IncludeExtras` to also dump `header/footer/footnotes/endnotes`.

Tip — pipe to a temp file, then `Grep` it instead of scrolling:

```pwsh
powershell.exe -NoProfile -ExecutionPolicy Bypass -File `
  ".codex/skills/read-docx/scripts/extract-text.ps1" -Path "<file>" `
  > _tmp_doc.txt
```

then `Grep` for keywords (e.g. `lesson.?plan`, `use case`, `BR-`), and
**delete `_tmp_doc.txt` when done** — it is a throwaway artifact, do not commit.

## Step 2 — Extract embedded images (diagrams, wireframes)

```pwsh
powershell.exe -NoProfile -ExecutionPolicy Bypass -File `
  ".codex/skills/read-docx/scripts/extract-media.ps1" `
  -Path "C:\path\to\file.docx" `
  -OutDir ".\_tmp_media"
```

Each `word/media/*` file is extracted to `-OutDir` (default:
`<docname>_media/` next to the docx). The script prints the absolute path of
every extracted file. Then **read the PNGs/JPEGs with the Read tool** (it can
view images) to actually SEE the diagrams. Clean up the temp media folder when
done.

## Encoding note

Some Vietnamese text in a docx may already be mojibake in the source (e.g.
`K?t n?i tri th?c` instead of `Kết nối tri thức`). That corruption is in the
original file, not caused by these scripts — the scripts preserve bytes as-is.
Report such cases to the user rather than "fixing" them.

## Paths in this repo

- Scripts: `.codex/skills/read-docx/scripts/extract-text.ps1`,
  `.codex/skills/read-docx/scripts/extract-media.ps1`.
- Sibling skill: `.codex/skills/edua-backend-layered-architecture/SKILL.md`.

## Quirks on Windows

- Call `powershell.exe` (5.1), not `pwsh` — `pwsh` is not installed here. Both
  scripts are written for 5.1+ (no `using` statement, explicit `.Dispose()`).
- Quote any path containing spaces or Vietnamese chars with double quotes.
- Paths on drive `H:\` (Google Drive shortcuts) are readable without extra
  permission; writing temp artifacts next to the docx may fail, so prefer a
  local `-OutDir` under the repo.

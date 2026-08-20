---
name: opencode-delegate
description: Hand mechanical, high-volume work to the locally installed opencode CLI instead of burning Claude quota on it — how to shape the brief, what opencode is allowed to write, and what must still be verified afterwards. Use when the user asks to use opencode, when they are running low on Claude usage, or when a task is long mechanical file editing whose correctness can be checked cheaply afterwards.
---

# Delegating work to opencode

opencode 1.18.18 is installed at `%APPDATA%\npm\opencode` and runs on the user's own
provider credits, so it is the right place for bulk mechanical work when Claude quota is
tight. Anything requiring judgement about *this* codebase still needs verification here.

## Invocation

```bash
opencode run "<brief>"          # non-interactive, prints the transcript to stdout
```

- Run it with `cd` set to the directory holding the working files; that directory is where
  its permissions are widest.
- Runs take minutes — give the Bash call a long timeout (600000) or run it in background.
- `opencode` with no arguments starts the TUI: **unusable here**, stdin is null so it hangs
  until timeout. Same for anything expecting keystrokes.
- Useful subcommands: `opencode session` (past sessions), `opencode stats` (token/cost),
  `opencode models`, `opencode providers`.

## What it may write

`~/.config/opencode/opencode.jsonc` grants `permission.external_directory` for two trees:

- `H:\.shortcut-targets-by-id\1c_y2P_yZ_gA3rn0pPGsXgvJ9CIoQaTm8\SEP490_SU26_G20\**` (team Drive docs)
- `D:\desktop_data\Tai_Lieu_FPT\SU26\do_an\main_code\**` (this repo)

Everything else is `"ask"`, which in a headless run means auto-rejected: the run prints
`permission requested: external_directory (...); auto-rejecting` and the command fails.
If a brief needs to write elsewhere, either add a narrow pattern to that config (Windows
path, `\\` escaped in JSON, `\*` for one level or `\**` recursive) or do that one step here.

Because those two trees are now writable without prompting, never end a brief with an
unverified write to Drive — keep a local copy of the original so an overwrite is reversible.

## Writing the brief

Two modes, and the difference matters:

**Mechanical mode** — you already decided the answer. Spell out every cell, path and value
in a table. Add the constraints that keep it from breaking things (e.g. "patch XML inside the
zip, never openpyxl round-trip") and a numbered verification step. It follows this accurately
and adapts sensibly: after a Google Sheets autosave renumbered every style id, it noticed and
rewrote its script to read the current style of each cell instead of the hardcoded ones.

**Judgement mode** — you want it to derive the answer from code. Then require:
- evidence: every branch or claim cited as `file:line`, listed in its report;
- an explicit ban on inventing branches that do not exist in the code;
- an explicit statement of the traps it should not inherit from the existing artefact.

That last point is the real failure mode. Asked to redesign a test sheet from the code, it
produced correct branch ordering and verbatim exception messages, but kept a fake "all-zero
UUID boundary" case from the old sheet because nothing told it that a one-UUID-parameter
method has no boundary domain. It optimises for matching the artefact it was shown.

## Always verify here

Cheap checks that catch its mistakes without redoing its work:

- re-read the produced file and diff the parts you specified;
- spot-check its `file:line` citations with grep;
- for archive formats, compare the entry list before/after;
- for anything published to Drive, re-read from the H: path afterwards and compare md5.

Its own summary is usually accurate about what it did, but it cannot tell you whether what
it did was right for this project.

## Cost split observed

On the Report5.1 audit: the expensive part was deriving 28 sheets' worth of findings from
the code (Claude subagents). opencode then did all the file surgery, repacking, verification
and publishing for effectively no Claude tokens. When quota is the constraint, push the
derivation into judgement-mode briefs and keep only review here.

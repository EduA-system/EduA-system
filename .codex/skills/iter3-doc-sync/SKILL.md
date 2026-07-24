---
name: iter3-doc-sync
description: Synchronize Iter3 documentation after code changes in this repo. Use when you change Iter3-related features, roles, routes, APIs, workflows, or naming and need to update the code checklist and related design docs so docs match the implementation.
---

# Iter3 Doc Sync

## Overview

Use this skill when Iter3 code changes are done and the docs must be brought back in line with the implementation.
Treat code as the source of truth, then update docs to match.

## Sync Rules

- Keep `ITER3_CODE_CHECKLIST.md` aligned with the current code reality.
- If code exists but the doc says the feature is missing, update the doc.
- If the doc says the feature exists but code does not, mark it `Partial` or `Not found`.
- Keep naming consistent across docs:
  - `Principal` for school-level account management in the project narrative.
  - `IT Staff` for prompt/system-prompt management.
  - Do not rename code enums or endpoints unless the implementation actually changed.
- Keep changes surgical. Update only the docs touched by the code change.

## Workflow

1. Identify the changed Iter3 area.
2. Read the matching code and the matching doc references in `references/iter3-doc-map.md`.
3. Update `ITER3_CODE_CHECKLIST.md` first.
4. Update related design docs, API docs, and role/route text.
5. Recheck terminology and status labels for consistency.
6. If a feature is still absent in code, keep the doc honest and mark it incomplete.

## What To Update

- `ITER3_CODE_CHECKLIST.md` for code-vs-doc status.
- `designs/account-management/*` for moderator/teacher/principal roles.
- `designs/auth/*` for RBAC wording and screen access.
- `designs/blog/*` and `designs/API_designs/blog.md` for blog workflows.
- `designs/API_designs/api-chung.md` when auth/RBAC/API rules change.
- Any other Iter3-related design note that names the affected route, role, or workflow.

## References

- Read `references/iter3-doc-map.md` before updating Iter3 docs.

# Iter3 Doc Map

Use this map to decide which documents must be updated after Iter3 code changes.

## Canonical status file

- `ITER3_CODE_CHECKLIST.md`

Update this file whenever:
- a feature moves from missing to partial/coded
- a route/API/workflow changes
- a role name or ownership label changes
- a doc claim becomes outdated

## Role and naming rules

- Use `Principal` in the repo narrative for school-level account management.
- Use `IT Staff` for prompt/system-prompt management.
- Keep code names unchanged unless the implementation was intentionally renamed.

## Feature -> docs

### Blog

Update when blog list/detail/create/edit/delete/comment/moderation changes:
- `designs/blog/blog-flow.md`
- `designs/API_designs/blog.md`
- `designs/API_designs/api-chung.md`
- `ITER3_CODE_CHECKLIST.md`

### Account management / RBAC

Update when moderator, teacher, principal, or IT role behavior changes:
- `designs/account-management/flow.md`
- `designs/account-management/*`
- `designs/auth/auth-flow.md`
- `designs/auth/rbac-screen-access.md`
- `designs/API_designs/auth.md`
- `designs/API_designs/account-management.md`
- `designs/API_designs/api-chung.md`
- `ITER3_CODE_CHECKLIST.md`

### IT Staff prompt management

Update when system prompts, prompt groups, or prompt access changes:
- `designs/auth/rbac-screen-access.md`
- `designs/API_designs/api-chung.md`
- any prompt-specific design note under `designs/`
- `ITER3_CODE_CHECKLIST.md`

### Community Hub / Classroom / Lesson approval / Notifications / Audit / Principal stats

If code is added for any of these, update:
- the matching design note under `designs/`
- the matching API design note under `designs/API_designs/`
- `ITER3_CODE_CHECKLIST.md`

If code is still missing, keep the checklist honest:
- `Not found` for absent modules
- `Partial` for partial UI/backend coverage

## Quick decision rule

1. Check whether the code change affects a route, role, API, workflow, or user-facing copy.
2. Update the checklist.
3. Update the narrowest matching design doc.
4. If terminology changed, update every doc that uses the old term.
5. Leave unrelated docs alone.

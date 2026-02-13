---
description: Always update documentation after any major code change
---

## Mandatory Documentation Update Rule

After **every major code change** (feature addition, feature removal, refactor, architecture change, store modification, new algorithm, deleted module), you MUST:

1. Identify all documentation files that reference the changed code. Key docs to check:
   - `docs/learning-science.md` — learning features, algorithms, equation tracker, AI coach
   - `docs/master-prompt.md` — stores, tech stack, file index, routing
   - `docs/generation-pipeline.md` — generation flow, stores, post-processing
   - `docs/content-storage.md` — storage architecture, API surface
   - `docs/type-system.md` — TypeScript types and interfaces
   - `docs/authentication.md` — auth flow, access control
   - `docs/README.md` — project structure, backend deps, DynamoDB tables
   - `src/features/README.md` — feature directory structure and key files

2. Update each affected doc to reflect the change:
   - Remove references to deleted features/files
   - Add references to new features/files
   - Update store descriptions if state shape changed
   - Update file paths if files were moved or renamed

3. Verify no stale references remain:
   - `grep` for the old feature/file name across `docs/` and `src/features/README.md`
   - Fix any remaining references

4. This rule is **non-negotiable** — never skip documentation updates after a major change.

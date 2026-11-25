# Aksora - Agent Rules

**Aksora** (formerly QA Daily Hub) is the workspace for engineering teams: test planning, execution, bug tracking, tasks/sprints, standups, and auto-generated weekly reports — all in one app. Built by Akusara Digital. Brand: **Aksora — One Team. One Flow.** Site: `aksora.akusaraproject.my.id`. Company: `https://akusaradigital.com`.

## Multi-Agent Git Safety & Local Commit Rule (MANDATORY)
1. **Commit Locally Often (Safety Net)**:
   - Setiap kali sebuah task/perbaikan selesai dan lulus verifikasi (`typecheck` & `test`), agen WAJIB langsung membuat local commit dengan conventional message (`fix: ...`, `feat: ...`, `refactor: ...`).
   - Stage **hanya file yang Anda ubah** (`git add <file1> <file2>`), hindari `git add -A` agar tidak tidak sengaja men-stage file setengah jadi milik agen lain.
   - JANGAN membiarkan file kotor mengendap di uncommitted working tree agar hasil kerja tidak tertimpa (*clobbered*) oleh agen lain yang bekerja di repo ini.
2. **No Auto-Push Remains Strict (Enforced by Git Hook)**:
   - Local commit bebas dan sangat dianjurkan setelah verifikasi lulus.
   - `git push` ke remote origin tetap DILARANG OTOMATIS tanpa instruksi eksplisit di turn tersebut (kata kunci "push"). Slang/afirmasi kasual ("gas", "lanjut", "sip") bukan izin untuk push.
   - Secara teknis, `.githooks/pre-push` memblokir semua `git push` kecuali dengan `AK_ALLOW_PUSH=1` (`$env:AK_ALLOW_PUSH="1"; git push`), versi `package.json` sudah di-bump, working tree bersih, dan `graphify-out/graph.json` terbaru tanpa folder snapshot lama.
3. **Hard Enforcement via `.githooks/`**:
   - `pre-commit`: memblokir file `.md` spec liar, file flat di `components/` root, file `.env`, UTF-8 BOM, dan TypeScript error (`tsc --noEmit`).
   - `commit-msg`: memblokir trailer `Co-Authored-By:` dan mewajibkan Conventional Commits.
   - `pre-push`: memblokir auto-push tanpa `AK_ALLOW_PUSH=1`, version bump, dan refresh graphify.
4. **Parallel Agents**: Jika menjalankan >1 agen bersamaan, gunakan worktree terpisah via `pnpm worktree:add <name>` (`pnpm worktree:list`, `pnpm worktree:remove <name>`).

## Versioning & Pre-Push (REQUIRED)
- **Every push to aksora project MUST bump `version` in `package.json`** (semver `MAJOR.MINOR.PATCH`). Include the version change in the same commit, then push.
- **Mandatory Pre-Push Graphify Update**: Sebelum push, WAJIB jalankan `/graphify --update` atau `pnpm graphify:update` (`python -m graphify update . --force`). Hapus snapshot/history lama di `graphify-out/` agar graph selalu bersih dan sinkron dengan codebase terbaru.
- Run `pnpm precheck` before any release push.

## Stack
Next.js 16.2 (App Router, Turbopack) · Tailwind v4 · `@phosphor-icons/react` (bold) · PostgreSQL (Docker lokal + Neon prod) via `lib/db.ts` · Driver: `pg` (lokal) / `@neondatabase/serverless` (Neon) · Roles: superadmin admin fe be fullstack qa pm ai

## File Placement

| Type | Location |
|------|----------|
| Feature component | `components/[domain]/` — create new folder if needed |
| Global hook | `hooks/` |
| Module-specific hook | `components/module/` (prefix `use-`) |
| Business logic | `lib/` |
| Page sub-component | co-locate in `app/[page]/` |
| **NEVER** put files flat in `components/` root | |

## Knowledge Graph / Graphify (MANDATORY)
- **MANDATORY**: Before fixing bugs, refactoring, or building new features, always consult `graphify-out/graph.json` or run `pnpm graphify:query "<target>"` (`python -m graphify query "<target>"`) / `graphify-out/GRAPH_REPORT.md` first.
- **Graph Rebuilding & Pre-Push**: Whenever file exports, dependencies, or architectural boundaries change — and **WAJIB sebelum push** — re-index via `/graphify --update` atau `pnpm graphify:update` (`python -m graphify update . --force`). Hapus folder/history snapshot lama di `graphify-out/` agar graph selalu bersih.
- **Subagent Rule (STRICT)**: Always run `graphify query "<target>"` YOURSELF before spawning any subagent. Extract the caller hierarchy, exact file paths, and line locations (`src=... loc=L...`) from the graph query and paste them directly into the subagent's prompt.
- **Strict Ban on Sweep-Reading**: NEVER spawn a subagent with broad/open-ended instructions that cause it to blindly grep, scan random directories, or sweep-read large files. Go straight to the pinpointed nodes using the knowledge graph.
- Pinpoint the exact files, caller hierarchies, and dependencies to touch. Do NOT waste context tokens scanning random files — go straight to the point using the knowledge graph.

## Markdown File Hygiene & Documentation (STRICT)
- **Zero-Spec Policy**: NEVER generate loose `.md` spec files, plan files, or scratch notes in repository folders (`.zcode/`, `docs/plans/`, root, etc.) — implement features directly in code. Temporary agent planning belongs only to brain artifacts outside the repo.
- **Prune Stale Markdown**: Delete obsolete `.md` files immediately (e.g. stale session plans, outdated architecture references like Prisma/SQLite). Keep all documentation lean, truthful, and reflective of the latest codebase state.
- **UI & In-App Copy in English**: All text and copy displayed to users in the UI, error messages, placeholders, labels, and in-app documentation must be strictly in English.

## Agent File Lookup

| Task | Check |
|------|-------|
| Module field | `lib/module-config-definitions.ts` → `lib/db-schema.ts` → form component |
| CRUD | `lib/data.ts` → `lib/data-helpers.ts` → `app/api/items/` |
| Dashboard | `lib/data.ts` (`data-dashboard-*.ts`) → `components/dashboard/` |
| Auth | `lib/auth.ts` → `lib/auth-core.ts` → `app/api/auth/` |
| Test management | `lib/test-management-data.ts` → `components/test-management/` |
| Search | `lib/search-index.ts` → `components/shared/search/` |
| Schema migration | `lib/db-schema.ts` → `lib/db-bootstrap.ts` |
| DB Reset & Health | `scripts/reset-db.mjs` (`pnpm db:reset`) → `scripts/db-schema-health.mjs` (`pnpm db:health`) |

## SQL & Database (CRITICAL)
- Postgres only — no SQLite, no branching.
- Double-quote camelCase columns: `"createdAt"` `"updatedAt"` `"deletedAt"` `"startDate"` `"endDate"` `"sprintId"` `"testPlanId"` `"testSuiteId"` `"publicToken"` `"suggestedDev"` `"totalCases"` `"bugType"` `"relatedItems"` `"relatedFeature"` `"lastRunAt"` `"automationResult"` `"typeCase"` `"preCondition"` `"caseName"` `"testStep"` `"expectedResult"` `"actualResult"` `"actionItems"` `"entityType"` `"entityId"`
- Parameterized queries only. `toPostgresQuery()` converts `?`→`$n`.
- Guard empty dates: `COALESCE(col, '') != ''`. Return early on empty `IN (...)`.
- Schema changes: create tables → add columns → create indexes.
- Database clean reset: use `pnpm db:reset` (automatically creates pre-wipe snapshot in `backups/`). Verify with `pnpm db:health`.

## Test Management Flow (STRICT)
- **Hierarchy & Auto-Suite Flow**: Alur pengujian di Aksora wajib mengikuti urutan hierarki: `Test Suite` → `Test Case` → `Test Execution (Test Runs)`.
- **First Case Auto-Suite**: Saat membuat Test Case pertama kali (atau tanpa suite terpilih), sistem WAJIB otomatis membuat dan menghubungkan `TestSuite` induk (e.g. `<Project> Test Suite` atau `General Test Suite`) agar test case tidak hilang/orphan dan langsung terlihat di daftar library.
- **Unified Views**: Halaman Test Cases (`/test-cases`) dan Test Runs (`/test-execution`) wajib memiliki mode tampilan yang selaras: Table view, Kanban view, dan Cards view.

## Worker & Code Hygiene Rules
1. **Strict Scope**: Modify ONLY the files and logic requested. Do not perform drive-by refactorings, UI restyling, or touching unrequested files.
2. **Preserve Character Encoding**: Dilarang merusak karakter non-ASCII (©, ·, —, é) atau menyisipkan BOM. Selalu gunakan internal edit tools atau `-Encoding utf8NoBOM`. Pastikan tidak ada mojibake setelah edit.
3. **No Hallucinated Constraints or Features**: Jangan pernah mengarang allowlist email, blocklist, approval gate, atau klaim restriksi akses di kode maupun copy UI tanpa instruksi eksplisit dan verifikasi kode sumber.
4. **Test Integrity**: Jangan mengubah test agar cocok dengan klaim/teks buatan sendiri. Dilarang menyembunyikan elemen dengan `hidden`, `sr-only`, atau `display: none` semata-mata untuk memanipulasi test agar lulus.
5. **Pre-Completion Verification & Fast Testing**: Selalu verifikasi sebelum melapor selesai:
   - `npx tsc --noEmit` — pastikan 0 error TypeScript baru.
   - `pnpm db:health` — pastikan 56 tabel sinkron jika ada perubahan skema DB.
   - `pnpm test` (atau `pnpm test <file>`) — menjalankan HANYA test terkait dan relevan secara otomatis berdasarkan git diff/status agar proses verifikasi cepat (<15s). JANGAN menjalankan full test suite (`pnpm test:all` atau `vitest run`) kecuali diminta full regression secara eksplisit.
6. **Filter by workspaceId**: Pastikan selalu filter berdasarkan `workspaceId` (kecuali superadmin). Log semua CRUD via `logActivity()`.
7. **Validate Session**: Validasi session pada setiap mutating route. Gunakan validasi Zod dari `lib/modules.ts`.
8. **API Standard**: `{ data }` untuk success, `{ error: string }` + status code untuk failure.
9. **Navigation**: Gunakan `router.refresh()`, jangan pernah `window.location.reload()`.
10. **UI Standard**: Tailwind v4 only, `@phosphor-icons/react` bold. Charts: `responsive-container.tsx`.
11. **Dates**: ISO 8601 tersimpan, `date-fns` untuk display, server UTC.
12. **DB → Client Serialization**: `JSON.parse(JSON.stringify(data))`.
13. **File Size Limit**: Max 400 lines/component, 600 lines/lib — split bila lebih besar.
14. **New Components**: WAJIB masuk folder domain dalam `components/[domain]/`.

## Do NOT (CRITICAL - STRICTLY ENFORCED)
- **NEVER git push to remote origin unless explicitly and unambiguously requested with the exact word "push". Slang, affirmations, or casual phrases (e.g., "gas", "gas semua", "lanjut", "oke", "mantap", "sip") MUST NEVER be interpreted as permission to push. (Note: Local commits are permitted and mandatory once verification passes).**
- **NEVER add a `Co-Authored-By` trailer (or any co-author credit) to commit messages.**
- Add packages without checking `package.json`.
- Add SQLite or `isPostgres` branching.
- Use `/test-case-management` — it's `/test-cases`.
- Generate `.md` spec files — implement directly.
- Run full test suites (`pnpm test:all` / `vitest run`) unless explicitly requested; always use fast relevant tests (`pnpm test`).
- Put files flat in `components/` root.
- Duplicate logic from `lib/data-helpers.ts` or `lib/utils.ts`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

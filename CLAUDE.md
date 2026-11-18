@AGENTS.md

## Knowledge Graph / Graphify (MANDATORY)
- **MANDATORY**: Before fixing bugs, investigating errors, refactoring, or starting any feature development, consult `graphify-out/graph.json` or run `pnpm graphify:query "<topic>"` (`python -m graphify query "<topic>"`) to locate the exact files, callers, and dependencies.
- **Graph Maintenance & Pre-Push**: Whenever exports, modules, or dependencies change — and **WAJIB sebelum push** — re-index via `/graphify --update` atau `pnpm graphify:update` (`python -m graphify update . --force`). Hapus folder/history snapshot lama di `graphify-out/` agar graph selalu bersih dan sinkron dengan codebase terbaru.
- **Subagent Rule (STRICT)**: Always run `graphify query "<target>"` YOURSELF before spawning any subagent. Extract the caller hierarchy, exact file paths, and line locations (`src=... loc=L...`) from the graph query and paste them directly into the subagent's prompt.
- **Strict Ban on Sweep-Reading**: NEVER spawn a subagent with broad/open-ended instructions that cause it to blindly grep, scan random directories, or sweep-read large files. Go straight to the pinpointed nodes using the knowledge graph.
- Never blindly search or dump large files into context. Go straight to the point using graphify to determine which exact files to modify and avoid token waste.

## Markdown Hygiene & Spec Ban
- **No Loose Markdown**: NEVER generate spec, plan, or note `.md` files in the codebase (`.zcode/`, `docs/`, root, etc.). Implement changes directly.
- **Prune Obsolete Docs**: Immediately remove outdated `.md` files (such as references to Prisma or SQLite) so documentation stays 100% truthful.
- **UI Copy**: All end-user text in UI and in-app docs must be in English.

## Worker & Code Safety
- **Strict Scope**: Modify only requested files and logic; no unprompted drive-by refactorings.
- **Preserve Encoding**: Never corrupt non-ASCII characters or introduce BOM (`-Encoding utf8NoBOM`).
- **No Hallucinated Gates**: Do not invent fake allowlists, blocklists, or access barriers.
- **Verification**: Run `npx tsc --noEmit` and `pnpm db:health` before concluding tasks.

## Multi-Agent Git Safety & Local Commit Rule (MANDATORY)
1. **Commit Locally Often (Safety Net)**:
   - Setiap kali sebuah task/perbaikan selesai dan lulus verifikasi (`typecheck` & `test`), agen WAJIB langsung membuat local commit dengan conventional message (`fix: ...`, `feat: ...`, `refactor: ...`).
   - JANGAN membiarkan file kotor mengendap di uncommitted working tree agar hasil kerja tidak tertimpa (*clobbered*) oleh agen lain yang bekerja di repo ini.
2. **No Auto-Push Remains Strict**:
   - Local commit bebas dan sangat dianjurkan setelah verifikasi lulus.
   - `git push` ke remote origin tetap DILARANG OTOMATIS tanpa instruksi eksplisit di turn tersebut (kata kunci "push").

## Git & Pre-Push Rules (CRITICAL)
- **Mandatory Pre-Push Routine**: Selalu jalankan `/graphify --update` atau `pnpm graphify:update` (`python -m graphify update . --force`) untuk menyegarkan knowledge graph (hapus history snapshot lama) dan bump `version` di `package.json` sebelum push.
- **NEVER git push to remote origin** unless explicitly instructed with the exact word "push". Casual affirmations ("gas", "lanjut", "sip") are NOT permission to push. Local commit is required once task passes verification.

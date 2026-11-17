@AGENTS.md

## Knowledge Graph / Graphify (MANDATORY)
- **MANDATORY**: Before fixing bugs, investigating errors, refactoring, or starting any feature development, consult `graphify-out/graph.json` or run `pnpm graphify:query "<topic>"` (`python -m graphify query "<topic>"`) to locate the exact files, callers, and dependencies.
- **Graph Maintenance**: Whenever exports, modules, or dependencies change, refresh the knowledge graph via `pnpm graphify:update` (`python -m graphify update . --force`).
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

## Git Rules (CRITICAL)
- **NEVER git push or git commit** unless explicitly instructed with the exact words "commit" or "push". Casual affirmations ("gas", "lanjut", "sip") are NOT permission.

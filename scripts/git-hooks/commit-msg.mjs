import fs from "node:fs";

const msgPath = process.argv[2];
if (!msgPath) {
  console.error("[commit-msg] Missing commit message file path.");
  process.exit(1);
}

const raw = fs.readFileSync(msgPath, "utf8");
const lines = raw
  .split(/\r?\n/)
  .map((l) => l.trimEnd())
  .filter((l) => !l.startsWith("#"));

const fullText = lines.join("\n").trim();
const subject = lines.find((l) => l.trim().length > 0)?.trim() ?? "";

if (!subject) {
  console.error("[commit-msg] BLOCKED: Commit message cannot be empty.");
  process.exit(1);
}

// 1. Strict ban on Co-Authored-By / co-author trailers (AGENTS.md)
if (/co-authored-by\s*:/i.test(fullText)) {
  console.error(
    "[commit-msg] BLOCKED: 'Co-Authored-By' trailer is strictly forbidden by AGENTS.md."
  );
  process.exit(1);
}

// 2. Enforce Conventional Commits (allow Merge / Revert commits too)
const conventionalPattern =
  /^(feat|fix|refactor|chore|docs|test|perf|style|ci|build|revert)(\([a-z0-9._& /,-]+\))?!?: .+/i;
const mergeOrRevertPattern = /^(Merge |Revert ")/;

if (!conventionalPattern.test(subject) && !mergeOrRevertPattern.test(subject)) {
  console.error(
    `[commit-msg] BLOCKED: Commit message must follow Conventional Commits.\n` +
      `  Received: "${subject}"\n` +
      `  Expected: "<type>(optional-scope): <description>"\n` +
      `  Types: feat, fix, refactor, chore, docs, test, perf, style, ci, build, revert`
  );
  process.exit(1);
}

process.exit(0);

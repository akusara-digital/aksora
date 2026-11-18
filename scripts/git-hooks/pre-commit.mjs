import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ALLOWED_ROOT_MD = new Set([
  "README.md",
  "AGENTS.md",
  "CLAUDE.md",
  "DESIGN.md",
  "CHANGELOG.md",
  "CONTRIBUTING.md",
  "LICENSE.md",
]);

const BOM_CHECK_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".md",
  ".css",
  ".html",
  ".yml",
  ".yaml",
  ".sh",
]);

function getStagedEntries() {
  const out = execFileSync(
    "git",
    ["diff", "--cached", "--name-status", "-z"],
    { encoding: "utf8" }
  );
  if (!out) return [];
  const tokens = out.split("\0").filter((t) => t.length > 0);
  const entries = [];
  for (let i = 0; i < tokens.length; i++) {
    const status = tokens[i];
    if (status.startsWith("R") || status.startsWith("C")) {
      const oldPath = tokens[++i];
      const newPath = tokens[++i];
      entries.push({ status: status[0], oldPath, filePath: newPath });
    } else {
      const filePath = tokens[++i];
      entries.push({ status: status[0], filePath });
    }
  }
  return entries;
}

const entries = getStagedEntries();
if (entries.length === 0) {
  process.exit(0);
}

const errors = [];
let hasTypeScriptChanges = false;

for (const { status, filePath } of entries) {
  if (!filePath) continue;
  const normalized = filePath.replace(/\\/g, "/");

  if (status === "D") continue;

  // 1. Block accidental .env secrets
  const baseName = path.basename(normalized);
  if (baseName.startsWith(".env") && baseName !== ".env.example") {
    errors.push(`Secret file staged: "${normalized}". Remove it from staging.`);
  }

  // 2. Zero-Spec Policy: block new loose .md files
  if (status === "A" && normalized.endsWith(".md")) {
    const isForbiddenDir =
      normalized.startsWith(".zcode/") ||
      normalized.startsWith("docs/plans/") ||
      normalized.startsWith("plans/") ||
      normalized.startsWith("specs/");
    const isRootMd = !normalized.includes("/");
    const isAllowedRoot =
      ALLOWED_ROOT_MD.has(normalized) || normalized.startsWith("antislop");

    if (isForbiddenDir || (isRootMd && !isAllowedRoot)) {
      errors.push(
        `Zero-Spec Policy violation: "${normalized}" is not allowed in the repository. Keep temporary plans outside the repo.`
      );
    }
  }

  // 3. No flat files in components/ root (must be inside components/[domain]/)
  if (
    status === "A" &&
    /^components\/[^/]+\.(tsx?|jsx?)$/i.test(normalized)
  ) {
    errors.push(
      `Component placement violation: "${normalized}" must be placed in a domain folder under components/[domain]/.`
    );
  }

  // 4. UTF-8 BOM check on staged blob content
  const ext = path.extname(normalized).toLowerCase();
  if (BOM_CHECK_EXTENSIONS.has(ext) || normalized.startsWith(".githooks/")) {
    try {
      const buf = execFileSync("git", ["show", `:${normalized}`], {
        maxBuffer: 20 * 1024 * 1024,
      });
      if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
        errors.push(
          `UTF-8 BOM detected in "${normalized}". Save with utf8NoBOM encoding (AGENTS.md encoding rule).`
        );
      }
      if (normalized.startsWith(".githooks/") && buf.includes(0x0d)) {
        errors.push(
          `CRLF line endings detected in "${normalized}". Git hooks must use LF line endings.`
        );
      }
    } catch {
      // Ignore binary/unreadable blobs
    }
  }

  if (ext === ".ts" || ext === ".tsx") {
    hasTypeScriptChanges = true;
  }
}

if (errors.length > 0) {
  console.error("[pre-commit] BLOCKED due to repository rule violations:\n");
  for (const err of errors) {
    console.error(`  - ${err}`);
  }
  process.exit(1);
}

// 5. TypeScript safety gate when .ts/.tsx files are staged
if (hasTypeScriptChanges && process.env.SKIP_TSC_HOOK !== "1") {
  const tscBin = path.resolve("node_modules/typescript/bin/tsc");
  if (fs.existsSync(tscBin)) {
    console.log("[pre-commit] Running TypeScript check (tsc --noEmit)...");
    try {
      execFileSync(process.execPath, [tscBin, "--noEmit"], {
        stdio: "inherit",
      });
    } catch {
      console.error(
        "\n[pre-commit] BLOCKED: TypeScript errors found. Fix errors before committing."
      );
      process.exit(1);
    }
  }
}

process.exit(0);

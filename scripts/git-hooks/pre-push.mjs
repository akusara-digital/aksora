import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

// 1. HARD BLOCK on Auto-Push (AGENTS.md / CLAUDE.md)
if (process.env.AK_ALLOW_PUSH !== "1") {
  console.error(
    "\n[pre-push] BLOCKED: Auto-push is disabled by Aksora repository policy.\n" +
      "  Only push when explicitly instructed by the user with the word \"push\".\n" +
      "  When explicitly authorized, run:\n" +
      "    PowerShell: $env:AK_ALLOW_PUSH=\"1\"; git push\n" +
      "    Bash:       AK_ALLOW_PUSH=1 git push\n"
  );
  process.exit(1);
}

const errors = [];

// 2. Ensure working tree has no uncommitted changes
try {
  const dirty = execFileSync("git", ["status", "--porcelain"], {
    encoding: "utf8",
  }).trim();
  if (dirty.length > 0) {
    errors.push(
      "Working tree is not clean. Commit or stash all local changes before pushing."
    );
  }
} catch {
  // Ignore if git status fails
}

// 3. Enforce package.json version bump compared to origin/main
try {
  const localPkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
  const remotePkgRaw = execFileSync("git", ["show", "origin/main:package.json"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  const remotePkg = JSON.parse(remotePkgRaw);

  // Only enforce bump if HEAD actually has commits ahead of origin/main
  const aheadCount = execFileSync(
    "git",
    ["rev-list", "--count", "origin/main..HEAD"],
    { encoding: "utf8" }
  ).trim();

  if (Number(aheadCount) > 0 && localPkg.version === remotePkg.version) {
    errors.push(
      `Version bump required: package.json version is still "${localPkg.version}" (same as origin/main). Bump semver version before pushing.`
    );
  }
} catch {
  // origin/main may not exist on fresh clones; skip gracefully
}

// 4. Enforce Graphify pre-push hygiene
const graphDir = path.resolve("graphify-out");
const graphJson = path.join(graphDir, "graph.json");

if (!fs.existsSync(graphJson)) {
  errors.push(
    "Missing graphify-out/graph.json. Run `pnpm graphify:update` before pushing."
  );
} else {
  // Check for stale dated snapshot folders (e.g. 2026-11-17)
  const entries = fs.readdirSync(graphDir, { withFileTypes: true });
  const staleDirs = entries
    .filter((e) => e.isDirectory() && /^\d{4}-\d{2}-\d{2}/.test(e.name))
    .map((e) => e.name);

  if (staleDirs.length > 0) {
    errors.push(
      `Stale snapshot folders found in graphify-out/: ${staleDirs.join(", ")}. Delete them and re-run \`pnpm graphify:update\`.`
    );
  }

  // Check freshness (must be updated within the last 60 minutes)
  const stat = fs.statSync(graphJson);
  const ageMinutes = (Date.now() - stat.mtimeMs) / 60000;
  if (ageMinutes > 60) {
    errors.push(
      `graphify-out/graph.json is ${Math.round(ageMinutes)} minutes old. Run \`pnpm graphify:update\` before pushing so the knowledge graph is fresh.`
    );
  }
}

if (errors.length > 0) {
  console.error("\n[pre-push] BLOCKED due to pre-push rule violations:\n");
  for (const err of errors) {
    console.error(`  - ${err}`);
  }
  console.error("");
  process.exit(1);
}

console.log("[pre-push] All Aksora pre-push gates passed.");
process.exit(0);

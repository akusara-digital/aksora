import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const [cmd, rawName] = process.argv.slice(2);
const repoRoot = process.cwd();
const parentDir = path.dirname(repoRoot);
const repoBase = path.basename(repoRoot);

function sanitizeName(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function usage() {
  console.log(`Usage:
  pnpm worktree:add <name>     Create isolated agent workspace at ../${repoBase}-<name>
  pnpm worktree:list           List all active git worktrees
  pnpm worktree:remove <name>  Remove agent workspace cleanly`);
}

if (cmd === "list") {
  execFileSync("git", ["worktree", "list"], { stdio: "inherit" });
  process.exit(0);
}

if (!rawName || (cmd !== "add" && cmd !== "remove")) {
  usage();
  process.exit(1);
}

const safeName = sanitizeName(rawName);
if (!safeName) {
  console.error("Invalid worktree name.");
  process.exit(1);
}

const targetDir = path.join(parentDir, `${repoBase}-${safeName}`);
const branchName = `agent/${safeName}`;

if (cmd === "add") {
  if (fs.existsSync(targetDir)) {
    console.error(`Directory already exists: ${targetDir}`);
    process.exit(1);
  }

  let branchExists = false;
  try {
    execFileSync("git", ["rev-parse", "--verify", branchName], {
      stdio: "ignore",
    });
    branchExists = true;
  } catch {
    branchExists = false;
  }

  const args = branchExists
    ? ["worktree", "add", targetDir, branchName]
    : ["worktree", "add", "-b", branchName, targetDir, "HEAD"];

  execFileSync("git", args, { stdio: "inherit" });

  // Copy local env files if present so dev/tests work immediately
  for (const envFile of [".env.local", ".env"]) {
    const src = path.join(repoRoot, envFile);
    const dst = path.join(targetDir, envFile);
    if (fs.existsSync(src) && !fs.existsSync(dst)) {
      fs.copyFileSync(src, dst);
      console.log(`Copied ${envFile} -> ${dst}`);
    }
  }

  console.log(`\nWorktree ready: ${targetDir} (branch: ${branchName})`);
  console.log("Git hooks (.githooks) are automatically shared with this worktree.");
  process.exit(0);
}

if (cmd === "remove") {
  execFileSync("git", ["worktree", "remove", targetDir], { stdio: "inherit" });
  execFileSync("git", ["worktree", "prune"], { stdio: "inherit" });
  console.log(`Removed worktree: ${targetDir}`);
  console.log(
    `Branch "${branchName}" kept for safety. Delete after merging with: git branch -d ${branchName}`
  );
  process.exit(0);
}

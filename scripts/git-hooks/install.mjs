import { execFileSync } from "node:child_process";
import fs from "node:fs";

if (!fs.existsSync(".git")) {
  process.exit(0);
}

try {
  execFileSync("git", ["config", "core.hooksPath", ".githooks"], {
    stdio: "inherit",
  });
} catch {
  // Non-fatal in CI/container builds without git
}

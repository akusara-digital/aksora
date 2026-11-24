#!/usr/bin/env node
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

function getVitestBin() {
  const pkgPath = require.resolve("vitest/package.json");
  return path.join(path.dirname(pkgPath), "vitest.mjs");
}

const CODE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
]);

const IGNORED_CONFIG_BASENAMES = new Set([
  "vitest.config.ts",
  "vitest.config.js",
  "vitest.config.mjs",
  "next.config.ts",
  "next.config.js",
  "next.config.mjs",
  "tsconfig.json",
  "package.json",
  "eslint.config.mjs",
  "eslint.config.js",
  "postcss.config.mjs",
]);

function isCodeFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const base = path.basename(filePath).toLowerCase();
  if (IGNORED_CONFIG_BASENAMES.has(base)) return false;
  return CODE_EXTENSIONS.has(ext);
}

function isTestFile(filePath) {
  const normalized = filePath.replace(/\\/g, "/");
  return (
    normalized.endsWith(".test.ts") ||
    normalized.endsWith(".test.tsx") ||
    normalized.endsWith(".spec.ts") ||
    normalized.endsWith(".spec.tsx") ||
    normalized.includes("/__tests__/")
  );
}

function findDirectTestCandidates(sourceFile) {
  const parsed = path.parse(sourceFile);
  const baseName = parsed.name;
  const dir = parsed.dir;
  const normDir = dir.replace(/\\/g, "/");

  const candidates = [
    path.join(dir, `${baseName}.test.ts`),
    path.join(dir, `${baseName}.test.tsx`),
    path.join(dir, `${baseName}.spec.ts`),
    path.join(dir, `${baseName}.spec.tsx`),
    path.join(dir, "__tests__", `${baseName}.test.ts`),
    path.join(dir, "__tests__", `${baseName}.test.tsx`),
  ];

  if (normDir.startsWith("app/api/")) {
    const sub = normDir.replace(/^app\/api\//, "");
    candidates.push(
      path.join("tests", "api", sub, `${baseName}.test.ts`),
      path.join("tests", "api", sub, `${baseName}.test.tsx`),
      path.join("tests", "api", sub, "route.test.ts")
    );
  } else if (normDir.startsWith("app/")) {
    const sub = normDir.replace(/^app\//, "");
    candidates.push(
      path.join("tests", "app", sub, `${baseName}.test.ts`),
      path.join("tests", "app", sub, `${baseName}.test.tsx`),
      path.join("tests", "app", `${baseName}.test.ts`),
      path.join("tests", "app", `${baseName}.test.tsx`),
      path.join("tests", "app", sub, "page.test.tsx"),
      path.join("tests", "app", sub, "route.test.ts")
    );
  } else if (normDir.startsWith("components/")) {
    const sub = normDir.replace(/^components\//, "");
    candidates.push(
      path.join("tests", "components", sub, `${baseName}.test.tsx`),
      path.join("tests", "components", sub, `${baseName}.test.ts`),
      path.join("tests", "components", `${baseName}.test.tsx`),
      path.join("tests", "components", `${baseName}.test.ts`)
    );
  } else if (normDir.startsWith("lib/")) {
    const sub = normDir.replace(/^lib\//, "");
    candidates.push(
      path.join("tests", "lib", sub, `${baseName}.test.ts`),
      path.join("tests", "lib", sub, `${baseName}.test.tsx`),
      path.join("tests", "lib", `${baseName}.test.ts`),
      path.join("tests", "lib", `${baseName}.test.tsx`)
    );
  }

  return Array.from(
    new Set(
      candidates
        .filter((c) => fs.existsSync(c))
        .map((c) => c.replace(/\\/g, "/"))
    )
  );
}

function getUncommittedChangedFiles() {
  try {
    const output = execFileSync("git", ["status", "--porcelain", "-uall"], {
      encoding: "utf8",
    });
    if (!output.trim()) return [];

    const files = [];
    const lines = output.split(/\r?\n/);
    for (const line of lines) {
      if (!line || line.length < 3) continue;
      const status = line.substring(0, 2);
      if (status.includes("D")) continue;

      let filePath = line.substring(3).trim();
      if (filePath.includes(" -> ")) {
        filePath = filePath.split(" -> ")[1].trim();
      }
      if (filePath.startsWith('"') && filePath.endsWith('"')) {
        filePath = filePath.slice(1, -1);
      }
      if (filePath && fs.existsSync(filePath) && isCodeFile(filePath)) {
        files.push(filePath.replace(/\\/g, "/"));
      }
    }
    return Array.from(new Set(files));
  } catch {
    return [];
  }
}

function getLatestCommitChangedFiles() {
  try {
    const output = execFileSync("git", ["diff", "--name-only", "--diff-filter=ACMR", "HEAD~1..HEAD"], {
      encoding: "utf8",
    });
    if (!output.trim()) return [];

    const files = output
      .split(/\r?\n/)
      .map((f) => f.trim())
      .filter((f) => f && fs.existsSync(f) && isCodeFile(f))
      .map((f) => f.replace(/\\/g, "/"));

    return Array.from(new Set(files));
  } catch {
    return [];
  }
}

function main() {
  const rawArgs = process.argv.slice(2);
  const vitestBin = getVitestBin();

  if (rawArgs.includes("--all") || rawArgs.includes("-a")) {
    const filteredArgs = rawArgs.filter((a) => a !== "--all" && a !== "-a");
    console.log("[test:relevant] Running full test suite (--all requested)...");
    const result = spawnSync(process.execPath, [vitestBin, "run", ...filteredArgs], {
      stdio: "inherit",
    });
    process.exit(result.status ?? 0);
  }

  const fileArgs = rawArgs.filter((arg) => !arg.startsWith("-"));
  const flagArgs = rawArgs.filter((arg) => arg.startsWith("-"));

  let targetFiles = [];

  if (fileArgs.length > 0) {
    targetFiles = fileArgs.map((f) => f.replace(/\\/g, "/"));
  } else {
    const uncommitted = getUncommittedChangedFiles();
    if (uncommitted.length > 0) {
      targetFiles = uncommitted;
      console.log(`[test:relevant] Detected ${targetFiles.length} changed file(s) in working tree:`);
    } else {
      const committed = getLatestCommitChangedFiles();
      if (committed.length > 0) {
        targetFiles = committed;
        console.log(`[test:relevant] Working tree clean. Detected ${targetFiles.length} file(s) in latest commit:`);
      }
    }
  }

  if (targetFiles.length === 0) {
    console.log("[test:relevant] No source code changes detected. All checks passed.");
    console.log("[test:relevant] Tip: Run 'pnpm test:all' to run the full test suite.");
    process.exit(0);
  }

  for (const f of targetFiles.slice(0, 6)) {
    console.log(`  - ${f}`);
  }
  if (targetFiles.length > 6) {
    console.log(`  ... and ${targetFiles.length - 6} more file(s)`);
  }

  const testsToRun = new Set();
  const unmappedSourceFiles = [];

  for (const file of targetFiles) {
    if (isTestFile(file)) {
      testsToRun.add(file);
    } else {
      const directCandidates = findDirectTestCandidates(file);
      if (directCandidates.length > 0) {
        for (const candidate of directCandidates) {
          testsToRun.add(candidate);
        }
      } else {
        unmappedSourceFiles.push(file);
      }
    }
  }

  const isWatch = flagArgs.includes("-w") || flagArgs.includes("--watch");
  const baseFlags = flagArgs.filter((a) => a !== "-w" && a !== "--watch");
  let cmdArgs = [];

  if (testsToRun.size > 0 && unmappedSourceFiles.length === 0) {
    console.log(`[test:relevant] Found ${testsToRun.size} directly related test file(s):`);
    for (const t of testsToRun) {
      console.log(`  ✓ ${t}`);
    }
    cmdArgs = [isWatch ? "watch" : "run", ...Array.from(testsToRun), ...baseFlags];
  } else if (unmappedSourceFiles.length > 0) {
    console.log(`[test:relevant] Running dependency-traced tests via Vitest related...`);
    cmdArgs = ["related", ...unmappedSourceFiles, ...Array.from(testsToRun)];
    if (!isWatch) {
      cmdArgs.push("--run");
    }
    cmdArgs.push(...baseFlags);
  } else {
    console.log("[test:relevant] No related test files found for changes. All checks passed.");
    process.exit(0);
  }

  const result = spawnSync(process.execPath, [vitestBin, ...cmdArgs], {
    stdio: "inherit",
  });

  process.exit(result.status ?? 0);
}

main();

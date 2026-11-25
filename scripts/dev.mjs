import { spawn } from "node:child_process";
import { readFileSync, existsSync, watch } from "node:fs";
import { resolve } from "node:path";
import net from "node:net";

function loadEnvironmentFiles() {
  for (const envFile of [".env.local", ".env"]) {
    const envPath = resolve(".", envFile);
    if (existsSync(envPath)) {
      const envContent = readFileSync(envPath, "utf-8");
      for (const line of envContent.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx < 0) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
        process.env[key] = value;
      }
    }
  }
}

loadEnvironmentFiles();

const dbUrl = process.env.DATABASE_URL || "";
if (!dbUrl.startsWith("postgres")) {
  console.error("\x1b[31m✗ DATABASE_URL is missing or invalid in .env\x1b[0m");
  console.error("  Expected: postgresql://user:password@host:port/database");
  console.error("  Run Docker: docker start aksora-db");
  process.exit(1);
}

const basePort = Number(process.env.PORT || 3001);
const maxPort = basePort + 20;

function isPortFree(port) {
  return new Promise((resolve) => {
    const tryHosts = ["127.0.0.1", "::"];
    let index = 0;

    const tryNext = () => {
      if (index >= tryHosts.length) {
        resolve(true);
        return;
      }

      const host = tryHosts[index++];
      const server = net.createServer();
      server.unref();
      server.once("error", () => {
        server.close(() => resolve(false));
      });
      server.listen({ host, port }, () => {
        server.close(() => tryNext());
      });
    };

    tryNext();
  });
}

async function findPort() {
  for (let port = basePort; port <= maxPort; port += 1) {
    if (await isPortFree(port)) return port;
  }
  throw new Error(`No free port found between ${basePort} and ${maxPort}`);
}

const port = await findPort();
console.log(`Starting Next.js dev server on port ${port}...`);

let child = null;
let isRestarting = false;

function startServer() {
  child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--port", String(port)], {
    stdio: "inherit",
    env: {
      ...process.env,
      PORT: String(port),
      NODE_OPTIONS: `${process.env.NODE_OPTIONS ? `${process.env.NODE_OPTIONS} ` : ""}--no-warnings`,
    },
  });

  child.on("exit", (code, signal) => {
    if (isRestarting) return;
    if (signal) process.kill(process.pid, signal);
    process.exit(code ?? 0);
  });
}

startServer();

// Watch .env and .env.local to reload credentials and restart dev server on change
let debounceTimer = null;
for (const envFile of [".env.local", ".env"]) {
  const envPath = resolve(".", envFile);
  if (existsSync(envPath)) {
    try {
      watch(envPath, () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          console.log(`\n\x1b[36mℹ ${envFile} changed. Reloading environment and restarting server...\x1b[0m`);
          loadEnvironmentFiles();
          isRestarting = true;
          if (child) {
            child.kill("SIGTERM");
          }
          setTimeout(() => {
            isRestarting = false;
            startServer();
          }, 800);
        }, 300);
      });
    } catch {
      // Ignore watch failure
    }
  }
}

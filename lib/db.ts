import { AsyncLocalStorage } from "async_hooks";
import {
  databaseUrl,
  tables,
} from "@/lib/db-schema";
import { toPostgresQuery, type PostgresClient, type PostgresPool } from "@/lib/db-query-utils";
import { ensureSchemaBootstrap } from "@/lib/db-bootstrap";

export { databaseUrl, schemaIndexSql, schemaSql, schemaTableSql, tables } from "@/lib/db-schema";

// Transaction context: while a db.transaction() callback runs, every db.query/db.get/db.run
// inside it (including deep helper calls) routes through the checked-out client, so the
// statements actually participate in the BEGIN/COMMIT. Falls back to the shared pool otherwise.
const txStorage = new AsyncLocalStorage<PostgresClient>();

const globalForDb = globalThis as unknown as {
  pgPool?: unknown;
  poolInitPromise?: Promise<unknown>;
  schemaInitPromise?: Promise<void>;
  schemaReady?: boolean;
};

async function refreshDevEnvironment(): Promise<string> {
  if (process.env.NODE_ENV !== "production" && typeof window === "undefined") {
    try {
      const fs = await import("node:fs");
      const path = await import("node:path");
      for (const envFile of [".env.local", ".env"]) {
        const envPath = path.resolve(process.cwd(), envFile);
        if (fs.existsSync(envPath)) {
          const content = fs.readFileSync(envPath, "utf-8");
          for (const line of content.split("\n")) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith("#")) continue;
            const eqIdx = trimmed.indexOf("=");
            if (eqIdx < 0) continue;
            const key = trimmed.slice(0, eqIdx).trim();
            const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
            if ((key === "DATABASE_URL" || key === "POSTGRES_URL") && val) {
              process.env[key] = val;
            }
          }
        }
      }
    } catch {
      // Safe fallback if fs is unavailable
    }
  }
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || databaseUrl;
}

export async function resetPostgresPool(): Promise<void> {
  const oldPool = globalForDb.pgPool as { end?: () => Promise<void> } | undefined;
  globalForDb.pgPool = undefined;
  globalForDb.poolInitPromise = undefined;
  if (oldPool?.end) {
    try {
      await oldPool.end();
    } catch {
      // Ignore cleanup error on closing stale pool
    }
  }
}

async function getPostgresPool() {
  if (globalForDb.pgPool) {
    return globalForDb.pgPool as PostgresPool;
  }
  if (!globalForDb.poolInitPromise) {
    globalForDb.poolInitPromise = (async () => {
      try {
        const activeUrl = await refreshDevEnvironment();
        const isNeon = activeUrl.includes("neon.tech") || activeUrl.includes("neon-");
        let connectionString = activeUrl;

        // auto-detect and switch to neon pooler host if neon.tech is used without -pooler
        if (isNeon && !connectionString.includes("-pooler")) {
          try {
            const urlObj = new URL(connectionString);
            if (urlObj.hostname.endsWith(".neon.tech") && !urlObj.hostname.includes("-pooler")) {
              const parts = urlObj.hostname.split(".");
              parts[0] = `${parts[0]}-pooler`;
              urlObj.hostname = parts.join(".");
              connectionString = urlObj.toString();
            }
          } catch {
            // Fallback to original connection string if parsing fails
          }
        }

        const isDev = process.env.NODE_ENV !== "production";
        const poolConfig = {
          connectionString,
          max: isDev ? 15 : (isNeon ? 5 : 10),
          min: isNeon ? 1 : 1,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: isNeon ? 15000 : 10000,
          allowExitOnIdle: true,
          statement_timeout: isNeon ? 15000 : 10000,
        };
        let pool;
        if (isNeon) {
          const { Pool } = await import("@neondatabase/serverless");
          pool = new Pool(poolConfig);
        } else {
          const { Pool } = await import("pg");
          pool = new Pool(poolConfig);
        }
        pool.on("error", (err: Error) => {
          const msg = err?.message || "";
          if (!msg || msg.includes("idle") || msg.includes("Connection terminated") || msg.includes("ECONNRESET") || msg.includes("closed")) {
            console.warn("[DB Pool] Idle client disconnected:", msg || "Connection closed by remote host");
          } else {
            console.error("[DB Pool] Unexpected error on idle client:", msg);
          }
        });
        globalForDb.pgPool = pool;
        return pool;
      } catch (err) {
        globalForDb.poolInitPromise = undefined;
        globalForDb.pgPool = undefined;
        throw err;
      }
    })();
  }
  return (await globalForDb.poolInitPromise) as PostgresPool;
}

async function ensureSchema() {
  if (globalForDb.schemaReady) return;
  // ponytail: ensure concurrent requests await the exact same bootstrap promise to prevent races
  if (!globalForDb.schemaInitPromise) {
    globalForDb.schemaInitPromise = ensureSchemaBootstrap({
      getPostgresPool,
      getSchemaInitPromise: () => globalForDb.schemaInitPromise,
      setSchemaInitPromise: (value) => {
        globalForDb.schemaInitPromise = value;
      },
    });
  }
  await globalForDb.schemaInitPromise;
  globalForDb.schemaReady = true;
}

function isTransientError(err: unknown): boolean {
  if (!err) return false;
  const code = typeof err === "object" && "code" in err ? String((err as { code: unknown }).code || "") : "";
  const message = err instanceof Error ? err.message : String(err);
  return (
    code === "57P01" ||
    code === "08006" ||
    code === "08001" ||
    code === "28P01" ||
    message.includes("ECONNRESET") ||
    message.includes("ETIMEDOUT") ||
    message.includes("timeout exceeded") ||
    message.includes("pool timeout") ||
    message.includes("connection timeout") ||
    message.includes("terminated due to connection timeout") ||
    message.includes("Connection terminated") ||
    message.includes("password authentication failed") ||
    message.includes("WebSocket is closed") ||
    message.includes("cannot send query after end") ||
    message.includes("client was closed")
  );
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function queryRaw<T>(queryStr: string, params: unknown[] = []): Promise<T[]> {
  const pgQuery = toPostgresQuery(queryStr);
  const tx = txStorage.getStore();
  if (tx) {
    const { rows } = await tx.query(pgQuery, params);
    return rows as T[];
  }

  let attempts = 0;
  while (true) {
    try {
      const pool = await getPostgresPool();
      const { rows } = await pool.query(pgQuery, params);
      return rows as T[];
    } catch (err) {
      attempts++;
      if (attempts <= 3 && isTransientError(err)) {
        await resetPostgresPool();
        const backoff = Math.min(500, 150 * Math.pow(2, attempts - 1) + Math.random() * 50);
        await sleep(backoff);
        continue;
      }
      throw err;
    }
  }
}

async function runRaw(queryStr: string, params: unknown[] = []): Promise<void> {
  const pgQuery = toPostgresQuery(queryStr);
  const tx = txStorage.getStore();
  if (tx) {
    await tx.query(pgQuery, params);
    return;
  }

  let attempts = 0;
  while (true) {
    try {
      const pool = await getPostgresPool();
      await pool.query(pgQuery, params);
      return;
    } catch (err) {
      attempts++;
      if (attempts <= 3 && isTransientError(err)) {
        await resetPostgresPool();
        const backoff = Math.min(500, 150 * Math.pow(2, attempts - 1) + Math.random() * 50);
        await sleep(backoff);
        continue;
      }
      throw err;
    }
  }
}

async function execRaw(queryStr: string): Promise<void> {
  const tx = txStorage.getStore();
  const statements = queryStr.split(";").filter((s) => s.trim());
  for (const s of statements) {
    try {
      if (tx) {
        await tx.query(toPostgresQuery(s));
      } else {
        const pool = await getPostgresPool();
        await pool.query(toPostgresQuery(s));
      }
    } catch (err: unknown) {
      if (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err.code === "42P07" || err.code === "23505")
      ) {
        continue;
      }
      throw err;
    }
  }
}

export type ListenClient = {
  query: (queryText: string, params?: unknown[]) => Promise<{ rows: unknown[] }>;
  on: (event: "notification", listener: (msg: { channel: string; payload?: string }) => void) => void;
  removeListener: (event: "notification", listener: (msg: { channel: string; payload?: string }) => void) => void;
  release: () => void;
};

// Dedicated connection for LISTEN/NOTIFY, entirely separate from the shared
// query pool. Two reasons this can't just be `pool.connect()`:
//  1. Our pool points at Neon's "-pooler" host (PgBouncer, transaction mode),
//     which does not reliably keep a LISTEN bound to one server connection —
//     notifications can silently go missing.
//  2. Checking a client out of the shared pool (max 5 on Neon) to hold it open
//     for a long-lived SSE stream starves the app's own queries of pool slots.
// The caller owns the lifetime and MUST call release() when done.
export async function acquireListenClient(): Promise<ListenClient> {
  const activeUrl = await refreshDevEnvironment();
  const isNeon = activeUrl.includes("neon.tech") || activeUrl.includes("neon-");

  let connectionString = activeUrl;
  if (isNeon) {
    try {
      const urlObj = new URL(activeUrl);
      if (urlObj.hostname.includes("-pooler")) {
        urlObj.hostname = urlObj.hostname.replace("-pooler", "");
        connectionString = urlObj.toString();
      }
    } catch {
      // Fall back to the configured URL if parsing fails
    }
  }

  const { Client } = isNeon ? await import("@neondatabase/serverless") : await import("pg");
  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 5000,
    keepAlive: true,
  }) as unknown as {
    connect: () => Promise<void>;
    query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[] }>;
    on: (event: string, listener: (...args: unknown[]) => void) => void;
    removeListener: (event: string, listener: (...args: unknown[]) => void) => void;
    end: () => Promise<void>;
  };

  // Prevent uncaughtException crashes if the socket terminates or gets disconnected unexpectedly
  client.on("error", (err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg || msg.includes("idle") || msg.includes("closed") || msg.includes("ECONNRESET") || msg.includes("Connection terminated")) {
      console.warn("[ListenClient] Connection closed:", msg || "Remote host closed connection");
    } else {
      console.error("[ListenClient] Connection error:", msg);
    }
  });

  await client.connect();

  return {
    query: (text, params) => client.query(text, params),
    on: (event, listener) => client.on(event, listener as (...args: unknown[]) => void),
    removeListener: (event, listener) => client.removeListener(event, listener as (...args: unknown[]) => void),
    release: () => {
      client.end().catch((err: Error) => {
        console.warn("[ListenClient] Error during client.end():", err.message);
      });
    },
  };
}

export const db = {
  async query<T>(queryStr: string, params: unknown[] = []): Promise<T[]> {
    await ensureSchema();
    return queryRaw<T>(queryStr, params);
  },

  async get<T>(queryStr: string, params: unknown[] = []): Promise<T | undefined> {
    const rows = await db.query<T>(queryStr, params);
    return rows[0];
  },

  async run(queryStr: string, params: unknown[] = []): Promise<void> {
    await ensureSchema();
    // All tables use SERIAL PRIMARY KEY — let Postgres assign "id". The explicit-id
    // machinery (SELECT MAX + retry) is gone: it cost an extra round-trip per write
    // and raced under concurrency. Callers needing the new id use db.get(... RETURNING).
    await runRaw(queryStr, params);
  },

  async exec(queryStr: string): Promise<void> {
    await execRaw(queryStr);
  },

  async transaction<T>(fn: (client?: PostgresClient) => Promise<T>): Promise<T> {
    await ensureSchema();
    const pool = await getPostgresPool();
    const client = await pool.connect();
    let hasError = false;
    try {
      await client.query("BEGIN");
      // Run fn with the client as the async-local tx context so any db.query/get/run
      // it triggers (including deep helpers) stays on this connection inside the BEGIN.
      const result = await txStorage.run(client, () => fn(client));
      await client.query("COMMIT");
      return result;
    } catch (err) {
      hasError = true;
      try {
        await client.query("ROLLBACK");
      } catch (rollbackErr) {
        console.error("[db.transaction] Rollback failed:", rollbackErr);
      }
      throw err;
    } finally {
      // Pass hasError so pg client is destroyed rather than returned to pool if damaged
      client.release(hasError ? true : undefined);
    }
  },
};

// Free-tier monitoring: connection pool usage + approximate row counts, for /api/health.
// Pool stats only exist after the pool has been touched; pg/@neondatabase expose these
// counters on the Pool instance.
export async function getDbHealthInfo() {
  const pool = await getPostgresPool();
  const p = pool as unknown as {
    totalCount?: number;
    idleCount?: number;
    waitingCount?: number;
    max?: number;
  };
  const conn =
    p.totalCount === undefined
      ? null
      : { total: p.totalCount, idle: p.idleCount ?? 0, waiting: p.waitingCount ?? 0, max: p.max ?? 0 };

  // Approximate row counts per table — one round-trip via the Postgres catalog
  // (n_live_tup is an estimate; plenty for spotting free-tier growth).
  let tableCounts: Record<string, number> = {};
  try {
    const names = tables.map((t) => t.name);
    const rows = await db.query<{ relname: string; n: number }>(
      `SELECT relname, n_live_tup as n FROM pg_stat_user_tables WHERE relname = ANY($1::text[])`,
      [names],
    );
    tableCounts = Object.fromEntries(rows.map((r) => [r.relname, Number(r.n ?? 0)]));
  } catch {
    tableCounts = {};
  }
  // Free Tier Storage diagnostics (512 MB limit)
  let storage = {
    usedBytes: 0,
    formatted: "0 MB",
    limitBytes: 512 * 1024 * 1024,
    percentUsed: 0,
    remainingMb: 512,
    status: "ok" as "ok" | "warning" | "critical",
  };

  try {
    const sizeRow = await db.get<{ bytes: string; formatted: string }>(
      `SELECT pg_database_size(current_database()) as bytes, pg_size_pretty(pg_database_size(current_database())) as formatted`
    );
    if (sizeRow?.bytes) {
      const bytes = Number(sizeRow.bytes);
      const limit = 512 * 1024 * 1024;
      const pct = Math.round((bytes / limit) * 10000) / 100;
      const remMb = Math.round((512 - bytes / 1024 / 1024) * 10) / 10;
      storage = {
        usedBytes: bytes,
        formatted: sizeRow.formatted || `${Math.round(bytes / 1024 / 1024)} MB`,
        limitBytes: limit,
        percentUsed: pct,
        remainingMb: Math.max(0, remMb),
        status: pct > 90 ? "critical" : pct > 75 ? "warning" : "ok",
      };
    }
  } catch {
    // Graceful fallback if database metadata query fails
  }

  return { conn, storage, tables: tableCounts };
}

export async function resetTables() {
  const tableNames = tables.map((table) => `"${table.name}"`);
  await db.exec(`TRUNCATE ${tableNames.join(", ")} RESTART IDENTITY CASCADE;`);
}

// Self-warm the database pool and verify schema in the background on server boot
// so the very first user query incurs zero cold-start delay.
if (typeof window === "undefined" && databaseUrl && process.env.NODE_ENV !== "test") {
  setTimeout(() => {
    ensureSchema().catch(() => {});
  }, 0);
}


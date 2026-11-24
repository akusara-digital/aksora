import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";

const root = process.cwd();
const env = { ...process.env };
const envFile = path.join(root, ".env");
if (fs.existsSync(envFile)) {
  const envText = fs.readFileSync(envFile, "utf8");
  Object.assign(
    env,
    Object.fromEntries(
      envText
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#") && line.includes("="))
        .map((line) => {
          const idx = line.indexOf("=");
          return [line.slice(0, idx).trim(), line.slice(idx + 1).trim().replace(/^"|"$/g, "")];
        })
    )
  );
}

const dbUrl = env.DATABASE_URL;
if (!dbUrl) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}

const client = new Client({
  connectionString: dbUrl,
  ssl: dbUrl.includes("sslmode=disable") ? false : { rejectUnauthorized: false },
});

await client.connect();

const dbSize = await client.query(`
  SELECT 
    pg_size_pretty(pg_database_size(current_database())) as formatted,
    pg_database_size(current_database()) as bytes
`);

const limitBytes = 512 * 1024 * 1024; // 512 MB Neon Free Tier
const usedBytes = Number(dbSize.rows[0].bytes);
const usedPercent = ((usedBytes / limitBytes) * 100).toFixed(2);

console.log("\n==========================================");
console.log("       AKSORA DATABASE STORAGE HEALTH      ");
console.log("==========================================");
console.log(`Used Storage : ${dbSize.rows[0].formatted} / 512 MB (${usedPercent}%)`);
console.log(`Remaining    : ${(512 - usedBytes / (1024 * 1024)).toFixed(1)} MB`);
console.log("==========================================\n");

const tableSizes = await client.query(`
  SELECT
    relname AS "table",
    pg_size_pretty(pg_total_relation_size(relid)) AS "total_size",
    pg_size_pretty(pg_relation_size(relid)) AS "table_size",
    pg_size_pretty(pg_total_relation_size(relid) - pg_relation_size(relid)) AS "index_size"
  FROM pg_catalog.pg_statio_user_tables
  ORDER BY pg_total_relation_size(relid) DESC
  LIMIT 15;
`);

console.log("Top 15 Largest Tables:");
console.table(tableSizes.rows);

const deadTuples = await client.query(`
  SELECT 
    relname AS "table", 
    n_dead_tup AS "dead_tuples", 
    n_live_tup AS "live_tuples",
    ROUND(n_dead_tup::numeric / NULLIF(n_dead_tup + n_live_tup, 0) * 100, 1) AS "dead_percent"
  FROM pg_stat_user_tables 
  WHERE n_dead_tup > 0
  ORDER BY n_dead_tup DESC 
  LIMIT 10;
`);

if (deadTuples.rows.length > 0) {
  console.log("\nDead Tuples (Bloat / Need Vacuum):");
  console.table(deadTuples.rows);
} else {
  console.log("\nZero dead tuples found. Database is completely compact.");
}

await client.end();

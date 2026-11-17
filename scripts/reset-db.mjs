import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";

const root = process.cwd();

// 1. Read .env
const envFile = path.join(root, ".env");
if (!fs.existsSync(envFile)) {
  console.error("No .env file found!");
  process.exit(1);
}

const envText = fs.readFileSync(envFile, "utf8");
const env = Object.fromEntries(
  envText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const idx = line.indexOf("=");
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim().replace(/^"|"$/g, "")];
    })
);

const databaseUrl = env.DATABASE_URL || env.POSTGRES_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not set in .env!");
  process.exit(1);
}

const client = new Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
console.log("Connected to PostgreSQL database:", client.database, "at", client.host);

// 2. Backup existing data
const backupDir = path.join(root, "backups");
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

console.log("Creating backup before wipe...");
const existingTablesRes = await client.query(
  "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
);

const backupData = {};
for (const row of existingTablesRes.rows) {
  const tbl = row.table_name;
  try {
    const res = await client.query(`SELECT * FROM "${tbl}"`);
    backupData[tbl] = res.rows;
  } catch (err) {
    console.warn(`Could not backup table ${tbl}:`, err.message);
  }
}

const backupPath = path.join(backupDir, `aksora_backup_neon_${Date.now()}.json`);
fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
console.log(`Backup saved to ${backupPath} (${Object.keys(backupData).length} tables backed up)`);

// 3. Drop and recreate schema public
console.log("Dropping existing schema public...");
await client.query("DROP SCHEMA IF EXISTS public CASCADE");
await client.query("CREATE SCHEMA public");
await client.query("GRANT ALL ON SCHEMA public TO public");
console.log("Fresh public schema created.");

// 4. Load schema tables and indexes
const { tables } = await import("../lib/db/db-schema-tables.ts");
const { indexSql } = await import("../lib/db/db-schema-indexes.ts");

function expandSchemaType(typeName) {
  if (typeName === "SERIAL_OR_PK") return "SERIAL PRIMARY KEY";
  if (typeName === "DATE_TYPE") return "TIMESTAMP";
  if (typeName === "FK_INT_SPRINT") return "INTEGER";
  return typeName;
}

// Order tables: parents first, then children with FK references
const createdTables = new Set();
const remainingTables = [...tables];
let iterations = 0;

console.log(`Creating ${tables.length} tables...`);
while (remainingTables.length > 0 && iterations < 100) {
  iterations++;
  let madeProgress = false;
  for (let i = 0; i < remainingTables.length; i++) {
    const t = remainingTables[i];
    const refs = [...t.schema.matchAll(/REFERENCES\s+"([^"]+)"/g)].map((m) => m[1]);
    const canCreate = refs.every((ref) => createdTables.has(ref));
    if (canCreate) {
      const expandedSchema = t.schema.replace(
        /SERIAL_OR_PK|DATE_TYPE|FK_INT_SPRINT/g,
        (match) => expandSchemaType(match)
      );
      const sql = `CREATE TABLE "${t.name}" (${expandedSchema});`;
      await client.query(sql);
      createdTables.add(t.name);
      remainingTables.splice(i, 1);
      madeProgress = true;
      break;
    }
  }
  if (!madeProgress) {
    // If circular or unresolved, force create next table without blocking
    const t = remainingTables.shift();
    const expandedSchema = t.schema.replace(
      /SERIAL_OR_PK|DATE_TYPE|FK_INT_SPRINT/g,
      (match) => expandSchemaType(match)
    );
    await client.query(`CREATE TABLE "${t.name}" (${expandedSchema});`);
    createdTables.add(t.name);
  }
}
console.log(`Successfully created ${createdTables.size} tables.`);

// 5. Create indexes
console.log("Creating indexes...");
const indexStatements = indexSql
  .split(";")
  .map((s) => s.trim())
  .filter(Boolean);

let indexSuccess = 0;
for (const statement of indexStatements) {
  try {
    await client.query(statement);
    indexSuccess++;
  } catch (err) {
    console.warn("Index warning:", err.message);
  }
}
console.log(`Successfully executed ${indexSuccess} / ${indexStatements.length} index statements.`);

// 6. Set migration version to current (14)
await client.query(
  `CREATE TABLE IF NOT EXISTS "_migrations" ("version" INTEGER NOT NULL, "appliedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)`
);
await client.query(`INSERT INTO "_migrations" ("version") VALUES (14)`);
console.log("Migration version set to 14.");

await client.end();
console.log("Database reset complete! Total clean slate ready.");

import { Pool } from 'pg';
import fs from 'fs';

let connectionString = process.env.DATABASE_URL;
if (!connectionString && fs.existsSync('.env')) {
  const match = fs.readFileSync('.env', 'utf8').match(/DATABASE_URL=(.+)/);
  if (match) connectionString = match[1].trim();
}

const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

async function run() {
  await pool.query(`DELETE FROM "WorkLog" WHERE description = 'Automated Edit Verification Test'`);
  const p = await pool.query('SELECT count(*) FROM "Project"');
  const t = await pool.query('SELECT count(*) FROM "Task"');
  const w = await pool.query('SELECT count(*) FROM "WorkLog"');
  const statuses = await pool.query('SELECT status, count(*) FROM "Task" GROUP BY status');
  console.log('Projects count:', p.rows[0].count);
  console.log('Tasks count:', t.rows[0].count);
  console.log('WorkLogs count:', w.rows[0].count);
  console.log('Task Statuses:', statuses.rows);
  await pool.end();
}

run().catch(console.error);

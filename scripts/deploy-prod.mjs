import fs from 'node:fs';
import { spawn } from 'node:child_process';

// 1. Resolve VERCEL_TOKEN
let token = process.env.VERCEL_TOKEN;
if (!token && fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf8');
  const match = envContent.match(/^VERCEL_TOKEN=(.*)$/m);
  if (match) {
    token = match[1].trim().replace(/^['"]|['"]$/g, '');
  }
}

if (!token) {
  console.error('[deploy:prod] Error: VERCEL_TOKEN not found in environment or .env');
  process.exit(1);
}

console.log('[deploy:prod] Starting Vercel Production Deployment for Aksora...');
console.log('[deploy:prod] Target: https://aksora-orpin.vercel.app');

const proc = spawn('npx', ['vercel', 'deploy', '--prod', '--yes', '--token', token], {
  cwd: process.cwd(),
  env: { ...process.env, VERCEL_TOKEN: token },
  stdio: 'inherit',
  shell: true
});

proc.on('close', async (code) => {
  if (code !== 0) {
    console.error(`[deploy:prod] Deployment failed with exit code ${code}`);
    process.exit(code);
  }

  console.log('\n[deploy:prod] Deployment finished. Verifying production health...');
  try {
    const res = await fetch('https://aksora-orpin.vercel.app/api/health');
    const data = await res.json();
    console.log('[deploy:prod] Production health status:', data);
    console.log('[deploy:prod] ✓ Live URL verified: https://aksora-orpin.vercel.app\n');
    process.exit(0);
  } catch (err) {
    console.warn('[deploy:prod] Warning: Could not verify /api/health immediately:', err.message);
    process.exit(0);
  }
});

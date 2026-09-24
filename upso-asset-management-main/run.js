#!/usr/bin/env node

import { spawn, execSync, exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';
const npxCmd = isWin ? 'npx.cmd' : 'npx';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  red: '\x1b[31m',
};

function log(msg, color = colors.reset) {
  console.log(`${color}${msg}${colors.reset}`);
}

function runSync(fullCmd, cwd, description) {
  log(`\n⏳ ${description}...`, colors.yellow);
  try {
    execSync(fullCmd, {
      cwd,
      stdio: 'inherit',
      env: { ...process.env },
    });
    log(`✅ ${description} completed.`, colors.green);
  } catch (error) {
    log(`❌ Error during ${description}: ${error.message}`, colors.red);
    throw error;
  }
}

async function ensureBackendEnv() {
  const backendDir = path.join(__dirname, 'backend');
  const envPath = path.join(backendDir, '.env');

  if (!fs.existsSync(envPath)) {
    log('⚙️  Creating backend .env configuration...', colors.cyan);
    const defaultEnv = `PORT=4000
DATABASE_URL="file:./dev.db"
JWT_SECRET="upso1-super-secret-jwt-key-2026"
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
EXCEL_INVENTORY_PATH=../Inventory Detail (1).xlsx
EXCEL_LOCATION_PATH=../Location code (2).xlsx
EXCEL_SR_PATH=../ServiceRequestReport-639195597679312838 (2).xlsx
`;
    fs.writeFileSync(envPath, defaultEnv, 'utf8');
    log('✅ Created backend/.env', colors.green);
  }
}

async function setupPrerequisites() {
  const backendDir = path.join(__dirname, 'backend');
  const frontendDir = path.join(__dirname, 'frontend');
  const backendNodeModules = path.join(backendDir, 'node_modules');
  const frontendNodeModules = path.join(frontendDir, 'node_modules');
  const dbPrismaPath = path.join(backendDir, 'prisma', 'dev.db');
  const dbRootPath = path.join(backendDir, 'dev.db');
  const dbExists = fs.existsSync(dbPrismaPath) || fs.existsSync(dbRootPath);
  const forceReseed = process.argv.includes('--reseed');

  log('\n==================================================', colors.bright + colors.blue);
  log('   UPSO-1 System: Checking Setup & Dependencies   ', colors.bright + colors.blue);
  log('==================================================', colors.bright + colors.blue);

  await ensureBackendEnv();

  // 1. Backend dependencies
  if (!fs.existsSync(backendNodeModules)) {
    runSync(`${npmCmd} install`, backendDir, 'Installing backend dependencies');
  }

  // 2. Database migration & seeding
  if (!dbExists || forceReseed) {
    log('📦 Initializing database schema and master data...', colors.cyan);
    runSync(`${npxCmd} prisma migrate deploy`, backendDir, 'Applying Prisma migrations');
    runSync(`${npxCmd} prisma generate`, backendDir, 'Generating Prisma Client');
    runSync('node src/scripts/import-data.js', backendDir, 'Importing Excel Master Data');
    runSync('node src/scripts/seed-users.js', backendDir, 'Seeding default users');
  } else {
    // Quick Prisma Client check
    const prismaClientPath = path.join(backendNodeModules, '@prisma', 'client');
    if (!fs.existsSync(prismaClientPath)) {
      runSync(`${npxCmd} prisma generate`, backendDir, 'Generating Prisma Client');
    }
  }

  // 3. Frontend dependencies
  if (!fs.existsSync(frontendNodeModules)) {
    runSync(`${npmCmd} install`, frontendDir, 'Installing frontend dependencies');
  }
}

async function checkUrlReady(url) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return res.status >= 200 && res.status < 500;
  } catch (err) {
    return false;
  }
}

async function waitForServices() {
  log('\n⏳ Waiting for services to initialize...', colors.yellow);
  let backendReady = false;
  let frontendReady = false;
  const startTime = Date.now();

  while (Date.now() - startTime < 30000) {
    if (!backendReady) backendReady = await checkUrlReady('http://127.0.0.1:4000/');
    if (!frontendReady) frontendReady = await checkUrlReady('http://127.0.0.1:5173/');
    if (backendReady && frontendReady) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

function openBrowser(url) {
  try {
    if (isWin) {
      exec(`start "" "${url}"`);
    } else if (process.platform === 'darwin') {
      exec(`open "${url}"`);
    } else {
      exec(`xdg-open "${url}"`);
    }
  } catch (err) {
    // Ignore browser open errors
  }
}

function killProcessTree(pid) {
  if (!pid) return;
  try {
    if (isWin) {
      execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' });
    } else {
      process.kill(-pid, 'SIGTERM');
    }
  } catch (e) {
    try {
      process.kill(pid, 'SIGKILL');
    } catch (e2) {
      // Ignore
    }
  }
}

function freePort(port) {
  try {
    if (isWin) {
      const output = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      const lines = output.trim().split('\n');
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 5 && (parts[1].endsWith(`:${port}`) || parts[1].includes(`:${port}`))) {
          const pid = parts[parts.length - 1];
          if (pid && pid !== '0' && pid !== String(process.pid)) {
            try {
              execSync(`taskkill /pid ${pid} /F`, { stdio: 'ignore' });
            } catch (e) {}
          }
        }
      }
    } else {
      execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`, { stdio: 'ignore', shell: true });
    }
  } catch (err) {
    // Port was already free
  }
}

async function main() {
  try {
    await setupPrerequisites();
  } catch (err) {
    log('\n❌ Setup failed. Please check the logs above.', colors.red);
    process.exit(1);
  }

  // Ensure ports 4000 and 5173 are free
  freePort(4000);
  freePort(5173);

  log('\n==================================================', colors.bright + colors.green);
  log('   🚀 Launching Backend and Frontend Services     ', colors.bright + colors.green);
  log('==================================================\n', colors.bright + colors.green);

  const backendDir = path.join(__dirname, 'backend');
  const frontendDir = path.join(__dirname, 'frontend');

  const backendProcess = spawn(`${npmCmd} run dev`, {
    cwd: backendDir,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
    detached: !isWin,
    env: { ...process.env, FORCE_COLOR: '1' },
  });

  const frontendProcess = spawn(`${npmCmd} run dev`, {
    cwd: frontendDir,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
    detached: !isWin,
    env: { ...process.env, FORCE_COLOR: '1' },
  });

  backendProcess.stdout.on('data', (data) => {
    const lines = data.toString().trimEnd().split('\n');
    for (const line of lines) {
      if (line.trim()) console.log(`${colors.cyan}[BACKEND]${colors.reset}  ${line}`);
    }
  });

  backendProcess.stderr.on('data', (data) => {
    const lines = data.toString().trimEnd().split('\n');
    for (const line of lines) {
      if (line.trim()) console.error(`${colors.magenta}[BACKEND]${colors.reset}  ${line}`);
    }
  });

  frontendProcess.stdout.on('data', (data) => {
    const lines = data.toString().trimEnd().split('\n');
    for (const line of lines) {
      if (line.trim()) console.log(`${colors.green}[FRONTEND]${colors.reset} ${line}`);
    }
  });

  frontendProcess.stderr.on('data', (data) => {
    const lines = data.toString().trimEnd().split('\n');
    for (const line of lines) {
      if (line.trim()) console.error(`${colors.yellow}[FRONTEND]${colors.reset} ${line}`);
    }
  });

  let shuttingDown = false;
  function shutdown() {
    if (shuttingDown) return;
    shuttingDown = true;
    log('\n🛑 Stopping all services...', colors.yellow);
    if (backendProcess.pid) killProcessTree(backendProcess.pid);
    if (frontendProcess.pid) killProcessTree(frontendProcess.pid);
    setTimeout(() => {
      log('👋 All services stopped cleanly.', colors.green);
      process.exit(0);
    }, 400);
  }

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  process.on('SIGHUP', shutdown);
  process.on('exit', shutdown);

  const ready = await waitForServices();

  console.log('\n');
  log('╔═══════════════════════════════════════════════════════════════════════════════════╗', colors.bright + colors.cyan);
  log('║                     UPSO-1 ASSET MANAGEMENT SYSTEM IS RUNNING                     ║', colors.bright + colors.cyan);
  log('╠═══════════════════════════════════════════════════════════════════════════════════╣', colors.bright + colors.cyan);
  log('║                                                                                   ║', colors.bright + colors.cyan);
  log('║   🌐 Web Application (Frontend):  http://localhost:5173                           ║', colors.bright + colors.green);
  log('║   🔌 REST API Server (Backend):   http://localhost:4000                           ║', colors.bright + colors.green);
  log('║                                                                                   ║', colors.bright + colors.cyan);
  log('║   🔑 Default Login Credentials:                                                   ║', colors.bright + colors.yellow);
  log('║      • Administrator:  admin@upso1.in      /  Admin@123                           ║', colors.yellow);
  log('║      • Standard User:  satyanshu@upso1.in  /  User@123                            ║', colors.yellow);
  log('║                                                                                   ║', colors.bright + colors.cyan);
  log('║   ⌨️  Press Ctrl + C in this terminal to stop all servers.                        ║', colors.dim + colors.cyan);
  log('╚═══════════════════════════════════════════════════════════════════════════════════╝', colors.bright + colors.cyan);
  console.log('\n');

  openBrowser('http://localhost:5173');
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});

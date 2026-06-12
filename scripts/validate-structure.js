#!/usr/bin/env node

/**
 * BTG v4 — Project Structure Validation Script
 *
 * Validates compliance with our engineering standards.
 * Checks what matters: module structure, CSS modules, env files.
 * Does NOT check for documentation files that belong in .kiro (private).
 *
 * Exit codes:
 * 0 = All checks passed
 * 1 = Structure violations found
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const colors = {
  reset:   '\x1b[0m',
  red:     '\x1b[31m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  blue:    '\x1b[34m',
  cyan:    '\x1b[36m',
  magenta: '\x1b[35m',
};

const projectRoot    = path.resolve(__dirname, '..');
let   totalViolations = 0;

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function violation(check, message, file = null) {
  totalViolations++;
  log(`\n❌ VIOLATION: ${check}`, 'red');
  log(`   ${message}`, 'yellow');
  if (file) log(`   File: ${file}`, 'cyan');
}

function pass(check, detail = '') {
  log(`✅ ${check}${detail ? ` (${detail})` : ''}`, 'green');
}

function exists(rel) {
  return fs.existsSync(path.join(projectRoot, rel));
}

function readDir(dir) {
  try { return fs.readdirSync(dir); } catch { return []; }
}

function findFiles(dir, pattern, results = []) {
  if (!fs.existsSync(dir)) return results;
  try {
    for (const item of fs.readdirSync(dir)) {
      if (['node_modules', '.git', '.kiro', 'coverage', 'dist'].includes(item)) continue;
      const full = path.join(dir, item);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) findFiles(full, pattern, results);
      else if (pattern.test(item)) results.push(full);
    }
  } catch {}
  return results;
}

// ── CHECK 1: Root directory ───────────────────────────────────────────────────
function checkRoot() {
  log('\n📁 CHECK 1: Root Directory', 'blue');
  log('─'.repeat(60), 'blue');

  const ALLOWED_FILES = [
    'README.md', '.gitignore', 'vercel.json', 'package.json',
    'package-lock.json', 'APPLICATION_READY.md',
  ];

  const ALLOWED_FOLDERS = [
    'backend', 'frontend', 'api', 'scripts',
    '.github', '.githooks', '.kiro', '.git', '.vscode',
    'node_modules',
    '.vercel', // gitignored — local Vercel CLI metadata, never committed
    'docs',    // project documentation — screenshots, architecture notes
  ];

  let violations = 0;
  for (const item of readDir(projectRoot)) {
    const full = path.join(projectRoot, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (!ALLOWED_FOLDERS.includes(item)) {
        violation('Root Directory', `Unexpected folder in root: ${item}`, item);
        violations++;
      }
    } else {
      // Only flag unexpected .md files (non-README)
      if (item.endsWith('.md') && !ALLOWED_FILES.includes(item)) {
        violation('Root Directory', `Unexpected markdown file in root: ${item}\n   Move to .kiro/session-notes/ or delete`, item);
        violations++;
      }
    }
  }

  if (violations === 0) pass('Root directory is clean');
  return violations;
}

// ── CHECK 2: CSS Module pairing ───────────────────────────────────────────────
function checkCSSModules() {
  log('\n🎨 CHECK 2: Frontend CSS Module Pairing', 'blue');
  log('─'.repeat(60), 'blue');

  const frontendSrc = path.join(projectRoot, 'frontend', 'src');
  if (!fs.existsSync(frontendSrc)) {
    log('⚠️  Frontend src not found, skipping', 'yellow');
    return 0;
  }

  // PDF components don't need CSS modules (they use react-pdf StyleSheet)
  const EXEMPT_PATTERNS = [
    /\/pdf\//,  // components/pdf/**
  ];

  const jsxFiles = [
    ...findFiles(path.join(frontendSrc, 'components'), /\.jsx$/),
    ...findFiles(path.join(frontendSrc, 'pages'), /\.jsx$/),
  ];

  let missing = 0;
  for (const jsx of jsxFiles) {
    const rel = path.relative(projectRoot, jsx);
    const isExempt = EXEMPT_PATTERNS.some(p => p.test(rel.replace(/\\/g, '/')));
    if (isExempt) continue;

    const css = jsx.replace(/\.jsx$/, '.module.css');
    if (!fs.existsSync(css)) {
      violation('CSS Module Pairing',
        `Component missing paired CSS module\n   Expected: ${path.basename(css)}`,
        rel);
      missing++;
    }
  }

  if (missing === 0) pass('All components have paired CSS modules', `${jsxFiles.length} checked`);
  return missing;
}

// ── CHECK 3: Backend module structure ─────────────────────────────────────────
function checkBackendModules() {
  log('\n🖥️  CHECK 3: Backend Module Structure', 'blue');
  log('─'.repeat(60), 'blue');

  const modulesDir = path.join(projectRoot, 'backend', 'src', 'modules');
  if (!fs.existsSync(modulesDir)) {
    log('⚠️  Backend modules not found, skipping', 'yellow');
    return 0;
  }

  let violations = 0;
  let checked    = 0;

  for (const mod of readDir(modulesDir)) {
    const modPath = path.join(modulesDir, mod);
    if (!fs.statSync(modPath).isDirectory()) continue;
    checked++;

    const files      = readDir(modPath);
    const hasRoutes  = files.some(f => f.endsWith('.routes.js'));
    const hasService = files.some(f => f.endsWith('.service.js'));

    if (!hasRoutes) {
      violation('Backend Module', `${mod}/ missing routes file`, `backend/src/modules/${mod}`);
      violations++;
    }
    if (!hasService) {
      violation('Backend Module', `${mod}/ missing service file`, `backend/src/modules/${mod}`);
      violations++;
    }
  }

  if (violations === 0) pass('Backend modules follow proper structure', `${checked} modules`);
  return violations;
}

// ── CHECK 4: Essential files ──────────────────────────────────────────────────
function checkEssentialFiles() {
  log('\n📄 CHECK 4: Essential Files', 'blue');
  log('─'.repeat(60), 'blue');

  const required = [
    'README.md',
    '.gitignore',
    'backend/package.json',
    'backend/index.js',
    'backend/.env.example',
    'backend/src/app.js',
    'frontend/package.json',
    'frontend/index.html',
    'frontend/.env.example',
    'api/index.js',
  ];

  let missing = 0;
  for (const file of required) {
    if (!exists(file)) {
      violation('Essential Files', `Required file missing: ${file}`, file);
      missing++;
    }
  }

  if (missing === 0) pass('All essential files exist', `${required.length} checked`);
  return missing;
}

// ── CHECK 5: No forbidden root folders ───────────────────────────────────────
function checkForbiddenFolders() {
  log('\n🚫 CHECK 5: Forbidden Folder Patterns', 'blue');
  log('─'.repeat(60), 'blue');

  const forbidden = ['src', 'components', 'utils', 'temp', 'old', 'backup'];
  let   violations = 0;

  for (const folder of forbidden) {
    const p = path.join(projectRoot, folder);
    if (fs.existsSync(p) && fs.statSync(p).isDirectory()) {
      violation('Forbidden Folders', `Folder not allowed in root: ${folder}/`, folder);
      violations++;
    }
  }

  if (violations === 0) pass('No forbidden folders found', `${forbidden.length} patterns checked`);
  return violations;
}

// ── Main ──────────────────────────────────────────────────────────────────────
function main() {
  log('\n╔════════════════════════════════════════════════════════╗', 'cyan');
  log('║   BTG v4 — Project Structure Validation                ║', 'cyan');
  log('╚════════════════════════════════════════════════════════╝', 'cyan');
  log(`\nProject Root: ${projectRoot}`, 'magenta');

  totalViolations += checkRoot();
  totalViolations += checkCSSModules();
  totalViolations += checkBackendModules();
  totalViolations += checkEssentialFiles();
  totalViolations += checkForbiddenFolders();

  log('\n' + '═'.repeat(60), 'cyan');
  log('VALIDATION SUMMARY', 'cyan');
  log('═'.repeat(60), 'cyan');

  if (totalViolations === 0) {
    log('\n✅ All structure checks passed!\n', 'green');
    process.exit(0);
  } else {
    log(`\n❌ Found ${totalViolations} violation(s). Fix before committing.\n`, 'red');
    process.exit(1);
  }
}

main();

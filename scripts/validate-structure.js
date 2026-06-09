#!/usr/bin/env node

/**
 * BTG v4 — Project Structure Validation Script
 * 
 * Validates compliance with PROJECT_STRUCTURE_RULES.md
 * 
 * Checks:
 * 1. Root directory only contains allowed files
 * 2. Frontend components have paired CSS modules
 * 3. Backend modules follow proper structure
 * 4. No forbidden folders exist
 * 5. Documentation is properly organized
 * 
 * Exit codes:
 * 0 = All checks passed
 * 1 = Structure violations found
 * 
 * Usage: node scripts/validate-structure.js
 * Or: npm run validate:structure
 */

const fs = require('fs');
const path = require('path');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Project root (parent of scripts/)
const projectRoot = path.resolve(__dirname, '..');

let totalViolations = 0;
let totalChecks = 0;

/**
 * Log formatted message
 */
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Report a violation
 */
function reportViolation(check, message, file = null) {
  totalViolations++;
  log(`\n❌ VIOLATION: ${check}`, 'red');
  log(`   ${message}`, 'yellow');
  if (file) {
    log(`   File: ${file}`, 'cyan');
  }
}

/**
 * Report check passed
 */
function reportPass(check, details = '') {
  totalChecks++;
  if (details) {
    log(`✅ ${check} (${details})`, 'green');
  } else {
    log(`✅ ${check}`, 'green');
  }
}

/**
 * Check if path exists
 */
function pathExists(relativePath) {
  return fs.existsSync(path.join(projectRoot, relativePath));
}

/**
 * Get all files/folders in directory
 */
function getDirectoryContents(dirPath) {
  try {
    return fs.readdirSync(dirPath);
  } catch (error) {
    return [];
  }
}

/**
 * Recursively find files matching pattern
 */
function findFiles(dir, pattern, results = []) {
  if (!fs.existsSync(dir)) return results;
  
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      // Skip node_modules and .git
      if (item === 'node_modules' || item === '.git' || item === '.kiro') {
        continue;
      }
      
      if (stat.isDirectory()) {
        findFiles(fullPath, pattern, results);
      } else if (pattern.test(item)) {
        results.push(fullPath);
      }
    }
  } catch (error) {
    // Skip directories we can't read
  }
  
  return results;
}

/**
 * CHECK 1: Root directory only contains allowed files
 */
function checkRootFiles() {
  log('\n📁 CHECK 1: Root Directory Files', 'blue');
  log('─'.repeat(60), 'blue');
  
  const allowedFiles = [
    'README.md',
    'CONTRIBUTING.md',
    'CODE_STYLE.md',
    'LICENSE',
    'CHANGELOG.md',
    '.gitignore',
    'vercel.json',
    'PROJECT_STRUCTURE_RULES.md',
    'DOCUMENTATION_STRUCTURE.md',
    'IMPORTED_CRITICAL_FILES.md',
    'verify-session-04.js', // Temporary verification script
  ];
  
  const allowedFolders = [
    'docs',
    'backend',
    'frontend',
    'api',
    '.github',
    '.githooks', // Git hooks (tracked)
    '.kiro',
    '.git',
    'scripts', // New folder for automation scripts
  ];
  
  const forbiddenFiles = [
    /SESSION.*\.md$/i,
    /COMPLETION.*\.md$/i,
    /QUICK_REFERENCE.*\.md$/i,
    /TESTING.*\.md$/i,
    /TASK.*\.md$/i,
    /DASHBOARD.*\.md$/i,
    /CHECKPOINT.*\.md$/i,
  ];
  
  const rootContents = getDirectoryContents(projectRoot);
  let checkPassed = true;
  
  for (const item of rootContents) {
    const itemPath = path.join(projectRoot, item);
    const stat = fs.statSync(itemPath);
    
    if (stat.isDirectory()) {
      if (!allowedFolders.includes(item)) {
        reportViolation(
          'Root Directory',
          `Forbidden folder found in root: ${item}`,
          item
        );
        checkPassed = false;
      }
    } else {
      // Check if file is explicitly allowed
      if (!allowedFiles.includes(item)) {
        // Check if it matches forbidden patterns
        const isForbidden = forbiddenFiles.some(pattern => pattern.test(item));
        
        if (isForbidden) {
          reportViolation(
            'Root Directory',
            `Forbidden file pattern found: ${item}\n   Should be moved to docs/internal/`,
            item
          );
          checkPassed = false;
        } else if (item.endsWith('.md')) {
          reportViolation(
            'Root Directory',
            `Undocumented markdown file in root: ${item}\n   Add to allowed list or move to docs/`,
            item
          );
          checkPassed = false;
        }
        // Allow other non-MD files (package-lock, etc)
      }
    }
  }
  
  if (checkPassed) {
    reportPass('Root directory is clean', `${rootContents.length} items checked`);
  }
  
  return checkPassed ? 0 : 1;
}

/**
 * CHECK 2: Frontend components have paired CSS modules
 */
function checkCSSModules() {
  log('\n🎨 CHECK 2: Frontend CSS Module Pairing', 'blue');
  log('─'.repeat(60), 'blue');
  
  const frontendSrc = path.join(projectRoot, 'frontend', 'src');
  
  if (!fs.existsSync(frontendSrc)) {
    log('⚠️  Frontend src folder not found, skipping check', 'yellow');
    return 0;
  }
  
  // Find all .jsx files in components and pages
  const componentsDir = path.join(frontendSrc, 'components');
  const pagesDir = path.join(frontendSrc, 'pages');
  
  const jsxFiles = [
    ...findFiles(componentsDir, /\.jsx$/),
    ...findFiles(pagesDir, /\.jsx$/),
  ];
  
  let missingCount = 0;
  
  for (const jsxFile of jsxFiles) {
    const cssModuleFile = jsxFile.replace(/\.jsx$/, '.module.css');
    
    if (!fs.existsSync(cssModuleFile)) {
      const relativePath = path.relative(projectRoot, jsxFile);
      reportViolation(
        'CSS Module Pairing',
        `Component missing paired CSS module\n   Expected: ${path.basename(cssModuleFile)}`,
        relativePath
      );
      missingCount++;
    }
  }
  
  if (missingCount === 0) {
    reportPass('All components have paired CSS modules', `${jsxFiles.length} components checked`);
  }
  
  return missingCount;
}

/**
 * CHECK 3: Backend modules follow proper structure
 */
function checkBackendModules() {
  log('\n🖥️  CHECK 3: Backend Module Structure', 'blue');
  log('─'.repeat(60), 'blue');
  
  const modulesDir = path.join(projectRoot, 'backend', 'src', 'modules');
  
  if (!fs.existsSync(modulesDir)) {
    log('⚠️  Backend modules folder not found, skipping check', 'yellow');
    return 0;
  }
  
  const modules = getDirectoryContents(modulesDir);
  let violationCount = 0;
  let modulesChecked = 0;
  
  for (const moduleName of modules) {
    const modulePath = path.join(modulesDir, moduleName);
    const stat = fs.statSync(modulePath);
    
    if (!stat.isDirectory()) continue;
    
    modulesChecked++;
    const moduleFiles = getDirectoryContents(modulePath);
    
    // Expected files for a module
    const expectedFiles = [
      `${moduleName}.routes.js`,
      `${moduleName}.controller.js`,
      `${moduleName}.service.js`,
    ];
    
    // Check if module has at least routes and controller
    const hasRoutes = moduleFiles.some(f => f.endsWith('.routes.js'));
    const hasController = moduleFiles.some(f => f.endsWith('.controller.js'));
    
    if (!hasRoutes) {
      reportViolation(
        'Backend Module Structure',
        `Module missing routes file\n   Expected: ${moduleName}.routes.js`,
        path.join('backend', 'src', 'modules', moduleName)
      );
      violationCount++;
    }
    
    if (!hasController) {
      reportViolation(
        'Backend Module Structure',
        `Module missing controller file\n   Expected: ${moduleName}.controller.js`,
        path.join('backend', 'src', 'modules', moduleName)
      );
      violationCount++;
    }
  }
  
  if (violationCount === 0 && modulesChecked > 0) {
    reportPass('Backend modules follow proper structure', `${modulesChecked} modules checked`);
  }
  
  return violationCount;
}

/**
 * CHECK 4: No forbidden folders exist
 */
function checkForbiddenFolders() {
  log('\n🚫 CHECK 4: Forbidden Folder Patterns', 'blue');
  log('─'.repeat(60), 'blue');
  
  const forbiddenFolders = [
    'src',          // No root src/ folder
    'components',   // No root components/ folder
    'utils',        // No root utils/ folder
    'temp',         // No temp/ folder
    'old',          // No old/ folder
    'backup',       // No backup/ folder
    'dist',         // No root dist/ folder
    'build',        // No root build/ folder
  ];
  
  let violationCount = 0;
  
  for (const folder of forbiddenFolders) {
    const folderPath = path.join(projectRoot, folder);
    if (fs.existsSync(folderPath) && fs.statSync(folderPath).isDirectory()) {
      reportViolation(
        'Forbidden Folders',
        `Forbidden folder found: ${folder}/\n   This folder type is not allowed in project root`,
        folder
      );
      violationCount++;
    }
  }
  
  if (violationCount === 0) {
    reportPass('No forbidden folders found', `${forbiddenFolders.length} patterns checked`);
  }
  
  return violationCount;
}

/**
 * CHECK 5: Documentation is properly organized
 */
function checkDocumentationStructure() {
  log('\n📚 CHECK 5: Documentation Structure', 'blue');
  log('─'.repeat(60), 'blue');
  
  const docsDir = path.join(projectRoot, 'docs');
  
  if (!fs.existsSync(docsDir)) {
    reportViolation(
      'Documentation Structure',
      'docs/ folder is missing\n   MUST EXIST per PROJECT_STRUCTURE_RULES.md',
      'docs/'
    );
    return 1;
  }
  
  // Required top-level docs folders
  const requiredFolders = [
    'getting-started',
    'architecture',
    'api',
    'guides',
    'security',
    'internal',
  ];
  
  let violationCount = 0;
  
  for (const folder of requiredFolders) {
    const folderPath = path.join(docsDir, folder);
    if (!fs.existsSync(folderPath)) {
      reportViolation(
        'Documentation Structure',
        `Required docs folder missing: ${folder}/\n   MUST EXIST per PROJECT_STRUCTURE_RULES.md`,
        path.join('docs', folder)
      );
      violationCount++;
    }
  }
  
  // Check that internal/ has proper subfolders
  const internalDir = path.join(docsDir, 'internal');
  if (fs.existsSync(internalDir)) {
    const requiredInternalFolders = ['session-notes', 'completion-status'];
    
    for (const folder of requiredInternalFolders) {
      const folderPath = path.join(internalDir, folder);
      if (!fs.existsSync(folderPath)) {
        reportViolation(
          'Documentation Structure',
          `Required internal docs folder missing: internal/${folder}/`,
          path.join('docs', 'internal', folder)
        );
        violationCount++;
      }
    }
  }
  
  if (violationCount === 0) {
    reportPass('Documentation structure is correct', 'All required folders exist');
  }
  
  return violationCount;
}

/**
 * CHECK 6: Essential files exist
 */
function checkEssentialFiles() {
  log('\n📄 CHECK 6: Essential Files', 'blue');
  log('─'.repeat(60), 'blue');
  
  const essentialFiles = [
    'README.md',
    'CONTRIBUTING.md',
    'CODE_STYLE.md',
    'PROJECT_STRUCTURE_RULES.md',
    'DOCUMENTATION_STRUCTURE.md',
    '.gitignore',
    'vercel.json',
    'backend/package.json',
    'backend/index.js',
    'backend/.env.example',
    'frontend/package.json',
    'frontend/index.html',
    'frontend/.env.example',
    'api/index.js',
  ];
  
  let missingCount = 0;
  
  for (const file of essentialFiles) {
    if (!pathExists(file)) {
      reportViolation(
        'Essential Files',
        `Required file missing: ${file}\n   MUST EXIST per PROJECT_STRUCTURE_RULES.md`,
        file
      );
      missingCount++;
    }
  }
  
  if (missingCount === 0) {
    reportPass('All essential files exist', `${essentialFiles.length} files checked`);
  }
  
  return missingCount;
}

/**
 * Main execution
 */
function main() {
  log('\n╔═══════════════════════════════════════════════════════════╗', 'cyan');
  log('║   BTG v4 — Project Structure Validation                  ║', 'cyan');
  log('╚═══════════════════════════════════════════════════════════╝', 'cyan');
  
  log(`\nProject Root: ${projectRoot}`, 'magenta');
  log(`Timestamp: ${new Date().toISOString()}`, 'magenta');
  
  // Run all checks
  totalViolations += checkRootFiles();
  totalViolations += checkCSSModules();
  totalViolations += checkBackendModules();
  totalViolations += checkForbiddenFolders();
  totalViolations += checkDocumentationStructure();
  totalViolations += checkEssentialFiles();
  
  // Summary
  log('\n' + '═'.repeat(60), 'cyan');
  log('VALIDATION SUMMARY', 'cyan');
  log('═'.repeat(60), 'cyan');
  
  if (totalViolations === 0) {
    log('\n✅ SUCCESS: All structure rules passed!', 'green');
    log(`   ${totalChecks} checks completed`, 'green');
    log('\n   Project structure is compliant with PROJECT_STRUCTURE_RULES.md', 'green');
    process.exit(0);
  } else {
    log(`\n❌ FAILED: Found ${totalViolations} structure violation(s)`, 'red');
    log('\n   Please fix violations to comply with PROJECT_STRUCTURE_RULES.md', 'yellow');
    log('   See above for details on each violation\n', 'yellow');
    process.exit(1);
  }
}

// Run validation
main();

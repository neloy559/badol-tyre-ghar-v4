# BTG v4 — Git Hooks

**Purpose:** Automated enforcement of project standards and structure rules.

**Status:** Active  
**Last Updated:** June 9, 2026

---

## 🎯 Overview

Git hooks are scripts that run automatically at specific points in the Git workflow. BTG v4 uses hooks to enforce structure rules and maintain code quality.

**Automation Principle:** Enforce rules at the gate. Prevent violations from entering codebase.

---

## 📋 Available Hooks

### Pre-Commit Hook ✅

**Trigger:** Before every `git commit`  
**Purpose:** Validates project structure compliance  
**Script Files:**
- `pre-commit` (Unix/Mac/Linux)
- `pre-commit.ps1` (Windows PowerShell)

**What It Checks:**
- ✅ Root directory only contains allowed files
- ✅ Frontend components have paired CSS modules
- ✅ Backend modules follow proper structure
- ✅ No forbidden folder patterns exist
- ✅ Documentation structure is correct
- ✅ Essential files are present

**Behavior:**
- **Pass:** Commit proceeds normally
- **Fail:** Commit is blocked, violations shown

---

## 🛠️ Installation

### One-Time Setup (Required)

Run these commands from the project root:

```bash
# Configure git to use .githooks directory
git config core.hooksPath .githooks
```

**Unix/Mac/Linux Only:** Make hooks executable:
```bash
chmod +x .githooks/pre-commit
```

**Windows:** PowerShell hooks are executable by default.

### Verification

Test that the hook is configured correctly:

```bash
# Check git config
git config core.hooksPath
# Should output: .githooks

# Test the hook manually
node scripts/validate-structure.js
# Should show validation results
```

---

## 🚀 Usage

Hooks run automatically. No manual action required.

### Normal Workflow

```bash
# Make changes
vim frontend/src/components/MyComponent/MyComponent.jsx

# Stage changes
git add .

# Commit (hook runs automatically)
git commit -m "feat: add MyComponent"
```

**If structure is valid:**
```
╔════════════════════════════════════════════════════════╗
║  BTG v4 — Pre-Commit Structure Validation             ║
╚════════════════════════════════════════════════════════╝

🔍 Running structure validation...

✅ Root directory is clean (17 items checked)
✅ All components have paired CSS modules (34 components checked)
✅ Backend modules follow proper structure (6 modules checked)
✅ No forbidden folders found (8 patterns checked)
✅ Documentation structure is correct
✅ All essential files exist (14 files checked)

╔════════════════════════════════════════════════════════╗
║  ✅ Structure Validation Passed                        ║
╚════════════════════════════════════════════════════════╝

Your commit meets all structure requirements.
Proceeding with commit...

[main abc123d] feat: add MyComponent
 2 files changed, 50 insertions(+)
```

**If structure has violations:**
```
╔════════════════════════════════════════════════════════╗
║  BTG v4 — Pre-Commit Structure Validation             ║
╚════════════════════════════════════════════════════════╝

🔍 Running structure validation...

❌ VIOLATION: CSS Module Pairing
   Component missing paired CSS module
   Expected: MyComponent.module.css
   File: frontend/src/components/MyComponent/MyComponent.jsx

╔════════════════════════════════════════════════════════╗
║  ❌ COMMIT BLOCKED: Structure Violations Found        ║
╚════════════════════════════════════════════════════════╝

Your commit has been blocked because structure rule
violations were detected.

📋 Next Steps:
   1. Review the violations listed above
   2. Fix each violation (move files, add missing files, etc.)
   3. Stage your fixes: git add <files>
   4. Try committing again: git commit

💡 Tips:
   • Check PROJECT_STRUCTURE_RULES.md for guidelines
   • Run 'npm run validate:structure' to test fixes
   • Ask for help if violations are unclear
```

---

## 🔧 Troubleshooting

### Hook Not Running

**Problem:** Commits succeed without validation running.

**Solutions:**
1. Verify git config:
   ```bash
   git config core.hooksPath
   # Should output: .githooks
   ```

2. Re-run setup:
   ```bash
   git config core.hooksPath .githooks
   ```

3. Check hook file exists:
   ```bash
   # Unix/Mac
   ls -la .githooks/pre-commit
   
   # Windows
   dir .githooks\pre-commit.ps1
   ```

---

### Hook Fails with "Command Not Found"

**Problem:** Hook can't find `node` or `npm`.

**Solution:** Ensure Node.js is in your PATH:
```bash
# Test node is available
node --version

# If not found, add Node.js to PATH
# (Instructions vary by OS)
```

---

### Hook Too Slow

**Problem:** Hook takes too long on large codebases.

**Solution:** The validation script is optimized and should run in <1 second. If slower:
1. Check for huge node_modules (should be skipped automatically)
2. Ensure you're not running on network drive
3. Consider excluding certain directories in the script

---

### Need to Bypass Hook (Emergency)

**Problem:** Need to commit urgently, will fix violations later.

**Solution (NOT RECOMMENDED):**
```bash
# Bypass ALL hooks for this commit
git commit --no-verify -m "emergency fix"
```

⚠️ **Warning:** Bypassing hooks should be rare. Fix violations promptly.

---

## 📖 Common Scenarios

### Scenario 1: Missing CSS Module

**Violation:**
```
❌ VIOLATION: CSS Module Pairing
   Component missing paired CSS module
   Expected: ProductCard.module.css
   File: frontend/src/components/catalog/ProductCard/ProductCard.jsx
```

**Fix:**
```bash
# Create the missing CSS module
touch frontend/src/components/catalog/ProductCard/ProductCard.module.css

# Stage and commit
git add frontend/src/components/catalog/ProductCard/ProductCard.module.css
git commit -m "style: add ProductCard CSS module"
```

---

### Scenario 2: File in Wrong Location

**Violation:**
```
❌ VIOLATION: Root Directory
   Forbidden file pattern found: SESSION_10_NOTES.md
   Should be moved to docs/internal/
   File: SESSION_10_NOTES.md
```

**Fix:**
```bash
# Move file to correct location
git mv SESSION_10_NOTES.md docs/internal/session-notes/

# Commit the move
git commit -m "docs: move session notes to correct location"
```

---

### Scenario 3: Forbidden Folder

**Violation:**
```
❌ VIOLATION: Forbidden Folders
   Forbidden folder found: temp/
   This folder type is not allowed in project root
   File: temp
```

**Fix:**
```bash
# Remove the forbidden folder
rm -rf temp/

# Or move contents if needed
git mv temp/* docs/internal/archived/

# Commit
git commit -m "chore: remove temp folder"
```

---

## 🔐 Hook Security

### Safe Operations

Hooks in this project only:
- ✅ Read files to validate structure
- ✅ Run validation checks
- ✅ Display messages
- ✅ Exit with appropriate codes

Hooks DO NOT:
- ❌ Modify your files
- ❌ Make commits automatically
- ❌ Delete or move files
- ❌ Access network resources
- ❌ Run external services

### Reviewing Hook Code

Hooks are plain text scripts. Review them:

```bash
# Unix/Mac hook
cat .githooks/pre-commit

# Windows hook
type .githooks\pre-commit.ps1

# Validation script
cat scripts/validate-structure.js
```

---

## 📊 Hook Performance

**Expected Performance:**
- **Execution Time:** <1 second
- **Files Scanned:** All project files (excluding node_modules)
- **Checks Performed:** 6 validation categories
- **Impact:** Minimal delay before commit

**Performance Monitoring:**
```bash
# Time the validation manually
time node scripts/validate-structure.js

# Should be well under 1 second
```

---

## 🎓 Understanding Git Hooks

### Why .githooks/ Instead of .git/hooks/?

| Location | Tracked | Shared | Requires Setup |
|----------|---------|--------|----------------|
| `.git/hooks/` | ❌ No | ❌ No | ❌ Each clone |
| `.githooks/` | ✅ Yes | ✅ Yes | ✅ One command |

**Benefit:** Everyone on the team gets the same hooks automatically.

### Hook Types Available

Git supports many hook types. BTG v4 currently uses:
- **pre-commit:** Before commit is created (structure validation)

**Future Possibilities:**
- `pre-push` — Before code is pushed to remote
- `commit-msg` — Validate commit message format
- `post-merge` — After pulling changes (dependency updates)

---

## 🔄 Updating Hooks

### Modifying Existing Hook

1. Edit hook file:
   ```bash
   # Unix/Mac
   vim .githooks/pre-commit
   
   # Windows
   notepad .githooks\pre-commit.ps1
   ```

2. Test changes:
   ```bash
   # Run hook manually
   .githooks/pre-commit       # Unix/Mac
   .githooks\pre-commit.ps1   # Windows
   ```

3. Commit hook changes:
   ```bash
   git add .githooks/
   git commit -m "chore: update pre-commit hook"
   ```

### Adding New Hook

1. Create hook file in `.githooks/`:
   ```bash
   touch .githooks/commit-msg
   ```

2. Make executable (Unix/Mac):
   ```bash
   chmod +x .githooks/commit-msg
   ```

3. Implement and test
4. Commit to repository

---

## 🚫 Disabling Hooks

### Temporarily Disable (One Commit)

```bash
git commit --no-verify -m "commit message"
```

### Permanently Disable (Not Recommended)

```bash
# Remove hooks configuration
git config --unset core.hooksPath

# Commits will no longer run validation
```

⚠️ **Warning:** Only disable if you understand the implications.

---

## 📚 Related Documentation

- **Structure Rules:** `PROJECT_STRUCTURE_RULES.md`
- **Validation Script:** `scripts/validate-structure.js`
- **Phase 8 Details:** `docs/internal/session-notes/CHECKPOINT_PHASE_8.md`
- **Phase 9 Details:** `docs/internal/session-notes/CHECKPOINT_PHASE_9.md`

---

## ✅ Quick Reference

| Command | Purpose |
|---------|---------|
| `git config core.hooksPath .githooks` | Enable hooks (one-time) |
| `chmod +x .githooks/pre-commit` | Make executable (Unix/Mac) |
| `node scripts/validate-structure.js` | Test validation manually |
| `git commit` | Normal commit (hook runs) |
| `git commit --no-verify` | Bypass hooks (emergency) |
| `git config core.hooksPath` | Check if hooks enabled |

---

## 🎯 Team Onboarding

**New Team Members:**

1. Clone repository:
   ```bash
   git clone <repo-url>
   cd btg-v4
   ```

2. Install dependencies:
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

3. Enable hooks:
   ```bash
   cd ..  # Back to project root
   git config core.hooksPath .githooks
   
   # Unix/Mac only
   chmod +x .githooks/pre-commit
   ```

4. Test setup:
   ```bash
   node scripts/validate-structure.js
   # Should show: ✅ SUCCESS: All structure rules passed!
   ```

5. Make first commit:
   ```bash
   # Hook will run automatically
   git commit --allow-empty -m "test: verify hooks working"
   ```

---

**Status:** ✅ Active  
**Hooks Configured:** 1 (pre-commit)  
**Platform Support:** Unix, Mac, Linux, Windows  

**এই hooks আমাদের codebase clean এবং consistent রাখবে! 🚀**

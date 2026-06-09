#
# BTG v4 — Pre-Commit Hook (PowerShell for Windows)
# 
# Validates project structure before allowing commits
# Enforces PROJECT_STRUCTURE_RULES.md compliance
#
# This hook runs automatically before every commit
# Exit code 0 = commit proceeds
# Exit code 1 = commit blocked
#

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  BTG v4 — Pre-Commit Structure Validation             ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the correct directory
if (-not (Test-Path "scripts\validate-structure.js")) {
    Write-Host "⚠️  Warning: validate-structure.js not found" -ForegroundColor Yellow
    Write-Host "   Hook may be running from wrong directory" -ForegroundColor Yellow
    Write-Host ""
}

# Change to project root (parent of .githooks)
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
Set-Location $projectRoot

# Run structure validation
Write-Host "🔍 Running structure validation..." -ForegroundColor Yellow
Write-Host ""

# Run validation using node directly
node scripts\validate-structure.js

# Capture exit code
$validationExitCode = $LASTEXITCODE

Write-Host ""

# Check validation result
if ($validationExitCode -ne 0) {
    Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Red
    Write-Host "║  ❌ COMMIT BLOCKED: Structure Violations Found        ║" -ForegroundColor Red
    Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Red
    Write-Host ""
    Write-Host "Your commit has been blocked because structure rule" -ForegroundColor Yellow
    Write-Host "violations were detected." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "📋 Next Steps:" -ForegroundColor Cyan
    Write-Host "   1. Review the violations listed above"
    Write-Host "   2. Fix each violation (move files, add missing files, etc.)"
    Write-Host "   3. Stage your fixes: git add <files>"
    Write-Host "   4. Try committing again: git commit"
    Write-Host ""
    Write-Host "💡 Tips:" -ForegroundColor Cyan
    Write-Host "   • Check PROJECT_STRUCTURE_RULES.md for guidelines"
    Write-Host "   • Run 'npm run validate:structure' to test fixes"
    Write-Host "   • Ask for help if violations are unclear"
    Write-Host ""
    Write-Host "⚠️  To bypass this hook (NOT RECOMMENDED):" -ForegroundColor Yellow
    Write-Host "   git commit --no-verify"
    Write-Host ""
    exit 1
}

# Validation passed
Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  ✅ Structure Validation Passed                        ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "Your commit meets all structure requirements." -ForegroundColor Green
Write-Host "Proceeding with commit..." -ForegroundColor Green
Write-Host ""

exit 0

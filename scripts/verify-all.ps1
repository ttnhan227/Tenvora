# ==============================================================================
# Tenvora Full Verification Pipeline (scripts/verify-all.ps1)
# Verifies backend tests, frontend tests, linting, and production client build.
# ==============================================================================

[CmdletBinding()]
param(
    [switch]$SkipBuild = $false
)

$ErrorActionPreference = "Continue"
$swTotal = [System.Diagnostics.Stopwatch]::StartNew()
$results = @()

function Log-Step([string]$title) {
    Write-Host "`n=================================================================" -ForegroundColor Cyan
    Write-Host ">>> $title" -ForegroundColor Cyan
    Write-Host "=================================================================" -ForegroundColor Cyan
}

function Record-Result([string]$step, [bool]$success, [TimeSpan]$duration) {
    $script:results += [PSCustomObject]@{
        Step     = $step
        Status   = if ($success) { "PASSED" } else { "FAILED" }
        Duration = "{0:mm\:ss\.ff}" -f $duration
    }
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

Write-Host "Tenvora Engineering Verification Pipeline" -ForegroundColor Green
Write-Host "Working Directory: $repoRoot" -ForegroundColor Gray

# ------------------------------------------------------------------------------
# 1. Backend Test Suite (xUnit)
# ------------------------------------------------------------------------------
Log-Step "Step 1: Running Backend Tests (server.Tests)"
$sw = [System.Diagnostics.Stopwatch]::StartNew()
dotnet test server.Tests --verbosity normal
$sw.Stop()
Record-Result "Backend Tests (xUnit)" ($LASTEXITCODE -eq 0) $sw.Elapsed

# ------------------------------------------------------------------------------
# 2. Frontend Test Suite (Vitest)
# ------------------------------------------------------------------------------
Log-Step "Step 2: Running Frontend Tests (client Vitest)"
$sw = [System.Diagnostics.Stopwatch]::StartNew()
npm --prefix client test
$sw.Stop()
Record-Result "Frontend Tests (Vitest)" ($LASTEXITCODE -eq 0) $sw.Elapsed

# ------------------------------------------------------------------------------
# 3. Frontend Linting (ESLint)
# ------------------------------------------------------------------------------
Log-Step "Step 3: Running Frontend Linter (ESLint)"
$sw = [System.Diagnostics.Stopwatch]::StartNew()
npm --prefix client run lint
$sw.Stop()
Record-Result "Frontend Linter (ESLint)" ($LASTEXITCODE -eq 0) $sw.Elapsed

# ------------------------------------------------------------------------------
# 4. Frontend Production Build (Vite)
# ------------------------------------------------------------------------------
if (-not $SkipBuild) {
    Log-Step "Step 4: Running Frontend Production Build (Vite)"
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    npm --prefix client run build
    $sw.Stop()
    Record-Result "Frontend Build (Vite)" ($LASTEXITCODE -eq 0) $sw.Elapsed
}

# ------------------------------------------------------------------------------
# Summary Table
# ------------------------------------------------------------------------------
$swTotal.Stop()
Write-Host "`n=================================================================" -ForegroundColor Yellow
Write-Host " VERIFICATION SUMMARY" -ForegroundColor Yellow
Write-Host "=================================================================" -ForegroundColor Yellow

foreach ($res in $results) {
    $color = if ($res.Status -eq "PASSED") { "Green" } else { "Red" }
    Write-Host ("[{0}] {1,-30} ({2})" -f $res.Status, $res.Step, $res.Duration) -ForegroundColor $color
}

Write-Host "-----------------------------------------------------------------" -ForegroundColor Gray
Write-Host ("Total Pipeline Duration: {0:mm\:ss\.ff}" -f $swTotal.Elapsed) -ForegroundColor Gray

$allPassed = -not ($results | Where-Object { $_.Status -ne "PASSED" })
if ($allPassed) {
    Write-Host "`n ALL VERIFICATION CHECKS PASSED SUCCESSFULLY.`n" -ForegroundColor Green
    exit 0
} else {
    Write-Host "`n VERIFICATION PIPELINE ENCOUNTERED FAILURES.`n" -ForegroundColor Red
    exit 1
}

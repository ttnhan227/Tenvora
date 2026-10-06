param([switch]$Pull)
$ErrorActionPreference = 'Stop'
$repositoryRoot = Split-Path -Parent $PSScriptRoot
Push-Location $repositoryRoot
try {
    if ($Pull) {
        git pull --ff-only
        if ($LASTEXITCODE -ne 0) { throw 'Pull failed. Resolve local changes before updating.' }
    }
    docker compose up -d --build --wait postgres server client
    if ($LASTEXITCODE -ne 0) { throw 'Local services failed to build or become healthy. Inspect docker compose logs.' }
    Write-Host 'Local backend and frontend rebuilt. Database volume preserved.'
    Write-Host 'Website: http://localhost:5173 (unless VITE_PORT is configured differently).'
} finally { Pop-Location }

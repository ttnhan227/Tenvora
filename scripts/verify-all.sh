#!/usr/bin/env bash
# ==============================================================================
# Tenvora Full Verification Pipeline (scripts/verify-all.sh)
# Verifies backend tests, frontend tests, linting, and production client build.
# ==============================================================================

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "=== Tenvora Engineering Verification Pipeline ==="
echo "Working directory: $REPO_ROOT"

echo ""
echo ">>> Step 1: Running Backend Tests (server.Tests)"
dotnet test server.Tests --verbosity normal

echo ""
echo ">>> Step 2: Running Frontend Tests (client Vitest)"
npm --prefix client run test:run

echo ""
echo ">>> Step 3: Running Frontend Linter (ESLint)"
npm --prefix client run lint

echo ""
echo ">>> Step 4: Running Frontend Production Build (Vite)"
npm --prefix client run build

echo ""
echo "=== ALL VERIFICATION CHECKS PASSED SUCCESSFULLY ==="

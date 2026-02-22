# Package Express Backend as Lambda Bundle
# PowerShell version for Windows
#
# Usage: .\package_backend_lambda.ps1
#
# What this does:
#   1. Installs backend dependencies (includes serverless-http)
#   2. Runs esbuild to bundle the entire Express app into a single .js file
#   3. Resulting artifact: backend/dist/lambda_bundle.js (~3-8 MB)
#      Terraform zips it automatically via data.archive_file "api_server"
#
# Cost: ~$0/month on AWS free tier (1M requests/month free)

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$BackendDir  = Join-Path $ProjectRoot "backend"
$BundleFile  = Join-Path $BackendDir "dist\lambda_bundle.js"

Write-Host "=== SensaAI Backend Lambda Packaging ===" -ForegroundColor Cyan
Write-Host "Backend: $BackendDir"
Write-Host ""

# Step 1 — Install dependencies (includes esbuild + serverless-http)
Write-Host "Step 1/2 — Installing dependencies..." -ForegroundColor Yellow
Push-Location $BackendDir
try {
    npm install --prefer-offline 2>&1 | Out-Null
    Write-Host "  Dependencies installed." -ForegroundColor Green
}
finally {
    Pop-Location
}

# Step 2 — Bundle with esbuild (single-file, no node_modules folder needed)
Write-Host "Step 2/2 — Bundling with esbuild..." -ForegroundColor Yellow
Push-Location $BackendDir
try {
    npm run bundle:lambda 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "esbuild bundle failed (exit code $LASTEXITCODE)"
    }
    Write-Host "  Bundle created." -ForegroundColor Green
}
finally {
    Pop-Location
}

# Report
Write-Host ""
Write-Host "=== Packaging Complete ===" -ForegroundColor Green
if (Test-Path $BundleFile) {
    $SizeMB = [math]::Round((Get-Item $BundleFile).Length / 1MB, 2)
    Write-Host "Bundle: $BundleFile ($SizeMB MB)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor White
    Write-Host "  1. cd infra/terraform" -ForegroundColor Gray
    Write-Host "  2. terraform init (first time only)" -ForegroundColor Gray
    Write-Host "  3. terraform apply -var=""environment=dev""" -ForegroundColor Gray
} else {
    Write-Host "Bundle file not found at: $BundleFile" -ForegroundColor Red
    exit 1
}

# Package Lambda function and dependencies for deployment
# PowerShell version for Windows
#
# Usage: .\package_lambda.ps1
#
# Outputs:
#   - infra/terraform/modules/lambda/layer.zip (Python dependencies)

$ErrorActionPreference = "Stop"

# Configuration
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$LambdaDir = Join-Path $ProjectRoot "backend\lambda"
$TfLambdaDir = Join-Path $ProjectRoot "infra\terraform\modules\lambda"
$BuildDir = Join-Path $ProjectRoot ".build"

Write-Host "=== SensaAI Lambda Packaging ===" -ForegroundColor Cyan
Write-Host "Lambda source: $LambdaDir"
Write-Host "Output: $TfLambdaDir"
Write-Host ""

# Clean build directory and temporary files
if (Test-Path $BuildDir) {
    Remove-Item -Recurse -Force $BuildDir
}

Write-Host "Cleaning up __pycache__ and temp files from Lambda source..." -ForegroundColor Yellow
Get-ChildItem -Path $LambdaDir -Directory -Filter "__pycache__" -Recurse | Remove-Item -Force -Recurse
Get-ChildItem -Path $LambdaDir -Directory -Filter ".pytest_cache" -Recurse | Remove-Item -Force -Recurse
Get-ChildItem -Path $LambdaDir -Filter "*.zip" -File | Remove-Item -Force
New-Item -ItemType Directory -Path "$BuildDir\layer\python" -Force | Out-Null

# Install dependencies for layer
Write-Host "Installing Python dependencies..." -ForegroundColor Yellow
pip install -r "$LambdaDir\requirements.txt" -t "$BuildDir\layer\python" --quiet

# Create layer zip
Write-Host "Creating layer.zip..." -ForegroundColor Yellow
$LayerZip = Join-Path $TfLambdaDir "layer.zip"
if (Test-Path $LayerZip) {
    Remove-Item $LayerZip
}

Compress-Archive -Path "$BuildDir\layer\python" -DestinationPath $LayerZip -Force

# Report
Write-Host ""
Write-Host "=== Packaging Complete ===" -ForegroundColor Green
$LayerSize = (Get-Item $LayerZip).Length / 1MB
Write-Host "Layer: $LayerZip ($([math]::Round($LayerSize, 2)) MB)"
Write-Host ""
Write-Host "Note: Lambda code is zipped automatically by Terraform during apply"

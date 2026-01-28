# Package Lambda function for deployment
# Creates a ZIP with the correct structure for Lambda to import modules

$ErrorActionPreference = "Stop"

Write-Host "📦 Packaging Lambda functions..." -ForegroundColor Cyan

# Clean up old artifacts
if (Test-Path "deploy_package") { Remove-Item -Recurse -Force "deploy_package" }
if (Test-Path "lambda_deploy.zip") { Remove-Item -Force "lambda_deploy.zip" }

# Create temp directory
New-Item -ItemType Directory -Path "deploy_package" | Out-Null

# Copy all Python modules to root of package (flattened structure for Lambda)
Write-Host "Copying generate_concepts module..." -ForegroundColor Yellow
Copy-Item -Recurse "generate_concepts" "deploy_package/"

Write-Host "Copying query_concepts module..." -ForegroundColor Yellow
Copy-Item -Recurse "query_concepts" "deploy_package/"

Write-Host "Copying shared module..." -ForegroundColor Yellow
Copy-Item -Recurse "shared" "deploy_package/"

# Also copy services to root level for import resolution
Write-Host "Copying services to root level..." -ForegroundColor Yellow
Copy-Item -Recurse "generate_concepts/services" "deploy_package/"

# Create ZIP from the package directory
Write-Host "Creating ZIP archive..." -ForegroundColor Yellow
Compress-Archive -Path "deploy_package\*" -DestinationPath "lambda_deploy.zip" -Force

# Cleanup
Remove-Item -Recurse -Force "deploy_package"

$zipSize = (Get-Item "lambda_deploy.zip").Length / 1KB
Write-Host "✅ Package created: lambda_deploy.zip ($([math]::Round($zipSize, 2)) KB)" -ForegroundColor Green

# List contents to verify
Write-Host "`n📋 Package contents:" -ForegroundColor Cyan
Add-Type -Assembly System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead("$PWD\lambda_deploy.zip")
$zip.Entries | Select-Object -First 20 FullName | Format-Table
$zip.Dispose()

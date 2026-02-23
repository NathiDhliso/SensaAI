#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Add custom:role attribute to Production Cognito User Pool
.DESCRIPTION
    Adds the custom:role attribute to the Cognito user pool schema.
    This is a one-time operation required before assigning roles.
.NOTES
    WARNING: Custom attributes cannot be deleted once added!
#>

$USER_POOL_ID = "us-east-1_Af8EHbmfU"
$AWS_REGION = "us-east-1"

Write-Host ""
Write-Host "🔧 Adding custom:role attribute to Production Cognito User Pool" -ForegroundColor Cyan
Write-Host "   User Pool: $USER_POOL_ID" -ForegroundColor Gray
Write-Host ""
Write-Host "⚠️  WARNING: Custom attributes cannot be deleted once added!" -ForegroundColor Yellow
Write-Host ""

# Check if AWS CLI is installed
if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
    Write-Host "✗ AWS CLI is not installed or not in PATH" -ForegroundColor Red
    exit 1
}

# Check AWS credentials
Write-Host "Checking AWS credentials..." -ForegroundColor Gray
$awsIdentity = aws sts get-caller-identity 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ AWS credentials not configured" -ForegroundColor Red
    exit 1
}
Write-Host "✓ AWS credentials valid" -ForegroundColor Green

# Get current user pool schema
Write-Host ""
Write-Host "Fetching current user pool schema..." -ForegroundColor Gray
$userPoolResult = aws cognito-idp describe-user-pool `
    --user-pool-id $USER_POOL_ID `
    --region $AWS_REGION `
    2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to fetch user pool" -ForegroundColor Red
    Write-Host "  Error: $userPoolResult" -ForegroundColor Red
    exit 1
}

$userPool = $userPoolResult | ConvertFrom-Json
Write-Host "✓ User pool found: $($userPool.UserPool.Name)" -ForegroundColor Green

# Check if custom:role already exists
$existingRole = $userPool.UserPool.SchemaAttributes | Where-Object { $_.Name -eq "role" -and $_.DeveloperOnlyAttribute -eq $false }
if ($existingRole) {
    Write-Host ""
    Write-Host "✓ custom:role attribute already exists!" -ForegroundColor Green
    Write-Host "  You can now run: .\scripts\assign-curator-role-prod.ps1" -ForegroundColor Cyan
    Write-Host ""
    exit 0
}

# Add the custom attribute
Write-Host ""
Write-Host "Adding custom:role attribute..." -ForegroundColor Cyan
$addResult = aws cognito-idp add-custom-attributes `
    --user-pool-id $USER_POOL_ID `
    --custom-attributes "Name=role,AttributeDataType=String,Mutable=true" `
    --region $AWS_REGION `
    2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to add custom attribute" -ForegroundColor Red
    Write-Host "  Error: $addResult" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 You may need to add this manually in AWS Console:" -ForegroundColor Yellow
    Write-Host "   1. Go to AWS Console > Cognito > User Pools" -ForegroundColor Yellow
    Write-Host "   2. Select pool: $USER_POOL_ID" -ForegroundColor Yellow
    Write-Host "   3. Go to 'Sign-up experience' > 'Attributes'" -ForegroundColor Yellow
    Write-Host "   4. Click 'Add custom attribute'" -ForegroundColor Yellow
    Write-Host "   5. Name: role, Type: String, Mutable: Yes" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host "✓ Successfully added custom:role attribute" -ForegroundColor Green

# Verify
Write-Host ""
Write-Host "Verifying attribute was added..." -ForegroundColor Gray
$verifyResult = aws cognito-idp describe-user-pool `
    --user-pool-id $USER_POOL_ID `
    --region $AWS_REGION `
    2>&1 | ConvertFrom-Json

$roleAttr = $verifyResult.UserPool.SchemaAttributes | Where-Object { $_.Name -eq "role" }
if ($roleAttr) {
    Write-Host "✓ Verified: custom:role attribute exists" -ForegroundColor Green
} else {
    Write-Host "⚠️  Warning: Could not verify attribute" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📝 Next step:" -ForegroundColor Cyan
Write-Host "  Run: .\scripts\assign-curator-role-prod.ps1" -ForegroundColor White
Write-Host ""
Write-Host "✨ Done!" -ForegroundColor Green
Write-Host ""

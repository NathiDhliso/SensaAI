#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Assign Curator Role to Production User
.DESCRIPTION
    Updates Cognito user custom attribute to grant curator access in production environment
.PARAMETER Email
    User email address (defaults to nkosinathi.dhliso@gmail.com)
.PARAMETER Role
    Role to assign: curator or admin (defaults to curator)
.EXAMPLE
    .\scripts\assign-curator-role-prod.ps1
.EXAMPLE
    .\scripts\assign-curator-role-prod.ps1 -Email user@example.com -Role admin
#>

param(
    [string]$Email = "nkosinathi.dhliso@gmail.com",
    [string]$Role = "curator"
)

# Production Cognito Configuration
$USER_POOL_ID = "us-east-1_Af8EHbmfU"
$AWS_REGION = "us-east-1"

Write-Host ""
Write-Host "🔧 Assigning $Role role to $Email in PRODUCTION..." -ForegroundColor Cyan
Write-Host "   User Pool: $USER_POOL_ID" -ForegroundColor Gray
Write-Host ""

# Check if AWS CLI is installed
if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
    Write-Host "✗ AWS CLI is not installed or not in PATH" -ForegroundColor Red
    Write-Host "  Please install AWS CLI: https://aws.amazon.com/cli/" -ForegroundColor Yellow
    exit 1
}

# Check AWS credentials
Write-Host "Checking AWS credentials..." -ForegroundColor Gray
$awsIdentity = aws sts get-caller-identity 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ AWS credentials not configured" -ForegroundColor Red
    Write-Host "  Run: aws configure" -ForegroundColor Yellow
    exit 1
}
Write-Host "✓ AWS credentials valid" -ForegroundColor Green

# Get current user info
Write-Host ""
Write-Host "Fetching user information..." -ForegroundColor Gray
$getUserResult = aws cognito-idp admin-get-user `
    --user-pool-id $USER_POOL_ID `
    --username $Email `
    --region $AWS_REGION `
    2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ User not found: $Email" -ForegroundColor Red
    Write-Host "  Error: $getUserResult" -ForegroundColor Red
    exit 1
}

$userInfo = $getUserResult | ConvertFrom-Json
Write-Host "✓ User found: $($userInfo.Username)" -ForegroundColor Green

# Show current role
$currentRole = $userInfo.UserAttributes | Where-Object { $_.Name -eq "custom:role" } | Select-Object -ExpandProperty Value
if ($currentRole) {
    Write-Host "  Current role: $currentRole" -ForegroundColor Gray
} else {
    Write-Host "  Current role: learner (default)" -ForegroundColor Gray
}

# Update the custom:role attribute
Write-Host ""
Write-Host "Updating role to: $Role..." -ForegroundColor Cyan
$updateResult = aws cognito-idp admin-update-user-attributes `
    --user-pool-id $USER_POOL_ID `
    --username $Email `
    --user-attributes Name=custom:role,Value=$Role `
    --region $AWS_REGION `
    2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to assign role" -ForegroundColor Red
    Write-Host "  Error: $updateResult" -ForegroundColor Red
    
    if ($updateResult -like "*InvalidParameterException*") {
        Write-Host ""
        Write-Host "💡 Tip: The custom:role attribute may not exist in your user pool." -ForegroundColor Yellow
        Write-Host "   You need to add it in AWS Console:" -ForegroundColor Yellow
        Write-Host "   1. Go to Cognito User Pool: $USER_POOL_ID" -ForegroundColor Yellow
        Write-Host "   2. Navigate to 'Sign-up experience' > 'Attributes'" -ForegroundColor Yellow
        Write-Host "   3. Add custom attribute: 'role' (String, Mutable)" -ForegroundColor Yellow
    }
    exit 1
}

Write-Host "✓ Successfully assigned $Role role to $Email" -ForegroundColor Green

# Verify the update
Write-Host ""
Write-Host "Verifying update..." -ForegroundColor Gray
$verifyResult = aws cognito-idp admin-get-user `
    --user-pool-id $USER_POOL_ID `
    --username $Email `
    --region $AWS_REGION `
    2>&1 | ConvertFrom-Json

$newRole = $verifyResult.UserAttributes | Where-Object { $_.Name -eq "custom:role" } | Select-Object -ExpandProperty Value
Write-Host "✓ Verified role: $newRole" -ForegroundColor Green

Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Cyan
Write-Host "  1. User must log out of production app completely" -ForegroundColor White
Write-Host "  2. Clear browser cache/cookies for production domain" -ForegroundColor White
Write-Host "  3. Log back in - new tokens will include the updated role" -ForegroundColor White
Write-Host "  4. User will now have access to /curator routes" -ForegroundColor White
Write-Host ""
Write-Host "✨ Done!" -ForegroundColor Green
Write-Host ""

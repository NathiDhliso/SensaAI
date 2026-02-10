# Set Environment Variables in AWS Amplify
# This script helps you configure environment variables for your Amplify app

Write-Host "=== AWS Amplify Environment Variables Setup ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "You need to set these environment variables in AWS Amplify Console:" -ForegroundColor Yellow
Write-Host ""

# Read current .env file
$envContent = Get-Content .env -ErrorAction SilentlyContinue

if ($envContent) {
    Write-Host "Current .env values:" -ForegroundColor Green
    Write-Host "-------------------" -ForegroundColor Gray
    
    $envVars = @{}
    foreach ($line in $envContent) {
        if ($line -match '^VITE_' -and $line -match '=') {
            $parts = $line -split '=', 2
            $key = $parts[0].Trim()
            $value = $parts[1].Trim()
            $envVars[$key] = $value
            Write-Host "$key=$value" -ForegroundColor White
        }
    }
    Write-Host ""
}

Write-Host "Steps to set environment variables in Amplify:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Go to AWS Amplify Console:" -ForegroundColor White
Write-Host "   https://console.aws.amazon.com/amplify/" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Select your app (SensaPBL)" -ForegroundColor White
Write-Host ""
Write-Host "3. Go to: App settings > Environment variables" -ForegroundColor White
Write-Host ""
Write-Host "4. Click 'Manage variables'" -ForegroundColor White
Write-Host ""
Write-Host "5. Add these variables:" -ForegroundColor White
Write-Host ""

# Display variables to add
$requiredVars = @(
    "VITE_AWS_REGION",
    "VITE_COGNITO_USER_POOL_ID",
    "VITE_COGNITO_CLIENT_ID",
    "VITE_COGNITO_DOMAIN",
    "VITE_COGNITO_IDENTITY_POOL_ID",
    "VITE_COGNITO_REDIRECT_URI",
    "VITE_AWS_S3_BUCKET_NAME",
    "VITE_AWS_DYNAMODB_TABLE_NAME",
    "VITE_GYM_AI_URL",
    "VITE_API_URL"
)

foreach ($var in $requiredVars) {
    $value = if ($envVars[$var]) { $envVars[$var] } else { "<SET_THIS_VALUE>" }
    Write-Host "   $var = $value" -ForegroundColor Gray
}

Write-Host ""
Write-Host "6. Save changes" -ForegroundColor White
Write-Host ""
Write-Host "7. Redeploy your app (it will automatically trigger)" -ForegroundColor White
Write-Host ""

Write-Host "IMPORTANT: Update VITE_API_URL after deploying backend!" -ForegroundColor Yellow
Write-Host "  Current: $($envVars['VITE_API_URL'])" -ForegroundColor Gray
Write-Host "  After backend deployment: http://your-backend-url.elasticbeanstalk.com/api/v1" -ForegroundColor Gray
Write-Host ""

Write-Host "Alternative: Use AWS CLI to set variables" -ForegroundColor Cyan
Write-Host ""
Write-Host "Get your Amplify App ID:" -ForegroundColor White
Write-Host "  aws amplify list-apps --region us-east-1" -ForegroundColor Gray
Write-Host ""
Write-Host "Set environment variables:" -ForegroundColor White
Write-Host '  aws amplify update-app --app-id <APP_ID> --environment-variables VITE_API_URL=http://your-backend.elasticbeanstalk.com/api/v1' -ForegroundColor Gray
Write-Host ""

Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

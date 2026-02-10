# Deploy Backend to AWS Elastic Beanstalk
# This script deploys the Express backend to AWS

Write-Host "=== Deploying Backend to AWS Elastic Beanstalk ===" -ForegroundColor Cyan
Write-Host ""

# Check if EB CLI is installed
Write-Host "Checking for EB CLI..." -ForegroundColor Yellow
$ebInstalled = Get-Command eb -ErrorAction SilentlyContinue

if (-not $ebInstalled) {
    Write-Host "❌ EB CLI not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install AWS Elastic Beanstalk CLI:" -ForegroundColor Yellow
    Write-Host "  pip install awsebcli" -ForegroundColor White
    Write-Host ""
    Write-Host "Or using pipx (recommended):" -ForegroundColor Yellow
    Write-Host "  pipx install awsebcli" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "✅ EB CLI found" -ForegroundColor Green
Write-Host ""

# Navigate to backend directory
Set-Location backend

# Check if EB is initialized
if (-not (Test-Path ".elasticbeanstalk/config.yml")) {
    Write-Host "Initializing Elastic Beanstalk..." -ForegroundColor Yellow
    Write-Host ""
    
    # Initialize EB
    eb init -p "Node.js 20" SensaAI-backend --region us-east-1
    
    Write-Host ""
    Write-Host "Creating environment..." -ForegroundColor Yellow
    Write-Host "This may take 5-10 minutes..." -ForegroundColor Gray
    Write-Host ""
    
    # Create environment with environment variables
    eb create SensaAI-backend-prod `
        --instance-type t3.small `
        --envvars AWS_REGION=us-east-1,NODE_ENV=production,CONCEPTS_TABLE=SensaAI-concepts-pilot,JOBS_TABLE=SensaAI-jobs-pilot,GENERATE_LAMBDA=SensaAI-generate-concepts-pilot
    
    Write-Host ""
    Write-Host "✅ Environment created!" -ForegroundColor Green
} else {
    Write-Host "EB already initialized" -ForegroundColor Green
}

Write-Host ""
Write-Host "Building backend..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    Set-Location ..
    exit 1
}

Write-Host "✅ Build successful" -ForegroundColor Green
Write-Host ""

Write-Host "Deploying to Elastic Beanstalk..." -ForegroundColor Yellow
Write-Host "This may take a few minutes..." -ForegroundColor Gray
Write-Host ""

eb deploy

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    Set-Location ..
    exit 1
}

Write-Host ""
Write-Host "✅ Deployment successful!" -ForegroundColor Green
Write-Host ""

# Get the environment URL
Write-Host "Getting environment URL..." -ForegroundColor Yellow
$ebStatus = eb status
$url = ($ebStatus | Select-String "CNAME:" | ForEach-Object { $_.ToString().Split(":")[1].Trim() })

if ($url) {
    Write-Host ""
    Write-Host "🚀 Backend is live at:" -ForegroundColor Cyan
    Write-Host "   http://$url" -ForegroundColor White
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Yellow
    Write-Host "  1. Update your .env file:" -ForegroundColor White
    Write-Host "     VITE_API_URL=http://$url/api/v1" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  2. Set environment variables in EB console:" -ForegroundColor White
    Write-Host "     - COGNITO_USER_POOL_ID" -ForegroundColor Gray
    Write-Host "     - COGNITO_CLIENT_ID" -ForegroundColor Gray
    Write-Host "     - COGNITO_DOMAIN" -ForegroundColor Gray
    Write-Host "     - CORS_ORIGINS (add your Amplify URL)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  3. Test the backend:" -ForegroundColor White
    Write-Host "     curl http://$url/health" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  4. Rebuild and deploy frontend with new VITE_API_URL" -ForegroundColor White
}

Set-Location ..

Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

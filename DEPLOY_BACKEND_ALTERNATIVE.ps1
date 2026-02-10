# Alternative Backend Deployment (Without EB CLI)
# This uses AWS CLI to deploy to Elastic Beanstalk

Write-Host "=== Deploy Backend to AWS (Alternative Method) ===" -ForegroundColor Cyan
Write-Host ""

$APP_NAME = "sensapbl-backend"
$ENV_NAME = "sensapbl-backend-prod"
$REGION = "us-east-1"

Write-Host "This script will:" -ForegroundColor Yellow
Write-Host "  1. Package your backend code" -ForegroundColor Gray
Write-Host "  2. Upload to S3" -ForegroundColor Gray
Write-Host "  3. Create/update Elastic Beanstalk application" -ForegroundColor Gray
Write-Host ""

# Check AWS CLI
Write-Host "Checking AWS CLI..." -ForegroundColor Yellow
$awsVersion = aws --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ AWS CLI not found!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ AWS CLI found" -ForegroundColor Green
Write-Host ""

# Build backend
Write-Host "Building backend..." -ForegroundColor Yellow
Set-Location backend
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    Set-Location ..
    exit 1
}
Write-Host "✅ Build successful" -ForegroundColor Green
Set-Location ..
Write-Host ""

# Package backend
Write-Host "Packaging backend..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$zipFile = "backend-$timestamp.zip"

# Create zip with necessary files
Compress-Archive -Path `
    "backend/dist/*", `
    "backend/package.json", `
    "backend/package-lock.json", `
    "backend/.npmrc" `
    -DestinationPath $zipFile -Force

Write-Host "✅ Package created: $zipFile" -ForegroundColor Green
Write-Host ""

# Create S3 bucket if it doesn't exist
$accountId = aws sts get-caller-identity --query Account --output text
$bucketName = "sensapbl-deployments-$accountId"
Write-Host "Checking S3 bucket..." -ForegroundColor Yellow
$bucketExists = aws s3 ls "s3://$bucketName" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Creating S3 bucket..." -ForegroundColor Yellow
    aws s3 mb "s3://$bucketName" --region $REGION
}
Write-Host "✅ S3 bucket ready" -ForegroundColor Green
Write-Host ""

# Upload to S3
Write-Host "Uploading to S3..." -ForegroundColor Yellow
aws s3 cp $zipFile "s3://$bucketName/$zipFile"
Write-Host "✅ Uploaded to S3" -ForegroundColor Green
Write-Host ""

# Check if EB application exists
Write-Host "Checking Elastic Beanstalk application..." -ForegroundColor Yellow
$appExists = aws elasticbeanstalk describe-applications `
    --application-names $APP_NAME `
    --region $REGION 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "Creating EB application..." -ForegroundColor Yellow
    aws elasticbeanstalk create-application `
        --application-name $APP_NAME `
        --description "SensaPBL Backend API" `
        --region $REGION
}
Write-Host "✅ EB application ready" -ForegroundColor Green
Write-Host ""

# Create application version
Write-Host "Creating application version..." -ForegroundColor Yellow
$versionLabel = "v-$timestamp"
aws elasticbeanstalk create-application-version `
    --application-name $APP_NAME `
    --version-label $versionLabel `
    --source-bundle S3Bucket=$bucketName,S3Key=$zipFile `
    --region $REGION

Write-Host "✅ Application version created" -ForegroundColor Green
Write-Host ""

# Check if environment exists
Write-Host "Checking environment..." -ForegroundColor Yellow
$envExists = aws elasticbeanstalk describe-environments `
    --application-name $APP_NAME `
    --environment-names $ENV_NAME `
    --region $REGION 2>&1

if ($LASTEXITCODE -ne 0 -or $envExists -like "*No environments found*") {
    Write-Host "Creating environment (this takes 5-10 minutes)..." -ForegroundColor Yellow
    Write-Host ""
    
    aws elasticbeanstalk create-environment `
        --application-name $APP_NAME `
        --environment-name $ENV_NAME `
        --version-label $versionLabel `
        --solution-stack-name "64bit Amazon Linux 2023 v6.1.0 running Node.js 20" `
        --option-settings `
            Namespace=aws:autoscaling:launchconfiguration,OptionName=InstanceType,Value=t3.small `
            Namespace=aws:elasticbeanstalk:environment,OptionName=EnvironmentType,Value=SingleInstance `
        --region $REGION
    
    Write-Host ""
    Write-Host "⏳ Environment is being created..." -ForegroundColor Yellow
    Write-Host "   This will take about 5-10 minutes" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   You can check status in AWS Console:" -ForegroundColor Gray
    Write-Host "   https://console.aws.amazon.com/elasticbeanstalk/" -ForegroundColor Cyan
} else {
    Write-Host "Updating environment..." -ForegroundColor Yellow
    aws elasticbeanstalk update-environment `
        --application-name $APP_NAME `
        --environment-name $ENV_NAME `
        --version-label $versionLabel `
        --region $REGION
    
    Write-Host "✅ Environment update initiated" -ForegroundColor Green
}

# Clean up
Remove-Item $zipFile

Write-Host ""
Write-Host "=== Deployment Initiated ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Wait for deployment to complete (~5-10 minutes)" -ForegroundColor White
Write-Host "  2. Get your backend URL:" -ForegroundColor White
Write-Host "     aws elasticbeanstalk describe-environments --application-name $APP_NAME --environment-names $ENV_NAME --region $REGION --query 'Environments[0].CNAME'" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. Update Amplify with backend URL:" -ForegroundColor White
Write-Host "     aws amplify update-app --app-id dckqci84h8ffk --region us-east-1 --environment-variables VITE_API_URL=http://YOUR-URL/api/v1" -ForegroundColor Gray
Write-Host ""
Write-Host "  4. Trigger Amplify rebuild" -ForegroundColor White
Write-Host ""

Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

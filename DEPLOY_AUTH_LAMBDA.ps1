# Deploy Auth Lambda Function
# This creates a Lambda function for authentication endpoints

Write-Host "=== Deploying Auth Lambda Function ===" -ForegroundColor Cyan
Write-Host ""

$FUNCTION_NAME = "SensaAI-auth-lambda"
$REGION = "us-east-1"
$ROLE_NAME = "SensaAI-lambda-execution-role"

# Check AWS CLI
Write-Host "Checking AWS CLI..." -ForegroundColor Yellow
$awsVersion = aws --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ AWS CLI not found!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ AWS CLI found" -ForegroundColor Green
Write-Host ""

# Create IAM role if it doesn't exist
Write-Host "Checking IAM role..." -ForegroundColor Yellow
$roleExists = aws iam get-role --role-name $ROLE_NAME 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Creating IAM role..." -ForegroundColor Yellow
    
    $trustPolicy = @"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
"@
    
    $trustPolicy | Out-File -FilePath "trust-policy.json" -Encoding utf8
    
    aws iam create-role `
        --role-name $ROLE_NAME `
        --assume-role-policy-document file://trust-policy.json
    
    # Attach policies
    aws iam attach-role-policy `
        --role-name $ROLE_NAME `
        --policy-arn "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
    
    aws iam attach-role-policy `
        --role-name $ROLE_NAME `
        --policy-arn "arn:aws:iam::aws:policy/AmazonCognitoPowerUser"
    
    Remove-Item "trust-policy.json"
    
    Write-Host "Waiting for role to propagate..." -ForegroundColor Gray
    Start-Sleep -Seconds 10
}
Write-Host "✅ IAM role ready" -ForegroundColor Green
Write-Host ""

# Get role ARN
$roleArn = (aws iam get-role --role-name $ROLE_NAME --query 'Role.Arn' --output text)

# Package Lambda (includes shared/ directory for utils and CORS)
Write-Host "Packaging Lambda function..." -ForegroundColor Yellow
$packageDir = "backend/lambda/auth"
$sharedDir = "backend/lambda/shared"
$zipFile = "auth-lambda.zip"
$stagingDir = "lambda-staging-auth"

if (Test-Path $zipFile) { Remove-Item $zipFile }
if (Test-Path $stagingDir) { Remove-Item -Recurse -Force $stagingDir }
New-Item -ItemType Directory -Path $stagingDir | Out-Null

Copy-Item -Path "$packageDir/*" -Destination "$stagingDir/" -Recurse
Copy-Item -Path "$sharedDir" -Destination "$stagingDir/shared" -Recurse

Compress-Archive -Path "$stagingDir/*" -DestinationPath $zipFile
Remove-Item -Recurse -Force $stagingDir

Write-Host "✅ Package created (includes shared/)" -ForegroundColor Green
Write-Host ""

# Check if function exists
Write-Host "Checking if function exists..." -ForegroundColor Yellow
$functionExists = aws lambda get-function --function-name $FUNCTION_NAME --region $REGION 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "Updating existing function..." -ForegroundColor Yellow
    
    aws lambda update-function-code `
        --function-name $FUNCTION_NAME `
        --zip-file fileb://$zipFile `
        --region $REGION
    
    Write-Host "✅ Function updated" -ForegroundColor Green
} else {
    Write-Host "Creating new function..." -ForegroundColor Yellow
    
    aws lambda create-function `
        --function-name $FUNCTION_NAME `
        --runtime python3.11 `
        --role $roleArn `
        --handler handler.lambda_handler `
        --zip-file fileb://$zipFile `
        --timeout 30 `
        --memory-size 512 `
        --region $REGION `
        --environment "Variables={COGNITO_CLIENT_ID=1f2i3813o3f1jdet7j6ifo1eea,COGNITO_USER_POOL_ID=us-east-1_nNdVox578,SKIP_AUTH=false,CORS_ORIGIN=https://main.dckqci84h8ffk.amplifyapp.com}"
    
    Write-Host "✅ Function created" -ForegroundColor Green
}

# Clean up
Remove-Item $zipFile

Write-Host ""
Write-Host "=== Adding Routes to API Gateway ===" -ForegroundColor Cyan
Write-Host ""

# Get API Gateway ID
$apiId = "c4kxjdukwj"
Write-Host "Using API Gateway: $apiId" -ForegroundColor Gray

# Get Lambda ARN
$lambdaArn = (aws lambda get-function --function-name $FUNCTION_NAME --region $REGION --query 'Configuration.FunctionArn' --output text)

Write-Host "Lambda ARN: $lambdaArn" -ForegroundColor Gray
Write-Host ""

Write-Host "Next steps (manual - AWS Console):" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Go to API Gateway Console:" -ForegroundColor White
Write-Host "   https://console.aws.amazon.com/apigateway/" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Select API: $apiId" -ForegroundColor White
Write-Host ""
Write-Host "3. Create Integration:" -ForegroundColor White
Write-Host "   - Type: Lambda" -ForegroundColor Gray
Write-Host "   - Lambda: $FUNCTION_NAME" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Create Routes:" -ForegroundColor White
Write-Host "   - POST /auth/session/login" -ForegroundColor Gray
Write-Host "   - GET /auth/session/validate" -ForegroundColor Gray
Write-Host "   - POST /auth/session/refresh" -ForegroundColor Gray
Write-Host "   - POST /auth/session/clear" -ForegroundColor Gray
Write-Host ""
Write-Host "5. Grant API Gateway permission to invoke Lambda:" -ForegroundColor White
Write-Host "   aws lambda add-permission \" -ForegroundColor Gray
Write-Host "     --function-name $FUNCTION_NAME \" -ForegroundColor Gray
Write-Host "     --statement-id apigateway-invoke \" -ForegroundColor Gray
Write-Host "     --action lambda:InvokeFunction \" -ForegroundColor Gray
Write-Host "     --principal apigateway.amazonaws.com \" -ForegroundColor Gray
Write-Host "     --source-arn 'arn:aws:execute-api:us-east-1:311964231104:$apiId/*/*'" -ForegroundColor Gray
Write-Host ""

Write-Host "Or use this automated command:" -ForegroundColor Yellow
Write-Host ""
Write-Host "aws lambda add-permission --function-name $FUNCTION_NAME --statement-id apigateway-invoke --action lambda:InvokeFunction --principal apigateway.amazonaws.com --source-arn 'arn:aws:execute-api:us-east-1:311964231104:$apiId/*/*' --region $REGION" -ForegroundColor Cyan
Write-Host ""

Write-Host "Press any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

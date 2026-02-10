param(
    [switch]$UpdateOnly
)

$FUNCTION_NAME = "sensapbl-generate-concepts-pilot"
$REGION = "us-east-1"
$ROLE_NAME = "SensaAI-lambda-execution-role"
$LAMBDA_DIR = "backend/lambda"
$ZIP_FILE = "generate-lambda.zip"

Write-Host "=== Deploying Generate Concepts Lambda ===" -ForegroundColor Cyan
Write-Host ""

if (Test-Path $ZIP_FILE) { Remove-Item $ZIP_FILE }

$stagingDir = "lambda-staging-generate"
if (Test-Path $stagingDir) { Remove-Item -Recurse -Force $stagingDir }
New-Item -ItemType Directory -Path $stagingDir | Out-Null

Write-Host "Packaging Lambda..." -ForegroundColor Yellow

Copy-Item -Recurse "$LAMBDA_DIR/generate_concepts" "$stagingDir/generate_concepts"
Copy-Item -Recurse "$LAMBDA_DIR/shared" "$stagingDir/shared"

Write-Host "  Included: generate_concepts/ (handler + services as package)" -ForegroundColor Gray
Write-Host "  Included: shared/ (utils.py, system_prompt.py)" -ForegroundColor Gray

Compress-Archive -Path "$stagingDir/*" -DestinationPath $ZIP_FILE
Remove-Item -Recurse -Force $stagingDir

$zipSize = (Get-Item $ZIP_FILE).Length / 1MB
Write-Host "Package size: $([math]::Round($zipSize, 2)) MB" -ForegroundColor Gray
Write-Host ""

$roleArn = (aws iam get-role --role-name $ROLE_NAME --query 'Role.Arn' --output text 2>$null)
if (-not $roleArn) {
    Write-Host "IAM role '$ROLE_NAME' not found. Create it first." -ForegroundColor Red
    Remove-Item $ZIP_FILE
    exit 1
}

$functionExists = aws lambda get-function --function-name $FUNCTION_NAME --region $REGION 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "Updating existing function code..." -ForegroundColor Yellow
    aws lambda update-function-code `
        --function-name $FUNCTION_NAME `
        --zip-file "fileb://$ZIP_FILE" `
        --region $REGION | Out-Null

    Write-Host "Waiting for update to complete..." -ForegroundColor Gray
    aws lambda wait function-updated --function-name $FUNCTION_NAME --region $REGION

    if (-not $UpdateOnly) {
        Write-Host "Updating function configuration..." -ForegroundColor Yellow
        aws lambda update-function-configuration `
            --function-name $FUNCTION_NAME `
            --handler generate_concepts.handler.lambda_handler `
            --timeout 900 `
            --memory-size 1024 `
            --region $REGION | Out-Null
    }

    Write-Host "Function updated" -ForegroundColor Green
} else {
    Write-Host "Creating new function..." -ForegroundColor Yellow
    aws lambda create-function `
        --function-name $FUNCTION_NAME `
        --runtime python3.11 `
        --role $roleArn `
        --handler generate_concepts.handler.lambda_handler `
        --zip-file "fileb://$ZIP_FILE" `
        --timeout 900 `
        --memory-size 1024 `
        --region $REGION `
        --environment "Variables={CONCEPTS_TABLE=SensaAI-concepts-pilot,JOBS_TABLE=SensaAI-jobs-pilot,BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0}" | Out-Null

    Write-Host "Function created" -ForegroundColor Green
}

Remove-Item $ZIP_FILE

Write-Host ""
Write-Host "=== Verify Environment Variables ===" -ForegroundColor Yellow
Write-Host "Check these are set in the Lambda console:" -ForegroundColor Gray
Write-Host "  CONCEPTS_TABLE = SensaAI-concepts-pilot" -ForegroundColor White
Write-Host "  JOBS_TABLE     = SensaAI-jobs-pilot" -ForegroundColor White
Write-Host "  BEDROCK_MODEL_ID = anthropic.claude-3-sonnet-20240229-v1:0" -ForegroundColor White
Write-Host ""
Write-Host "Done." -ForegroundColor Green

param(
    [switch]$UpdateOnly
)

$FUNCTION_NAME = "sensapbl-query-concepts-pilot"
$REGION = "us-east-1"
$ROLE_NAME = "SensaAI-lambda-execution-role"
$LAMBDA_DIR = "backend/lambda"
$ZIP_FILE = "query-lambda.zip"

Write-Host "=== Deploying Query Concepts Lambda ===" -ForegroundColor Cyan
Write-Host ""

if (Test-Path $ZIP_FILE) { Remove-Item $ZIP_FILE }

$stagingDir = "lambda-staging-query"
if (Test-Path $stagingDir) { Remove-Item -Recurse -Force $stagingDir }
New-Item -ItemType Directory -Path $stagingDir | Out-Null

Write-Host "Packaging Lambda..." -ForegroundColor Yellow

Copy-Item -Recurse "$LAMBDA_DIR/query_concepts" "$stagingDir/query_concepts"
Copy-Item -Recurse "$LAMBDA_DIR/shared" "$stagingDir/shared"

Write-Host "  Included: query_concepts/ (handler as package)" -ForegroundColor Gray
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
            --handler query_concepts.handler.lambda_handler `
            --timeout 30 `
            --memory-size 512 `
            --region $REGION | Out-Null
    }

    Write-Host "Function updated" -ForegroundColor Green
} else {
    Write-Host "Creating new function..." -ForegroundColor Yellow
    aws lambda create-function `
        --function-name $FUNCTION_NAME `
        --runtime python3.11 `
        --role $roleArn `
        --handler query_concepts.handler.lambda_handler `
        --zip-file "fileb://$ZIP_FILE" `
        --timeout 30 `
        --memory-size 512 `
        --region $REGION `
        --environment "Variables={CONCEPTS_TABLE=SensaAI-concepts-pilot,JOBS_TABLE=SensaAI-jobs-pilot}" | Out-Null

    Write-Host "Function created" -ForegroundColor Green
}

Remove-Item $ZIP_FILE

Write-Host ""
Write-Host "Done." -ForegroundColor Green

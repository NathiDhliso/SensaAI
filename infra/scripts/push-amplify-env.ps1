param(
    [ValidateSet("dev", "prod")]
    [string]$Environment = "prod",

    [string]$AppId = "dckqci84h8ffk",

    [string]$AwsRegion = "us-east-1",

    [switch]$TriggerBuild,

    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$env:AWS_PAGER = ""

$authLambda = "sensapbl-auth-$Environment"

Write-Host "`n[1/5] Reading auth Lambda config ($authLambda)..." -ForegroundColor Cyan
$authEnvRaw = aws lambda get-function-configuration --function-name $authLambda --query "Environment.Variables" --output json
if ($LASTEXITCODE -ne 0 -or -not $authEnvRaw) {
    throw "Failed to read auth Lambda config for '$authLambda'. Does the function exist?"
}
$authEnv = $authEnvRaw | ConvertFrom-Json

$poolId = $authEnv.COGNITO_USER_POOL_ID
$clientId = $authEnv.COGNITO_CLIENT_ID
$cognitoDomain = $authEnv.COGNITO_DOMAIN

if (-not $poolId -or -not $clientId) {
    throw "Auth Lambda is missing COGNITO_USER_POOL_ID or COGNITO_CLIENT_ID"
}

Write-Host "  Pool ID:   $poolId" -ForegroundColor Gray
Write-Host "  Client ID: $clientId" -ForegroundColor Gray
Write-Host "  Domain:    $cognitoDomain" -ForegroundColor Gray

Write-Host "`n[2/5] Validating Cognito pool exists..." -ForegroundColor Cyan
$poolCheck = aws cognito-idp describe-user-pool --user-pool-id $poolId --query "UserPool.Id" --output text 2>$null
if ($LASTEXITCODE -ne 0 -or -not $poolCheck) {
    throw "Cognito pool '$poolId' does NOT exist. Lambda config is stale - redeploy Lambda first."
}
Write-Host "  Pool verified." -ForegroundColor Green

Write-Host "`n[3/5] Reading API Gateway endpoint..." -ForegroundColor Cyan
$apisRaw = aws apigatewayv2 get-apis --query "Items[?Name=='sensaai-$Environment-api'].[ApiEndpoint]" --output json
if ($LASTEXITCODE -ne 0) {
    throw "Failed to list API Gateway APIs"
}
$apis = $apisRaw | ConvertFrom-Json
if ($apis.Count -eq 0) {
    $apisRaw = aws apigatewayv2 get-apis --query "Items[?Name=='sensapbl-$Environment-api'].[ApiEndpoint]" --output json
    $apis = $apisRaw | ConvertFrom-Json
}
if ($apis.Count -eq 0) {
    $apisRaw = aws apigatewayv2 get-apis --query "Items[?Name=='sensapbl-api-$Environment'].[ApiEndpoint]" --output json
    $apis = $apisRaw | ConvertFrom-Json
}
if ($apis.Count -eq 0) {
    throw "No API Gateway found for environment '$Environment'"
}
$apiEndpoint = $apis[0][0]
Write-Host "  API: $apiEndpoint" -ForegroundColor Gray

Write-Host "`n[4/5] Reading current Amplify app vars and merging..." -ForegroundColor Cyan
$appEnvRaw = aws amplify get-app --app-id $AppId --query "app.environmentVariables" --output json
if ($LASTEXITCODE -ne 0 -or -not $appEnvRaw) {
    throw "Failed to get Amplify app environment variables"
}
$appEnv = $appEnvRaw | ConvertFrom-Json

$domainFull = if ($cognitoDomain -match "amazoncognito\.com") { $cognitoDomain } else { "$cognitoDomain.auth.$AwsRegion.amazoncognito.com" }

$target = @{
    VITE_AWS_REGION              = $AwsRegion
    VITE_API_URL                 = $apiEndpoint
    VITE_API_ENDPOINT            = $apiEndpoint
    VITE_GYM_AI_URL              = $apiEndpoint
    VITE_COGNITO_USER_POOL_ID    = $poolId
    VITE_COGNITO_CLIENT_ID       = $clientId
    VITE_COGNITO_DOMAIN          = $domainFull
    VITE_AWS_S3_BUCKET_NAME      = "sensapbl-$Environment-content-311964231104"
    VITE_AWS_DYNAMODB_TABLE_NAME = "sensapbl-concepts-$Environment"
}

$changed = @()
foreach ($k in $target.Keys) {
    $current = $appEnv.$k
    $desired = $target[$k]
    if ($current -ne $desired) {
        $changed += "  $k`: $current -> $desired"
        $appEnv.$k = $desired
    }
}

if ($changed.Count -eq 0) {
    Write-Host "  No changes needed. Amplify already matches Lambda." -ForegroundColor Green
    if (-not $TriggerBuild) { exit 0 }
} else {
    Write-Host "  Changes:" -ForegroundColor Yellow
    $changed | ForEach-Object { Write-Host $_ -ForegroundColor Yellow }
}

if ($DryRun) {
    Write-Host "`n[DRY RUN] Would update Amplify but stopping here." -ForegroundColor Magenta
    exit 0
}

$envPairs = @()
$appEnv.PSObject.Properties | ForEach-Object {
    $envPairs += ("{0}={1}" -f $_.Name, $_.Value)
}
$envArg = [string]::Join(",", $envPairs)

aws amplify update-app --app-id $AppId --environment-variables $envArg --output json | Out-Null
if ($LASTEXITCODE -ne 0) {
    throw "Failed to update Amplify app-level environment variables"
}

Write-Host "`n[5/5] Syncing branches..." -ForegroundColor Cyan
$branchesRaw = aws amplify list-branches --app-id $AppId --query "branches[].branchName" --output json
if ($LASTEXITCODE -ne 0 -or -not $branchesRaw) {
    throw "Failed to list Amplify branches"
}

$branches = $branchesRaw | ConvertFrom-Json
foreach ($branch in $branches) {
    aws amplify update-branch --app-id $AppId --branch-name $branch --environment-variables $envArg --output json | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to update branch '$branch'"
    }
    Write-Host "  Synced: $branch" -ForegroundColor Gray
    if ($TriggerBuild) {
        aws amplify start-job --app-id $AppId --branch-name $branch --job-type RELEASE --output json | Out-Null
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to trigger build for branch '$branch'"
        }
        Write-Host "  Build triggered: $branch" -ForegroundColor Gray
    }
}

Write-Host "`nDone. Amplify env vars synced from Lambda ($Environment) across $($branches.Count) branches." -ForegroundColor Green

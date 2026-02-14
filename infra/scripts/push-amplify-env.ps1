param(
    [ValidateSet("dev", "prod")]
    [string]$Environment = "dev"
)

$AppId = "dckqci84h8ffk"
$Branch = "main"

if ($Environment -eq "dev") {
    $EnvVars = @{
        VITE_AWS_REGION                = "us-east-1"
        VITE_API_URL                   = "https://ldppp79nj5.execute-api.us-east-1.amazonaws.com"
        VITE_API_ENDPOINT              = "https://ldppp79nj5.execute-api.us-east-1.amazonaws.com"
        VITE_GYM_AI_URL                = "https://ldppp79nj5.execute-api.us-east-1.amazonaws.com"
        VITE_COGNITO_USER_POOL_ID      = "us-east-1_xNWax9wkH"
        VITE_COGNITO_CLIENT_ID         = "rb03h90erbokpl8jvj1tvofe2"
        VITE_COGNITO_DOMAIN            = "sensaai-dev.auth.us-east-1.amazoncognito.com"
        VITE_COGNITO_REDIRECT_URI      = "https://main.dckqci84h8ffk.amplifyapp.com/auth/callback"
        VITE_AWS_S3_BUCKET_NAME        = "sensaai-dev-content-311964231104"
        VITE_AWS_DYNAMODB_TABLE_NAME   = "sensaai-concepts-dev"
    }
} elseif ($Environment -eq "prod") {
    Write-Host "Prod environment not yet deployed. Run terraform apply in infra/terraform/environments/prod/ first." -ForegroundColor Yellow
    Write-Host "Then update the values in this script." -ForegroundColor Yellow
    exit 1
}

$EnvJson = ($EnvVars.GetEnumerator() | ForEach-Object { "`"$($_.Key)`":`"$($_.Value)`"" }) -join ","
$EnvJson = "{$EnvJson}"

Write-Host "`nPushing $Environment env vars to Amplify app $AppId (branch: $Branch)..." -ForegroundColor Cyan

aws amplify update-branch `
    --app-id $AppId `
    --branch-name $Branch `
    --environment-variables $EnvJson `
    --output json

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nEnv vars pushed successfully." -ForegroundColor Green
    Write-Host "Starting a new build to apply changes..." -ForegroundColor Cyan

    aws amplify start-job `
        --app-id $AppId `
        --branch-name $Branch `
        --job-type RELEASE `
        --output json

    if ($LASTEXITCODE -eq 0) {
        Write-Host "Build triggered. Check Amplify Console for progress." -ForegroundColor Green
    } else {
        Write-Host "Failed to trigger build. Trigger manually in Amplify Console." -ForegroundColor Yellow
    }
} else {
    Write-Host "Failed to update env vars. Check AWS credentials and app ID." -ForegroundColor Red
    exit 1
}

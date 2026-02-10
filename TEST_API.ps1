# Test API Endpoints
Write-Host "=== Testing API Endpoints ===" -ForegroundColor Cyan
Write-Host ""

$API_URL = "https://c4kxjdukwj.execute-api.us-east-1.amazonaws.com"
$USER_ID = "245834e8-60f1-70b2-1c76-4b5241c0b8df"

Write-Host "Testing /concepts/jobs endpoint..." -ForegroundColor Yellow
$response = Invoke-WebRequest -Uri "$API_URL/concepts/jobs?userId=$USER_ID" -Method GET -UseBasicParsing
Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
Write-Host "Response: $($response.Content)" -ForegroundColor Gray
Write-Host ""

Write-Host "Done!" -ForegroundColor Green

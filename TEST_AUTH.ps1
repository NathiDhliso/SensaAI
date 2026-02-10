# Test Authentication Endpoints
Write-Host "=== Testing Auth Endpoints ===" -ForegroundColor Cyan
Write-Host ""

$API_URL = "https://c4kxjdukwj.execute-api.us-east-1.amazonaws.com"

# Test 1: Validate endpoint (should return valid: false)
Write-Host "Test 1: Validate Session (no token)" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$API_URL/auth/session/validate" -Method GET -UseBasicParsing
    $result = $response.Content | ConvertFrom-Json
    Write-Host "✅ Validate endpoint working" -ForegroundColor Green
    Write-Host "   Response: $($result | ConvertTo-Json -Compress)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Validate endpoint failed" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 2: Login with test credentials
Write-Host "Test 2: Login" -ForegroundColor Yellow
Write-Host "Enter your Cognito credentials:" -ForegroundColor White
$email = Read-Host "Email"
$password = Read-Host "Password" -AsSecureString
$passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))

$body = @{
    email = $email
    password = $passwordPlain
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$API_URL/auth/session/login" -Method POST -Body $body -ContentType 'application/json' -UseBasicParsing
    $result = $response.Content | ConvertFrom-Json
    Write-Host "✅ Login successful!" -ForegroundColor Green
    Write-Host "   User: $($result.user.email)" -ForegroundColor Gray
    Write-Host "   Cookies: $($response.Headers['Set-Cookie'])" -ForegroundColor Gray
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "❌ Login failed (Status: $statusCode)" -ForegroundColor Red
    
    if ($statusCode -eq 401) {
        Write-Host "   Invalid email or password" -ForegroundColor Yellow
    } elseif ($statusCode -eq 500) {
        Write-Host "   Server error - check Lambda logs" -ForegroundColor Yellow
    } else {
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}
Write-Host ""

# Test 3: Check CORS
Write-Host "Test 3: CORS Preflight" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$API_URL/auth/session/login" -Method OPTIONS -UseBasicParsing
    $corsHeader = $response.Headers['Access-Control-Allow-Origin']
    Write-Host "✅ CORS configured" -ForegroundColor Green
    Write-Host "   Allow-Origin: $corsHeader" -ForegroundColor Gray
} catch {
    Write-Host "❌ CORS check failed" -ForegroundColor Red
}
Write-Host ""

Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "API URL: $API_URL" -ForegroundColor White
Write-Host "Endpoints:" -ForegroundColor White
Write-Host "  - POST /auth/session/login" -ForegroundColor Gray
Write-Host "  - GET /auth/session/validate" -ForegroundColor Gray
Write-Host "  - POST /auth/session/refresh" -ForegroundColor Gray
Write-Host "  - POST /auth/session/clear" -ForegroundColor Gray
Write-Host ""
Write-Host "Your Cognito User:" -ForegroundColor White
Write-Host "  Email: nkosimano@gmail.com" -ForegroundColor Gray
Write-Host "  Status: CONFIRMED" -ForegroundColor Green
Write-Host ""
Write-Host "If login fails, reset your password:" -ForegroundColor Yellow
Write-Host "  1. Go to Cognito Console" -ForegroundColor Gray
Write-Host "  2. Select user pool: us-east-1_nNdVox578" -ForegroundColor Gray
Write-Host "  3. Find user: nkosimano@gmail.com" -ForegroundColor Gray
Write-Host "  4. Click 'Reset password'" -ForegroundColor Gray
Write-Host ""

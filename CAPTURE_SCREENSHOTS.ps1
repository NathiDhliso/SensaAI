# Screenshot Capture Script
# This script will capture screenshots of all major frontend pages

Write-Host "=== SensaAI Frontend Screenshot Capture ===" -ForegroundColor Cyan
Write-Host ""

# Check if screenshots directory exists
if (-not (Test-Path "screenshots")) {
    Write-Host "Creating screenshots directory..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path "screenshots" | Out-Null
}

# Check if dev server is running
Write-Host "Checking if development server is running..." -ForegroundColor Yellow
$devServerRunning = $false
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5173" -Method Head -TimeoutSec 2 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        $devServerRunning = $true
        Write-Host "✓ Development server is running" -ForegroundColor Green
    }
} catch {
    Write-Host "✗ Development server is not running" -ForegroundColor Red
}

if (-not $devServerRunning) {
    Write-Host ""
    Write-Host "Please start the development server first:" -ForegroundColor Yellow
    Write-Host "  npm run dev" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Then run this script again." -ForegroundColor Yellow
    exit 1
}

# Check if backend is running
Write-Host "Checking if backend server is running..." -ForegroundColor Yellow
$backendRunning = $false
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -Method Get -TimeoutSec 2 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        $backendRunning = $true
        Write-Host "✓ Backend server is running" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠ Backend server may not be running (some features may not work)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Running Playwright screenshot tests..." -ForegroundColor Cyan
Write-Host ""

# Run the screenshot tests
npx playwright test tests/capture-screenshots.spec.ts --headed

Write-Host ""
Write-Host "=== Screenshot Capture Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Screenshots saved to: ./screenshots/" -ForegroundColor Cyan
Write-Host ""
Write-Host "To view the test report:" -ForegroundColor Yellow
Write-Host "  npm run test:e2e:report" -ForegroundColor Cyan
Write-Host ""

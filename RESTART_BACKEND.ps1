# Restart Backend Server with Multi-Phase System
# This script stops the old backend and starts the new one

Write-Host "=== Restarting Backend with Multi-Phase System ===" -ForegroundColor Cyan
Write-Host ""

# Find and stop backend processes on port 3000
Write-Host "Stopping old backend processes..." -ForegroundColor Yellow
$processes = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | 
    Select-Object -ExpandProperty OwningProcess -Unique

if ($processes) {
    foreach ($pid in $processes) {
        Write-Host "  Stopping process $pid" -ForegroundColor Gray
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 2
} else {
    Write-Host "  No backend process found on port 3000" -ForegroundColor Gray
}

# Verify port is free
Write-Host ""
Write-Host "Verifying port 3000 is available..." -ForegroundColor Yellow
$portCheck = Test-NetConnection -ComputerName localhost -Port 3000 -InformationLevel Quiet -WarningAction SilentlyContinue
if ($portCheck) {
    Write-Host "  ⚠️  Port 3000 still in use. Waiting..." -ForegroundColor Red
    Start-Sleep -Seconds 3
}

# Start new backend
Write-Host ""
Write-Host "Starting backend with multi-phase system..." -ForegroundColor Yellow
Write-Host ""
Write-Host "📝 Backend will start in a new window" -ForegroundColor Cyan
Write-Host "   Watch for: '🚀 SensaPBL Backend running on port 3000'" -ForegroundColor Cyan
Write-Host ""

# Start in new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; npm run dev"

# Wait for backend to start
Write-Host "Waiting for backend to start..." -ForegroundColor Yellow
$maxAttempts = 10
$attempt = 0
$started = $false

while ($attempt -lt $maxAttempts -and -not $started) {
    Start-Sleep -Seconds 2
    $attempt++
    $portCheck = Test-NetConnection -ComputerName localhost -Port 3000 -InformationLevel Quiet -WarningAction SilentlyContinue
    if ($portCheck) {
        $started = $true
    } else {
        Write-Host "  Attempt $attempt/$maxAttempts..." -ForegroundColor Gray
    }
}

Write-Host ""
if ($started) {
    Write-Host "✅ Backend started successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Backend is running at: http://localhost:3000" -ForegroundColor Cyan
    Write-Host "Health check: http://localhost:3000/health" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Multi-Phase System Status: ACTIVE ✅" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Yellow
    Write-Host "  1. Test via frontend: http://localhost:5173" -ForegroundColor White
    Write-Host "  2. Or test via API (see TEST_MULTI_PHASE.md)" -ForegroundColor White
    Write-Host "  3. Watch the backend window for phase progress" -ForegroundColor White
} else {
    Write-Host "❌ Backend failed to start" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "  1. Check the backend window for errors" -ForegroundColor White
    Write-Host "  2. Verify AWS credentials are configured" -ForegroundColor White
    Write-Host "  3. Check backend/.env file exists" -ForegroundColor White
    Write-Host "  4. Try manually: cd backend && npm run dev" -ForegroundColor White
}

Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

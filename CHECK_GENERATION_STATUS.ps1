# Script to check generation status and diagnose stuck generation

Write-Host "Checking Generation Status..." -ForegroundColor Cyan
Write-Host ""

# Check if backend is running
Write-Host "1. Checking Backend Server..." -ForegroundColor Yellow
$backendProcess = Get-Process | Where-Object {$_.ProcessName -eq "node" -and $_.CPU -gt 10}
if ($backendProcess) {
    Write-Host "   ✓ Backend server is running (PID: $($backendProcess.Id), CPU: $($backendProcess.CPU))" -ForegroundColor Green
} else {
    Write-Host "   ✗ Backend server may not be running properly" -ForegroundColor Red
}

Write-Host ""
Write-Host "2. Checking Browser Console..." -ForegroundColor Yellow
Write-Host "   Please check your browser console for errors:" -ForegroundColor White
Write-Host "   - Press F12 to open DevTools" -ForegroundColor Gray
Write-Host "   - Look for red errors in the Console tab" -ForegroundColor Gray
Write-Host "   - Check the Network tab for failed requests" -ForegroundColor Gray

Write-Host ""
Write-Host "3. Recommended Actions:" -ForegroundColor Yellow
Write-Host "   Option A - Refresh the page:" -ForegroundColor White
Write-Host "   - The generation should continue in the background" -ForegroundColor Gray
Write-Host "   - The page will reconnect to the active job" -ForegroundColor Gray
Write-Host ""
Write-Host "   Option B - Check backend logs:" -ForegroundColor White
Write-Host "   - Run: cd backend && npm run dev" -ForegroundColor Gray
Write-Host "   - Look for any error messages" -ForegroundColor Gray
Write-Host ""
Write-Host "   Option C - Restart generation:" -ForegroundColor White
Write-Host "   - Navigate back to the home page" -ForegroundColor Gray
Write-Host "   - Start a new generation" -ForegroundColor Gray

Write-Host ""
Write-Host "4. Common Issues:" -ForegroundColor Yellow
Write-Host "   - Lambda cold start (can take 30-60 seconds)" -ForegroundColor Gray
Write-Host "   - Network timeout (check your internet connection)" -ForegroundColor Gray
Write-Host "   - AWS credentials expired (check .env files)" -ForegroundColor Gray
Write-Host "   - DynamoDB throttling (too many requests)" -ForegroundColor Gray

Write-Host ""
Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

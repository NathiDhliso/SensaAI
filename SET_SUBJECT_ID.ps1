# Script to set the AZ-104 subject ID for screenshot capture

Write-Host "=== AZ-104 Subject ID Setup ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "To find your AZ-104 subject ID:" -ForegroundColor Yellow
Write-Host "1. Open your browser and go to: http://localhost:5173/library"
Write-Host "2. Find the AZ-104 (Azure Administrator) card"
Write-Host "3. Click the 'View' button"
Write-Host "4. Copy the ID from the URL (after /launchpad/)"
Write-Host "   Example: http://localhost:5173/launchpad/abc123xyz"
Write-Host "   The subject ID is: abc123xyz"
Write-Host ""

$subjectId = Read-Host "Enter the AZ-104 subject ID"

if ([string]::IsNullOrWhiteSpace($subjectId)) {
    Write-Host "❌ No subject ID provided. Exiting." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✓ Subject ID: $subjectId" -ForegroundColor Green
Write-Host ""
Write-Host "Updating test file..." -ForegroundColor Yellow

# Update the test file
$testFile = "tests\capture-interactive.spec.ts"
$content = Get-Content $testFile -Raw
$newContent = $content -replace "const SUBJECT_ID = 'REPLACE_WITH_REAL_ID';", "const SUBJECT_ID = '$subjectId';"

Set-Content $testFile $newContent

Write-Host "✓ Test file updated!" -ForegroundColor Green
Write-Host ""
Write-Host "Now run the screenshot capture:" -ForegroundColor Cyan
Write-Host "  npx playwright test tests/capture-interactive.spec.ts --project=chromium" -ForegroundColor White
Write-Host ""

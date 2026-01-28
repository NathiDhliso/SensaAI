# Test Generation Script for Mathematics Grade 12
# This script will trigger the generation and monitor progress

$subject = "Mathematics Grade 12"
$userId = "test-user-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
$baseUrl = "http://localhost:3000/api/v1"

# Add headers with dummy Bearer token for dev mode
$headers = @{
    "Authorization" = "Bearer dev-token"
    "Content-Type" = "application/json"
}

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Testing Generation for: $subject" -ForegroundColor Cyan
Write-Host "User ID: $userId" -ForegroundColor Cyan
Write-Host "======================================`n" -ForegroundColor Cyan

# Step 1: Start Generation
Write-Host "[1/4] Starting generation..." -ForegroundColor Yellow

$generatePayload = @{
    subject = $subject
    userId = $userId
    context = "Grade 12 Mathematics curriculum focusing on calculus, algebra, trigonometry, and statistics"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/concepts/generate" `
        -Method Post `
        -Body $generatePayload `
        -Headers $headers `
        -ErrorAction Stop
    
    $jobId = $response.jobId
    $sessionId = $response.sessionId
    
    Write-Host "✓ Generation started successfully" -ForegroundColor Green
    Write-Host "  Job ID: $jobId" -ForegroundColor Gray
    Write-Host "  Session ID: $sessionId`n" -ForegroundColor Gray
}
catch {
    Write-Host "✗ Failed to start generation" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "`nResponse Body:" -ForegroundColor Yellow
    Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    exit 1
}

# Step 2: Monitor Progress
Write-Host "[2/4] Monitoring generation progress..." -ForegroundColor Yellow
$maxAttempts = 120  # 10 minutes max (120 * 5 seconds)
$attempt = 0
$lastConceptCount = 0

while ($attempt -lt $maxAttempts) {
    try {
        $status = Invoke-RestMethod -Uri "$baseUrl/concepts/status/$jobId`?userId=$userId" `
            -Method Get `
            -Headers $headers `
            -ErrorAction Stop
        
        $currentStatus = $status.status
        $conceptCount = if ($status.conceptCount) { $status.conceptCount } else { 0 }
        
        # Show progress update if concepts increased
        if ($conceptCount -gt $lastConceptCount) {
            Write-Host "  Progress: $conceptCount concepts generated (Status: $currentStatus)" -ForegroundColor Cyan
            $lastConceptCount = $conceptCount
        }
        
        if ($currentStatus -eq "completed") {
            Write-Host "`n✓ Generation completed!" -ForegroundColor Green
            Write-Host "  Total concepts: $conceptCount`n" -ForegroundColor Gray
            break
        }
        elseif ($currentStatus -eq "failed") {
            Write-Host "`n✗ Generation failed" -ForegroundColor Red
            if ($status.error) {
                Write-Host "  Error: $($status.error)" -ForegroundColor Red
            }
            exit 1
        }
        
        # Wait before next poll
        Start-Sleep -Seconds 5
        $attempt++
    }
    catch {
        Write-Host "`n✗ Failed to check status" -ForegroundColor Red
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

if ($attempt -eq $maxAttempts) {
    Write-Host "`n⚠ Generation timeout after $maxAttempts attempts" -ForegroundColor Yellow
    exit 1
}

# Step 3: Retrieve Generated Concepts
Write-Host "[3/4] Retrieving generated concepts..." -ForegroundColor Yellow

try {
    $foundation = Invoke-RestMethod -Uri "$baseUrl/concepts?userId=$userId&sessionId=$sessionId&tier=foundation" -Method Get -Headers $headers
    $keystone = Invoke-RestMethod -Uri "$baseUrl/concepts?userId=$userId&sessionId=$sessionId&tier=keystone" -Method Get -Headers $headers
    $utility = Invoke-RestMethod -Uri "$baseUrl/concepts?userId=$userId&sessionId=$sessionId&tier=utility" -Method Get -Headers $headers
    
    $totalRetrieved = $foundation.count + $keystone.count + $utility.count
    
    Write-Host "✓ Retrieved $totalRetrieved concepts" -ForegroundColor Green
    Write-Host "  Foundation: $($foundation.count)" -ForegroundColor Gray
    Write-Host "  Keystone: $($keystone.count)" -ForegroundColor Gray
    Write-Host "  Utility: $($utility.count)`n" -ForegroundColor Gray
    
    # Display sample concepts
    if ($foundation.concepts.Count -gt 0) {
        Write-Host "`nSample Concepts:" -ForegroundColor Cyan
        Write-Host "─────────────────" -ForegroundColor Cyan
        
        $sampleCount = [Math]::Min(5, $foundation.concepts.Count)
        for ($i = 0; $i -lt $sampleCount; $i++) {
            $concept = $foundation.concepts[$i]
            Write-Host "  • $($concept.name)" -ForegroundColor White
            if ($concept.hookSentence) {
                Write-Host "    $($concept.hookSentence)" -ForegroundColor Gray
            }
        }
        Write-Host ""
    }
}
catch {
    Write-Host "✗ Failed to retrieve concepts" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 4: Verification
Write-Host "[4/4] Verifying data integrity..." -ForegroundColor Yellow

$allConcepts = @($foundation.concepts) + @($keystone.concepts) + @($utility.concepts)

# Check for required fields
$missingFields = @()
foreach ($concept in $allConcepts) {
    if (-not $concept.name) { $missingFields += "Missing name" }
    if (-not $concept.tier) { $missingFields += "Missing tier" }
    if (-not $concept.cognitiveLevel) { $missingFields += "Missing cognitiveLevel" }
}

if ($missingFields.Count -eq 0) {
    Write-Host "✓ All concepts have required fields" -ForegroundColor Green
}
else {
    Write-Host "⚠ Found $($missingFields.Count) validation issues" -ForegroundColor Yellow
}

# Summary
Write-Host "`n======================================" -ForegroundColor Cyan
Write-Host "GENERATION TEST SUMMARY" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Subject: $subject" -ForegroundColor White
Write-Host "Session ID: $sessionId" -ForegroundColor White
Write-Host "Total Concepts: $totalRetrieved" -ForegroundColor White
Write-Host "Status: COMPLETED" -ForegroundColor Green
Write-Host "======================================`n" -ForegroundColor Cyan

# Save results to file
$outputFile = "generation-test-results-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
$results = @{
    subject = $subject
    sessionId = $sessionId
    jobId = $jobId
    userId = $userId
    timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    conceptCount = $totalRetrieved
    breakdown = @{
        foundation = $foundation.count
        keystone = $keystone.count
        utility = $utility.count
    }
    sampleConcepts = $allConcepts | Select-Object -First 10
} | ConvertTo-Json -Depth 10

Set-Content -Path $outputFile -Value $results
Write-Host "Results saved to: $outputFile" -ForegroundColor Green

<#
.SYNOPSIS
    Master script to run all SensaAI coding guideline checks.

.DESCRIPTION
    Runs all individual check scripts and reports overall status.
    Use this before committing or as part of CI/CD pipeline.

    EXIT CODES:
    0 = All checks pass
    1 = One or more checks failed
#>

$ErrorActionPreference = "Continue"

$ScriptDir = $PSScriptRoot

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║       SensaAI Coding Guidelines - Full Check Suite            ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$checks = @(
    @{ Name = "Hardcoded Subjects"; Script = "check-hardcoded-subjects.ps1" },
    @{ Name = "Hardcoded Colors"; Script = "check-hardcoded-colors.ps1" },
    @{ Name = "Magic Timeouts"; Script = "check-magic-timeouts.ps1" },
    @{ Name = "Console.log Statements"; Script = "check-console-logs.ps1" },
    @{ Name = "Explicit 'any' Types"; Script = "check-any-types.ps1" },
    @{ Name = "CSS Variable Prefixes"; Script = "check-css-var-prefixes.ps1" }
)

$results = @()
$failedCount = 0

foreach ($check in $checks) {
    $scriptPath = Join-Path $ScriptDir $check.Script
    
    if (-not (Test-Path $scriptPath)) {
        Write-Host "  [SKIP] $($check.Name) - Script not found" -ForegroundColor DarkGray
        continue
    }
    
    Write-Host "  Running: $($check.Name)..." -ForegroundColor White -NoNewline
    
    try {
        $output = & pwsh -File $scriptPath 2>&1
        $exitCode = $LASTEXITCODE
        
        if ($exitCode -eq 0) {
            Write-Host " [PASS]" -ForegroundColor Green
            $results += [PSCustomObject]@{ Check = $check.Name; Status = "PASS" }
        }
        else {
            Write-Host " [FAIL]" -ForegroundColor Red
            $results += [PSCustomObject]@{ Check = $check.Name; Status = "FAIL" }
            $failedCount++
        }
    }
    catch {
        Write-Host " [ERROR]" -ForegroundColor Red
        $results += [PSCustomObject]@{ Check = $check.Name; Status = "ERROR" }
        $failedCount++
    }
}

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "                         SUMMARY" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

foreach ($result in $results) {
    $icon = if ($result.Status -eq "PASS") { "✓" } else { "✗" }
    $color = if ($result.Status -eq "PASS") { "Green" } else { "Red" }
    Write-Host "  $icon $($result.Check): $($result.Status)" -ForegroundColor $color
}

Write-Host ""

if ($failedCount -eq 0) {
    Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║                    ALL CHECKS PASSED ✓                         ║" -ForegroundColor Green
    Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Green
    exit 0
}
else {
    Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Red
    Write-Host "║              $failedCount CHECK(S) FAILED - REVIEW REQUIRED              ║" -ForegroundColor Red
    Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Run individual scripts for detailed output:" -ForegroundColor Yellow
    Write-Host "    pwsh scripts/<scriptname>.ps1" -ForegroundColor White
    Write-Host ""
    exit 1
}

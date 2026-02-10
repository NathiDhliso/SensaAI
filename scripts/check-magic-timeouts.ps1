<#
.SYNOPSIS
    Scans for hardcoded timeout/delay values in TypeScript/TSX files.
    Timeouts should use UI_TIMINGS constants.

.DESCRIPTION
    Detects patterns like:
    - setTimeout(..., 2000)
    - setTimeout(..., 3000)
    - delay(5000)
    Common magic numbers: 100, 200, 300, 500, 1000, 1500, 2000, 3000, 5000

    EXIT CODES:
    0 = Clean
    1 = Violations found
#>

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
if (-not $ProjectRoot) { $ProjectRoot = Get-Location }

$ScanPaths = @("$ProjectRoot\src")

$ExcludeDirs = @("node_modules", ".git", "dist", "build", "__mocks__", "__tests__")

# Magic timeout numbers to flag
$MagicNumbers = @(100, 150, 200, 250, 300, 400, 500, 750, 1000, 1500, 2000, 2500, 3000, 4000, 5000, 10000)

$ForbiddenPatterns = @()
foreach ($num in $MagicNumbers) {
    $ForbiddenPatterns += @{
        Pattern     = "setTimeout\s*\([^,]+,\s*$num\s*\)";
        Description = "Magic timeout $num ms - use UI_TIMINGS constant";
        Severity    = "HIGH"
    }
    $ForbiddenPatterns += @{
        Pattern     = "setInterval\s*\([^,]+,\s*$num\s*\)";
        Description = "Magic interval $num ms - use UI_TIMINGS constant";
        Severity    = "HIGH"
    }
}

$FileExtensions = @("*.ts", "*.tsx")

# Allowlist: files that legitimately define timing constants
$AllowlistFiles = @("ui-constants.ts")

function Test-ShouldExclude {
    param([string]$Path)
    foreach ($exclude in $ExcludeDirs) {
        if ($Path -like "*\$exclude\*" -or $Path -like "*/$exclude/*") { return $true }
    }
    foreach ($allowed in $AllowlistFiles) {
        if ($Path -like "*$allowed") { return $true }
    }
    return $false
}

function Find-Violations {
    $violations = @()
    
    foreach ($scanPath in $ScanPaths) {
        if (-not (Test-Path $scanPath)) { continue }

        foreach ($ext in $FileExtensions) {
            $files = Get-ChildItem -Path $scanPath -Filter $ext -Recurse -File -ErrorAction SilentlyContinue
            
            foreach ($file in $files) {
                if (Test-ShouldExclude -Path $file.FullName) { continue }

                $content = Get-Content -Path $file.FullName -Raw -ErrorAction SilentlyContinue
                if (-not $content) { continue }

                $lineNumber = 0
                $lines = $content -split "`n"
                
                foreach ($line in $lines) {
                    $lineNumber++
                    
                    # Skip comments
                    if ($line.Trim().StartsWith("//") -or $line.Trim().StartsWith("/*")) { continue }
                    
                    foreach ($patternDef in $ForbiddenPatterns) {
                        if ($line -match $patternDef.Pattern) {
                            $truncatedContent = $line.Trim()
                            if ($truncatedContent.Length -gt 80) {
                                $truncatedContent = $truncatedContent.Substring(0, 80) + "..."
                            }
                            $violations += [PSCustomObject]@{
                                File     = $file.FullName.Replace($ProjectRoot, ".")
                                Line     = $lineNumber
                                Pattern  = $patternDef.Description
                                Severity = $patternDef.Severity
                                Content  = $truncatedContent
                            }
                        }
                    }
                }
            }
        }
    }

    return $violations
}

# Main
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " SensaAI Magic Timeout Check" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$violations = Find-Violations

if ($violations.Count -eq 0) {
    Write-Host "[PASS] No magic timeout values detected." -ForegroundColor Green
    exit 0
}
else {
    Write-Host "[FAIL] Found $($violations.Count) potential violation(s):" -ForegroundColor Red
    Write-Host ""

    $grouped = $violations | Group-Object -Property File
    foreach ($group in $grouped) {
        Write-Host "  File: $($group.Name)" -ForegroundColor Yellow
        foreach ($v in $group.Group) {
            $color = if ($v.Severity -eq "HIGH") { "Red" } else { "DarkYellow" }
            Write-Host "    Line $($v.Line): [$($v.Severity)] $($v.Pattern)" -ForegroundColor $color
            Write-Host "      > $($v.Content)" -ForegroundColor DarkGray
        }
        Write-Host ""
    }

    Write-Host "========================================" -ForegroundColor Red
    Write-Host " ACTION: Use UI_TIMINGS constants" -ForegroundColor Red
    Write-Host " See: .agent/workflows/coding-guidelines.md" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    exit 1
}

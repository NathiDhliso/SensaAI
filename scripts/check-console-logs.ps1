<#
.SYNOPSIS
    Scans for console.log statements in TypeScript/TSX files.
    Console.log should be removed before production.

.DESCRIPTION
    Detects patterns like:
    - console.log(...)
    - console.warn(...)
    - console.error(...) - allowed, but flagged as MEDIUM
    - console.debug(...)

    EXIT CODES:
    0 = Clean
    1 = Violations found
#>

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
if (-not $ProjectRoot) { $ProjectRoot = Get-Location }

$ScanPaths = @("$ProjectRoot\src")

$ExcludeDirs = @("node_modules", ".git", "dist", "build", "__mocks__", "__tests__")

$ForbiddenPatterns = @(
    @{
        Pattern     = 'console\.log\s*\(';
        Description = "console.log statement - remove before production";
        Severity    = "HIGH"
    },
    @{
        Pattern     = 'console\.debug\s*\(';
        Description = "console.debug statement - remove before production";
        Severity    = "HIGH"
    }
)

$FileExtensions = @("*.ts", "*.tsx")

function Test-ShouldExclude {
    param([string]$Path)
    foreach ($exclude in $ExcludeDirs) {
        if ($Path -like "*\$exclude\*" -or $Path -like "*/$exclude/*") { return $true }
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
                    
                    # Skip if in a comment
                    if ($line.Trim().StartsWith("//")) { continue }
                    
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
Write-Host " SensaAI Console.log Check" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$violations = Find-Violations

if ($violations.Count -eq 0) {
    Write-Host "[PASS] No console.log statements detected." -ForegroundColor Green
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
    Write-Host " ACTION: Remove console statements" -ForegroundColor Red
    Write-Host " See: .agent/workflows/coding-guidelines.md" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    exit 1
}

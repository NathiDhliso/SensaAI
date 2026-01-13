<#
.SYNOPSIS
    Scans for explicit 'any' type usage in TypeScript files.
    Explicit 'any' should be avoided for type safety.

.DESCRIPTION
    Detects patterns like:
    - : any
    - : any[]
    - as any
    - <any>

    EXIT CODES:
    0 = Clean
    1 = Violations found
#>

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
if (-not $ProjectRoot) { $ProjectRoot = Get-Location }

$ScanPaths = @("$ProjectRoot\src", "$ProjectRoot\backend\src")

$ExcludeDirs = @("node_modules", ".git", "dist", "build", "__mocks__", "__tests__", "*.d.ts")

$ForbiddenPatterns = @(
    @{
        Pattern     = ':\s*any\s*[;,\)\]\}=]';
        Description = "Explicit 'any' type annotation - use specific type";
        Severity    = "HIGH"
    },
    @{
        Pattern     = ':\s*any\s*$';
        Description = "Explicit 'any' type at end of line - use specific type";
        Severity    = "HIGH"
    },
    @{
        Pattern     = '\bas\s+any\b';
        Description = "'as any' type assertion - use proper typing";
        Severity    = "HIGH"
    },
    @{
        Pattern     = '<any>';
        Description = "Generic <any> type - use specific type parameter";
        Severity    = "HIGH"
    }
)

$FileExtensions = @("*.ts", "*.tsx")

function Test-ShouldExclude {
    param([string]$Path)
    foreach ($exclude in $ExcludeDirs) {
        if ($Path -like "*\$exclude\*" -or $Path -like "*/$exclude/*") { return $true }
    }
    # Exclude type definition files
    if ($Path -like "*.d.ts") { return $true }
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
                    # Skip eslint-disable comments
                    if ($line -match "eslint-disable") { continue }
                    
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
Write-Host " SensaPBL Explicit 'any' Type Check" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$violations = Find-Violations

if ($violations.Count -eq 0) {
    Write-Host "[PASS] No explicit 'any' types detected." -ForegroundColor Green
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
    Write-Host " ACTION: Replace 'any' with specific types" -ForegroundColor Red
    Write-Host " See: .agent/workflows/coding-guidelines.md" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    exit 1
}

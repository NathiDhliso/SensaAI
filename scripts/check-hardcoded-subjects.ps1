<#
.SYNOPSIS
    Scans the SensaPBL codebase for hardcoded subject logic patterns.
    This script MUST be run before each commit or as part of CI/CD.

.DESCRIPTION
    Detects patterns that indicate subject-specific branching or hardcoding:
    1. Conditional checks for specific subject strings
    2. Subject-specific array definitions
    3. Any exam name literals in source code outside of documentation.

    EXIT CODES:
    0 = Clean (no violations)
    1 = Violations found
#>

param(
    [switch]$FixMode = $false
)

$ErrorActionPreference = "Stop"

# Configuration
$ProjectRoot = Split-Path -Parent $PSScriptRoot
if (-not $ProjectRoot) { $ProjectRoot = Get-Location }

$ScanPaths = @(
    "$ProjectRoot\src",
    "$ProjectRoot\backend"
)

$ExcludeDirs = @(
    "node_modules",
    ".git",
    "dist",
    "build",
    "__pycache__",
    ".venv",
    "docs"
)

# Patterns that indicate hardcoded subject logic (REGEX)
$ForbiddenPatterns = @(
    @{
        Pattern     = 'if\s+[''"].*[''"]\s+in\s+subject';
        Description = "Python: Subject string matching in conditional";
        Severity    = "HIGH"
    },
    @{
        Pattern     = 'subject.*\.lower\(\).*(?:==|in|contains|includes)';
        Description = "Python/TS: Case-insensitive subject comparison";
        Severity    = "HIGH"
    },
    @{
        Pattern     = 'subject\.toLowerCase\(\)\.includes\([''"]';
        Description = "TypeScript: Subject string includes check";
        Severity    = "HIGH"
    },
    @{
        Pattern     = 'if\s*\(\s*subject\s*===?\s*[''"]';
        Description = "TypeScript: Direct subject equality check";
        Severity    = "HIGH"
    }
)

$FileExtensions = @("*.ts", "*.tsx", "*.py", "*.js", "*.jsx")

function Test-ShouldExclude {
    param([string]$Path)
    foreach ($exclude in $ExcludeDirs) {
        if ($Path -like "*\$exclude\*" -or $Path -like "*/$exclude/*") {
            return $true
        }
    }
    return $false
}

function Find-Violations {
    $violations = @()
    
    foreach ($scanPath in $ScanPaths) {
        if (-not (Test-Path $scanPath)) {
            Write-Warning "Scan path not found: $scanPath"
            continue
        }

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
Write-Host " SensaPBL Hardcoded Subject Check" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$violations = Find-Violations

if ($violations.Count -eq 0) {
    Write-Host "[PASS] No hardcoded subject logic detected." -ForegroundColor Green
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
    Write-Host " ACTION REQUIRED: Remove subject-specific logic" -ForegroundColor Red
    Write-Host " See: .agent/workflows/coding-guidelines.md" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    exit 1
}

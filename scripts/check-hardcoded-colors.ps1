<#
.SYNOPSIS
    Scans for hardcoded hex colors in TypeScript/TSX files.
    Colors should use COLORS constants from @/constants/theme-colors.

.DESCRIPTION
    Detects patterns like:
    - "#1f2937" (hex colors in strings)
    - color: '#22c55e' (inline color assignments)
    Excludes: CSS files (use var(--...)), test files, and comments.

    EXIT CODES:
    0 = Clean
    1 = Violations found
#>

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
if (-not $ProjectRoot) { $ProjectRoot = Get-Location }

$ScanPaths = @("$ProjectRoot\src")

$ExcludeDirs = @("node_modules", ".git", "dist", "build", "__mocks__", "__tests__")

# Pattern: Hex color in quotes (but not in comments or CSS var definitions)
$ForbiddenPatterns = @(
    @{
        Pattern     = '[''"]#[0-9a-fA-F]{6}[''"]';
        Description = "Hardcoded hex color - use COLORS constants";
        Severity    = "HIGH"
    },
    @{
        Pattern     = '[''"]#[0-9a-fA-F]{3}[''"]';
        Description = "Hardcoded 3-digit hex color - use COLORS constants";
        Severity    = "HIGH"
    },
    @{
        Pattern     = 'rgba?\s*\(\s*\d+\s*,\s*\d+\s*,\s*\d+';
        Description = "Hardcoded rgb/rgba color - use CSS variables";
        Severity    = "MEDIUM"
    }
)

$FileExtensions = @("*.ts", "*.tsx")

# Allowlist: files that legitimately define colors
$AllowlistFiles = @(
    "theme-colors.ts",
    "index.css"
)

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
                    # Skip CSS variable definitions
                    if ($line -match "var\s*\(--") { continue }
                    
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
Write-Host " SensaPBL Hardcoded Color Check" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$violations = Find-Violations

if ($violations.Count -eq 0) {
    Write-Host "[PASS] No hardcoded colors detected." -ForegroundColor Green
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
    Write-Host " ACTION: Use COLORS constants or CSS variables" -ForegroundColor Red
    Write-Host " See: .agent/workflows/coding-guidelines.md" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    exit 1
}

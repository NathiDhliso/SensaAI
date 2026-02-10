<#
.SYNOPSIS
    Scans for potentially invalid CSS variable usages, specifically missing 'color-' prefixes.

.DESCRIPTION
    Detects patterns like:
    - var(--text-secondary)  -> should be var(--color-text-secondary)
    - var(--bg-primary)      -> should be var(--color-bg-primary)
    
    The project convention in index.css is that all color variables are prefixed with --color-.
    
    EXIT CODES:
    0 = Clean
    1 = Violations found
#>

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
if (-not $ProjectRoot) { $ProjectRoot = Get-Location }

$ScanPaths = @("$ProjectRoot\src")
$FileExtensions = @("*.ts", "*.tsx", "*.css", "*.scss")
$ExcludeDirs = @("node_modules", ".git", "dist", "build", "__mocks__", "__tests__")

# Allowed variables that happen to start with suspicious prefixes but are valid
$AllowedVariables = @(
    "border-width",
    "border-radius",
    "border-style",
    "border-collapse",
    "text-align",
    "text-transform",
    "text-decoration"
)

# Bad prefixes that imply a missing "color-" start with suspicious prefixes but are valid
$AllowedVariables = @(
    "border-width",
    "border-radius",
    "border-style",
    "border-collapse",
    "text-align",
    "text-transform",
    "text-decoration"
)

# Bad prefixes that imply a missing "color-"
# e.g. we find var(--text-...) but we expect var(--color-text-...)
$SuspiciousPrefixes = @(
    "text-",
    "bg-",
    "border-",
    "surface-",
    "accent-",
    "primary-",
    "secondary-",
    "success-",
    "warning-",
    "error-",
    "info-"
)

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
                    
                    # Look for var(--...) usage
                    $pattern = "var\s*\(--([a-zA-Z0-9-]+)"
                    $ms = [regex]::Matches($line, $pattern)
                    
                    foreach ($m in $ms) {
                        $varName = $m.Groups[1].Value # e.g. text-secondary
                        
                        if ($AllowedVariables -contains $varName) {
                            continue
                        }

                        foreach ($badPrefix in $SuspiciousPrefixes) {
                            if ($varName.StartsWith($badPrefix)) {
                                $violations += [PSCustomObject]@{
                                    File       = $file.FullName.Replace($ProjectRoot, ".")
                                    Line       = $lineNumber
                                    Variable   = "--$varName"
                                    Suggestion = "--color-$varName"
                                    Content    = $line.Trim()
                                }
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
Write-Host " SensaAI CSS Variable Prefix Check" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$violations = Find-Violations

if ($violations.Count -eq 0) {
    Write-Host "[PASS] No invalid CSS variable prefixes detected." -ForegroundColor Green
    exit 0
}
else {
    Write-Host "[FAIL] Found $($violations.Count) potential violation(s):" -ForegroundColor Red
    Write-Host ""

    $grouped = $violations | Group-Object -Property File
    foreach ($group in $grouped) {
        Write-Host "  File: $($group.Name)" -ForegroundColor Yellow
        foreach ($v in $group.Group) {
            Write-Host "    Line $($v.Line): Used '$($v.Variable)' -> Did you mean '$($v.Suggestion)'?" -ForegroundColor Red
            Write-Host "      > $($v.Content)" -ForegroundColor DarkGray
        }
        Write-Host ""
    }

    Write-Host "========================================" -ForegroundColor Red
    Write-Host " ACTION: Add 'color-' prefix to these variables." -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    exit 1
}

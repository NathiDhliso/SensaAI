
# UI Audit Script
# Scans for common "Bad UI Practices" as requested by the user:
# 1. !important usage (Specificity wars)
# 2. Hardcoded high z-indexes (Layering hacks)
# 3. Inline styles (Maintainability nightmare)
# 4. Absolute positioning (Layout fragility)

$rootPath = "src"
$patterns = @{
    "Specificity Hack (!important)" = "!important"
    "High Z-Index Hack (>100)"      = "z-index:\s*[1-9][0-9]{2,}"
    "Inline Style (React)"          = "style=\{\{"
    "Absolute Positioning (Risk)"   = "position:\s*absolute"
    "Fixed Height (pixel)"          = "height:\s*[0-9]+px"
}

Write-Host "Starting UI Audit..." -ForegroundColor Cyan
Write-Host "Scanning $rootPath for bad practices..." -ForegroundColor Gray

foreach ($key in $patterns.Keys) {
    $pattern = $patterns[$key]
    Write-Host "`nSearching for: $key ($pattern)" -ForegroundColor Yellow
    
    # Use Select-String to find matches
    $matches = Get-ChildItem -Path $rootPath -Recurse -Include *.tsx, *.css, *.ts | 
    Select-String -Pattern $pattern
    
    if ($matches.Count -eq 0) {
        Write-Host "  Good news! No instances found." -ForegroundColor Green
    }
    else {
        Write-Host "  Found $($matches.Count) instances:" -ForegroundColor Red
        $matches | Select-Object -First 5 | ForEach-Object {
            Write-Host "    $($_.Filename):$($_.LineNumber) - $($_.Line.Trim())" -ForegroundColor Gray
        }
        if ($matches.Count -gt 5) {
            Write-Host "    ... and $($matches.Count - 5) more." -ForegroundColor Gray
        }
    }
}

Write-Host "`nAudit Complete." -ForegroundColor Cyan

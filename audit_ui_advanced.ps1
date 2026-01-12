
# Advanced "Silver Bullet" UI Audit Script
# Scans for subtle, complex rendering and interaction issues.

$rootPath = "src"
$risks = @{
    "Stacking Context Trap (Transform)"   = "transform:.*scale|rotate|translate"
    "Stacking Context Trap (Filter)"      = "backdrop-filter:|filter:"
    "Scrollbar Bug (100vw)"               = "width:\s*100vw"
    "Scroll Chaining Risk"                = "overscroll-behavior"
    "Click-Through Risk (Pointer Events)" = "pointer-events:\s*none"
    "Performance (Will-Change Abuse)"     = "will-change:\s*all"
    "Performance (Large Layout Shift)"    = "min-height:\s*100vh"
    "Accessibility (Outline Suppression)" = "outline:\s*none"
}

Write-Host "Starting Deep Dive UI Audit..." -ForegroundColor Magenta
Write-Host "Scanning for Stacking Context Traps and Logic Risks..." -ForegroundColor Gray

$findings = @{}

foreach ($file in Get-ChildItem -Path $rootPath -Recurse -Include *.css, *.tsx, *.ts) {
    $content = Get-Content $file.FullName
    $fileFindings = @()

    # Check for Stacking Context Traps: Transform + Z-Index in same file
    if (($content | Select-String "transform:") -and ($content | Select-String "z-index:")) {
        $fileFindings += "  [RISK] Stacking Context Trap: File contains both 'transform' and 'z-index'. Child z-indexes may be trapped."
    }

    # Check specific patterns
    foreach ($risk in $risks.Keys) {
        if ($content | Select-String $risks[$risk]) {
            $fileFindings += "  [WARN] $risk found."
        }
    }

    if ($fileFindings.Count -gt 0) {
        Write-Host "`n$($file.Name)" -ForegroundColor Cyan
        $fileFindings | ForEach-Object { Write-Host $_ -ForegroundColor Yellow }
        $findings[$file.Name] = $fileFindings
    }
}

Write-Host "`nDeep Scan Complete." -ForegroundColor Magenta

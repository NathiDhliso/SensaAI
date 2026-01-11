# audit_colors.ps1
$searchPath = "C:\Users\nathi\OneDrive\Documents\Projects\SensaPBL\src"
$excludePattern = "index.css" # Skip the definition file itself

# Patterns to look for:
# 1. Hex codes: # followed by 3 or 6 hex digits
# 2. RGB/RGBA: rgb( or rgba(
# 3. Common color names: black, white, red, blue, green (risk of false positives, but useful)

$patterns = @(
    "#[0-9a-fA-F]{3}\b",
    "#[0-9a-fA-F]{6}\b",
    "rgb\(",
    "rgba\(",
    "\bblack\b",
    "\bwhite\b"
)

Get-ChildItem -Path $searchPath -Recurse -Include *.css,*.tsx,*.ts | 
    Where-Object { $_.Name -notmatch $excludePattern } | 
    ForEach-Object {
        $file = $_
        $content = Get-Content $file.FullName
        $lineNumber = 0
        foreach ($line in $content) {
            $lineNumber++
            foreach ($pattern in $patterns) {
                if ($line -match $pattern) {
                    # Filter out some common false positives or legitimate uses if needed
                    # For now, just report everything
                    [PSCustomObject]@{
                        File = $file.Name
                        Path = $file.FullName
                        Line = $lineNumber
                        Match = $matches[0]
                        Content = $line.Trim()
                    }
                }
            }
        }
    } | Format-Table -AutoSize

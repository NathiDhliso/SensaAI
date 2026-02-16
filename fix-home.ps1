# Read file as bytes to preserve line endings, remove lines 31-32 (0-indexed: 30,31)
$bytes = [System.IO.File]::ReadAllBytes('src\pages\SavedResults.tsx')
$text = [System.Text.Encoding]::UTF8.GetString($bytes)

# Split by newline but keep track of delimiters
$lines = $text -split '(?<=\n)'
Write-Host "Total line chunks: $($lines.Count)"
Write-Host "Line 31: $($lines[30].Trim())"
Write-Host "Line 32: $($lines[31].Trim())"

# Remove lines 31 and 32 (0-indexed 30 and 31)
$newLines = @()
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($i -eq 30 -or $i -eq 31) { continue }
    $newLines += $lines[$i]
}
$newText = $newLines -join ''
[System.IO.File]::WriteAllBytes('src\pages\SavedResults.tsx', [System.Text.Encoding]::UTF8.GetBytes($newText))
Write-Host "Done - removed lines 31 and 32"

# PowerShell script to remove emojis from codebase
# This script will remove common emojis while preserving code functionality

$emojiPatterns = @(
    '✅',
    '❌',
    '⚠️',
    '⚠',
    '💡',
    '🔄',
    '🏆',
    '👁️',
    '👁',
    '🎯',
    '🌐',
    '🛠️',
    '🛠',
    '📐',
    '📊',
    '🎵',
    '📦',
    '🕴️',
    '🕴',
    '🔥',
    '🌡️',
    '🌡',
    '❄️',
    '❄',
    '🧊',
    '🗺️',
    '🗺',
    '🧠',
    '📚',
    '📖',
    '🔒',
    '🛡️',
    '🛡',
    '✏️',
    '✏',
    '⚙️',
    '⚙',
    '🏢',
    '✓',
    '✕',
    'ℹ'
)

# File extensions to process
$extensions = @('*.ts', '*.tsx', '*.js', '*.jsx', '*.md', '*.py', '*.css')

# Directories to exclude
$excludeDirs = @('node_modules', '.git', 'dist', '.build')

Write-Host "Starting emoji removal process..." -ForegroundColor Cyan

$filesProcessed = 0
$emojisRemoved = 0

# Get all files matching extensions
foreach ($ext in $extensions) {
    $files = Get-ChildItem -Path . -Filter $ext -Recurse -File | Where-Object {
        $path = $_.FullName
        $exclude = $false
        foreach ($dir in $excludeDirs) {
            if ($path -like "*\$dir\*") {
                $exclude = $true
                break
            }
        }
        -not $exclude
    }

    foreach ($file in $files) {
        $content = Get-Content -Path $file.FullName -Raw -Encoding UTF8
        $originalContent = $content
        $fileChanged = $false

        foreach ($emoji in $emojiPatterns) {
            if ($content -match [regex]::Escape($emoji)) {
                # Remove emoji and any trailing space
                $content = $content -replace [regex]::Escape($emoji) + '\s?', ''
                $fileChanged = $true
                $emojisRemoved++
            }
        }

        if ($fileChanged) {
            Set-Content -Path $file.FullName -Value $content -Encoding UTF8 -NoNewline
            Write-Host "  Processed: $($file.FullName)" -ForegroundColor Green
            $filesProcessed++
        }
    }
}

Write-Host "`nEmoji removal complete!" -ForegroundColor Cyan
Write-Host "Files processed: $filesProcessed" -ForegroundColor Yellow
Write-Host "Emojis removed: $emojisRemoved" -ForegroundColor Yellow

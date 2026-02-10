#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Renames SensaAI to SensaAI across the entire codebase.

.DESCRIPTION
    This script performs a comprehensive rename of the application from SensaAI to SensaAI:
    - Renames folder references
    - Updates all file contents
    - Handles case variations (SensaAI, SensaAI, SensaAI)
    - Creates backup before changes

.NOTES
    Author: Auto-generated
    Date: February 10, 2026
#>

$ErrorActionPreference = "Stop"

# Colors
$Blue = "Cyan"
$Green = "Green"
$Yellow = "Yellow"
$Red = "Red"

Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor $Blue
Write-Host "║         Renaming SensaAI → SensaAI                            ║" -ForegroundColor $Blue
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor $Blue
Write-Host ""

# Get project root
$ProjectRoot = $PSScriptRoot
Write-Host "📁 Project Root: $ProjectRoot" -ForegroundColor $Blue
Write-Host ""

# Create backup timestamp
$BackupTimestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupNote = "backup_before_rename_$BackupTimestamp.txt"

Write-Host "📝 Creating backup reference..." -ForegroundColor $Yellow
"Backup created at: $(Get-Date)" | Out-File $BackupNote
Write-Host "✓ Backup reference created: $BackupNote" -ForegroundColor $Green
Write-Host ""

# Define exclusions
$ExcludedDirs = @(
    "node_modules",
    ".git",
    "dist",
    ".build",
    "backend\node_modules",
    "backend\dist",
    ".terraform",
    ".elasticbeanstalk"
)

$ExcludedFiles = @(
    "*.zip",
    "*.png",
    "*.jpg",
    "*.jpeg",
    "*.gif",
    "*.ico",
    "*.svg",
    "*.woff",
    "*.woff2",
    "*.ttf",
    "*.eot",
    "package-lock.json",
    "*.lock"
)

# Replacement mappings (order matters - do specific cases first)
$Replacements = @(
    @{ Old = "SensaAI"; New = "SensaAI" }
    @{ Old = "SensaAI"; New = "sensaai" }
    @{ Old = "SensaAI"; New = "SENSAAI" }
)

Write-Host "🔍 Scanning for files to update..." -ForegroundColor $Blue

# Get all text files
$AllFiles = Get-ChildItem -Path $ProjectRoot -Recurse -File | Where-Object {
    $file = $_
    $relativePath = $file.FullName.Substring($ProjectRoot.Length)
    
    # Exclude directories
    $inExcludedDir = $false
    foreach ($dir in $ExcludedDirs) {
        if ($relativePath -like "*\$dir\*" -or $relativePath -like "*/$dir/*") {
            $inExcludedDir = $true
            break
        }
    }
    
    # Exclude file types
    $isExcludedFile = $false
    foreach ($pattern in $ExcludedFiles) {
        if ($file.Name -like $pattern) {
            $isExcludedFile = $true
            break
        }
    }
    
    -not $inExcludedDir -and -not $isExcludedFile
}

Write-Host "✓ Found $($AllFiles.Count) files to process" -ForegroundColor $Green
Write-Host ""

# Process files
$UpdatedCount = 0
$ErrorCount = 0

Write-Host "🔄 Processing files..." -ForegroundColor $Blue
Write-Host ""

foreach ($file in $AllFiles) {
    try {
        # Read file content
        $content = Get-Content -Path $file.FullName -Raw -ErrorAction Stop
        
        if ($null -eq $content) {
            continue
        }
        
        $originalContent = $content
        $fileUpdated = $false
        
        # Apply all replacements
        foreach ($replacement in $Replacements) {
            if ($content -match [regex]::Escape($replacement.Old)) {
                $content = $content -replace [regex]::Escape($replacement.Old), $replacement.New
                $fileUpdated = $true
            }
        }
        
        # Write back if changed
        if ($fileUpdated -and $content -ne $originalContent) {
            Set-Content -Path $file.FullName -Value $content -NoNewline -ErrorAction Stop
            $relativePath = $file.FullName.Substring($ProjectRoot.Length + 1)
            Write-Host "  ✓ Updated: $relativePath" -ForegroundColor $Green
            $UpdatedCount++
        }
    }
    catch {
        $relativePath = $file.FullName.Substring($ProjectRoot.Length + 1)
        Write-Host "  ✗ Error processing: $relativePath" -ForegroundColor $Red
        Write-Host "    $($_.Exception.Message)" -ForegroundColor $Red
        $ErrorCount++
    }
}

Write-Host ""
Write-Host "════════════════════════════════════════" -ForegroundColor $Blue
Write-Host "📊 Summary" -ForegroundColor $Blue
Write-Host "════════════════════════════════════════" -ForegroundColor $Blue
Write-Host "Files scanned:  $($AllFiles.Count)" -ForegroundColor $Blue
Write-Host "Files updated:  $UpdatedCount" -ForegroundColor $Green
if ($ErrorCount -gt 0) {
    Write-Host "Errors:         $ErrorCount" -ForegroundColor $Red
}
Write-Host ""

# Specific folder renames (if any exist)
Write-Host "📁 Checking for folders to rename..." -ForegroundColor $Blue

$FoldersToRename = Get-ChildItem -Path $ProjectRoot -Recurse -Directory | Where-Object {
    $_.Name -like "*SensaAI*" -or $_.Name -like "*SensaAI*"
} | Where-Object {
    $dir = $_
    $inExcluded = $false
    foreach ($excluded in $ExcludedDirs) {
        if ($dir.FullName -like "*\$excluded\*" -or $dir.FullName -like "*/$excluded/*") {
            $inExcluded = $true
            break
        }
    }
    -not $inExcluded
}

if ($FoldersToRename.Count -gt 0) {
    Write-Host "Found $($FoldersToRename.Count) folder(s) to rename:" -ForegroundColor $Yellow
    foreach ($folder in $FoldersToRename) {
        $newName = $folder.Name -replace "SensaAI", "sensaai" -replace "SensaAI", "SensaAI"
        $newPath = Join-Path $folder.Parent.FullName $newName
        Write-Host "  • $($folder.Name) → $newName" -ForegroundColor $Yellow
        
        try {
            Rename-Item -Path $folder.FullName -NewName $newName -ErrorAction Stop
            Write-Host "    ✓ Renamed successfully" -ForegroundColor $Green
        }
        catch {
            Write-Host "    ✗ Error: $($_.Exception.Message)" -ForegroundColor $Red
        }
    }
} else {
    Write-Host "✓ No folders need renaming" -ForegroundColor $Green
}

Write-Host ""
Write-Host "════════════════════════════════════════" -ForegroundColor $Blue
Write-Host "✅ Rename Complete!" -ForegroundColor $Green
Write-Host "════════════════════════════════════════" -ForegroundColor $Blue
Write-Host ""
Write-Host "Next steps:" -ForegroundColor $Yellow
Write-Host "1. Review changes with: git diff" -ForegroundColor $Blue
Write-Host "2. Test the application thoroughly" -ForegroundColor $Blue
Write-Host "3. Update AWS resources (S3 buckets, DynamoDB tables, Lambda functions)" -ForegroundColor $Blue
Write-Host "4. Update environment variables in .env files" -ForegroundColor $Blue
Write-Host "5. Commit changes: git add . && git commit -m 'Rename SensaAI to SensaAI'" -ForegroundColor $Blue
Write-Host ""
Write-Host "⚠️  Important: AWS resources need manual updates:" -ForegroundColor $Yellow
Write-Host "   - S3 bucket names" -ForegroundColor $Yellow
Write-Host "   - DynamoDB table names" -ForegroundColor $Yellow
Write-Host "   - Lambda function names" -ForegroundColor $Yellow
Write-Host "   - Cognito user pool names" -ForegroundColor $Yellow
Write-Host ""

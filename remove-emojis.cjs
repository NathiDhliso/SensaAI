const fs = require('fs');
const path = require('path');

// Comprehensive emoji regex pattern
const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F910}-\u{1F96B}\u{1F980}-\u{1F9E0}][\u{FE00}-\u{FE0F}]?|[\u2190-\u21FF\u2300-\u23FF\u2460-\u24FF\u25A0-\u25FF\u2600-\u27BF\u2900-\u297F\u2B00-\u2BFF\u3000-\u303F\u3200-\u32FF]/gu;

// File extensions to process
const extensions = ['.ts', '.tsx', '.js', '.jsx', '.md', '.py', '.css'];

// Directories to exclude
const excludeDirs = ['node_modules', 'backend/node_modules', '.git', 'dist', '.build', '.kiro'];

let filesProcessed = 0;
let emojisRemoved = 0;

function shouldExclude(filePath) {
    return excludeDirs.some(dir => filePath.includes(path.sep + dir + path.sep) || filePath.includes(path.sep + dir));
}

function processFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const originalLength = content.length;
        
        // Remove emojis
        let newContent = content.replace(emojiRegex, '');
        
        // Clean up any double spaces left behind
        newContent = newContent.replace(/  +/g, ' ');
        
        // Clean up empty emoji-only lines (lines with just spaces)
        newContent = newContent.replace(/^\s+$/gm, '');
        
        if (newContent !== content) {
            fs.writeFileSync(filePath, newContent, 'utf8');
            const removed = originalLength - newContent.length;
            console.log(`✓ Processed: ${filePath} (removed ${removed} chars)`);
            filesProcessed++;
            emojisRemoved += removed;
            return true;
        }
        return false;
    } catch (error) {
        console.error(`✗ Error processing ${filePath}:`, error.message);
        return false;
    }
}

function walkDirectory(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
        const filePath = path.join(dir, file);
        
        if (shouldExclude(filePath)) {
            continue;
        }
        
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            walkDirectory(filePath);
        } else if (stat.isFile()) {
            const ext = path.extname(filePath);
            if (extensions.includes(ext)) {
                processFile(filePath);
            }
        }
    }
}

console.log('Starting emoji removal process...\n');

walkDirectory('.');

console.log('\n' + '='.repeat(50));
console.log('Emoji removal complete!');
console.log(`Files processed: ${filesProcessed}`);
console.log(`Characters removed: ${emojisRemoved}`);
console.log('='.repeat(50));

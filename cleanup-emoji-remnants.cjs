const fs = require('fs');
const path = require('path');

const extensions = ['.ts', '.tsx', '.js', '.jsx'];
const excludeDirs = ['node_modules', 'backend/node_modules', '.git', 'dist', '.build', '.kiro'];

let filesProcessed = 0;

function shouldExclude(filePath) {
    return excludeDirs.some(dir => filePath.includes(path.sep + dir + path.sep) || filePath.includes(path.sep + dir));
}

function cleanupFile(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        const originalContent = content;
        
        // Remove empty emoji conditionals
        content = content.replace(/\{isScholarly \? '' : ''\}/g, '');
        content = content.replace(/\{isScholarly \? "" : ""\}/g, '');
        
        // Fix button text with just spaces
        content = content.replace(/\{isScholarly \? '([^']+)' : ' \1'\}/g, '$1');
        content = content.replace(/\{isScholarly \? "([^"]+)" : " \1"\}/g, '$1');
        
        // Remove empty icon properties
        content = content.replace(/icon: '',?\s*/g, '');
        content = content.replace(/icon: "",?\s*/g, '');
        
        // Remove empty emoji properties
        content = content.replace(/emoji: '',?\s*/g, '');
        content = content.replace(/emoji: "",?\s*/g, '');
        
        // Remove empty badgeIcon properties
        content = content.replace(/badgeIcon: '',?\s*/g, '');
        content = content.replace(/badgeIcon: "",?\s*/g, '');
        
        // Remove lines that are just empty resultIcon spans
        content = content.replace(/<span className=\{styles\.resultIcon\}>\{isScholarly \? '' : \(mastered \? '' : ''\)\}<\/span>\s*/g, '');
        
        // Remove empty errorIcon divs
        content = content.replace(/<div className=\{styles\.errorIcon\}>\{isScholarly \? '' : ''\}<\/div>\s*/g, '');
        
        // Fix checkmark with empty emoji
        content = content.replace(/<div className=\{styles\.checkmark\}>\{isScholarly \? '' : ''\}<\/div>/g, '<div className={styles.checkmark}>✓</div>');
        
        // Remove emoji field from getPaceDisplay returns
        content = content.replace(/emoji: isScholarly \? '' : '',\s*/g, '');
        
        // Clean up trailing commas after removals
        content = content.replace(/,(\s*)\}/g, '$1}');
        content = content.replace(/,(\s*)\]/g, '$1]');
        
        // Clean up double spaces
        content = content.replace(/  +/g, ' ');
        
        if (content !== originalContent) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✓ Cleaned: ${filePath}`);
            filesProcessed++;
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
                cleanupFile(filePath);
            }
        }
    }
}

console.log('Starting emoji remnant cleanup...\n');

walkDirectory('.');

console.log('\n' + '='.repeat(50));
console.log('Cleanup complete!');
console.log(`Files processed: ${filesProcessed}`);
console.log('='.repeat(50));

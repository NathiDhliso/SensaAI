#!/usr/bin/env node

/**
 * Hardcoded Color Scanner
 * 
 * Scans the codebase for hardcoded colors that should use CSS variables.
 * Reports files with potential contrast/theme issues.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Patterns to detect hardcoded colors
const COLOR_PATTERNS = [
    // Hex colors
    /#[0-9a-fA-F]{3,8}\b/g,
    // RGB/RGBA
    /rgba?\([^)]+\)/g,
    // HSL/HSLA
    /hsla?\([^)]+\)/g,
    // Named colors (common ones that might be hardcoded)
    /\b(black|white|gray|grey|red|blue|green|yellow|purple|pink|orange)\b/g,
];

// Allowed exceptions (these are OK to be hardcoded)
const ALLOWED_PATTERNS = [
    /transparent/i,
    /inherit/i,
    /currentColor/i,
    /var\(--/,  // CSS variables are OK
    /theme-colors\.ts/, // Theme definition file
    /\.test\./,  // Test files
    /\.spec\./,  // Spec files
];

// File extensions to scan
const EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js', '.css', '.module.css'];

const results = {
    files: [],
    totalIssues: 0,
};

function shouldScanFile(filePath) {
    const ext = path.extname(filePath);
    if (!EXTENSIONS.includes(ext)) return false;

    // Skip node_modules, dist, build
    if (filePath.includes('node_modules') ||
        filePath.includes('dist') ||
        filePath.includes('build') ||
        filePath.includes('.next')) {
        return false;
    }

    return true;
}

function isAllowedException(line, match) {
    // Check if this match is in an allowed context
    for (const allowed of ALLOWED_PATTERNS) {
        if (allowed.test(line)) return true;
    }

    // Check if it's a comment
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
        return true;
    }

    return false;
}

function scanFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const issues = [];

    lines.forEach((line, index) => {
        COLOR_PATTERNS.forEach(pattern => {
            const matches = line.match(pattern);
            if (matches) {
                matches.forEach(match => {
                    if (!isAllowedException(line, match)) {
                        issues.push({
                            line: index + 1,
                            content: line.trim(),
                            match: match,
                        });
                    }
                });
            }
        });
    });

    if (issues.length > 0) {
        results.files.push({
            path: filePath,
            issues: issues,
        });
        results.totalIssues += issues.length;
    }
}

function scanDirectory(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            scanDirectory(fullPath);
        } else if (entry.isFile() && shouldScanFile(fullPath)) {
            scanFile(fullPath);
        }
    }
}

function generateReport() {
    console.log('\n🎨 Hardcoded Color Scanner Report\n');
    console.log('='.repeat(80));

    if (results.totalIssues === 0) {
        console.log('\n✅ No hardcoded colors found! All styles use CSS variables.\n');
        return;
    }

    console.log(`\n⚠️  Found ${results.totalIssues} potential issues in ${results.files.length} files\n`);

    // Sort by number of issues (most problematic first)
    results.files.sort((a, b) => b.issues.length - a.issues.length);

    results.files.forEach(file => {
        console.log(`\n📄 ${file.path}`);
        console.log(`   ${file.issues.length} issue(s):`);

        file.issues.forEach(issue => {
            console.log(`   Line ${issue.line}: ${issue.match}`);
            console.log(`   → ${issue.content.substring(0, 100)}${issue.content.length > 100 ? '...' : ''}`);
        });
    });

    console.log('\n' + '='.repeat(80));
    console.log('\n💡 Recommendation: Replace hardcoded colors with CSS variables from theme-colors.ts\n');
    console.log('   Example: #ffffff → var(--color-text-primary)');
    console.log('   Example: black → var(--color-surface-base)\n');
}

// Main execution
const srcPath = path.join(__dirname, '..', 'src');

console.log('🔍 Scanning codebase for hardcoded colors...\n');
console.log(`Starting scan in: ${srcPath}\n`);

scanDirectory(srcPath);
generateReport();

// Exit with error code if issues found
process.exit(results.totalIssues > 0 ? 1 : 0);

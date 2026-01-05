#!/usr/bin/env node

/**
 * CSS Conflict & Quality Scanner
 * 
 * Detects various CSS issues that can cause conflicts:
 * - Duplicate properties within same rule
 * - !important overuse
 * - Overly specific selectors
 * - Undefined CSS variables
 * - Conflicting z-index values
 * - Missing fallback colors
 * - Inline style attributes in TSX (anti-pattern)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const results = {
    duplicateProperties: [],
    importantOveruse: [],
    highSpecificity: [],
    undefinedVars: [],
    zIndexConflicts: [],
    missingFallbacks: [],
    inlineStyles: [],
};

const definedCSSVars = new Set();
const zIndexValues = new Map();

// Scan index.css first to collect defined CSS variables
function collectCSSVariables(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const varRegex = /--([\w-]+):/g;
    let match;

    while ((match = varRegex.exec(content)) !== null) {
        definedCSSVars.add(`--${match[1]}`);
    }
}

function parseCSSRules(content) {
    const rules = [];
    const ruleRegex = /([^{]+)\{([^}]+)\}/g;
    let match;

    while ((match = ruleRegex.exec(content)) !== null) {
        rules.push({
            selector: match[1].trim(),
            declarations: match[2],
            fullMatch: match[0]
        });
    }

    return rules;
}

function calculateSpecificity(selector) {
    // Simple specificity calculation (IDs, classes, elements)
    const ids = (selector.match(/#/g) || []).length;
    const classes = (selector.match(/\./g) || []).length;
    const elements = (selector.match(/\w+/g) || []).length - classes;

    return ids * 100 + classes * 10 + elements;
}

function checkDuplicateProperties(declarations) {
    const lines = declarations.split('\n').map(l => l.trim()).filter(l => l);
    const properties = new Map();
    const duplicates = [];

    lines.forEach((line) => {
        if (line.startsWith('/*') || line.startsWith('*') || !line.includes(':')) return;

        const colonIndex = line.indexOf(':');
        if (colonIndex === -1) return;

        const property = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).replace(/;$/, '').trim();

        if (properties.has(property)) {
            duplicates.push({
                property,
                firstValue: properties.get(property),
                secondValue: value
            });
        } else {
            properties.set(property, value);
        }
    });

    return duplicates;
}

function checkImportantUsage(declarations) {
    const importantCount = (declarations.match(/!important/g) || []).length;
    return importantCount;
}

function checkUndefinedVars(declarations) {
    const varUsageRegex = /var\((--[\w-]+)\)/g;
    const undefined = [];
    let match;

    while ((match = varUsageRegex.exec(declarations)) !== null) {
        const varName = match[1];
        if (!definedCSSVars.has(varName)) {
            undefined.push(varName);
        }
    }

    return [...new Set(undefined)];
}

function checkZIndex(selector, declarations) {
    const zIndexMatch = declarations.match(/z-index:\s*(\d+)/);
    if (zIndexMatch) {
        const value = parseInt(zIndexMatch[1]);
        if (!zIndexValues.has(value)) {
            zIndexValues.set(value, []);
        }
        zIndexValues.get(value).push(selector);
    }
}

function checkMissingColorFallbacks(declarations) {
    const lines = declarations.split('\n').map(l => l.trim());
    const missing = [];

    lines.forEach(line => {
        // Check for color/background properties using var() without fallback
        if ((line.includes('color:') || line.includes('background:') || line.includes('border-color:')) &&
            line.includes('var(') && !line.includes(',')) {
            const varMatch = line.match(/var\((--[\w-]+)\)/);
            if (varMatch) {
                missing.push(varMatch[1]);
            }
        }
    });

    return missing;
}

function scanCSSFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const rules = parseCSSRules(content);

    rules.forEach(rule => {
        // Check duplicate properties
        const duplicates = checkDuplicateProperties(rule.declarations);
        if (duplicates.length > 0) {
            results.duplicateProperties.push({
                file: filePath,
                selector: rule.selector,
                duplicates
            });
        }

        // Check !important overuse
        const importantCount = checkImportantUsage(rule.declarations);
        if (importantCount > 2) {
            results.importantOveruse.push({
                file: filePath,
                selector: rule.selector,
                count: importantCount
            });
        }

        // Check high specificity
        const specificity = calculateSpecificity(rule.selector);
        if (specificity > 100) {
            results.highSpecificity.push({
                file: filePath,
                selector: rule.selector,
                specificity
            });
        }

        // Check undefined CSS variables
        const undefinedVars = checkUndefinedVars(rule.declarations);
        if (undefinedVars.length > 0) {
            results.undefinedVars.push({
                file: filePath,
                selector: rule.selector,
                variables: undefinedVars
            });
        }

        // Collect z-index values
        checkZIndex(rule.selector, rule.declarations);

        // Check missing color fallbacks
        const missingFallbacks = checkMissingColorFallbacks(rule.declarations);
        if (missingFallbacks.length > 0) {
            results.missingFallbacks.push({
                file: filePath,
                selector: rule.selector,
                variables: missingFallbacks
            });
        }
    });
}

function scanTSXFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
        // Check for inline style objects
        if (line.includes('style={{') || line.includes('style={')) {
            // Ignore if it's just a simple dynamic style
            if (!line.includes('var(--') && line.match(/style=\{\{[^}]+\}\}/)) {
                results.inlineStyles.push({
                    file: filePath,
                    line: index + 1,
                    content: line.trim().substring(0, 100)
                });
            }
        }
    });
}

function scanDirectory(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            if (!['node_modules', 'dist', 'build', '.next'].includes(entry.name)) {
                scanDirectory(fullPath);
            }
        } else if (entry.isFile()) {
            const ext = path.extname(fullPath);
            if (['.css', '.module.css'].includes(ext)) {
                scanCSSFile(fullPath);
            } else if (['.tsx', '.jsx'].includes(ext)) {
                scanTSXFile(fullPath);
            }
        }
    }
}

function generateReport() {
    console.log('\n🔍 CSS Conflict & Quality Scanner Report\n');
    console.log('='.repeat(80));

    let totalIssues = 0;

    // Duplicate Properties
    if (results.duplicateProperties.length > 0) {
        console.log(`\n⚠️  DUPLICATE PROPERTIES: ${results.duplicateProperties.length} instances\n`);
        results.duplicateProperties.slice(0, 5).forEach(item => {
            console.log(`   ${path.basename(item.file)}: ${item.selector}`);
            item.duplicates.forEach(dup => {
                console.log(`      "${dup.property}" declared twice`);
            });
        });
        totalIssues += results.duplicateProperties.length;
    }

    // !important Overuse
    if (results.importantOveruse.length > 0) {
        console.log(`\n⚠️  !IMPORTANT OVERUSE: ${results.importantOveruse.length} instances\n`);
        results.importantOveruse.slice(0, 5).forEach(item => {
            console.log(`   ${path.basename(item.file)}: ${item.selector}`);
            console.log(`      ${item.count} !important declarations`);
        });
        totalIssues += results.importantOveruse.length;
    }

    // High Specificity
    if (results.highSpecificity.length > 0) {
        console.log(`\n⚠️  HIGH SPECIFICITY: ${results.highSpecificity.length} selectors\n`);
        results.highSpecificity.slice(0, 5).forEach(item => {
            console.log(`   ${path.basename(item.file)}: ${item.selector.substring(0, 60)}`);
            console.log(`      Specificity: ${item.specificity}`);
        });
        totalIssues += results.highSpecificity.length;
    }

    // Undefined CSS Variables
    if (results.undefinedVars.length > 0) {
        console.log(`\n⚠️  UNDEFINED CSS VARIABLES: ${results.undefinedVars.length} instances\n`);
        results.undefinedVars.slice(0, 5).forEach(item => {
            console.log(`   ${path.basename(item.file)}: ${item.selector}`);
            console.log(`      ${item.variables.join(', ')}`);
        });
        totalIssues += results.undefinedVars.length;
    }

    // Z-Index Conflicts
    const conflictingZIndexes = Array.from(zIndexValues.entries())
        .filter(([_, selectors]) => selectors.length > 3)
        .sort((a, b) => b[1].length - a[1].length);

    if (conflictingZIndexes.length > 0) {
        console.log(`\n⚠️  Z-INDEX CONFLICTS: ${conflictingZIndexes.length} values used by multiple elements\n`);
        conflictingZIndexes.slice(0, 5).forEach(([value, selectors]) => {
            console.log(`   z-index: ${value} (${selectors.length} selectors)`);
        });
        totalIssues += conflictingZIndexes.length;
    }

    // Inline Styles
    if (results.inlineStyles.length > 0) {
        console.log(`\n⚠️  INLINE STYLES IN TSX: ${results.inlineStyles.length} instances\n`);
        results.inlineStyles.slice(0, 5).forEach(item => {
            console.log(`   ${path.basename(item.file)}:${item.line}`);
        });
        totalIssues += results.inlineStyles.length;
    }

    console.log('\n' + '='.repeat(80));

    if (totalIssues === 0) {
        console.log('\n✅ No CSS conflicts detected!\n');
    } else {
        console.log(`\n📊 Total Issues: ${totalIssues}\n`);
        console.log('💡 Recommendations:');
        console.log('   - Remove duplicate properties');
        console.log('   - Avoid !important, use specificity instead');
        console.log('   - Keep selectors simple (specificity < 100)');
        console.log('   - Define missing CSS variables in index.css');
        console.log('   - Use CSS modules instead of inline styles\n');
    }
}

// Main execution
const srcPath = path.join(__dirname, '..', 'src');
const indexCSSPath = path.join(srcPath, 'index.css');

console.log('🔍 Scanning for CSS conflicts and quality issues...\n');

// First, collect all defined CSS variables
if (fs.existsSync(indexCSSPath)) {
    collectCSSVariables(indexCSSPath);
    console.log(`✓ Found ${definedCSSVars.size} defined CSS variables\n`);
}

scanDirectory(srcPath);
generateReport();

process.exit(0);

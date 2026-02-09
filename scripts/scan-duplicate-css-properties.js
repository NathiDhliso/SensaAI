#!/usr/bin/env node
/**
 * Duplicate CSS Property Scanner
 * 
 * Scans CSS files for duplicate properties within the same rule block.
 * These can cause unexpected behavior as the last value wins.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const results = {
 files: [],
 totalIssues: 0
};
function shouldScanFile(filePath) {
 const ext = path.extname(filePath);
 if (!['.css', '.module.css'].includes(ext)) return false;
 // Skip node_modules, dist, build
 if (filePath.includes('node_modules') ||
 filePath.includes('dist') ||
 filePath.includes('build')) {
 return false;
 }
 return true;
}
function parseCSSRules(content) {
 const rules = [];
 const ruleRegex = /([^{]+)\{([^}]+)\}/g;
 let match;
 while ((match = ruleRegex.exec(content)) !== null) {
 const selector = match[1].trim();
 const declarations = match[2];
 const startPos = match.index;
 rules.push({
 selector,
 declarations,
 startPos,
 fullMatch: match[0]
 });
 }
 return rules;
}
function findDuplicateProperties(declarations) {
 const lines = declarations.split('\n').map(l => l.trim()).filter(l => l);
 const properties = new Map();
 const duplicates = [];
 lines.forEach((line, index) => {
 // Skip comments and empty lines
 if (line.startsWith('/*') || line.startsWith('*') || line.startsWith('//') || !line.includes(':')) {
 return;
 }
 const colonIndex = line.indexOf(':');
 if (colonIndex === -1) return;
 const property = line.substring(0, colonIndex).trim();
 const value = line.substring(colonIndex + 1).replace(/;$/, '').trim();
 if (properties.has(property)) {
 duplicates.push({
 property,
 firstValue: properties.get(property).value,
 firstLine: properties.get(property).line,
 secondValue: value,
 secondLine: index
 });
 } else {
 properties.set(property, { value, line: index });
 }
 });
 return duplicates;
}
function scanFile(filePath) {
 const content = fs.readFileSync(filePath, 'utf-8');
 const rules = parseCSSRules(content);
 const issues = [];
 rules.forEach(rule => {
 const duplicates = findDuplicateProperties(rule.declarations);
 if (duplicates.length > 0) {
 issues.push({
 selector: rule.selector,
 duplicates: duplicates
 });
 }
 });
 if (issues.length > 0) {
 results.files.push({
 path: filePath,
 issues: issues
 });
 results.totalIssues += issues.reduce((sum, issue) => sum + issue.duplicates.length, 0);
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
 console.log('\n Duplicate CSS Property Scanner Report\n');
 console.log('='.repeat(80));
 if (results.totalIssues === 0) {
 console.log('\n No duplicate properties found!\n');
 return;
 }
 console.log(`\n Found ${results.totalIssues} duplicate properties in ${results.files.length} files\n`);
 // Sort by number of issues (most problematic first)
 results.files.sort((a, b) => {
 const aCount = a.issues.reduce((sum, i) => sum + i.duplicates.length, 0);
 const bCount = b.issues.reduce((sum, i) => sum + i.duplicates.length, 0);
 return bCount - aCount;
 });
 results.files.forEach(file => {
 const totalDupes = file.issues.reduce((sum, i) => sum + i.duplicates.length, 0);
 console.log(`\n ${file.path}`);
 console.log(` ${totalDupes} duplicate(s):`);
 file.issues.forEach(issue => {
 console.log(`\n Selector: ${issue.selector}`);
 issue.duplicates.forEach(dup => {
 console.log(` Property "${dup.property}" declared twice:`);
 console.log(` First: ${dup.firstValue}`);
 console.log(` Second: ${dup.secondValue} (this value wins)`);
 });
 });
 });
 console.log('\n' + '='.repeat(80));
 console.log('\n Fix: Remove the first declaration or consolidate into one.\n');
}
// Main execution
const srcPath = path.join(__dirname, '..', 'src');
console.log(' Scanning CSS files for duplicate properties...\n');
console.log(`Starting scan in: ${srcPath}\n`);
scanDirectory(srcPath);
generateReport();
// Exit with error code if issues found
process.exit(results.totalIssues > 0 ? 1 : 0);
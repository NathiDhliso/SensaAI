/**
 * Migration Script: Repair Broken Saved Results
 * 
 * Scans IndexedDB for results with empty pass1Data.concepts and attempts
 * to repair them by extracting concept names from the fullDocument content.
 * 
 * Run with: npx tsx scripts/migrate-broken-results.ts
 * 
 * This is a ONE-TIME migration, not a runtime fallback.
 */

import * as fs from 'fs';
import * as path from 'path';

interface SavedResult {
    id: string;
    subject: string;
    alias?: string;
    generatedAt: string;
    fullDocument: string;
    pass1Data: {
        domain: string;
        roleScope: string;
        lifecycle: { phase1: string; phase2: string; phase3: string };
        concepts: string[];
    };
    validation: {
        completeness: number;
        lifecycleConsistency: number;
        formatConsistency: number;
        positiveFraming: number;
    };
}

/**
 * Extract concept names from JSON content in fullDocument
 */
function extractConceptsFromJSON(content: string): string[] {
    const concepts: string[] = [];
    
    // Try to parse as JSON first
    try {
        const parsed = JSON.parse(content);
        if (parsed.concepts && Array.isArray(parsed.concepts)) {
            for (const c of parsed.concepts) {
                if (c.name) concepts.push(c.name);
            }
            if (concepts.length > 0) return concepts;
        }
    } catch {
        // Not direct JSON, try to find JSON blocks
    }
    
    // Look for concept names in JSON format: "name": "Concept Name"
    const nameRegex = /"name":\s*"([^"]+)"/g;
    let match;
    while ((match = nameRegex.exec(content)) !== null) {
        const name = match[1].trim();
        // Filter out common non-concept names
        if (name.length > 2 && 
            name.length < 100 &&
            !['true', 'false', 'null', 'undefined'].includes(name.toLowerCase()) &&
            !name.startsWith('http') &&
            !concepts.includes(name)) {
            concepts.push(name);
        }
    }
    
    return concepts;
}

/**
 * Extract concept names from Markdown headers
 */
function extractConceptsFromMarkdown(content: string): string[] {
    const concepts: string[] = [];
    
    // Pattern: ## 1. Concept Name or ### Concept Name
    const headerRegex = /^#{2,3}\s*(?:\d+\.\s*)?([A-Z][^\n#]+)/gm;
    let match;
    while ((match = headerRegex.exec(content)) !== null) {
        const name = match[1].trim();
        // Filter common non-concept headers
        const skipWords = ['overview', 'summary', 'introduction', 'conclusion', 
            'deliverables', 'timeline', 'prerequisites', 'domain analysis'];
        if (!skipWords.some(w => name.toLowerCase().includes(w)) && !concepts.includes(name)) {
            concepts.push(name);
        }
    }
    
    return concepts;
}

/**
 * Repair a single saved result
 */
function repairResult(result: SavedResult): { repaired: boolean; conceptCount: number } {
    if (result.pass1Data.concepts && result.pass1Data.concepts.length > 0) {
        return { repaired: false, conceptCount: result.pass1Data.concepts.length };
    }
    
    console.log(`\n  Repairing: ${result.subject} (${result.id})`);
    console.log(`    Document size: ${result.fullDocument.length.toLocaleString()} chars`);
    
    // Try JSON extraction first (more reliable)
    let concepts = extractConceptsFromJSON(result.fullDocument);
    console.log(`    JSON extraction: ${concepts.length} concepts`);
    
    // If JSON fails, try Markdown
    if (concepts.length === 0) {
        concepts = extractConceptsFromMarkdown(result.fullDocument);
        console.log(`    Markdown extraction: ${concepts.length} concepts`);
    }
    
    if (concepts.length > 0) {
        result.pass1Data.concepts = concepts;
        
        // Also recalculate completeness based on concept count
        const minCharsPerConcept = 300;
        const expectedLength = concepts.length * minCharsPerConcept;
        const lengthRatio = Math.min(result.fullDocument.length / expectedLength, 1);
        result.validation.completeness = Math.round(lengthRatio * 100);
        
        console.log(`    ✅ Repaired with ${concepts.length} concepts`);
        return { repaired: true, conceptCount: concepts.length };
    }
    
    console.log(`    ❌ Could not extract concepts - document may be malformed`);
    return { repaired: false, conceptCount: 0 };
}

/**
 * Process all JSON files in public folder
 */
function migratePublicFolder() {
    const publicDir = path.join(process.cwd(), 'public');
    const files = fs.readdirSync(publicDir).filter(f => f.endsWith('.json'));
    
    console.log(`\n📂 Scanning ${files.length} JSON files in public folder...\n`);
    
    let repairedCount = 0;
    let alreadyGoodCount = 0;
    let failedCount = 0;
    
    for (const file of files) {
        try {
            const filePath = path.join(publicDir, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            const result: SavedResult = JSON.parse(content);
            
            // Skip non-SavedResult files
            if (!result.pass1Data || !result.fullDocument) {
                console.log(`⏭️  Skipping ${file} (not a SavedResult)`);
                continue;
            }
            
            const { repaired, conceptCount } = repairResult(result);
            
            if (repaired) {
                // Write back the repaired result
                fs.writeFileSync(filePath, JSON.stringify(result, null, 2), 'utf-8');
                repairedCount++;
            } else if (conceptCount > 0) {
                alreadyGoodCount++;
                console.log(`✓ ${file}: Already has ${conceptCount} concepts`);
            } else {
                failedCount++;
            }
        } catch (err) {
            console.error(`❌ Error processing ${file}:`, err);
            failedCount++;
        }
    }
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`MIGRATION COMPLETE`);
    console.log(`${'='.repeat(60)}`);
    console.log(`  ✅ Repaired: ${repairedCount}`);
    console.log(`  ✓  Already good: ${alreadyGoodCount}`);
    console.log(`  ❌ Failed/Skipped: ${failedCount}`);
    console.log(`${'='.repeat(60)}\n`);
}

// Run migration
console.log(`
╔══════════════════════════════════════════════════════════════╗
║           SENSA PBL - Broken Data Migration Script           ║
╠══════════════════════════════════════════════════════════════╣
║  This script repairs SavedResults with empty concepts array  ║
║  by extracting concept names from the fullDocument content.  ║
╚══════════════════════════════════════════════════════════════╝
`);

migratePublicFolder();

console.log(`
💡 NOTE: This only migrates files in /public folder.
   For IndexedDB data, run the browser-based migration from the app's
   Settings > Developer > "Repair Broken Content" button.
`);

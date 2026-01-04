const fs = require('fs');

const content = fs.readFileSync('onlyuse this testPL_300_1767464668977-d07nxlrc0.json', 'utf8');
const json = JSON.parse(content);
const full = json.fullDocument;

console.log('=== JSON FILE ANALYSIS ===');
console.log('Keys:', Object.keys(json));
console.log('Subject:', json.subject);
console.log('fullDocument length:', full?.length);

// Check for JSON concept blocks
const hasJsonConcepts = /```json[\s\S]*?concepts[\s\S]*?```/gi.test(full);
console.log('\nHas JSON concepts blocks (```json):', hasJsonConcepts);

// Check for order/name patterns (escaped format)
const orderMatches = full.match(/"order":\s*\d+/g);
console.log('Order field matches:', orderMatches?.length || 0);

// Check for concept names
const nameMatches = full.match(/"name":\s*"[^"]+"/g);
console.log('Name field matches:', nameMatches?.length || 0);

// Show sample concept names
if (nameMatches && nameMatches.length > 0) {
    console.log('\nFirst 5 concept names:');
    nameMatches.slice(0, 5).forEach(m => console.log('  -', m));
}

// Check if the VISUAL MASTER CHART marker exists
console.log('\nContains PL-300 marker:', full.includes('VISUAL MASTER CHART: Microsoft Learn - PL-300'));

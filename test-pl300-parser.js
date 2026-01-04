/**
 * Test the PL-300 parser fix
 */

import fs from 'fs';

// Read the PL-300 JSON file
const PL300_FILE_PATH = 'onlyuse this testPL_300_1767464668977-d07nxlrc0.json';

async function testPL300Parser() {
  try {
    console.log('=== Testing PL-300 Parser Fix ===\n');
    
    // Read the JSON file
    const fileContent = fs.readFileSync(PL300_FILE_PATH, 'utf-8');
    const jsonData = JSON.parse(fileContent);
    const fullDocument = jsonData.fullDocument;
    
    console.log(`✓ Loaded PL-300 content (${fullDocument.length} chars)`);
    
    // Import the parser dynamically
    const { parseGeneratedContent } = await import('./src/lib/content-adapter/parser.ts');
    
    console.log('✓ Parser imported successfully');
    
    // Test the parsing
    const result = parseGeneratedContent(fullDocument);
    
    console.log('\n=== Parse Result ===');
    console.log(`Success: ${result.success}`);
    
    if (result.success) {
      console.log(`✓ Concepts found: ${result.data.concepts.length}`);
      console.log(`✓ Domain: ${result.data.domainAnalysis?.domain || result.data.domain}`);
      console.log(`✓ First concept: ${result.data.concepts[0]?.name}`);
      console.log(`✓ Lifecycle phases: ${Object.keys(result.data.domainAnalysis?.lifecycle || result.data.lifecycle || {}).join(', ')}`);
    } else {
      console.log(`✗ Parse error: ${result.error}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testPL300Parser();
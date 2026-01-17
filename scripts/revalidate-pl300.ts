/**
 * Re-validate PL-300 content with improved validation logic
 */
import * as fs from 'fs';
import * as path from 'path';
import { performLocalValidation } from '../src/lib/generation/validation';
import type { SavedResult } from '../src/lib/storage/types';

const filePath = path.join(process.cwd(), 'public', 'PL_300_1766515561801-c6ara0akv.json');

// Read the saved result
const savedResult: SavedResult = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

console.log('Re-validating PL-300 content with improved logic...\n');
console.log(`Subject: ${savedResult.subject}`);
console.log(`Content Length: ${savedResult.fullDocument.length.toLocaleString()} chars`);
console.log(`Expected Concepts: ${savedResult.pass1Data.concepts.length}\n`);

console.log('OLD Validation Results:');
console.log(`  Completeness: ${savedResult.validation.completeness}%`);
console.log(`  Lifecycle Consistency: ${savedResult.validation.lifecycleConsistency}%`);
console.log(`  Format Consistency: ${savedResult.validation.formatConsistency}%`);
console.log(`  Positive Framing: ${savedResult.validation.positiveFraming}%\n`);

// Re-validate with new logic
const newValidation = performLocalValidation(savedResult.fullDocument, savedResult.pass1Data);

console.log('NEW Validation Results:');
console.log(`  Concepts Found: ${newValidation.conceptsFound} / ${savedResult.pass1Data.concepts.length}`);
console.log(`  Completeness: ${newValidation.completeness}%`);
console.log(`  Lifecycle Consistency: ${newValidation.lifecycleConsistency}%`);
console.log(`  Format Consistency: ${newValidation.formatConsistency}%\n`);

// Calculate composite quality score
const compositeQuality = Math.round(
  newValidation.completeness * 0.3 +
  newValidation.lifecycleConsistency * 0.3 +
  newValidation.formatConsistency * 0.2 +
  savedResult.validation.positiveFraming * 0.2
);

console.log(`Composite Quality Score: ${compositeQuality}%\n`);

// Update the saved file with new validation
savedResult.validation = {
  ...savedResult.validation,
  completeness: newValidation.completeness,
  lifecycleConsistency: newValidation.lifecycleConsistency,
  formatConsistency: newValidation.formatConsistency,
};

fs.writeFileSync(filePath, JSON.stringify(savedResult, null, 2), 'utf-8');

console.log('✅ File updated with corrected validation scores!');
console.log(`\nYour PL-300 content is actually ${compositeQuality}% quality - well done! 🎉`);

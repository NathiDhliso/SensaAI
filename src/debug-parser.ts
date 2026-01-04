/**
 * Debug utility to help diagnose parsing issues
 */

import { parseGeneratedContent } from './lib/content-adapter/parser';

export function debugParseContent(rawContent: string, label: string = 'Unknown') {
  console.log(`[DEBUG] Parsing content: ${label}`);
  console.log(`[DEBUG] Content length: ${rawContent?.length || 'undefined'}`);
  console.log(`[DEBUG] Content type: ${typeof rawContent}`);
  
  if (!rawContent) {
    console.log(`[DEBUG] ❌ Content is null/undefined`);
    return;
  }
  
  if (rawContent.trim().length === 0) {
    console.log(`[DEBUG] ❌ Content is empty after trim`);
    return;
  }
  
  // Check for expected sections
  console.log(`[DEBUG] Contains DOMAIN ANALYSIS: ${rawContent.includes('DOMAIN ANALYSIS')}`);
  console.log(`[DEBUG] Contains MASTER HIERARCHICAL CHART: ${rawContent.includes('MASTER HIERARCHICAL CHART')}`);
  console.log(`[DEBUG] Contains VISUAL MASTER CHART: ${rawContent.includes('VISUAL MASTER CHART')}`);
  console.log(`[DEBUG] Contains concept markers: ${rawContent.includes('## 1.')}`);
  
  // Show first 200 characters
  console.log(`[DEBUG] First 200 chars: ${rawContent.substring(0, 200)}`);
  
  // Try parsing
  const result = parseGeneratedContent(rawContent);
  console.log(`[DEBUG] Parse result:`, {
    success: result.success,
    error: result.success ? null : (result as any).error,
    conceptCount: result.success ? result.data.concepts.length : 0
  });
  
  return result;
}

// Test with PL-300 content
export function testPL300Parsing() {
  console.log('[DEBUG] PL-300 test function called but not implemented');
}
    });
  } catch (error) {
    console.error('[DEBUG] Error in testPL300Parsing:', error);
  }
}
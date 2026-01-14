/**
 * JSON Block Merger Utility
 * 
 * Handles merging multiple JSON concept blocks from batched Claude generation
 * into a single unified JSON block for reliable parsing.
 * 
 * @module json-merger
 */

// ============================================================================
// TYPES
// ============================================================================

interface ConceptBlock {
    concepts: unknown[];
    [key: string]: unknown;
}

// ============================================================================
// JSON SANITIZATION
// ============================================================================

/**
 * Sanitize JSON string to handle common LLM output issues
 */
function sanitizeJsonString(jsonStr: string): string {
    // Remove trailing commas in arrays/objects (common LLM error)
    let sanitized = jsonStr.replace(/,(\s*[}\]])/g, '$1');

    // Sanitize control characters that aren't valid in JSON strings
    // eslint-disable-next-line no-control-regex
    sanitized = sanitized.replace(/[\u0000-\u001F\u007F-\u009F]/g, (char) => {
        if (char === '\n') return '\\n';
        if (char === '\r') return '\\r';
        if (char === '\t') return '\\t';
        return '';
    });

    // Handle truncated JSON by attempting to close open brackets
    let openBraces = 0;
    let openBrackets = 0;
    for (const char of sanitized) {
        if (char === '{') openBraces++;
        if (char === '}') openBraces--;
        if (char === '[') openBrackets++;
        if (char === ']') openBrackets--;
    }

    // If truncated, try to complete it
    if (openBrackets > 0 || openBraces > 0) {
        sanitized += ']'.repeat(Math.max(0, openBrackets)) + '}'.repeat(Math.max(0, openBraces));
    }

    return sanitized;
}

// ============================================================================
// MAIN MERGER FUNCTION
// ============================================================================

/**
 * Merge multiple JSON concept blocks into a single unified block.
 * 
 * This handles the multi-batch output from Claude generation where each batch
 * produces its own ```json { "concepts": [...] } ``` block.
 * 
 * @param rawContent - The raw content containing multiple JSON blocks
 * @returns Content with all JSON blocks merged into a single block
 */
export function mergeJsonConceptBlocks(rawContent: string): string {
    const allConcepts: unknown[] = [];
    const seenOrders = new Set<number>();

    // Match all JSON code blocks containing concepts
    const jsonBlockRegex = /```json\s*(\{[\s\S]*?"concepts"[\s\S]*?\})\s*```/g;

    let match;
    let blockCount = 0;

    while ((match = jsonBlockRegex.exec(rawContent)) !== null) {
        blockCount++;
        try {
            const sanitized = sanitizeJsonString(match[1]);
            const parsed = JSON.parse(sanitized) as ConceptBlock;

            if (parsed.concepts && Array.isArray(parsed.concepts)) {
                for (const concept of parsed.concepts) {
                    // Deduplicate by order number
                    const order = typeof concept === 'object' && concept !== null
                        ? (concept as { order?: number }).order
                        : undefined;

                    if (order !== undefined && seenOrders.has(order)) {
                        continue;
                    }

                    if (order !== undefined) {
                        seenOrders.add(order);
                    }

                    allConcepts.push(concept);
                }
            }
        } catch (e) {
            console.warn(`[JSONMerger] Failed to parse JSON block ${blockCount}:`, e);
            // Continue to next block - don't break the entire merge
        }
    }

    // If no concepts found or only one block, return original content
    if (allConcepts.length === 0) {
        return rawContent;
    }

    if (blockCount === 1) {
        return rawContent;
    }

    // Sort concepts by order to ensure correct sequence
    allConcepts.sort((a, b) => {
        const orderA = typeof a === 'object' && a !== null ? (a as { order?: number }).order ?? 0 : 0;
        const orderB = typeof b === 'object' && b !== null ? (b as { order?: number }).order ?? 0 : 0;
        return orderA - orderB;
    });

    // Remove all individual JSON blocks from content
    const cleanedContent = rawContent.replace(jsonBlockRegex, '');

    // Create single merged JSON block
    const mergedJson = JSON.stringify({ concepts: allConcepts }, null, 2);

    // Return cleaned content with single merged block appended
    return cleanedContent.trim() + '\n\n```json\n' + mergedJson + '\n```';
}

/**
 * Extract concept count from raw content without full parsing
 * Useful for quick validation checks
 */
export function countConceptsInContent(rawContent: string): number {
    let count = 0;
    const jsonBlockRegex = /```json\s*(\{[\s\S]*?"concepts"[\s\S]*?\})\s*```/g;

    let match;
    while ((match = jsonBlockRegex.exec(rawContent)) !== null) {
        try {
            const sanitized = sanitizeJsonString(match[1]);
            const parsed = JSON.parse(sanitized) as ConceptBlock;

            if (parsed.concepts && Array.isArray(parsed.concepts)) {
                count += parsed.concepts.length;
            }
        } catch {
            // Silently continue
        }
    }

    return count;
}

/**
 * Validate that merged content contains expected number of concepts
 */
export function validateMergedContent(
    mergedContent: string,
    expectedCount: number
): { valid: boolean; actualCount: number; message: string } {
    const actualCount = countConceptsInContent(mergedContent);

    if (actualCount === 0) {
        return {
            valid: false,
            actualCount,
            message: 'No concepts found in merged content'
        };
    }

    if (actualCount < expectedCount * 0.9) {
        return {
            valid: false,
            actualCount,
            message: `Concept count mismatch: expected ${expectedCount}, found ${actualCount} (${Math.round(actualCount / expectedCount * 100)}%)`
        };
    }

    return {
        valid: true,
        actualCount,
        message: `Successfully merged ${actualCount} concepts`
    };
}

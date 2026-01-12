/**
 * Content Quality Validator
 * 
 * STRICT validation - no fallbacks, no placeholders.
 * Missing content should be flagged for support.
 */

export interface ContentGap {
    field: string;
    conceptId: string;
    conceptName: string;
    severity: 'critical' | 'warning';
    message: string;
}

// Patterns that indicate placeholder/generic content (must be rejected)
const PLACEHOLDER_PATTERNS = [
    'pending generation',
    'is a core concept',
    'understanding',
    'in the context of',
    'is essential for mastering',
    'makes it possible',
    'is a key component',
    'fills a gap',
    'improve efficiency',
];

/**
 * Check if content is real (not placeholder/empty/circular)
 */
export function isRealContent(text: string | undefined, conceptName: string): boolean {
    if (!text || text.trim() === '') return false;

    const lowerText = text.toLowerCase();
    const lowerName = conceptName.toLowerCase();

    // Extract core name without parentheses (e.g., "Row-Level Security" from "Row-Level Security (RLS)")
    const coreName = lowerName.replace(/\s*\([^)]*\)\s*/g, '').trim();
    // Also get acronym if present
    const acronymMatch = conceptName.match(/\(([^)]+)\)/);
    const acronym = acronymMatch ? acronymMatch[1].toLowerCase() : '';

    // ===== CIRCULAR REFERENCE CHECKS =====

    // Check 1: Exact match
    if (lowerText.trim() === lowerName.trim()) return false;
    if (coreName && lowerText.trim() === coreName) return false;

    // Check 2: "Think of X like a X" pattern (circular metaphor)
    if (lowerText.includes('think of') && lowerText.includes('like a')) {
        // Check if the name appears both before and after "like"
        const likeIndex = lowerText.indexOf('like a');
        const beforeLike = lowerText.substring(0, likeIndex);
        const afterLike = lowerText.substring(likeIndex);

        const nameInBefore = beforeLike.includes(coreName) || (acronym && beforeLike.includes(acronym));
        const nameInAfter = afterLike.includes(coreName) || (acronym && afterLike.includes(acronym));

        if (nameInBefore && nameInAfter) return false;
    }

    // Check 3: Content is just repeating the concept name with filler
    // E.g., "RLS is RLS" or "Row-Level Security is row-level security"
    const nameFrequency = (lowerText.match(new RegExp(coreName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length;
    if (nameFrequency >= 2 && text.trim().length < 100) return false;

    // Check 4: Starts and ends with concept name (circular)
    if (lowerText.startsWith(coreName) && lowerText.endsWith(coreName)) return false;

    // ===== PLACEHOLDER PATTERN CHECKS =====
    for (const pattern of PLACEHOLDER_PATTERNS) {
        if (lowerText.includes(pattern)) return false;
    }

    // ===== LENGTH CHECK =====
    // Too short (likely generic)
    if (text.trim().length < 20) return false;

    return true;
}

/**
 * Log content gaps to console in development mode
 * Call this when a concept is loaded to audit its content quality
 */
export function auditConceptContent(concept: {
    id: string;
    name: string;
    hookSentence?: string;
    whyYouNeed?: string;
    technicalDetails?: string;
    realWorldExample?: string;
    mnemonic?: { story?: string };
    shape?: { simpleCore?: string; highStakesExample?: string };
}): void {
    // Only log in development
    if (import.meta.env.PROD) return;

    const gaps: string[] = [];

    if (!isRealContent(concept.hookSentence, concept.name)) {
        gaps.push('hookSentence');
    }
    if (!isRealContent(concept.whyYouNeed, concept.name)) {
        gaps.push('whyYouNeed');
    }
    if (!isRealContent(concept.realWorldExample, concept.name)) {
        gaps.push('realWorldExample');
    }
    if (!isRealContent(concept.technicalDetails, concept.name)) {
        gaps.push('technicalDetails');
    }
    if (!concept.mnemonic?.story || !isRealContent(concept.mnemonic.story, concept.name)) {
        gaps.push('mnemonic.story');
    }
    if (!concept.shape?.simpleCore || !isRealContent(concept.shape.simpleCore, concept.name)) {
        gaps.push('shape.simpleCore');
    }
    if (!concept.shape?.highStakesExample || !isRealContent(concept.shape.highStakesExample, concept.name)) {
        gaps.push('shape.highStakesExample');
    }

    if (gaps.length > 0) {
        console.warn(
            `[Content Gap] "${concept.name}" is missing: ${gaps.join(', ')}`,
            { conceptId: concept.id, gaps }
        );
    }
}

/**
 * Validate a concept and return all missing/invalid fields
 */
export function validateConceptContent(concept: {
    id: string;
    name: string;
    hookSentence?: string;
    whyYouNeed?: string;
    technicalDetails?: string;
    realWorldExample?: string;
    metaphor?: string;
    mnemonic?: { anchor?: string; story?: string };
    shape?: {
        simpleCore?: string;
        highStakesExample?: string;
        analogicalModel?: string;
        patternRecognition?: { question?: string; answer?: string };
        eliminationLogic?: string;
    };
}): ContentGap[] {
    const gaps: ContentGap[] = [];

    // Check required fields
    if (!isRealContent(concept.hookSentence, concept.name)) {
        gaps.push({
            field: 'hookSentence',
            conceptId: concept.id,
            conceptName: concept.name,
            severity: 'critical',
            message: 'Missing hook sentence'
        });
    }

    if (!isRealContent(concept.whyYouNeed, concept.name)) {
        gaps.push({
            field: 'whyYouNeed',
            conceptId: concept.id,
            conceptName: concept.name,
            severity: 'critical',
            message: 'Missing "why you need" explanation'
        });
    }

    if (!isRealContent(concept.realWorldExample, concept.name)) {
        gaps.push({
            field: 'realWorldExample',
            conceptId: concept.id,
            conceptName: concept.name,
            severity: 'critical',
            message: 'Missing real-world example'
        });
    }

    // Check mnemonic
    if (!concept.mnemonic?.story || !isRealContent(concept.mnemonic.story, concept.name)) {
        gaps.push({
            field: 'mnemonic.story',
            conceptId: concept.id,
            conceptName: concept.name,
            severity: 'critical',
            message: 'Missing memory anchor story'
        });
    }

    // Check SHAPE content
    if (!concept.shape?.simpleCore || !isRealContent(concept.shape.simpleCore, concept.name)) {
        gaps.push({
            field: 'shape.simpleCore',
            conceptId: concept.id,
            conceptName: concept.name,
            severity: 'critical',
            message: 'Missing SHAPE simple core'
        });
    }

    if (!concept.shape?.highStakesExample || !isRealContent(concept.shape.highStakesExample, concept.name)) {
        gaps.push({
            field: 'shape.highStakesExample',
            conceptId: concept.id,
            conceptName: concept.name,
            severity: 'critical',
            message: 'Missing SHAPE high-stakes example'
        });
    }

    return gaps;
}

/**
 * Generate error message for display
 */
export function getContentGapMessage(gap: ContentGap): string {
    return `⚠️ ${gap.message} — Flag to Support`;
}

/**
 * Check if concept has any critical gaps
 */
export function hasCriticalGaps(concept: Parameters<typeof validateConceptContent>[0]): boolean {
    const gaps = validateConceptContent(concept);
    return gaps.some(g => g.severity === 'critical');
}

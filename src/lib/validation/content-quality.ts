/**
 * Content Quality Validator
 * 
 * STRICT validation - no fallbacks, no placeholders.
 * Missing content should be flagged for support.
 */

export interface ContentGap {
    field: string;
    conceptId?: string;
    conceptName: string;
    severity: 'critical' | 'warning';
    message: string;
}

// Patterns that indicate placeholder/generic content (must be rejected)
export interface VerifiableConcept {
    id?: string;
    name: string;
    hookSentence?: string;
    whyYouNeed?: string;
    technicalDetails?: string;
    realWorldExample?: string;
    metaphor?: string;
    mnemonic?: { anchor?: string; story?: string;[key: string]: unknown };
    shape?: {
        simpleCore?: string;
        highStakesExample?: string;
        analogicalModel?: string;
        patternRecognition?: { question?: string; answer?: string };
        eliminationLogic?: string;
    };
    [key: string]: unknown;
}
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
export function validateConceptContent(concept: VerifiableConcept): ContentGap[] {
    const gaps: ContentGap[] = [];

    // Ensure ID exists for reporting
    // const conceptId = concept.id || 'unknown';

    // Check required fields
    if (!isRealContent(concept.hookSentence || '', concept.name)) {
        gaps.push({
            field: 'hookSentence',
            conceptId: concept.id,
            conceptName: concept.name,
            severity: 'critical',
            message: 'Missing hook sentence'
        });
    }

    if (!isRealContent(concept.whyYouNeed || '', concept.name)) {
        gaps.push({
            field: 'whyYouNeed',
            conceptId: concept.id,
            conceptName: concept.name,
            severity: 'critical',
            message: 'Missing "why you need" explanation'
        });
    }

    if (!isRealContent(concept.realWorldExample || '', concept.name)) {
        gaps.push({
            field: 'realWorldExample',
            conceptId: concept.id,
            conceptName: concept.name,
            severity: 'critical',
            message: 'Missing real-world example'
        });
    }

    // Check mnemonic
    if (!concept.mnemonic?.story || !isRealContent(concept.mnemonic.story || '', concept.name)) {
        gaps.push({
            field: 'mnemonic.story',
            conceptId: concept.id,
            conceptName: concept.name,
            severity: 'critical',
            message: 'Missing memory anchor story'
        });
    }

    // Check SHAPE content
    if (!concept.shape?.simpleCore || !isRealContent(concept.shape.simpleCore || '', concept.name)) {
        gaps.push({
            field: 'shape.simpleCore',
            conceptId: concept.id,
            conceptName: concept.name,
            severity: 'critical',
            message: 'Missing SHAPE simple core'
        });
    }

    if (!concept.shape?.highStakesExample || !isRealContent(concept.shape.highStakesExample || '', concept.name)) {
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

/**
 * Verify that a repair attempt actually fixed the issue without regressions.
 * @param original - The concept before repair
 * @param repaired - The concept after repair
 * @returns true if repair is valid
 */
export function verifyRepair(
    original: VerifiableConcept,
    repaired: VerifiableConcept
): boolean {
    // 1. Check if name changed (forbidden unless explicit rename strategy)
    if (original.name !== repaired.name) return false;

    // 2. Run standard validation on repaired version
    // Check if it still has critical gaps
    const gaps = validateConceptContent(repaired);
    if (gaps.some(g => g.severity === 'critical')) return false;

    // 3. Check for specific regression: Circular Metaphors
    // (Ensure we didn't just replace one placeholder with another)
    if (repaired.shape?.simpleCore && !isRealContent(repaired.shape.simpleCore, repaired.name)) {
        return false;
    }


    return true;
}

/**
 * Verify relevance of uploaded context to the subject
 * Returns a score between 0 and 1
 */
export function verifyContextRelevance(subjectTitle: string, fileContent: string): { score: number; keywords: string[] } {
    if (!subjectTitle || !fileContent) return { score: 0, keywords: [] };

    // 1. Extract keywords from subject
    // Simple stop word list
    const stopWords = new Set(['the', 'and', 'or', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'a', 'an', 'is', 'are', 'i', 'exam', 'guide', 'test', 'certification']);

    // Clean and tokenize subject
    const subjectKeywords = subjectTitle.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 2 && !stopWords.has(w));

    if (subjectKeywords.length === 0) return { score: 1, keywords: [] }; // Fallback if no valid keywords

    // 2. Scan content for keywords
    const contentLower = fileContent.toLowerCase().substring(0, 10000); // Check first 10k chars for speed
    let matches = 0;

    subjectKeywords.forEach(kw => {
        // Count occurrences (approximate)
        if (contentLower.includes(kw)) {
            matches++;
            // Bonus for multiple occurrences
            const count = contentLower.split(kw).length - 1;
            if (count > 2) matches += 0.5;
        }
    });

    // 3. Calculate Score
    // If we have 3 keywords and fast matches, we want high score.
    // Base score = matches / keywords.length

    let rawScore = matches / subjectKeywords.length;

    // Normalize cap
    return {
        score: Math.min(1.0, rawScore),
        keywords: subjectKeywords
    };
}

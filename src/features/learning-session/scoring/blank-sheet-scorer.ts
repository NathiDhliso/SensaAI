/**
 * Blank Sheet Scorer - Fuzzy Recall Scoring Engine
 * 
 * PRODUCTION-HARDENED VERSION
 * 
 * Implements fuzzy matching for free-form recall responses using
 * LLM-generated keywords from concept scoring metadata.
 * 
 * SCORING ALGORITHM:
 * 1. Normalize text (lowercase, remove punctuation, expand contractions)
 * 2. Tokenize and remove stop words
 * 3. Apply simple stemming (running → run)
 * 4. Check overlap with concept.scoring.keywords
 * 5. Check overlap with concept.scoring.aliases
 * 6. Score = (keywordMatches / totalKeywords) × 100
 * 7. Bonus for alias matches (partial credit)
 * 
 * @module lib/learning/scoring/blank-sheet-scorer
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ConceptScoring {
    keywords: string[];
    aliases: string[];
}

export interface ScoringResult {
    /** Final score (0-100) */
    score: number;
    /** Grade letter based on score */
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    /** Keywords successfully matched in user input */
    matchedKeywords: string[];
    /** Keywords not found in user input */
    missedKeywords: string[];
    /** Alias terms matched (for bonus credit) */
    aliasMatches: string[];
    /** Confidence in the scoring (0-1) based on input quality */
    confidence: number;
    /** Detailed breakdown of scoring components */
    breakdown: {
        keywordScore: number;
        aliasBonus: number;
        lengthPenalty: number;
    };
    /** Feedback message for the user */
    feedback: string;
}

export interface ScoringConfig {
    /** Weight for keyword matches (default: 0.85) */
    keywordWeight?: number;
    /** Maximum bonus from alias matches (default: 0.15) */
    aliasMaxBonus?: number;
    /** Minimum word count for full credit (default: 5) */
    minWordCount?: number;
    /** Enable lenient matching (default: true) */
    lenientMatching?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Common stop words to filter out during tokenization */
const STOP_WORDS = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'are', 'was', 'were', 'be',
    'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
    'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this',
    'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
    'what', 'which', 'who', 'when', 'where', 'why', 'how', 'all', 'each',
    'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
    'not', 'only', 'same', 'so', 'than', 'too', 'very', 'just', 'also',
]);

/** Common contractions mapping */
const CONTRACTIONS: Record<string, string> = {
    "can't": "cannot",
    "won't": "will not",
    "don't": "do not",
    "doesn't": "does not",
    "didn't": "did not",
    "isn't": "is not",
    "aren't": "are not",
    "wasn't": "was not",
    "weren't": "were not",
    "haven't": "have not",
    "hasn't": "has not",
    "hadn't": "had not",
    "couldn't": "could not",
    "shouldn't": "should not",
    "wouldn't": "would not",
    "it's": "it is",
    "that's": "that is",
    "there's": "there is",
    "here's": "here is",
    "what's": "what is",
    "who's": "who is",
    "i'm": "i am",
    "you're": "you are",
    "we're": "we are",
    "they're": "they are",
    "i've": "i have",
    "you've": "you have",
    "we've": "we have",
    "they've": "they have",
    "i'd": "i would",
    "you'd": "you would",
    "he'd": "he would",
    "she'd": "she would",
    "we'd": "we would",
    "they'd": "they would",
    "i'll": "i will",
    "you'll": "you will",
    "he'll": "he will",
    "she'll": "she will",
    "we'll": "we will",
    "they'll": "they will",
};

/** Simple stemming rules (suffix removal) */
const STEM_RULES: Array<{ suffix: string; replacement: string }> = [
    { suffix: 'ization', replacement: 'ize' },
    { suffix: 'isation', replacement: 'ise' },
    { suffix: 'ational', replacement: 'ate' },
    { suffix: 'fulness', replacement: 'ful' },
    { suffix: 'iveness', replacement: 'ive' },
    { suffix: 'ousness', replacement: 'ous' },
    { suffix: 'ioning', replacement: '' },
    { suffix: 'lessly', replacement: 'less' },
    { suffix: 'ically', replacement: 'ic' },
    { suffix: 'ations', replacement: '' },
    { suffix: 'nesses', replacement: '' },
    { suffix: 'ments', replacement: '' },
    { suffix: 'ings', replacement: '' },
    { suffix: 'ness', replacement: '' },
    { suffix: 'ment', replacement: '' },
    { suffix: 'tion', replacement: '' },
    { suffix: 'sion', replacement: '' },
    { suffix: 'able', replacement: '' },
    { suffix: 'ible', replacement: '' },
    { suffix: 'ful', replacement: '' },
    { suffix: 'ous', replacement: '' },
    { suffix: 'ive', replacement: '' },
    { suffix: 'ize', replacement: '' },
    { suffix: 'ise', replacement: '' },
    { suffix: 'ing', replacement: '' },
    { suffix: 'ed', replacement: '' },
    { suffix: 'er', replacement: '' },
    { suffix: 'ly', replacement: '' },
    { suffix: 's', replacement: '' },
];

// ============================================================================
// SCORER CLASS
// ============================================================================

class BlankSheetScorerClass {
    private static instance: BlankSheetScorerClass;

    private constructor() { }

    public static getInstance(): BlankSheetScorerClass {
        if (!BlankSheetScorerClass.instance) {
            BlankSheetScorerClass.instance = new BlankSheetScorerClass();
        }
        return BlankSheetScorerClass.instance;
    }

    // ========================================================================
    // MAIN SCORING METHOD
    // ========================================================================

    /**
     * Calculate recall score for user input against concept scoring data.
     * 
     * @param userInput - The user's free-form recall response
     * @param conceptData - Scoring metadata with keywords and aliases
     * @param config - Optional scoring configuration
     * @returns Detailed scoring result
     */
    public calculateRecallScore(
        userInput: string,
        conceptData: { scoring?: ConceptScoring },
        config: ScoringConfig = {}
    ): ScoringResult {
        const {
            keywordWeight = 0.85,
            aliasMaxBonus = 0.15,
            minWordCount = 5,
            lenientMatching = true,
        } = config;

        // Handle missing scoring data
        const scoring = conceptData.scoring || { keywords: [], aliases: [] };
        const keywords = scoring.keywords || [];
        const aliases = scoring.aliases || [];

        // Handle empty input
        if (!userInput || !userInput.trim()) {
            return this.createEmptyResult('No response provided.');
        }

        // Handle missing keywords (can't score properly)
        if (keywords.length === 0) {
            return this.createFallbackResult(userInput, minWordCount);
        }

        // Normalize and tokenize user input
        const normalizedInput = this.normalizeText(userInput);
        const userTokens = this.tokenize(normalizedInput);
        const userStemmedTokens = userTokens.map(t => this.stem(t));

        // Calculate confidence based on input quality
        const confidence = this.calculateConfidence(userTokens, minWordCount);

        // Match keywords
        const matchedKeywords: string[] = [];
        const missedKeywords: string[] = [];

        for (const keyword of keywords) {
            const normalizedKeyword = this.normalizeText(keyword);
            const keywordTokens = this.tokenize(normalizedKeyword);
            const keywordStemmedTokens = keywordTokens.map(t => this.stem(t));

            // Check if ALL tokens of the keyword are present in user input
            let isMatch = false;

            if (lenientMatching) {
                // Lenient: at least one token matches
                isMatch = keywordStemmedTokens.some(kt =>
                    userStemmedTokens.some(ut =>
                        ut.includes(kt) || kt.includes(ut)
                    )
                );
            } else {
                // Strict: all tokens must match
                isMatch = keywordStemmedTokens.every(kt =>
                    userStemmedTokens.includes(kt)
                );
            }

            if (isMatch) {
                matchedKeywords.push(keyword);
            } else {
                missedKeywords.push(keyword);
            }
        }

        // Match aliases (for bonus)
        const aliasMatches: string[] = [];
        for (const alias of aliases) {
            const normalizedAlias = this.normalizeText(alias);
            const aliasTokens = this.tokenize(normalizedAlias);
            const aliasStemmedTokens = aliasTokens.map(t => this.stem(t));

            const isMatch = aliasStemmedTokens.some(at =>
                userStemmedTokens.some(ut =>
                    ut.includes(at) || at.includes(ut)
                )
            );

            if (isMatch) {
                aliasMatches.push(alias);
            }
        }

        // Calculate scores
        const keywordScore = keywords.length > 0
            ? (matchedKeywords.length / keywords.length) * 100
            : 0;

        const aliasBonus = aliases.length > 0
            ? (aliasMatches.length / aliases.length) * aliasMaxBonus * 100
            : 0;

        // Length penalty for very short responses
        const lengthPenalty = userTokens.length < minWordCount
            ? (1 - (userTokens.length / minWordCount)) * 10
            : 0;

        // Combine scores
        let finalScore = (keywordScore * keywordWeight) + aliasBonus - lengthPenalty;
        finalScore = Math.max(0, Math.min(100, finalScore));
        finalScore = Math.round(finalScore);

        // Determine grade
        const grade = this.scoreToGrade(finalScore);

        // Generate feedback
        const feedback = this.generateFeedback(
            finalScore,
            matchedKeywords.length,
            keywords.length,
            missedKeywords
        );

        return {
            score: finalScore,
            grade,
            matchedKeywords,
            missedKeywords,
            aliasMatches,
            confidence,
            breakdown: {
                keywordScore: Math.round(keywordScore),
                aliasBonus: Math.round(aliasBonus),
                lengthPenalty: Math.round(lengthPenalty),
            },
            feedback,
        };
    }

    // ========================================================================
    // TEXT PROCESSING
    // ========================================================================

    /**
     * Normalize text: lowercase, expand contractions, remove punctuation
     */
    private normalizeText(text: string): string {
        let normalized = text.toLowerCase().trim();

        // Expand contractions
        for (const [contraction, expansion] of Object.entries(CONTRACTIONS)) {
            normalized = normalized.replace(
                new RegExp(contraction.replace("'", "'?"), 'g'),
                expansion
            );
        }

        // Remove punctuation except hyphens within words
        normalized = normalized.replace(/[^\w\s-]/g, ' ');

        // Normalize whitespace
        normalized = normalized.replace(/\s+/g, ' ').trim();

        return normalized;
    }

    /**
     * Tokenize text and remove stop words
     */
    private tokenize(text: string): string[] {
        return text
            .split(/\s+/)
            .filter(token => token.length > 1)
            .filter(token => !STOP_WORDS.has(token));
    }

    /**
     * Apply simple stemming rules
     */
    private stem(word: string): string {
        if (word.length < 4) return word;

        for (const rule of STEM_RULES) {
            if (word.endsWith(rule.suffix)) {
                const stemmed = word.slice(0, -rule.suffix.length) + rule.replacement;
                if (stemmed.length >= 2) {
                    return stemmed;
                }
            }
        }

        return word;
    }

    // ========================================================================
    // SCORING HELPERS
    // ========================================================================

    /**
     * Calculate confidence based on input quality
     */
    private calculateConfidence(tokens: string[], minWordCount: number): number {
        if (tokens.length === 0) return 0;
        if (tokens.length < minWordCount / 2) return 0.3;
        if (tokens.length < minWordCount) return 0.6;
        return Math.min(1, 0.7 + (tokens.length / 50));
    }

    /**
     * Convert score to letter grade
     */
    private scoreToGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
        if (score >= 90) return 'A';
        if (score >= 80) return 'B';
        if (score >= 70) return 'C';
        if (score >= 60) return 'D';
        return 'F';
    }

    /**
     * Generate feedback message
     */
    private generateFeedback(
        score: number,
        matched: number,
        total: number,
        missed: string[]
    ): string {
        if (score >= 90) {
            return `Excellent recall! You demonstrated strong understanding with ${matched}/${total} key concepts.`;
        }
        if (score >= 70) {
            return `Good recall! You covered ${matched}/${total} key concepts. Consider reviewing: ${missed.slice(0, 2).join(', ')}.`;
        }
        if (score >= 50) {
            return `Partial recall. You mentioned ${matched}/${total} key concepts. Focus on understanding: ${missed.slice(0, 3).join(', ')}.`;
        }
        return `Needs improvement. You recalled ${matched}/${total} key concepts. Review the main ideas: ${missed.slice(0, 3).join(', ')}.`;
    }

    /**
     * Create result for empty input
     */
    private createEmptyResult(message: string): ScoringResult {
        return {
            score: 0,
            grade: 'F',
            matchedKeywords: [],
            missedKeywords: [],
            aliasMatches: [],
            confidence: 0,
            breakdown: { keywordScore: 0, aliasBonus: 0, lengthPenalty: 0 },
            feedback: message,
        };
    }

    /**
     * Create fallback result when scoring data is missing
     * Uses basic heuristics based on response length
     */
    private createFallbackResult(input: string, _minWordCount: number): ScoringResult {
        const tokens = this.tokenize(this.normalizeText(input));

        // Basic scoring: 10 points per word, capped at 70 (no keywords to verify)
        const lengthScore = Math.min(70, tokens.length * 10);

        return {
            score: lengthScore,
            grade: this.scoreToGrade(lengthScore),
            matchedKeywords: [],
            missedKeywords: [],
            aliasMatches: [],
            confidence: 0.3, // Low confidence without scoring data
            breakdown: {
                keywordScore: lengthScore,
                aliasBonus: 0,
                lengthPenalty: 0,
            },
            feedback: 'Scoring data not available. Score based on response length only.',
        };
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const BlankSheetScorer = BlankSheetScorerClass.getInstance();

/**
 * Convenience function for direct scoring
 */
export function calculateRecallScore(
    userInput: string,
    conceptData: { scoring?: ConceptScoring },
    config?: ScoringConfig
): ScoringResult {
    return BlankSheetScorer.calculateRecallScore(userInput, conceptData, config);
}

export default BlankSheetScorer;

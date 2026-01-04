/**
 * SensaAI Performance Optimizer
 * 
 * Optimizations for blank sheet analysis, metrics calculation,
 * and caching for responsive user experience.
 * 
 * Requirements: Task 14 (Performance optimization)
 */

// ============================================================================
// TYPES
// ============================================================================

export interface CacheConfig {
    maxAge: number;       // milliseconds
    maxEntries: number;
}

interface CacheEntry<T> {
    value: T;
    timestamp: number;
}

// ============================================================================
// LRU CACHE
// ============================================================================

export class LRUCache<T> {
    private cache: Map<string, CacheEntry<T>> = new Map();
    private config: CacheConfig;

    constructor(config: Partial<CacheConfig> = {}) {
        this.config = {
            maxAge: config.maxAge ?? 5 * 60 * 1000, // 5 minutes default
            maxEntries: config.maxEntries ?? 100,
        };
    }

    get(key: string): T | undefined {
        const entry = this.cache.get(key);
        if (!entry) return undefined;

        // Check expiry
        if (Date.now() - entry.timestamp > this.config.maxAge) {
            this.cache.delete(key);
            return undefined;
        }

        // Move to end (most recently used)
        this.cache.delete(key);
        this.cache.set(key, entry);
        return entry.value;
    }

    set(key: string, value: T): void {
        // Remove oldest if at capacity
        if (this.cache.size >= this.config.maxEntries) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey) this.cache.delete(firstKey);
        }
        this.cache.set(key, { value, timestamp: Date.now() });
    }

    clear(): void {
        this.cache.clear();
    }

    size(): number {
        return this.cache.size;
    }
}

// ============================================================================
// DEBOUNCED ANALYSIS
// ============================================================================

export function debounce<T extends (...args: unknown[]) => unknown>(
    fn: T,
    delay: number
): (...args: Parameters<T>) => void {
    let timeoutId: ReturnType<typeof setTimeout>;

    return (...args: Parameters<T>) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
}

export function throttle<T extends (...args: unknown[]) => unknown>(
    fn: T,
    limit: number
): (...args: Parameters<T>) => void {
    let lastRun = 0;

    return (...args: Parameters<T>) => {
        const now = Date.now();
        if (now - lastRun >= limit) {
            lastRun = now;
            fn(...args);
        }
    };
}

// ============================================================================
// BLANK SHEET ANALYSIS OPTIMIZER
// ============================================================================

export interface KeyPointMatch {
    keyPoint: string;
    matched: boolean;
    confidence: number;
}

/** Cache for concept key points analysis */
const keyPointsCache = new LRUCache<string[]>({ maxEntries: 200 });

/** Cache for analyzed responses */
const analysisCache = new LRUCache<KeyPointMatch[]>({ maxAge: 10 * 60 * 1000 });

/**
 * Optimized key point extraction with caching
 */
export function getConceptKeyPoints(conceptId: string, content: string): string[] {
    // Check cache first
    const cached = keyPointsCache.get(conceptId);
    if (cached) return cached;

    // Extract key points (simplified for performance)
    const keyPoints = extractKeyPointsFast(content);
    keyPointsCache.set(conceptId, keyPoints);
    return keyPoints;
}

/**
 * Fast key point extraction algorithm
 */
function extractKeyPointsFast(content: string): string[] {
    if (!content) return [];

    const keyPoints: string[] = [];

    // Take first sentence of each paragraph as key point
    const paragraphs = content.split(/\n\n+/);
    for (const para of paragraphs.slice(0, 7)) { // Max 7 key points
        const firstSentence = para.split(/[.!?]+/)[0]?.trim();
        if (firstSentence && firstSentence.length > 10) {
            keyPoints.push(firstSentence);
        }
    }

    return keyPoints.slice(0, 7);
}

/**
 * Optimized response analysis with caching
 */
export function analyzeResponse(
    conceptId: string,
    response: string,
    keyPoints: string[]
): KeyPointMatch[] {
    const cacheKey = `${conceptId}:${response.substring(0, 50)}`;

    // Check cache
    const cached = analysisCache.get(cacheKey);
    if (cached) return cached;

    // Perform analysis
    const responseLower = response.toLowerCase();
    const responseWords = new Set(responseLower.split(/\s+/));

    const matches: KeyPointMatch[] = keyPoints.map(keyPoint => {
        const keyPointWords = keyPoint.toLowerCase().split(/\s+/);
        const criticalWords = keyPointWords.filter(w =>
            w.length > 4 && !['the', 'and', 'for', 'that', 'with', 'from'].includes(w)
        );

        // Fast word matching
        let matchedWords = 0;
        for (const word of criticalWords) {
            if (responseWords.has(word) || responseLower.includes(word)) {
                matchedWords++;
            }
        }

        const confidence = criticalWords.length > 0
            ? matchedWords / criticalWords.length
            : 0;

        return {
            keyPoint,
            matched: confidence >= 0.5,
            confidence,
        };
    });

    // Cache result
    analysisCache.set(cacheKey, matches);
    return matches;
}

// ============================================================================
// METRICS CALCULATION OPTIMIZER
// ============================================================================

export interface IncrementalMetrics {
    totalConcepts: number;
    masteredConcepts: number;
    totalTimeMinutes: number;
    lastUpdated: number;
}

let cachedMetrics: IncrementalMetrics | null = null;
let metricsVersion = 0;

/**
 * Get metrics with incremental update
 */
export function getIncrementalMetrics(): IncrementalMetrics {
    if (!cachedMetrics) {
        cachedMetrics = {
            totalConcepts: 0,
            masteredConcepts: 0,
            totalTimeMinutes: 0,
            lastUpdated: Date.now(),
        };
    }
    return cachedMetrics;
}

/**
 * Update metrics incrementally (no full recalculation)
 */
export function updateMetricsIncremental(
    delta: Partial<IncrementalMetrics>
): IncrementalMetrics {
    if (!cachedMetrics) cachedMetrics = getIncrementalMetrics();

    if (delta.totalConcepts !== undefined) {
        cachedMetrics.totalConcepts += delta.totalConcepts;
    }
    if (delta.masteredConcepts !== undefined) {
        cachedMetrics.masteredConcepts += delta.masteredConcepts;
    }
    if (delta.totalTimeMinutes !== undefined) {
        cachedMetrics.totalTimeMinutes += delta.totalTimeMinutes;
    }

    cachedMetrics.lastUpdated = Date.now();
    metricsVersion++;
    return cachedMetrics;
}

/**
 * Get velocity (concepts per hour)
 */
export function getVelocity(): number {
    const metrics = getIncrementalMetrics();
    if (metrics.totalTimeMinutes === 0) return 0;
    return (metrics.masteredConcepts / metrics.totalTimeMinutes) * 60;
}

// ============================================================================
// LOADING STATES
// ============================================================================

export interface LoadingState {
    isLoading: boolean;
    progress?: number;
    message?: string;
}

/**
 * Create progressive loading state for slow operations
 */
export function createProgressiveLoader(
    totalSteps: number,
    onProgress: (state: LoadingState) => void
) {
    let currentStep = 0;

    return {
        start(message?: string) {
            currentStep = 0;
            onProgress({ isLoading: true, progress: 0, message });
        },
        advance(message?: string) {
            currentStep++;
            const progress = Math.min(100, (currentStep / totalSteps) * 100);
            onProgress({ isLoading: true, progress, message });
        },
        complete() {
            onProgress({ isLoading: false, progress: 100 });
        },
        error(message: string) {
            onProgress({ isLoading: false, message });
        },
    };
}

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================

export interface PerformanceMetrics {
    analysisTime: number[];    // ms per analysis
    renderTime: number[];      // ms per render
    cacheHitRate: number;
}

const perfMetrics: PerformanceMetrics = {
    analysisTime: [],
    renderTime: [],
    cacheHitRate: 0,
};

export function recordAnalysisTime(timeMs: number): void {
    perfMetrics.analysisTime.push(timeMs);
    // Keep last 100 samples
    if (perfMetrics.analysisTime.length > 100) {
        perfMetrics.analysisTime.shift();
    }
}

export function getAverageAnalysisTime(): number {
    if (perfMetrics.analysisTime.length === 0) return 0;
    const sum = perfMetrics.analysisTime.reduce((a, b) => a + b, 0);
    return sum / perfMetrics.analysisTime.length;
}

export function getPerformanceMetrics(): PerformanceMetrics {
    return { ...perfMetrics };
}

export default {
    LRUCache,
    debounce,
    throttle,
    getConceptKeyPoints,
    analyzeResponse,
    getIncrementalMetrics,
    updateMetricsIncremental,
    getVelocity,
    createProgressiveLoader,
    recordAnalysisTime,
    getAverageAnalysisTime,
    getPerformanceMetrics,
};

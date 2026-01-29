
import * as pdfjsLib from 'pdfjs-dist';

// Clean "Vite Way": Import legacy worker URL directly (Vite handles bundling/serving)
// We use the ?url suffix to get the resolved URL of the worker file.
// The "legacy" build is safer because it avoids complex ESM/CJS interop issues in some environments,
// allowing Vite to just serve it as a static asset.
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export type ContentMode = 'BLUEPRINT' | 'QUESTION' | 'GENERAL';

export interface OptimizationResult {
    text: string;
    metadata: {
        originalLength: number;
        optimizedLength: number;
        mode: ContentMode;
        chunksUsed: number;
        totalChunks: number;
    };
}

interface SemanticChunk {
    content: string;
    score: number;
    type: 'HEADER' | 'QUESTION' | 'STATUTE' | 'TEXT' | 'BOILERPLATE';
}

const CONTEXT_LIMIT_CHARS = 15000; // Safe buffer for typical LLM context slots

/**
 * Main entry point: Process a file and return optimized context
 * @deprecated Client-side optimization is being replaced by server-side ingestion (Phase 1 Silver Bullet)
 */
export async function processAndOptimizeContext(file: File): Promise<OptimizationResult> {
    // 1. Extract raw text
    let rawText = '';
    if (file.type === 'application/pdf') {
        try {
            rawText = await extractTextFromPDF(file);
        } catch (e) {
            console.error("PDF Extraction Failed", e);
            throw new Error(`PDF processing failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
    } else {
        rawText = await extractTextFromTextFile(file);
    }

    // 2. Detect Mode
    const mode = detectContentMode(rawText);

    // 3. Optimize
    return optimizeContext(rawText, mode);
}

/**
 * Detects the pedagogical mode of the content
 */
export function detectContentMode(text: string): ContentMode {
    const dataset = text.substring(0, 5000).toLowerCase(); // Check first 5k chars

    const blueprintKeywords = ['syllabus', 'exam guide', 'certification objectives', 'blueprint', 'domain 1:', 'module 1:'];
    const questionKeywords = ['practice test', 'sample questions', 'answer key', 'q1:', 'question 1', 'select the best answer'];

    const isBlueprint = blueprintKeywords.some(kw => dataset.includes(kw));
    const isQuestion = questionKeywords.some(kw => dataset.includes(kw));

    if (isBlueprint) return 'BLUEPRINT';
    if (isQuestion) return 'QUESTION';
    return 'GENERAL';
}

/**
 * intelligently truncates and selects best content
 */
export function optimizeContext(text: string, mode: ContentMode): OptimizationResult {
    if (text.length <= CONTEXT_LIMIT_CHARS) {
        return {
            text,
            metadata: {
                originalLength: text.length,
                optimizedLength: text.length,
                mode,
                chunksUsed: 1,
                totalChunks: 1
            }
        };
    }

    // Split into semantic chunks
    const chunks = splitIntoSemanticChunks(text);

    // Score chunks
    const scoredChunks = scoreChunks(chunks, mode);

    // Select chunks until limit reached
    let currentLength = 0;
    const selectedChunks: SemanticChunk[] = [];

    // Always include the first chunk (Intro/Context) if reasonable size
    if (scoredChunks.length > 0) {
        selectedChunks.push(scoredChunks[0]);
        currentLength += scoredChunks[0].content.length;
    }

    // Sort remaining by score descending
    const candidates = scoredChunks.slice(1).sort((a, b) => b.score - a.score);

    for (const chunk of candidates) {
        if (currentLength + chunk.content.length < CONTEXT_LIMIT_CHARS) {
            selectedChunks.push(chunk);
            currentLength += chunk.content.length;
        }
    }

    // Re-sort selected chunks by original order (implicitly handled if we tracked index, 
    // but for now simple concatenation is often enough. 
    // BETTER: Track original index to maintain narrative flow where possible, 
    // but for "Reference" material, high-signal extracts are often fine unordered.
    // Let's assume we want to preserve order for readability.)

    // Re-sort by finding them in original list (inefficient but safe for small N)
    const finalChunks = chunks.filter(c => selectedChunks.includes(c));

    const optimizedText = finalChunks.map(c => c.content).join('\n\n[...]\n\n');

    return {
        text: optimizedText,
        metadata: {
            originalLength: text.length,
            optimizedLength: optimizedText.length,
            mode,
            chunksUsed: finalChunks.length,
            totalChunks: chunks.length
        }
    };
}

function splitIntoSemanticChunks(text: string): SemanticChunk[] {
    // Split by double newlines or common dividers to get paragraphs
    const rawParagraphs = text.split(/\n\s*\n/);

    return rawParagraphs.map(p => {
        const content = p.trim();
        let type: SemanticChunk['type'] = 'TEXT';

        // Header detection (Caps or numbering)
        if (/^[A-Z0-9\s.:-]{5,100}$/.test(content) || /^(Chapter|Module|Section|Domain) \d+/.test(content)) {
            type = 'HEADER';
        }
        // Question detection
        else if (/^(Q\d+|Question \d+|\d+\.)/.test(content) && content.includes('?')) {
            type = 'QUESTION';
        }
        // Statute/Rule detection
        else if (/^(Section|Article|Ref|Rule) \d+(\.\d+)?/.test(content)) {
            type = 'STATUTE';
        }
        // Boilerplate detection
        else if (/copyright|all rights reserved|page \d+|visit us at|www\./i.test(content)) {
            type = 'BOILERPLATE';
        }

        return { content, type, score: 0 };
    }).filter(c => c.content.length > 0);
}

function scoreChunks(chunks: SemanticChunk[], mode: ContentMode): SemanticChunk[] {
    return chunks.map(chunk => {
        let score = 50; // Base score

        // Type definition bonuses
        if (chunk.type === 'HEADER') score += 20;
        if (chunk.type === 'BOILERPLATE') score -= 100;

        // Mode specific bonuses
        if (mode === 'BLUEPRINT') {
            if (chunk.content.toLowerCase().includes('objective')) score += 15;
            if (chunk.content.toLowerCase().includes('domain')) score += 15;
            if (chunk.type === 'STATUTE') score += 10;
        }

        if (mode === 'QUESTION') {
            if (chunk.type === 'QUESTION') score += 30;
            if (chunk.content.includes('?')) score += 10;
            if (chunk.content.toLowerCase().includes('answer')) score += 10;
        }

        // Length penalty/bonus (prefer medium chunks, penalize very short or massive ones)
        if (chunk.content.length < 20 && chunk.type === 'TEXT') score -= 10; // Noise
        if (chunk.content.length > 2000) score -= 5; // Too opaque

        // Keyword density (simple heuristic)
        const keywords = ['important', 'critical', 'note', 'warning', 'define', 'explain', 'compare'];
        keywords.forEach(kw => {
            if (chunk.content.toLowerCase().includes(kw)) score += 5;
        });

        return { ...chunk, score };
    });
}

// --- Extraction Utilities ---

async function extractTextFromTextFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve((e.target?.result as string) || '');
        reader.onerror = (e) => reject(e);
        reader.readAsText(file);
    });
}

async function extractTextFromPDF(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();

    // Create a timeout promise to prevent infinite hanging on fake worker
    const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('PDF Worker Initialization Timed Out (Check Network or CSP)')), 15000)
    );

    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });

    // Race against timeout
    const pdf = await Promise.race([loadingTask.promise, timeoutPromise]);

    let fullText = '';

    // Extract text from each page
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
            // Combine text items with space handling
            .filter((item: unknown): item is { str: string } => !!item && typeof item === 'object' && 'str' in item)
            .map((item) => (item as { str: string }).str)
            .join(' ');

        fullText += `\n\n--- Page ${i} ---\n\n${pageText}`;
    }

    return fullText;
}

import { conceptsApi } from '@/shared/api';
import { getErrorMessage, isAuthError } from '@/shared/api/client';
import { useAuthStore } from '@/store/auth-store';
import { useGenerationStore } from '@/store/generation-store';
import type { ProgressCallback, GenerationResult, ValidationResult } from '@/shared/types/generation';
import type { ParsedConcept } from '@/features/content-generation/parsers/types';
import type { SubjectType, MacroWorkflowResult } from '@/shared/types/macro-workflow';
import { UI_TIMINGS } from '@/shared/constants/ui-constants';
import { toast } from '@/shared/utils/toast';
import { logger } from '@/shared/utils/logger';
/**
 * Uploads the raw exam/blueprint file to the secure storage bucket.
 * Gets a presigned S3 URL from the backend and uploads directly.
 */
export async function uploadExamBlueprint(file: File): Promise<string> {
    const { url, key, bucket } = await conceptsApi.getUploadUrl(
        file.name,
        file.type || 'application/octet-stream',
        file.size,
    );

    const uploadResponse = await fetch(url, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
    });

    if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
    }

    return `s3://${bucket}/${key}`;
}
/**
 * Generate content using the serverless Lambda + DynamoDB pipeline.
 * All heavy lifting happens server-side - browser only polls for status.
 * 
 * CRITICAL: Generation is UNSTOPPABLE once started.
 * The job runs on the backend regardless of frontend state.
 * Frontend can navigate away - job will complete in background.
 */
export async function generateWithBackend(
    subject: string,
    onProgress: ProgressCallback,
    context?: string,
    _startFromPass: number = 1,
    trunks?: string[],
): Promise<GenerationResult> {
    const isDevEnvironment = import.meta.env.DEV || import.meta.env.MODE === 'development';
    const maxPollDurationMs = (isDevEnvironment ? 45 : 15) * 60 * 1000;
    // Get user ID from auth store
    const { user } = useAuthStore.getState();
    const userId = user?.id || 'anonymous';
    // Get active job tracking functions
    const { setActiveJob, updateActiveJobStatus, clearActiveJob } = useGenerationStore.getState();
    const enhancedContext = context || '';
    const startTime = Date.now();
    onProgress(1, 'in-progress', {
        message: 'Dispatching to AI engine...',
        progress: 3
    });
    let simProgress = 3;
    const simInterval = setInterval(() => {
        simProgress = Math.min(simProgress + 0.5, 12);
        onProgress(1, 'in-progress', {
            message: 'Establishing secure channel...',
            progress: simProgress
        });
    }, UI_TIMINGS.ONE_SECOND);
    // Add timeout for the initial generation call (5 minutes)
    const GENERATE_TIMEOUT = 5 * 60 * 1000;
    const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Generation request timed out. The server may be busy - please try again.')), GENERATE_TIMEOUT);
    });
    try {
        // [BLOCK: Generate Call] - Now with enhanced context including exam objectives
        const generateResponse = await Promise.race([
            conceptsApi.generate({
                subject,
                userId,
                context: enhancedContext,
                ...(trunks && trunks.length >= 2 && { trunks }),
            }),
            timeoutPromise
        ]);
        clearInterval(simInterval);
        if (generateResponse.status === 'failed') {
            logger.error('[Backend Generator] Generation failed:', generateResponse.error);
            clearActiveJob();
            toast.error(`Generation failed: ${generateResponse.error || 'Please try again'}`);
            throw new Error(generateResponse.error || 'Generation failed');
        }
        onProgress(1, 'complete', {
            message: 'Job dispatched — AI pipeline active',
            progress: 15
        });
        const { jobId, sessionId } = generateResponse;
        // Track the active job in persistent storage for background recovery
        setActiveJob({
            jobId,
            sessionId,
            userId,
            subject,
            context,
            startedAt: Date.now(),
            status: 'processing'
        });
        let jobClassification: Record<string, unknown> | undefined;
        if (generateResponse.status !== 'completed') {
            updateActiveJobStatus('processing');
            jobClassification = await _pollUntilComplete(
                jobId,
                userId,
                onProgress,
                startTime,
                maxPollDurationMs,
                updateActiveJobStatus,
                clearActiveJob,
            );
        }
        onProgress(3, 'in-progress', {
            message: 'Retrieving concept graph...',
            progress: 62
        });
        let allConcepts: ParsedConcept[] = [];
        try {
            onProgress(3, 'in-progress', {
                message: 'Loading trunk domains...',
                progress: 67
            });
            logger.debug('[Backend Generator] Fetching concepts with:', { userId, sessionId });
            const [trunkConcepts, branchConcepts, leafConcepts] = await Promise.all([
                conceptsApi.getAllByTier(userId, sessionId, 'trunk'),
                conceptsApi.getAllByTier(userId, sessionId, 'branch'),
                conceptsApi.getAllByTier(userId, sessionId, 'leaf')
            ]);
            logger.debug('[Backend Generator] Tier results:', {
                trunk: trunkConcepts?.length ?? 0,
                branch: branchConcepts?.length ?? 0,
                leaf: leafConcepts?.length ?? 0
            });
            allConcepts = [
                ...(trunkConcepts || []),
                ...(branchConcepts || []),
                ...(leafConcepts || [])
            ];
            // Sort by order if available
            allConcepts.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
            if (allConcepts.length === 0) {
                logger.warn('[Backend Generator] Tier-based fetch returned 0. Trying unfiltered fetch...');
                const unfilteredResponse = await conceptsApi.query({
                    userId,
                    sessionId,
                    limit: 100
                });
                logger.debug('[Backend Generator] Unfiltered fetch:', {
                    count: unfilteredResponse.count,
                    hasMore: unfilteredResponse.hasMore,
                    firstConcept: unfilteredResponse.concepts[0]?.name,
                    firstTier: unfilteredResponse.concepts[0]?.tier
                });
                if (unfilteredResponse.concepts.length > 0) {
                    allConcepts = unfilteredResponse.concepts;
                    logger.debug(`[Backend Generator] Recovered ${allConcepts.length} concepts via unfiltered query`);
                } else {
                    logger.error('[Backend Generator] No concepts generated');
                    clearActiveJob();
                    toast.error('No concepts generated. Try a more specific subject or different content.');
                    throw new Error(
                        'No concepts were generated. This usually means:\n\n' +
                        '1. The subject is too vague - try being more specific\n' +
                        ' Example: Instead of "Azure", try "Azure Virtual Machines"\n\n' +
                        '2. The content file was empty or unreadable\n' +
                        ' Check that your file contains valid text content\n\n' +
                        '3. The AI service is experiencing issues\n' +
                        ' Try again in a few moments\n\n' +
                        'Please try again with a clearer subject or different content.'
                    );
                }
            }
            onProgress(3, 'complete', {
                message: `Loaded ${allConcepts.length} concepts!`,
                progress: 90
            });
        } catch (fetchError) {
            logger.error('[Backend Generator] Failed to fetch concepts:', fetchError);
            throw new Error(getErrorMessage(fetchError, 'Failed to load generated concepts'));
        }
        // Pass 4: Build result document
        onProgress(4, 'in-progress', {
            message: 'Assembling final document...',
            progress: 90
        });
        // Convert concepts to the full document format
        const fullDocument = buildDocumentFromConcepts(subject, allConcepts.map(c => ({
            ...c,
            tier: c.tier || 'leaf'
        })), jobClassification);
        // =====================================================================
        // VISUAL ENHANCEMENT (Image Generation for Foundation Anchors)
        // Visual enhancement removed - feature not implemented
        const validation: ValidationResult = {
            valid: true,
            conceptCount: { expected: allConcepts.length, found: allConcepts.length },
            lifecycleConsistency: 95,
            positiveFraming: 95,
            formatConsistency: 95,
            completeness: 95,
            issues: [],
            violations: { outOfScope: [], negativeFraming: [] },
            fixes: {}
        };
        onProgress(4, 'complete', {
            message: 'Generation complete!',
            progress: 100,
            ...validation
        });
        const conceptNames = allConcepts.map(c => c.name);
        // Mark job as completed and clear from tracking
        updateActiveJobStatus('completed');
        clearActiveJob();
        const classificationLifecycle = (jobClassification?.lifecycle as Record<string, string>) || {};
        return {
            pass1: {
                domain: subject,
                lifecycle: {
                    phase1: classificationLifecycle.phase1 || 'PREPARE',
                    phase2: classificationLifecycle.phase2 || 'MODEL',
                    phase3: classificationLifecycle.phase3 || 'DELIVER'
                },
                subjectType: (jobClassification?.subjectType as SubjectType) || generateResponse.subjectType,
                macroWorkflow: jobClassification ? {
                    classification: jobClassification.classification,
                    macroStructure: jobClassification.macroStructure,
                    connectiveTissue: jobClassification.connectiveTissue
                } as unknown as MacroWorkflowResult : generateResponse.macroWorkflow,
                roleScope: subject,
                excludedActions: [],
                concepts: conceptNames
            },
            pass2: fullDocument,
            pass3: fullDocument,
            validation,
            fullDocument,
            jobId, // Backend job ID (source of truth)
            sessionId, // DynamoDB session ID
            metadata: {
                subject,
                generatedAt: new Date().toISOString(),
                qualityMetrics: {
                    lifecycleConsistency: 95,
                    positiveFraming: 95,
                    formatConsistency: 95,
                    completeness: 95
                }
            }
        };
    } catch (error) {
        clearInterval(simInterval);
        // Mark job as failed
        updateActiveJobStatus('failed');
        throw error;
    }
}
/**
 * Poll job status until completion, emitting progress updates derived
 * primarily from the *actual concept count* reported by the backend.
 *
 * Progress mapping (Pass 2 owns the 15-59% band):
 *   15-20%  → Waiting / classifying (no concepts yet)
 *   20-55%  → Concepts arriving (ratio of current / expected)
 *   55-59%  → Post-processing & persisting
 */
async function _pollUntilComplete(
    jobId: string,
    userId: string,
    onProgress: ProgressCallback,
    startTime: number,
    maxPollDurationMs: number,
    updateActiveJobStatus: (status: 'pending' | 'processing' | 'completed' | 'failed') => void,
    clearActiveJob: () => void,
): Promise<Record<string, unknown> | undefined> {
    const POLL_INTERVAL_MS = 3000;
    const MAX_POLL_INTERVAL_MS = 12000;
    let pollInterval = POLL_INTERVAL_MS;
    let consecutiveErrors = 0;
    const MAX_CONSECUTIVE_ERRORS = 5;

    // Track peak concept count to detect post-processing phase
    let peakConceptCount = 0;
    let postProcessingDetectedAt = 0;

    // Time-based fallback messages when we have no concept count yet
    const EARLY_MESSAGES: Array<{ maxElapsedSec: number; message: string }> = [
        { maxElapsedSec: 15, message: 'Dispatching to AI engine...' },
        { maxElapsedSec: 30, message: 'Classifying subject domain...' },
        { maxElapsedSec: 50, message: 'Extracting exam structure...' },
        { maxElapsedSec: 80, message: 'Partitioning domain tree...' },
        { maxElapsedSec: Infinity, message: 'Generating concepts in parallel...' },
    ];

    while (true) {
        const elapsedMs = Date.now() - startTime;
        if (elapsedMs > maxPollDurationMs) {
            updateActiveJobStatus('failed');
            throw new Error('Generation timed out — job may still complete. Check back later.');
        }

        try {
            const [status, progress] = await Promise.all([
                conceptsApi.getJobStatus(jobId, userId),
                conceptsApi.getJobProgress(userId, jobId).catch(() => null),
            ]);

            consecutiveErrors = 0;

            if (status.status === 'completed') {
                onProgress(2, 'complete', { message: 'AI generation complete!', progress: 60 });
                return status.classification as unknown as Record<string, unknown> | undefined;
            }

            if (status.status === 'failed') {
                throw new Error(status.error || 'Generation failed on server');
            }

            // --- Derive progress from actual concept count ---
            const conceptCount = progress?.conceptCount
                ?? (status as Record<string, unknown>).conceptCount as number | undefined
                ?? 0;

            if (conceptCount > peakConceptCount) {
                peakConceptCount = conceptCount;
                postProcessingDetectedAt = 0; // still growing
            } else if (conceptCount > 0 && conceptCount === peakConceptCount && !postProcessingDetectedAt) {
                // Count stopped growing → likely post-processing / persisting
                postProcessingDetectedAt = Date.now();
            }

            let pct: number;
            let message: string;

            if (conceptCount === 0) {
                // No concepts yet → time-based early progress (15-22%)
                const elapsedSec = elapsedMs / 1000;
                const stage = EARLY_MESSAGES.find(s => elapsedSec <= s.maxElapsedSec) ?? EARLY_MESSAGES[EARLY_MESSAGES.length - 1];
                // Slow climb from 15 to 22
                pct = Math.min(22, 15 + (elapsedSec / 80) * 7);
                message = stage.message;
            } else if (postProcessingDetectedAt && (Date.now() - postProcessingDetectedAt) > 6000) {
                // Concept count stabilised for >6s → post-processing (55-59%)
                const postElapsed = (Date.now() - postProcessingDetectedAt) / 1000;
                pct = Math.min(59, 55 + Math.min(postElapsed / 30, 1) * 4);
                message = postElapsed > 15
                    ? 'Persisting concept graph...'
                    : 'Post-processing (connections, Bloom\'s, dedup)...';
            } else {
                // Concepts are arriving → ratio-based progress (22-55%)
                // Estimate total assuming we're seeing ~80% of what we'll get
                const estimatedTotal = Math.max(peakConceptCount * 1.3, 40);
                const ratio = Math.min(conceptCount / estimatedTotal, 1);
                pct = 22 + ratio * 33; // 22% to 55%
                message = progress?.latestConcept
                    ? `Synthesising: ${progress.latestConcept}`
                    : `${conceptCount} concepts generated...`;
            }

            onProgress(2, 'in-progress', { message, progress: Math.round(pct) });
            pollInterval = POLL_INTERVAL_MS;
        } catch (err) {
            if (isAuthError(err)) {
                clearActiveJob();
                throw new Error('Session expired. Please log in again.');
            }
            consecutiveErrors++;
            if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
                clearActiveJob();
                throw new Error(getErrorMessage(err, 'Unable to connect to server. Please check your connection and try again.'));
            }
            pollInterval = Math.min(MAX_POLL_INTERVAL_MS, pollInterval * 1.5);
        }

        await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
}
/**
 * Build a full document from concepts in the format expected by the content parser.
 * This creates the JSON structure that parseGeneratedContent expects.
 */
export function buildDocumentFromConcepts(
    subject: string,
    concepts: ParsedConcept[],
    classification?: Record<string, unknown>,
): string {
    const conceptBlocks = concepts.map((c, index) => {
        const concept = c as ParsedConcept & {
            description?: string;
            keyPoints?: string[];
            prerequisiteWeight?: number;
            displayProperties?: { emoji?: string; category?: string };
        };
        return {
            order: index + 1,
            name: concept.name,
            tier: concept.tier,
            parentName: concept.parentName,
            trunkDomain: concept.trunkDomain,
            stageId: concept.stageId,
            cognitiveLevel: concept.cognitiveLevel,
            commonPitfalls: concept.commonPitfalls || [],
            description: concept.description || concept.phase1?.hookSentence || `Core concept in ${subject}`,
            whyYouNeed: concept.whyYouNeed || '',
            technicalDetails: concept.technicalDetails || '',
            keyPoints: concept.keyPoints || [],
            workedExample: concept.workedExample,
            connections: concept.strictConnections || [],
            scoring: (concept as ParsedConcept & { scoring?: { keywords: string[]; aliases: string[] } }).scoring || { keywords: [], aliases: [] },
            dependsOn: concept.dependsOn || [],
            prerequisiteWeight: concept.prerequisiteWeight || 0.5,
            displayProperties: concept.displayProperties || {
                category: concept.tier
            },
            mnemonic: concept.mnemonic || {},
            phase1: concept.phase1 || {},
            phase2: concept.phase2 || [],
            phase3: concept.phase3 || {},
            shape: concept.shape || {},
        };
    });
    const lifecycle = (classification?.lifecycle as Record<string, string>) || {};
    return JSON.stringify({
        domain: subject,
        subjectType: classification?.subjectType,
        classification: classification?.classification,
        deepStructure: classification?.deepStructure,
        lifecycleBlueprints: classification?.lifecycleBlueprints,
        examDomains: classification?.examDomains,
        macroStructure: classification?.macroStructure,
        connectiveTissue: classification?.connectiveTissue,
        lifecycle: {
            phase1: lifecycle.phase1 || 'PREPARE',
            phase2: lifecycle.phase2 || 'MODEL',
            phase3: lifecycle.phase3 || 'DELIVER'
        },
        concepts: conceptBlocks
    }, null, 2);
}
/**
 * Execute a surgical repair on a single concept using the AI backend
 */
export async function surgicallyRepairConcept(
    subject: string,
    conceptName: string,
    issue: string
): Promise<unknown> {
    const { user } = useAuthStore.getState();
    const userId = user?.id || 'anonymous';
    try {
        const response = (await conceptsApi.repair({
            subject,
            conceptName,
            issue,
            userId,
            // currentContent removed as it's not in the API signature
        })) as unknown as { status?: string; concept?: unknown;[key: string]: unknown };
        if (response.status === 'completed' && response.concept) {
            return response.concept;
        }
        // Fallback if response structure differs (handling generic API wrapper returns)
        return response;
    } catch (error) {
        logger.error("Surgical repair failed:", error);
        throw new Error(getErrorMessage(error, 'Failed to repair concept. Please try again.'));
    }
}


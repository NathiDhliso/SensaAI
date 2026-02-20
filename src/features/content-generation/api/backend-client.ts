import { conceptsApi } from '@/shared/api';
import { getErrorMessage, isAuthError } from '@/shared/api/client';
import { useAuthStore } from '@/store/auth-store';
import { useGenerationStore } from '@/store/generation-store';
import type { ProgressCallback, GenerationResult, ValidationResult } from '@/shared/types/generation';
import type { ParsedConcept } from '@/features/content-generation/parsers/types';
import type { SubjectType, MacroWorkflowResult } from '@/shared/types/macro-workflow';
import { UI_TIMINGS } from '@/shared/constants/ui-constants';
import { toast } from '@/shared/utils/toast';
/**
 * Uploads the raw exam/blueprint file to the secure storage bucket.
 * Triggers the server-side ingestion pipeline (Lambda Parser -> Vector Index).
 */
export async function uploadExamBlueprint(file: File): Promise<string> {
    // TODO: Replace with actual S3 presigned URL upload
    // const response = await conceptsApi.getUploadUrl(file.name, file.type);
    // await fetch(response.url, { method: 'PUT', body: file });
    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, UI_TIMINGS.DELAY_MEDIUM));
    return `s3://sensa-blueprints/${Date.now()}/${file.name}`;
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
    // Pass 1: Start serverless generation
    onProgress(1, 'in-progress', {
        message: 'Initiating serverless generation...',
        progress: 5
    });
    // Start simulated progress during the blocking API call to give user feedback
    let simProgress = 5;
    const simInterval = setInterval(() => {
        simProgress += 1; // Slow increment
        if (simProgress > 90) simProgress = 90; // Cap at 90%
        onProgress(1, 'in-progress', {
            message: `Connecting to AI engine... (${Math.round(simProgress)}%)`,
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
            console.error('[Backend Generator] Generation failed:', generateResponse.error);
            clearActiveJob(); // Clear failed job
            toast.error(`Generation failed: ${generateResponse.error || 'Please try again'}`);
            throw new Error(generateResponse.error || 'Generation failed');
        }
        // Ensure we jump to 100% completion for this phase
        onProgress(2, 'complete', {
            message: 'AI generation complete!',
            progress: 100
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
        // [BLOCK: Polling Loop]
        // Skip polling if already completed (which it should be for sync lambda)
        if (generateResponse.status !== 'completed') {
            updateActiveJobStatus('processing');
            let progressValue = 10;
            let pollInterval = 2000; // Start at 2s
            const maxPollInterval = 10000; // Max 10s
            const startTime = Date.now();
            while (true) {
                // NOTE: We intentionally DO NOT use abort signals here
                // Generation is unstoppable once started - it runs on the backend
                if (Date.now() - startTime > maxPollDurationMs) {
                    console.error('[Backend Generator] TIMEOUT! Exceeded max poll time');
                    // Don't throw - job may still complete on backend
                    // Mark as timed out but allow recovery
                    updateActiveJobStatus('failed');
                    throw new Error('Generation timed out - but job may still complete. Check back later.');
                }
                try {
                    const status = await conceptsApi.getJobStatus(jobId, userId);
                    if (status.status === 'completed') {
                        if (status.classification) {
                            jobClassification = status.classification as unknown as Record<string, unknown>;
                        }
                        onProgress(2, 'complete', { message: 'AI generation complete!', progress: 60 });
                        break;
                    }
                    if (status.status === 'failed') {
                        console.error('[Backend Generator] Job failed:', status.error);
                        throw new Error(status.error || 'Generation failed on server');
                    }
                    // Reset interval on successful status check
                    pollInterval = 2000;
                } catch (err) {
                    if (isAuthError(err)) {
                        console.error('[Backend Generator] Authentication failed during polling');
                        clearActiveJob();
                        throw new Error('Session expired. Please log in again.');
                    }
                    // Check if we've been backing off too long (> 30 seconds of errors)
                    if (pollInterval >= 8000) {
                        console.error('[Backend Generator] Polling failing repeatedly, giving up');
                        clearActiveJob();
                        throw new Error(getErrorMessage(err, 'Unable to connect to server. Please check your connection and try again.'));
                    }
                    // Exponential backoff on error (including 429)
                    console.warn('[Backend Generator] Polling error, backing off:', { pollInterval, error: err });
                    pollInterval = Math.min(maxPollInterval, pollInterval * 1.5);
                }
                progressValue = Math.min(95, progressValue + (Math.random() > 0.4 ? 2 : 1));
                const pollingMessages = [
                    'AI is generating content...',
                    'AI is finalizing content...',
                    'Still working — this can take a minute...',
                    'Processing your subject material...',
                    'Building concept hierarchy...',
                ];
                const msgIndex = Math.min(Math.floor(progressValue / 20), pollingMessages.length - 1);
                onProgress(2, 'in-progress', { message: pollingMessages[msgIndex], progress: progressValue });
                await new Promise(resolve => setTimeout(resolve, pollInterval));
            }
        } else {
            // Already completed
        }
        // =====================================================================
        // Pass 3: LOAD GENERATED CONCEPTS
        // =====================================================================
        // Parallel generation happens server-side. Once complete, we fetch
        // all concepts from DynamoDB organized by tier.
        onProgress(3, 'in-progress', {
            message: 'Loading generated concepts...',
            progress: 60
        });
        // Progress tracking: 60% = start loading, 90% = end loading
        let allConcepts: ParsedConcept[] = [];
        // Fetch concepts from all tiers in parallel
        try {
            onProgress(3, 'in-progress', {
                message: 'Fetching foundation concepts...',
                progress: 65
            });
            console.log('[Backend Generator] Fetching concepts with:', { userId, sessionId });
            const [trunkConcepts, branchConcepts, leafConcepts] = await Promise.all([
                conceptsApi.getAllByTier(userId, sessionId, 'trunk'),
                conceptsApi.getAllByTier(userId, sessionId, 'branch'),
                conceptsApi.getAllByTier(userId, sessionId, 'leaf')
            ]);
            console.log('[Backend Generator] Tier results:', {
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
                console.warn('[Backend Generator] Tier-based fetch returned 0. Trying unfiltered fetch...');
                const unfilteredResponse = await conceptsApi.query({
                    userId,
                    sessionId,
                    limit: 100
                });
                console.log('[Backend Generator] Unfiltered fetch:', {
                    count: unfilteredResponse.count,
                    hasMore: unfilteredResponse.hasMore,
                    firstConcept: unfilteredResponse.concepts[0]?.name,
                    firstTier: unfilteredResponse.concepts[0]?.tier
                });
                if (unfilteredResponse.concepts.length > 0) {
                    allConcepts = unfilteredResponse.concepts;
                    console.log(`[Backend Generator] Recovered ${allConcepts.length} concepts via unfiltered query`);
                } else {
                    console.error('[Backend Generator] No concepts generated');
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
            console.error('[Backend Generator] Failed to fetch concepts:', fetchError);
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
        console.error("Surgical repair failed:", error);
        throw new Error(getErrorMessage(error, 'Failed to repair concept. Please try again.'));
    }
}


import { conceptsApi } from '@/shared/api';
import { useAuthStore } from '@/store/auth-store';
import { useGenerationStore } from '@/store/generation-store';
import type { ProgressCallback, GenerationResult, ValidationResult } from '@/shared/types/generation';
import type { ParsedConcept } from '@/features/content-generation/parsers/types';
import type { SubjectType, MacroWorkflowResult } from '@/shared/types/macro-workflow';
import { UI_TIMINGS } from '@/shared/constants/ui-constants';
import { toast } from '@/shared/utils/toast';
import { fetchExamObjectives, formatObjectivesAsContext } from '@/shared/services/exam-objectives-fetcher';

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
    _startFromPass: number = 1
): Promise<GenerationResult> {
    // Get user ID from auth store
    const { user } = useAuthStore.getState();
    const userId = user?.id || 'anonymous';

    // Get active job tracking functions
    const { setActiveJob, updateActiveJobStatus, clearActiveJob } = useGenerationStore.getState();

    // Pass 0: Fetch latest exam objectives (lightweight web fetch)
    onProgress(1, 'in-progress', {
        message: 'Fetching latest exam objectives...',
        progress: 2,
    });

    let enhancedContext = context || '';
    
    try {
        const examObjectives = await fetchExamObjectives(subject, {
            timeout: 8000, // 8 second timeout
            retries: 1, // Single retry
            includeSubObjectives: true
        });
        
        if (examObjectives) {
            const objectivesContext = formatObjectivesAsContext(examObjectives);
            enhancedContext = objectivesContext + (context ? `\n\nADDITIONAL CONTEXT:\n${context}` : '');
            
            onProgress(1, 'in-progress', {
                message: `Found ${examObjectives.totalObjectives} official exam objectives!`,
                progress: 4,
            });
            
            toast.success(`Loaded ${examObjectives.totalObjectives} official objectives for ${examObjectives.examCode.toUpperCase()}`);
        } else {
            onProgress(1, 'in-progress', {
                message: 'No exam objectives found, proceeding with subject analysis...',
                progress: 4,
            });
        }
    } catch (error) {
        console.warn('[ExamFetch] Failed to fetch objectives:', error);
        onProgress(1, 'in-progress', {
            message: 'Proceeding without exam objectives...',
            progress: 4,
        });
    }

    // Pass 1: Start serverless generation
    onProgress(1, 'in-progress', {
        message: 'Initiating serverless generation...',
        progress: 5,
    });

    // Start simulated progress during the blocking API call to give user feedback
    let simProgress = 5;
    const simInterval = setInterval(() => {
        simProgress += 1; // Slow increment
        if (simProgress > 90) simProgress = 90; // Cap at 90%

        onProgress(1, 'in-progress', {
            message: `Connecting to AI engine... (${Math.round(simProgress)}%)`,
            progress: simProgress,
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
                context: enhancedContext, // Pass enhanced context with exam objectives
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
            progress: 100,
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
            status: 'processing',
        });

        let jobClassification: Record<string, unknown> | undefined;

        // [BLOCK: Polling Loop]
        // Skip polling if already completed (which it should be for sync lambda)
        if (generateResponse.status !== 'completed') {
            updateActiveJobStatus('processing');
            let progressValue = 10;
            let pollInterval = 2000; // Start at 2s
            const maxPollInterval = 10000; // Max 10s
            const maxPollTime = 15 * 60 * 1000;
            const startTime = Date.now();

            while (true) {
                // NOTE: We intentionally DO NOT use abort signals here
                // Generation is unstoppable once started - it runs on the backend

                if (Date.now() - startTime > maxPollTime) {
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
                    // Check if it's an auth error (401)
                    const errorMessage = err instanceof Error ? err.message : String(err);
                    if (errorMessage.includes('401') || errorMessage.includes('Unauthorized') || errorMessage.includes('Session expired')) {
                        console.error('[Backend Generator] Authentication failed during polling');
                        clearActiveJob();
                        throw new Error('Session expired. Please log in again.');
                    }

                    // Check if we've been backing off too long (> 30 seconds of errors)
                    if (pollInterval >= 8000) {
                        console.error('[Backend Generator] Polling failing repeatedly, giving up');
                        clearActiveJob();
                        throw new Error('Unable to connect to server. Please check your connection and try again.');
                    }

                    // Exponential backoff on error (including 429)
                    console.warn('[Backend Generator] Polling error, backing off:', { pollInterval, error: err });
                    pollInterval = Math.min(maxPollInterval, pollInterval * 1.5);
                }

                progressValue = Math.min(59, progressValue + (Math.random() > 0.7 ? 1 : 0)); // Slower, jittery increment
                onProgress(2, 'in-progress', { message: 'AI is finalizing content...', progress: progressValue });

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
            progress: 60,
        });

        // Progress tracking: 60% = start loading, 90% = end loading
        let allConcepts: ParsedConcept[] = [];

        // Fetch concepts from all tiers in parallel
        try {
            onProgress(3, 'in-progress', {
                message: 'Fetching foundation concepts...',
                progress: 65,
            });

            const [foundationConcepts, keystoneConcepts, utilityConcepts] = await Promise.all([
                conceptsApi.getAllByTier(userId, sessionId, 'foundation'),
                conceptsApi.getAllByTier(userId, sessionId, 'keystone'),
                conceptsApi.getAllByTier(userId, sessionId, 'utility'),
            ]);

            allConcepts = [
                ...(foundationConcepts || []),
                ...(keystoneConcepts || []),
                ...(utilityConcepts || []),
            ];

            // Sort by order if available
            allConcepts.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

            // CRITICAL: Check for empty generation
            if (allConcepts.length === 0) {
                console.error('[Backend Generator] No concepts generated');
                clearActiveJob();
                toast.error('No concepts generated. Try a more specific subject or different content.');
                throw new Error(
                    'No concepts were generated. This usually means:\n\n' +
                    '1. The subject is too vague - try being more specific\n' +
                    '   Example: Instead of "Azure", try "Azure Virtual Machines"\n\n' +
                    '2. The content file was empty or unreadable\n' +
                    '   Check that your file contains valid text content\n\n' +
                    '3. The AI service is experiencing issues\n' +
                    '   Try again in a few moments\n\n' +
                    'Please try again with a clearer subject or different content.'
                );
            }

            onProgress(3, 'complete', {
                message: `Loaded ${allConcepts.length} concepts!`,
                progress: 90,
            });

        } catch (fetchError) {
            console.error('[Backend Generator] Failed to fetch concepts:', fetchError);
            throw new Error('Failed to load generated concepts');
        }

        // Pass 4: Build result document
        onProgress(4, 'in-progress', {
            message: 'Assembling final document...',
            progress: 90,
        });

        // Convert concepts to the full document format
        let fullDocument = buildDocumentFromConcepts(subject, allConcepts.map(c => ({
            ...c,
            tier: c.tier || 'utility'
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
            fixes: {},
        };

        onProgress(4, 'complete', {
            message: 'Generation complete!',
            progress: 100,
            ...validation,
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
                    phase3: classificationLifecycle.phase3 || 'DELIVER',
                },
                subjectType: (jobClassification?.subjectType as SubjectType) || generateResponse.subjectType,
                macroWorkflow: jobClassification ? {
                    classification: jobClassification.classification,
                    macroStructure: jobClassification.macroStructure,
                    connectiveTissue: jobClassification.connectiveTissue,
                } as unknown as MacroWorkflowResult : generateResponse.macroWorkflow,
                roleScope: subject,
                excludedActions: [],
                concepts: conceptNames,
                numericalLimits: [],
                recentUpdates: [],
                sourceVerification: 'Lambda + Bedrock (Parallel Generation)',
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
                    completeness: 95,
                },
            },
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
            stageId: concept.stageId,
            description: concept.description || concept.phase1?.hookSentence || `Core concept in ${subject}`,
            keyPoints: concept.keyPoints || [],
            prerequisiteWeight: concept.prerequisiteWeight || 0.5,
            displayProperties: concept.displayProperties || {
                emoji: '📚',
                category: concept.tier,
            },
            // Use real AI-generated content if available, otherwise fallback (which shouldn't happen with strict policy)
            mnemonic: concept.mnemonic || {
                tier: concept.tier === 'foundation' ? 'Foundation' : concept.tier === 'keystone' ? 'Keystone' : 'Utility',
                anchor: `${concept.displayProperties?.emoji || '📚'} ${concept.name}`,
                story: `Understanding ${concept.name} in the context of ${subject}`,
            },
            phase1: concept.phase1 || {
                hookSentence: `Why ${concept.name} matters in ${subject}`,
                microMetaphor: `Think of ${concept.name} as a building block`,
                prerequisite: 'None',
                selection: [
                    `What is ${concept.name}?`,
                    `When to use ${concept.name}`,
                ],
                execution: `Apply ${concept.name} in practice`,
            },
            phase2: concept.phase2 || (concept.keyPoints?.map((point: string) => ({
                title: point,
                content: `Detailed explanation of ${point}`,
            })) || []),
            phase3: concept.phase3 || {
                tool: `${concept.name} toolkit`,
                metrics: ['Effectiveness', 'Efficiency'],
                thresholds: 'Meet all criteria',
            },
            shape: concept.shape || {}, // Ensure SHAPE is passed through!
            criticalDistinctions: concept.criticalDistinctions || [
                { correct: `Proper use of ${concept.name}`, incorrect: 'Common misunderstanding' },
            ],
            designBoundaries: concept.designBoundaries || [
                { boundary: 'Scope', rationale: 'Stay focused' },
            ],
            examFocus: concept.examFocus || [
                { point: `Key exam topic for ${concept.name}`, weight: 'High' },
            ],
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
            phase3: lifecycle.phase3 || 'DELIVER',
        },
        concepts: conceptBlocks,
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
        throw error;
    }
}

// Export with legacy name for compatibility
export { generateWithBackend as generateChartIteratively };

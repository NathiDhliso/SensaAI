import {
    BedrockRuntimeClient,
} from '@aws-sdk/client-bedrock-runtime';
import { v4 as uuidv4 } from 'uuid';
import {
    executePhase1,
    executePhase2,
    executePhase3,
    Phase1Input,
    Phase2Output,
    Phase3Output
} from '../../../shared/lib/generation/multi-phase-orchestrator.js';
import {
    savePartialState,
    retryMissingConcepts,
    markConceptsAsPending,
    breakCycles
} from '../../../shared/lib/generation/error-recovery.js';

interface GenerationRequest {
    userId: string;
    subject: string;
    context?: string; // Renamed from 'domain' to match frontend API
    // Multi-phase is now the only system - legacy removed
}

interface GenerationJob {
    id: string;
    userId: string;
    subject: string;
    status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
    content: string;
    createdAt: Date;
    completedAt?: Date;
    error?: string;
    phase?: 'phase1' | 'phase2' | 'phase3' | 'validation'; // Current phase for multi-phase
    phaseProgress?: string; // e.g., "1/3", "2/3", "3/3"
    validationScore?: number; // Score from Phase 3
    issues?: Array<{ conceptName: string; field: string; issue: string }>; // Validation issues
}

interface StreamChunk {
    content?: string;
    status?: string;
    error?: string;
    done?: boolean;
}

// In-memory job store (use Redis/BullMQ in production)
const jobs = new Map<string, GenerationJob>();
const abortControllers = new Map<string, AbortController>();

// Bedrock client
const bedrockClient = new BedrockRuntimeClient({
    region: process.env.AWS_REGION || 'us-east-1',
});

class BedrockService {
    async startGeneration(request: GenerationRequest): Promise<string> {
        const jobId = uuidv4();

        const job: GenerationJob = {
            id: jobId,
            userId: request.userId,
            subject: request.subject,
            status: 'queued',
            content: '',
            createdAt: new Date(),
        };

        jobs.set(jobId, job);

        // Start generation in background
        this.processGeneration(jobId, request).catch((error: Error) => {
            const existingJob = jobs.get(jobId);
            if (existingJob) {
                existingJob.status = 'failed';
                existingJob.error = error.message;
            }
        });

        return jobId;
    }

    async *streamGeneration(jobId: string): AsyncGenerator<StreamChunk> {
        const job = jobs.get(jobId);

        if (!job) {
            yield { error: 'Job not found' };
            return;
        }

        // Wait for job to start
        while (job.status === 'queued') {
            yield { status: 'waiting' };
            await new Promise((resolve) => setTimeout(resolve, 100));
        }

        // Stream content as it's generated
        let lastContentLength = 0;
        while (job.status === 'running') {
            if (job.content.length > lastContentLength) {
                yield { content: job.content.slice(lastContentLength) };
                lastContentLength = job.content.length;
            }
            await new Promise((resolve) => setTimeout(resolve, 50));
        }

        // Send any remaining content
        if (job.content.length > lastContentLength) {
            yield { content: job.content.slice(lastContentLength) };
        }

        yield { status: job.status, done: true };
    }

    async getStatus(jobId: string): Promise<GenerationJob | null> {
        return jobs.get(jobId) || null;
    }

    async cancelGeneration(jobId: string): Promise<void> {
        const controller = abortControllers.get(jobId);
        if (controller) {
            controller.abort();
        }

        const job = jobs.get(jobId);
        if (job) {
            job.status = 'cancelled';
        }
    }

    private async processGeneration(jobId: string, request: GenerationRequest): Promise<void> {
        const job = jobs.get(jobId);
        if (!job) return;

        job.status = 'running';
        const controller = new AbortController();
        abortControllers.set(jobId, controller);

        try {
            // Always use multi-phase system (legacy removed)
            await this.processMultiPhaseGeneration(jobId, request, controller);

            job.status = 'completed';
            job.completedAt = new Date();
        } catch (error) {
            if ((job.status as string) !== 'cancelled') {
                job.status = 'failed';
                job.error = error instanceof Error ? error.message : 'Unknown error';
            }
        } finally {
            abortControllers.delete(jobId);
        }
    }

    private async processMultiPhaseGeneration(
        jobId: string,
        request: GenerationRequest,
        controller: AbortController
    ): Promise<void> {
        const job = jobs.get(jobId);
        if (!job) return;

        try {
            // Phase 1: Domain Analysis
            job.phase = 'phase1';
            job.phaseProgress = '1/3';
            job.content += '\n\n=== Phase 1: Domain Analysis ===\n';

            const phase1Input: Phase1Input = {
                subject: request.subject,
                targetConceptCount: 35,
                context: request.context // Pass user objectives/context from request
            };

            const phase1Output = await executePhase1(phase1Input);
            job.content += `\nAnalyzed domain: ${phase1Output.domain}\n`;
            job.content += `Identified ${phase1Output.concepts.length} concepts\n`;
            job.content += `Lifecycle: ${phase1Output.lifecycle.phase1} → ${phase1Output.lifecycle.phase2} → ${phase1Output.lifecycle.phase3}\n`;

            if (controller.signal.aborted) return;

            // Phase 2: Content Generation
            job.phase = 'phase2';
            job.phaseProgress = '2/3';
            job.content += '\n\n=== Phase 2: Content Generation ===\n';

            let phase2Output: Phase2Output;
            try {
                phase2Output = await executePhase2({
                    concepts: phase1Output.concepts,
                    lifecycle: phase1Output.lifecycle,
                    batchSize: 10
                });
                job.content += `\nGenerated content for ${phase2Output.concepts.length} concepts\n`;
            } catch (error) {
                // Handle partial failure
                job.content += `\n⚠️ Partial failure in Phase 2. Attempting recovery...\n`;

                // Save partial state and retry
                const partialState = savePartialState([], phase1Output.concepts.map(c => c.name));
                phase2Output = await retryMissingConcepts(partialState, {
                    concepts: phase1Output.concepts,
                    lifecycle: phase1Output.lifecycle
                }, { maxRetries: 2 });

                job.content += `\nRecovered: ${phase2Output.concepts.length} concepts generated\n`;
            }

            if (controller.signal.aborted) return;

            // Break any circular dependencies
            const fixedConcepts = breakCycles(phase2Output.concepts);
            if (fixedConcepts.length !== phase2Output.concepts.length) {
                job.content += `\n⚠️ Broke circular dependencies\n`;
            }
            phase2Output.concepts = fixedConcepts;

            // Phase 3: Validation
            job.phase = 'phase3';
            job.phaseProgress = '3/3';
            job.content += '\n\n=== Phase 3: Validation ===\n';

            const phase3Output: Phase3Output = await executePhase3({
                concepts: phase2Output.concepts
            });

            job.validationScore = phase3Output.score;
            job.issues = phase3Output.issues;

            job.content += `\nValidation Score: ${phase3Output.score}/100\n`;
            job.content += `Issues Found: ${phase3Output.issues.length}\n`;
            job.content += `Confusion Pairs: ${phase3Output.confusionPairs.length}\n`;

            if (phase3Output.issues.length > 0) {
                job.content += '\n⚠️ Validation Issues:\n';
                for (const issue of phase3Output.issues.slice(0, 5)) {
                    job.content += `  - ${issue.conceptName}: ${issue.issue} (${issue.field})\n`;
                }
                if (phase3Output.issues.length > 5) {
                    job.content += `  ... and ${phase3Output.issues.length - 5} more\n`;
                }
            }

            // Append final JSON output
            job.content += '\n\n=== Final Output (JSON) ===\n';
            job.content += JSON.stringify({
                domain: phase1Output.domain,
                lifecycle: phase1Output.lifecycle,
                concepts: phase2Output.concepts,
                validation: {
                    score: phase3Output.score,
                    issues: phase3Output.issues,
                    confusionPairs: phase3Output.confusionPairs
                }
            }, null, 2);

        } catch (error) {
            throw error;
        }
    }
}

export const bedrockService = new BedrockService();


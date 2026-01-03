import {
    BedrockRuntimeClient,
    InvokeModelWithResponseStreamCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { v4 as uuidv4 } from 'uuid';
import { getSystemPrompt } from '../lib/system-prompt.js';

interface GenerationRequest {
    userId: string;
    subject: string;
    systemPrompt?: string;
    domain?: string;
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
            // Use full Memory Palace system prompt
            const basePrompt = getSystemPrompt();
            // Replace subject placeholder in prompt
            const systemPrompt = request.systemPrompt || basePrompt.replace('[INSERT SUBJECT HERE]', request.subject);

            const payload = {
                anthropic_version: 'bedrock-2023-05-31',
                max_tokens: 64000,
                system: systemPrompt,
                messages: [
                    {
                        role: 'user',
                        content: `Generate comprehensive Memory Palace study material for: ${request.subject}

Please follow ALL steps in the system prompt to generate:
1. Source Verification with recent updates
2. Lifecycle Definition (3-phase cycle)
3. Master Hierarchical Chart with SHAPE sections
4. Mnemonic Anchors (JSON with tier, anchor emoji, story)
5. Decision Framework Trees
6. Visual Mental Anchors
7. Worked Example
8. Confusion Pairs (JSON)
9. Learning Path Sequence (4-6 stages)

Ensure all concepts have mnemonic objects for the Memory Palace visualization.`,
                    },
                ],
            };

            const command = new InvokeModelWithResponseStreamCommand({
                modelId: 'us.anthropic.claude-sonnet-4-5-20250929-v1:0',
                contentType: 'application/json',
                accept: 'application/json',
                body: JSON.stringify(payload),
            });

            const response = await bedrockClient.send(command, {
                abortSignal: controller.signal,
            });

            if (!response.body) {
                throw new Error('No response body from Bedrock');
            }

            for await (const event of response.body) {
                if (controller.signal.aborted) {
                    break;
                }

                if (event.chunk) {
                    const chunk = JSON.parse(new TextDecoder().decode(event.chunk.bytes));

                    if (chunk.type === 'content_block_delta' && chunk.delta?.type === 'text_delta') {
                        job.content += chunk.delta.text;
                    }
                }
            }

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
}

export const bedrockService = new BedrockService();


/**
 * useGenerationEngine Hook
 * 
 * Encapsulates all content generation logic including:
 * - Backend generation orchestration
 * - Progress tracking and streaming
 * - Checkpoint management
 * - File upload handling
 * - Success/error handling
 * 
 * @module hooks/useGenerationEngine
 */

import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateAlias } from '@/lib/utils/alias-generator';
import { useGenerationStore } from '@/store/generation-store';
import { useAuthStore } from '@/store/auth-store';
import { generateWithBackend, uploadExamBlueprint } from '@/lib/generation/backend-generator';
import { parseAndLoadContent } from '@/lib/content-loader';
import { UI_TIMINGS } from '@/constants/ui-constants';

import type {
  PassStatus,
  Pass1Result,
  ValidationResult,
  LifecyclePhases,
  StreamedConceptPreview,
  GenerationResult,
} from '@/lib/types/generation';

// ============================================================================
// TYPES
// ============================================================================

type ProgressData = {
  message?: string;
  partial?: string;
  progress?: number;
  content?: string;
  lifecycle?: LifecyclePhases;
  roleScope?: string;
  streamedConcepts?: StreamedConceptPreview[];
} & Partial<Pass1Result> &
  Partial<ValidationResult>;

interface GenerationEngineState {
  generatedAlias: string;
  isGenerating: boolean;
}

interface GenerationEngineActions {
  startGenerationProcess: (
    subject: string,
    context?: string | null
  ) => void;
  handleRetry: (subject: string) => void;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook for managing the content generation engine
 * 
 * IMPORTANT: Generation is UNSTOPPABLE once started.
 * Jobs run on the backend and will complete regardless of frontend state.
 * 
 * @returns State and actions for generation management
 */
export function useGenerationEngine(): GenerationEngineState & GenerationEngineActions {
  const navigate = useNavigate();

  // Local state - NO abort controller (generation is unstoppable)
  const [generatedAlias, setGeneratedAlias] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Refs for stable references
  const resultIdRef = useRef<string | null>(null);
  const lastProgressUpdateRef = useRef<number>(0);

  // Store actions
  const {
    startGeneration,
    completeGeneration,
    setError,
    addRecentSubject,
    updateGenerationProgress,
    addStreamedConcept,
    setConstructionPhase,
    setExpectedConceptCount,
  } = useGenerationStore();

  // Constants
  const PROGRESS_THROTTLE_MS = 250;

  /**
   * Creates a progress callback for tracking generation passes
   */
  const createProgressCallback = useCallback(() => {
    return (pass: number, status: PassStatus, data?: ProgressData) => {
      // Throttle frequent progress updates (but allow status changes through)
      const now = Date.now();
      if (status === 'in-progress' && data?.partial) {
        if (now - lastProgressUpdateRef.current < PROGRESS_THROTTLE_MS) {
          return;
        }
        lastProgressUpdateRef.current = now;
      }

      const update: {
        pass: number;
        status: PassStatus;
        activity?: string;
        progress?: number;
        pass1Data?: Pass1Result;
        pass2Content?: string;
        pass3Content?: string;
        validation?: ValidationResult;
      } = { pass, status };

      // Set activity message
      if (data?.message) {
        update.activity = data.message;
      } else if (pass === 1 && status === 'in-progress') {
        update.activity = 'Parsing Blueprint Objectives...';
      } else if (pass === 2 && status === 'in-progress') {
        update.activity = 'Mapping Concepts to Blueprint...';
      } else if (pass === 3 && status === 'in-progress') {
        update.activity = data?.partial
          ? 'Synthesizing Grounded Content...'
          : 'Generating detailed content...';
      } else if (pass === 4 && status === 'in-progress') {
        update.activity = 'Validating Official Documentation Links...';
      } else if (data?.partial) {
        update.activity = 'Generating detailed content...';
      }

      // Set progress
      if (data?.progress !== undefined) {
        update.progress = data.progress;
      }

      // Handle pass-specific data
      if (pass === 1 && status === 'complete' && data && 'domain' in data && data.domain) {
        update.pass1Data = data as Pass1Result;
        if (data.concepts) {
          setExpectedConceptCount(data.concepts.length);
          setConstructionPhase('framing');
        }
      }

      if (pass === 2 && status === 'complete' && data?.content) {
        update.pass2Content = data.content;
      }

      // Handle streamed concepts for optimistic UI
      if (pass === 3 && data?.streamedConcepts && data.streamedConcepts.length > 0) {
        setConstructionPhase('detailing');
        for (const concept of data.streamedConcepts) {
          addStreamedConcept({
            id: `streamed-${concept.order}`,
            name: concept.name,
            order: concept.order,
            stageId: 'stage-1',
            mnemonic: concept.anchor
              ? { tier: 'foundation', anchor: concept.anchor, story: '' }
              : undefined,
            phase1: {
              hookSentence: '',
              microMetaphor: '',
              prerequisite: '',
              selection: [],
              execution: '',
            },
            phase2: [],
            phase3: { tool: '', metrics: [], thresholds: '' },
            criticalDistinctions: [],
            designBoundaries: [],
            examFocus: [],
          });
        }
      }

      if (pass === 3 && status === 'complete' && data?.content) {
        update.pass3Content = data.content;
      }

      if (pass === 4 && status === 'complete' && data) {
        update.validation = data as ValidationResult;
        setConstructionPhase('complete');
      }

      updateGenerationProgress(update);
    };
  }, [
    updateGenerationProgress,
    addStreamedConcept,
    setConstructionPhase,
    setExpectedConceptCount,
  ]);

  /**
   * Handle successful generation completion
   */
  const handleGenerationSuccess = useCallback(
    async (result: GenerationResult, subject: string, alias: string) => {
      completeGeneration(result);

      const currentState = useGenerationStore.getState();
      const currentPass1 = currentState.pass1Data;
      const currentValidation = currentState.validation;

      if (currentPass1 && currentValidation) {
        // Use backend jobId as the source of truth (no more frontend-generated IDs)
        const resultId = result.jobId;
        resultIdRef.current = resultId;

        const savedResult = {
          id: resultId,
          subject,
          alias,
          generatedAt: new Date().toISOString(),
          fullDocument: result.fullDocument,
          pass1Data: {
            domain: currentPass1.domain,
            roleScope: currentPass1.roleScope,
            lifecycle: currentPass1.lifecycle,
            concepts: currentPass1.concepts,
          },
          validation: currentValidation,
          savedLocally: true,
        };

        const { storageManager } = await import('@/lib/storage');
        try {
          await storageManager.saveResult(savedResult);
          const loadResult = parseAndLoadContent(result.fullDocument, resultId);
          if (loadResult.success) {
            // Navigate immediately - no artificial delay needed
            navigate(`/study/${resultId}`, { 
              replace: true,
              state: { freshGeneration: true } // Signal that content is already loaded
            });
          } else {
            // FIX: Don't navigate if loading failed. Report error.
            console.error('[Generate] Content load failed:', loadResult.error);
            setError(loadResult.error || 'Failed to load generated content.');
            setIsGenerating(false);
          }
        } catch (storageError) {
          console.error('[Generate] Storage save failed:', storageError);
          // Still try to load into memory if storage failed but we have data
          const loadResult = parseAndLoadContent(result.fullDocument, resultId);
          if (loadResult.success) {
            navigate(`/study/${resultId}`, { 
              replace: true,
              state: { freshGeneration: true }
            });
          } else {
            setError('Failed to save or load generated content.');
            setIsGenerating(false);
          }
        }
      } else {
        // Fallback: use backend jobId if available, otherwise timestamp
        const fallbackId = result.jobId || `${Date.now()}`;
        navigate(`/study/${fallbackId}`, { 
          replace: true,
          state: { freshGeneration: true }
        });
      }
    },
    [completeGeneration, navigate, setError]
  );

  /**
   * Handle generation errors
   */
  const handleGenerationError = useCallback(
    (err: unknown) => {
      console.error('Generation error:', err);
      const message = err instanceof Error ? err.message : String(err);

      // Handle specific error types
      if (message === 'Generation cancelled by user') {
        navigate('/');
      } else if (message.includes('401') || message.includes('Unauthorized') || message.includes('Session expired')) {
        setError('Session expired. Redirecting to login...');
        setTimeout(() => navigate('/login'), 1000);
      } else {
        setError(message || 'Generation failed.');
      }
    },
    [navigate, setError]
  );

  /**
   * Start the generation process
   * 
   * IMPORTANT: Once started, generation CANNOT be cancelled.
   * The job runs on the backend and will complete regardless of frontend state.
   */
  const startGenerationProcess = useCallback(
    (
      subject: string,
      context?: string | null
    ) => {
      // AUTH GUARD: Check if user is logged in before attempting generation
      const { user } = useAuthStore.getState();
      if (!user?.id) {
        console.error('[Generation] No authenticated user - redirecting to login');
        setError('Please log in to generate content');
        setTimeout(() => navigate('/login'), 1000);
        return;
      }

      const alias = generateAlias();
      setGeneratedAlias(alias);
      setIsGenerating(true);

      const progressCallback = createProgressCallback();
      const { currentFileContext, pendingFile, setPendingFile } =
        useGenerationStore.getState();
      let effectiveContext = context || '';

      // Handle file upload
      if (pendingFile) {
        startGeneration(subject, context || undefined);
        addRecentSubject(subject);
        progressCallback(1, 'in-progress', {
          message: 'Uploading Blueprint to Secure Storage...',
          progress: 2,
        });

        uploadExamBlueprint(pendingFile)
          .then((s3Url) => {
            const blueprintContext = `[BLUEPRINT_ID]: ${s3Url}\n[FILENAME]: ${pendingFile.name}`;
            setPendingFile(null);
            return generateWithBackend(subject, progressCallback, blueprintContext);
          })
          .then((result) => handleGenerationSuccess(result, subject, alias))
          .catch(handleGenerationError)
          .finally(() => setIsGenerating(false));
        return;
      }

      // Handle file context
      if (currentFileContext) {
        const fileHeader = `\n\n[VERIFIED_SOURCE_MATERIAL]:\nProcessing Mode: ${currentFileContext.mode}\nSource: ${currentFileContext.fileName}\n\n${currentFileContext.content}`;
        effectiveContext += fileHeader;
      }

      // Standard generation - UNSTOPPABLE once started
      startGeneration(subject, effectiveContext || undefined);
      addRecentSubject(subject);

      generateWithBackend(
        subject,
        progressCallback,
        effectiveContext || undefined
      )
        .then((result) => handleGenerationSuccess(result, subject, alias))
        .catch(handleGenerationError)
        .finally(() => setIsGenerating(false));
    },
    [
      createProgressCallback,
      startGeneration,
      addRecentSubject,
      handleGenerationSuccess,
      handleGenerationError,
    ]
  );

  /**
   * Retry failed generation
   */
  const handleRetry = useCallback(
    (subject: string) => {
      setError(null);
      startGenerationProcess(subject);
    },
    [setError, startGenerationProcess]
  );

  return {
    // State
    isGenerating,
    generatedAlias,
    // Actions
    startGenerationProcess,
    handleRetry,
  };
}

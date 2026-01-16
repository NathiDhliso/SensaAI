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
  abortController: AbortController | null;
  generatedAlias: string;
  showResumeDialog: boolean;
  showConfirmCancel: boolean;
}

interface GenerationEngineActions {
  startGenerationProcess: (
    subject: string,
    context?: string | null,
    resumeData?: ReturnType<typeof useGenerationStore.getState>['getCheckpointResumeData'] extends () => infer R ? R : never
  ) => void;
  handleResumeFromCheckpoint: (subject: string) => void;
  handleStartFresh: () => void;
  handleRetry: (subject: string) => void;
  handleConfirmCancel: () => void;
  handleCancelClick: () => void;
  setShowResumeDialog: (show: boolean) => void;
  setShowConfirmCancel: (show: boolean) => void;
  checkForCheckpoint: (subject: string) => boolean;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook for managing the content generation engine
 * 
 * @returns State and actions for generation management
 */
export function useGenerationEngine(): GenerationEngineState & GenerationEngineActions {
  const navigate = useNavigate();

  // Local state
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [generatedAlias, setGeneratedAlias] = useState<string>('');
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);

  // Refs for stable references
  const abortControllerRef = useRef<AbortController | null>(null);
  const resultIdRef = useRef<string | null>(null);
  const lastProgressUpdateRef = useRef<number>(0);

  // Store actions
  const {
    startGeneration,
    completeGeneration,
    setError,
    addRecentSubject,
    clearCheckpoint,
    saveCheckpoint,
    updateGenerationProgress,
    addStreamedConcept,
    setConstructionPhase,
    setExpectedConceptCount,
    canResumeFromCheckpoint,
    getCheckpointResumeData,
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

      if (status === 'complete') {
        saveCheckpoint(pass);
      }
    };
  }, [
    updateGenerationProgress,
    saveCheckpoint,
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
      clearCheckpoint();

      const currentState = useGenerationStore.getState();
      const currentPass1 = currentState.pass1Data;
      const currentValidation = currentState.validation;

      if (currentPass1 && currentValidation) {
        const resultId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
            setTimeout(
              () => navigate(`/study/${resultId}`, { replace: true }),
              UI_TIMINGS.DELAY_SHORT
            );
          } else {
            navigate(`/study/${resultId}`, { replace: true });
          }
        } catch (storageError) {
          console.error('[Generate] Storage save failed:', storageError);
          navigate(`/study/${resultId}`, { replace: true });
        }
      } else {
        navigate(`/study/${Date.now()}`, { replace: true });
      }
    },
    [completeGeneration, clearCheckpoint, navigate]
  );

  /**
   * Handle generation errors
   */
  const handleGenerationError = useCallback(
    (err: unknown) => {
      console.error('Generation error:', err);
      const message = err instanceof Error ? err.message : String(err);
      if (message === 'Generation cancelled by user') {
        navigate('/');
      } else {
        setError(message || 'Generation failed.');
      }
    },
    [navigate, setError]
  );

  /**
   * Start the generation process
   */
  const startGenerationProcess = useCallback(
    (
      subject: string,
      context?: string | null,
      resumeData?: ReturnType<typeof getCheckpointResumeData>
    ) => {
      const alias = generateAlias();
      setGeneratedAlias(alias);

      const controller = new AbortController();
      setAbortController(controller);
      abortControllerRef.current = controller;

      const progressCallback = createProgressCallback();
      const { currentFileContext, pendingFile, setPendingFile } =
        useGenerationStore.getState();
      let effectiveContext = context || '';

      // Handle resume from checkpoint
      if (resumeData) {
        useGenerationStore.setState({
          ...resumeData.restoredState,
          currentSubject: subject,
          isGenerating: true,
          error: null,
        });

        generateWithBackend(
          subject,
          progressCallback,
          controller.signal,
          effectiveContext || undefined,
          resumeData.startFromPass
        )
          .then((result) => handleGenerationSuccess(result, subject, alias))
          .catch(handleGenerationError);
        return;
      }

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
            return generateWithBackend(subject, progressCallback, controller.signal, blueprintContext);
          })
          .then((result) => handleGenerationSuccess(result, subject, alias))
          .catch(handleGenerationError);
        return;
      }

      // Handle file context
      if (currentFileContext) {
        const fileHeader = `\n\n[VERIFIED_SOURCE_MATERIAL]:\nProcessing Mode: ${currentFileContext.mode}\nSource: ${currentFileContext.fileName}\n\n${currentFileContext.content}`;
        effectiveContext += fileHeader;
      }

      // Standard generation
      startGeneration(subject, effectiveContext || undefined);
      addRecentSubject(subject);

      generateWithBackend(
        subject,
        progressCallback,
        controller.signal,
        effectiveContext || undefined
      )
        .then((result) => handleGenerationSuccess(result, subject, alias))
        .catch(handleGenerationError);
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
   * Check if checkpoint exists for subject
   */
  const checkForCheckpoint = useCallback(
    (subject: string): boolean => {
      return canResumeFromCheckpoint(subject);
    },
    [canResumeFromCheckpoint]
  );

  /**
   * Resume from checkpoint
   */
  const handleResumeFromCheckpoint = useCallback(
    (subject: string) => {
      const resumeData = getCheckpointResumeData();
      if (!resumeData) return;
      setShowResumeDialog(false);
      startGenerationProcess(subject, null, resumeData);
    },
    [getCheckpointResumeData, startGenerationProcess]
  );

  /**
   * Start fresh, clearing checkpoint
   */
  const handleStartFresh = useCallback(() => {
    clearCheckpoint();
    setShowResumeDialog(false);
    window.location.reload();
  }, [clearCheckpoint]);

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

  /**
   * Confirm cancel and abort
   */
  const handleConfirmCancel = useCallback(() => {
    setShowConfirmCancel(false);
    abortController?.abort();
    navigate('/');
  }, [abortController, navigate]);

  /**
   * Show cancel confirmation
   */
  const handleCancelClick = useCallback(() => {
    setShowConfirmCancel(true);
  }, []);

  return {
    // State
    abortController,
    generatedAlias,
    showResumeDialog,
    showConfirmCancel,
    // Actions
    startGenerationProcess,
    handleResumeFromCheckpoint,
    handleStartFresh,
    handleRetry,
    handleConfirmCancel,
    handleCancelClick,
    setShowResumeDialog,
    setShowConfirmCancel,
    checkForCheckpoint,
  };
}

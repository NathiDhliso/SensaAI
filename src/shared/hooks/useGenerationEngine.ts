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
import { generateAlias } from '@/shared/utils/alias-generator';
import { getErrorMessage, isApiError, isAuthError } from '@/shared/api/client';
import { useGenerationStore } from '@/store/generation-store';
import { useAuthStore } from '@/store/auth-store';
import { isGenerationAllowed } from '@/shared/constants/generator-allowlist';
import { generateWithBackend, uploadExamBlueprint } from '@/features/content-generation/api/backend-client';
import { parseAndLoadContent } from '@/shared/utils/content-loader';
import type {
 PassStatus,
 Pass1Result,
 ValidationResult,
 LifecyclePhases,
 StreamedConceptPreview,
 GenerationResult,
 SubjectType
} from '@/shared/types/generation';
import type { MacroWorkflowResult } from '@/shared/types/macro-workflow';
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
 context?: string | null,
 trunks?: string[],
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
 const apiBase = import.meta.env.VITE_API_URL || '/api/v1';
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
 setSubjectType,
 setMacroWorkflow
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
 const pass1 = data as Pass1Result;
 if (pass1.subjectType) {
 setSubjectType(pass1.subjectType as SubjectType);
 }
 if (pass1.macroWorkflow) {
 setMacroWorkflow(pass1.macroWorkflow as MacroWorkflowResult);
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
 ? { tier: 'trunk', anchor: concept.anchor, story: '' }
 : undefined,
 phase1: {
 hookSentence: '',
 microMetaphor: '',
 prerequisite: '',
 selection: [],
 execution: ''
 },
 phase2: [],
 phase3: { tool: '', metrics: [], thresholds: '' }
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
 setSubjectType,
 setMacroWorkflow
 ]);
 /**
 * Handle successful generation completion
 */
 const handleGenerationSuccess = useCallback(
 async (result: GenerationResult) => {
 completeGeneration(result);
 const currentState = useGenerationStore.getState();
 const currentPass1 = currentState.pass1Data;
 const currentValidation = currentState.validation;
 if (currentPass1 && currentValidation) {
 // Use backend jobId as the source of truth (no more frontend-generated IDs)
 const resultId = result.jobId;
 resultIdRef.current = resultId;
 // STORAGE: Handled by Lambda backend automatically during generation.
 // const { storageManager } = await import('@/features/content-storage');
 // await storageManager.saveResult(savedResult); // Deprecated
 try {
 // STORAGE: Handled by Lambda backend automatically during generation.
 // await storageManager.saveResult(savedResult); // Deprecated
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
 const authState = useAuthStore.getState();
 const persistedAuth = localStorage.getItem('sensaai-auth');
 let tokenPayload: Record<string, unknown> | null = null;
 try {
 if (persistedAuth) {
 const parsed = JSON.parse(persistedAuth) as { state?: { tokens?: { access_token?: string } } };
 const accessToken = parsed?.state?.tokens?.access_token;
 if (accessToken) {
 const payloadB64 = accessToken.split('.')[1];
 if (payloadB64) {
 const padded = payloadB64 + '='.repeat((4 - (payloadB64.length % 4)) % 4);
 tokenPayload = JSON.parse(atob(padded)) as Record<string, unknown>;
 }
 }
 }
 } catch {
 tokenPayload = null;
 }
 const errorDetails = isApiError(err)
 ? {
 status: err.status,
 statusText: err.statusText,
 requestMethod: err.requestMethod,
 requestPath: err.requestPath,
 responseBody: err.body,
 }
 : null;
 console.error('[Generation] Failure diagnostics', {
 apiBase,
 requestHost: (() => {
 try {
 return new URL(apiBase).host;
 } catch {
 return null;
 }
 })(),
 environmentApiUrl: import.meta.env.VITE_API_URL || null,
 isAuthenticated: authState.isAuthenticated,
 userEmail: authState.user?.email || null,
 hasAccessToken: Boolean(authState.tokens?.access_token),
 hasRefreshToken: Boolean(authState.tokens?.refresh_token),
 accessTokenClaimKeys: tokenPayload ? Object.keys(tokenPayload).sort() : [],
 accessTokenEmailLike: (() => {
 const email = (tokenPayload?.email || tokenPayload?.username || tokenPayload?.['cognito:username']) as string | undefined;
 return email && email.includes('@') ? email : null;
 })(),
 allowlistFrontendPass: isGenerationAllowed(),
 error: errorDetails || err,
 });
 const message = getErrorMessage(err, 'Generation failed.');
 // Handle specific error types
 if (message === 'Generation cancelled by user') {
 navigate('/');
 } else if (isAuthError(err) || message.toLowerCase().includes('session expired')) {
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
 context?: string | null,
 trunks?: string[],
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
 progress: 2
 });
 uploadExamBlueprint(pendingFile)
 .then((s3Url) => {
 const blueprintContext = `[BLUEPRINT_ID]: ${s3Url}\n[FILENAME]: ${pendingFile.name}`;
 setPendingFile(null);
 return generateWithBackend(subject, progressCallback, blueprintContext, 1, trunks);
 })
 .then((result) => handleGenerationSuccess(result))
 .catch(handleGenerationError)
 .finally(() => setIsGenerating(false));
 return;
 }
 // Handle file context
 if (currentFileContext) {
 const fileHeader = `\n\n[VERIFIED_SOURCE_MATERIAL]: \nProcessing Mode: ${currentFileContext.mode}\nSource: ${currentFileContext.fileName}\n\n${currentFileContext.content}`;
 effectiveContext += fileHeader;
 }
 // Standard generation - UNSTOPPABLE once started
 startGeneration(subject, effectiveContext || undefined);
 addRecentSubject(subject);
 generateWithBackend(
 subject,
 progressCallback,
 effectiveContext || undefined,
 1,
 trunks,
 )
 .then((result) => handleGenerationSuccess(result))
 .catch(handleGenerationError)
 .finally(() => setIsGenerating(false));
 },
 [
 createProgressCallback,
 startGeneration,
 addRecentSubject,
 navigate,
 setError,
 handleGenerationSuccess,
 handleGenerationError
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
 handleRetry
 };
}

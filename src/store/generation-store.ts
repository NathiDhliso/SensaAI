import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Pass1Result, PassStatus, ValidationResult, GenerationResult, SubjectType } from '@/shared/types/generation';
import type { MacroWorkflowResult } from '@/shared/types/macro-workflow';
import type { ParsedConcept } from '@/features/content-generation/parsers/types';
// Construction phases for optimistic UI
export type ConstructionPhase = 'idle' | 'foundation' | 'framing' | 'detailing' | 'complete';
// Track active server-side jobs so we can resume after tab close
type ActiveJob = {
 jobId: string;
 sessionId: string;
 userId: string;
 subject: string;
 context?: string | null;
 startedAt: number;
 status: 'pending' | 'processing' | 'completed' | 'failed';
};
export type GenerationState = {
 currentSubject: string | null;
 currentContext: string | null;
 currentFileContext: {
 content: string;
 fileName: string;
 mode: 'BLUEPRINT' | 'QUESTION' | 'GENERAL';
 } | null;
 passes: Record<number, PassStatus>;
 currentActivity: string;
 progress: number;
 pass1Data: Pass1Result | null;
 pass2Content: string | null;
 pass3Content: string | null;
 validation: ValidationResult | null;
 fullDocument: string | null;
 results: GenerationResult[];
 recentSubjects: string[];
 isGenerating: boolean;
 error: string | null;
 // Active job tracking for background processing
 activeJob: ActiveJob | null;
 // Progressive rendering state
 streamedConcepts: ParsedConcept[];
 constructionPhase: ConstructionPhase;
 expectedConceptCount: number;
 subjectType: SubjectType | null;
 macroWorkflow: MacroWorkflowResult | null;
 // Surgical Merge Protocol
 history: Pass1Result[];
 repairProgress: {
 total: number;
 completed: number;
 currentAction: string;
 } | null;
 pendingFile: File | null;
};
type GenerationProgressUpdate = {
 pass?: number;
 status?: PassStatus;
 activity?: string;
 progress?: number;
 pass1Data?: Pass1Result;
 pass2Content?: string;
 pass3Content?: string;
 validation?: ValidationResult;
};
type GenerationActions = {
 startGeneration: (subject: string, context?: string) => void;
 setFileContext: (content: string, fileName: string, mode: 'BLUEPRINT' | 'QUESTION' | 'GENERAL') => void;
 setPendingFile: (file: File | null) => void;
 updatePassStatus: (pass: number, status: PassStatus) => void;
 setCurrentActivity: (activity: string) => void;
 setProgress: (progress: number) => void;
 setPass1Data: (data: Pass1Result) => void;
 setPass2Content: (content: string) => void;
 setPass3Content: (content: string) => void;
 setValidation: (validation: ValidationResult) => void;
 updateGenerationProgress: (update: GenerationProgressUpdate) => void;
 completeGeneration: (result: GenerationResult) => void;
 setError: (error: string | null) => void;
 reset: () => void;
 addRecentSubject: (subject: string) => void;
 // Progressive rendering actions
 addStreamedConcept: (concept: ParsedConcept) => void;
 setConstructionPhase: (phase: ConstructionPhase) => void;
 setExpectedConceptCount: (count: number) => void;
 clearStreamedConcepts: () => void;
 setSubjectType: (type: SubjectType) => void;
 setMacroWorkflow: (workflow: MacroWorkflowResult) => void;
 // Surgical Merge Actions
 snapshotState: () => void;
 rollbackState: () => void;
 setRepairProgress: (progress: { total: number; completed: number; currentAction: string } | null) => void;
 // Active Job Tracking (for background processing)
 setActiveJob: (job: ActiveJob | null) => void;
 updateActiveJobStatus: (status: ActiveJob['status']) => void;
 hasActiveJob: () => boolean;
 getActiveJob: () => ActiveJob | null;
 clearActiveJob: () => void;
};
const initialState: GenerationState = {
 currentSubject: null,
 currentContext: null,
 passes: {
 1: 'queued',
 2: 'queued',
 3: 'queued',
 4: 'queued'
 },
 currentActivity: '',
 progress: 0,
 pass1Data: null,
 pass2Content: null,
 pass3Content: null,
 validation: null,
 fullDocument: null,
 results: [],
 recentSubjects: [],
 isGenerating: false,
 error: null,
 activeJob: null,
 streamedConcepts: [],
 constructionPhase: 'idle',
 expectedConceptCount: 0,
 subjectType: null,
 macroWorkflow: null,
 currentFileContext: null,
 history: [],
 repairProgress: null,
 pendingFile: null
};
export const useGenerationStore = create<GenerationState & GenerationActions>()(
 persist(
 (set, get) => ({
 ...initialState,
 setFileContext: (content, fileName, mode) =>
 set({ currentFileContext: { content, fileName, mode } }),
 pendingFile: null,
 setPendingFile: (file) => set({ pendingFile: file }),
 startGeneration: (subject, context) =>
 set({
 currentSubject: subject,
 currentContext: context || null,
 isGenerating: true,
 error: null,
 passes: {
 1: 'in-progress',
 2: 'queued',
 3: 'queued',
 4: 'queued'
 },
 currentActivity: 'Starting generation...',
 progress: 0,
 pass1Data: null,
 pass2Content: null,
 pass3Content: null,
 validation: null,
 fullDocument: null,
 streamedConcepts: [],
 constructionPhase: 'foundation',
 expectedConceptCount: 0
 }),
 updatePassStatus: (pass, status) =>
 set((state) => ({
 passes: { ...state.passes, [pass]: status }
 })),
 setCurrentActivity: (activity) => set({ currentActivity: activity }),
 setProgress: (progress) => set({ progress }),
 setPass1Data: (data) => set({ pass1Data: data }),
 setPass2Content: (content) => set({ pass2Content: content }),
 setPass3Content: (content) => set({ pass3Content: content }),
 setValidation: (validation) => set({ validation }),
 updateGenerationProgress: (update) =>
 set((state) => {
 const newState: Partial<GenerationState> = {};
 if (update.pass !== undefined && update.status !== undefined) {
 newState.passes = { ...state.passes, [update.pass]: update.status };
 }
 if (update.activity !== undefined) {
 newState.currentActivity = update.activity;
 }
 if (update.progress !== undefined) {
 newState.progress = update.progress;
 }
 if (update.pass1Data !== undefined) {
 newState.pass1Data = update.pass1Data;
 }
 if (update.pass2Content !== undefined) {
 newState.pass2Content = update.pass2Content;
 }
 if (update.pass3Content !== undefined) {
 newState.pass3Content = update.pass3Content;
 }
 if (update.validation !== undefined) {
 newState.validation = update.validation;
 }
 return newState;
 }),
 completeGeneration: (result) =>
 set((state) => ({
 fullDocument: result.fullDocument,
 pass1Data: result.pass1 || state.pass1Data, // Ensure pass1Data is set from result
 validation: result.validation || state.validation, // Ensure validation is set from result
 isGenerating: false,
 results: [result, ...state.results.slice(0, 9)]
 })),
 setError: (error) => set({ error, isGenerating: false }),
 reset: () =>
 set({
 ...initialState,
 recentSubjects: get().recentSubjects,
 results: get().results
 }),
 addRecentSubject: (subject) =>
 set((state) => {
 const filtered = state.recentSubjects.filter((s) => s !== subject);
 return {
 recentSubjects: [subject, ...filtered].slice(0, 6)
 };
 }),
 addStreamedConcept: (concept) =>
 set((state) => ({
 streamedConcepts: [...state.streamedConcepts, concept]
 })),
 setConstructionPhase: (phase) => set({ constructionPhase: phase }),
 setExpectedConceptCount: (count) => set({ expectedConceptCount: count }),
 clearStreamedConcepts: () => set({ streamedConcepts: [], constructionPhase: 'idle' }),
 setSubjectType: (type) => set({ subjectType: type }),
 setMacroWorkflow: (workflow) => set({ macroWorkflow: workflow }),
 snapshotState: () =>
 set((state) => {
 if (!state.pass1Data) return {};
 return {
 history: [...state.history, state.pass1Data]
 };
 }),
 rollbackState: () =>
 set((state) => {
 if (state.history.length === 0) return {};
 const previous = state.history[state.history.length - 1];
 return {
 pass1Data: previous,
 history: state.history.slice(0, -1)
 };
 }),
 setRepairProgress: (progress) => set({ repairProgress: progress }),
 // Active Job Tracking Actions
 setActiveJob: (job) => set({ activeJob: job }),
 updateActiveJobStatus: (status) =>
 set((state) => {
 if (!state.activeJob) return {};
 return {
 activeJob: { ...state.activeJob, status }
 };
 }),
 hasActiveJob: () => {
 const { activeJob } = get();
 if (!activeJob) return false;
 // Jobs older than 30 minutes are considered stale
 const maxAge = 30 * 60 * 1000;
 const age = Date.now() - activeJob.startedAt;
 return age < maxAge && (activeJob.status === 'pending' || activeJob.status === 'processing');
 },
 getActiveJob: () => get().activeJob,
 clearActiveJob: () => set({ activeJob: null })
 }),
 {
 name: 'chart-generator-storage',
 partialize: (state) => ({
 recentSubjects: state.recentSubjects,
 activeJob: state.activeJob
 }),
 storage: {
 getItem: (name) => {
 try {
 const value = localStorage.getItem(name);
 return value ? JSON.parse(value) : null;
 } catch {
 return null;
 }
 },
 setItem: (name, value) => {
 try {
 localStorage.setItem(name, JSON.stringify(value));
 } catch {
 try {
 localStorage.removeItem(name);
 localStorage.setItem(name, JSON.stringify(value));
 } catch { /* quota exceeded — skip persistence */ }
 }
 },
 removeItem: (name) => {
 try { localStorage.removeItem(name); } catch { /* ignore */ }
 }
 }
 }
 )
);

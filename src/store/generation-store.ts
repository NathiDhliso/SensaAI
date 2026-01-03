import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Pass1Result, PassStatus, ValidationResult, GenerationResult } from '@/lib/types/generation';
import type { BedrockConfig } from '@/lib/generation/claude-client';
import type { ParsedConcept } from '@/lib/content-adapter/types';

// Construction phases for optimistic UI
export type ConstructionPhase = 'idle' | 'foundation' | 'framing' | 'detailing' | 'complete';

type GenerationCheckpoint = {
  subject: string;
  pass1Data: Pass1Result | null;
  pass2Content: string | null;
  pass3Content: string | null;
  lastSuccessfulPass: number;
  timestamp: number;
};

type GenerationState = {
  bedrockConfig: BedrockConfig | null;
  currentSubject: string | null;
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
  checkpoint: GenerationCheckpoint | null;
  // Progressive rendering state for optimistic UI
  streamedConcepts: ParsedConcept[];
  constructionPhase: ConstructionPhase;
  expectedConceptCount: number;
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
  setBedrockConfig: (config: BedrockConfig) => void;
  clearBedrockConfig: () => void;
  startGeneration: (subject: string) => void;
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
  saveCheckpoint: (pass: number) => void;
  canResumeFromCheckpoint: (subject: string) => boolean;
  getCheckpointResumeData: () => { startFromPass: number; restoredState: Partial<GenerationState> } | null;
  clearCheckpoint: () => void;
  // Progressive rendering actions
  addStreamedConcept: (concept: ParsedConcept) => void;
  setConstructionPhase: (phase: ConstructionPhase) => void;
  setExpectedConceptCount: (count: number) => void;
  clearStreamedConcepts: () => void;
};

const getEnvBedrockConfig = (): BedrockConfig | null => {
  const region = import.meta.env.VITE_AWS_REGION || 'us-east-1';

  // Strategy 1: Direct Keys (Dev preference)
  // Check for direct keys first so dev mode works without login if keys are present
  const accessKeyId = import.meta.env.VITE_AWS_ACCESS_KEY_ID;
  const secretAccessKey = import.meta.env.VITE_AWS_SECRET_ACCESS_KEY;

  if (region && accessKeyId && secretAccessKey) {
    return { region, accessKeyId, secretAccessKey };
  }

  // Strategy 2: Cognito (Prod/Auth preference)
  const identityPoolId = import.meta.env.VITE_COGNITO_IDENTITY_POOL_ID;
  const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID;

  if (identityPoolId && userPoolId) {
    return { region, useCognito: true };
  }

  return null;
};

const initialState: GenerationState = {
  bedrockConfig: getEnvBedrockConfig(),
  currentSubject: null,
  passes: {
    1: 'queued',
    2: 'queued',
    3: 'queued',
    4: 'queued',
  },
  currentActivity: '',
  progress: 0,
  pass1Data: null,
  pass2Content: null,
  pass3Content: null,
  validation: null,
  fullDocument: null,
  results: [],
  recentSubjects: ['Azure Administrator', 'MCAT Biology', 'CPA Tax Accounting'],
  isGenerating: false,
  error: null,
  checkpoint: null,
  // Progressive rendering initial state
  streamedConcepts: [],
  constructionPhase: 'idle',
  expectedConceptCount: 0,
};

export const useGenerationStore = create<GenerationState & GenerationActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      setBedrockConfig: (config) => set({ bedrockConfig: config }),

      clearBedrockConfig: () => set({ bedrockConfig: null }),

      startGeneration: (subject) =>
        set({
          currentSubject: subject,
          isGenerating: true,
          error: null,
          passes: {
            1: 'in-progress',
            2: 'queued',
            3: 'queued',
            4: 'queued',
          },
          currentActivity: 'Starting generation...',
          progress: 0,
          pass1Data: null,
          pass2Content: null,
          pass3Content: null,
          validation: null,
          fullDocument: null,
          // Reset progressive rendering state
          streamedConcepts: [],
          constructionPhase: 'foundation',
          expectedConceptCount: 0,
        }),

      updatePassStatus: (pass, status) =>
        set((state) => ({
          passes: { ...state.passes, [pass]: status },
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
          isGenerating: false,
          results: [result, ...state.results.slice(0, 9)],
        })),

      setError: (error) => set({ error, isGenerating: false }),

      reset: () =>
        set({
          ...initialState,
          bedrockConfig: get().bedrockConfig,
          recentSubjects: get().recentSubjects,
          results: get().results,
        }),

      addRecentSubject: (subject) =>
        set((state) => {
          const filtered = state.recentSubjects.filter((s) => s !== subject);
          return {
            recentSubjects: [subject, ...filtered].slice(0, 6),
          };
        }),

      saveCheckpoint: (pass) => {
        const state = get();
        set({
          checkpoint: {
            subject: state.currentSubject!,
            pass1Data: state.pass1Data,
            pass2Content: state.pass2Content,
            pass3Content: state.pass3Content,
            lastSuccessfulPass: pass,
            timestamp: Date.now(),
          },
        });
      },

      canResumeFromCheckpoint: (subject) => {
        const { checkpoint } = get();
        if (!checkpoint) return false;
        if (checkpoint.subject !== subject) return false;

        const age = Date.now() - checkpoint.timestamp;
        return age < 3600000;
      },

      getCheckpointResumeData: () => {
        const { checkpoint } = get();
        if (!checkpoint) return null;

        return {
          startFromPass: checkpoint.lastSuccessfulPass + 1,
          restoredState: {
            pass1Data: checkpoint.pass1Data,
            pass2Content: checkpoint.pass2Content,
            pass3Content: checkpoint.pass3Content,
          },
        };
      },

      clearCheckpoint: () => set({ checkpoint: null }),

      // Progressive rendering actions
      addStreamedConcept: (concept) =>
        set((state) => ({
          streamedConcepts: [...state.streamedConcepts, concept],
        })),

      setConstructionPhase: (phase) => set({ constructionPhase: phase }),

      setExpectedConceptCount: (count) => set({ expectedConceptCount: count }),

      clearStreamedConcepts: () => set({ streamedConcepts: [], constructionPhase: 'idle' }),
    }),
    {
      name: 'chart-generator-storage',
      partialize: (state) => ({
        // Don't persist bedrockConfig - always use env vars or manual entry
        recentSubjects: state.recentSubjects,
        results: state.results,
        checkpoint: state.checkpoint,
      }),
    }
  )
);

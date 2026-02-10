# SensaAI — Systems & Interactions

> Last Updated: February 8, 2026

---

## Systems Overview

| # | System | Core Responsibility |
|---|--------|-------------------|
| 1 | **Authentication** | User identity, PKCE OAuth, route protection |
| 2 | **Generation** | AI content generation orchestration (subject concepts) |
| 3 | **Content Parsing & Transform** | Raw JSON typed stages, concepts, graphs |
| 4 | **Backend (Express + Lambda)** | API routing, auth middleware, Bedrock LLM calls, DynamoDB |
| 5 | **Storage** | Cloud (DynamoDB) + local (IndexedDB) + session (localStorage) + memory (Zustand) |
| 6 | **Learning Session Engine** | 7-slice Zustand store + phase state machine (SCOUTCOMPLETE) |
| 7 | **Adaptive Intelligence** | Concept selection, interleaving, spacing, prerequisite gates |
| 8 | **AI Coach** | 5 personas, voice lines, proactive struggle detection |
| 9 | **Personalization** | Mood, metaphors, stress-free mode, practice mode, coach settings |
| 10 | **Diagnostic** | Pre-learning knowledge assessment for root concepts |
| 11 | **Micro Learning Loop** | Teach blank sheet confusion drill quiz outcome |
| 12 | **Concept Map** | Interactive mapping + orbital visualization + scoring |
| 13 | **Flow & Momentum** | Flow state detection, equation tracking (I = min(h, G×Q_f×Q_M×Q_P)) |
| 14 | **Content Audit** | 2-track audit (content health + objective alignment) |
| 15 | **Theme & UI** | Dark/light theme, CSS variables, settings panel |
| 16 | **Background Job Recovery** | Resume interrupted generation jobs after tab close |

---

## System Interaction Map

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ SYSTEM INTERACTION MAP │
│ │
│ ┌──────────┐ subject ┌──────────────┐ concepts ┌──────────────────┐ │
│ │ AUTH │───────────│ GENERATION │────────────│ CONTENT PARSING │ │
│ │ SYSTEM │ (guard) │ SYSTEM │ (raw JSON) │ & TRANSFORM │ │
│ └────┬─────┘ └──────┬───────┘ └────────┬─────────┘ │
│ │ │ │ │
│ │ user identity │ job status │ stages + │
│ │ │ classification │ concepts │
│ │
│ ┌──────────┐ ┌──────────────┐ ┌──────────────────┐ │
│ │ STORAGE │───────────│ BACKEND │ │ LEARNING │ │
│ │ SYSTEM │ save/load │ (Lambda + │ │ SESSION ENGINE │ │
│ │ │────────────│ Express) │ │ │ │
│ └────┬─────┘ └──────────────┘ └────────┬─────────┘ │
│ │ │ │
│ │ hydrate session │ phase + │
│ │ │ concept │
│ │
│ ┌──────────┐ mood/persona ┌──────────────┐ struggle ┌──────────────┐ │
│ │ PERSONAL-│───────────────│ AI COACH │───────────│ ADAPTIVE │ │
│ │ IZATION │ │ SYSTEM │ │ INTELLIGENCE│ │
│ └──────────┘ └──────────────┘ └──────────────┘ │
│ │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Authentication System

**Responsibility**: User identity, session tokens, route protection.

| Key File | Role |
|----------|------|
| `src/store/auth-store.ts` | Zustand store — user profile, login/logout, PKCE OAuth, session validation |
| `src/components/auth/ProtectedRoute.tsx` | Route guard — redirects unauthenticated users to `/login` |
| `src/pages/Login.tsx`, `SignUp.tsx`, `ConfirmSignUp.tsx` | Auth UI pages |
| `src/pages/AuthCallback.tsx` | OAuth callback — exchanges code for session cookie |
| `backend/src/features/auth/routes/` | Express routes — Cognito token exchange, cookie setting |
| `backend/src/shared/middleware/auth.ts` | JWT verification middleware for all protected API routes |

**Talks to**:
- **Generation System** — `useGenerationEngine` checks `useAuthStore.getState().user?.id` before starting generation; redirects to login if missing
- **Storage System** — `StorageManager.loadResult()` reads `useAuthStore.getState().user?.id` to build DynamoDB query keys
- **Backend** — Every API call includes HttpOnly cookies; Express middleware verifies JWT on all `/api/v1/*` routes
- **All Protected Pages** — `ProtectedRoute` wraps Generate, Study, Launchpad, Library, DocumentView

---

## 2. Generation System

**Responsibility**: Orchestrate AI content generation from subject input to parsed concepts.

| Key File | Role |
|----------|------|
| `src/store/generation-store.ts` | Zustand store — generation state, pass progress, streamed concepts, active job tracking, classification data |
| `src/shared/hooks/useGenerationEngine.ts` | Hook — starts generation, tracks progress callbacks, handles success/error, navigates to Study on completion |
| `src/features/content-generation/api/backend-client.ts` | `generateWithBackend()` — polls job status, fetches concepts, builds document |
| `src/shared/api/concepts.ts` | API client — `generate()`, `getJobStatus()`, `getConcepts()` |
| `src/pages/Generate.tsx` | UI — subject input, file upload, CognitiveStream progress, subject type badge |
| `src/components/generation/CognitiveStream.tsx` | Animated generation progress display |
| `src/components/generation/AgentCore.tsx` | Orbital animation during generation |

**Talks to**:
- **Auth System** — Guards generation start with user ID check
- **Backend (Lambda)** — `POST /api/v1/concepts/generate` triggers Lambda; polls `GET /api/v1/concepts/jobs/:jobId`; fetches `GET /api/v1/concepts?sessionId=...`
- **Content Parsing System** — On completion, calls `parseAndLoadContent()` which invokes the parser + transformer pipeline
- **Learning Session Engine** — After parsing, navigates to `/study/:subjectId` where the learning store hydrates from parsed content
- **Storage System** — Lambda stores concepts in DynamoDB during generation; frontend `buildDocumentFromConcepts()` reconstructs the full document for local use

**Data flow**:
```
Generate.tsx useGenerationEngine.startGenerationProcess()
 generation-store.startGeneration()
 generateWithBackend(subject, progressCallback, context)
 conceptsApi.generate() POST /api/v1/concepts/generate
 Lambda: classify_subject() parallel generate × 5 parts DynamoDB
 Poll job status until complete
 conceptsApi.getConcepts() GET /api/v1/concepts
 buildDocumentFromConcepts() JSON document string
 parseAndLoadContent() json-parser transformer learning-store.loadSession()
 navigate('/study/:subjectId')
```

---

## 3. Content Parsing & Transform System

**Responsibility**: Parse raw LLM JSON output into typed learning structures (stages, concepts, graphs).

| Key File | Role |
|----------|------|
| `src/features/content-generation/parsers/json-parser.ts` | Parses raw JSON string `ParsedGeneratedContent` (concepts, domain analysis, mnemonics) |
| `src/features/content-generation/parsers/transformer.ts` | Transforms parsed content `SensaAILearningConcept[]` + `LearningStage[]` + `SubjectGraph` + metadata |
| `src/features/content-generation/parsers/ai-integration.ts` | Utility functions: `getRootConcepts()`, `getConfusionRiskConcepts()`, `getTierDistribution()` |
| `src/features/content-generation/parsers/types.ts` | `ParsedConcept`, `ParsedMnemonic`, `ParsedMentalAnchor` types |
| `src/features/content-generation/generators/dependency-parser.ts` | `buildSubjectGraph()` — builds the concept dependency graph from parsed connections |
| `src/features/content-generation/generators/tier-calculator.ts` | Frontend tier calculation fallback (backup if Lambda tiers missing) |
| `src/features/content-generation/validators/tier-progression.ts` | Validates tier distribution and progression quality |
| `src/features/content-generation/validators/content-quality.ts` | Validates overall content quality metrics |

**Talks to**:
- **Generation System** — Called by `parseAndLoadContent()` at the end of generation
- **Learning Session Engine** — Produces the `SensaAILearningConcept[]` that the learning store consumes
- **Tier System** — `calculateTier()` in transformer.ts is the frontend fallback; primary tiers come from Lambda's `_compute_tiers_from_graph()`
- **Diagnostic System** — `getRootConcepts()` feeds into `DiagnosticLaunchSystem` and `diagnostic-generator.ts`

---

## 4. Backend System (Express + Lambda)

**Responsibility**: API routing, auth middleware, AI generation, concept storage.

| Key File | Role |
|----------|------|
| `backend/src/core/server.ts` | Express app — mounts auth, concepts, content, proxy routes |
| `backend/src/features/concepts/routes/` | Proxies concept requests to Lambda |
| `backend/src/features/auth/routes/` | Cognito token exchange, session cookie management |
| `backend/src/shared/middleware/auth.ts` | JWT verification for protected routes |
| `backend/lambda/generate_concepts/handler.py` | Lambda entry — routes generate/repair actions |
| `backend/lambda/generate_concepts/services/bedrock_service.py` | `classify_subject()`, `generate_concepts()`, `_compute_tiers_from_graph()`, `_post_process_concepts()` |
| `backend/lambda/generate_concepts/services/dynamo_service.py` | Job tracking, concept batch writes, DynamoDB operations |
| `backend/lambda/query_concepts/handler.py` | Paginated concept queries, subject management, job polling |
| `backend/lambda/shared/system_prompt.py` | `SILVER_BULLET_PROMPT` — the master generation prompt |
| `backend/lambda/shared/utils.py` | CORS headers, API response helpers, DynamoDB key builders |

**Talks to**:
- **Auth System** — Express middleware validates JWT on every request
- **Generation System** — Lambda is invoked by Express proxy; returns job IDs, concepts, classification
- **Storage System** — Lambda writes directly to DynamoDB (concepts table + jobs table)
- **AWS Bedrock** — Lambda calls Claude 3 Sonnet for classification and concept generation
- **AWS Cognito** — Express auth routes exchange OAuth codes for tokens

---

## 5. Storage System

**Responsibility**: Persist and retrieve generated content across cloud and local storage.

| Key File | Role |
|----------|------|
| `src/features/content-storage/manager.ts` | `StorageManager` — orchestrates load from DynamoDB via API (save is deprecated, Lambda handles it) |
| `src/features/content-storage/cloud/s3-dynamodb.ts` | `CloudStorage` class (legacy, kept for potential future use) |
| `src/features/content-storage/local/indexed-db.ts` | IndexedDB storage for offline document access |
| `src/features/content-storage/local/browser-storage.ts` | localStorage utilities |
| `src/features/content-storage/sync/import.ts` | File import (JSON document import) |
| `src/features/content-storage/sync/sync-engine.ts` | Sync engine for cloud local reconciliation |
| `src/features/learning-session/progress/session-tracker.ts` | Throttled localStorage persistence for session progress (2s throttle, flush-on-unmount) |

**Talks to**:
- **Backend (Lambda)** — Lambda writes concepts to DynamoDB during generation; `StorageManager.loadResult()` fetches via API
- **Auth System** — Uses `useAuthStore.getState().user?.id` for DynamoDB query keys
- **Learning Session Engine** — `session-tracker.ts` persists/recovers session progress to/from localStorage
- **Study Page** — `Study.tsx` calls `StorageManager.loadResult()` to hydrate content on page load
- **Content Parsing System** — Loaded documents are passed through `parseAndLoadContent()` for transformation

**Storage layers**:
```
Cloud (DynamoDB) Lambda writes during generation
 StorageManager reads via API
Local (IndexedDB) Full documents cached for offline

Session (localStorage) Session progress, 24h TTL

Memory (Zustand) Active session state, page lifetime
```

---

## 6. Learning Session Engine

**Responsibility**: Orchestrate the multi-phase learning journey from content load to mastery.

| Key File | Role |
|----------|------|
| `src/store/learning-store.ts` | Composed Zustand store (7 slices) — the central nervous system of the learning experience |
| `src/store/slices/createSessionSlice.ts` | Session lifecycle: load concepts, clear session, start session |
| `src/store/slices/createStudySlice.ts` | Study session state machine: goal, primer, scouted, previewed, mapBuilt, mastered |
| `src/store/slices/createNavigationSlice.ts` | Concept navigation: next concept, complete concept, skip concept |
| `src/store/slices/createDiagnosticSlice.ts` | Diagnostic assessment state |
| `src/store/slices/createCognitiveSlice.ts` | Cognitive load tracking |
| `src/store/slices/createFocusSlice.ts` | Pomodoro-style focus session management |
| `src/store/slices/createUISlice.ts` | UI state: celebrations, modals, preferences |
| `src/shared/hooks/useLearningFlow.ts` | Phase state machine — determines current `LearningPhase` from store state |
| `src/shared/hooks/useSensaFlow.ts` | SENSA v2.0 flow — tracks Universal Learning Equation (I = min(h, G × Q_f × Q_M × Q_P)) |
| `src/pages/VelocityLearning.tsx` | Master orchestrator — renders the correct component for each phase |
| `src/pages/Study.tsx` | Entry point — hydrates content, manages tabs (Overview/Learn), mounts VelocityLearning |

**Phase Component mapping** (orchestrated by `VelocityLearning.tsx`):
```
useLearningFlow() returns phase
 │
 ├── IDLE (no session)
 ├── PRIME SessionStartModal (mood goal + duration)
 ├── LOCK_IN VelocityLockInGate (confirmation)
 ├── SCOUT SessionScoutPreview (tier overview)
 ├── PREVIEW SessionScoutPreview (nomenclature sprint)
 ├── BUILD ConceptMapBuilder (concept mapping)
 ├── DIAGNOSE DiagnosticLaunchSystem (pre-test)
 ├── LEARN MicroLearningLoopController (core loop)
 ├── MASTER MasteryChallenge (final challenge)
 └── COMPLETE MasteryDashboard (summary)
```

**Talks to**:
- **Content Parsing System** — Receives `SensaAILearningConcept[]` + stages via `loadSession()`
- **Storage System** — `session-tracker.ts` persists progress; `Study.tsx` hydrates from `StorageManager`
- **Adaptive Intelligence** — Concept selection, spacing, interleaving algorithms read from learning store
- **AI Coach System** — `useStruggleDetector` triggers coach messages during LEARN phase
- **Personalization System** — Mood selection in PRIME phase reads/writes personalization store
- **SENSA Flow System** — `useSensaFlow` tracks equation variables alongside phase progression

---

## 7. Adaptive Intelligence System

**Responsibility**: Algorithms that decide *what* to learn next and *how* to present it.

| Key File | Role |
|----------|------|
| `src/features/learning-session/algorithms/concept-selection.ts` | Selects next concept based on tier balance, prerequisite gates, ZPD (zone of proximal development) |
| `src/features/learning-session/algorithms/interleaving.ts` | Interleaves concepts across tiers (target: root 40%, trunk 35%, leaf 25%) with blocked/interleaved/random modes |
| `src/features/learning-session/algorithms/spacing-engine.ts` | Spaced repetition scheduling — determines review timing based on mastery scores |
| `src/features/learning-session/algorithms/prerequisite-utils.ts` | Prerequisite dependency resolution |
| `src/features/learning-session/phases/score-map.ts` | Scoring rubric for concept map building phase |
| `src/features/learning-session/phases/build-ai.ts` | AI-powered connection suggestions and gap detection for ConceptMapBuilder |
| `src/features/learning-session/phases/preview-ai.ts` | AI-powered preview analysis for SessionScoutPreview |
| `src/features/learning-session/phases/retain-ai.ts` | AI-powered coach feedback for BlankSheetTest |
| `src/features/learning-session/scoring/blank-sheet-scorer.ts` | Fuzzy scoring for blank sheet recall tests |
| `src/shared/services/blueprint-formula.ts` | Type-aware Q metrics, G baseline, feedback loop, mismatch detection |

**Talks to**:
- **Learning Session Engine** — Algorithms are called by the learning store's navigation slice to pick the next concept
- **Tier System** — Concept selection and interleaving use tier data for balanced progression
- **AI Coach System** — Score thresholds trigger coach interventions
- **SENSA Flow System** — Blueprint formula feeds G, Q_f, Q_M, Q_P values into the equation

---

## 8. AI Coach System

**Responsibility**: Persona-based coaching, voice lines, proactive struggle support.

| Key File | Role |
|----------|------|
| `src/features/ai-coach/index.ts` | Exports personas, mood options, mood-adjusted intros |
| `src/features/ai-coach/personas.ts` | 5 coach personas with phase-specific responses (buddy, mentor, drill-sergeant, zen, scientist) |
| `src/features/ai-coach/voice/useVoice.ts` | `useVoice` hook — browser SpeechSynthesis for voice preview |
| `src/features/ai-coach/voice/static-lines.ts` | Pre-written voice lines per persona per phase |
| `src/shared/hooks/useCoachMessage.ts` | Hook — displays contextual coach messages based on phase + trigger |
| `src/shared/hooks/useStruggleDetector.ts` | Detects learner struggle via idle timeout, error rate, backspace velocity |

**Talks to**:
- **Personalization System** — Reads `selectedPersona`, `coachVoiceEnabled`, `coachIntensity` from personalization store
- **Learning Session Engine** — `useStruggleDetector` is wired into `VelocityLearning.tsx`; triggers coach messages during LEARN phase when struggle confidence > 0.5
- **Adaptive Intelligence** — Low scores from blank sheet or quiz trigger coach feedback via `retain-ai.ts`

---

## 9. Personalization System

**Responsibility**: User preferences that shape the learning experience.

| Key File | Role |
|----------|------|
| `src/store/personalization-store.ts` | Zustand store (persisted) — role, familiar system, coach settings, metaphor settings, stress-free mode, practice mode, semester date |
| `src/features/personalization/components/MetaphorToggle.tsx` | Toggle for visual anchors and analogies |
| `src/components/settings/SettingsPanel.tsx` | Slide-out panel — all personalization toggles wired to store |
| `src/components/learning/session/SessionStartModal.tsx` | Mood selection auto-sets study goal + duration |

**Talks to**:
- **AI Coach System** — `selectedPersona`, `coachVoiceEnabled`, `coachIntensity` control which persona speaks and how
- **Learning Session Engine** — `lastSessionMood` influences goal routing in `useLearningFlow`; `stressFreeMode` reduces cognitive pressure
- **Content Parsing System** — `metaphorSettings.showVisualAnchors` and `showAnalogies` control whether mnemonic anchors are displayed
- **UI Components** — `practiceMode` (progressive/interleaved/blocked) feeds into interleaving algorithm

**Persistence**: `personalization-storage` in localStorage (version 3).

---

## 10. Diagnostic System

**Responsibility**: Pre-learning knowledge assessment to skip known concepts.

| Key File | Role |
|----------|------|
| `src/features/learning-session/activities/diagnostic-generator.ts` | Generates diagnostic questions for root concepts; creates pre-test assessments |
| `src/components/learning/onboarding/DiagnosticLaunchSystem.tsx` | UI — presents diagnostic questions, scores results, reports known/unknown concepts |
| `src/store/slices/createDiagnosticSlice.ts` | Diagnostic session state in learning store |
| `src/features/content-generation/parsers/ai-integration.ts` | `getRootConcepts()` — selects root-tier concepts eligible for diagnostics |

**Talks to**:
- **Learning Session Engine** — `useLearningFlow` routes to DIAGNOSE phase when `rootCount >= 5` and session is fresh; results feed back into `completeDiagnostic()` which marks known concepts
- **Content Parsing System** — `getRootConcepts()` filters concepts by `rootLevel === true`
- **Adaptive Intelligence** — Diagnostic results influence concept selection (known concepts can be skipped)

---

## 11. Micro Learning Loop

**Responsibility**: The core learning cycle for each individual concept.

| Key File | Role |
|----------|------|
| `src/components/learning/MicroLearningLoopController.tsx` | Orchestrator — cycles each concept through teach blank sheet confusion drill quiz outcome |
| `src/components/learning/activities/BlankSheetTest.tsx` | Recall from memory — fuzzy-scored against key points |
| `src/components/learning/activities/ConfusionDrill.tsx` | Distinguish concept from similar concepts using confusion pairs |
| `src/components/learning/activities/NomenclatureSprint.tsx` | Verb-object matching for terminology recall |
| `src/components/learning/activities/CreativeTransferActivity.tsx` | Type-aware scenario application |
| `src/components/learning/activities/PeerReviewActivity.tsx` | Misconception detection and correction |
| `src/components/learning/activities/MasteryChallenge.tsx` | Final mastery challenge (keyword + concept coverage scoring) |
| `src/features/learning-session/activities/confusion-generator.ts` | Generates confusion pairs for drill activities |

**Talks to**:
- **Learning Session Engine** — Reads active concept from store; calls `completeConcept()` on mastery; calls `setCurrentConcept()` to advance
- **Adaptive Intelligence** — `retain-ai.ts` generates coach feedback for blank sheet; `build-ai.ts` suggests connections
- **AI Coach System** — Struggle detection triggers coach messages mid-loop
- **Personalization System** — `subjectType` prop selects post-confusion activity (proceduraltransfer, cyclicsocial, etc.)

---

## 12. Concept Map System

**Responsibility**: Visual concept mapping for structure building and mastery verification.

| Key File | Role |
|----------|------|
| `src/components/learning/activities/ConceptMapBuilder.tsx` | Interactive concept map — drag-drop nodes, draw connections, bucket zones by tier |
| `src/components/learning/ui/SensaSynopticView.tsx` | Read-only orbital visualization — root (inner), trunk (middle), leaf (outer) rings |
| `src/components/learning/launchpad/TierDistributionChart.tsx` | Analytics bar chart showing tier distribution |
| `src/features/learning-session/phases/build-ai.ts` | `suggestConnections()`, `detectGaps()` — AI-powered map assistance |
| `src/features/learning-session/phases/score-map.ts` | Scoring rubric for map completeness, connection accuracy, tier coverage |

**Talks to**:
- **Learning Session Engine** — BUILD phase renders ConceptMapBuilder; map completion triggers `markSessionMapBuilt()`
- **Tier System** — Bucket zones, ring positions, and colors all derive from concept tier assignments
- **Adaptive Intelligence** — `score-map.ts` evaluates map quality; `build-ai.ts` suggests missing connections
- **Connection Type Taxonomy** — All connections use the 6 universal types (requires, enables, is-part-of, is-type-of, causes, constrains)

---

## 13. Flow & Momentum System

**Responsibility**: Track productive flow state, momentum checkpoints, session timing.

| Key File | Role |
|----------|------|
| `src/shared/hooks/useFlowState.ts` | Detects flow state from streak count + session duration; triggers checkpoints and health breaks |
| `src/shared/hooks/useSensaFlow.ts` | SENSA v2.0 state machine — tracks G, Q_f, Q_M, Q_P, computes I = min(h, G × Q_f × Q_M × Q_P) |
| `src/components/ui/EquationTracker.tsx` | Displays the Universal Learning Equation values in real-time |
| `src/components/ui/MomentumCheckpoint.tsx` | Celebration milestone when streak thresholds are hit |
| `src/components/ui/SessionTimeToast.tsx` | Session duration notifications |
| `src/components/ui/FlowProgressBar.tsx` | Visual progress bar for session completion |
| `src/components/dashboard/BlueprintFormulaDashboard.tsx` | Dashboard showing G baseline, type-aware Q labels, feedback alerts |

**Talks to**:
- **Learning Session Engine** — Reads study session state for duration, streak, completed concepts
- **Adaptive Intelligence** — `blueprint-formula.ts` computes type-aware metrics that feed into Q values
- **Personalization System** — Flow state suppresses interruptions; health breaks respect user preferences
- **AI Coach System** — Flow state detection prevents coach interruptions during productive streaks

---

## 14. Content Audit System

**Responsibility**: Evaluate content quality and alignment with exam objectives.

| Key File | Role |
|----------|------|
| `src/features/content-audit/audit-engine.ts` | 2-track audit: (1) Content Health = structural completeness, (2) Objective Alignment = fuzzy-match against exam objectives |
| `src/features/content-audit/syllabus-parser.ts` | `parseSyllabusText()` — strips percentages, numbering, answer choices, mark allocations from pasted objectives |
| `src/components/learning/launchpad/ContentLaunchpad.tsx` | Dashboard UI — shows audit results, per-concept verdicts, uncovered objectives |
| `src/components/learning/launchpad/ScoreCard.tsx` | Score display cards |

**Talks to**:
- **Content Parsing System** — Audits the `SensaAILearningConcept[]` for structural completeness (SHAPE, mnemonic, technical depth)
- **Tier System** — Audit checks tier distribution balance
- **Storage System** — Exam objectives stored in localStorage; loaded by ContentLaunchpad

---

## 15. Theme & UI System

**Responsibility**: Visual theming, global UI state, settings access.

| Key File | Role |
|----------|------|
| `src/store/theme-store.ts` | Zustand store — dark/light/system theme preference |
| `src/store/ui-store.ts` | Zustand store — settings panel open/close state |
| `src/components/settings/SettingsPanel.tsx` | Slide-out settings panel (always mounted in App.tsx) |
| `src/index.css` | Global CSS variables including tier colors (`--color-root/trunk/leaf`) |
| `src/shared/constants/theme-colors.ts` | `GRAPH_COLORS` constant (root/trunk/leaf colors for visualizations) |
| `src/styles/animations.css` | Global animation keyframes |

**Talks to**:
- **All Components** — CSS variables cascade to all modular CSS files
- **Personalization System** — Settings panel wires all toggles to personalization store
- **Concept Map System** — `GRAPH_COLORS` provides tier-specific colors for nodes and rings

---

## 16. Background Job Recovery System

**Responsibility**: Resume interrupted generation jobs after tab close or refresh.

| Key File | Role |
|----------|------|
| `src/shared/hooks/useBackgroundJobRecovery.ts` | Polls for active jobs on app mount; resumes if found |
| `src/components/ui/BackgroundJobToast.tsx` | Toast notification showing background job progress |
| `src/store/generation-store.ts` | `activeJob` field persisted to localStorage; `hasActiveJob()`, `getActiveJob()`, `clearActiveJob()` |

**Talks to**:
- **Generation System** — Reads `activeJob` from generation store; polls job status via API
- **Storage System** — Active job state persisted in localStorage for cross-tab recovery
- **Backend (Lambda)** — Polls `GET /api/v1/concepts/jobs/:jobId` to check if background job completed

---

## System Interaction Summary

| System | Reads From | Writes To |
|--------|-----------|-----------|
| **Auth** | Cognito (cookies) | auth-store, Express middleware |
| **Generation** | auth-store, generation-store | generation-store, Backend (Lambda), navigates to Study |
| **Content Parsing** | Raw JSON from generation | learning-store (via loadSession) |
| **Backend** | Cognito tokens, Bedrock LLM | DynamoDB, API responses |
| **Storage** | DynamoDB (via API), IndexedDB, localStorage | IndexedDB, localStorage |
| **Learning Session** | learning-store (7 slices), content from parsing | learning-store, localStorage (progress) |
| **Adaptive Intelligence** | learning-store (concepts, progress, tiers) | Concept selection decisions, scores |
| **AI Coach** | personalization-store, struggle detector | Coach messages (UI) |
| **Personalization** | personalization-store (localStorage) | personalization-store |
| **Diagnostic** | Root concepts from parsing, learning-store | learning-store (diagnostic results) |
| **Micro Learning Loop** | learning-store (active concept) | learning-store (completeConcept) |
| **Concept Map** | learning-store (concepts, graph) | learning-store (mapBuilt, mapReconstructed) |
| **Flow & Momentum** | learning-store (session state) | Equation values, checkpoint triggers |
| **Content Audit** | Parsed concepts, localStorage (objectives) | Audit results (UI) |
| **Theme & UI** | theme-store, ui-store | CSS variables, panel state |
| **Background Recovery** | generation-store (activeJob) | generation-store, Backend (poll) |

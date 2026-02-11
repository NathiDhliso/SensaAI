# SensaAI Architecture Blueprint

> Last Updated: February 11, 2026

> **Naming convention:** User-facing brand is **SensaAI**. All AWS resources use the `sensapbl-*` prefix internally.

---

## Executive Summary

SensaAI is an AI-powered learning platform. A user enters any subject, the system generates structured educational content via AWS Lambda + Bedrock (Claude 3 Sonnet), then guides them through an adaptive multi-phase learning session in the browser.

**Production URL:** `https://main.dckqci84h8ffk.amplifyapp.com`

**Architecture at a glance:**

| Concern | Implementation |
|---------|---------------|
| Content generation | Python Lambda (15 min timeout, 10 GB) Bedrock LLM DynamoDB |
| Content delivery | Express.js proxy Lambda query paginated concept fetch |
| Learning engine | React SPA with Zustand slices, SENSA v2.0 flow (SCOUT BUILD MASTER) |
| Adaptive algorithms | SM-2 spacing, ZPD concept selection, interleaving, cognitive load tracking |
| Storage | DynamoDB + S3 (cloud truth), IndexedDB (offline cache), localStorage (session progress) |
| Auth | Cognito OAuth 2.0 + PKCE, HttpOnly cookie tokens |
| Infra | Terraform modules (Lambda, API Gateway, DynamoDB, Cognito, S3), S3 backend for state |

**Key data flows:**

1. **Generate** — User enters subject Express Lambda invokes Bedrock 5× in parallel stores concepts in DynamoDB frontend polls job status fetches concepts parses into learning session
2. **Learn** — Session config (mood goal + duration) micro-learning loops (teach recall drill quiz) spacing engine records quality next concept selected by ZPD + interleaving
3. **Review** — Launchpad gym shows due reviews from SM-2 spacing engine, concept map builder, peer review, mastery challenges

**Error resilience:** 3-retry exponential backoff at both Lambda (Bedrock calls) and frontend (API calls via `resilience.ts`). Offline queue re-sends failed requests on reconnect. Study page hydration retries 3× with backoff. LearningErrorBoundary catches render crashes with recover/abandon paths.

**Scale posture:** DynamoDB on-demand (PAY_PER_REQUEST), Lambda concurrency at AWS defaults. No provisioned capacity. Designed for pilot-scale (<1000 users).

---

## 1. System Overview

SensaAI is an AI-powered learning platform that generates structured educational content from any subject, then guides users through a multi-phase learning session with adaptive pacing, diagnostic assessments, and mastery challenges.

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript, Vite, Zustand, Framer Motion |
| Styling | Modular CSS (`.module.css`) |
| Backend API | Express.js + TypeScript (Node 18) |
| Serverless | AWS Lambda (Python 3.12) |
| AI/LLM | AWS Bedrock (Claude 3 Sonnet) |
| Auth | AWS Cognito (OAuth 2.0 + PKCE, HttpOnly cookies) |
| Database | AWS DynamoDB (concepts table, jobs table) |
| Storage | AWS S3 (content), IndexedDB (local cache), localStorage (session progress) |
| Infrastructure | Terraform (modules: Lambda, API Gateway, DynamoDB, Cognito, S3), S3 backend for state |
| CI/Deployment | AWS Amplify (auto-deploy on push to `main`), Terraform for infra, AWS CLI for Lambda code |

### Deployment Infrastructure

| Resource | Details |
|----------|---------|
| **Amplify** | App `SensaArchitect` (ID: `dckqci84h8ffk`), branch `main`, auto-deploys on push |
| **Production URL** | `https://main.dckqci84h8ffk.amplifyapp.com` |
| **API Gateway** | HTTP API `c4kxjdukwj`, auto-deploy stage `$default` |
| **Lambda Functions** | `sensapbl-generate-concepts-pilot`, `sensapbl-query-concepts-pilot`, `sensapbl-gym-ai-pilot` |
| **DynamoDB Tables** | `sensapbl-concepts-pilot`, `sensapbl-jobs-pilot` |
| **Cognito** | User Pool `us-east-1_nNdVox578`, domain `sensapbl-pilot` |
| **S3 Buckets** | `sensapbl-pilot-content-311964231104` (content), `sensapbl-terraform-state` (TF state) |
| **Terraform Backend** | S3 `sensapbl-terraform-state/pilot/terraform.tfstate`, DynamoDB lock `terraform-locks` |
| **AWS Region** | `us-east-1` |

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ FRONTEND (React) │
│ Pages Hooks Stores Features API Client │
└──────────────┬──────────────────────────────┬───────────────────┘
 │ │
 │ /api/v1/concepts/* │ /api/v1/auth/*
 │ /api/v1/content/* │ /api/v1/proxy/*

┌──────────────────────────────┐ ┌───────────────────────────────┐
│ EXPRESS BACKEND (Node.js) │ │ AWS COGNITO │
│ - Auth middleware │ │ - User pools │
│ - Concepts proxy to Lambda │ │ - OAuth 2.0 + PKCE │
│ - Content CRUD │ │ - HttpOnly cookie tokens │
└──────────────┬───────────────┘ └───────────────────────────────┘
 │
 │ Lambda Invoke

┌──────────────────────────────────────────────────────────────────┐
│ AWS LAMBDA (Python 3.12) │
│ │
│ ┌─────────────────────┐ ┌──────────────────────┐ │
│ │ generate_concepts │ │ query_concepts │ │
│ │ - classify_subject │ │ - Paginated queries │ │
│ │ - parallel generate │ │ - Tier filtering │ │
│ │ - store to DynamoDB │ │ - Subject management │ │
│ └──────────┬──────────┘ └──────────┬───────────┘ │
│ │ │ │
│ │
│ ┌──────────────────┐ ┌──────────────────┐ │
│ │ AWS Bedrock │ │ AWS DynamoDB │ │
│ │ (Claude 3 Sonnet)│ │ - concepts table │ │
│ └──────────────────┘ │ - jobs table │ │
│ └──────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Content Generation Pipeline

This is the only active generation path.

#### Migration from Legacy Orchestrator

The original generation pipeline was a TypeScript multi-phase orchestrator (`multi-phase-orchestrator.ts`) that ran in the Express backend. It made sequential Bedrock calls from Node.js, parsed responses in-process, and returned the full document synchronously. This had three problems:

1. **Timeout ceiling** — Express requests time out at ~30s on most hosts; generation takes 3–12 minutes
2. **No parallelism** — Parts were generated sequentially, doubling wall-clock time
3. **Tight coupling** — Parsing, validation, and storage were interleaved in one function

The replacement is the **Lambda-based async pipeline** documented below. Key migration changes:

| Concern | Legacy (removed) | Current |
|---------|-----------------|---------|
| Runtime | Express (Node.js, sync) | Lambda (Python 3.12, async) |
| LLM calls | Sequential, 1 prompt | Parallel, 5 partitioned prompts + 1 classification |
| Timeout | ~30s (Express limit) | 900s (Lambda limit) |
| Storage | Return full JSON to frontend | Store concepts in DynamoDB, frontend fetches |
| Job tracking | None (sync response) | Jobs table with status polling |
| Classification | None | Bedrock call returns `subjectType` + `macroStructure` |
| Tier computation | Frontend percentile-based | Lambda graph-based (`_compute_tiers_from_graph`) |

The legacy orchestrator files (`multi-phase-orchestrator.ts`, `phase1-domain-analysis.ts`, `phase2-content-generation.ts`) were deleted. The frontend API client (`backend-client.ts`) was rewritten to call the Express proxy which invokes Lambda asynchronously. The frontend now polls `/api/v1/concepts/jobs/:jobId` for status, then fetches concepts via `/api/v1/concepts?sessionId=...`.

### Flow

```
User enters subject + context
 │

Frontend: generateWithBackend()
 │

conceptsApi.generate() POST /api/v1/concepts/generate
 │

Express backend proxies to Lambda (generate_concepts)
 │

Lambda handler.py:
 1. classify_subject() Bedrock call returns { subjectType, classification, macroStructure }
 2. Parallel generate_concepts() × 5 parts (knowledge dimensions) Bedrock calls
 Part 1: Core Mechanics (foundations, terminology, prerequisites)
 Part 2: Workflows & Operations (processes, configuration, modeling)
 Part 3: Output & Delivery (visualization, reporting, publishing, collaboration)
 Part 4: Governance & Infrastructure (security, compliance, deployment, admin)
 Part 5: Advanced & Ecosystem (optimization, AI features, mobile, integrations)
 3. Post-process: compute tiers from connection graph (root/trunk/leaf), assign stages, validate
 4. Store concepts + classification in DynamoDB (jobs table + concepts table)
 5. Return { jobId, sessionId, conceptCount, classification }
 │

Frontend polls job status via GET /api/v1/concepts/jobs/:jobId
 - Receives classification data when job completes
 │

Frontend fetches concepts via GET /api/v1/concepts?sessionId=...
 │

buildDocumentFromConcepts() includes classification in JSON document
 │

parseAndLoadContent() parseDomainAnalysis() extracts classification
 │

transformToLearningStages() uses macroStructure for type-aware stages
 │

loadSession() stores subjectType + macroWorkflow in CurrentSession
 │

Navigate to /study/:subjectId
```

### Subject Classification System

Every subject is classified into one of four types before content generation:

| Type | Label | Structure | Examples |
|------|-------|-----------|----------|
| A | Procedural | Sequential stages on object lifecycle | Azure admin, surgery, coding |
| B | Conceptual | Core moves + application patterns | Law, philosophy, music theory |
| C | Cyclic | Fundamental cycle + meta-awareness | Design thinking, research, jazz |
| D | Perceptual | Perceptual ladder + practice structures | Diagnosis, chess, art critique |

Classification data flows through the entire pipeline and influences stage naming, concept organization, and validation rules.

---

## 4. Frontend Architecture

### Directory Structure

```
src/
├── App.tsx # Root component, routing, mounts SettingsPanel + BackgroundJobToast
├── pages/ # Full page views
│ ├── Home.tsx # Landing page
│ ├── Generate.tsx # Content generation UI
│ ├── Study.tsx # Study session entry + hydration
│ ├── VelocityLearning.tsx # SENSA v2.0 learning engine
│ ├── SavedResults.tsx # Library of generated content
│ ├── Login.tsx / SignUp.tsx # Auth pages
│ └── DocumentView.tsx # Raw document viewer
│
├── components/ # UI components
│ ├── auth/ # ProtectedRoute (route guard)
│ ├── ui/ # Generic UI widgets
│ │ ├── EquationTracker # Universal Learning Equation display
│ │ ├── FlowProgressBar # Session progress bar
│ │ ├── BackgroundJobToast # Generation job notifications
│ │ ├── MomentumCheckpoint # Momentum milestone celebrations
│ │ ├── HelpModal # Contextual help overlay
│ │ ├── SensaShape # Brand shape component
│ │ ├── SessionTimeToast # Session time notifications
│ │ └── ConceptProgressIndicator
│ ├── learning/ # Learning-specific
│ │ ├── activities/ # BlankSheet, ConfusionDrill, ConceptMapBuilder,
│ │ │ # MasteryChallenge, NomenclatureSprint,
│ │ │ # CreativeTransfer, PeerReview
│ │ ├── session/ # SessionStartModal, VelocityLockInGate,
│ │ │ # SessionScoutPreview, SessionSummary
│ │ ├── onboarding/ # DiagnosticLaunchSystem, GuidedPrimer,
│ │ │ # OnboardingFlow, PrerequisiteCheck
│ │ ├── feedback/ # SkipReasonModal, CelebrationModal,
│ │ │ # ConnectionTypeModal, NeuralResetModal,
│ │ │ # FlagInaccuracyButton
│ │ ├── launchpad/ # ContentLaunchpad, ScoreCard, TierDistributionChart
│ │ ├── LearningToolbar/ # FocusTimer, ProgressAnalytics, QuickQuiz
│ │ ├── ui/ # PhaseNavigator, SensaSynopticView,
│ │ │ # CognitiveGauge, NeuralResetBanner
│ │ └── MicroLearningLoopController.tsx # Core learning loop orchestrator
│ ├── generation/ # CognitiveStream, AgentCore
│ ├── layout/ # StudyLayout (unified study command center wrapper)
│ ├── settings/ # SettingsPanel (slide-out, always mounted in App.tsx)
│ ├── dashboard/ # BlueprintFormulaDashboard, MasteryDashboard
│ ├── storage/ # CloudLibraryModal
│ └── error/ # ErrorBoundary
│
├── features/ # Business logic by domain
│ ├── content-generation/ # AI content generation
│ │ ├── api/ # backend-client.ts, claude-client.ts
│ │ ├── parsers/ # json-parser.ts, transformer.ts, ai-integration.ts
│ │ ├── validators/ # content-quality.ts, tier-progression.ts
│ │ └── generators/ # dependency-parser.ts, json-merger.ts, tier-calculator.ts
│ ├── learning-session/ # Learning activities
│ │ ├── activities/ # confusion-generator.ts, diagnostic-generator.ts
│ │ ├── algorithms/ # concept-selection.ts, spacing-engine.ts, interleaving.ts
│ │ ├── phases/ # preview-ai.ts, build-ai.ts, retain-ai.ts, score-map.ts
│ │ ├── progress/ # session-tracker.ts (throttled localStorage persistence)
│ │ └── scoring/ # blank-sheet-scorer.ts
│ ├── content-storage/ # Save/load content
│ │ ├── cloud/ # s3-dynamodb.ts
│ │ ├── local/ # indexed-db.ts, browser-storage.ts
│ │ ├── sync/ # import.ts, sync-engine.ts
│ │ ├── manager.ts # StorageManager (orchestrates cloud + local)
│ │ └── types.ts # SavedResult, StorageProvider interfaces
│ ├── ai-coach/ # AI coach personas, voice (useVoice hook, static-lines)
│ │ ├── components/ # Coach UI components
│ │ └── voice/ # useVoice.ts, static-lines.ts
│ ├── personalization/ # User preference features (MetaphorToggle, etc.)
│ │ └── components/ # MetaphorToggle
│ └── social/ # Social learning types (PeerReview)
│
├── store/ # Zustand state management
│ ├── auth-store.ts # Authentication state
│ ├── generation-store.ts # Generation jobs, progress, classification
│ ├── learning-store.ts # Composed from slices (below)
│ ├── personalization-store.ts # Metaphors, stress-free mode, practice mode, coach settings
│ ├── theme-store.ts # Dark/light/system theme + visual theme (playful/scholarly)
│ ├── ui-store.ts # Settings panel open/close state
│ └── slices/ # Learning store slices
│ ├── createSessionSlice.ts # Session lifecycle (load, clear, start)
│ ├── createNavigationSlice.ts # Concept navigation + progress persistence
│ ├── createStudySlice.ts # Study session state machine
│ ├── createCognitiveSlice.ts # Cognitive load tracking
│ ├── createDiagnosticSlice.ts # Diagnostic assessment state
│ ├── createFocusSlice.ts # Focus/flow state management
│ ├── createUISlice.ts # UI state (celebrations, modals)
│ └── types.ts # CurrentSession, UserProgress, etc.
│
└── shared/ # Cross-cutting utilities
 ├── api/ # API client, concepts API
 ├── hooks/ # useLearningFlow, useSensaFlow, useFlowState,
 │ # useGenerationEngine, useClickOutside, useEscapeKey
 ├── types/ # learning.ts, macro-workflow.ts, sensa-flow.ts, generation.ts
 ├── constants/ # UI timings, scoring constants, theme-colors
 ├── services/ # audio.ts (AudioManager + AudioService), exam-objectives-fetcher.ts
 └── utils/ # content-loader.ts, toast.ts, score-utils.ts, example-synthesis.ts
```

### Routes (App.tsx)

| Route | Component | Auth |
|-------|-----------|------|
| `/` | Home | Public |
| `/login` | Login | Public |
| `/signup` | SignUp | Public |
| `/confirm-signup` | ConfirmSignUp | Public |
| `/auth/callback`, `/callback` | AuthCallback | Public |
| `/generate/:subject` | Generate | Protected |
| `/study/:subjectId` | Study | Protected |
| `/launchpad/:subjectId` | ContentLaunchpad | Protected |
| `/library` | SavedResults | Protected |
| `/view/:id` | DocumentView | Protected |

Global overlays always mounted: `SettingsPanel` (slide-out), `BackgroundJobToast`.

### Key Frontend Patterns

- **Zustand slices** — Learning store is composed from session, navigation, study, cognitive, diagnostic, focus, and UI slices
- **Ref-based cleanup** — Unmount effects use refs to avoid stale closure cascades
- **Throttled persistence** — Session progress saves are throttled (2s) with flush-on-unmount
- **Modular CSS** — All styling via `.module.css` files, no global CSS classes
- **Consolidated settings** — Single `SettingsPanel` slide-out (portal-based, always mounted in App.tsx) replaces the old `/settings` page. Opened via `useUIStore.openSettingsPanel()`
- **Mood-based session curation** — `SessionStartModal` mood selection auto-sets goal + duration based on energy level
- **Browser SpeechSynthesis** — Voice preview in settings uses native `SpeechSynthesis` API (no audio file dependency)

---

## 5. Backend Architecture

### Express Server (`backend/src/`)

```
backend/src/
├── core/
│ └── server.ts # Express app, middleware, route mounting
├── features/
│ ├── auth/routes/ # /api/v1/auth — Cognito token exchange
│ ├── concepts/routes/ # /api/v1/concepts — Proxy to Lambda
│ ├── content/routes/ # /api/v1/content — Content CRUD
│ └── proxy/routes/ # /api/v1/proxy — Public resource proxy
├── shared/
│ ├── middleware/ # auth.ts (JWT verify), error-handler.ts, rate-limit.ts
│ └── types/
│ ├── macro-workflow.ts # Classification types (shared with frontend)
│ └── grounding.ts # Source grounding types for content verification
```

### Lambda Functions (`backend/lambda/`)

```
backend/lambda/
├── generate_concepts/
│ ├── handler.py # Entry point: routes generate/repair actions
│ └── services/
│ ├── bedrock_service.py # classify_subject() + parallel generate_concepts()
│ └── dynamo_service.py # Job tracking, concept storage, batch writes
├── query_concepts/
│ └── handler.py # Paginated concept queries, subject management, job polling
├── shared/
│ ├── system_prompt.py # SILVER_BULLET_PROMPT + classification prompt
│ └── utils.py # CORS, API response helpers, DynamoDB key builders
└── requirements.txt
```

---

## 6. Infrastructure (Terraform)

```
infra/terraform/
├── main.tf # Root module: wires Cognito, S3, DynamoDB, Lambda, API Gateway
├── modules/
│ ├── cognito/ # User pool, app client, domain
│ ├── dynamodb/ # concepts table (GSI1 for tier queries), jobs table
│ ├── lambda/ # generate_concepts (15min timeout), query_concepts (30s)
│ ├── api_gateway/ # HTTP API with Lambda integrations
│ └── s3/ # Content storage bucket
├── bootstrap/ # One-time setup: S3 state bucket + DynamoDB lock table
│ └── main.tf
└── environments/
 ├── pilot/ # Pilot environment (S3 backend)
 │ ├── main.tf
 │ ├── terraform.tfvars
 │ └── variables.tf
 └── prod/ # Production environment (S3 backend)
 ├── main.tf
 ├── terraform.tfvars
 └── variables.tf
```

### Key Infrastructure Details

- **Region**: us-east-1
- **Generate Lambda**: 10,240 MB memory (10 GB), 900s timeout (15 min for LLM calls)
- **Query Lambda**: 512 MB memory, 30s timeout
- **API Gateway**: `https://c4kxjdukwj.execute-api.us-east-1.amazonaws.com`
- **DynamoDB tables**: `sensapbl-concepts-pilot`, `sensapbl-jobs-pilot`

---

## 7. Data Flow & Storage

### DynamoDB Schema

**Concepts Table** (`sensapbl-concepts-pilot`)
- PK: `USER#{userId}#SESSION#{sessionId}`
- SK: `TIER#{tier}#CONCEPT#{conceptId}` or `SUBJECT#{sessionId}` (tier = root|trunk|leaf)
- GSI1: For tier-based queries

**Jobs Table** (`sensapbl-jobs-pilot`)
- Tracks generation job status, progress, classification data
- TTL: 24 hours

### Local Storage

| Store | Purpose | TTL |
|-------|---------|-----|
| IndexedDB | Full generated documents (offline access) | None |
| localStorage | Session progress recovery | 24 hours |
| Zustand (memory) | Active session state | Page lifetime |

---

## 8. Learning Engine (SENSA v2.0)

### Learning Phase Flow

```
SCOUT PREVIEW PRIME BUILD MASTER COMPLETE
 │
 └── DIAGNOSE (optional, on first visit)
```

| Phase | Purpose | Key Component |
|-------|---------|--------------|
| SCOUT | Pre-learning overview of content | SessionScoutPreview |
| PREVIEW | Nomenclature Sprint + Gap Priming | NomenclatureSprint |
| PRIME | Mood check-in auto-curates goal + duration | VelocityLockInGate, SessionStartModal (Study.tsx only) |
| DIAGNOSE | Assess prior knowledge | DiagnosticLaunchSystem |
| BUILD | Core learning loop | MicroLearningLoopController |
| MASTER | Mastery challenges | MasteryChallenge, ConceptMapBuilder |
| COMPLETE | Summary dashboard | MasteryDashboard |

### Micro Learning Loop (BUILD phase)

Each concept cycles through:
1. **Teach** — Present the concept with mnemonic anchor
2. **Blank Sheet** — Recall from memory (fuzzy-scored)
3. **Confusion Drill** — Distinguish from similar concepts
4. **Quiz** — Multiple choice assessment
5. **Outcome** — mastered / needs-review / needs-learning next concept

### Tier System (Root / Trunk / Leaf)

Concepts are classified into 3 dependency-derived tiers. The LLM does **not** assign tiers — they are computed deterministically from the connection graph in `_compute_tiers_from_graph()` (Lambda `bedrock_service.py`).

| Tier | Graph Rule | Meaning | Expected % |
|------|-----------|---------|------------|
| `root` | in-degree 0, out-degree ≥ 1 | Entry points — learn these first | ~20% |
| `trunk` | in-degree ≥ 1, out-degree ≥ 1 | Core connectors — the meat of the subject | ~50% |
| `leaf` | out-degree 0 or isolated | Terminal applications — specialized skills | ~30% |

Direction rules for connection types:
- `requires`, `is-part-of`, `is-type-of` source depends on target
- `enables`, `causes`, `constrains` target depends on source

Key files:
- Backend: `backend/lambda/generate_concepts/services/bedrock_service.py` `_compute_tiers_from_graph()`
- Frontend type: `src/shared/types/sensa-flow.ts` `TierType = 'root' | 'trunk' | 'leaf'`
- Frontend fallback: `src/features/content-generation/parsers/transformer.ts` `calculateTier()`
- Tier progression validator: `src/features/content-generation/validators/tier-progression.ts`
- CSS variables: `--color-root`, `--color-trunk`, `--color-leaf` in `src/index.css`
- Graph colors: `GRAPH_COLORS.root`, `.trunk`, `.leaf` in `src/shared/constants/theme-colors.ts`

UI surfaces:
- `SensaSynopticView` — orbit rings (inner=root, middle=trunk, outer=leaf)
- `SessionScoutPreview` — tier columns with flow arrows
- `ConceptMapBuilder` — sidebar bucket zones
- `MasteryDashboard` — tier coverage bars
- `TierDistributionChart` — analytics bar chart

### Connection Type Taxonomy (Concept Map)

All concept connections use exactly 6 universal types (no generic fallback):

| Type | Question | Example |
|------|----------|---------|
| `requires` | What must I know first? | Calculus requires Algebra |
| `enables` | What does this unlock? | Variables enable Functions |
| `is-part-of` | What is this a piece of? | Mitochondria is part of Cell |
| `is-type-of` | What category? | Sonnet is type of Poem |
| `causes` | What happens because of this? | Inflation causes Price Increase |
| `constrains` | What limits this? | Budget constrains Scope |

Enforced in: generation prompt (`system_prompt.py` §3.4), surgical fix prompt, `normalizeConnectionType()` in `json-parser.ts`, `extractDependencyEdges()` in `dependency-parser.ts`, `ConnectionTypeModal`, `build-ai.ts` suggestion engine, `LABEL_PRESETS`.

### Universal Learning Equation

```
I = min(h, G × Q_f × Q_M × Q_P)
```

- **I** = Information absorbed
- **h** = Time horizon
- **G** = Generation quality factor
- **Q_f** = Flow quality (momentum tracking)
- **Q_M** = Mastery quality (concept scores)
- **Q_P** = Practice quality (engagement)

Tracked by `EquationTracker` component and `useFlowState` hook.

---

## 9. Authentication Flow

```
Login page Cognito Hosted UI (OAuth 2.0 + PKCE)
 │

Callback Exchange code for tokens
 │

Express backend sets HttpOnly cookies (access + refresh tokens)
 │

All API calls include cookies auth middleware verifies JWT
 │

Token refresh handled transparently via refresh token cookie
```

---

## 10. Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Lambda for generation, Express for routing | Generation needs 15-min timeout; Express handles auth, proxying, and content CRUD |
| Python Lambda (not TypeScript) | Better Bedrock SDK support, simpler prompt management |
| Classification before generation | Enables type-aware content structure (procedural vs conceptual vs cyclic vs perceptual) |
| Zustand over Redux | Simpler API, slice composition, no boilerplate |
| Modular CSS over Tailwind | Scoped styles, no utility class sprawl, better readability |
| localStorage for session progress | Instant recovery on refresh, no network dependency |
| Throttled saves (2s) | Prevents state-change cascade from flooding localStorage |
| Ref-based unmount pattern | Avoids stale closures in React cleanup effects |

---

## 11. Error Handling & Failure Modes

### Lambda Generation Failures

| Failure | Behavior | Recovery |
|---------|----------|----------|
| Bedrock throttling / 5xx | 3 retries with exponential backoff (2s, 4s, 8s) per part. Boto3 client also configured with `retries={"max_attempts": 3, "mode": "adaptive"}` | If all retries fail for a part, that part returns `[]`. Generation succeeds if total concepts ≥ 40 (`MIN_CONCEPTS_THRESHOLD`). Below 40 = partial success logged |
| Lambda timeout (>900s) | Lambda killed by AWS. Job stays `in_progress` in DynamoDB | Frontend polls job status. If no progress after ~16 min, `useGenerationEngine` treats it as stalled. Jobs table has 24h TTL — stale jobs auto-expire |
| DynamoDB throttling | On-demand mode auto-scales, but burst can exceed per-partition limits | Boto3 retries handle transient throttles. Batch writes in `dynamo_service.py` use `batch_writer()` which auto-retries unprocessed items |
| Classification fails | 3 retries, then falls back to `None` (conceptual default) | Generation proceeds with no classification. Frontend receives no `subjectType` — UI omits the type badge, stage naming uses generic labels |
| JSON parse failure (truncated LLM output) | 4-stage incremental parser: (1) direct `json.loads`, (2) regex extraction, (3) single-object wrap, (4) character-by-character recovery | Recovers partial concepts from truncated responses. Logged as warning |

### Express Backend Failures

| Failure | Behavior | Recovery |
|---------|----------|----------|
| Lambda invoke error | Caught in `/generate` route. Job marked `failed` in DynamoDB with error message | Frontend sees `status: 'failed'` on next poll. Displays error with "Go to Dashboard" action |
| Auth token expired | `auth.ts` middleware rejects with 401 | Frontend intercepts 401, redirects to login. Cognito refresh token (HttpOnly cookie) handles transparent renewal |

### Frontend Failures

| Failure | Behavior | Recovery |
|---------|----------|----------|
| API call fails (network) | `resilience.ts` retries 3× with exponential backoff (1s, 2s, 4s, max 10s). 4xx errors are not retried | `OfflineQueueManager` stores failed writes; re-sends on `online` event |
| Study page hydration fails | `Study.tsx` retries 3× with backoff (1s, 2s, 3s). Displays typed error states: `SESSION_NOT_FOUND`, `EMPTY_CONTENT`, `INVALID_CONTENT`, `CORRUPTED_CONTENT`, `GENERATION_IN_PROGRESS`, `SESSION_ID_MISSING` | Each error state has a specific message + action button (e.g., "Go to Dashboard", "Refresh Page") |
| Learning engine crash | `LearningErrorBoundary` catches React render errors. Two paths: "Recover Session" (re-renders), "Return to Dashboard" (clears state + navigates home) | If recovery fails, only "Return to Dashboard" is shown |
| Session progress lost | `localStorage` progress recovery on mount. `VelocityLearning.tsx` checks `loadSessionProgress()` and restores active concept + progress | Shows "Resumed from where you left off" toast with age |
| IndexedDB quota exceeded | `indexed-db.ts` eviction policy: removes results >90 days old, then oldest results until under target usage | Logged. Cloud storage (S3/DynamoDB) remains source of truth |

### Degraded States

| Condition | Degraded behavior |
|-----------|-------------------|
| Offline | IndexedDB cache serves saved content. New generation blocked. Offline queue stores pending writes |
| No Cognito session | Protected routes redirect to `/login`. Generation and cloud storage unavailable. Local content still accessible |
| Spacing engine not initialized | Gym tab shows 0 due reviews. No crash — `try/catch` wraps all spacing calls in `ContentLaunchpad.tsx` |
| Classification missing | Learning session works with generic stage names. Blueprint-Formula dashboard shows "Unknown" type. No functional degradation |

---

## 12. Performance Characteristics

### Latency Budget

| Operation | Expected latency | Bottleneck |
|-----------|-----------------|------------|
| Content generation (full) | 3–12 min | 5 parallel Bedrock calls × 16K max_tokens each. Classification adds ~5s |
| Job status poll | <200ms | DynamoDB point read on jobs table |
| Concept fetch (paginated) | <500ms | DynamoDB query on concepts table (GSI1) |
| Study page hydration (cache hit) | <100ms | IndexedDB read |
| Study page hydration (cloud) | 1–3s | S3 getObject + JSON parse |
| Micro-loop phase transition | <50ms | In-memory Zustand state update |

### Resource Limits

| Resource | Config | Limit |
|----------|--------|-------|
| Generate Lambda memory | 10,240 MB (10 GB) | AWS max is 10 GB — at ceiling |
| Generate Lambda timeout | 900s (15 min) | AWS max is 900s — at ceiling |
| Query Lambda memory | 512 MB | Comfortable for DynamoDB queries |
| Query Lambda timeout | 30s | Sufficient for paginated reads |
| DynamoDB billing | PAY_PER_REQUEST (on-demand) | Auto-scales. No provisioned capacity to exhaust |
| Bedrock concurrency | 3 workers (`MAX_WORKERS`) per invocation | Stays within Bedrock per-model limits |
| IndexedDB cache | Eviction at quota threshold | Browser-dependent (typically 50–500 MB) |
| Offline queue | 50 items max | Oldest dropped on overflow |
| Toast dedup window | 2s | Same message + type suppressed within window |

### Scale Limits (Pilot Posture)

Current architecture is designed for pilot scale. Known ceilings:

- **Concurrent generations**: Lambda concurrency defaults (~1000 per region). Each generation holds 1 Lambda for up to 15 min. At 100 concurrent users generating simultaneously, that's 100 Lambdas × 15 min = significant concurrency burn. Monitor via CloudWatch `ConcurrentExecutions`.
- **DynamoDB hot partitions**: Concepts table PK is `USER#userId#SESSION#sessionId`. No hot-key risk at pilot scale. At >10K users, monitor `ThrottledRequests` metric.
- **Bedrock rate limits**: Claude 3 Sonnet has per-account tokens-per-minute limits. 5 parallel calls per generation × N concurrent users can hit this. Mitigation: stagger part start times (1.5s × part_num delay already in `generate_part_with_retry`).
- **S3**: No practical limit at pilot scale.

---

## 13. Feature Map

### Implemented

- [x] AI content generation with subject classification (4 types)
- [x] Macro workflow blueprint (type-aware stage generation)
- [x] Multi-tier concept organization (root, trunk, leaf — dependency-derived from connection graph)
- [x] SENSA v2.0 learning flow (PRIME BUILD MASTER)
- [x] Micro learning loop (teach blank sheet confusion drill quiz)
- [x] Mnemonic anchor system
- [x] Diagnostic assessment (pre-learning knowledge check)
- [x] Session progress persistence + recovery
- [x] Cognito authentication (OAuth 2.0 + PKCE)
- [x] Cloud storage (S3 + DynamoDB)
- [x] Local storage (IndexedDB + localStorage)
- [x] AI coach personas (voice lines, personality system)
- [x] Personalization (metaphor settings, stress-free mode, practice mode)
- [x] Concept map builder
- [x] Mastery challenges
- [x] Generation progress UI (CognitiveStream, subject type badge)
- [x] Session time tracking + momentum checkpoints
- [x] Dark/light/system theme
- [x] Visual theme system (Playful / Scholarly) — Full Apple-grade UI overhaul. `data-visual-theme` attribute on root, 200+ CSS variable overrides in `index.css` (Apple system colors, SF Pro typography, no glow/texture, crisp shadows). `useVisualTheme()` hook in `src/shared/hooks/useVisualTheme.ts` used by 22+ components to conditionally strip emojis and swap labels. Page reloads on theme switch. 4 combinations: playful+light, playful+dark, scholarly+light, scholarly+dark. Persisted in `theme-store.ts`.
- [x] Consolidated settings panel (slide-out, all toggles wired to stores)
- [x] Mood-based session curation (energized/neutral/tired/stressed auto-set goal + duration)
- [x] Browser SpeechSynthesis voice preview (no audio file dependency)
- [x] ContentLaunchpad + Content Audit Engine (`/launchpad/:subjectId`) — 2-track audit: (1) Content Health = structural completeness (SHAPE, mnemonic, technical depth), (2) Objective Alignment = fuzzy-match concepts against user-provided exam objectives (pasted in dashboard, stored in localStorage). Classifies as objective-aligned / supplementary / not-in-objectives / unverified. Shows uncovered objectives as content gaps. Expandable per-concept verdicts with matched objective display.
- [x] Objective-Driven Generation Pipeline — Home page has collapsible "Paste Exam Objectives" textarea with smart cleanup (`parseSyllabusText`) that strips percentages, numbering, answer choices, mark allocations, instructions, and exam paper junk. Cleaned objectives passed as `?context=` URL param to Generate page Lambda. Lambda `system_prompt.py` parses objectives into domains via `_parse_objective_domains()`, distributes to 5 parts via `_distribute_domains_to_parts()`. `max_tokens` 16384 per part. Post-generation deduplication. Blueprint upload removed (users paste content directly). `exam-objectives-fetcher.ts` deleted (PDF parsing never implemented).
- [x] StudyLayout (unified study command center wrapper with cognitive load indicator)
- [x] SCOUT phase (pre-learning overview) — SessionScoutPreview wired into VelocityLearning
- [x] PREVIEW phase (content preview before study) — Nomenclature Sprint + Gap Priming steps
- [x] MasteryDashboard (COMPLETE phase summary) — Grade, equation breakdown, tier coverage
- [x] Audio interrupt service (priority-based queue) — playWithPriority(), fade, queue processing
- [x] Struggle detector (interaction velocity heuristic) — useStruggleDetector wired into VelocityLearning
- [x] Production environment (Terraform `prod/`) — Full config with production URLs
- [x] S3 backend for Terraform state — Bootstrap module + both envs use S3 backend
- [x] LearningToolbar (FocusTimer, ProgressAnalytics, QuickQuiz)
- [x] Feedback system (CelebrationModal, ConnectionTypeModal, NeuralResetModal, FlagInaccuracyButton)
- [x] Onboarding flow (GuidedPrimer, PrerequisiteCheck, OnboardingFlow)
- [x] CloudLibraryModal (cloud storage browser)

### Phase 2 — Blueprint-Formula Integration (Implemented)

The classification system (Type A/B/C/D) now feeds back into the learning formula via `blueprint-formula.ts`:

- [x] **G baseline scoring** — `calculateGBaseline()` maps classification confidence G value (procedural: 0.85, conceptual: 0.80, cyclic: 0.75, perceptual: 0.70)
- [x] **Type-aware Q metrics** — `calculateTypeAwareMetrics()` adapts Q_f, Q_M, Q_P per subject type:
 - Procedural: stage completion rate, checkpoint pass rate, hands-on time
 - Conceptual: move fluency, novel problem success, deliberate case work
 - Cyclic: cycle completion rate, insight per cycle, loop quality
 - Perceptual: pattern exposure rate, discrimination accuracy, perception drills
- [x] **Feedback loop** — `detectBlueprintMismatch()` detects low I + high effort suggests reclassification, adjusts G
- [x] **Blueprint-Formula dashboard** — `BlueprintFormulaDashboard` component shows G, type-aware Q labels, feedback alerts, recommendations

### Phase 3 — Silver Bullet Audit Fixes (Implemented)

Full audit documented in `docs/architecture/AUDIT_SILVER_BULLET.md`. Key changes:

- [x] **Shared example synthesis** — `synthesizeExample()` extracted to `src/shared/utils/example-synthesis.ts`, eliminates duplication between WorkedExample and FadedExample phases
- [x] **Type-aware activity selection** — `MicroLearningLoopController` accepts `subjectType` prop, selects post-confusion activity per classification (proceduraltransfer, conceptualtransfer, cyclicsocial, perceptualtransfer)
- [x] **Blueprint-Formula dashboard wired** — `updateTypeAwareMetrics()` called in `handleLoopComplete` with real cognitive metrics, dashboard now receives live data
- [x] **PeerReviewActivity rebuilt** — Generates misconceptions from `commonPitfalls` and same-tier concept confusion; validates correction via keyword scoring
- [x] **CreativeTransferActivity rebuilt** — Type-aware scenario templates (procedural/conceptual/cyclic/perceptual); keyword-based response scoring replaces length check
- [x] **MasteryChallenge real scoring** — Automated keyword + concept-name coverage scoring replaces self-assessment honor system; shows score %, matched terms, missed terms
- [x] **NomenclatureSprint verb-object matching** — Match pairs now include `howToUse` steps alongside metaphor anchors for action-oriented recall
- [x] **Dependency-derived tier system (root/trunk/leaf)** — Tiers computed deterministically from connection graph in Lambda `_compute_tiers_from_graph()`. Replaces legacy LLM-assigned foundation/keystone/utility. root=entry points (in-degree 0), trunk=connectors (in+out degree ≥1), leaf=terminal (out-degree 0). CSS vars `--color-root/trunk/leaf`, `GRAPH_COLORS.root/trunk/leaf`. Updated across all UI surfaces, types, validators, algorithms, stores, and CSS modules.
- [x] **VerifyPhase better distractors** — Fallback distractors pulled from other concepts' hook sentences and key points instead of generic templates
- [x] **FadedExample fuzzy validation** — Input validated via word-overlap against step text (30% threshold) instead of `length > 3`
- [x] **App.tsx cleanup** — Removed dead commented bionic reading code
- [x] **Home.tsx universal search** — Search placeholder changed to "Enter any subject to learn..." to feel universal

### Phase 4 — Silver Bullet v2: Pipeline Alignment (Implemented)

Holistic fix addressing systemic misalignments across the generation parsing learning pipeline:

- [x] **Surgical fix prompt aligned** — Updated `SURGICAL_FIX_PROMPT` to use 6 universal connection types (was legacy requires/extends/enables/contains), removed `tier` field (computed from graph), added `cognitiveLevel`, `keyPoints`, `commonPitfalls`, `scoring` fields
- [x] **Bloom's cognitive level enforcement** — `_enforce_blooms_distribution()` in `bedrock_service.py` ensures ≥30% concepts are `apply` or higher. Keyword-based upgrade for configuration/troubleshooting/decision concepts
- [x] **Objective domain parsing improved** — `_parse_objective_domains()` in `system_prompt.py` now detects hierarchy by content (action verbs, percentage weights) not just indentation. Prevents all objectives landing in one part
- [x] **Connection taxonomy unified** — All 4 layers (Lambda prompt, `json-parser.ts`, `transformer.ts`, `learning.ts` types) now use the same 6 universal types. Legacy `extends`/`contains`/`related-to`/`depends-on` eliminated
- [x] **Dependency parser uses Lambda connections** — `extractDependencyEdges()` now uses `strictConnections` (populated from Lambda's `connections` array) as Priority 1. Fallback inference only when no connections exist
- [x] **Single-source-of-truth tiers** — Removed frontend `assignTiersByPercentile()` that was overwriting Lambda's deterministic tiers. Frontend `calculateTier()` is now fallback-only for skeleton concepts
- [x] **Hierarchy-aware syllabus parser** — `parseSyllabusText()` now detects domain headers (percentage weights, short capitalized phrases) and skips them. Only counts leaf objectives (action verb lines, substantial content). Fixes inflated objective count (was 192, now ~79)

### Phase 5 — Content Quality Hardening (Implemented)

Closes 5 gaps identified by auditing the pipeline against the Desirable Results spec (`docs/DESIRABLE_RESULTS.md`):

- [x] **Domain-adaptive field guide in prompt** — §4.1 added to `system_prompt.py` instructs the LLM how to fill `phase2`, `phase3`, `workedExample`, and `eliminationLogic` differently per subject type (procedural/conceptual/cyclic/perceptual). Schema unchanged; content interpretation adapts.
- [x] **Validation bar raised** — `_validate_concept()` in `bedrock_service.py` now requires at least 1 connection and a valid `cognitiveLevel`. Skeleton concepts with only name+mnemonic+simpleCore no longer pass.
- [x] **Phantom connection logging** — `_compute_tiers_from_graph()` counts connections referencing non-existent concepts and warns if >10%. Prevents silent tier distortion from hallucinated targets.
- [x] **workedExample scored in audit** — `scoreContentHealth()` in `audit-engine.ts` now awards 5pts for a valid worked example and flags missing examples on apply+ concepts as a warning.
- [x] **Scoring field auto-repair** — `_validate_scoring_field()` wired into `_post_process_concepts()`. If LLM omits `scoring.keywords`, auto-generates from concept name words.
- [x] **Legacy tier label fix** — `ContentLaunchpad.tsx` footer fixed from `foundation/keystone/utility` to `root/trunk/leaf`.

### Phase 6 — Cognitive Load Dashboard & Temporal Spacing (Implemented)

Redesigns the main dashboard around Cognitive Load Theory and activates spaced repetition:

- [x] **Cognitive Battery (MoodSelector)** — Renamed from "Mood" to "Cognitive Battery / Focus Level". Consolidated 4 options to 3 bandwidth tiers: High (all features), Medium (standard), Low (fluency only). `CognitiveBandwidth` type and `moodToBandwidth()` mapper added to `ai-coach/index.ts`.
- [x] **Gym Layout (ContentLaunchpad)** — Tabbed layout with Gym (default) and Insights tabs:
 - **Gym tab** — 3 vertical zones gated by cognitive battery:
 - **Zone 1: Daily Stack** — Queries `SpacingEngine.getDueReviews()` for stale items, renders horizontal ticker cards. Click triggers micro-loop navigation.
 - **Zone 2: Build Lab** — Concept Map + Peer Review. Hidden when battery is Low.
 - **Zone 3: Proving Grounds** — Mastery Challenge + Pre-Mortem. Only unlocked on High Focus.
 - **Insights tab** — Restored audit grid: 4 metric cards (objectives coverage, unmapped concepts, content health, concept count), objectives panel with paste-and-parse, harsh insights, concept-by-concept audit with expandable detail rows (health scores, Bloom's level, issues, strengths).
- [x] **Temporal Spacing activated** — `ConceptVerdict` extended with `freshness` and `nextReviewDate`. `SpacingEngine.recordReviewWithQuality()` wired into `completeConcept`, `recordConfusionDrill`, `markSessionMapReconstructed`, `markSessionMastered` with activity-specific quality mappings (SM-2).
- [x] **PeerReview multi-turn** — Refactored from single-turn to 4-stage dialogue (diagnosis pushback defense resolution). Pushback uses `commonPitfalls`/`technicalDetails`.
- [x] **PreMortemActivity** — New activity: derives steps from concept lifecycle, randomly alters one, user identifies the broken step.
- [x] **ConceptMapBuilder mode toggle** — `mode` prop ('guided' | 'free') with toolbar toggle. Free mode skips validation and saves directly.

### Phase 7 — Cognitive Pipeline UI Visibility (Implemented)

Surfaces hidden adaptive intelligence to the learner so the cognitive value proposition is visible, not just backend logic:

- [x] **Daily Stack spacing visibility** — Review cards in `ContentLaunchpad.tsx` now show interval days, ease factor label (Easy/Medium/Hard), and repetition streak. Spacing metrics footer shows retention rate, tracked concepts, overdue count, and adherence percentage with SM-2 explanation.
- [x] **Adaptive intelligence indicator** — `MicroLearningLoopController.tsx` now shows a contextual hint below the phase stepper explaining why the current activity was chosen (velocity-based scaffold, tier context, subject-type routing, confusion detection) and the adaptive loop duration.
- [x] **Diagnostic gap breakdown** — `DiagnosticLaunchSystem.tsx` results phase now shows a concept-level breakdown: green chips for known concepts, amber chips for focus areas/gaps. Previously only showed aggregate score.
- [x] **Flow/struggle state indicator** — `LearningToolbar.tsx` now shows a pulsing green "In Flow" badge when flow state is detected, or an amber "High Load" badge when cognitive load is high. Uses `useFlowState` hook and `getCognitiveLoadLevel()` from learning store.
- [x] **Spacing feedback toast** — After concept completion, `VelocityLearning.tsx` shows a brief toast with the SM-2 quality label (Perfect/Good/Okay/Weak/Missed) and next review interval. `lastSpacingUpdate` stored in `NavigationSliceState` via `createNavigationSlice.ts`.
- [x] **Concept selection reason** — `ConceptProgressIndicator.tsx` now accepts a `selectionReason` prop. `VelocityLearning.tsx` computes the reason from tier, interleaving context, and progress state (e.g., "Building foundations first", "Interleaved from root trunk", "Applying knowledge — leaf concept").
- [x] **Neural reset trigger reason** — `NeuralResetModal.tsx` now shows WHY the reset was triggered: consecutive error count or cognitive load percentage. Displayed as a monospace pill inside the banner.

### Phase 8 — Routing, Data Display & Toast Silver Bullet (Implemented)

Fixes systemic issues across routing, date handling, and toast notifications:

- [x] **Invalid Date fix** — `manager.ts` was storing `Date.now().toString()` (numeric string) as `generatedAt`, which `new Date()` cannot parse. Fixed at source to use ISO string. Added `formatSafeDate()` utility in `utils.ts` that handles numeric strings, ISO strings, and nulls. Applied to `ContentLaunchpad.tsx`, `DocumentView.tsx`, `CloudLibraryModal.tsx`.
- [x] **Date sorting fix** — All date-based sorting in `indexed-db.ts`, `s3-dynamodb.ts`, `SavedResults.tsx`, `CloudLibraryModal.tsx` now uses safe numeric string detection before `new Date()` parsing.
- [x] **Toast deduplication** — `toast.ts` now tracks recent messages with a 2-second dedup window. Same message + type within 2s is suppressed, preventing duplicate toasts (e.g., "Resumed from where you left off" showing twice).
- [x] **Toast theming** — Replaced hardcoded hex colors (`#10b981`, `#ef4444`, etc.) with CSS variable-based theming: `var(--color-surface)` background, `var(--color-text-primary)` text, type-specific border/icon using `var(--color-success/error/warning/primary)`. Uses left-border accent style instead of solid color backgrounds.
- [x] **Gym tab routing fix** — Gym buttons in `ContentLaunchpad.tsx` navigate to `/study/:id?tab=learn&activity=X`. `Study.tsx` URL guard now auto-shows session config modal when no session exists instead of silently redirecting to overview. `handleTabChange` also shows modal instead of blocking with a toast.
- [x] **Duplicate toast ref guard** — `VelocityLearning.tsx` progress recovery effect now uses a `useRef` guard (`progressRestoredRef`) to prevent the "Resumed" toast from firing multiple times on re-renders.

### Planned — Future

- [ ] Multi-device sync (CRDT-lite field merging)
- [ ] Analytics pipeline (metaphor usage, session metrics, G/Q tracking)

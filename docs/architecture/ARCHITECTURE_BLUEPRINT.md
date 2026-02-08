# SensaPBL Architecture Blueprint

> Last Updated: February 8, 2026

---

## 1. System Overview

SensaPBL is an AI-powered learning platform that generates structured educational content from any subject, then guides users through a multi-phase learning session with adaptive pacing, diagnostic assessments, and mastery challenges.

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
| Infrastructure | Terraform (modules: Lambda, API Gateway, DynamoDB, Cognito, S3) |
| CI/Deployment | Terraform apply from `infra/terraform/environments/pilot/` |

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                         │
│  Pages → Hooks → Stores → Features → API Client                │
└──────────────┬──────────────────────────────┬───────────────────┘
               │                              │
               │ /api/v1/concepts/*           │ /api/v1/auth/*
               │ /api/v1/content/*            │ /api/v1/proxy/*
               ▼                              ▼
┌──────────────────────────────┐  ┌───────────────────────────────┐
│   EXPRESS BACKEND (Node.js)  │  │      AWS COGNITO              │
│   - Auth middleware          │  │   - User pools                │
│   - Concepts proxy to Lambda │  │   - OAuth 2.0 + PKCE          │
│   - Content CRUD             │  │   - HttpOnly cookie tokens    │
└──────────────┬───────────────┘  └───────────────────────────────┘
               │
               │ Lambda Invoke
               ▼
┌──────────────────────────────────────────────────────────────────┐
│                    AWS LAMBDA (Python 3.12)                       │
│                                                                   │
│  ┌─────────────────────┐    ┌──────────────────────┐             │
│  │  generate_concepts   │    │   query_concepts      │             │
│  │  - classify_subject  │    │   - Paginated queries  │             │
│  │  - parallel generate │    │   - Tier filtering     │             │
│  │  - store to DynamoDB │    │   - Subject management │             │
│  └──────────┬──────────┘    └──────────┬───────────┘             │
│             │                          │                          │
│             ▼                          ▼                          │
│  ┌──────────────────┐      ┌──────────────────┐                  │
│  │  AWS Bedrock      │      │  AWS DynamoDB     │                  │
│  │  (Claude 3 Sonnet)│      │  - concepts table │                  │
│  └──────────────────┘      │  - jobs table     │                  │
│                             └──────────────────┘                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Content Generation Pipeline

This is the only active generation path. The legacy TypeScript multi-phase orchestrator has been removed.

### Flow

```
User enters subject + context
        │
        ▼
Frontend: generateWithBackend()
        │
        ▼
conceptsApi.generate() → POST /api/v1/concepts/generate
        │
        ▼
Express backend proxies to Lambda (generate_concepts)
        │
        ▼
Lambda handler.py:
  1. classify_subject() → Bedrock call → returns { subjectType, classification, macroStructure }
  2. Parallel generate_concepts() with classification context → Bedrock calls
  3. Post-process: assign tiers, stages, validate
  4. Store concepts + classification in DynamoDB (jobs table + concepts table)
  5. Return { jobId, sessionId, conceptCount, classification }
        │
        ▼
Frontend polls job status via GET /api/v1/concepts/jobs/:jobId
  - Receives classification data when job completes
        │
        ▼
Frontend fetches concepts via GET /api/v1/concepts?sessionId=...
        │
        ▼
buildDocumentFromConcepts() → includes classification in JSON document
        │
        ▼
parseAndLoadContent() → parseDomainAnalysis() extracts classification
        │
        ▼
transformToLearningStages() → uses macroStructure for type-aware stages
        │
        ▼
loadSession() → stores subjectType + macroWorkflow in CurrentSession
        │
        ▼
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
├── App.tsx                    # Root component, routing
├── contexts/
│   └── ContentContext.tsx     # Content provider (used by main.tsx)
├── pages/                     # Full page views
│   ├── Home.tsx               # Landing page
│   ├── Generate.tsx           # Content generation UI
│   ├── Study.tsx              # Study session entry + hydration
│   ├── VelocityLearning.tsx   # SENSA v2.0 learning engine
│   ├── SavedResults.tsx       # Library of generated content
│   ├── Settings.tsx           # User preferences
│   ├── Login.tsx / SignUp.tsx  # Auth pages
│   └── DocumentView.tsx       # Raw document viewer
│
├── components/                # UI components
│   ├── ui/                    # Generic (EquationTracker, FlowProgressBar, etc.)
│   ├── learning/              # Learning-specific
│   │   ├── activities/        # BlankSheet, ConfusionDrill, Quiz, ConceptMapBuilder
│   │   ├── session/           # SessionStartModal, VelocityLockInGate
│   │   ├── onboarding/        # DiagnosticLaunchSystem
│   │   ├── feedback/          # SkipReasonModal
│   │   ├── ui/                # PhaseNavigator, SensaSynopticView
│   │   └── MicroLearningLoopController.tsx  # Core learning loop orchestrator
│   ├── generation/            # CognitiveStream (animated generation thoughts)
│   ├── layout/                # AppLayout, Sidebar
│   └── error/                 # ErrorBoundary
│
├── features/                  # Business logic by domain
│   ├── content-generation/    # AI content generation
│   │   ├── api/               # backend-client.ts, claude-client.ts
│   │   ├── parsers/           # json-parser.ts, transformer.ts, ai-integration.ts
│   │   ├── validators/        # content-quality.ts, tier-progression.ts
│   │   └── generators/        # dependency-parser.ts, json-merger.ts, tier-calculator.ts
│   ├── learning-session/      # Learning activities
│   │   ├── activities/        # confusion-generator.ts, diagnostic-generator.ts
│   │   ├── algorithms/        # concept-selection.ts, spacing-engine.ts, interleaving.ts
│   │   ├── phases/            # preview-ai.ts, build-ai.ts, retain-ai.ts, score-map.ts
│   │   ├── progress/          # session-tracker.ts (throttled localStorage persistence)
│   │   └── scoring/           # blank-sheet-scorer.ts
│   ├── content-storage/       # Save/load content
│   │   ├── cloud/             # s3-dynamodb.ts
│   │   ├── local/             # indexed-db.ts, browser-storage.ts
│   │   ├── sync/              # import.ts, sync-engine.ts
│   │   ├── manager.ts         # StorageManager (orchestrates cloud + local)
│   │   └── types.ts           # SavedResult, StorageProvider interfaces
│   ├── ai-coach/              # AI coach personas and voice
│   ├── personalization/       # User preference features
│   └── social/                # Social learning types (PeerReview)
│
├── store/                     # Zustand state management
│   ├── auth-store.ts          # Authentication state
│   ├── generation-store.ts    # Generation jobs, progress, classification
│   ├── learning-store.ts      # Composed from slices (below)
│   ├── personalization-store.ts # Metaphors, stress-free mode, practice mode
│   ├── theme-store.ts         # Dark/light theme
│   ├── ui-store.ts            # UI state
│   └── slices/                # Learning store slices
│       ├── createSessionSlice.ts     # Session lifecycle (load, clear, start)
│       ├── createNavigationSlice.ts  # Concept navigation + progress persistence
│       ├── createStudySlice.ts       # Study session state machine
│       ├── createCognitiveSlice.ts   # Cognitive load tracking
│       ├── createDiagnosticSlice.ts  # Diagnostic assessment state
│       ├── createFocusSlice.ts       # Focus/flow state management
│       ├── createUISlice.ts          # UI state (celebrations, modals)
│       └── types.ts                  # CurrentSession, UserProgress, etc.
│
└── shared/                    # Cross-cutting utilities
    ├── api/                   # API client, concepts API
    ├── hooks/                 # useLearningFlow, useSensaFlow, useFlowState, useGenerationEngine
    ├── types/                 # learning.ts, macro-workflow.ts, sensa-flow.ts, generation.ts
    ├── constants/             # UI timings, scoring constants
    ├── services/              # audio.ts (unified AudioManager + AudioService), exam-objectives-fetcher.ts
    └── utils/                 # content-loader.ts, toast.ts, score-utils.ts
```

### Key Frontend Patterns

- **Zustand slices** — Learning store is composed from session, navigation, and study slices
- **Ref-based cleanup** — Unmount effects use refs to avoid stale closure cascades
- **Throttled persistence** — Session progress saves are throttled (2s) with flush-on-unmount
- **Modular CSS** — All styling via `.module.css` files, no global CSS classes

---

## 5. Backend Architecture

### Express Server (`backend/src/`)

```
backend/src/
├── core/
│   └── server.ts              # Express app, middleware, route mounting
├── features/
│   ├── auth/routes/           # /api/v1/auth — Cognito token exchange
│   ├── concepts/routes/       # /api/v1/concepts — Proxy to Lambda
│   ├── content/routes/        # /api/v1/content — Content CRUD
│   └── proxy/routes/          # /api/v1/proxy — Public resource proxy
├── shared/
│   ├── middleware/             # auth.ts (JWT verify), error-handler.ts, rate-limit.ts
│   └── types/
│       ├── macro-workflow.ts  # Classification types (shared with frontend)
│       └── grounding.ts       # Source grounding types for content verification
```

### Lambda Functions (`backend/lambda/`)

```
backend/lambda/
├── generate_concepts/
│   ├── handler.py             # Entry point: routes generate/repair actions
│   └── services/
│       ├── bedrock_service.py # classify_subject() + parallel generate_concepts()
│       └── dynamo_service.py  # Job tracking, concept storage, batch writes
├── query_concepts/
│   └── handler.py             # Paginated concept queries, subject management, job polling
├── shared/
│   ├── system_prompt.py       # SILVER_BULLET_PROMPT + classification prompt
│   └── utils.py               # CORS, API response helpers, DynamoDB key builders
└── requirements.txt
```

---

## 6. Infrastructure (Terraform)

```
infra/terraform/
├── main.tf                    # Root module: wires Cognito, S3, DynamoDB, Lambda, API Gateway
├── modules/
│   ├── cognito/               # User pool, app client, domain
│   ├── dynamodb/              # concepts table (GSI1 for tier queries), jobs table
│   ├── lambda/                # generate_concepts (15min timeout), query_concepts (30s)
│   ├── api_gateway/           # HTTP API with Lambda integrations
│   └── s3/                    # Content storage bucket
├── bootstrap/                 # One-time setup: S3 state bucket + DynamoDB lock table
│   └── main.tf
└── environments/
    ├── pilot/                 # Pilot environment (S3 backend)
    │   ├── main.tf
    │   ├── terraform.tfvars
    │   └── variables.tf
    └── prod/                  # Production environment (S3 backend)
        ├── main.tf
        ├── terraform.tfvars
        └── variables.tf
```

### Key Infrastructure Details

- **Region**: us-east-1
- **Generate Lambda**: 3008 MB memory, 900s timeout (15 min for LLM calls)
- **Query Lambda**: 512 MB memory, 30s timeout
- **API Gateway**: `https://c4kxjdukwj.execute-api.us-east-1.amazonaws.com`
- **DynamoDB tables**: `sensapbl-concepts-pilot`, `sensapbl-jobs-pilot`

---

## 7. Data Flow & Storage

### DynamoDB Schema

**Concepts Table** (`sensapbl-concepts-pilot`)
- PK: `USER#{userId}#SESSION#{sessionId}`
- SK: `TIER#{tier}#CONCEPT#{conceptId}` or `SUBJECT#{sessionId}`
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

### 5-Phase Flow

```
PRIME → BUILD → MASTER → COMPLETE
  │
  └── DIAGNOSE (optional, on first visit)
```

| Phase | Purpose | Key Component |
|-------|---------|--------------|
| PRIME | Lock-in: set goal, duration, primer | VelocityLockInGate, SessionStartModal |
| DIAGNOSE | Assess prior knowledge | DiagnosticLaunchSystem |
| BUILD | Core learning loop | MicroLearningLoopController |
| MASTER | Mastery challenges | MasteryChallenge, ConceptMapBuilder |
| COMPLETE | Summary dashboard | (Future: MasteryDashboard) |

### Micro Learning Loop (BUILD phase)

Each concept cycles through:
1. **Teach** — Present the concept with mnemonic anchor
2. **Blank Sheet** — Recall from memory (fuzzy-scored)
3. **Confusion Drill** — Distinguish from similar concepts
4. **Quiz** — Multiple choice assessment
5. **Outcome** — mastered / needs-review / needs-learning → next concept

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
Login page → Cognito Hosted UI (OAuth 2.0 + PKCE)
    │
    ▼
Callback → Exchange code for tokens
    │
    ▼
Express backend sets HttpOnly cookies (access + refresh tokens)
    │
    ▼
All API calls include cookies → auth middleware verifies JWT
    │
    ▼
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

## 11. Feature Map

### Implemented

- [x] AI content generation with subject classification (4 types)
- [x] Macro workflow blueprint (type-aware stage generation)
- [x] Multi-tier concept organization (foundation, keystone, utility)
- [x] SENSA v2.0 learning flow (PRIME → BUILD → MASTER)
- [x] Micro learning loop (teach → blank sheet → confusion drill → quiz)
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
- [x] Dark/light theme

### Planned — Near Term

- [x] SCOUT phase (pre-learning overview) — SessionScoutPreview wired into VelocityLearning
- [x] PREVIEW phase (content preview before study) — Nomenclature Sprint + Gap Priming steps
- [x] MasteryDashboard (COMPLETE phase summary) — Grade, equation breakdown, tier coverage
- [x] Audio interrupt service (priority-based queue) — playWithPriority(), fade, queue processing
- [x] Struggle detector (interaction velocity heuristic) — useStruggleDetector wired into VelocityLearning
- [x] Production environment (Terraform `prod/`) — Full config with production URLs
- [x] S3 backend for Terraform state — Bootstrap module + both envs use S3 backend

### Phase 2 — Blueprint-Formula Integration (Implemented)

The classification system (Type A/B/C/D) now feeds back into the learning formula via `blueprint-formula.ts`:

- [x] **G baseline scoring** — `calculateGBaseline()` maps classification confidence → G value (procedural: 0.85, conceptual: 0.80, cyclic: 0.75, perceptual: 0.70)
- [x] **Type-aware Q metrics** — `calculateTypeAwareMetrics()` adapts Q_f, Q_M, Q_P per subject type:
  - Procedural: stage completion rate, checkpoint pass rate, hands-on time
  - Conceptual: move fluency, novel problem success, deliberate case work
  - Cyclic: cycle completion rate, insight per cycle, loop quality
  - Perceptual: pattern exposure rate, discrimination accuracy, perception drills
- [x] **Feedback loop** — `detectBlueprintMismatch()` detects low I + high effort → suggests reclassification, adjusts G
- [x] **Blueprint-Formula dashboard** — `BlueprintFormulaDashboard` component shows G, type-aware Q labels, feedback alerts, recommendations

### Phase 3 — Silver Bullet Audit Fixes (Implemented)

Full audit documented in `docs/architecture/AUDIT_SILVER_BULLET.md`. Key changes:

- [x] **Shared example synthesis** — `synthesizeExample()` extracted to `src/shared/utils/example-synthesis.ts`, eliminates duplication between WorkedExample and FadedExample phases
- [x] **Type-aware activity selection** — `MicroLearningLoopController` accepts `subjectType` prop, selects post-confusion activity per classification (procedural→transfer, conceptual→transfer, cyclic→social, perceptual→transfer)
- [x] **Blueprint-Formula dashboard wired** — `updateTypeAwareMetrics()` called in `handleLoopComplete` with real cognitive metrics, dashboard now receives live data
- [x] **PeerReviewActivity rebuilt** — Generates misconceptions from `commonPitfalls` and same-tier concept confusion; validates correction via keyword scoring
- [x] **CreativeTransferActivity rebuilt** — Type-aware scenario templates (procedural/conceptual/cyclic/perceptual); keyword-based response scoring replaces length check
- [x] **MasteryChallenge real scoring** — Automated keyword + concept-name coverage scoring replaces self-assessment honor system; shows score %, matched terms, missed terms
- [x] **NomenclatureSprint verb-object matching** — Match pairs now include `howToUse` steps alongside metaphor anchors for action-oriented recall
- [x] **VerifyPhase better distractors** — Fallback distractors pulled from other concepts' hook sentences and key points instead of generic templates
- [x] **FadedExample fuzzy validation** — Input validated via word-overlap against step text (30% threshold) instead of `length > 3`
- [x] **App.tsx cleanup** — Removed dead commented bionic reading code
- [x] **Home.tsx universal search** — Search placeholder changed to "Enter any subject to learn..." to feel universal

### Planned — Future

- [ ] Multi-device sync (CRDT-lite field merging)
- [ ] Analytics pipeline (metaphor usage, session metrics, G/Q tracking)

# SensaAI — Master Context Document

**Last Updated:** February 20, 2026
**Status:** MANDATORY — Read this before touching any code.

---

## What Is SensaAI?

SensaAI is an AI-powered exam preparation platform that generates hierarchical learning content from any subject, then guides learners through a scientifically-grounded study loop. It is NOT a flashcard app. It is NOT a quiz app. It is a structured learning velocity engine.

---

## The 5 Non-Negotiable Truths

### 1. The Tier System Is Trunk → Branch → Leaf

| Tier | Role | Distribution |
|------|------|-------------|
| **Trunk** | Main exam domain/objective. Top-level container. | ~15-20% |
| **Branch** | Sub-topic within a trunk. Groups related knowledge. | ~35-50% |
| **Leaf** | Granular testable concept. Exam-level detail. | ~30-50% |

**FORBIDDEN tier names:** `root`, `foundation`, `keystone`, `utility`.
The `tier` field is LLM-declared via the `treeLevel` field in generation, not computed.
For legacy content lacking explicit trunk-tier concepts, `SessionScoutPreview` and `ContentLaunchpad` infer trunks from `trunkDomain` or `parentName` fields.

### 2. Every Color Must Be a CSS Variable

Zero hardcoded hex/rgb values in `.module.css` files. The ONLY file that may contain raw hex values is `src/index.css` (the design system source of truth).

Use: `var(--color-accent)`, `var(--color-text-dark)`, `var(--overlay-primary-10)`
Never: `#6B46C1`, `rgb(107, 70, 193)`, `rgba(0,0,0,0.5)` in component CSS.

See: [Styling Specifications](./styling-specifications.md)

### 3. The Learning Loop Is a 3-Phase Cycle Per Concept

```
Test (Predict & Expose Gaps) → Encode (Build Understanding) → Verify (Confirm Retention)
```

Each concept goes through this micro-loop. The macro flow is a 5-step session:
```
Step 0: PRIME (mood + intent)
Step 1: SCOUT (structure + nomenclature sprint + gap priming)
Step 2: BUILD (concept map construction)
Step 3: STUDY (the 3-phase micro-loop per concept)
Step 4: APPLY (mastery challenge)
```

See: [Feature Success Criteria](./FEATURE_SUCCESS_CRITERIA.md)

### 4. AI-Generated Data Must Be Used, Not Ignored

Every field on `LearningConcept` exists because it was generated with purpose. If a field is available, the UI and algorithms MUST consume it. Do not hardcode content that the AI already generates.

**Rich fields that MUST be surfaced:**
- `lifecycle.phase1/2/3.title` and `.steps` → Section titles in LearnPhase
- `connections[].type` (requires/enables/etc.) → Concept ordering + transition messages
- `shape.highStakesExample` → High-stakes scenario in LearnPhase
- `shape.patternRecognition.question` → Preview AI questions
- `shape.simpleCore` → Hints and fallback descriptions
- `commonPitfalls` → Critical Clarifications section + Interrogator misconceptions
- `trunkDomain` + `parentName` → Breadcrumb hierarchy in UI
- `cognitiveLevel` → Bloom's badge + difficulty scoring
- `outdegree` → Concept ordering priority
- `perspectives` → Creator's Blueprint switcher in DrillDownCard

See: [Type System](./type-system.md)

### 5. The Folder Structure Is Law

```
src/
├── features/          ← Business capabilities (content-generation, learning-session, ai-coach)
├── shared/            ← Cross-cutting utilities, hooks, types, constants, services
├── components/        ← Reusable UI (learning/, ui/, dashboard/, settings/, layout/)
├── pages/             ← Route-level orchestrators (minimal logic)
├── store/             ← Zustand stores
└── styles/            ← Global CSS (animations)
```

**FORBIDDEN folders:** `src/lib/`, `src/hooks/`, `src/constants/`, `src/services/`, `src/utils/`, `src/helpers/`, `src/common/`

**Import hierarchy:** Pages → Features → Components → Shared → (nothing)
Features CANNOT import from other features. Shared CANNOT import from features.

See: `.cursorrules` for full decision tree.

---

## Document Index

| Document | Focus |
|----------|-------|
| [Styling Specifications](./styling-specifications.md) | CSS variable catalog, theme system, forbidden patterns |
| [Type System](./type-system.md) | Core interfaces, LearningConcept contract, tier/lifecycle/connection types |
| [Generation Pipeline](./generation-pipeline.md) | Prompt → Lambda → parser → store → UI, backend architecture, deployment |
| [Implementation Guide](./implementation-guide.md) | Code patterns, anti-patterns, operational pitfalls, checklists |
| [Authentication](./authentication.md) | Cognito OAuth PKCE, auth store, session management, security model |
| [Content Storage](./content-storage.md) | StorageManager, DynamoDB schema, IndexedDB, sync engine |
| [Visual Theme System](./VISUAL_THEME_SYSTEM.md) | Playful vs Scholarly theme modes (4 combinations) |

---

## Access Control

Generation is restricted to an allowlist of approved email addresses. Both frontend and backend enforce this independently:
- **Backend:** `backend/lambda/shared/utils.py` → `ALLOWED_GENERATOR_EMAILS`, `is_generation_allowed(event)` (extracts `email` with `username`/`cognito:username` fallback from Cognito claims) — returns 403 for non-allowlisted users
- **Frontend:** `src/shared/constants/generator-allowlist.ts` → `isGenerationAllowed()` — hides generate UI for non-allowlisted users
- Repair and suggest_structure actions are NOT gated

---

## Exam Catalog System

**Directory:** `src/shared/constants/exam-catalogs/`

41 certification exams across 7 providers (AWS, Microsoft, CompTIA, Google Cloud, Cisco, PMI, ISC2). Each entry has typed domains with tasks and weights. Home.tsx unified search searches `ALL_CERTS` by name/code/provider. Selected cert domains become trunks, tasks become context objectives for generation.

---

## Quick Reference: Where Things Live

| Need to... | Go to... |
|-----------|---------|
| Add a CSS color | `src/index.css` `:root` block |
| Add a shared type | `src/shared/types/` |
| Add a learning activity | `src/components/learning/activities/` |
| Add an algorithm | `src/features/learning-session/algorithms/` |
| Add a generation parser | `src/features/content-generation/parsers/` |
| Add a Zustand store | `src/store/` |
| Add a reusable hook | `src/shared/hooks/` |
| Add activity draft autosave | `useActivityAutosave` in `src/shared/hooks/` + key in `storage-keys.ts` |
| Add a reusable UI component | `src/components/ui/` |
| Add a page/route | `src/pages/` |
| Modify AI coach behavior | `src/features/ai-coach/` |
| Modify concept storage | `src/features/content-storage/` |

---

## Naming Convention

- **User-facing brand:** SensaAI
- **Internal prefix:** `sensapbl-*` (AWS resources, DynamoDB tables, Lambda functions, Cognito, S3 buckets)
- Do NOT rename infrastructure resources — only user-visible strings (UI text, page titles, share messages) use "SensaAI"

---

## Environments

The architecture uses exactly **two environments**: `dev` and `prod`. No other environment names are permitted.

| Environment | Terraform Directory | Cognito Domain Prefix | Resource Suffix |
|-------------|--------------------|-----------------------|-----------------|
| **dev** | `infra/terraform/environments/dev/` | `sensapbl-dev` | `-dev` |
| **prod** | `infra/terraform/environments/prod/` | `sensapbl-prod` | `-prod` |

**FORBIDDEN environment names:** `staging`, `pilot`, `test`, `qa`, `uat`, `sandbox`, `preprod`.

- All AWS resources follow the pattern `sensapbl-{resource}-{env}` (e.g. `sensapbl-concepts-dev`, `sensapbl-jobs-prod`)
- Local development uses the `dev` backend — see `.env.example`
- Production uses the `prod` backend — see `.env.production.example`
- Amplify deploys against `dev` for the main branch

---

## Routes

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
| `/community` | CommunityLibrary | Protected |
| `/view/:id` | DocumentView | Protected |

Global overlays always mounted in `App.tsx`: `SettingsPanel` (slide-out), `BackgroundJobToast`.

---

## State Management (Zustand Stores)

| Store | File | Manages |
|-------|------|---------|
| `useUIStore` | `ui-store.ts` | Settings panel open/close |
| `useThemeStore` | `theme-store.ts` | Light/dark/system + visual theme (playful/scholarly) |
| `usePersonalizationStore` | `personalization-store.ts` | Persona, coach intensity, practice mode, stress-free mode, semester date |
| `useGenerationStore` | `generation-store.ts` | Generation jobs, progress, subjectType, macroWorkflow |
| `useLearningStore` | `learning-store.ts` | Composed from 7 slices: session, navigation, study, cognitive, diagnostic, focus, UI. Study slice persists equation values via `updateSessionEquation()`. |
| `useAuthStore` | `auth-store.ts` | Authentication state |

Settings toggles wire to `usePersonalizationStore` and `useThemeStore`. The `SettingsPanel` reads/writes these stores directly. There is no `/settings` route.

---

## Current Tech Stack

- **Framework:** React 19 + TypeScript 5.7+ (strict)
- **Build:** Vite 6.0
- **Styling:** CSS Modules (`.module.css`) — NO Tailwind in components
- **State:** Zustand (stores in `src/store/`)
- **Routing:** React Router 7
- **Icons:** Lucide React
- **Animation:** Framer Motion
- **Backend:** AWS Lambda (Python 3.12) + API Gateway + DynamoDB + S3
- **AI:** AWS Bedrock (Claude Sonnet 4) for generation, Claude Haiku for gym activities
- **Auth:** AWS Cognito (OAuth 2.0 + PKCE, HttpOnly cookies)
- **Infra:** Terraform (S3 backend for state)

## Deployment Infrastructure

| Resource | Details |
|----------|---------|
| **Amplify** | App `SensaArchitect` (ID: `dckqci84h8ffk`), branch `main`, auto-deploys on push |
| **Production URL** | `https://main.dckqci84h8ffk.amplifyapp.com` |
| **API Gateway (dev)** | HTTP API `c4kxjdukwj`, stage `$default` |
| **API Gateway (prod)** | HTTP API `v44xa62zee`, stage `$default` |
| **Lambda Functions** | `sensapbl-generate-concepts-{dev,prod}`, `sensapbl-query-concepts-{dev,prod}`, `sensapbl-gym-ai-{dev,prod}`, `sensapbl-auth-{dev,prod}` |
| **DynamoDB Tables** | `sensapbl-concepts-{dev,prod}`, `sensapbl-jobs-{dev,prod}` |
| **Cognito (dev)** | User Pool `us-east-1_xNWax9wkH`, domain `sensapbl-dev` |
| **Cognito (prod)** | User Pool `us-east-1_Af8EHbmfU`, domain `sensapbl-prod` |
| **S3 Buckets** | `sensapbl-{dev,prod}-content-311964231104` (content), `sensapbl-terraform-state` (TF state) |
| **Region** | `us-east-1` |

---

## Key Files Quick Reference

| File | Why It Matters |
|------|---------------|
| `src/App.tsx` | All routes. Mounts global overlays. |
| `src/components/settings/SettingsPanel.tsx` | Consolidated settings UI |
| `src/components/learning/session/SessionStartModal.tsx` | Mood-based session curation. Exports `MOOD_GOAL_MAP`. |
| `src/components/learning/MicroLearningLoopController.tsx` | Core learning loop orchestrator |
| `src/components/learning/cognitive-matrix/CognitiveMatrixGridParts.tsx` | DrillDownCard — renders Creator's Blueprint (perspectives switcher) + shape lenses |
| `src/components/learning/cognitive-matrix/buildMatrixPayload.ts` | Builds `DrillDownAction` payload including `perspectives` |
| `src/pages/VelocityLearning.tsx` | SENSA v2.0 learning engine |
| `src/features/content-audit/audit-engine.ts` | Content health + objective alignment scoring |
| `src/shared/constants/theme-colors.ts` | All color constants, mood colors, graph colors |
| `src/index.css` | Design system single source of truth |
| `backend/lambda/shared/system_prompt.py` | Generation prompts (classification + tree generation + gap-fill + scope-creep rules) |
| `backend/lambda/generate_concepts/services/bedrock_service.py` | LLM calls, tree validation, post-processing |
| `backend/lambda/shared/utils.py` | CORS, API helpers, DynamoDB keys, generator allowlist |
| `src/shared/constants/generator-allowlist.ts` | Frontend generation access control |
| `src/shared/constants/exam-catalogs/index.ts` | 41 certification exam catalog (ALL_CERTS) |
| `src/shared/api/concepts.ts` | Full concepts API surface |

---

## Enforcement

These docs are not suggestions. They are contracts. If you find code that violates them, fix it. If you're about to write code that violates them, stop and find the correct pattern in these docs first.

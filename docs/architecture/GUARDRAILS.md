# SensaPBL Guardrails

> A pre-flight checklist for AI tools and prompters working on this codebase.
> Read this before making changes. Update it when the architecture shifts.

---

## 1. Codebase Rules

| Rule | Detail |
|------|--------|
| Styling | Modular CSS only (`.module.css`). No Tailwind, no global classes. |
| No comments | Do not add or remove code comments unless explicitly asked. |
| No duplicate code | Before writing new logic, search for existing implementations. Consolidate if duplicates exist. |
| No env edits | Never modify `.env` files or environment variables. |
| Package.json | Keep `package.json` up to date when adding/removing dependencies. |
| Folder structure | All code must live in the correct domain folder (see §2). Do not create files at random locations. |
| No markdown docs | Do not create markdown files for newly implemented features unless asked. |
| Imports at top | All imports must be at the top of the file. Never import mid-file. |

---

## 2. Where Things Live

| Domain | Location | What goes here |
|--------|----------|---------------|
| Pages | `src/pages/` | Full-page route components only |
| Generic UI | `src/components/ui/` | Reusable widgets (buttons, toasts, indicators) |
| Learning components | `src/components/learning/` | Activities, session, onboarding, feedback, launchpad, toolbar, UI |
| Settings | `src/components/settings/` | `SettingsPanel` (slide-out, always mounted in App.tsx) |
| Dashboards | `src/components/dashboard/` | BlueprintFormulaDashboard, MasteryDashboard |
| Layout | `src/components/layout/` | StudyLayout (unified study command center wrapper) |
| Auth | `src/components/auth/` | ProtectedRoute |
| Storage UI | `src/components/storage/` | CloudLibraryModal |
| Generation UI | `src/components/generation/` | CognitiveStream, AgentCore |
| Business logic | `src/features/` | Organized by domain (content-generation, learning-session, ai-coach, personalization, social, content-storage) |
| State | `src/store/` | Zustand stores. Learning store composed from `slices/` |
| Shared utilities | `src/shared/` | Hooks, types, constants, services, utils |
| Backend | `backend/src/` | Express server (auth, concepts, content, proxy routes) |
| Lambda | `backend/lambda/` | Python 3.12 (generate_concepts, query_concepts) |
| Infrastructure | `infra/terraform/` | Terraform modules + environments |

---

## 3. State Management Quick Reference

| Store | File | Manages |
|-------|------|---------|
| `useUIStore` | `ui-store.ts` | Settings panel open/close |
| `useThemeStore` | `theme-store.ts` | Light / dark / system theme + visual theme (playful / scholarly) |
| `usePersonalizationStore` | `personalization-store.ts` | Persona, voice, coach intensity, practice mode, stress-free mode, metaphor settings, semester date |
| `useGenerationStore` | `generation-store.ts` | Generation jobs, progress, classification |
| `useLearningStore` | `learning-store.ts` | Session, navigation, study, cognitive, diagnostic, focus, UI (composed from slices) |
| `useAuthStore` | `auth-store.ts` | Authentication state |

**Key pattern:** Settings toggles are wired to `usePersonalizationStore` and `useThemeStore`. The `SettingsPanel` reads and writes to these stores directly. There is no separate `/settings` route.

---

## 4. Routes

| Route | Component | Notes |
|-------|-----------|-------|
| `/` | Home | Public. Has settings gear button → `useUIStore.openSettingsPanel()` |
| `/generate/:subject` | Generate | Protected. Content generation flow |
| `/study/:subjectId` | Study | Protected. Unified study command center |
| `/launchpad/:subjectId` | ContentLaunchpad | Protected. Analytics + readiness dashboard |
| `/library` | SavedResults | Protected. Saved content browser |
| `/view/:id` | DocumentView | Protected. Raw document viewer |
| `/login`, `/signup`, `/confirm-signup` | Auth pages | Public |
| `/auth/callback`, `/callback` | AuthCallback | Public. OAuth redirect handler |

**Global overlays** (always mounted in `App.tsx`): `SettingsPanel`, `BackgroundJobToast`.

---

## 5. Learning Engine Phases

```
SCOUT → PREVIEW → PRIME → BUILD → MASTER → COMPLETE
                    │
                    └── DIAGNOSE (optional, first visit)
```

| Phase | Component | What it does |
|-------|-----------|-------------|
| SCOUT | SessionScoutPreview | Pre-learning content overview |
| PREVIEW | NomenclatureSprint | Terminology familiarization + gap priming |
| PRIME | SessionStartModal (Study.tsx) + VelocityLockInGate | Mood selection → auto-curates goal + duration |
| DIAGNOSE | DiagnosticLaunchSystem | Prior knowledge assessment |
| BUILD | MicroLearningLoopController | Teach → BlankSheet → ConfusionDrill → Quiz → Outcome |
| MASTER | MasteryChallenge + ConceptMapBuilder | Mastery-level challenges |
| COMPLETE | MasteryDashboard | Grade, equation breakdown, tier coverage |

---

## 6. Mood-Based Session Curation

Mood selection in `SessionStartModal` auto-sets goal and duration:

| Mood | Goal | Duration | Rationale |
|------|------|----------|-----------|
| Energized ⚡ | velocity | 45 min | Push hard, challenging concepts first |
| Neutral 🧠 | learn-new | 30 min | Full learning lifecycle, balanced mix |
| Tired 🔋 | review | 15 min | Spaced review, familiar concepts |
| Stressed 🌊 | explore | 15 min | Free exploration, easy wins |

Duration and goal are **not** manually selectable — mood is the only input. The mapping lives in `MOOD_GOAL_MAP` inside `SessionStartModal.tsx`.

Mood options are defined in `src/features/ai-coach/index.ts` → `MOOD_OPTIONS`.
Mood colors are in `src/shared/constants/theme-colors.ts` → `MOOD_COLORS`.

---

## 7. Subject Classification System

Every subject is classified before content generation:

| Type | Label | Structure |
|------|-------|-----------|
| A | Procedural | Sequential stages on object lifecycle |
| B | Conceptual | Core moves + application patterns |
| C | Cyclic | Fundamental cycle + meta-awareness |
| D | Perceptual | Perceptual ladder + practice structures |

Classification flows through the entire pipeline: Lambda → DynamoDB → frontend stores → learning phases → formula dashboard.

### Generation Prompt — Knowledge Dimensions

Concepts are generated in 5 parallel parts, each covering a distinct knowledge dimension:

| Part | Dimension | Covers |
|------|-----------|--------|
| 1 | Core Mechanics | Foundations, data structures, terminology, prerequisites |
| 2 | Workflows & Operations | Day-to-day processes, configuration, transformation, modeling |
| 3 | Output & Delivery | Visualization, reporting, publishing, sharing, collaboration |
| 4 | Governance & Infrastructure | Security, access control, compliance, deployment, gateways, admin |
| 5 | Advanced & Ecosystem | Optimization, AI/automation, mobile, integrations, edge cases |

Prompt file: `backend/lambda/shared/system_prompt.py` → `SILVER_BULLET_PROMPT`

**When editing the prompt:**
- Keep dimensions universal — they must work for ANY subject, not just one tool
- Each part generates 20 concepts (100 total across 5 parts)
- The classification type (A/B/C/D) adapts how each dimension is interpreted
- Never hardcode subject-specific examples into the partition strategy

### Connection Type Taxonomy (6 Universal Types)

Every concept connection must use exactly one of these 6 types. There is NO generic fallback.

| Type | Question it answers | Direction |
|------|-------------------|-----------|
| `requires` | What must I know first? | A requires B = B is prerequisite for A |
| `enables` | What does this unlock? | A enables B = learning A makes B possible |
| `is-part-of` | What is this a piece of? | A is part of B = A is component within B |
| `is-type-of` | What category does this belong to? | A is type of B = A is specific instance of B |
| `causes` | What happens because of this? | A causes B = A directly produces B |
| `constrains` | What limits or governs this? | A constrains B = A sets rules/limits on B |

**FORBIDDEN**: `related-to`, `relates`, `extends`, or any vague association.

This taxonomy is enforced in 4 places:
- `backend/lambda/shared/system_prompt.py` — generation prompt §3.4
- `src/components/learning/feedback/ConnectionTypeModal.tsx` — user-facing modal
- `src/features/learning-session/phases/build-ai.ts` — AI suggestion engine
- `src/components/learning/activities/ConceptMapBuilder.tsx` — `LABEL_PRESETS`

---

## 8. Tier System (Root / Trunk / Leaf)

Concepts are classified into 3 tiers **deterministically from the connection graph** — the LLM does NOT assign tiers.

| Tier | Graph Rule | Meaning | Expected % |
|------|-----------|---------|------------|
| `root` | in-degree 0, out-degree ≥ 1 | Entry points — learn these first | ~20% |
| `trunk` | in-degree ≥ 1, out-degree ≥ 1 | Core connectors — the meat of the subject | ~50% |
| `leaf` | out-degree 0 or isolated | Terminal applications — specialized skills | ~30% |

**How it works:**
1. Lambda generates concepts WITHOUT a `tier` field
2. `_compute_tiers_from_graph()` in `bedrock_service.py` builds a directed graph from connections
3. Connection types `requires`, `is-part-of`, `is-type-of` → source depends on target (out-degree for source, in-degree for target)
4. Connection types `enables`, `causes`, `constrains` → target depends on source (reverse direction)
5. Tier is assigned based on in-degree and out-degree per the table above

**Single Source of Truth:** Lambda's `_compute_tiers_from_graph()` is the ONLY tier computation. The frontend `calculateTier()` in `transformer.ts` is a fallback ONLY for concepts missing a tier field (e.g., skeleton recovery concepts). The frontend MUST NOT re-compute or override Lambda-assigned tiers.

**Validation bar (Phase 5):** `_validate_concept()` requires: `name`, `mnemonic` (anchor or story), `shape.simpleCore`, at least 1 connection, and a valid `cognitiveLevel`. Concepts missing connections or cognitiveLevel are rejected before post-processing.

**Phantom connection detection:** `_compute_tiers_from_graph()` counts connections referencing non-existent concepts and warns if >10% are phantom. This prevents silent tier distortion from hallucinated targets across parallel generation parts.

**Domain-adaptive content:** The prompt's §4.1 Domain-Adaptive Field Guide instructs the LLM to fill `phase2`, `phase3`, `workedExample`, and `eliminationLogic` differently per subject type. The JSON schema is identical for all types — only the content interpretation changes. See `docs/DESIRABLE_RESULTS.md` for field-by-field examples.

**Key files:**
- Backend computation (authoritative): `backend/lambda/generate_concepts/services/bedrock_service.py` → `_compute_tiers_from_graph()`
- Backend Bloom's enforcement: `bedrock_service.py` → `_enforce_blooms_distribution()` (≥30% apply+)
- Backend validation: `bedrock_service.py` → `_validate_concept()` (name + mnemonic + simpleCore + connections + cognitiveLevel)
- Backend scoring auto-repair: `bedrock_service.py` → `_validate_scoring_field()` wired in `_post_process_concepts()`
- Prompt domain adaptation: `backend/lambda/shared/system_prompt.py` → §4.1 Domain-Adaptive Field Guide
- Frontend types: `src/shared/types/sensa-flow.ts` → `TierType = 'root' | 'trunk' | 'leaf'`
- Frontend fallback only: `src/features/content-generation/parsers/transformer.ts` → `calculateTier()`
- Audit health scorer: `src/features/content-audit/audit-engine.ts` → `scoreContentHealth()` (includes workedExample)
- UI display: `src/components/learning/ui/SensaSynopticView.tsx` (orbit rings), `SessionScoutPreview.tsx` (tier columns)
- CSS variables: `src/index.css` → `--color-root`, `--color-trunk`, `--color-leaf`
- Desirable results spec: `docs/DESIRABLE_RESULTS.md`
- Cognitive Battery: `src/features/ai-coach/index.ts` → `CognitiveBandwidth`, `moodToBandwidth()`
- Gym Layout: `src/components/learning/launchpad/ContentLaunchpad.tsx` → 3-zone layout (Daily Stack / Build Lab / Proving Grounds)
- Spacing integration: `src/store/slices/createNavigationSlice.ts`, `src/store/slices/createStudySlice.ts` → `SpacingEngine` wired into completion actions
- Activities: `src/components/learning/activities/` → `PreMortemActivity.tsx` (new), `PeerReviewActivity.tsx` (multi-turn), `ConceptMapBuilder.tsx` (guided/free mode)

**FORBIDDEN**: Using `foundation`, `keystone`, or `utility` as tier names anywhere in the codebase. These are legacy names replaced in v2.0.

**FORBIDDEN**: The old 5-option mood system (`pumped/good/okay/struggling/tired`) is deprecated. Use the 3-tier Cognitive Battery (`energized/neutral/tired` → `high/medium/low` bandwidth). The `stressed` value still exists in the `Mood` type for backward compat but is not shown in the UI.

---

## 9. Pre-Change Checklist

Before making any change, verify:

- [ ] **Search first** — Does similar code already exist? Use `grep` / `find` before writing.
- [ ] **Correct folder** — Is the new file in the right domain folder per §2?
- [ ] **Store wiring** — If adding a toggle/setting, is it wired to the correct Zustand store per §3?
- [ ] **No `/settings` route** — Settings live in the `SettingsPanel` slide-out only. No separate page.
- [ ] **Modular CSS** — New styles go in a `.module.css` file alongside the component.
- [ ] **Imports at top** — All imports are at the top of the file.
- [ ] **No comments added** — Unless the user explicitly asked for them.
- [ ] **TypeScript passes** — Run `npx tsc --noEmit` before declaring done.

---

## 10. Post-Change Checklist

After making changes, verify:

- [ ] **No unused imports** — Check for lint warnings about unused variables/imports.
- [ ] **No duplicate code** — Did you introduce logic that already exists elsewhere?
- [ ] **Blueprint updated** — If you changed routes, phases, stores, or directory structure, update `ARCHITECTURE_BLUEPRINT.md`. **Do this automatically, do not ask.**
- [ ] **This file updated** — If you changed architecture patterns, update this guardrail doc. **Do this automatically, do not ask.**
- [ ] **package.json current** — If you added/removed a dependency, update `package.json`.
- [ ] **TypeScript clean** — `npx tsc --noEmit` returns 0 errors.
- [ ] **Lambda deployed** — If you changed `backend/lambda/` code, deploy via AWS CLI (see §11).

---

## 11. Common Pitfalls

| Pitfall | How to avoid |
|---------|-------------|
| Creating a new settings page | Settings are consolidated into `SettingsPanel` slide-out. Add new settings there. |
| Hardcoding audio file paths | Audio files may not exist. Use browser `SpeechSynthesis` API for voice preview. |
| Adding global CSS classes | Use `.module.css` only. Import as `styles` and reference as `styles.className`. |
| Putting business logic in components | Business logic goes in `src/features/`. Components in `src/components/` should be presentational. |
| Creating stores for one-off state | Use `useState` for local state. Only create Zustand stores for state shared across components. |
| Navigating to `/settings` | Use `useUIStore.getState().openSettingsPanel()` instead. |
| Importing mid-file | Always import at the top. If editing, make a separate edit to add imports. |
| Using `relates-to` connections | There is NO generic fallback. Use one of the 6 universal types: requires, enables, is-part-of, is-type-of, causes, constrains. |
| Using inline styles in pages | Use `.module.css` for all styling. Never use `style={{}}` in page components. |
| Duplicating mood mappings | `MOOD_GOAL_MAP` in `SessionStartModal.tsx` is the single source of truth for mood→goal, duration, and store mood. Import it; never re-create. |
| Duplicate toast systems | The app uses a single custom toast system (`@/shared/utils/toast.ts`). Never add Sonner, react-hot-toast, or other toast libraries. |
| Duplicate SessionStartModal | `SessionStartModal` is rendered only in `Study.tsx`. Never render it in `VelocityLearning.tsx` — Study.tsx guards the learn tab and handles session config. |
| Using ContentContext | `ContentContext` was removed. Use `useLearningStore().getConcepts()` to access loaded concepts. |
| Hardcoding cognitive load | Wire to `getCognitiveLoadLevel()` from the learning store's CognitiveSlice. Never hardcode. |
| Skip reason with no routing | When a user skips a concept, differentiate behavior: too-easy → mark mastered (0.85), too-hard → route to root prerequisite, not-relevant → skip cleanly. |
| Empty algorithm fallback | If concept selection algorithms fail, fall back to sequential (next N incomplete concepts). Never pass empty `targetConcepts[]`. |
| Oversized border-radius on modals | Modal/card containers use `var(--radius-xl)` (12px) max. Never exceed 16px on modal containers — larger values read as consumer app. |
| Using red for stressed mood | Stressed mood uses slate (`#64748b`), not red. Red triggers cortisol — the opposite of calming a stressed learner. |
| Perpetual CSS/motion animations | Animations should fire once on mount, not loop infinitely. `repeat: Infinity` is prohibited on non-loading-state elements. |
| Adding paper/grid textures | The crumpled paper texture on `body::before` is the only allowed texture. No grid dots, no additional paper overlays. |
| Saturated dark mode backgrounds | Dark mode backgrounds must stay below ~15% saturation. Current palette: `#16131e` → `#1e1a28` → `#262233`. Never use vivid purple backgrounds. |
| Using old tier names | Never use `foundation`, `keystone`, or `utility` as tier names. The tier system uses `root`, `trunk`, `leaf` — see §8. |
| Silent adaptive logic | When adding adaptive behavior (activity routing, timing, scheduling), always surface a brief explanation to the user. Use `.adaptiveHint` pattern from `MicroLearningLoopController` or `.spacingFooter` pattern from `ContentLaunchpad`. The learner should understand *why* the system made a decision. |
| Raw `new Date(generatedAt)` | Never use `new Date(generatedAt)` directly — legacy data stores numeric strings from `Date.now().toString()`. Always use `formatSafeDate()` from `@/shared/utils/utils` for display, or the inline `safeTime()` pattern for sorting. Source of truth for new records: ISO strings via `new Date().toISOString()`. |
| Hardcoded toast colors | Toast colors must use CSS variables (`var(--color-surface)`, `var(--color-success)`, etc.), never hex values. The toast system in `toast.ts` handles theming internally. |
| Gym activity routing | Gym tab buttons navigate to `/study/:id?tab=learn&activity=X`. Study.tsx reads `activity` param and renders `GymActivityLauncher` (in `src/components/learning/gym/`) instead of VelocityLearning. Valid activities: `concept-map`, `peer-review`, `mastery`, `pre-mortem`. Gym activities bypass `SessionStartModal` — they only need concepts loaded, not a full study session. |
| Gym AI cost management | Gym activities use Claude Haiku (not Sonnet) via `gym-ai-service.ts`. All AI calls are optional — every activity has a keyword-based fallback that runs if AI fails or Bedrock isn't configured. Responses are cached client-side for 30 min per concept. Max tokens per call: 150-400. Never use Sonnet for gym scoring/generation. |
| Uncapped concept map connections | `suggestConnections()` in `build-ai.ts` must enforce: max 3 connections per concept, max 20 total suggestions, and stop suggesting when avg connections/node ≥ 2.5. `STRUCTURAL_PATTERNS` must only match against `keyPoints`/`technicalDetails`, never concept names (e.g., "Limits" ≠ "constrains"). Words appearing in >35% of concept names are auto-stopwords. |

---

## 12. Key Files to Know

| File | Why it matters |
|------|---------------|
| `src/App.tsx` | All routes defined here. Mounts global overlays. |
| `src/components/settings/SettingsPanel.tsx` | Consolidated settings (appearance, AI companion, practice mode, cognitive load, academic schedule, data management) |
| `src/components/learning/session/SessionStartModal.tsx` | Mood-based session curation (PRIME phase entry point). Exports `MOOD_GOAL_MAP` — **single source of truth** for mood→goal+duration+storeMood. |
| `src/store/personalization-store.ts` | Most user preferences live here |
| `src/features/ai-coach/index.ts` | Mood options, persona system, coach utilities |
| `src/components/learning/MicroLearningLoopController.tsx` | Core learning loop orchestrator |
| `src/pages/VelocityLearning.tsx` | SENSA v2.0 learning engine |
| `src/features/content-audit/audit-engine.ts` | Content Audit Engine — 2-track scoring: (1) Content Health = structural completeness (SHAPE, mnemonic, technical depth), (2) Objective Alignment = bigram + token + name-overlap fuzzy matching against user-provided exam objectives. Classifies as objective-aligned / supplementary / not-in-objectives / unverified. Objectives stored in localStorage per subject. |
| `src/features/content-audit/syllabus-parser.ts` | Smart syllabus/exam paper parser — strips numbering, bullets, headers, percentages, weights, answer choices (A-E), question numbers, mark allocations, instructions, answer keys, and junk lines from raw pasted text. Handles both syllabus and exam paper formats. Used by Home page (pre-generation cleanup) and Launchpad (post-generation audit). |
| `src/components/learning/launchpad/ContentLaunchpad.tsx` | Analytics dashboard at `/launchpad/:subjectId` — renders audit results with expandable per-concept verdicts. |
| `src/pages/Study.tsx` | Study session entry + hydration. Reads `activity` query param to render `GymActivityLauncher` for gym activities. |
| `src/features/learning-session/activities/gym-ai-service.ts` | AI-powered gym activity service. Uses Claude Haiku for cost efficiency. Provides: `generateAIMisconception`, `generateAIPushback`, `scoreWithAI`, `generateMasteryScenario`, `scoreMasteryWithAI`, `generateAIBrokenConfig`. All functions return `null` on failure — callers must implement keyword-based fallback. 30-min client-side cache, max 100 entries. |
| `src/components/layout/StudyLayout.tsx` | Unified study command center layout wrapper |
| `src/shared/constants/theme-colors.ts` | All color constants including mood colors, `GRAPH_COLORS` (root/trunk/leaf), lifecycle colors |
| `src/index.css` → `[data-visual-theme="scholarly"]` | Apple-grade scholarly visual theme CSS overhaul — completely different color palette (Apple system colors), SF Pro typography, no glow/texture, crisp shadows, 4 combos (scholarly+light, scholarly+dark, playful+light, playful+dark). Includes `@media print` reset. |
| `src/shared/hooks/useVisualTheme.ts` | `useVisualTheme()` hook + `stripEmoji()` + `scholarlyLabel()` utilities. Used by 22+ components to conditionally strip emojis and swap labels in scholarly mode. Page reloads on theme switch (`theme-store.ts`). |
| `backend/lambda/shared/system_prompt.py` | Generation prompt (classification + silver bullet + surgical fix). Domain-aware partitioning: when user provides exam objectives, `_parse_objective_domains()` splits them into top-level domains and `_distribute_domains_to_parts()` assigns domains to the 5 generation parts so each part covers specific exam domains instead of generic knowledge dimensions. |
| `src/features/content-generation/validators/tier-progression.ts` | Tier access control, ceiling calculation, mastery breakdown. Uses `root/trunk/leaf` tiers (see §8). |
| `docs/architecture/ARCHITECTURE_BLUEPRINT.md` | Full architecture reference |
| `docs/architecture/SYSTEMS_AND_INTERACTIONS.md` | All 16 systems and how they interact |
| `docs/architecture/AUDIT_SILVER_BULLET.md` | Silver bullet audit findings and fixes |

### Lambda Deployment

Terraform S3 backend is currently unavailable. Deploy Lambda code changes via AWS CLI:

```bash
Compress-Archive -Path "backend\lambda\*" -DestinationPath "backend\lambda_deploy.zip" -Force
aws lambda update-function-code --function-name sensapbl-generate-concepts-pilot --zip-file fileb://backend/lambda_deploy.zip --no-cli-pager
aws lambda update-function-code --function-name sensapbl-query-concepts-pilot --zip-file fileb://backend/lambda_deploy.zip --no-cli-pager
aws lambda update-function-code --function-name sensapbl-gym-ai-pilot --zip-file fileb://backend/lambda_deploy.zip --no-cli-pager
Remove-Item "backend\lambda_deploy.zip"
```

---

## 13. For Prompters

When starting a new session with an AI tool on this codebase:

1. **Point the AI to this file first** — paste or reference `docs/architecture/GUARDRAILS.md`
2. **Reference the blueprint for deep context** — `docs/architecture/ARCHITECTURE_BLUEPRINT.md`
3. **Be specific about which domain** — "Fix the mood curation in SessionStartModal" is better than "fix the learning flow"
4. **State the store** — If the change involves state, name the Zustand store
5. **Run TypeScript check** — Always ask the AI to run `npx tsc --noEmit` before finishing
6. **Docs auto-update** — After any architectural change, the AI should automatically update this file and `ARCHITECTURE_BLUEPRINT.md` without being asked

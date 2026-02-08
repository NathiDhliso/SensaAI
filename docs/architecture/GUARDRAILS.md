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
| `useThemeStore` | `theme-store.ts` | Light / dark / system theme |
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
| PRIME | SessionStartModal + VelocityLockInGate | Mood selection → auto-curates goal + duration |
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

---

## 8. Pre-Change Checklist

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

## 9. Post-Change Checklist

After making changes, verify:

- [ ] **No unused imports** — Check for lint warnings about unused variables/imports.
- [ ] **No duplicate code** — Did you introduce logic that already exists elsewhere?
- [ ] **Blueprint updated** — If you changed routes, phases, stores, or directory structure, update `ARCHITECTURE_BLUEPRINT.md`.
- [ ] **This file updated** — If you changed architecture patterns, update this guardrail doc.
- [ ] **package.json current** — If you added/removed a dependency, update `package.json`.
- [ ] **TypeScript clean** — `npx tsc --noEmit` returns 0 errors.

---

## 10. Common Pitfalls

| Pitfall | How to avoid |
|---------|-------------|
| Creating a new settings page | Settings are consolidated into `SettingsPanel` slide-out. Add new settings there. |
| Hardcoding audio file paths | Audio files may not exist. Use browser `SpeechSynthesis` API for voice preview. |
| Adding global CSS classes | Use `.module.css` only. Import as `styles` and reference as `styles.className`. |
| Putting business logic in components | Business logic goes in `src/features/`. Components in `src/components/` should be presentational. |
| Creating stores for one-off state | Use `useState` for local state. Only create Zustand stores for state shared across components. |
| Navigating to `/settings` | Use `useUIStore.getState().openSettingsPanel()` instead. |
| Importing mid-file | Always import at the top. If editing, make a separate edit to add imports. |

---

## 11. Key Files to Know

| File | Why it matters |
|------|---------------|
| `src/App.tsx` | All routes defined here. Mounts global overlays. |
| `src/components/settings/SettingsPanel.tsx` | Consolidated settings (appearance, AI companion, practice mode, cognitive load, academic schedule, data management) |
| `src/store/personalization-store.ts` | Most user preferences live here |
| `src/features/ai-coach/index.ts` | Mood options, persona system, coach utilities |
| `src/components/learning/MicroLearningLoopController.tsx` | Core learning loop orchestrator |
| `src/pages/VelocityLearning.tsx` | SENSA v2.0 learning engine |
| `src/pages/Study.tsx` | Study session entry + hydration |
| `src/components/layout/StudyLayout.tsx` | Unified study command center layout wrapper |
| `src/shared/constants/theme-colors.ts` | All color constants including mood colors |
| `docs/architecture/ARCHITECTURE_BLUEPRINT.md` | Full architecture reference |
| `docs/architecture/AUDIT_SILVER_BULLET.md` | Silver bullet audit findings and fixes |

---

## 12. For Prompters

When starting a new session with an AI tool on this codebase:

1. **Point the AI to this file first** — paste or reference `docs/architecture/GUARDRAILS.md`
2. **Reference the blueprint for deep context** — `docs/architecture/ARCHITECTURE_BLUEPRINT.md`
3. **Be specific about which domain** — "Fix the mood curation in SessionStartModal" is better than "fix the learning flow"
4. **State the store** — If the change involves state, name the Zustand store
5. **Run TypeScript check** — Always ask the AI to run `npx tsc --noEmit` before finishing

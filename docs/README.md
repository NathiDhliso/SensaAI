# SensaAI Documentation

Start here: **[master-prompt.md](./master-prompt.md)** — read this before touching any code.

## Core Documentation

| Document | Focus |
|----------|-------|
| [Master Prompt](./master-prompt.md) | Project overview, routes, stores, infrastructure, key files |
| [Styling Specifications](./styling-specifications.md) | CSS variable catalog, theme system, forbidden patterns |
| [Type System](./type-system.md) | LearningConcept contract, connections, Bloom's taxonomy |
| [Learning Science](./learning-science.md) | 3-phase loop, mood curation, activities, algorithms |
| [Generation Pipeline](./generation-pipeline.md) | Prompt → Lambda → parser → store → UI, backend, deployment |
| [Implementation Guide](./implementation-guide.md) | Code patterns, operational pitfalls, checklists |
| [Authentication](./authentication.md) | Cognito OAuth PKCE, auth store, session management |
| [Content Storage](./content-storage.md) | StorageManager, DynamoDB, IndexedDB, sync engine |

## Feature Documentation

| Document | Focus |
|----------|-------|
| [Visual Theme System](./VISUAL_THEME_SYSTEM.md) | Playful vs Scholarly modes (4 combinations) |
| [Metaphor System](./metaphor-system.md) | useMetaphorContent hook, data flow, toggle architecture |
| [ULC Integration Spec](./ULC_INTEGRATION_SPEC.md) | Universal Life Cycle pattern detection and visualization |
| [Learn How to Learn](./LEARN_HOW_TO_LEARN.md) | 3-phase learning model (Declarative → Procedural → Conditional) |
| [Desirable Results](./DESIRABLE_RESULTS.md) | Field-by-field examples of quality generated content |
| [Gym UX Philosophy](./GYM_UX_PHILOSOPHY.md) | Gym activity design principles |
| [Mastery Scoring Guide](./MASTERY_SCORING_GUIDE.md) | Grade thresholds (S/A/B/C/D) |
| [Feature Success Criteria](./FEATURE_SUCCESS_CRITERIA.md) | Acceptance criteria for all features |

## Testing

| Command | What it does |
|---------|-------------|
| `npx vitest run` | Run unit tests (parser + transformer) |
| `npx playwright test --project=setup-admin --project=setup-learner --project=admin-smoke --project=learner-smoke` | Run smoke tests for admin + learner roles |
| `npx playwright test --project=chromium --project=mobile` | Run unauthenticated UI tests |
| `npx playwright show-report` | Open HTML test report |

Test credentials are in `.env.playwright` (admin: `nkosinathi.dhliso@gmail.com`, learner: `dhlisob@gmail.com`). Auth setup files authenticate via the Login page UI and save storage state for reuse. See [Authentication — E2E Testing](./authentication.md#e2e-testing-playwright) for details.

Smoke tests cover 22 features from [FEATURE_SUCCESS_CRITERIA.md](./FEATURE_SUCCESS_CRITERIA.md) across both admin and learner perspectives.

## Guardrails

Architecture rules live in `.cursorrules` at the project root — automatically loaded by AI tools.

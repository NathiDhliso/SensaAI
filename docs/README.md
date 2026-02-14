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
| [Desirable Results](./DESIRABLE_RESULTS.md) | Field-by-field examples of quality generated content |
| [Gym UX Philosophy](./GYM_UX_PHILOSOPHY.md) | Gym activity design principles |
| [Mastery Scoring Guide](./MASTERY_SCORING_GUIDE.md) | Grade thresholds (S/A/B/C/D) |

## Guardrails

Architecture rules live in `.cursorrules` at the project root — automatically loaded by AI tools.

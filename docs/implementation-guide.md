# Implementation Guide

**Last Updated:** February 12, 2026
**Status:** MANDATORY — Follow these patterns for all new code.

---

## Pattern 1: Component Structure

Every component follows this structure:

```
src/components/[domain]/
├── ComponentName.tsx          ← Component logic
├── ComponentName.module.css   ← Scoped styles (CSS variables ONLY)
└── index.ts                   ← Barrel export (optional)
```

### TSX Rules
- Import order: React → third-party → types → features → components → hooks → styles
- No inline styles unless truly dynamic (computed positions, animations)
- No hardcoded strings that the AI generates (use concept fields)
- No business logic in UI components — delegate to hooks or features

### CSS Module Rules
- All colors via CSS variables from `index.css`
- camelCase class names: `.phaseCard`, `.sectionHeader`
- No `!important`
- Mobile-first responsive design
- Use `var(--spacing-*)` for margins/padding
- Use `var(--radius-*)` for border-radius
- Use `var(--shadow-*)` for box-shadow
- Use `var(--font-size-*)` for font sizes

---

## Pattern 2: Adding a New Learning Activity

1. Create `src/components/learning/activities/ActivityName.tsx`
2. Create `src/components/learning/activities/ActivityName.module.css`
3. Activity receives `concept: LearningConcept` and `onComplete: (success: boolean) => void`
4. USE the rich concept data — don't generate generic content:

```typescript
function MyActivity({ concept, onComplete }: Props) {
  // USE AI-generated content
  const question = concept.shape?.patternRecognition?.question
    || concept.workedExample?.problem
    || `What is ${concept.name}?`;  // fallback LAST

  const hint = concept.shape?.simpleCore
    || concept.hookSentence
    || concept.keyPoints?.[0];

  // USE connections for context
  const prerequisites = concept.connections
    ?.filter(c => c.type === 'requires')
    .map(c => c.target);

  // USE cognitive level for difficulty
  const isAdvanced = concept.cognitiveLevel === 'evaluate'
    || concept.cognitiveLevel === 'create';
}
```

5. Export from `src/components/learning/activities/index.ts`
6. Wire into `MicroLearningLoopController.tsx` or `GymActivityLauncher.tsx`

---

## Pattern 3: Consuming Concept Data (Priority Chains)

Never use a single hardcoded fallback. Always create a priority chain from richest to simplest:

```typescript
// Question generation priority chain
const question =
  concept.shape?.patternRecognition?.question        // 1. AI diagnostic question
  || (concept.commonPitfalls?.[0]                     // 2. Misconception-based
    ? `What is a common misconception about ${concept.name}?`
    : null)
  || concept.workedExample?.problem                   // 3. Worked example problem
  || `What is the purpose of ${concept.name}?`;       // 4. Generic fallback

// Hint priority chain
const hint =
  concept.shape?.simpleCore                           // 1. One-sentence core
  || concept.hookSentence                             // 2. Opening hook
  || concept.keyPoints?.[0]                           // 3. First key point
  || `Consider the relationships with connected concepts`; // 4. Generic
```

---

## Pattern 4: Section Titles in LearnPhase

```typescript
// CORRECT — use lifecycle titles with fallback
const lc = concept.lifecycle;
const hasLifecycle = lc?.phase1?.title && lc?.phase2?.title && lc?.phase3?.title;

const sectionLabels = hasLifecycle
  ? {
      s1Title: lc!.phase1.title,           // e.g., "Configure"
      s1Sub: lc!.phase1.steps?.[0],        // e.g., "Set up the environment"
      s2Title: lc!.phase2.title,           // e.g., "Deploy"
      s3Title: lc!.phase3.title,           // e.g., "Validate"
    }
  : {
      s1Title: 'The Architecture',          // Hardcoded fallback ONLY
      s2Title: 'The Execution',
      s3Title: 'The System Physics',
    };

// WRONG — always hardcoded
const s1Title = 'The Architecture';  // Ignores AI-generated titles
```

---

## Pattern 5: Prerequisite Checking

Always check BOTH `prerequisites[]` (name-based) AND `connections[type=requires]` (semantic):

```typescript
function prerequisitesMet(concept: LearningConcept, allConcepts: LearningConcept[], completed: string[]): boolean {
  const requiredNames = new Set<string>();

  // Name-based prerequisites
  concept.prerequisites?.forEach(p => requiredNames.add(p.toLowerCase()));

  // Semantic connections
  concept.connections
    ?.filter(c => c.type === 'requires')
    .forEach(c => requiredNames.add(c.target.toLowerCase()));

  if (requiredNames.size === 0) return true;

  return Array.from(requiredNames).every(req => {
    const match = allConcepts.find(c =>
      c.name.toLowerCase() === req || c.id === req
    );
    return match ? completed.includes(match.id) : true;
  });
}
```

---

## Pattern 6: Concept Transitions (Context Bridges)

When moving from concept A to concept B, generate a meaningful transition:

```typescript
function createTransition(from: LearningConcept, to: LearningConcept): string {
  // 1. Use semantic connection verb (TRACES types)
  const conn = from.connections?.find(
    c => c.target.toLowerCase() === to.name.toLowerCase()
  );
  if (conn) {
    const verbMessages = {
      'requires': `${to.name} requires ${from.name} — let's build on that foundation.`,
      'enables': `${from.name} enables ${to.name} — time to unlock this next layer.`,
      'is-part-of': `${to.name} is part of ${from.name} — let's zoom in.`,
      'is-type-of': `${to.name} is a type of ${from.name} — a specific variant.`,
      'causes': `${from.name} causes ${to.name} — let's follow the chain.`,
      'constrains': `${from.name} constrains ${to.name} — understanding the boundaries.`,
    };
    return verbMessages[conn.type] || `Building on ${from.name}, let's explore ${to.name}.`;
  }

  // 3. Tier-based fallback
  return `Now shifting to ${to.name}.`;
}
```

---

## Pattern 7: Difficulty Scoring

Always incorporate multiple signals:

```typescript
function getDifficulty(concept: LearningConcept): 'easy' | 'medium' | 'hard' {
  let score = 0;

  // Content complexity
  if ((concept.keyPoints?.length || 0) > 4) score += 2;
  else if ((concept.keyPoints?.length || 0) > 2) score += 1;

  // Tier depth
  if (concept.tier === 'leaf') score += 2;
  else if (concept.tier === 'branch') score += 1;

  // Cognitive demand
  const cog = concept.cognitiveLevel;
  if (cog === 'evaluate' || cog === 'create') score += 2;
  else if (cog === 'analyze' || cog === 'apply') score += 1;

  if (score >= 4) return 'hard';
  if (score >= 2) return 'medium';
  return 'easy';
}
```

---

## Pattern 8: Breadcrumb Hierarchy Display

When showing a concept's position in the tree:

```tsx
{concept.trunkDomain && concept.tier !== 'trunk' && (
  <span className={styles.breadcrumb}>
    {concept.trunkDomain}
    {concept.parentName && concept.parentName !== concept.trunkDomain && (
      <> &rsaquo; {concept.parentName}</>
    )}
    &rsaquo;
  </span>
)}
```

---

## Anti-Pattern Catalog

### Anti-Pattern: Hardcoded Colors
```css
/* WRONG */
.card { background: rgb(107, 70, 193); }
.text { color: rgba(0, 0, 0, 0.6); }

/* CORRECT */
.card { background: var(--overlay-primary-10); }
.text { color: var(--color-text-light); }
```

### Anti-Pattern: Ignoring AI Data
```typescript
// WRONG — hardcoded when AI data exists
const title = "Key Concepts";

// CORRECT — use AI data with fallback
const title = concept.lifecycle?.phase1?.title || "Key Concepts";
```

### Anti-Pattern: Single Prerequisite Source
```typescript
// WRONG — only checks prerequisites[], misses connections
const met = concept.prerequisites?.every(p => completed.includes(p));

// CORRECT — checks both sources
const requiredNames = new Set([
  ...(concept.prerequisites || []),
  ...(concept.connections?.filter(c => c.type === 'requires').map(c => c.target) || [])
]);
```

### Anti-Pattern: Generic Questions
```typescript
// WRONG — ignores rich AI content
const q = `What is ${concept.name}?`;

// CORRECT — priority chain from richest source
const q = concept.shape?.patternRecognition?.question
  || concept.workedExample?.problem
  || `What is ${concept.name}?`;
```

### Anti-Pattern: Hardcoded Tier References
```typescript
// WRONG — old tier system
if (tier === 'root') { ... }
if (tier === 'foundation') { ... }

// CORRECT — current tier system
if (tier === 'trunk') { ... }
if (tier === 'branch') { ... }
if (tier === 'leaf') { ... }
```

### Anti-Pattern: Inline Styles for Theming
```tsx
// WRONG — breaks theme system
<div style={{ color: '#6B46C1', background: 'rgba(0,0,0,0.05)' }}>

// CORRECT — use CSS module with variables
<div className={styles.accentCard}>
// .accentCard { color: var(--color-accent); background: var(--overlay-primary-5); }
```

### Anti-Pattern: Feature-to-Feature Imports
```typescript
// WRONG — features cannot import from each other
// In src/features/ai-coach/index.ts:
import { saveContent } from '@/features/content-storage';

// CORRECT — use shared services or let pages orchestrate
// In src/pages/VelocityLearning.tsx:
import { getCoachMessage } from '@/features/ai-coach';
import { saveProgress } from '@/features/content-storage';
```

---

## Operational Pitfalls (From Production Experience)

### Gym & Activities
- **Gym AI uses Haiku, not Sonnet** — `gym-ai-service.ts` calls Claude Haiku for cost efficiency. All AI calls return `null` on failure — every activity MUST have a keyword-based fallback. 30-min client-side cache, max 100 entries, max 150-400 tokens per call.
- **Gym routing via query params** — Gym tab buttons navigate to `/study/:id?tab=learn&activity=X`. `Study.tsx` reads the `activity` param and renders `GymActivityLauncher`. Valid activities: `concept-map`, `peer-review`, `mastery`, `pre-mortem`. Gym activities bypass `SessionStartModal`.
- **Concept map connection caps** — `suggestConnections()` in `build-ai.ts` enforces: max 3 connections per concept, max 20 total suggestions, stop when avg connections/node ≥ 2.5. `STRUCTURAL_PATTERNS` match against `keyPoints`/`technicalDetails`, never concept names. Words in >35% of concept names are auto-stopwords.
- **Empty algorithm fallback** — If concept selection algorithms fail, fall back to sequential (next N incomplete concepts). Never pass empty `targetConcepts[]`.

### UI & Styling
- **Stressed mood = slate, not red** — Stressed mood uses `#64748b` (slate). Red triggers cortisol — the opposite of calming a stressed learner.
- **Border-radius caps** — Modal/card containers use `var(--radius-xl)` (12px) max. Never exceed 16px — larger values read as consumer app, not institutional.
- **No perpetual animations** — Animations fire once on mount, not loop. `repeat: Infinity` is prohibited on non-loading-state elements.
- **No additional textures** — The crumpled paper texture on `body::before` is the only allowed texture. No grid dots, no additional paper overlays.
- **Saturated dark mode** — Dark mode backgrounds stay below ~15% saturation. Current palette: `#16131e`, `#1e1a28`, `#262233`. Never use vivid purple backgrounds.
- **Toast system is a singleton** — Use `@/shared/utils/toast.ts` only. Never add Sonner, react-hot-toast, or other toast libraries. Toast colors use CSS variables, never hex.

### State & Routing
- **No `/settings` route** — Settings live in `SettingsPanel` slide-out only. Open via `useUIStore.getState().openSettingsPanel()`.
- **SessionStartModal is singular** — Rendered only in `Study.tsx`. Never render in `VelocityLearning.tsx`. `MOOD_GOAL_MAP` in `SessionStartModal.tsx` is the single source of truth for mood→goal+duration.
- **ContentContext was removed** — Use `useLearningStore().getConcepts()` to access loaded concepts.
- **Hardcoded cognitive load** — Wire to `getCognitiveLoadLevel()` from CognitiveSlice. Never hardcode.

### Skip Reason Routing
When a user skips a concept, differentiate:
- **too-easy** → mark mastered (0.85 score)
- **too-hard** → route to trunk prerequisite
- **not-relevant** → skip cleanly

### Date Handling
Never use `new Date(generatedAt)` directly — legacy data stores numeric strings from `Date.now().toString()`. Always use `formatSafeDate()` from `@/shared/utils/utils` for display. New records use ISO strings via `new Date().toISOString()`.

### Adaptive Logic Surfacing
When adding adaptive behavior (activity routing, timing, scheduling), always surface a brief explanation to the user. Use `.adaptiveHint` pattern from `MicroLearningLoopController` or `.spacingFooter` from `ContentLaunchpad`. The learner should understand *why* the system made a decision.

### Connection Types
There is NO generic fallback. Only the 6 universal types: `requires`, `enables`, `is-part-of`, `is-type-of`, `causes`, `constrains`. Using `relates-to`, `relates`, `extends`, or any vague association is **FORBIDDEN**.

Enforced in 4 places:
- `backend/lambda/shared/system_prompt.py` — generation prompt
- `src/components/learning/feedback/ConnectionTypeModal.tsx` — user-facing modal
- `src/features/learning-session/phases/build-ai.ts` — AI suggestion engine
- `src/components/learning/activities/ConceptMapBuilder.tsx` — `LABEL_PRESETS`

---

## Pre-Change Checklist

- [ ] **Search first** — Does similar code already exist? Use grep/find before writing.
- [ ] **Correct folder** — Is the new file in the right domain folder?
- [ ] **Store wiring** — If adding a toggle/setting, is it wired to the correct Zustand store?
- [ ] No hardcoded hex/rgb in `.module.css` files
- [ ] No hardcoded content that AI generates (check lifecycle titles, shape data)
- [ ] No `root`/`foundation`/`keystone` tier references
- [ ] Prerequisite checks use both `prerequisites[]` and `connections[requires]`
- [ ] New fields on LearningConcept are consumed by relevant UI/algorithms
- [ ] CSS uses variables from the design system
- [ ] Imports follow the hierarchy: Pages → Features → Components → Shared
- [ ] No feature-to-feature imports
- [ ] Imports at top of file only
- [ ] Mobile-responsive layout
- [ ] Works in both light and dark mode
- [ ] Works in both playful and scholarly themes

## Post-Change Checklist

- [ ] **No unused imports** — Check for lint warnings
- [ ] **No duplicate code** — Did you introduce logic that already exists?
- [ ] **TypeScript clean** — `npx tsc --noEmit` returns 0 errors
- [ ] **package.json current** — If you added/removed a dependency
- [ ] **Lambda deployed** — If you changed `backend/lambda/` code (see `docs/generation-pipeline.md`)

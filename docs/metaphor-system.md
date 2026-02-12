# Metaphors Feature -- Silver Bullet Implementation Guide

## Overview

The **Metaphors** feature is a content adaptation layer that lets users toggle visual learning aids (analogies, visual anchors, metaphorical explanations) on or off based on their learning preferences. It reduces cognitive load for users who prefer direct technical explanations while enhancing understanding for those who benefit from analogical thinking.

The core principle: **metaphors are filtered through a centralized hook, not scattered as rendering flags across components.**

---

## Architecture

### Data Flow

```
LearningConcept
  shape.simpleCore -----> "Direct technical explanation"
  shape.analogicalModel > "Think of it like a..."
  hookSentence ---------> "Fallback content"
          |
          v
useMetaphorContent(concept)
  Reads: metaphorSettings.showAnalogies
  Reads: metaphorSettings.metaphorComplexity
  Returns: AdaptedContent { coreExplanation, analogicalModel | null }
          |
          v
Component Layer
  Renders coreExplanation always
  Renders analogicalModel only if non-null
```

### Key Principle: Single Source of Truth

- **DO NOT** check `metaphorSettings.showAnalogies` directly in components
- **ALWAYS** use `useMetaphorContent()` to get adapted content
- **THEN** conditionally render based on presence of `analogicalModel`

This ensures:
1. Consistent behavior across all components
2. Easy to add new metaphor types (visual anchors, etc.)
3. Single place to update filtering logic
4. Testable in isolation

---

## Core Components

### 1. Personalization Store

**File:** `src/store/personalization-store.ts`

- Zustand store with localStorage persistence
- `MetaphorSettings` type with 3 controls:
  - `showAnalogies` -- Master toggle for all metaphor content
  - `metaphorComplexity` -- `'simple' | 'rich'` (controls detail level)
  - `allowCustomMetaphors` -- Reserved for user-defined metaphors
- `metaphorGraduation` -- Tracks concept-level metaphor scores (0-100)
- `trackMetaphorUsage()` -- Analytics tracking for metaphor interactions

### 2. MetaphorToggle Component

**File:** `src/features/personalization/components/MetaphorToggle.tsx`

- Two modes: `compact` (header icon) and `full` (settings page)
- Quick toggle button with Eye/EyeOff icons
- Settings panel with granular controls
- Live preview of metaphor effects
- Integrates with visual theme system (scholarly mode strips decorative labels)

### 3. useMetaphorContent Hook

**File:** `src/shared/hooks/useMetaphorContent.ts`

This is the silver bullet. All metaphor filtering flows through this hook.

- Returns `AdaptedContent` object:
  - `coreExplanation` -- Always present (from `shape.simpleCore` or `hookSentence`)
  - `analogicalModel` -- Present only when `showAnalogies` is true and content exists
  - `metaphorComplexity` -- Current complexity setting for downstream use
- `useFormattedContent()` -- Higher-level formatting for display
- `useMetaphorSettings()` -- Quick access to settings + actions

### 4. Content Structure

**File:** `src/shared/types/learning.ts`

- `LearningConcept.metaphor` -- Legacy string field (deprecated)
- `LearningConcept.shape.analogicalModel` -- AI-generated analogy
- `LearningConcept.shape.simpleCore` -- Direct explanation
- `LearningConcept.hookSentence` -- Fallback content

---

## Integration Guide

### Adding Metaphor Support to Any Feature

**Step 1:** Import the hook

```typescript
import { useMetaphorContent } from '@/shared/hooks/useMetaphorContent';
```

**Step 2:** Get adapted content

```typescript
const adaptedContent = useMetaphorContent(concept);
```

**Step 3:** Render conditionally

```typescript
<p>{adaptedContent.coreExplanation}</p>

{adaptedContent.analogicalModel && (
  <div className={styles.analogy}>
    {adaptedContent.analogicalModel}
  </div>
)}
```

**Step 4 (optional):** Track usage

```typescript
const { trackUsage } = useMetaphorSettings();

const handleMetaphorClick = () => {
  trackUsage('metaphor_clicked', concept.id);
};
```

### Implementation Checklist

- [ ] Import `useMetaphorContent` hook
- [ ] Call hook with current concept
- [ ] Use `adaptedContent.coreExplanation` for primary text
- [ ] Conditionally render `adaptedContent.analogicalModel`
- [ ] Respect `adaptedContent.metaphorComplexity` for detail level
- [ ] Test with metaphors ON and OFF
- [ ] Verify no direct `metaphorSettings` checks in component
- [ ] Add metaphor usage tracking (optional)

---

## Integration Status

### Correctly Integrated (uses `useMetaphorContent` or `useMetaphorSettings` hook)

| Component | File | Notes |
|-----------|------|-------|
| SensaSynopticView | `src/components/learning/ui/SensaSynopticView.tsx` | Shows analogical model in concept details panel |
| NeuralResetBanner | `src/components/learning/ui/NeuralResetBanner.tsx` | Displays adapted content in concept explanations |
| SessionScoutPreview | `src/components/learning/session/SessionScoutPreview.tsx` | ConceptChip uses adapted content |
| BlankSheetTest | `src/components/learning/activities/BlankSheetTest.tsx` | Uses `metaphorsEnabled` from hook for metaphor exit strategy scoring |
| MicroLearningLoopController | `src/components/learning/MicroLearningLoopController.tsx` | WorkedExamplePhase and FadedExamplePhase show analogical model between problem and solution |
| ConfusionDrill | `src/components/learning/activities/ConfusionDrill.tsx` | Shows analogies for both concepts in feedback section to help distinguish them |
| CreativeTransferActivity | `src/components/learning/activities/CreativeTransferActivity.tsx` | Shows analogical model as contextual hint in the scenario card |
| PeerReviewActivity | `src/components/learning/activities/PeerReviewActivity.tsx` | Shows analogical model in the initial peer misconception bubble |
| MasteryChallenge | `src/components/learning/activities/MasteryChallenge.tsx` | Uses `useMetaphorSettings` to adapt synthesis prompt (allows analogies when enabled) |

### Not Yet Integrated (deferred)

| Component | File | Reason |
|-----------|------|--------|
| ConceptMapBuilder | `src/components/learning/activities/ConceptMapBuilder.tsx` | No tooltip system exists -- requires building tooltip infrastructure first |
| CoachMessage | `src/features/ai-coach/components/CoachMessage.tsx` | Receives pre-built message strings -- metaphor adaptation must happen at the AI prompt generation level, not the display component |

---

## Migration Guide

### Before (WRONG -- direct check)

```typescript
const { metaphorSettings } = usePersonalizationStore();

return (
  <div>
    <p>{concept.hookSentence}</p>
    {metaphorSettings.showAnalogies && concept.shape?.analogicalModel && (
      <p>{concept.shape.analogicalModel}</p>
    )}
  </div>
);
```

### After (CORRECT -- adapted content)

```typescript
const adaptedContent = useMetaphorContent(concept);

return (
  <div>
    <p>{adaptedContent.coreExplanation}</p>
    {adaptedContent.analogicalModel && (
      <p>{adaptedContent.analogicalModel}</p>
    )}
  </div>
);
```

---

## Common Pitfalls

**DO NOT** check settings in every component:

```typescript
// BAD: Duplicated logic, bypasses the adaptation layer
const { metaphorSettings } = usePersonalizationStore();
if (metaphorSettings.showAnalogies && concept.shape?.analogicalModel) { ... }
```

**DO** use the hook:

```typescript
// GOOD: Centralized logic, single source of truth
const adaptedContent = useMetaphorContent(concept);
if (adaptedContent.analogicalModel) { ... }
```

**DO NOT** assume metaphor fields exist:

```typescript
// BAD: Will crash if shape is undefined
<p>{concept.shape.analogicalModel}</p>
```

**DO** use adapted content with null checks:

```typescript
// GOOD: Safe access, graceful fallback
{adaptedContent.analogicalModel && (
  <p>{adaptedContent.analogicalModel}</p>
)}
```

---

## Performance Considerations

- **Memoization** -- `useMetaphorContent` uses `useMemo` to prevent unnecessary recalculations
- **Store Persistence** -- Zustand persist middleware saves settings to localStorage
- **Lazy Loading** -- Metaphor content only loaded when needed
- **Analytics Throttling** -- `trackMetaphorUsage` is debug-only in production

---

## Testing Strategy

### Unit Tests

```typescript
describe('useMetaphorContent', () => {
  it('returns analogicalModel when showAnalogies is true', () => {
    // Mock store with showAnalogies: true
    // Assert analogicalModel is present
  });

  it('returns null analogicalModel when showAnalogies is false', () => {
    // Mock store with showAnalogies: false
    // Assert analogicalModel is null
  });

  it('simplifies analogy for simple complexity', () => {
    // Mock store with metaphorComplexity: 'simple'
    // Assert analogicalModel is shortened
  });
});
```

### Integration Tests

1. Toggle metaphors OFF -- verify no analogies appear in any activity
2. Toggle metaphors ON -- verify analogies appear in supported activities
3. Switch complexity -- verify analogy detail changes
4. Test with concepts that have no `shape.analogicalModel` -- verify graceful fallback

---

## Roadmap

### Phase 1: Core Integration (complete)
- [x] Personalization store
- [x] MetaphorToggle component
- [x] useMetaphorContent hook
- [x] SensaSynopticView, NeuralResetBanner, SessionScoutPreview integration

### Phase 2: Activity Integration (complete)
- [x] Refactor BlankSheetTest to use hook instead of direct check
- [x] MicroLearningLoopController phases (WorkedExample, FadedExample)
- [x] ConfusionDrill, CreativeTransferActivity, PeerReviewActivity, MasteryChallenge
- [ ] ConceptMapBuilder -- deferred, requires tooltip infrastructure
- [ ] AI Coach message adaptation -- deferred, requires prompt-level changes

### Phase 3: Advanced Features
- [ ] Custom metaphor editor -- allow users to replace system metaphors with personal ones
- [ ] Metaphor graduation system -- auto-fade metaphors as user demonstrates understanding
- [ ] Domain-specific metaphor libraries -- linked to `familiarSystem` in personalization store
- [ ] A/B testing for metaphor effectiveness

### Phase 4: Analytics and Optimization
- [ ] Track metaphor engagement rates
- [ ] Correlate metaphor usage with mastery scores
- [ ] Auto-suggest metaphor settings based on learning style

---

## Summary

The metaphors feature is a **content adaptation layer**, not a rendering flag.

1. **Store** metaphor content in `LearningConcept.shape`
2. **Filter** through `useMetaphorContent()` hook
3. **Render** based on presence of adapted content

This pattern keeps components clean, centralizes filtering logic, makes testing straightforward, enables future enhancements (graduation, custom metaphors), and respects user preferences consistently.

**To add metaphor support to any feature: import the hook, get adapted content, render conditionally.**

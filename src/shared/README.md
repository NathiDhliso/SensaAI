# Shared Directory

This directory contains utilities, types, hooks, and services that are used across multiple features.

## Structure

```
shared/
├── api/           # API client and endpoints
├── hooks/         # Reusable React hooks
├── utils/         # Pure utility functions
├── types/         # Shared TypeScript types
├── constants/     # App-wide constants
└── services/      # Shared services (audio, etc.)
```

## Guidelines

### What Goes in Shared?

**✅ Put in shared if:**
- Used by 2+ features
- Pure utility function (no business logic)
- Generic React hook
- Shared TypeScript type
- App-wide constant

**❌ Don't put in shared if:**
- Only used by one feature (keep it in that feature)
- Contains business logic (belongs in a feature)
- Feature-specific type (belongs in that feature)

### Examples

**✅ Good - Belongs in shared:**
```typescript
// shared/utils/score-utils.ts
export function normalizeScore(score: number): number {
  return Math.max(0, Math.min(100, score));
}

// shared/hooks/useClickOutside.ts
export function useClickOutside(ref, handler) {
  // Generic hook used by many components
}

// shared/types/learning.ts
export interface LearningConcept {
  // Used by multiple features
}
```

**❌ Bad - Belongs in feature:**
```typescript
// This is content-generation specific
export function generateConfusionPairs(concept) {
  // Should be in features/learning-session/activities/
}

// This is storage specific
export function uploadToS3(file) {
  // Should be in features/content-storage/cloud/
}
```

---

## Subdirectories

### 🌐 API (`api/`)

API client and endpoint definitions.

**Files:**
- `client.ts` - Base API client with auth
- `concepts.ts` - Concept CRUD operations
- `generation.ts` - Generation endpoints
- `resilience.ts` - Retry logic

**Use When:**
- Making API calls
- Handling auth tokens
- Implementing retry logic

---

### 🪝 Hooks (`hooks/`)

Reusable React hooks used across features.

**Categories:**
- **UI Hooks** - `useClickOutside`, `useEscapeKey`
- **Layout Hooks** - `useOrientationAwareZoom`, `useResponsiveNodeSize`
- **Flow Hooks** - `useFlowState`, `useLearningFlow`, `useSensaFlow`
- **Generation Hooks** - `useGenerationEngine`, `useGenerationRecovery`
- **Utility Hooks** - `useCountdownTimer`, `usePauseGlobalTimer`

**Use When:**
- Need reusable React logic
- Managing component state
- Handling side effects

---

### 🛠️ Utils (`utils/`)

Pure utility functions with no side effects.

**Files:**
- `score-utils.ts` - Score normalization and calculations
- `toast.ts` - Toast notification helpers
- `layout-utils.ts` - Layout calculations
- `alias-generator.ts` - Generate unique aliases
- `subject-domain-detector.ts` - Detect subject domains
- `performance.ts` - Performance monitoring
- `content-loader.ts` - Content loading utilities
- `context-optimizer.ts` - Context optimization

**Use When:**
- Need pure functions
- Calculations without side effects
- Data transformations

---

### 📐 Types (`types/`)

Shared TypeScript type definitions.

**Files:**
- `concept-schema.ts` - Concept data structures
- `confusion.ts` - Confusion drill types
- `content-analytics.ts` - Analytics types
- `generation.ts` - Generation types
- `learning.ts` - Learning types
- `sensa-flow.ts` - Flow types

**Use When:**
- Defining data structures
- Type checking
- Interface contracts

---

### 📊 Constants (`constants/`)

App-wide constants and configuration.

**Files:**
- `app-config.ts` - App configuration
- `learning-content.ts` - Learning content constants
- `learning-science.ts` - Learning science parameters
- `sensa-flow-constants.ts` - Flow constants
- `storage-keys.ts` - Storage key names
- `theme-colors.ts` - Theme color definitions
- `ui-constants.ts` - UI timing and sizes
- `z-index.ts` - Z-index layering

**Use When:**
- Need app-wide constants
- Configuration values
- Magic numbers

---

### 🎵 Services (`services/`)

Shared services that manage resources.

**Files:**
- `audio.ts` - Audio playback
- `AudioService.ts` - Audio service class

**Use When:**
- Managing audio
- Resource management
- Service singletons

---

## Import Patterns

### ✅ Good: Import from shared

```typescript
// Import specific utilities
import { normalizeScore } from '@/shared/utils/score-utils';
import { toast } from '@/shared/utils/toast';
import { useClickOutside } from '@/shared/hooks/useClickOutside';
import type { LearningConcept } from '@/shared/types/learning';

// Or use barrel export (less preferred for tree-shaking)
import { normalizeScore, toast } from '@/shared';
```

### ❌ Bad: Don't import from old locations

```typescript
// OLD - Don't use these anymore
import { normalizeScore } from '@/lib/utils/score-utils';
import { toast } from '@/lib/utils/toast';
import { useClickOutside } from '@/hooks/useClickOutside';
```

---

## Best Practices

### 1. Keep It Pure

Shared utilities should be pure functions when possible:

```typescript
// ✅ Good - Pure function
export function calculateScore(correct: number, total: number): number {
  return (correct / total) * 100;
}

// ❌ Bad - Side effects
export function calculateAndSaveScore(correct: number, total: number): number {
  const score = (correct / total) * 100;
  localStorage.setItem('score', score.toString()); // Side effect!
  return score;
}
```

### 2. Avoid Feature Dependencies

Shared code should not depend on features:

```typescript
// ❌ Bad - Depends on feature
import { generateContent } from '@/features/content-generation';

export function helperFunction() {
  return generateContent(); // Don't do this!
}

// ✅ Good - No feature dependencies
export function helperFunction(data: string) {
  return data.toUpperCase();
}
```

### 3. Document Complex Functions

Add JSDoc comments for complex utilities:

```typescript
/**
 * Normalizes a score to a 0-100 range.
 * 
 * @param score - Raw score value
 * @param min - Minimum possible score (default: 0)
 * @param max - Maximum possible score (default: 100)
 * @returns Normalized score between 0 and 100
 * 
 * @example
 * normalizeScore(75) // 75
 * normalizeScore(150) // 100
 * normalizeScore(-10) // 0
 */
export function normalizeScore(
  score: number,
  min: number = 0,
  max: number = 100
): number {
  return Math.max(min, Math.min(max, score));
}
```

### 4. Use TypeScript Strictly

All shared code should have proper types:

```typescript
// ✅ Good - Proper types
export function formatDate(date: Date): string {
  return date.toISOString();
}

// ❌ Bad - Any types
export function formatDate(date: any): any {
  return date.toISOString();
}
```

---

## Migration Notes

This structure was created on January 29, 2026 as part of a comprehensive reorganization.

**What Changed:**
- Moved from `src/lib/` to `src/shared/`
- Moved from `src/hooks/` to `src/shared/hooks/`
- Moved from `src/constants/` to `src/shared/constants/`
- Moved from `src/services/` to `src/shared/services/`
- Updated all imports across 127 files

**What Stayed the Same:**
- All functionality intact
- Zero breaking changes
- Same TypeScript types
- Same API contracts

The old folders are kept temporarily for backwards compatibility but will be removed in a future cleanup.

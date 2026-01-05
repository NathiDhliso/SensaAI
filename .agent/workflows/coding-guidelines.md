---
description: Coding standards and patterns for SensaPBL - MUST READ before making changes
---

# SensaPBL Coding Guidelines

These guidelines ensure consistency across the codebase. AI coding tools MUST follow these patterns.

---

## 🎨 Colors - MANDATORY RULES

### In TypeScript/TSX Files
**NEVER** hardcode hex colors like `#3b82f6` or `#22c55e` directly in code.

**ALWAYS** import and use centralized color constants:

```typescript
// ✅ CORRECT
import { COLORS, CATEGORY_COLORS, DIFFICULTY_COLORS, FEEDBACK_COLORS } from '@/constants/theme-colors';

const iconColor = FEEDBACK_COLORS.correct;  // "#22c55e"
const categoryStyle = { color: CATEGORY_COLORS.cloud };

// ❌ WRONG
const iconColor = "#22c55e";
```

**Available color constants:**
- `COLORS` - Base color palette
- `CATEGORY_COLORS` - cloud, data, dev, security, business
- `DIFFICULTY_COLORS` - Beginner, Intermediate, Advanced, Expert
- `FEEDBACK_COLORS` - correct, incorrect
- `MAP_COLORS` - markerText, polylineStroke
- `CONFETTI_COLORS` - Array for celebrations

### In CSS Module Files
**NEVER** hardcode `rgba()` values for themed colors.

**ALWAYS** use CSS variables from `index.css`:

```css
/* ✅ CORRECT */
.button:hover {
  box-shadow: var(--shadow-glow-sage-hover);
  background: var(--overlay-accent-10);
}

/* ❌ WRONG */
.button:hover {
  box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
  background: rgba(139, 92, 246, 0.1);
}
```

**Available CSS shadow variables:**
- `--shadow-glow-primary` / `--shadow-glow-primary-hover`
- `--shadow-glow-sage` / `--shadow-glow-sage-hover`
- `--shadow-glow-amber` / `--shadow-glow-amber-hover`
- `--shadow-glow-error`

**Available CSS overlay variables:**
- `--overlay-primary-5`, `--overlay-primary-10`, `--overlay-primary-15`
- `--overlay-accent-5`, `--overlay-accent-10`, `--overlay-accent-15`
- `--overlay-sage-5`, `--overlay-sage-10`
- `--overlay-amber-5`, `--overlay-amber-10`, `--overlay-amber-20`
- `--overlay-white-10`, `--overlay-black-40`

---

## ♿ Accessibility & Contrast - NON-NEGOTIABLE

**Text contrast MUST meet WCAG AA standards.**

- **Normal Text**: 4.5:1 minimum contrast ratio against background
- **Large Text**: 3:1 minimum contrast ratio
- **NEVER** use low-contrast combinations like light grey on white
- **NEVER** rely on color alone to convey meaning (use icons/labels too)

**Text Color Usage:**
- Primary Text: Use `COLORS.text.dark` (`#1f2937`) or `text-gray-900`
- Secondary Text: Use `COLORS.text.medium` (`#4b5563`) or `text-gray-600`
- Muted Text: Use `COLORS.text.light` (`#6b7280`) ONLY for non-essential text

---

## 💅 CSS & Styling - NON-NEGOTIABLE

### NO Inline Styles

**NEVER** use inline styles for static properties. Only use them for truly dynamic values (e.g., coordinates, user-defined colors).

```typescript
// ✅ CORRECT
<div className={styles.card}>
  <div className={styles.header}>Title</div>
</div>

// ❌ WRONG
<div style={{ padding: '24px', background: 'white', borderRadius: '8px' }}>
  <div style={{ marginBottom: '16px', fontWeight: 'bold' }}>Title</div>
</div>
```

### NO Hardcoded CSS Values

**NEVER** hardcode pixel values, hex codes, or raw strings in components or CSS modules that deviate from the design system.

- **Spacing**: Use CSS variables or standard Tailwind/utility classes.
- **Colors**: Use `var(--...)` in CSS or `COLORS.*` in TS/TSX.
- **Typography**: Use standard font sizes and weights defined in global CSS.

---

## ⏱️ Timeouts - MANDATORY RULES

**NEVER** hardcode setTimeout durations like `2000`, `3000`, `5000`.

**ALWAYS** use `UI_TIMINGS` constants:

```typescript
// ✅ CORRECT
import { UI_TIMINGS } from '@/constants/ui-constants';

setTimeout(() => setVisible(false), UI_TIMINGS.TOAST_SHORT);

// ❌ WRONG
setTimeout(() => setVisible(false), 2000);
```

**Available timing constants:**
- `UI_TIMINGS.TOAST_SHORT` (2000ms) - Brief confirmations
- `UI_TIMINGS.TOAST_MEDIUM` (3000ms) - Standard messages
- `UI_TIMINGS.TOAST_LONG` (5000ms) - Errors, warnings
- `UI_TIMINGS.BLUR_DELAY` (200ms) - Dropdown blur delays
- `UI_TIMINGS.DEBOUNCE_DEFAULT` (300ms) - Input debouncing
- `UI_TIMINGS.MARKER_UPDATE_FAST` (100ms) - Quick animations
- `UI_TIMINGS.MAP_LOAD_DELAY` (500ms) - Map loading

---

## 📦 Shared Utilities - USE EXISTING CODE

### Content Parsing
**NEVER** duplicate the parseGeneratedContent + transformGeneratedContent pattern.

**ALWAYS** use the shared hook:

```typescript
// ✅ CORRECT
import { useParseAndLoadContent } from '@/lib/content-loader';

const parseAndLoad = useParseAndLoadContent();
const result = parseAndLoad(content);
if (!result.success) handleError(result.error);

// ❌ WRONG - Don't duplicate this pattern
const parseResult = parseGeneratedContent(content);
if (!parseResult.success) { /* ... */ }
const transformed = transformGeneratedContent(parseResult.data);
loadCustomContent(transformed);
```

---

## 🗄️ State Management - Zustand Stores

**Use existing stores before creating new state:**

```typescript
// Available stores:
import { useGenerationStore } from '@/store/generation-store';
import { useLearningStore } from '@/store/learning-store';
import { usePalaceStore } from '@/store/palace-store';
import { useUIStore } from '@/store/ui-store';
import { useThemeStore } from '@/store/theme-store';
import { usePersonalizationStore } from '@/store/personalization-store';
import { useAuthStore } from '@/store/auth-store'; // ✅ ADDED: Authentication state
```

**Store responsibilities:**
- `useGenerationStore` - Generation process, AWS config, results, recent subjects
- `useLearningStore` - Progress tracking, concepts, custom content, sessions
- `usePalaceStore` - Memory palace state, buildings, routes, streaks
- `useUIStore` - UI panel states (settings panel open/close)
- `useThemeStore` - Theme preference (light/dark/system)
- `usePersonalizationStore` - Learning style, familiar system, onboarding
- `useAuthStore` - **CRITICAL**: User authentication state, tokens, PKCE

**NEVER duplicate state that exists in stores:**

```typescript
// ❌ WRONG - duplicating store state
const [isLoading, setIsLoading] = useState(false);
const { isGenerating } = useGenerationStore(); // already exists!

// ✅ CORRECT - use store state
const { isGenerating } = useGenerationStore();
```

---

## 🎨 Extended Color Documentation

Beyond the base palette, use these specialized color objects:

### Icon Colors
Ensure consistency across all icons using `ICON_COLORS`:

```typescript
import { ICON_COLORS } from '@/constants/theme-colors';

// Usage
<SensaIcon color={ICON_COLORS.success} />
```

### Lifecycle Colors
Critical for Phase 1/2/3 visual language:

```typescript
import { LIFECYCLE_COLORS } from '@/constants/theme-colors';

// Phase 1 (Blue)
const style = { background: LIFECYCLE_COLORS.phase1.bg, color: LIFECYCLE_COLORS.phase1.text };
```

### Graph Colors
For node graph visualizations:

```typescript
import { GRAPH_COLORS } from '@/constants/theme-colors';

// foundation -> sage, keystone -> accent, utility -> amber
```

---

## ⚙️ Configuration Objects

Avoid magic numbers by using these configuration objects from `ui-constants.ts`:

- `DIAGNOSTIC_CONFIG` - Defines the 20-question limit (Beginner/Intermediate/Advanced split)
- `SPRINT_CONFIG` - Defines the 15-minute timebox and question distribution
- `FOCUS_SESSION_CONFIG` - Defines Pomodoro intervals (25/5) and reading pace targets

---

## 📏 CSS & Layout Rules

### Bionic Reading Strictness
**NEVER** apply layout-shifting properties (like `letter-spacing`, `font-size`, or `margin`) to global toggles like `[data-bionic-reading="true"]`.

**Scope them:** Apply strictly to content classes (`.prose`, `.learning-card`, `.bionic-content`) only. Global shifts cause UI jitter.

---

## 🧭 Navigation Patterns

**Standard back button pattern:**

```typescript
// ✅ CORRECT
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

<button onClick={() => navigate('/')} className={styles.backButton}>
  <ArrowLeft className={styles.backIcon} />
  Back to Home
</button>
```

**Route constants:**
- Home: `/`
- Generate: `/generate/:subject`
- Results: `/results/:id`
- Learn: `/learn`
- Palace: `/palace`
- Saved: `/saved`
- Settings: `/settings`

**Navigation with state:**

```typescript
// ✅ CORRECT - navigate with URL params
navigate(`/generate/${encodeURIComponent(subject)}`);

// ✅ CORRECT - navigate with ID
navigate(`/results/${resultId}`);
```

---

## ⚠️ Error Handling

**User-facing errors MUST be displayed, not silent:**

```typescript
// ✅ CORRECT - show error to user
if (!result.success) {
  alert(`Failed to load content: ${result.error}`);
  setLoadingLearn(false);
  return;
}

// ✅ CORRECT - error state in UI
{error && (
  <div className={styles.errorBox}>
    <AlertTriangle className={styles.errorIcon} />
    <p>{error}</p>
    <button onClick={handleRetry}>Retry</button>
  </div>
)}

// ❌ WRONG - silent failure
if (!result.success) {
  console.error(result.error);
  return;
}
```

**Error boundaries for critical sections:**
- Wrap generation process with try-catch
- Show retry options for recoverable errors
- Provide "Go Home" fallback for fatal errors

---

## 🧩 Component Patterns

### Empty States - MANDATORY

**Every list/grid component MUST handle empty state:**

```typescript
// ✅ CORRECT
if (!data || data.length === 0) {
  return (
    <div className={styles.emptyState}>
      <Icon size={48} className={styles.emptyIcon} />
      <h2>No items yet</h2>
      <p>Description of how to populate</p>
      <button onClick={action} className={styles.primaryButton}>
        Primary Action
      </button>
    </div>
  );
}
```

### Loading States - MANDATORY

**Show feedback during async operations:**

```typescript
// ✅ CORRECT
{isLoading && (
  <div className={styles.loadingState}>
    <div className={styles.spinner} />
    <p>Loading...</p>
  </div>
)}

// ✅ CORRECT - button loading state
<button disabled={loading} className={styles.button}>
  {loading ? 'Loading...' : 'Submit'}
</button>
```

### Conditional Rendering

**Use early returns for cleaner code:**

```typescript
// ✅ CORRECT
if (!currentPalace) {
  return <EmptyState />;
}

return <MainContent />;

// ❌ WRONG - nested ternaries
return currentPalace ? <MainContent /> : <EmptyState />;
```

---

## 🎨 Icons & Animations

### Icon Library - Lucide React

**ALWAYS use Lucide React icons:**

```typescript
import { ArrowLeft, Check, Loader2, AlertTriangle } from 'lucide-react';

// Standard sizes:
<ArrowLeft size={16} />        // UI buttons, inline icons
<Check size={18} />            // Action buttons
<Loader2 size={20} />          // Headers, prominent UI
<AlertTriangle size={48} />    // Empty states, large displays
```

**Common icons by context:**
- Navigation: `ArrowLeft`, `ChevronLeft`, `ChevronRight`, `ChevronDown`, `ChevronUp`
- Actions: `Check`, `X`, `Plus`, `Trash2`, `Download`, `Upload`, `Save`
- Status: `CheckCircle2`, `AlertTriangle`, `Loader2`, `Circle`
- Features: `BookOpen`, `Map`, `Search`, `Settings`, `Eye`, `Copy`

### Animation Library - Framer Motion

**Use Framer Motion for complex animations:**

```typescript
import { motion, AnimatePresence } from 'framer-motion';

// ✅ CORRECT - conditional rendering with animation
<AnimatePresence>
  {isVisible && (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      {content}
    </motion.div>
  )}
</AnimatePresence>

// ✅ CORRECT - list animations
<motion.div
  initial={{ opacity: 0, height: 0 }}
  animate={{ opacity: 1, height: 'auto' }}
  exit={{ opacity: 0, height: 0 }}
>
  {items}
</motion.div>
```

**Standard animation patterns:**
- Fade in/out: `opacity: 0` → `opacity: 1`
- Slide down: `y: -10` → `y: 0`
- Expand: `height: 0` → `height: 'auto'`

---

## 📊 Quality Thresholds & Constants

**Use `QUALITY_THRESHOLDS` from ui-constants:**

```typescript
import { QUALITY_THRESHOLDS } from '@/constants/ui-constants';

// ✅ CORRECT
const getMetricStatus = (value: number, threshold: number) => {
  return value >= threshold ? 'good' : 'warning';
};

const status = getMetricStatus(
  validation.lifecycleConsistency,
  QUALITY_THRESHOLDS.lifecycleConsistency
);
```

**Available thresholds:**
- `QUALITY_THRESHOLDS.lifecycleConsistency` (90)
- `QUALITY_THRESHOLDS.positiveFraming` (85)
- `QUALITY_THRESHOLDS.formatConsistency` (95)
- `QUALITY_THRESHOLDS.completeness` (90)

**Pass names:**

```typescript
import { PASS_NAMES } from '@/constants/ui-constants';

// ["Domain Analysis", "Dependency Mapping", "Content Generation", "Quality Validation"]
```

---

## 🏗️ Project Structure

```
src/
├── constants/
│   ├── theme-colors.ts     # Color constants for JS/TSX
│   ├── ui-constants.ts     # UI timings, thresholds
│   ├── palace-routes.ts    # Route definitions
│   └── learning-content.ts # Content constants
├── lib/
│   ├── content-loader.ts   # Shared parsing utilities
│   └── content-adapter/    # Content transformation
├── store/                   # Zustand stores
├── pages/                   # Route components
└── components/              # Reusable components
```

---

## 📋 Additional Rules

### No Console Logs in Production
```typescript
// ❌ WRONG
console.log('debug info');

// ✅ Use proper error handling or remove before commit
```


### Type Safety - MANDATORY
```typescript
// ✅ CORRECT - Use `as const` for static arrays/objects
export const OPTIONS = ['a', 'b', 'c'] as const;

// ✅ CORRECT - Import types from @/lib/types/*
import type { PlacedConcept } from '@/lib/types/palace';

// ❌ WRONG - NEVER use 'any'
function process(data: any) { ... }
```

### Environment Variables
**ALWAYS** use Vite's `import.meta.env`:
```typescript
// ✅ CORRECT
const apiKey = import.meta.env.VITE_API_KEY;

// ❌ WRONG - process.env does not exist in Vite client
const apiKey = process.env.VITE_API_KEY;
```

---

## 💾 Data Persistence

### Local Storage Headers
**NEVER** use hardcoded strings for storage keys.

**ALWAYS** define keys in constants:
```typescript
// ✅ CORRECT
const STORAGE_KEY = 'sensa-result-v1';
localStorage.setItem(STORAGE_KEY, ...);

// ❌ WRONG
localStorage.setItem('sensa-result-v1', ...);
```

---

## 🖼️ Assets & Media

### Icons vs Custom SVGs
- **Standard UI Icons**: MUST use **Lucide React**.
- **Custom Visualizations**: Raw `<svg>` tags are permitted **ONLY** for:
    - Dynamic charts/graphs (D3, Visx)
    - Complex interactive maps (Floor plans)
    - Custom animated timers (e.g., FocusTimer)
- **Logos**: Import as assets (`import Logo from '@/assets/logo.svg'`).

---

## 🔍 Before Committing Code

1.  **No hardcoded colors** - Check for `#` or `rgba(` in TSX files
2.  **No magic numbers** - Especially setTimeout values
3.  **No duplicate patterns** - Use existing hooks/utilities
4.  **Use correct stores** - Don't duplicate state that exists in Zustand stores
5.  **Empty states handled** - All lists/grids show empty state UI
6.  **Loading states shown** - Async operations show feedback
7.  **Errors displayed** - User-facing errors are visible, not silent
8.  **Lucide icons only** - No custom SVGs or other icon libraries (unless complex viz)
9.  **No explicit `any`** - strictly typed interfaces
10. **Keys centralized** - No magic strings for localStorage
11. **TypeScript compiles** - Run `npx tsc --noEmit`
12. **No console.log** - Remove debugging statements

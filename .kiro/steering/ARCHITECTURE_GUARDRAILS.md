---
inclusion: always
---

# Architecture Guardrails - STRICT ENFORCEMENT

**Last Updated:** January 29, 2026  
**Status:** MANDATORY - All code changes MUST follow these rules

---

## 🚨 CRITICAL RULES - NEVER VIOLATE

### Rule 1: Folder Structure is SACRED
```
src/
├── features/          ← Business features ONLY
├── shared/            ← Reusable utilities ONLY
├── components/        ← UI components ONLY
├── pages/             ← Page components ONLY
├── store/             ← Zustand stores ONLY
├── contexts/          ← React contexts ONLY
└── styles/            ← Global styles ONLY
```

**FORBIDDEN FOLDERS:**
- ❌ `src/lib/` - DELETED, never recreate
- ❌ `src/hooks/` - Use `src/shared/hooks/` instead
- ❌ `src/constants/` - Use `src/shared/constants/` instead
- ❌ `src/services/` - Use `src/shared/services/` instead
- ❌ `src/utils/` - Use `src/shared/utils/` instead
- ❌ `src/helpers/` - Use `src/shared/utils/` instead
- ❌ `src/common/` - Use `src/shared/` instead

**IF YOU CREATE ANY OF THESE FOLDERS, STOP IMMEDIATELY AND REFACTOR.**

---

## 📁 FOLDER PLACEMENT RULES

### When to Use `src/features/`

**Create a new feature folder when:**
1. It's a business capability (e.g., "content-generation", "ai-coach")
2. It has its own data models and business logic
3. It could be described to a non-technical person
4. It represents a user-facing feature

**Feature folder structure:**
```
src/features/[feature-name]/
├── components/        ← Feature-specific UI components
├── hooks/             ← Feature-specific hooks
├── utils/             ← Feature-specific utilities
├── types.ts           ← Feature-specific types
└── index.ts           ← Public API (barrel export)
```

**Examples of VALID features:**
- ✅ `content-generation` - Generates learning content
- ✅ `content-storage` - Saves/loads content
- ✅ `learning-session` - Learning activities
- ✅ `ai-coach` - AI coach personalities
- ✅ `analytics` - User analytics
- ✅ `gamification` - Badges, achievements
- ✅ `collaboration` - Study groups, sharing

**Examples of INVALID features:**
- ❌ `buttons` - This is a UI component, use `src/components/ui/`
- ❌ `api` - This is shared, use `src/shared/api/`
- ❌ `auth` - This is shared, use `src/shared/auth/` or `src/contexts/`
- ❌ `utils` - This is shared, use `src/shared/utils/`

### When to Use `src/shared/`

**Use shared when:**
1. Used by 2+ features
2. It's a technical utility (not business logic)
3. It's infrastructure code (API client, storage, etc.)
4. It's a reusable React hook

**Shared folder structure:**
```
src/shared/
├── api/               ← API client, endpoints
├── hooks/             ← Reusable React hooks
├── utils/             ← Pure utility functions
├── types/             ← Shared TypeScript types
├── constants/         ← App-wide constants
├── services/          ← Singleton services
└── storage/           ← Storage utilities
```

### When to Use `src/components/`

**Use components when:**
1. It's a reusable UI component
2. It's used across multiple features
3. It's a layout component (header, sidebar, etc.)
4. It's a generic UI element (button, modal, etc.)

**Component folder structure:**
```
src/components/
├── ui/                ← Generic UI components (Button, Modal, etc.)
├── layout/            ← Layout components (Header, Sidebar, etc.)
├── learning/          ← Learning-specific components (shared across features)
├── auth/              ← Auth components
└── [domain]/          ← Domain-specific components
```

### When to Use `src/pages/`

**Use pages when:**
1. It's a route/page component
2. It's the top-level component for a URL
3. It orchestrates features and components

**Page rules:**
- ✅ One file per route
- ✅ Minimal logic (orchestration only)
- ✅ Import from features and components
- ❌ No business logic in pages
- ❌ No API calls in pages (use features)

---

## 🔒 IMPORT RULES

### Allowed Import Patterns

```typescript
// ✅ CORRECT - Feature imports from shared
import { useApi } from '@/shared/api';
import { formatDate } from '@/shared/utils';
import { useAuth } from '@/shared/hooks';

// ✅ CORRECT - Page imports from features
import { ContentGenerator } from '@/features/content-generation';
import { AICoach } from '@/features/ai-coach';

// ✅ CORRECT - Feature imports from components
import { Button } from '@/components/ui';
import { StudyLayout } from '@/components/layout';

// ✅ CORRECT - Component imports from shared
import { cn } from '@/shared/utils';
import { API_ENDPOINTS } from '@/shared/constants';
```

### Forbidden Import Patterns

```typescript
// ❌ FORBIDDEN - Shared importing from features
// File: src/shared/utils/helper.ts
import { generateContent } from '@/features/content-generation'; // WRONG!

// ❌ FORBIDDEN - Feature importing from another feature
// File: src/features/ai-coach/index.ts
import { saveContent } from '@/features/content-storage'; // WRONG!
// Instead: Use shared services or events

// ❌ FORBIDDEN - Importing from old structure
import { something } from '@/lib/...'; // DELETED FOLDER!
import { something } from '@/hooks/...'; // DELETED FOLDER!
import { something } from '@/constants/...'; // DELETED FOLDER!

// ❌ FORBIDDEN - Relative imports across features
import { something } from '../../features/other-feature'; // WRONG!
```

### Import Hierarchy (Dependency Flow)

```
Pages
  ↓ can import from
Features
  ↓ can import from
Components
  ↓ can import from
Shared
  ↓ can import from
(nothing - shared is the foundation)
```

**Rule:** Lower layers CANNOT import from higher layers.

---

## 🆕 ADDING NEW CODE - DECISION TREE

### Step 1: What are you adding?

```
Is it a new business capability?
├─ YES → Create new feature in src/features/
└─ NO → Go to Step 2

Is it a reusable UI component?
├─ YES → Add to src/components/
└─ NO → Go to Step 3

Is it a utility used by 2+ features?
├─ YES → Add to src/shared/
└─ NO → Go to Step 4

Is it feature-specific code?
├─ YES → Add to existing feature folder
└─ NO → Go to Step 5

Is it a new page/route?
├─ YES → Add to src/pages/
└─ NO → Ask for guidance
```

### Step 2: Where exactly in the feature?

```
src/features/[feature-name]/
├── components/        ← UI components specific to this feature
├── hooks/             ← React hooks specific to this feature
├── utils/             ← Utility functions specific to this feature
├── api/               ← API calls specific to this feature
├── types.ts           ← TypeScript types for this feature
└── index.ts           ← Public exports (what other code can use)
```

**Rule:** If it's only used by ONE feature, it goes IN that feature folder.

### Step 3: Where exactly in shared?

```
src/shared/
├── api/               ← API client, base fetch, error handling
├── hooks/             ← useAuth, useLocalStorage, useDebounce, etc.
├── utils/             ← formatDate, cn, parseJSON, etc.
├── types/             ← User, ApiResponse, etc.
├── constants/         ← API_URL, COLORS, ROUTES, etc.
├── services/          ← AuthService, StorageService, etc.
└── storage/           ← localStorage, IndexedDB wrappers
```

**Rule:** If it's used by 2+ features, it goes in shared.

---

## 📝 FILE NAMING CONVENTIONS

### Components
```
✅ PascalCase.tsx          - Button.tsx, UserProfile.tsx
✅ PascalCase.module.css   - Button.module.css
✅ index.ts                - Barrel export
```

### Utilities
```
✅ kebab-case.ts           - format-date.ts, api-client.ts
✅ camelCase.ts            - formatDate.ts (also acceptable)
```

### Types
```
✅ types.ts                - Feature types
✅ [domain].types.ts       - learning.types.ts
```

### Hooks
```
✅ useCamelCase.ts         - useAuth.ts, useLocalStorage.ts
```

### Constants
```
✅ SCREAMING_SNAKE_CASE    - API_ENDPOINTS, THEME_COLORS
✅ kebab-case.ts           - api-endpoints.ts
```

---

## 🏗️ FEATURE CREATION CHECKLIST

When creating a new feature, follow this checklist:

### 1. Create Feature Folder
```bash
mkdir -p src/features/[feature-name]
```

### 2. Create Feature Structure
```bash
src/features/[feature-name]/
├── components/          # Feature-specific UI
├── hooks/               # Feature-specific hooks
├── utils/               # Feature-specific utilities
├── types.ts             # Feature types
└── index.ts             # Public API
```

### 3. Create index.ts (Public API)
```typescript
// src/features/[feature-name]/index.ts

// Export only what other features/pages need
export { FeatureComponent } from './components/FeatureComponent';
export { useFeature } from './hooks/useFeature';
export type { FeatureType } from './types';

// DO NOT export internal utilities or components
// Keep implementation details private
```

### 4. Add Feature Documentation
```markdown
# Feature: [Feature Name]

## Purpose
What does this feature do?

## Public API
What can other code use from this feature?

## Dependencies
What does this feature depend on?

## Usage Example
How do you use this feature?
```

### 5. Update Feature README
Add your feature to `src/features/README.md`

---

## 🚫 ANTI-PATTERNS TO AVOID

### Anti-Pattern 1: God Files
```typescript
// ❌ BAD - One file with everything
// src/shared/utils/helpers.ts (5000 lines)
export function formatDate() { }
export function parseJSON() { }
export function validateEmail() { }
// ... 100 more functions

// ✅ GOOD - Separate files by domain
// src/shared/utils/date.ts
export function formatDate() { }

// src/shared/utils/json.ts
export function parseJSON() { }

// src/shared/utils/validation.ts
export function validateEmail() { }
```

### Anti-Pattern 2: Circular Dependencies
```typescript
// ❌ BAD - Features importing from each other
// src/features/ai-coach/index.ts
import { saveContent } from '@/features/content-storage';

// src/features/content-storage/index.ts
import { getCoachMessage } from '@/features/ai-coach';

// ✅ GOOD - Use shared services or events
// src/shared/services/EventBus.ts
export const eventBus = new EventEmitter();

// src/features/ai-coach/index.ts
eventBus.emit('content:save', data);

// src/features/content-storage/index.ts
eventBus.on('content:save', handleSave);
```

### Anti-Pattern 3: Leaky Abstractions
```typescript
// ❌ BAD - Exposing implementation details
// src/features/content-generation/index.ts
export { InternalParser } from './utils/parser'; // Internal detail!
export { PrivateHelper } from './utils/helper'; // Internal detail!

// ✅ GOOD - Only expose public API
// src/features/content-generation/index.ts
export { generateContent } from './api/generate';
export type { GenerationOptions } from './types';
// Keep InternalParser and PrivateHelper private
```

### Anti-Pattern 4: Mixing Concerns
```typescript
// ❌ BAD - Business logic in UI component
// src/components/ui/Button.tsx
export function Button() {
  const data = await fetch('/api/data'); // API call in UI component!
  const processed = complexBusinessLogic(data); // Business logic in UI!
  return <button>{processed}</button>;
}

// ✅ GOOD - Separation of concerns
// src/features/data-processing/hooks/useData.ts
export function useData() {
  const data = await fetch('/api/data');
  return complexBusinessLogic(data);
}

// src/components/ui/Button.tsx
export function Button({ onClick, children }) {
  return <button onClick={onClick}>{children}</button>;
}

// src/pages/DataPage.tsx
export function DataPage() {
  const data = useData(); // Business logic in feature
  return <Button onClick={() => {}}>{data}</Button>; // UI in component
}
```

---

## ✅ CODE REVIEW CHECKLIST

Before committing code, verify:

### Folder Structure
- [ ] No new folders in forbidden locations (`src/lib/`, `src/hooks/`, etc.)
- [ ] New features are in `src/features/[feature-name]/`
- [ ] Shared code is in `src/shared/`
- [ ] UI components are in `src/components/`
- [ ] Pages are in `src/pages/`

### Imports
- [ ] No imports from deleted folders (`@/lib/`, `@/hooks/`, etc.)
- [ ] No circular dependencies between features
- [ ] Shared code doesn't import from features
- [ ] Import hierarchy is respected (pages → features → components → shared)

### File Organization
- [ ] Feature-specific code is in the feature folder
- [ ] Shared code (used by 2+ features) is in `src/shared/`
- [ ] Public API is exported through `index.ts`
- [ ] Implementation details are kept private

### Naming
- [ ] Components use PascalCase
- [ ] Utilities use kebab-case or camelCase
- [ ] Hooks use useCamelCase
- [ ] Types use PascalCase

### Documentation
- [ ] New features have README.md
- [ ] Complex utilities have JSDoc comments
- [ ] Public APIs are documented

---

## 🔧 ENFORCEMENT TOOLS

### 1. ESLint Rules (Recommended)
```javascript
// eslint.config.js
module.exports = {
  rules: {
    // Prevent imports from deleted folders
    'no-restricted-imports': ['error', {
      patterns: [
        '@/lib/*',
        '@/hooks/*',
        '@/constants/*',
        '@/services/*',
        '../../../*', // Prevent deep relative imports
      ]
    }],
  }
};
```

### 2. Git Pre-Commit Hook
```bash
#!/bin/bash
# .git/hooks/pre-commit

# Check for forbidden folders
if git diff --cached --name-only | grep -E "^src/(lib|hooks|constants|services)/"; then
  echo "❌ ERROR: Forbidden folder detected!"
  echo "Do not create files in src/lib/, src/hooks/, src/constants/, or src/services/"
  echo "Use src/features/ or src/shared/ instead"
  exit 1
fi

# Check for forbidden imports
if git diff --cached | grep -E "from ['\"]@/(lib|hooks|constants|services)/"; then
  echo "❌ ERROR: Import from deleted folder detected!"
  echo "Update imports to use src/features/ or src/shared/"
  exit 1
fi

echo "✅ Architecture guardrails passed"
```

### 3. TypeScript Path Aliases
```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/features/*": ["src/features/*"],
      "@/shared/*": ["src/shared/*"],
      "@/components/*": ["src/components/*"],
      "@/pages/*": ["src/pages/*"],
      "@/store/*": ["src/store/*"],
      // DO NOT add paths for deleted folders
      // "@/lib/*": ["src/lib/*"],  ← REMOVED
      // "@/hooks/*": ["src/hooks/*"],  ← REMOVED
    }
  }
}
```

---

## 📚 EXAMPLES

### Example 1: Adding a New Feature

**Scenario:** Add a "study-groups" feature for collaborative learning.

```bash
# 1. Create feature folder
mkdir -p src/features/study-groups/{components,hooks,api}

# 2. Create files
touch src/features/study-groups/index.ts
touch src/features/study-groups/types.ts
touch src/features/study-groups/components/GroupCard.tsx
touch src/features/study-groups/hooks/useStudyGroup.ts
touch src/features/study-groups/api/groups.ts

# 3. Implement public API
# src/features/study-groups/index.ts
export { GroupCard } from './components/GroupCard';
export { useStudyGroup } from './hooks/useStudyGroup';
export type { StudyGroup } from './types';

# 4. Use in page
# src/pages/Groups.tsx
import { GroupCard, useStudyGroup } from '@/features/study-groups';
```

### Example 2: Adding a Shared Utility

**Scenario:** Add a date formatting utility used by multiple features.

```bash
# 1. Create in shared (not in a feature!)
touch src/shared/utils/date.ts

# 2. Implement
# src/shared/utils/date.ts
export function formatDate(date: Date): string {
  return date.toLocaleDateString();
}

# 3. Export from shared index
# src/shared/utils/index.ts
export { formatDate } from './date';

# 4. Use in features
# src/features/ai-coach/components/Message.tsx
import { formatDate } from '@/shared/utils';
```

### Example 3: Adding a UI Component

**Scenario:** Add a reusable Card component.

```bash
# 1. Create in components (not in a feature!)
mkdir -p src/components/ui
touch src/components/ui/Card.tsx
touch src/components/ui/Card.module.css

# 2. Implement
# src/components/ui/Card.tsx
export function Card({ children }) {
  return <div className={styles.card}>{children}</div>;
}

# 3. Export from components index
# src/components/ui/index.ts
export { Card } from './Card';

# 4. Use anywhere
# src/features/ai-coach/components/CoachMessage.tsx
import { Card } from '@/components/ui';
```

---

## 🎯 SUMMARY - THE GOLDEN RULES

1. **NEVER recreate deleted folders** (`src/lib/`, `src/hooks/`, `src/constants/`, `src/services/`)
2. **Business features** go in `src/features/[feature-name]/`
3. **Shared utilities** go in `src/shared/`
4. **UI components** go in `src/components/`
5. **Pages** go in `src/pages/`
6. **Features CANNOT import from other features** (use shared or events)
7. **Shared CANNOT import from features** (dependency flow: pages → features → components → shared)
8. **If used by 1 feature** → Put it IN that feature
9. **If used by 2+ features** → Put it in `src/shared/`
10. **When in doubt** → Ask before creating new folders

---

**This document is MANDATORY. All code changes MUST follow these rules.**

**Violations will require immediate refactoring.**

---

**Last Updated:** January 29, 2026  
**Maintained By:** Architecture Team  
**Status:** ACTIVE - STRICTLY ENFORCED

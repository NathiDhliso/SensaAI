# Folder Reorganization Plan

## Current Problems

Your codebase has several organizational issues:

1. **`src/lib/` is a dumping ground** - 13 subdirectories with no clear hierarchy
2. **Unclear naming** - "lib" vs "utils" vs "helpers" - what goes where?
3. **Mixed concerns** - Generation, storage, validation, AI all mixed together
4. **Deep nesting** - `src/lib/ai/coach/personas.ts` - hard to find
5. **No clear feature boundaries** - Hard to understand what relates to what

---

## Proposed Structure (Layman-Friendly)

### Principle: **Organize by WHAT it does, not HOW it works**

```
src/
├── 📱 app/                    # App-level stuff (routing, layout)
│   ├── App.tsx
│   ├── routes.tsx
│   └── providers/
│
├── 🎨 pages/                  # Full page views (what users see)
│   ├── Home.tsx
│   ├── Generate.tsx
│   ├── Study.tsx
│   ├── Library.tsx
│   └── Settings.tsx
│
├── 🧩 components/             # Reusable UI pieces
│   ├── ui/                    # Generic UI (buttons, modals, etc.)
│   ├── learning/              # Learning-specific components
│   ├── generation/            # Generation-specific components
│   └── layout/                # Page layouts
│
├── 🎯 features/               # Business logic by feature
│   │
│   ├── content-generation/    # Everything about generating content
│   │   ├── api/               # API calls for generation
│   │   ├── parsers/           # Parse AI responses
│   │   ├── validators/        # Validate generated content
│   │   └── types.ts
│   │
│   ├── learning-session/      # Everything about learning
│   │   ├── activities/        # Learning activities
│   │   ├── progress/          # Progress tracking
│   │   ├── scoring/           # Score calculation
│   │   └── types.ts
│   │
│   ├── content-storage/       # Everything about saving/loading
│   │   ├── cloud/             # S3 + DynamoDB
│   │   ├── local/             # IndexedDB + localStorage
│   │   ├── sync/              # Syncing logic
│   │   └── types.ts
│   │
│   └── ai-coach/              # AI coach personalities
│       ├── personas.ts
│       ├── voice.ts
│       └── types.ts
│
├── 🗄️ store/                  # Global state (Zustand)
│   ├── auth.ts
│   ├── learning.ts
│   ├── generation.ts
│   └── ui.ts
│
├── 🔧 shared/                 # Truly shared utilities
│   ├── api/                   # API client
│   ├── hooks/                 # Reusable React hooks
│   ├── utils/                 # Pure utility functions
│   └── types/                 # Shared TypeScript types
│
└── 📦 assets/                 # Static files
    ├── audio/
    ├── images/
    └── styles/
```

---

## Key Changes Explained

### 1. **`features/` folder - The Big Win**

**Before**: Everything scattered in `lib/`
```
src/lib/generation/
src/lib/storage/
src/lib/ai/
src/lib/validation/
```

**After**: Grouped by business feature
```
src/features/content-generation/
src/features/content-storage/
src/features/ai-coach/
```

**Why**: When you think "I need to change how content is generated", you go to ONE folder.

---

### 2. **Clear Hierarchy**

**Before**: Flat structure, hard to understand relationships
```
src/lib/generation/backend-generator.ts
src/lib/generation/confusion-generator.ts
src/lib/generation/diagnostic-generator.ts
src/lib/content-adapter/transformer.ts
src/lib/validation/content-quality.ts
```

**After**: Nested by relationship
```
src/features/content-generation/
  ├── api/
  │   └── backend-client.ts          # Talks to backend
  ├── parsers/
  │   ├── json-parser.ts             # Parses JSON
  │   └── transformer.ts             # Transforms data
  ├── validators/
  │   └── content-quality.ts         # Validates quality
  └── generators/
      ├── confusion-pairs.ts         # Generates confusion drills
      └── diagnostic-questions.ts    # Generates diagnostics
```

**Why**: The folder structure tells a story - API → Parse → Validate → Generate

---

### 3. **Intuitive Naming**

**Before**: Technical jargon
- `lib/` - What's a lib?
- `content-adapter/` - What does it adapt?
- `sensa-ai-integration.ts` - Integration with what?

**After**: Plain English
- `features/` - Things the app does
- `content-generation/` - Makes content
- `content-storage/` - Saves content
- `learning-session/` - Learning stuff

**Why**: A non-developer can understand the structure

---

### 4. **Colocation**

**Before**: Related files scattered
```
src/lib/generation/confusion-generator.ts
src/components/learning/activities/ConfusionDrill.tsx
src/lib/types/confusion.ts
```

**After**: Related files together
```
src/features/learning-session/
  ├── activities/
  │   ├── ConfusionDrill.tsx         # Component
  │   ├── confusion-generator.ts     # Logic
  │   └── confusion-types.ts         # Types
```

**Why**: Everything about confusion drills is in ONE place

---

## Migration Plan

### Phase 1: Create New Structure (No Breaking Changes)

1. Create new `features/` folder
2. Copy files to new locations (don't delete old ones yet)
3. Update imports in copied files
4. Test that new structure works

### Phase 2: Update Imports

5. Update all imports to point to new locations
6. Run tests to verify nothing broke
7. Fix any issues

### Phase 3: Delete Old Files

8. Delete old files from `lib/`
9. Clean up empty folders
10. Update documentation

---

## Detailed File Mapping

### Content Generation Feature

**Move these files:**
```
FROM: src/lib/generation/backend-generator.ts
TO:   src/features/content-generation/api/backend-client.ts

FROM: src/lib/content-adapter/json-content-parser.ts
TO:   src/features/content-generation/parsers/json-parser.ts

FROM: src/lib/content-adapter/transformer.ts
TO:   src/features/content-generation/parsers/transformer.ts

FROM: src/lib/content-adapter/sensa-ai-integration.ts
TO:   src/features/content-generation/parsers/ai-integration.ts

FROM: src/lib/validation/content-quality.ts
TO:   src/features/content-generation/validators/content-quality.ts

FROM: src/lib/generation/confusion-generator.ts
TO:   src/features/learning-session/activities/confusion-generator.ts

FROM: src/lib/generation/diagnostic-generator.ts
TO:   src/features/learning-session/activities/diagnostic-generator.ts
```

### Storage Feature

**Move these files:**
```
FROM: src/lib/storage/cloud-storage.ts
TO:   src/features/content-storage/cloud/s3-dynamodb.ts

FROM: src/lib/storage/indexed-db-storage.ts
TO:   src/features/content-storage/local/indexed-db.ts

FROM: src/lib/storage/local-storage.ts
TO:   src/features/content-storage/local/browser-storage.ts

FROM: src/lib/storage/session-progress.ts
TO:   src/features/learning-session/progress/session-tracker.ts

FROM: src/lib/storage/index.ts
TO:   src/features/content-storage/index.ts
```

### AI Coach Feature

**Move these files:**
```
FROM: src/lib/ai/coach/personas.ts
TO:   src/features/ai-coach/personas.ts

FROM: src/lib/ai/coach/index.ts
TO:   src/features/ai-coach/index.ts

FROM: src/lib/voice/static-lines.ts
TO:   src/features/ai-coach/voice/static-lines.ts

FROM: src/hooks/useVoice.ts
TO:   src/features/ai-coach/voice/useVoice.ts
```

### Learning Session Feature

**Move these files:**
```
FROM: src/lib/ai/phases/
TO:   src/features/learning-session/phases/

FROM: src/lib/learning/
TO:   src/features/learning-session/algorithms/

FROM: src/components/learning/activities/
TO:   src/features/learning-session/activities/
```

### Shared Utilities

**Move these files:**
```
FROM: src/lib/utils/
TO:   src/shared/utils/

FROM: src/lib/api/
TO:   src/shared/api/

FROM: src/hooks/
TO:   src/shared/hooks/

FROM: src/lib/types/
TO:   src/shared/types/
```

---

## Benefits of New Structure

### For Developers:
1. ✅ **Find files faster** - Know exactly where to look
2. ✅ **Understand relationships** - Folder structure shows dependencies
3. ✅ **Easier onboarding** - New devs can navigate intuitively
4. ✅ **Better code reviews** - Changes grouped by feature
5. ✅ **Easier testing** - Test entire features in isolation

### For Non-Developers:
1. ✅ **Understand what the app does** - Folder names are self-explanatory
2. ✅ **See feature boundaries** - Each folder is a feature
3. ✅ **Track progress** - Easy to see what's implemented
4. ✅ **Plan features** - Know where new features would go

---

## Example: Finding Code

### Current Structure (Confusing):
**Q: Where's the code that generates confusion drills?**
- A: `src/lib/generation/confusion-generator.ts`? 
- Or `src/components/learning/activities/ConfusionDrill.tsx`?
- Or `src/lib/types/confusion.ts`?
- **Answer: All three!** 😵

### New Structure (Clear):
**Q: Where's the code that generates confusion drills?**
- A: `src/features/learning-session/activities/`
- **Everything is there!** 🎯

---

## Comparison

### Before (Current):
```
src/
├── lib/                       # ❓ What's in here?
│   ├── ai/                    # ❓ AI for what?
│   ├── generation/            # ❓ Generates what?
│   ├── storage/               # ❓ Stores what?
│   ├── validation/            # ❓ Validates what?
│   ├── learning/              # ❓ Learning what?
│   ├── content-adapter/       # ❓ Adapts what?
│   └── utils/                 # ❓ Utils for what?
```

### After (Proposed):
```
src/
├── features/                  # ✅ Things the app does
│   ├── content-generation/    # ✅ Makes learning content
│   ├── content-storage/       # ✅ Saves/loads content
│   ├── learning-session/      # ✅ Learning activities
│   └── ai-coach/              # ✅ AI coach personalities
├── shared/                    # ✅ Reusable utilities
└── components/                # ✅ UI components
```

---

## Next Steps

**Option 1: Full Reorganization** (Recommended)
- Effort: 4-6 hours
- Benefit: Much clearer structure
- Risk: Low (just moving files)

**Option 2: Incremental Reorganization**
- Start with one feature (e.g., content-generation)
- Move files gradually
- Less disruptive but takes longer

**Option 3: Document Current Structure**
- Add README.md to each folder explaining what's inside
- Quicker but doesn't solve the root problem

---

## Would You Like Me To:

1. **Start the reorganization?** - I can move files and update imports
2. **Create a detailed migration guide?** - Step-by-step instructions
3. **Just document the current structure?** - Add README files explaining what's where

Let me know which approach you prefer!

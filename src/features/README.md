# Features Directory
This directory contains all business features organized by what they do, not how they work.
## Structure
```
features/
├── content-generation/ # Everything about generating learning content
├── content-storage/ # Everything about saving/loading content
├── learning-session/ # Everything about learning activities
└── ai-coach/ # AI coach personalities and mood
```
## Features
### Content Generation (`content-generation/`)
Handles all aspects of generating learning content from user input.
**Subdirectories:**
- `api/` - Backend communication (Lambda, Claude)
- `parsers/` - Parse and transform AI responses
- `validators/` - Validate content quality
- `generators/` - Generate specific content types
**Key Files:**
- `api/backend-client.ts` - Main generation orchestrator
- `parsers/json-parser.ts` - Parse JSON/Markdown content
- `parsers/transformer.ts` - Transform to learning concepts
- `validators/content-quality.ts` - Quality checks
**Use When:**
- Generating new learning content
- Parsing AI responses
- Validating generated content
- Calculating tiers and dependencies
---
### Content Storage (`content-storage/`)
Handles all aspects of saving and loading content.
**Subdirectories:**
- `cloud/` - S3 + DynamoDB storage
- `local/` - IndexedDB + localStorage
- `sync/` - Import/export functionality
**Key Files:**
- `cloud/s3-dynamodb.ts` - Cloud storage (source of truth)
- `local/indexed-db.ts` - Offline cache
- `local/browser-storage.ts` - UI preferences only
- `sync/import.ts` - File import
**Storage Hierarchy:**
1. **Cloud (DynamoDB)** - Source of truth for concepts
2. **IndexedDB** - Offline cache for performance
3. **localStorage** - UI preferences only (theme, settings)
---
### Learning Session (`learning-session/`)
Handles all aspects of learning activities and progress tracking.
**Subdirectories:**
- `activities/` - Learning activity generators
- `progress/` - Progress tracking and metrics
- `algorithms/` - Learning algorithms (spacing, interleaving)
- `phases/` - Learning phase AI (Build, Preview, Retain)
**Key Files:**
- `activities/confusion-generator.ts` - Generate confusion drills
- `activities/diagnostic-generator.ts` - Generate diagnostic questions
- `progress/session-tracker.ts` - Track session progress
- `algorithms/spacing-engine.ts` - Spaced repetition
- `phases/build-ai.ts` - Build phase AI prompts
**Use When:**
- Running learning activities
- Tracking progress
- Selecting next concept
- Calculating mastery
---
### AI Coach (`ai-coach/`)
Handles AI coach personalities and mood-based adjustments.
**Key Files:**
- `personas.ts` - Coach personality definitions (5 personas × 7 phases × 5 situations)
- `index.ts` - Mood system, elaborative interrogation prompts, breathing exercises
**Use When:**
- Selecting coach personality
- Getting mood-adjusted session parameters
- Generating elaborative interrogation prompts
---
## Import Patterns
### Good: Import from feature folders
```typescript
// Import from specific feature
import { generateWithBackend } from '@/features/content-generation/api/backend-client';
import { cloudStorage } from '@/features/content-storage/cloud/s3-dynamodb';
import { confusionGenerator } from '@/features/learning-session/activities/confusion-generator';
import { getAllPersonas } from '@/features/ai-coach/personas';
// Or use barrel exports
import { generateWithBackend } from '@/features/content-generation';
import { cloudStorage } from '@/features/content-storage';
```
### Bad: Don't import from old lib folder
```typescript
// OLD - Don't use these anymore
import { generateWithBackend } from '@/lib/generation/backend-generator';
import { cloudStorage } from '@/lib/storage/cloud-storage';
```
---
## Benefits of This Structure
### For Developers:
1. **Find files faster** - Know exactly where to look
2. **Understand relationships** - Folder structure shows dependencies
3. **Easier onboarding** - New devs can navigate intuitively
4. **Better code reviews** - Changes grouped by feature
5. **Easier testing** - Test entire features in isolation
### For Non-Developers:
1. **Understand what the app does** - Folder names are self-explanatory
2. **See feature boundaries** - Each folder is a feature
3. **Track progress** - Easy to see what's implemented
4. **Plan features** - Know where new features would go
---
## Adding New Features
When adding a new feature:
1. Create a new folder under `features/`
2. Use a descriptive name (what it does, not how)
3. Organize by subdirectories if complex
4. Create an `index.ts` for barrel exports
5. Add documentation to this README
Example:
```
features/
└── exam-preparation/ # New feature
 ├── practice-tests/
 ├── flashcards/
 ├── study-guides/
 └── index.ts
```
---
## Migration Notes
This structure was created on January 29, 2026 as part of a comprehensive reorganization.
**What Changed:**
- Moved from `src/lib/` to `src/features/`
- Organized by business feature instead of technical layer
- Updated all imports across 127 files
- Created barrel exports for convenience
**What Stayed the Same:**
- All functionality intact
- Zero breaking changes
- Same TypeScript types
- Same API contracts
**Old Structure (Deprecated):**
```
src/lib/
├── generation/
├── storage/
├── ai/
├── learning/
├── validation/
└── content-adapter/
```
**New Structure:**
```
src/features/
├── content-generation/
├── content-storage/
├── learning-session/
└── ai-coach/
```
The old `lib/` folders are kept temporarily for backwards compatibility but will be removed in a future cleanup.

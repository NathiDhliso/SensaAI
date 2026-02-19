# Futuristic Priming Zone (Integrated ULC Matrix)

## Overview

The Futuristic Priming Zone is an immersive, glassmorphism-styled cognitive reference tool that teaches users the "HOW" of technical disciplines through atomic drill-downs.

**KEY FEATURE: Fully Dynamic** - The system automatically detects ULC patterns from your generated `LearningConcept` data. **No hardcoded syllabus or content.**

## Architecture

### 3-Dimensional Matrix System

1. **X-Axis (Columns)**: The 3 Universal Actions
   - CREATE
   - CONFIGURE
   - MONITOR

2. **Y-Axis (Rows)**: Concepts/Resources with nested hierarchy
   - Dynamically extracted from `LearningConcept.trunkDomain` and `parentName`
   - Example: Storage → Storage Account → Access Keys
   - Supports unlimited nesting depth

3. **Z-Axis (Drill-Down)**: The Priming Card
   - Opens when clicking any matrix intersection
   - Contains exactly 3 sections (strict requirement)
   - Built from concept's `lifecycle`, `howToUse`, and `prerequisites`

### Priming Card Structure

Every priming card MUST contain exactly three sections:

1. **🧠 The Trick (Schema Construction)**
   - Mental model or pattern to find the setting
   - Extracted from: `metaphor`, `hookSentence`, or `whyYouNeed`
   - No rote memorization required

2. **🔗 The Chain (Constraints)**
   - Strict prerequisites that MUST exist
   - Extracted from: `prerequisites`, `lifecycle.phase1.steps`, `commonPitfalls`
   - Dependencies and requirements

3. **⚡ Atomic Steps (Execution)**
   - Numbered list of exact clicks required
   - Extracted from: `workedExample.steps`, `howToUse`, `lifecycle` phases
   - Pure execution, no explanations

## Visual Design

### Glassmorphism Aesthetic

- Strict frosted glass panels: `rgba(255, 255, 255, 0.03)` with `backdrop-filter: blur(16px)`
- Neon cyan glow on hover: `box-shadow: 0 0 20px rgba(56, 189, 248, 0.2)`
- Deep dark background: `radial-gradient(circle at center, #0f172a 0%, #000000 100%)`
- High-contrast text: `#e2e8f0`

### Section Colors

- 🧠 Understanding: Pink `#ec4899`
- 🔗 Linking: Cyan `#06b6d4`
- ⚡ Committing: Yellow `#fbbf24`

## Components

### FuturisticPrimingZone
Main container component that orchestrates the entire experience.

**Usage:**
```tsx
import FuturisticPrimingZone from '@/features/priming-zone/components/FuturisticPrimingZone';
import type { LearningConcept } from '@/shared/types/learning';

// REQUIRED: Pass your dynamically generated concepts
<FuturisticPrimingZone 
  concepts={learningConcepts}  // Your LearningConcept[] array
  onClose={() => console.log('Closed')}
/>
```

**Testing Only:**
```tsx
import { azureBlueprint } from '@/features/priming-zone/azure-blueprint';

// For testing/demo purposes only - NOT for production
<FuturisticPrimingZone 
  matrix={azureBlueprint}
  concepts={[]}  // Empty when using test blueprint
  onClose={() => {}}
/>
```

### detectULCPattern
The intelligent detector that analyzes your `LearningConcept[]` data:

```tsx
import { detectULCPattern } from '@/features/priming-zone/detector';

const matrix = detectULCPattern(concepts);
// Returns ConceptMatrix | null
```

**Detection Logic:**
- Maps concepts to Universal Actions based on:
  1. `lifecyclePhase` (PREPARE → CREATE, MODEL → CONFIGURE, DELIVER → MONITOR)
  2. Concept name analysis (keywords: create, configure, monitor, etc.)
- Builds hierarchy from `trunkDomain`, `parentName`, and concept relationships
- Generates priming cards from concept's own data fields
- **No hardcoded assumptions or fallback content**

### GlassMatrixTable
The 2D grid displaying the matrix (X × Y axes).

### PrimingDrillDownCard
The Z-axis modal that displays the 3-part priming content.

## Data Structure

### ConceptMatrix
```typescript
interface ConceptMatrix {
  concepts: AtomicConcept[];      // Y-axis hierarchy
  cells: MatrixCell[];            // Action × Concept intersections
  domain: string;                 // Extracted from concepts
  version: string;
}
```

### MatrixCell
```typescript
interface MatrixCell {
  action: UniversalAction;        // CREATE | CONFIGURE | MONITOR
  conceptId: string;
  conceptPath: string[];          // Breadcrumb trail
  primingCard: PrimingCard;       // The 3-section content
}
```

### PrimingCard
```typescript
interface PrimingCard {
  trick: { title: string; content: string };
  chain: { title: string; constraints: string[] };
  steps: { title: string; actions: string[] };
}
```

## Design Principles

1. **No Hardcoded Content**: All content extracted from `LearningConcept[]`
2. **No Gamification**: Pure cognitive reference tool
3. **No Chat Interfaces**: Direct, focused information
4. **Cognitive Load Management**: 3-section structure reduces overwhelm
5. **Immersive Experience**: Feels like stepping into a "holodeck"
6. **HOW, Not WHY**: Pure execution focus

## Strict Rules

1. **Three Actions Only:** CREATE, CONFIGURE, MONITOR (never more)
2. **Three Sections Only:** Trick, Chain, Steps (never more)
3. **No "Why":** Only mental models, prerequisites, and execution steps
4. **No Gamification:** Pure reference tool, no points or progress bars
5. **No Hardcoded Syllabus:** All content must come from dynamic `LearningConcept[]` data

## Testing

The `azure-blueprint.ts` file contains a hardcoded Azure Administration matrix for testing purposes only. This should NEVER be used as a fallback in production - it's purely for demos and development.

## Future Enhancements

Potential additions (not in current scope):
- Export priming cards as PDF
- Keyboard navigation
- Search/filter matrix cells
- Custom themes
- Multi-domain support

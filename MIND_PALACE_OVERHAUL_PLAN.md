# Mind Palace Feature Overhaul - Implementation Plan

> **Document Version**: 2.0  
> **Created**: January 3, 2026  
> **Updated**: January 3, 2026  
> **Status**: Planning  
> **Priority**: High  
> **Approach**: Hybrid Model with Mnemonic Anchors & "Freeze & Bake" Layouts

---

## Executive Summary

The current Mind Palace implementation relies on Google Street View for exterior building views, which limits the "walking through rooms" memory palace metaphor. This overhaul introduces a **"Facade & Floor Plan" hybrid model** combining:

1. **Dependency Metrics** (Logic Layer) - Auto-calculated concept importance from relationships
2. **Mnemonic Anchors** (Visual Layer) - AI-generated memorable characters with emojis
3. **"Freeze & Bake" Layouts** - Deterministic treemap positioning saved to database

This creates a spatially permanent, visually memorable learning experience where concepts become characters in rooms that never reshuffle.

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Problem Statement](#2-problem-statement)
3. [Proposed Architecture](#3-proposed-architecture)
4. [Data Model Changes](#4-data-model-changes)
5. [Phase 1: Dependency Metrics & Mnemonic Foundation](#phase-1-dependency-metrics--mnemonic-foundation)
6. [Phase 2: Freeze & Bake Logic Engine](#phase-2-freeze--bake-logic-engine)
7. [Phase 3: Floor Plan View (Treemap Blueprint)](#phase-3-floor-plan-view-treemap-blueprint)
8. [Phase 4: The Mnemonic Bridge](#phase-4-the-mnemonic-bridge)
9. [Phase 5: View Integration (Mode Switcher)](#phase-5-view-integration-mode-switcher)
10. [Phase 6: Graph Visualization Layer](#phase-6-graph-visualization-layer)
11. [Phase 7: Manual Layout Tuning](#phase-7-manual-layout-tuning)
12. [Code Removal Checklist](#code-removal-checklist)
13. [Migration Strategy](#migration-strategy)
14. [Testing Plan](#testing-plan)
15. [Risk Assessment](#risk-assessment)

---

## 1. Current State Analysis

### Files to Review/Modify

```
src/components/palace/
├── ConceptMarker.tsx          # KEEP - Refactor for new positioning
├── ConceptMarker.module.css   # KEEP - Update styles
├── ConceptTooltip.tsx         # KEEP - Enhance with dependency info
├── DailyWalk.tsx              # KEEP - Update for new views
├── GuidedTour.tsx             # REFACTOR - Support multiple view modes
├── LifecycleCard.tsx          # KEEP
├── PalaceView.tsx             # MAJOR REFACTOR - Core changes
├── PalaceView.module.css      # UPDATE
├── PanoramaViewer/            # EVALUATE - May reduce dependency
├── PlacementGuide.tsx         # REFACTOR - AI-guided placement
├── ProgressPanel.tsx          # KEEP
├── QuizMode.tsx               # KEEP - Update for graph view
├── RouteBuilder/              # REFACTOR - New building selection logic
└── RoutePreviewCard.tsx       # KEEP

src/lib/google-maps/
├── index.ts                   # KEEP - Reduce scope
├── marker-positioning.ts      # MAJOR REFACTOR - Dependency-based positioning
└── street-view-loader.ts      # KEEP - Optional exterior view

src/lib/types/
├── learning.ts                # ADD - DependencyMetrics, SubjectGraph
└── palace.ts                  # UPDATE - New placement types

src/components/
└── GoogleMap.tsx              # KEEP - Minimap functionality
```

### Current Dependencies to Evaluate

| Package | Current Use | New Plan |
|---------|-------------|----------|
| `@react-google-maps/api` | Street View panorama | Keep for facade view, reduce reliance |
| `framer-motion` | Animations | Keep, extend for transitions & graph animations |
| `lucide-react` | Icons | Keep |
| (NEW) `d3-hierarchy` | N/A | **Treemap layout** for Floor Plan (deterministic) |
| (NEW) `d3-force` | N/A | Graph View only (not Floor Plan) |

---

## 2. Problem Statement

### Limitations of Current Approach

1. **Exterior Only**: Google Street View doesn't provide interior views
2. **Static Placement**: Nodes placed at fixed heading offsets, not semantically
3. **No Dependency Awareness**: Placement ignores concept relationships
4. **Cognitive Disconnect**: Building exterior doesn't reinforce content structure
5. **Manual Tier Assignment**: `Foundation/Keystone/Utility` set by LLM, not validated

### User Pain Points

- Cannot "walk through rooms" as traditional memory palace suggests
- Placement feels arbitrary, not connected to subject matter
- No visual indication of which concepts are most important
- Difficult to understand relationships between concepts

---

## 3. Proposed Architecture

### Three-Layer Mind Palace Model

```
┌─────────────────────────────────────────────────────────────┐
│                    VIEW MODE TOGGLE                         │
│              [Facade] [Floor Plan] [Graph]                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  LAYER 1: FACADE VIEW (Current Street View - Simplified)   │
│  ─────────────────────────────────────────────────────────  │
│  • Building exterior as "domain container"                  │
│  • Dependency nodes overlaid on facade                      │
│  • Vertical position = importance tier                      │
│  • Connection lines on hover                                │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  LAYER 2: FLOOR PLAN VIEW (NEW - Primary Learning View)    │
│  ─────────────────────────────────────────────────────────  │
│  • AI-generated schematic interior                          │
│  • Rooms = lifecycle stages                                 │
│  • Force-directed graph within rooms                        │
│  • Doorways = stage transitions                             │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  LAYER 3: GRAPH VIEW (NEW - Analysis/Overview)             │
│  ─────────────────────────────────────────────────────────  │
│  • Pure dependency visualization                            │
│  • Bar chart sidebar (dependency counts)                    │
│  • Click node → navigate to concept                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Component Architecture

```
<PalaceView>
  ├── <ViewModeToggle />           # NEW: Switch between views
  │
  ├── <FacadeView />               # REFACTORED: Simplified Street View
  │   ├── <StreetViewPanorama />   # Existing, optional
  │   ├── <DependencyOverlay />    # NEW: SVG lines + positioned nodes
  │   └── <ConceptMarker />        # REFACTORED: Tier-aware sizing
  │
  ├── <FloorPlanView />            # NEW: Primary learning interface
  │   ├── <RoomLayout />           # Rooms for each stage
  │   ├── <ForceGraph />           # D3/react-force-graph
  │   ├── <DoorwayTransition />    # Animated stage connections
  │   └── <ConceptNode />          # Interactive graph nodes
  │
  ├── <GraphView />                # NEW: Full dependency analysis
  │   ├── <DependencyGraph />      # Force-directed full view
  │   ├── <DependencyBarChart />   # Horizontal bar chart
  │   └── <NodeDetail />           # Hover/click detail panel
  │
  └── <AIPlacementGuide />         # NEW: Verification toasts
```

---

## 4. Data Model Changes

### Design Philosophy: Two-Layer System

```
┌─────────────────────────────────────────────────────────────┐
│  LOGIC LAYER: DependencyMetrics                             │
│  ═══════════════════════════════                            │
│  • Auto-calculated from content relationships               │
│  • Determines SIZE (Foundation = Big, Utility = Small)      │
│  • Drives the Treemap algorithm                             │
├─────────────────────────────────────────────────────────────┤
│  VISUAL LAYER: MnemonicContext                              │
│  ═══════════════════════════════                            │
│  • AI-generated memorable anchors                           │
│  • Determines APPEARANCE (Emoji + Character Name)           │
│  • Creates the memory palace "furniture"                    │
└─────────────────────────────────────────────────────────────┘
```

### New Types to Add

```typescript
// src/lib/types/learning.ts - ADD

/**
 * Mnemonic context for Memory Palace visualization.
 * The VISUAL layer - what users see and remember.
 */
export interface MnemonicContext {
  /** Concrete noun + emoji (e.g., "Volcano 🌋") - starts with same letter as concept */
  anchor: string;
  /** Bizarre story linking anchor to concept function */
  story: string;
  /** Generated image URL for "Foundation" concepts (Silver Bullet) */
  imageUrl?: string;
  /** Visual tier override (user can adjust for personal preference) */
  tierOverride?: 'Foundation' | 'Keystone' | 'Utility';
}

/**
 * Metrics calculated from content generation dependency analysis.
 * The LOGIC layer - drives layout algorithm.
 */
export interface DependencyMetrics {
  conceptId: string;
  conceptName: string;
  
  // Dependency counts (from generated content analysis)
  dependentCount: number;      // How many concepts depend on THIS
  dependencyCount: number;     // How many concepts THIS depends on
  totalConnections: number;    // Sum of above
  
  // Auto-calculated tier based on dependentCount
  calculatedTier: 'Foundation' | 'Keystone' | 'Utility';
  
  // Graph layout hints
  centralityScore: number;     // 0-1, hub importance
  clusterGroup: string;        // Stage/lifecycle group
}

/**
 * Full dependency graph for a subject
 */
export interface SubjectGraph {
  subjectId: string;
  generatedAt: string;
  
  nodes: Array<{
    id: string;
    name: string;
    stageId: string;
    metrics: DependencyMetrics;
    position?: { x: number; y: number }; // Cached layout position
  }>;
  
  edges: Array<{
    id: string;
    source: string;           // conceptId
    target: string;           // conceptId
    relationship: 'depends-on' | 'enables' | 'related-to';
    weight: number;           // Connection strength 0-1
  }>;
  
  // Aggregated stats
  stats: {
    totalNodes: number;
    totalEdges: number;
    foundationCount: number;
    keystoneCount: number;
    utilityCount: number;
    centralHub: string;       // Most connected concept
  };
}

/**
 * AI placement verification context
 */
export interface PlacementVerification {
  conceptId: string;
  suggestedPosition: { x: number; y: number; tier: string };
  userPosition: { x: number; y: number };
  aiReasoning: string;
  alignmentScore: number;     // 0-1, how well placement matches dependencies
  suggestions: string[];
  accepted: boolean;
}
```

### Updates to Existing Types

```typescript
// src/lib/types/palace.ts - UPDATE

export interface MemoryPalace {
  id: string;
  subjectId: string;
  routeId: string;
  buildings: PalaceBuilding[];
  createdAt: string;
  lifecycleLabels?: { phase1: string; phase2: string; phase3: string };
  
  // NEW FIELDS
  viewMode: 'facade' | 'floorplan' | 'graph';
  dependencyGraph?: SubjectGraph;           // Cached graph data
  layoutVersion: number;                     // For migration
}

export interface PlacedConcept {
  conceptId: string;
  conceptName: string;
  slotId: string;
  lifecycle: { phase1: string[]; phase2: string[]; phase3: string[] };
  mastery: number;
  
  // TWO-LAYER SYSTEM
  mnemonic?: MnemonicContext;              // VISUAL: What user sees (emoji, story)
  dependencyMetrics?: DependencyMetrics;   // LOGIC: Drives layout size
  
  // "FREEZE & BAKE" - Saved positions (never reshuffles)
  treemapPosition?: {                      // Floor plan position (from d3-hierarchy)
    x: number;
    y: number;
    width: number;
    height: number;
    roomId: string;                        // Which stage/room it belongs to
  };
  facadePosition?: { tier: number; offset: number }; // Facade overlay position
  
  // User customization
  positionOverride?: { x: number; y: number }; // Manual drag adjustment
}
```

---

## Phase 1: Dependency Metrics & Mnemonic Foundation

**Duration**: 4-5 days  
**Goal**: Extract dependency information AND generate mnemonic anchors during content generation

### Tasks

- [ ] **1.1** Update system prompt for Dependencies AND Mnemonics
  - File: `src/lib/system-prompt.ts`
  - Add instructions for:
    1. **Dependencies**: `"depends_on": ["concept1", "concept2"]`
    2. **Mnemonic Anchor**: Concrete noun + emoji starting with same letter as concept
    3. **Bizarre Story**: Links anchor to concept's function
  
  **Prompt Addition Example**:
  ```
  For each concept, generate:
  1. A "depends_on" array listing prerequisite concepts
  2. A "mnemonic" object with:
     - "anchor": A concrete noun starting with the same letter as the concept, 
       followed by a relevant emoji (e.g., for "VNet" → "Volcano 🌋")
     - "story": A bizarre, memorable story linking the anchor to the concept's 
       function (e.g., "A massive Volcano erupts, but instead of lava, it spews 
       private network cables that connect all the villages below...")
  ```

- [ ] **1.2** Create dependency parser
  - File: `src/lib/generation/dependency-parser.ts` (NEW)
  - Parse LLM output for dependency relationships
  - Build edge list from `depends_on` arrays
  - Calculate `dependentCount` for each concept

- [ ] **1.3** Create mnemonic parser
  - File: `src/lib/generation/mnemonic-parser.ts` (NEW)
  - Extract anchor and story from LLM output
  - Validate anchor starts with same letter as concept
  - Extract emoji from anchor string for rendering

- [ ] **1.4** Add SubjectGraph to generation result
  - File: `src/lib/types.ts`
  - Include `SubjectGraph` in `GenerationResult`
  - Include `mnemonic` on each concept
  - Store in learning store alongside content

- [ ] **1.5** Update content adapter
  - File: `src/lib/content-adapter/index.ts`
  - Populate `DependencyMetrics` on each concept
  - Populate `MnemonicContext` on each concept
  - Calculate `totalConnections` and `centralityScore`

### Acceptance Criteria

- [ ] Generated content includes dependency relationships
- [ ] Each concept has `dependentCount` and `dependencyCount`
- [ ] Each concept has a mnemonic anchor (noun + emoji) and story
- [ ] Anchor starts with same letter as concept name
- [ ] `SubjectGraph` is saved with subject data
- [ ] Graph and mnemonics can be retrieved for any generated subject


---

## Phase 1.5 (NEW): The Visual Bridge (Titan Image Gen)

**Duration**: 2-3 days
**Goal**: Generate ACTUAL images for Foundation concepts using AWS Bedrock (Titan), bridging the Aphantasia gap.

### Tasks

- [ ] **1.5.1** Setup Bedrock Image Generator
  - File: `src/lib/generation/image-generator.ts` (NEW)
  - Model: `amazon.titan-image-generator-v1`
  - Prompt: "Surrealist oil painting of [Anchor] [Story Interaction]"
  
- [ ] **1.5.2** Update Generation Store
  - Async generation of images *after* text content is done
  - Only generate for `dependsOn.length >= 8` (Cost control)

- [ ] **1.5.3** Update Mnemonic Context
  - Add `imageUrl` field
  - Display requested image in Tooltip/Card

---

## Phase 2: Freeze & Bake Logic Engine

**Duration**: 3-4 days  
**Goal**: Create the deterministic layout calculator that runs ONCE at generation time

### Design Philosophy: Calculate Once, Store Forever

```
┌─────────────────────────────────────────────────────────────┐
│  GENERATION TIME (Once)                                     │
│  ═══════════════════════                                    │
│                                                             │
│  Content Generated → Treemap Calculated → Saved to Sprint   │
│                                                             │
│  No recalculation on load. Positions are "baked in".       │
└─────────────────────────────────────────────────────────────┘
```

### Tasks

- [ ] **2.1** Create Tier Calculation Utility
  - File: `src/lib/generation/tier-calculator.ts` (NEW)
  ```typescript
  function calculateTier(dependentCount: number): Tier {
    if (dependentCount >= 8) return 'Foundation';
    if (dependentCount >= 3) return 'Keystone';
    return 'Utility';
  }
  
  // Treemap weighting based on tier
  const TIER_WEIGHTS = {
    'Foundation': 4,  // 4x area
    'Keystone': 2,    // 2x area
    'Utility': 1      // 1x area (base)
  };
  ```

- [ ] **2.2** Create Treemap Calculator
  - File: `src/lib/palace/floor-plan-generator.ts` (NEW)
  - Library: `npm install d3-hierarchy`
  
  ```typescript
  import { hierarchy, treemap, treemapSquarify } from 'd3-hierarchy';
  
  interface TreemapInput {
    concepts: Array<{
      id: string;
      name: string;
      stageId: string;
      tier: 'Foundation' | 'Keystone' | 'Utility';
    }>;
    stages: Array<{ id: string; name: string }>;
  }
  
  interface TreemapPosition {
    x: number;      // 0-1 normalized
    y: number;      // 0-1 normalized
    width: number;  // 0-1 normalized
    height: number; // 0-1 normalized
    roomId: string;
  }
  
  // Fixed aspect ratio - scales via CSS transform
  const CANVAS_WIDTH = 1600;  // 16:9 aspect
  const CANVAS_HEIGHT = 900;
  
  function generateFloorPlan(input: TreemapInput): Map<string, TreemapPosition> {
    // 1. Group concepts by stage (room)
    // 2. For each room, run d3.treemap() with tier weights
    // 3. Return normalized positions (0-1 range)
  }
  ```

- [ ] **2.3** Integrate with Generation Pipeline
  - File: `src/lib/content-adapter/index.ts`
  - **Trigger**: Call `generateFloorPlan()` immediately after content parsing
  - **Before**: Content → Parse → Store
  - **After**: Content → Parse → **Calculate Treemap** → Store

- [ ] **2.4** Simplified Persistence (No Separate DB)
  - Storage: Save `treemapPositions` directly to Sprint object in localStorage
  - File: `src/store/sprint-store.ts` or wherever Sprint data lives
  
  ```typescript
  interface Sprint {
    // ... existing fields
    
    // NEW: Baked floor plan layout
    floorPlan?: {
      generatedAt: string;
      canvasSize: { width: number; height: number };
      positions: Record<string, TreemapPosition>; // conceptId → position
    };
  }
  ```

- [ ] **2.5** Add "Regenerate Layout" option (escape hatch)
  - For edge cases where user wants fresh layout
  - Clears `floorPlan` and recalculates
  - Confirmation dialog: "This will reset your customizations"

### Acceptance Criteria

- [ ] Treemap calculated **once** at generation time
- [ ] Positions saved to Sprint object in localStorage
- [ ] Loading a Sprint shows **identical** layout every time
- [ ] Foundation concepts get 4x area, Utility gets 1x
- [ ] Fixed 16:9 canvas scales cleanly via CSS
- [ ] "Regenerate" option available but discouraged

---

## Phase 3: Floor Plan View (Treemap Blueprint)

**Duration**: 5-7 days  
**Goal**: Create the primary "interior" learning experience with **deterministic, spatially permanent layouts**

### Key Design Decisions

| Aspect | Old Plan | New Plan (Freeze & Bake) |
|--------|----------|-------------------------|
| Layout Algorithm | `d3-force` (Physics) | `d3-hierarchy` (Treemap) |
| Position Stability | Recalculated on load | **Saved to database** |
| Visual Representation | Circles + Lines | **Emojis + Rectangles** |
| Concept Label | Technical Name | **Mnemonic Anchor** |

### Tasks

- [ ] **3.1** Create FloorPlanView component
  - File: `src/components/palace/FloorPlanView/FloorPlanView.tsx` (NEW)
  - SVG-based room layout (blueprint aesthetic)
  - Dark blue/black background with grid lines
  - Rooms arranged in logical flow

- [ ] **3.2** Implement Treemap Layout Generator ("Freeze & Bake")
  - File: `src/lib/palace/floor-plan-generator.ts` (NEW)
  - Library: `npm install d3-hierarchy`
  - **Input**: stages, concepts with `calculatedTier`
  - **Algorithm**:
    1. Group concepts by Stage (e.g., "Provision", "Monitor")
    2. Use `d3.treemap()` to calculate `{x, y, width, height}` for each concept
    3. Size based on tier: Foundation = Large rectangle, Utility = Small
  - **Output**: Deterministic positions
  - **CRITICAL**: Save positions to database (`treemapPosition` field)
  
  ```typescript
  // Treemap sizing based on tier
  const tierWeights = {
    'Foundation': 4,  // 4x area
    'Keystone': 2,    // 2x area  
    'Utility': 1      // 1x area (base)
  };
  ```

- [ ] **3.3** Create Room component
  - File: `src/components/palace/FloorPlanView/Room.tsx` (NEW)
  - Room background with stage-specific color tint
  - Room label (lifecycle stage name)
  - Blueprint-style borders and grid
  - Entry/exit doorway indicators

- [ ] **3.4** Create MnemonicNode component (Emoji-Based)
  - File: `src/components/palace/FloorPlanView/MnemonicNode.tsx` (NEW)
  - **NOT circles** → Rectangles from treemap with emoji inside
  - Extract emoji from `mnemonic.anchor` string
  - Render large emoji centered in rectangle
  - Tier-based sizing (Foundation = biggest emoji)
  
  **Interaction States**:
  ```
  Default:    [🌋]           ← Just the emoji
  Hover:      [🌋 Volcano]   ← Emoji + Anchor name (the "hook")
  Click:      Full card with Story + Definition reveal
  ```

- [ ] **3.5** Implement position persistence
  - On first render: Calculate treemap, save to `treemapPosition`
  - On subsequent renders: Load from database, skip recalculation
  - Result: Room layout **never reshuffles** (spatial permanence)

- [ ] **3.6** Add dependency lines (optional layer)
  - Subtle connecting lines between related concepts
  - Only show on hover or toggle
  - Prevents visual clutter

### Acceptance Criteria

- [ ] Floor plan renders with correct room count
- [ ] Concepts display as **emojis** (not circles)
- [ ] Foundation concepts are visually larger than Utility
- [ ] **Positions are saved** and identical on reload
- [ ] Hover shows anchor name, click shows story
- [ ] Can navigate between rooms smoothly


---

## Phase 3.5 (NEW): Semantic Room Themes (Cognitive Load)

**Duration**: 2 days
**Goal**: Visually differentiate rooms based on domain to reduce "Same-ness" fatigue.

### Tasks

- [ ] **3.5.1** Create Theme Engine
  - File: `src/lib/palace/theme-engine.ts` (NEW)
  - Themes: `Factory`, `Library`, `Garden`, `Laboratory`
  - Auto-select based on Course Subject (e.g., CS = Factory)

- [ ] **3.5.2** Create CSS Themes
  - File: `src/components/palace/FloorPlanView/RoomThemes.module.css` (NEW)
  - SVG Patterns for backgrounds
  - Color palettes (border, background, accent)

- [ ] **3.5.3** Integrate with FloorPlanView
  - Pass `theme` prop to Room component
  - Render static "Landmarks" in empty Foundation spots

---

## Phase 4: The Mnemonic Bridge

**Duration**: 2-3 days  
**Goal**: Create a seamless, magical transition from Exterior (Street View/Panorama) to Interior (Floor Plan)

### Concept: "Entering the Building"

The user clicks an entrance on the Google Street View facade and experiences a **cinematic transition** into the blueprint interior.

```
┌─────────────────────────────────────────────────────────────┐
│  TRANSITION SEQUENCE                                        │
│  ══════════════════                                         │
│                                                             │
│  1. User clicks "Enter" on Street View facade               │
│         ↓                                                   │
│  2. Street View fades to black (0.5s)                       │
│         ↓                                                   │
│  3. Blueprint grid lines draw in (0.3s)                     │
│         ↓                                                   │
│  4. Room boundaries expand into view (0.5s)                 │
│         ↓                                                   │
│  5. Emojis (furniture) pop in one by one (staggered 0.1s)  │
│         ↓                                                   │
│  6. Floor Plan fully visible, interactive                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Tasks

- [ ] **4.1** Create DoorwayTransition component
  - File: `src/components/palace/FloorPlanView/DoorwayTransition.tsx` (NEW)
  - Framer Motion orchestration
  - Sequence: fade → grid → rooms → emojis

- [ ] **4.2** Add "Enter Building" hotspot to Facade
  - File: `src/components/palace/FacadeView/EntranceMarker.tsx` (NEW)
  - Glowing door/entrance indicator on Street View
  - Pulsing animation to draw attention
  - Click triggers transition

- [ ] **4.3** Implement staggered emoji animation
  - Emojis appear in dependency order (Foundation first)
  - Creates sense of "furniture being placed"
  - Use Framer Motion `staggerChildren`

- [ ] **4.4** Add ambient audio cue (optional)
  - Subtle "door opening" or "blueprint unfolding" sound
  - Enhances immersion without being distracting

### Acceptance Criteria

- [ ] Clicking entrance triggers smooth transition
- [ ] Transition feels like "entering a building"
- [ ] Emojis appear in logical order (parents before children)
- [ ] No jarring jumps or layout shifts
- [ ] Can reverse transition (exit to exterior)

---

## Phase 5: View Integration (Mode Switcher)

**Duration**: 2-3 days  
**Goal**: Manage state between Old (Exterior) and New (Interior) views cleanly

### Design: PalaceView as Mode Switcher

The existing `PalaceView.tsx` currently switches between "Loading", "StreetView", and "Panorama". We refactor it to become a **clean mode switcher**:

```
┌─────────────────────────────────────────────────────────────┐
│  PalaceView State Machine                                   │
│  ════════════════════════                                   │
│                                                             │
│  viewMode: 'exterior' | 'interior' | 'graph'                │
│                                                             │
│  ┌──────────┐    Enter    ┌──────────┐   Analyze  ┌───────┐│
│  │ EXTERIOR │ ──────────► │ INTERIOR │ ─────────► │ GRAPH ││
│  │          │ ◄────────── │          │ ◄───────── │       ││
│  └──────────┘    Exit     └──────────┘   Back     └───────┘│
│       │                                                     │
│       │ Default on load                                     │
│       ▼                                                     │
│  Renders: PanoramaPalaceView (existing)                     │
│           OR StreetViewLoader (if no panorama)              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Tasks

- [ ] **5.1** Refactor PalaceView.tsx as Mode Switcher
  - File: `src/components/palace/PalaceView.tsx`
  - Add state: `viewMode: 'exterior' | 'interior' | 'graph'`
  - Default: `'exterior'` (preserves current behavior)
  
  ```typescript
  const [viewMode, setViewMode] = useState<'exterior' | 'interior' | 'graph'>('exterior');
  
  return (
    <div className={styles.palaceContainer}>
      {viewMode === 'exterior' && (
        <ExteriorView 
          onEnter={() => setViewMode('interior')}
          {...existingProps}
        />
      )}
      
      {viewMode === 'interior' && (
        <FloorPlanView 
          onExit={() => setViewMode('exterior')}
          onAnalyze={() => setViewMode('graph')}
          positions={sprint.floorPlan?.positions}
        />
      )}
      
      {viewMode === 'graph' && (
        <GraphView 
          onBack={() => setViewMode('interior')}
        />
      )}
    </div>
  );
  ```

- [ ] **5.2** Create ExteriorView wrapper
  - File: `src/components/palace/ExteriorView/ExteriorView.tsx` (NEW)
  - Wraps existing `PanoramaPalaceView` or `StreetViewLoader`
  - Adds "Enter Building" trigger (EntranceMarker)
  - **Preserves all existing exterior functionality**
  
  ```typescript
  function ExteriorView({ onEnter, ...props }) {
    return (
      <>
        {/* Existing panorama/streetview logic */}
        {hasPanorama ? (
          <PanoramaPalaceView {...props} />
        ) : (
          <StreetViewPanorama {...props} />
        )}
        
        {/* NEW: Entrance trigger overlay */}
        <EntranceMarker onClick={onEnter} />
      </>
    );
  }
  ```

- [ ] **5.3** Add view mode persistence
  - Remember last viewed mode per palace
  - Store in palace preferences (localStorage)
  - Optional: Always start at exterior for "fresh" experience

- [ ] **5.4** Add keyboard shortcuts
  - `1` → Exterior view
  - `2` → Interior view (Floor Plan)
  - `3` → Graph view
  - `Escape` → Go back one level

- [ ] **5.5** Update header/toolbar
  - Show current view mode indicator
  - Quick toggle buttons: [🏠 Exterior] [📐 Floor Plan] [🕸️ Graph]
  - Breadcrumb: Palace > Exterior > Interior

### Key Principle: Don't Break What Works

```
┌─────────────────────────────────────────────────────────────┐
│  PRESERVE                          ADD                      │
│  ════════                          ═══                      │
│                                                             │
│  ✓ PanoramaPalaceView              + FloorPlanView          │
│  ✓ StaticPanoramaView              + GraphView              │
│  ✓ StreetViewLoader                + EntranceMarker         │
│  ✓ ConceptMarker (exterior)        + MnemonicNode (interior)│
│  ✓ Existing quiz/tour              + Mode switching         │
│                                                             │
│  The exterior view IS the entrance. It's not deprecated,    │
│  it's the WELCOME MAT to the interior experience.           │
└─────────────────────────────────────────────────────────────┘
```

### Acceptance Criteria

- [ ] Default view is Exterior (existing behavior preserved)
- [ ] Clicking "Enter" transitions to Interior (Floor Plan)
- [ ] Clicking "Exit" in Floor Plan returns to Exterior
- [ ] Graph view accessible from Interior
- [ ] Keyboard shortcuts work
- [ ] No regression in existing panorama/streetview features

---

## Phase 6: Graph Visualization Layer

**Duration**: 4-5 days  
**Goal**: Full dependency graph view with analytics sidebar

### Tasks

- [ ] **6.1** Create GraphView component
  - File: `src/components/palace/GraphView/GraphView.tsx` (NEW)
  - Full-screen force-directed graph
  - Pan and zoom controls

- [ ] **6.2** Create DependencyBarChart component
  - File: `src/components/palace/GraphView/DependencyBarChart.tsx` (NEW)
  - Horizontal bar chart (like your Azure image)
  - Sorted by dependent count descending
  - Click bar to highlight node in graph

- [ ] **6.3** Implement graph interactions
  - Hover node: highlight connections, dim others
  - Click node: zoom to center, show detail panel
  - Double-click: navigate to concept in Floor Plan

- [ ] **6.4** Add graph filters
  - Filter by tier (show only Foundation)
  - Filter by stage
  - Search by concept name

- [ ] **6.5** Create minimap component
  - Small overview in corner during Floor Plan view
  - Shows current position in full graph
  - Click to jump to area

### Acceptance Criteria

- [ ] Graph renders all concepts with connections
- [ ] Bar chart accurately shows dependency counts
- [ ] Interactions feel responsive (<100ms)
- [ ] Can filter and search effectively
- [ ] Minimap aids navigation

---

## Phase 7: Manual Layout Tuning

**Duration**: 2-3 days  
**Goal**: Allow users to personalize their memory palace layout (simplified from original AI verification)

### Design Decision: Treemap Handles Logic, User Handles Preference

Since the Treemap algorithm (Phase 3) already calculates an **optimal, hierarchical layout** based on dependencies, we no longer need complex AI verification. Instead, we focus on:

1. **Swap positions** - User can drag to swap two concepts within the grid
2. **Personal memory** - "I remember VNets better near the door"
3. **No AI scoring** - Trust the user's memory preferences

### Tasks

- [ ] **7.1** Implement drag-to-swap functionality
  - File: `src/components/palace/FloorPlanView/MnemonicNode.tsx`
  - Drag a node onto another to swap positions
  - Visual feedback: ghost preview, valid/invalid drop zones
  - Snap to grid (treemap cells)

- [ ] **7.2** Create position override system
  - File: `src/lib/palace/position-override.ts` (NEW)
  - Store `positionOverride` in PlacedConcept
  - Priority: override > treemapPosition > calculated
  - "Reset to default" option

- [ ] **7.3** Add "Lock Layout" toggle
  - File: `src/components/palace/FloorPlanView/LayoutControls.tsx` (NEW)
  - When locked: No dragging, prevents accidental changes
  - When unlocked: Edit mode with swap hints
  - Persist preference per palace

- [ ] **7.4** Simple feedback toast (no AI)
  - On swap: "Positions swapped! Your layout is saved."
  - On reset: "Layout reset to optimal positions."
  - No complex AI reasoning or scoring

### Acceptance Criteria

- [ ] Can drag-to-swap any two concepts
- [ ] Swapped positions persist across sessions
- [ ] "Reset to default" restores treemap layout
- [ ] Lock toggle prevents accidental edits
- [ ] No AI latency or blocking

---

## Code Removal Checklist

### Key Principle: Don't Remove, Refactor

The existing exterior view (panorama/streetview) becomes the **entrance** to the new interior experience. We preserve it, not replace it.

### Files to KEEP (Wrapped in ExteriorView)

```
✓ src/components/palace/PanoramaViewer/  → Becomes ExteriorView content
✓ src/components/palace/PalaceView.tsx   → Becomes Mode Switcher
✓ src/lib/panorama/                       → Still used for exterior
✓ public/panoramas/                       → Pre-built panoramas still work
✓ src/lib/google-maps/                    → Street View still available
```

### Code Blocks to REFACTOR (Not Remove)

```typescript
// PalaceView.tsx - Simplify the logic-switching
□ Current: Complex conditional rendering for panorama states
□ New: Simple viewMode state machine ('exterior' | 'interior' | 'graph')
□ Keep: All existing panorama/streetview logic, wrap in ExteriorView

// marker-positioning.ts - Keep for exterior, add interior positioning
□ Keep: Heading-based FOV calculations (for exterior ConceptMarkers)
□ Add: Simple treemap-based positioning (for interior MnemonicNodes)
```

### Files to ADD

```
+ src/components/palace/ExteriorView/ExteriorView.tsx    ← Wraps existing
+ src/components/palace/ExteriorView/EntranceMarker.tsx  ← "Enter" button
+ src/components/palace/FloorPlanView/FloorPlanView.tsx  ← NEW interior
+ src/components/palace/FloorPlanView/MnemonicNode.tsx   ← Emoji nodes
+ src/components/palace/FloorPlanView/Room.tsx           ← Stage rooms
+ src/components/palace/FloorPlanView/DoorwayTransition.tsx ← Animation
+ src/components/palace/GraphView/GraphView.tsx          ← Analysis view
+ src/components/palace/GraphView/DependencyBarChart.tsx ← Bar chart
+ src/lib/palace/floor-plan-generator.ts                 ← Treemap calc
+ src/lib/generation/tier-calculator.ts                  ← Tier logic
+ src/lib/generation/dependency-parser.ts                ← Parse deps
+ src/lib/generation/mnemonic-parser.ts                  ← Parse mnemonics
```

### Future Optimization (Post-MVP)

| Component | Current Status | Future Consideration |
|-----------|---------------|---------------------|
| Panorama capture | Keep | Evaluate if still needed |
| `public/panoramas/` | Keep | May optimize storage |
| Complex marker positioning | Keep | Simplify after stable |

---

## Migration Strategy

### For Existing Users

1. **Detect old palace data**
   - Check for `layoutVersion` field
   - If missing, set to `0` (legacy)

2. **Background migration**
   - Calculate dependency metrics from existing content
   - Generate `SubjectGraph` for each palace
   - Set `layoutVersion: 1`

3. **UI notification**
   - Show "Palace upgraded!" toast
   - Brief tour of new features
   - Option to view in legacy mode (Facade only)

### Migration Code

```typescript
// src/lib/migration/palace-v1-migration.ts (NEW)

export async function migratePalaceToV1(palace: MemoryPalace): Promise<MemoryPalace> {
  if (palace.layoutVersion >= 1) return palace;
  
  // 1. Extract dependencies from existing concepts
  const graph = await buildGraphFromConcepts(palace);
  
  // 2. Calculate metrics for each concept
  const updatedBuildings = palace.buildings.map(building => ({
    ...building,
    concepts: building.concepts.map(concept => ({
      ...concept,
      dependencyMetrics: calculateMetrics(concept, graph),
      graphPosition: null, // Will be calculated on first Floor Plan render
      placementVerified: false,
    })),
  }));
  
  return {
    ...palace,
    buildings: updatedBuildings,
    dependencyGraph: graph,
    viewMode: 'floorplan', // Default new users to Floor Plan
    layoutVersion: 1,
  };
}
```

---

## Testing Plan

### Unit Tests

| Component | Test Cases |
|-----------|------------|
| `dependency-parser.ts` | Parse valid deps, handle missing, circular deps |
| `tier-calculator.ts` | Boundary cases (0, 3, 8, 15 deps) |
| `floor-plan-generator.ts` | 1 room, 5 rooms, uneven concept distribution |
| `placement-verification.ts` | Mock AI responses, timeout handling |

### Integration Tests

| Flow | Test Cases |
|------|------------|
| Generation → Graph | New subject generates valid SubjectGraph |
| View switching | State persists across Facade ↔ Floor Plan ↔ Graph |
| Migration | V0 palace upgrades correctly to V1 |
| Quiz in Graph view | Questions adapt to graph relationships |

### E2E Tests

| Scenario | Steps |
|----------|-------|
| New user journey | Generate → Create Palace → Floor Plan tour |
| Returning user | Open existing palace → See migration toast → Explore |
| Accessibility | Keyboard navigation through all views |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| D3 bundle size too large | Low | Medium | Use `d3-hierarchy` only (~15KB) |
| Mnemonic generation quality | Medium | Medium | Validate anchors start with same letter, fallback to manual |
| Users prefer old Street View | Low | Medium | Keep Facade view, make it polished |
| Treemap produces awkward layouts | Low | Medium | Allow manual swap, "Reset" option |
| Graph performance with 50+ nodes | Medium | Medium | Virtualize, level-of-detail rendering |
| Migration breaks existing palaces | Low | High | Extensive testing, rollback flag |
| Emoji rendering inconsistent | Low | Low | Use system fonts, fallback to letter |

---

## Timeline Summary

| Phase | Duration | Dependencies | Deliverable |
|-------|----------|--------------|-------------|
| Phase 1 | 4-5 days | None | Dependency extraction + Mnemonic generation |
| Phase 2 | 3-4 days | Phase 1 | **Freeze & Bake** treemap calculator |
| Phase 3 | 5-7 days | Phase 2 | Floor Plan View (Treemap + Emojis) |
| Phase 4 | 2-3 days | Phase 3 | Mnemonic Bridge transition |
| Phase 5 | 2-3 days | Phase 3 | **View Integration** (Mode Switcher) |
| Phase 6 | 4-5 days | Phase 5 | Graph View with bar chart |
| Phase 7 | 2-3 days | Phase 5 | Manual layout tuning (drag-to-swap) |

**Total Estimated Duration**: 22-30 days

### Critical Path

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 (MVP Complete)
                                           ↓
                              Phase 6 & 7 (Parallel, Post-MVP)
```

**MVP Milestone** (after Phase 5): Users can generate content, see treemap floor plan, and switch between exterior/interior views.

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Time to place all concepts | ~5 min manual | <1 min (auto-placement) |
| User understanding of relationships | Unknown | 80%+ can explain dependencies |
| Feature engagement (Palace visits) | Baseline | +30% increase |
| Quiz performance on dependency questions | N/A | 75%+ accuracy |

---

## Open Questions

1. **Should we keep Street View at all?** 
   - ✅ **Decision**: Yes, as optional "Facade View" for visual anchoring + entrance point

2. **How many nodes before performance degrades?**
   - Need to benchmark with 20, 50, 100 nodes
   - Treemap should handle 100+ easily (no physics simulation)

3. **What if mnemonic anchor doesn't start with same letter?**
   - Fallback: Use first letter of concept as emoji placeholder
   - Allow user to regenerate or manually edit anchor

4. **Do we need offline support for Floor Plan?**
   - ✅ Floor Plan is local rendering, works offline
   - Positions saved to database, no recalculation needed

5. **Should emoji size reflect tier or dependency count?**
   - Recommendation: Tier (simpler, three sizes vs continuous scale)

6. **How to handle concepts with no good same-letter anchor?**
   - AI fallback: phonetic match ("NSG" → "Night Security Guard 👮")
   - User can always edit

---

## Appendix: Visual References

### Target Floor Plan Layout (Treemap with Emojis)
```
┌────────────────────────────────────────────────────────────┐
│  FLOOR PLAN - Blueprint Style (Dark Background)            │
├────────────────────────────────────────────────────────────┤
│                                                            │
│   ┌──────────────────┐         ┌──────────────────┐       │
│   │    PROVISION     │─────────│    CONFIGURE     │       │
│   │  ┌────────┬────┐ │         │  ┌─────┬───────┐ │       │
│   │  │  🌋    │ 🏔️ │ │         │  │ 🔧  │  🛡️   │ │       │
│   │  │ VNet   │ VM │ │         │  │ NSG │Firewall│ │       │
│   │  ├────┬───┼────┤ │         │  ├─────┴───────┤ │       │
│   │  │ 📦 │🗄️│ 💾 │ │         │  │     🔑      │ │       │
│   │  │Blob│SQL│Disk│ │         │  │   Key Vault │ │       │
│   │  └────┴───┴────┘ │         │  └─────────────┘ │       │
│   └────────┬─────────┘         └────────┬─────────┘       │
│            │         ┌──────────────────┘                  │
│            └─────────┤                                     │
│            ┌─────────▼──────────────┐                      │
│            │      MONITOR           │                      │
│            │  ┌──────────┬────────┐ │                      │
│            │  │    📊    │   🔔   │ │                      │
│            │  │ Log Anal │ Alerts │ │                      │
│            │  ├──────────┴────────┤ │                      │
│            │  │        👁️        │ │                      │
│            │  │     Monitor      │ │                      │
│            │  └──────────────────┘ │                      │
│            └────────────────────────┘                      │
│                                                            │
│   Legend: Large box = Foundation, Small box = Utility      │
│           Emoji = Mnemonic Anchor (hover for name)         │
└────────────────────────────────────────────────────────────┘
```

### Interaction Flow
```
┌─────────────────────────────────────────────────────────────┐
│  DEFAULT STATE           HOVER STATE          CLICK STATE   │
│  ══════════════          ═══════════          ═══════════   │
│                                                             │
│   ┌────────┐            ┌────────────┐      ┌─────────────┐│
│   │   🌋   │     →      │ 🌋 Volcano │  →   │ 🌋 Volcano  ││
│   └────────┘            └────────────┘      │─────────────││
│                                             │ "A massive  ││
│   Just emoji            Emoji + Name        │ volcano     ││
│   (clean view)          (the hook)          │ erupting    ││
│                                             │ private     ││
│                                             │ network..." ││
│                                             │─────────────││
│                                             │ VNet allows ││
│                                             │ you to...   ││
│                                             └─────────────┘│
│                                              Full story +   │
│                                              definition     │
└─────────────────────────────────────────────────────────────┘
```

### Target Graph View Layout
```
┌────────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────┐ ┌──────────────────┐ │
│  │                                 │ │ Dependencies     │ │
│  │         DEPENDENCY GRAPH        │ │ ════════════════ │ │
│  │                                 │ │ VNets      ████░ │ │
│  │        ┌───○                    │ │ VMs        ███░░ │ │
│  │       ╱                         │ │ Storage    ███░░ │ │
│  │    ○─●───○───○                  │ │ Subnets    ██░░░ │ │
│  │       ╲   ╲                     │ │ NSGs       █░░░░ │ │
│  │        ○   ●───○                │ │ ...        │     │ │
│  │             ╲                   │ │            │     │ │
│  │              ○                  │ │            │     │ │
│  │                                 │ │            │     │ │
│  └─────────────────────────────────┘ └──────────────────┘ │
│                                                            │
│  [Filter: All ▼] [Search: ________]  [Stage: All ▼]       │
└────────────────────────────────────────────────────────────┘
```

---

## Summary of Changes from v1.0 to v2.0

| Feature | Original Plan (v1.0) | Updated Plan (v2.0) |
|---------|---------------------|---------------------|
| **Floor Plan Layout** | Force Graph (Physics, `d3-force`) | Treemap (Blueprint, `d3-hierarchy`) |
| **Visual Representation** | Circles & Lines | **Emojis & Rectangles** |
| **Concept Label** | Technical Name | **Mnemonic Anchor** ("Volcano 🌋") |
| **AI Role** | Placement Verification | **Generating Anchors & Stories** |
| **Data Persistence** | Recalculated on load | **"Freeze & Bake" - Calculate once, save to Sprint** |
| **Position Stability** | Physics simulation (unstable) | **Deterministic treemap (permanent)** |
| **User Customization** | AI-guided with scoring | **Simple drag-to-swap** |
| **Transition Effect** | Instant view switch | **Cinematic "entering building" animation** |
| **Existing Exterior** | Replace with Floor Plan | **Keep as entrance ("Welcome Mat")** |
| **Storage** | Separate layout database | **Inline with Sprint object in localStorage** |
| **View Architecture** | Single complex view | **Mode Switcher: exterior → interior → graph** |

### Key Philosophy Shifts

```
OLD: "Replace Street View with something better"
NEW: "Street View IS the entrance to something better"

OLD: "Calculate layout dynamically"
NEW: "Calculate once, bake forever (Freeze & Bake)"

OLD: "AI verifies placement"
NEW: "Treemap algorithm handles logic, user handles preference"
```

---

## Next Steps

1. [ ] Review and approve this plan (v2.0)
2. [ ] Create GitHub issues for each phase
3. [ ] Set up feature branch: `feature/mind-palace-v2`
4. [ ] Begin Phase 1 implementation (Dependencies + Mnemonics)
5. [ ] Schedule weekly progress reviews

---

*Document maintained by: Development Team*  
*Last updated: January 3, 2026 (v2.0 - Hybrid Model with Freeze & Bake)*

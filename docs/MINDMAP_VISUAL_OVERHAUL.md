# Mindmap Visual Overhaul — Subject-Classification-Driven Layouts

## Executive Summary

The concept map (ConceptMapBuilder) currently renders **one universal layout** for all subjects: pill-shaped nodes, tiered row packing, identical edges. This plan overhauls the map so its **topology, node shapes, edge styles, color palette, text orientation, and animation** all derive from the subject's classification type — making the map itself a learning scaffold.

---

## 1. THE FOUR TOPOLOGIES

### 1A. PROCEDURAL — Radial Fan ("Verb Arms")

```
Layout shape:  Radial — arms extend outward from center diamond
Mental model:  "Same verbs, different objects"
```

**Topology rules:**
- **Center node**: The subject/object (e.g., "Storage Blob") — positioned at canvas center
- **Arms**: One arm per ULC verb (CREATE, CONFIGURE, MONITOR). Arms radiate at equal angular spacing (e.g., 3 arms = 120° apart)
- **Arm nodes**: Numbered steps fan outward along each arm in sequence (1 closest to center, N farthest). Spacing increases slightly per step (golden ratio: 1.0×, 1.618×, 2.618× base distance)
- **Reading direction**: Center → outward along each arm. Each arm is its own self-contained workflow

**Node positioning algorit
```
For each verb arm i (0..verbCount-1):
    baseAngle = (i / verbCount) * 2π + π/2  (start from top)
    For each step j (0..stepCount-1):
        distance = BASE_RADIUS + (j * STEP_SPACING * φ^j)  // φ = 1.618
        x = centerX + distance * cos(baseAngle + jitter)
        y = centerY + distance * sin(baseAngle + jitter)
        jitter = small random offset (±5°) to avoid mechanical rigidity
```

---

### 1B. CONCEPTUAL — Orbital Rings ("Lens Shells")

```
Layout shape:  Concentric rings — principle at center, context scenarios orbit outward
Mental model:  "Same principle, different lenses"
```

**Topology rules:**
- **Center node**: The core principle/concept — positioned at canvas center
- **Ring 1 (inner)**: Lens categories (2–4 nodes arranged in a ring, e.g., "Threat Lens", "Control Lens", "Compliance Lens")
- **Ring 2 (outer)**: Specific scenarios/applications — each clustered near its parent lens
- **No directional flow** — nodes float in gravitational orbits. The learner can enter from any angle
- **Cross-connections**: Dashed arcs connecting lenses that share overlap (conceptual tension lines)

**Node positioning algorithm:**
```
Center: (centerX, centerY)
Ring 1 (lenses):
    For each lens i (0..lensCount-1):
        angle = (i / lensCount) * 2π
        x = centerX + INNER_RADIUS * cos(angle)
        y = centerY + INNER_RADIUS * sin(angle)
Ring 2 (scenarios):
    For each scenario s belonging to lens i:
        parentAngle = lens[i].angle
        spreadAngle = parentAngle + (s.index - midpoint) * SPREAD_ARC
        x = centerX + OUTER_RADIUS * cos(spreadAngle)
        y = centerY + OUTER_RADIUS * sin(spreadAngle)
```

---

### 1C. CYCLIC — Closed Loop ("Phase Ring")

```
Layout shape:  Circular loop — phases flow clockwise, with a visible return arc
Mental model:  "Output of phase N feeds into phase 1"
```

**Topology rules:**
- **Center node**: The subject name — positioned at canvas center (smaller, label-only)
- **Phase nodes**: Large phase markers (COMPREHEND → ANALYZE → PRODUCE) placed at equal intervals around a primary ring, **clockwise**
- **Step nodes**: Each phase's steps fan **inward** toward center (not outward) — this prevents the loop from feeling like it escapes
- **Return arc**: A thick, curved arrow from the last phase back to the first, visually completing the loop. This is the defining visual feature
- **Pulse animation**: A subtle dot travels the loop path on a CSS animation to convey perpetual motion

**Node positioning algorithm:**
```
LOOP_RADIUS = canvas.minDimension * 0.35
For each phase i (0..phaseCount-1):
    angle = (i / phaseCount) * 2π - π/2  (start from top, clockwise)
    x = centerX + LOOP_RADIUS * cos(angle)
    y = centerY + LOOP_RADIUS * sin(angle)
    
    For each step j of phase i:
        // Steps fan INWARD toward center
        stepRadius = LOOP_RADIUS - (j + 1) * STEP_INSET
        stepAngle = angle + (j - midpoint) * STEP_SPREAD
        sx = centerX + stepRadius * cos(stepAngle)
        sy = centerY + stepRadius * sin(stepAngle)

Return arc: SVG cubic bezier from phase[N-1] → phase[0]
    Control points placed outside the ring to create a visible swoop
```

---

### 1D. PERCEPTUAL — Branching Tree ("Decision Fork")

```
Layout shape:  Top-down tree with a fork point — observe → classify → branch
Mental model:  "Unknown input, identify then respond"
```

**Topology rules:**
- **Root node**: "Observe" / raw signal — positioned at top center
- **Stem**: 1–2 sequential observation steps flowing downward
- **Fork point**: A distinct **diamond decision node** where perception happens — "What is this?"
- **Branches**: 2–4 classification branches fan downward from the fork, each representing a possible identification
- **Leaf nodes**: Response/action nodes at the bottom of each branch
- **The fork is the hero** — it must be visually prominent (larger, different shape, glow)

**Node positioning algorithm:**
```
Root: (centerX, TOP_MARGIN)
Stem nodes: vertically stacked below root, STEM_SPACING apart

Fork diamond: (centerX, root.y + stemNodes.length * STEM_SPACING + FORK_GAP)

For each branch i (0..branchCount-1):
    spreadX = centerX + (i - midpoint) * BRANCH_SPREAD
    For each node j in branch:
        x = spreadX
        y = fork.y + (j + 1) * BRANCH_STEP_SPACING
```

---

## 2. NODE SHAPES

Currently all nodes are identical pills (`border-radius: 50px`). Each classification type gets a distinct shape vocabulary:

### Shape Matrix

| Classification | Center Node | Verb/Phase Node | Step Node | Special Node |
|---|---|---|---|---|
| **Procedural** | Diamond (45° rotated square) | Rounded rectangle (8px radius) | Rounded rectangle (8px radius) | — |
| **Conceptual** | Circle | Hexagon (6-sided) | Rounded pill (current) | — |
| **Cyclic** | Small circle (label only) | Stadium/capsule (wide pill) | Rounded rectangle | Return-arc arrow |
| **Perceptual** | Rounded rectangle | Rounded rectangle | Rounded rectangle | Diamond (fork point) |

### CSS Implementation

```css
/* Base node — shared properties */
.node { position: absolute; text-align: center; cursor: grab; z-index: 2; transform: translate(-50%, -50%); }

/* PROCEDURAL */
.node[data-classification="procedural"][data-role="center"]   { border-radius: 0; transform: translate(-50%, -50%) rotate(45deg); }
.node[data-classification="procedural"][data-role="center"] > .nodeLabel { transform: rotate(-45deg); }
.node[data-classification="procedural"][data-role="step"]     { border-radius: 8px; }

/* CONCEPTUAL */
.node[data-classification="conceptual"][data-role="center"]   { border-radius: 50%; aspect-ratio: 1; }
.node[data-classification="conceptual"][data-role="lens"]     { clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%); }
.node[data-classification="conceptual"][data-role="scenario"] { border-radius: 50px; }

/* CYCLIC */
.node[data-classification="cyclic"][data-role="center"]       { border-radius: 50%; width: 60px; height: 60px; }
.node[data-classification="cyclic"][data-role="phase"]        { border-radius: 50px; min-width: 140px; }
.node[data-classification="cyclic"][data-role="step"]         { border-radius: 8px; }

/* PERCEPTUAL */
.node[data-classification="perceptual"][data-role="root"]     { border-radius: 8px; }
.node[data-classification="perceptual"][data-role="fork"]     { border-radius: 0; transform: translate(-50%, -50%) rotate(45deg); border: 3px solid; }
.node[data-classification="perceptual"][data-role="fork"] > .nodeLabel { transform: rotate(-45deg); }
.node[data-classification="perceptual"][data-role="branch"]   { border-radius: 8px; }
```

---

## 3. COLOR PALETTES

Each classification type uses a **dedicated hue family** derived from `SUBJECT_TYPE_META`, with tier-level saturation stepping.

### Primary Colors (from macro-workflow.ts)

| Classification | Base Hue | CSS Variable | Hex |
|---|---|---|---|
| Procedural | Blue | `--map-procedural` | `#3b82f6` |
| Conceptual | Violet | `--map-conceptual` | `#8b5cf6` |
| Cyclic | Emerald | `--map-cyclic` | `#10b981` |
| Perceptual | Amber | `--map-perceptual` | `#f59e0b` |

### Tier Saturation Stepping

Each type has 3 saturation levels for trunk → branch → leaf hierarchy:

| Tier | Opacity/Lightness Rule | Purpose |
|---|---|---|
| **Trunk (center/phase)** | Base color, 100% saturation | Anchor — the eye goes here first |
| **Branch (verb/lens)** | Base color, 70% saturation | Secondary structure |
| **Leaf (step/scenario)** | Base color, 40% saturation | Detail — recedes visually |

### Full Token Set (per classification)

```css
:root {
    /* PROCEDURAL */
    --map-proc-trunk-bg: #3b82f6;
    --map-proc-trunk-border: #2563eb;
    --map-proc-trunk-text: #ffffff;
    --map-proc-branch-bg: #93c5fd;
    --map-proc-branch-border: #60a5fa;
    --map-proc-branch-text: #1e3a5f;
    --map-proc-leaf-bg: #dbeafe;
    --map-proc-leaf-border: #93c5fd;
    --map-proc-leaf-text: #1e3a5f;
    --map-proc-line: #60a5fa;
    --map-proc-line-light: #bfdbfe;
    --map-proc-glow: rgba(59, 130, 246, 0.3);

    /* CONCEPTUAL */
    --map-conc-trunk-bg: #8b5cf6;
    --map-conc-trunk-border: #7c3aed;
    --map-conc-trunk-text: #ffffff;
    --map-conc-branch-bg: #c4b5fd;
    --map-conc-branch-border: #a78bfa;
    --map-conc-branch-text: #2e1065;
    --map-conc-leaf-bg: #ede9fe;
    --map-conc-leaf-border: #c4b5fd;
    --map-conc-leaf-text: #2e1065;
    --map-conc-line: #a78bfa;
    --map-conc-line-light: #ddd6fe;
    --map-conc-glow: rgba(139, 92, 246, 0.3);

    /* CYCLIC */
    --map-cycl-trunk-bg: #10b981;
    --map-cycl-trunk-border: #059669;
    --map-cycl-trunk-text: #ffffff;
    --map-cycl-branch-bg: #6ee7b7;
    --map-cycl-branch-border: #34d399;
    --map-cycl-branch-text: #064e3b;
    --map-cycl-leaf-bg: #d1fae5;
    --map-cycl-leaf-border: #6ee7b7;
    --map-cycl-leaf-text: #064e3b;
    --map-cycl-line: #34d399;
    --map-cycl-line-light: #a7f3d0;
    --map-cycl-glow: rgba(16, 185, 129, 0.3);

    /* PERCEPTUAL */
    --map-perc-trunk-bg: #f59e0b;
    --map-perc-trunk-border: #d97706;
    --map-perc-trunk-text: #ffffff;
    --map-perc-branch-bg: #fde68a;
    --map-perc-branch-border: #fbbf24;
    --map-perc-branch-text: #78350f;
    --map-perc-leaf-bg: #fef3c7;
    --map-perc-leaf-border: #fde68a;
    --map-perc-leaf-text: #78350f;
    --map-perc-line: #fbbf24;
    --map-perc-line-light: #fde68a;
    --map-perc-glow: rgba(245, 158, 11, 0.3);
}
```

### Dark Mode Overrides

In dark mode, invert the lightness relationship:
- Trunk: Desaturated dark background + bright text
- Branch/Leaf: Progressively darker backgrounds

```css
[data-theme="dark"] {
    --map-proc-trunk-bg: #1e3a5f;
    --map-proc-trunk-border: #3b82f6;
    --map-proc-trunk-text: #93c5fd;
    --map-proc-branch-bg: #172554;
    --map-proc-branch-border: #3b82f6;
    --map-proc-branch-text: #bfdbfe;
    --map-proc-leaf-bg: #0f172a;
    --map-proc-leaf-border: #1e40af;
    --map-proc-leaf-text: #dbeafe;
    /* ... same pattern for conceptual, cyclic, perceptual */
}
```

---

## 4. EDGE / CONNECTION LINES

### Line Properties by Classification

| Classification | Primary Line Style | Line Weight | Arrowheads | Special |
|---|---|---|---|---|
| **Procedural** | Solid, slightly curved | 3px (inter-step), 4px (arm trunk line) | Arrow tip on each step → step | Arm "rail" — a faint 1px background line runs the full arm length |
| **Conceptual** | Dashed, organic curves | 2px (lens links), 1.5px (scenario links) | None — no direction | Cross-lens arcs: 1px dotted lines connecting related lenses |
| **Cyclic** | Solid, smooth bezier | 3px (phase → phase), 2px (step links) | Clockwise arrows on phase ring | **Return arc**: 5px width, animated dash offset |
| **Perceptual** | Solid, straight segments | 3px (stem), 2px (branch) | Downward arrows | **Fork lines**: 4px, fan outward from diamond, slight curve |

### SVG Marker Definitions

```svg
<!-- Procedural: clean right-angle arrow -->
<marker id="proc-arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" orient="auto">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--map-proc-line)" />
</marker>

<!-- Cyclic: rounded arrow for softer loop feel -->
<marker id="cycl-arrow" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="10" markerHeight="10" orient="auto">
    <path d="M 1 1 Q 6 6 11 1 L 11 11 Q 6 6 1 11 z" fill="var(--map-cycl-line)" />
</marker>

<!-- Perceptual: downward chevron -->
<marker id="perc-arrow" viewBox="0 0 10 10" refX="5" refY="10" markerWidth="8" markerHeight="8" orient="auto">
    <path d="M 0 0 L 5 10 L 10 0" fill="none" stroke="var(--map-perc-line)" stroke-width="2" />
</marker>
```

### Return Arc (Cyclic only) — CSS Animation

```css
.returnArc {
    stroke: var(--map-cycl-trunk-border);
    stroke-width: 5;
    stroke-dasharray: 12 6;
    stroke-dashoffset: 0;
    fill: none;
    animation: flowLoop 2s linear infinite;
}

@keyframes flowLoop {
    to { stroke-dashoffset: -18; }
}
```

### Fork Fan Lines (Perceptual only)

```css
.forkLine {
    stroke: var(--map-perc-line);
    stroke-width: 4;
    stroke-linecap: round;
    transition: stroke-width 0.2s ease;
}
.forkLine:hover {
    stroke-width: 6;
}
```

---

## 5. TEXT ORIENTATION & TYPOGRAPHY

### Text Placement Rules

| Classification | Center Label | Verb/Phase Label | Step Label | Numbering |
|---|---|---|---|---|
| **Procedural** | Inside diamond, counter-rotated 45° | Bold label at arm base, oriented tangent to arm direction | Horizontal, inside node | Numbered: "1.", "2.", "3." |
| **Conceptual** | Inside circle, horizontal | Inside hexagon, horizontal | Horizontal, inside pill | **No numbers** — dots (•) prefix only |
| **Cyclic** | Inside circle, horizontal | Bold label, curved along ring arc (CSS `textPath` or straight fallback) | Horizontal, inside rect | Numbered within each phase: "1.", "2." |
| **Perceptual** | Horizontal, inside rect | Horizontal, inside rect | Horizontal, inside rect | Stem: numbered. Branches: **labeled** not numbered |

### Font Sizing

```css
/* Center/Subject node */
.nodeLabel[data-role="center"]   { font-size: 1.1rem; font-weight: 700; letter-spacing: 0.02em; }

/* Verb/Phase/Lens node */
.nodeLabel[data-role="verb"],
.nodeLabel[data-role="phase"],
.nodeLabel[data-role="lens"]     { font-size: 0.95rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; }

/* Step/Scenario node */
.nodeLabel[data-role="step"],
.nodeLabel[data-role="scenario"] { font-size: 0.8rem; font-weight: 500; }

/* Fork diamond (perceptual) */
.nodeLabel[data-role="fork"]     { font-size: 0.85rem; font-weight: 700; font-style: italic; }
```

### Arm/Phase Labels (floating text alongside the edge)

For procedural and cyclic, the **verb name** appears as a floating label along the arm/arc:

```css
.armLabel {
    position: absolute;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--map-{type}-line);
    opacity: 0.7;
    writing-mode: horizontal-tb;   /* Procedural: horizontal, placed at arm base */
}

.arcLabel {
    /* Cyclic: follows the ring path using SVG <textPath> */
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    fill: var(--map-cycl-line);
}
```

---

## 6. INTERACTIVE BEHAVIORS

### Hover Effects (per classification)

| Classification | Node Hover | Line Hover |
|---|---|---|
| **Procedural** | Glow ring (blue), entire arm highlights (all nodes on same verb glow faintly) | Arm rail brightens to full opacity |
| **Conceptual** | Pulse border, connected lenses dim (spotlight effect — others fade to 30% opacity) | Cross-lens arc becomes solid briefly |
| **Cyclic** | Scale 1.05×, flow animation speeds up on hovered phase arc | Arc section brightens |
| **Perceptual** | Glow ring (amber), sibling branches dim | Fork line thickens |

### Selection / Active State

```css
/* Procedural: selected arm */
.node[data-classification="procedural"].activeArm {
    border-color: var(--map-proc-trunk-border);
    box-shadow: 0 0 0 4px var(--map-proc-glow);
}

/* Conceptual: spotlight — non-selected lenses fade */
.node[data-classification="conceptual"].dimmed {
    opacity: 0.3;
    filter: grayscale(0.5);
    transition: opacity 0.3s ease, filter 0.3s ease;
}

/* Cyclic: active phase pulses */
.node[data-classification="cyclic"].activePhase {
    animation: phasePulse 1.5s ease-in-out infinite;
}
@keyframes phasePulse {
    0%, 100% { box-shadow: 0 0 0 3px var(--map-cycl-glow); }
    50%      { box-shadow: 0 0 0 8px var(--map-cycl-glow); }
}

/* Perceptual: fork glow */
.node[data-classification="perceptual"][data-role="fork"] {
    box-shadow: 0 0 16px var(--map-perc-glow);
}
```

---

## 7. BACKGROUND & GRID

### Grid Pattern by Classification

| Classification | Pattern | Color | Spacing |
|---|---|---|---|
| **Procedural** | Dot grid (current) | `--map-proc-line-light` at 15% opacity | 20px |
| **Conceptual** | No grid — clean empty space | — | — |
| **Cyclic** | Subtle concentric circle guides | `--map-cycl-line-light` at 8% opacity | Ring at LOOP_RADIUS |
| **Perceptual** | Faint vertical lines (tree guide rails) | `--map-perc-line-light` at 10% opacity | Aligned to branch X positions |

```css
/* Procedural grid */
.canvas[data-classification="procedural"] {
    background-image: radial-gradient(circle, var(--map-proc-line-light) 1px, transparent 1px);
    background-size: 20px 20px;
}

/* Conceptual: clean */
.canvas[data-classification="conceptual"] {
    background: var(--color-surface-base);
}

/* Cyclic: ring guides */
.canvas[data-classification="cyclic"] {
    background-image: 
        radial-gradient(circle at 50% 50%, transparent 34%, var(--map-cycl-line-light) 34.5%, transparent 35%);
}

/* Perceptual: vertical guide rails */
.canvas[data-classification="perceptual"] {
    background-image: repeating-linear-gradient(
        90deg, transparent, transparent calc(var(--branch-spread) - 1px), 
        var(--map-perc-line-light) var(--branch-spread)
    );
}
```

---

## 8. TIER RING / GROUPING VISUALS

Replace the current uniform dashed-circle tier rings with classification-aware grouping:

| Classification | Grouping Visual |
|---|---|
| **Procedural** | **Arm rail**: A faint 1px solid line running the full length of each arm. Steps sit along this rail like stations on a metro line. No tier rings. |
| **Conceptual** | **Orbital rings**: 2 concentric dashed circles (inner = lens ring, outer = scenario ring). Ring labels ("Lenses", "Applications") in small caps along the ring. |
| **Cyclic** | **Phase arc segments**: The main loop ring is divided into colored arc segments, one per phase. Each arc has the phase's color at 20% opacity. |
| **Perceptual** | **Depth bands**: Faint horizontal bands across the canvas marking depth levels: "Observation", "Classification", "Response". Labels left-aligned. |

---

## 9. ANIMATION & ENTRANCE

### Initial Render Animation

| Classification | Entrance | Duration |
|---|---|---|
| **Procedural** | Arms grow outward from center — center appears first (scale 0→1, 200ms), then each arm's nodes appear sequentially from base to tip (50ms stagger per node) | ~800ms total |
| **Conceptual** | Center fades in (300ms), then ring 1 nodes orbit inward to position from offscreen (400ms, eased), then ring 2 fades in place (300ms) | ~1000ms total |
| **Cyclic** | Center appears, then the loop ring draws itself (SVG stroke-dashoffset animation, clockwise, 600ms), then phase labels fade in at their positions, then step nodes fade in | ~1200ms total |
| **Perceptual** | Root appears top, stem draws downward (300ms), fork diamond scales in with a burst (200ms), then branches fan out simultaneously (400ms) | ~900ms total |

### CSS Keyframes

```css
/* Procedural arm growth */
@keyframes armGrow {
    from { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
    to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}

/* Cyclic ring draw */
@keyframes ringDraw {
    from { stroke-dashoffset: var(--ring-circumference); }
    to   { stroke-dashoffset: 0; }
}

/* Perceptual fork burst */
@keyframes forkBurst {
    0%   { transform: translate(-50%, -50%) rotate(45deg) scale(0); opacity: 0; }
    60%  { transform: translate(-50%, -50%) rotate(45deg) scale(1.2); opacity: 1; }
    100% { transform: translate(-50%, -50%) rotate(45deg) scale(1); opacity: 1; }
}

/* Perceptual branch fan */
@keyframes branchFan {
    from { opacity: 0; transform: translateY(-20px); }
    to   { opacity: 1; transform: translateY(0); }
}
```

---

## 10. DATA MODEL CHANGES

### New fields needed on `LearningConcept`

```typescript
// Already exists: tier, parentName, trunkDomain, connections, dependencies

// NEW — injected by layout engine based on classification:
interface MapNodeMeta {
    role: 'center' | 'verb' | 'phase' | 'lens' | 'step' | 'scenario' | 'fork' | 'root' | 'branch-label';
    armIndex?: number;          // Procedural: which verb arm (0, 1, 2)
    ringIndex?: number;         // Conceptual: which orbital ring (0 = inner, 1 = outer)
    phaseIndex?: number;        // Cyclic: which phase (0, 1, 2)
    branchPath?: string;        // Perceptual: which classification branch
    sequenceNumber?: number;    // Step ordering within arm/phase/branch
}
```

### Layout engine signature

```typescript
type LayoutEngine = (
    concepts: LearningConcept[],
    classification: SubjectType,
    lifecycleBlueprints: LifecycleBlueprints,
    canvasSize: { width: number; height: number }
) => PositionedNode[];

interface PositionedNode {
    concept: LearningConcept;
    x: number;
    y: number;
    meta: MapNodeMeta;
}
```

---

## 11. SCHOLARLY vs PLAYFUL INTERACTION

The visual theme toggle adjusts surface treatment, not topology:

| Property | Playful Mode | Scholarly Mode |
|---|---|---|
| **Node border** | 2px, colored per classification | 1px, muted gray (`--color-border`) |
| **Node fill** | Classification color (see §3) | White/off-white (`--color-surface-elevated`) |
| **Node text** | Bold, colored | Regular weight, near-black |
| **Line style** | Colored per classification, 3px | Thin (2px), muted gray |
| **Background grid** | Visible, colored | Hidden or barely visible |
| **Glow/animation** | Enabled (all hover/entrance anims) | Disabled — static, print-friendly |
| **Arm/arc labels** | Uppercase, colored, tracking wide | Small caps, gray, tracking normal |
| **Font family** | System sans-serif (current) | Serif for labels (Georgia/Crimson Text) |

---

## 12. RESPONSIVE BEHAVIOR

| Breakpoint | Adjustment |
|---|---|
| **Desktop (>1024px)** | Full layout as described |
| **Tablet (768–1024px)** | Reduce node sizes by 15%, tighten spacing constants by 20% |
| **Mobile (<768px)** | **Collapse to list mode** — show a vertical accordion grouped by verb/phase/lens/branch. Map topology is too complex for small screens. Toggle button: "Map / List" |

---

## 13. IMPLEMENTATION PHASES

### Phase 1: Layout Engines (Core)
1. Create `src/shared/utils/map-layouts/procedural-layout.ts`
2. Create `src/shared/utils/map-layouts/conceptual-layout.ts`
3. Create `src/shared/utils/map-layouts/cyclic-layout.ts`
4. Create `src/shared/utils/map-layouts/perceptual-layout.ts`
5. Create `src/shared/utils/map-layouts/index.ts` — factory that selects layout by `SubjectType`
6. Update `ConceptMapBuilder.tsx` to call the layout factory instead of `autoLayout()`

### Phase 2: Node Shapes & CSS
7. Add `data-classification` and `data-role` attributes to node divs
8. Create `ConceptMapBuilder.classification.module.css` with all shape rules
9. Wire up classification-specific SVG markers

### Phase 3: Color System
10. Add map color tokens to `index.css` (light + dark mode)
11. Update node rendering to use classification-aware color tokens
12. Update edge rendering to use classification-aware colors

### Phase 4: Edges & Special Elements
13. Implement arm rail lines (procedural)
14. Implement orbital ring SVGs (conceptual)
15. Implement return arc with animation (cyclic)
16. Implement fork fan lines (perceptual)

### Phase 5: Animations & Polish
17. Entrance animations per classification
18. Hover behaviors per classification
19. Scholarly mode overrides
20. Background grid patterns

### Phase 6: Responsive
21. Mobile list collapse view
22. Tablet spacing adjustments

---

## 14. SUMMARY TABLE

| Dimension | Procedural | Conceptual | Cyclic | Perceptual |
|---|---|---|---|---|
| **Topology** | Radial fan | Concentric orbits | Closed loop | Branching tree |
| **Center shape** | Diamond | Circle | Small circle | Rectangle |
| **Step shape** | Rounded rect | Pill | Rounded rect | Rounded rect |
| **Special shape** | — | Hexagon (lens) | — | Diamond (fork) |
| **Hue** | Blue #3b82f6 | Violet #8b5cf6 | Emerald #10b981 | Amber #f59e0b |
| **Line weight** | 3–4px solid | 1.5–2px dashed | 3–5px solid | 2–4px solid |
| **Arrows** | Yes (sequential) | No (undirected) | Yes (clockwise) | Yes (downward) |
| **Numbering** | Sequential (1, 2, 3) | None (dots) | Per-phase (1, 2) | Stem only; branches labeled |
| **Grid** | Dot grid | None | Circle rings | Vertical rails |
| **Animation** | Arms grow outward | Orbits settle in | Ring draws clockwise | Tree grows downward |
| **Grouping** | Arm rails | Orbital rings | Colored arc segments | Horizontal depth bands |
| **Reading direction** | Center → outward | Any entry point | Clockwise | Top → down |

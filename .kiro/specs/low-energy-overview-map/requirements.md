# Low Energy Overview Map - Requirements

## Problem Statement

Currently, when a low-energy user (tired) starts a session with NO prior progress, they are routed to the interactive "Build Your Concept Map" activity. This is WRONG because:

1. **Low energy users need passive consumption**, not active construction
2. **Building a map requires cognitive effort** - contradicts "light review only"
3. **The ULC pattern is hidden** from low energy users, but it should be shown as a READ-ONLY legend

## User Story

**As a** low-energy learner (tired, end of day)  
**I want** to see a complete overview map with ULC structure as the legend  
**So that** I can passively review the subject structure without cognitive effort

## Current Behavior (WRONG)

```
User selects "Low Energy" (tired)
  ↓
goal = 'review', duration = 15 min
  ↓
useLearningFlow checks: hasStartedLearning? NO
  ↓
Returns 'BUILD' phase
  ↓
User sees: Interactive "Build Your Concept Map" activity
  ↓
PROBLEM: Requires active thinking, contradicts low energy
```

## Desired Behavior (CORRECT)

```
User selects "Low Energy" (tired)
  ↓
goal = 'review', duration = 15 min
  ↓
useLearningFlow checks: hasStartedLearning? NO
  ↓
Returns 'OVERVIEW_MAP' phase (new)
  ↓
User sees: Read-only overview map with:
  - ULC matrix as legend (if detected)
  - All concepts laid out spatially
  - Micro-sequences visible within each ULC cell
  - Drill up/down to see macro/micro views
  - NO interaction required (passive viewing)
```

---

## Requirements

### R1: New Phase - OVERVIEW_MAP

**Type:** Read-only visualization phase  
**Trigger:** Low energy user with no prior progress  
**Duration:** Passive viewing, no time pressure

**Components:**
1. **ULC Legend** (if pattern detected)
   - Shows verb × object matrix
   - Non-interactive (no clickable cells)
   - Serves as structural guide

2. **Spatial Concept Layout**
   - All concepts positioned on canvas
   - Grouped by ULC cell (verb × object)
   - Visual hierarchy: trunk → branch → leaf

3. **Micro-Sequence View**
   - Within each ULC cell, show the sequence of concepts
   - Example: "Create Identity" cell shows:
     - Concept 1: Create User Accounts
     - Concept 2: Create Service Principals
     - Concept 3: Create Managed Identities

4. **Drill Up/Down Controls**
   - Zoom out: See all ULC cells (macro view)
   - Zoom in: See concepts within a cell (micro view)
   - Smooth transitions, no jarring jumps

### R2: Update useLearningFlow Logic

**File:** `src/shared/hooks/useLearningFlow.ts`

**Change:**
```typescript
// BEFORE (lines 109-120)
if (studySession.goal === 'review') {
  const hasStartedLearning = currentSession.progress.completedConcepts.length > 0;
  if (hasStartedLearning) {
    // User has progress, let them continue the full flow
  } else {
    // Fresh review session - light map review only
    if (!studySession.mapBuilt) return 'BUILD';  // ← WRONG
    return 'COMPLETE';
  }
}

// AFTER
if (studySession.goal === 'review') {
  const hasStartedLearning = currentSession.progress.completedConcepts.length > 0;
  if (hasStartedLearning) {
    // User has progress, let them continue the full flow
  } else {
    // Fresh review session - show read-only overview map
    if (!studySession.overviewViewed) return 'OVERVIEW_MAP';  // ← NEW
    return 'COMPLETE';
  }
}
```

### R3: New Component - OverviewMapView

**File:** `src/components/learning/overview/OverviewMapView.tsx` (new)

**Props:**
```typescript
interface OverviewMapViewProps {
  concepts: ParsedConcept[];
  ulcPattern: ULCPattern | null;
  onComplete: () => void;
}
```

**Features:**
- Read-only (no editing, no dragging)
- ULC matrix as fixed legend (top or side)
- Concepts grouped by ULC cell
- Zoom controls (macro/micro)
- Smooth animations
- "I've seen enough" button to exit

### R4: ULC Legend Display

**Condition:** Only show if `ulcPattern.detected === true`

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│ ULC Pattern Legend                                  │
│                                                     │
│         Create    Configure    Monitor              │
│ Identity   ●          ●           ●                 │
│ Storage    ●          ●           ●                 │
│ Network    ●          ●           ●                 │
│                                                     │
│ ● = Concepts in this cell (click to zoom)          │
└─────────────────────────────────────────────────────┘
```

**Interaction:**
- Click a cell → Zoom to that cell's concepts (micro view)
- Click "Zoom Out" → Return to full matrix (macro view)

### R5: Micro-Sequence Display

**When:** User zooms into a ULC cell

**Example:** "Create Identity" cell
```
┌─────────────────────────────────────────────────────┐
│ Create Identity (3 concepts)                        │
│                                                     │
│ 1. Create User Accounts                            │
│    └─ How: Azure Portal → Users → New User         │
│                                                     │
│ 2. Create Service Principals                       │
│    └─ How: App Registrations → New Registration    │
│                                                     │
│ 3. Create Managed Identities                       │
│    └─ How: Managed Identities → Create             │
│                                                     │
│ [← Back to Matrix]                                  │
└─────────────────────────────────────────────────────┘
```

**Features:**
- Shows procedural "how" from phase1.execution
- Sequential order (1, 2, 3...)
- Minimal text, easy to scan
- Back button to return to matrix

---

## Acceptance Criteria

### AC-1: Low Energy Routing
- **Given** a user selects "Low Energy" mood
- **And** they have NO prior progress (completedConcepts.length === 0)
- **When** the session starts
- **Then** they see the OVERVIEW_MAP phase, NOT the BUILD phase

### AC-2: ULC Legend Visibility
- **Given** the subject has a detected ULC pattern
- **When** the overview map is shown
- **Then** the ULC matrix is displayed as a legend
- **And** it is read-only (no clickable cells for editing)

### AC-3: Macro View
- **Given** the overview map is shown
- **When** the user is in macro view
- **Then** they see all ULC cells with concept counts
- **And** they can click a cell to zoom in

### AC-4: Micro View
- **Given** the user clicks a ULC cell
- **When** the micro view loads
- **Then** they see the sequence of concepts within that cell
- **And** each concept shows its procedural "how" step
- **And** they can click "Back" to return to macro view

### AC-5: No ULC Pattern Fallback
- **Given** the subject does NOT have a detected ULC pattern
- **When** the overview map is shown
- **Then** concepts are displayed in a simple hierarchical tree
- **And** no ULC legend is shown

### AC-6: Exit to Session
- **Given** the user has viewed the overview map
- **When** they click "I've seen enough" or "Start Learning"
- **Then** the session progresses to the next appropriate phase
- **And** `studySession.overviewViewed` is set to true

---

## Design Principles

### 1. Passive Consumption
- **No dragging** - concepts are pre-positioned
- **No editing** - read-only view
- **No quizzing** - just viewing
- **No time pressure** - user controls when to exit

### 2. ULC as Structural Guide
- **Legend, not interactive tool** - shows structure, doesn't require interaction
- **Macro → Micro** - start with big picture, drill down as needed
- **Procedural focus** - emphasize "how" steps, not "why" rationale

### 3. Low Cognitive Load
- **Minimal text** - short labels, concise "how" steps
- **Visual hierarchy** - clear grouping by ULC cell
- **Smooth transitions** - no jarring animations
- **Easy exit** - prominent "I've seen enough" button

---

## Out of Scope

The following are NOT part of this initial implementation:

1. **Interactive map building** - That's for medium/high energy users
2. **Concept editing** - Read-only view only
3. **Progress tracking** - No mastery scores in overview mode
4. **Spaced repetition** - This is pre-learning orientation
5. **AI coach messages** - Keep it simple and quiet

---

## Success Metrics

### Engagement
- **View Duration:** Average time spent in overview map (target: 3-5 min)
- **Drill-Down Rate:** % of users who zoom into ULC cells (target: 60%)
- **Completion Rate:** % of users who click "I've seen enough" vs abandoning (target: 80%)

### Learning Outcomes
- **Orientation Score:** Post-overview quiz on subject structure (target: 70% correct)
- **Session Continuation:** % of low-energy users who continue to active learning after overview (target: 40%)

### UX Quality
- **Cognitive Load Rating:** User survey on mental effort (target: <3/10)
- **Clarity Rating:** User survey on structural understanding (target: >7/10)

---

## Implementation Plan

### Phase 1: Core Overview Map
- [ ] Create `OverviewMapView.tsx` component
- [ ] Update `useLearningFlow.ts` to return 'OVERVIEW_MAP' for low energy
- [ ] Add `overviewViewed` flag to session state
- [ ] Implement basic hierarchical tree view (no ULC yet)

### Phase 2: ULC Integration
- [ ] Add ULC legend display (conditional on pattern detection)
- [ ] Implement macro view (ULC matrix with concept counts)
- [ ] Implement micro view (concepts within a cell)
- [ ] Add zoom in/out transitions

### Phase 3: Polish
- [ ] Add "how" steps to micro view
- [ ] Implement smooth animations
- [ ] Add "I've seen enough" button
- [ ] Test with low-energy users

---

## Related Documents

- `docs/GYM_UX_PHILOSOPHY.md` - Low energy user needs
- `docs/ULC_INTEGRATION_SPEC.md` - ULC pattern structure
- `.kiro/specs/ulc-pattern-detection/requirements.md` - ULC detection logic
- `COMPLETE_UX_FLOW_AUDIT.md` - Current flow analysis

---

## Appendix: Mood Options (Corrected)

There are **3 mood options**, not 4:

| Mood | Bandwidth | Goal | Duration | What They Get |
|------|-----------|------|----------|---------------|
| **High Focus** (energized) | High | velocity | 45 min | Full toolkit, ULC matrix, active learning |
| **Steady** (neutral) | Medium | learn-new | 30 min | Balanced mix, ULC matrix, standard flow |
| **Low Energy** (tired) | Low | review | 15 min | **Overview map with ULC legend** (NEW) |

**Note:** "Stressed" is NOT a separate mood option in the UI. Only 3 options are shown.

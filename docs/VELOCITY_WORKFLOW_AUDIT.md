# Velocity Learning Workflow Audit

## Executive Summary

**Issue:** The Knowledge Graph screen (ConceptMapBuilder) appears disconnected from the main Velocity Learning flow. User is unclear about available actions and next steps.

**Root Cause:** The ConceptMapBuilder is part of the BUILD phase but lacks clear entry/exit points and integration with the Study page tab system.

---

## Complete Workflow Map

### Entry Point: Home → Generate

1. **Home Page** (`/`)
   - User selects domain/subject
   - Clicks "Generate Content" or loads existing session
   - Routes to `/generate` or `/generate/:subjectId`

2. **Generate Page** (`/generate/:subjectId`)
   - Shows generation HUD with progress indicators
   - AI generates concepts using backend
   - Upon completion → Routes to `/study/:subjectId?tab=overview`

---

### Study Command Center (`/study/:subjectId`)

The Study page has **3 tabs** but only 2 are currently functional:

#### Tab System Structure:
```typescript
type StudyTab = 'overview' | 'learn' | 'reference';
```

#### ✅ **Tab 1: Overview** (`?tab=overview`)
**Component:** `SessionScoutPreview`
**SENSA Phase:** Step 2 - Explore
**Status:** ✅ WORKING

**Sub-Steps:**
1. **Structure** - View tier-based concept layout (Foundation → Keystone → Utility)
2. **Sprint** - NomenclatureSprint (terminology mastery)
3. **Prime** - Gap acknowledgment (view preview questions, mark learning goals)

**Completion Action:** `onComplete={() => setActiveTab('learn')}` → Routes to Learn tab

---

#### ✅ **Tab 2: Learn** (`?tab=learn`)
**Component:** `VelocityLearning` (lazy loaded)
**SENSA Phases:** All learning phases
**Status:** ⚠️ PARTIALLY WORKING (see issues below)

**Phase Flow:**
```typescript
type LearningPhase = 'IDLE' | 'PRIME' | 'SCOUT' | 'PREVIEW' | 'BUILD' | 
                     'DIAGNOSE' | 'LEARN' | 'MASTER' | 'COMPLETE';
```

**Detailed Phase Breakdown:**

1. **IDLE** - Empty state, prompts user to generate content
   - Shows "No Active Learning Session" message
   - Action: "Go to Library" button → Routes to `/`

2. **PRIME** - Lock-in gate before session starts
   - Component: `VelocityLockInGate`
   - User confirms commitment to session
   - Action: Confirm → Sets `lockedIn = true`, stays in PRIME phase but shows diagnostic modal
   - **Gap:** No clear transition to next phase shown

3. **SCOUT/PREVIEW** - Session overview
   - Component: `SessionScoutPreview` (same as Overview tab!)
   - **DUPLICATE ISSUE:** This is the same component used in Overview tab
   - Completion: `handleScoutComplete()` → Advances to BUILD phase

4. **BUILD** - Knowledge Graph / Concept Map Builder 🎯 **<-- YOU ARE HERE**
   - Component: `ConceptMapBuilder`
   - **Purpose:** Interactive drag-and-drop concept mapping
   - **Features:**
     - Sidebar with concepts grouped by tier (Foundation/Keystone/Utility)
     - Canvas for dragging nodes and creating connections
     - AI suggestions for connections
     - Validation against user predictions from Step 2
   - **Completion Actions:**
     - If `userGuesses` exist: Shows "Check Predictions →" button
     - Else: Shows "Finished Map" button
     - Calls: `markSessionMapBuilt(data)` → Advances to DIAGNOSE phase
   
   **CRITICAL GAPS IDENTIFIED:**
   - ❌ No "Exit" or "Go Back" button visible
   - ❌ No progress indicator showing "Step 3 of 7"
   - ❌ No instructions explaining what to do
   - ❌ Completion button only appears after adding 2+ nodes and 1+ connection
   - ❌ If user doesn't know to add concepts from sidebar, they're stuck

5. **DIAGNOSE** - Diagnostic assessment launch
   - Component: `DiagnosticLaunchSystem`
   - Pre-screens user before learning begins
   - Completion: `handleDiagnosticComplete(results)` → Advances to LEARN phase

6. **LEARN** - Micro-learning loops
   - Component: `MicroLearningLoopController`
   - Iterates through concepts one by one
   - Each concept completion: `handleLoopComplete()` → Loads next concept
   - All concepts complete → Advances to MASTER phase

7. **MASTER** - Final mastery challenge
   - Component: `MasteryChallenge`
   - Synthesis questions across all concepts
   - Completion: `markSessionMastered()` → Advances to COMPLETE phase

8. **COMPLETE** - Session finished
   - **If goal === 'explore'**: Shows `SensaSynopticView` (browse mode)
   - **Else**: Shows "All Caught Up" message with options to return to dashboard

---

#### ❌ **Tab 3: Reference** (`?tab=reference`)
**Status:** ❌ NOT IMPLEMENTED

Currently shows loading spinner with "Loading session..." text but never resolves.

**Expected Purpose:** Quick reference material, glossary, or concept library

---

## Critical Workflow Gaps

### 🚨 **Gap 1: ConceptMapBuilder Integration Issues**

**Problem:** When in BUILD phase (Knowledge Graph screen), user sees:
- Purple/pink circular nodes on dark background
- Two buttons at top: "Overview" and "Velocity" (likely from toolbar)
- No clear instructions
- No visible progress indicator
- No exit path

**Missing Elements:**
1. **Header/Title** showing "Step 3: Note - Build Your Concept Map"
2. **Instructions Panel** explaining:
   - "Click concepts from the left sidebar to add them to the map"
   - "Use Move tool to drag nodes, Connect tool to draw relationships"
   - "Add at least 2 concepts and 1 connection to continue"
3. **Progress Indicator** showing phase position (e.g., "Phase 3 of 7")
4. **Back Button** to return to Overview or exit session
5. **Help/Tutorial** for first-time users

**Current Completion Requirements:** (Hidden from user!)
- Minimum 2 nodes + 1 connection required
- Button appears in bottom-right only after criteria met
- No guidance on what triggers completion eligibility

---

### 🚨 **Gap 2: Duplicate SessionScoutPreview Usage**

**Problem:** `SessionScoutPreview` appears in TWO places:

1. Study page **Overview tab** (initial entry point)
2. VelocityLearning **SCOUT/PREVIEW phase** (inside Learn tab)

**Why This Causes Confusion:**
- User completes Overview tab → Routes to Learn tab
- Learn tab starts at PRIME phase (lock-in gate)
- After lock-in, shows SCOUT/PREVIEW phase with SessionScoutPreview AGAIN
- User sees the same "Explore" steps they just completed
- Creates circular navigation feeling

**Recommendation:**
- **Option A:** Remove SCOUT/PREVIEW phase from VelocityLearning, assume Overview tab already completed it
- **Option B:** Skip Overview tab, go directly to Learn tab, make SCOUT/PREVIEW the true entry point
- **Option C:** Add "Skip this step" button in SCOUT/PREVIEW if user already did Overview

---

### 🚨 **Gap 3: Tab Transitions Unclear**

**Problem:** User doesn't know when to switch tabs or what each tab does.

**Current Flow:**
1. User lands on Study page with Overview tab active
2. Completes SessionScoutPreview steps (Structure → Sprint → Prime)
3. Overview `onComplete` → Sets `activeTab = 'learn'` programmatically
4. **But:** User never clicked the Learn tab themselves, so it feels automatic/confusing

**Missing:**
- Explicit "Continue to Velocity Learning →" button before tab switch
- Breadcrumb or stepper UI showing: Overview ✅ → Learn (current) → Reference
- Clear labels explaining:
  - **Overview:** "Preview session and set learning goals"
  - **Learn:** "Active Velocity Learning session"
  - **Reference:** "Quick lookup and review"

---

### 🚨 **Gap 4: Phase Transitions Within Learn Tab**

**Problem:** Inside the Learn tab (VelocityLearning), transitions between phases are opaque.

**Example Flow:**
```
PRIME → [Lock-in confirmed] → ??? → SCOUT → ??? → BUILD → ??? → DIAGNOSE
```

**Missing:**
- Loading states between phases
- "Preparing next step..." indicators
- Clear completion confirmations ("✓ Step 2 Complete!")
- Option to pause/exit mid-session (currently only available in COMPLETE phase)

---

### 🚨 **Gap 5: Reference Tab Dead End**

**Problem:** Reference tab exists in code but shows infinite loading spinner.

**Current Code:**
```tsx
case 'reference':
  return (
    <div className={styles.loading}>
      <div className={styles.spinner} />
      <p>Loading session...</p>
    </div>
  );
```

**Recommendation:**
- Implement actual reference material viewer
- Show concept glossary with definitions
- Add "Quick Review" cards for each concept
- Include PDF/external resource links if applicable

---

## Navigation & Control Gaps

### Missing User Controls:

1. **Pause Session** - No way to pause and resume later (except exiting browser)
2. **Skip Phase** - Can't skip BUILD phase if user wants to rush to learning
3. **Restart Session** - No reset button if user wants to start over
4. **Exit Confirmation** - No warning when navigating away mid-session

### Dead-End Scenarios:

**Scenario 1:** User in BUILD phase, doesn't add any concepts
- **Current:** Completion button never appears, user is stuck
- **Fix:** Add timeout or "Skip Map Building" option after 2 minutes

**Scenario 2:** User closes browser during LEARN phase
- **Current:** Session state stored in Zustand, might persist on reload
- **Fix:** Add session recovery on reload with "Resume Session" prompt

**Scenario 3:** User wants to go back to concept map after entering DIAGNOSE
- **Current:** No back button, phases only move forward
- **Fix:** Add breadcrumb navigation allowing backward movement (with state preservation)

---

## Recommended Fixes (Priority Order)

### 🔴 **Priority 1: Fix BUILD Phase UX (ConceptMapBuilder)**

#### Changes Needed in `ConceptMapBuilder.tsx`:

1. **Add Header Section:**
```tsx
<div className={styles.phaseHeader}>
  <h1>Step 3: Note - Build Your Concept Map</h1>
  <p className={styles.phaseDescription}>
    Connect concepts to show how they relate. Drag concepts from the sidebar onto the canvas.
  </p>
  <div className={styles.progressIndicator}>
    Phase 3 of 7 • {nodes.length} concepts added • {connections.length} connections
  </div>
</div>
```

2. **Add Instructional Toast (First Time Only):**
```tsx
{nodes.length === 0 && (
  <motion.div 
    className={styles.onboardingToast}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
  >
    <Lightbulb size={20} />
    <div>
      <strong>Getting Started:</strong>
      <ol>
        <li>Click a concept in the left sidebar to add it to the map</li>
        <li>Use the Move tool (↔) to position nodes</li>
        <li>Use the Connect tool (→) to draw relationships</li>
        <li>Add at least 2 concepts and 1 connection to continue</li>
      </ol>
    </div>
    <button onClick={() => setShowOnboarding(false)}>Got it!</button>
  </motion.div>
)}
```

3. **Add Back/Exit Button:**
```tsx
{onBack && (
  <button className={styles.exitButton} onClick={handleExit}>
    <ArrowLeft size={18} />
    Exit Map Builder
  </button>
)}
```

4. **Show Progress Requirements:**
```tsx
<div className={styles.completionProgress}>
  <div className={styles.requirement}>
    {nodes.length >= 2 ? '✓' : '○'} Add 2+ concepts ({nodes.length}/2)
  </div>
  <div className={styles.requirement}>
    {connections.length >= 1 ? '✓' : '○'} Create 1+ connection ({connections.length}/1)
  </div>
</div>
```

---

### 🟠 **Priority 2: Remove Duplicate SessionScoutPreview**

**Approach:** Make Overview tab optional for advanced users.

#### Changes in `VelocityLearning.tsx`:

Remove the SCOUT/PREVIEW phase entirely:

```tsx
// DELETE THIS CASE:
case 'SCOUT':
case 'PREVIEW':
  return (
    <SessionScoutPreview
      concepts={currentSession!.concepts}
      onComplete={() => handleScoutComplete()}
    />
  );
```

Update phase flow logic:
```tsx
// After PRIME phase, go directly to BUILD (skip SCOUT)
if (currentPhase === 'PRIME' && lockedIn) {
  transitionTo('BUILD');
}
```

---

### 🟠 **Priority 3: Add Phase Navigation UI**

#### Create `PhaseNavigator` Component:

```tsx
interface PhaseNavigatorProps {
  currentPhase: LearningPhase;
  completedPhases: LearningPhase[];
  onPhaseClick?: (phase: LearningPhase) => void;
}

const PHASE_LABELS = {
  PRIME: 'Lock In',
  BUILD: 'Map Concepts',
  DIAGNOSE: 'Assessment',
  LEARN: 'Learning Loop',
  MASTER: 'Mastery Challenge',
  COMPLETE: 'Complete'
};

export function PhaseNavigator({ currentPhase, completedPhases }: PhaseNavigatorProps) {
  return (
    <div className={styles.phaseNav}>
      {Object.entries(PHASE_LABELS).map(([phase, label], index) => (
        <div 
          key={phase}
          className={cn(
            styles.phaseStep,
            phase === currentPhase && styles.active,
            completedPhases.includes(phase) && styles.completed
          )}
        >
          <span className={styles.stepNumber}>{index + 1}</span>
          <span className={styles.stepLabel}>{label}</span>
        </div>
      ))}
    </div>
  );
}
```

Add to `VelocityLearning.tsx`:
```tsx
<PhaseNavigator 
  currentPhase={currentPhase} 
  completedPhases={Array.from(completedPhases)} 
/>
```

---

### 🟡 **Priority 4: Implement Reference Tab**

#### Create `ConceptReferenceLibrary` Component:

```tsx
export function ConceptReferenceLibrary({ concepts }: { concepts: LearningConcept[] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTier, setSelectedTier] = useState<string | null>(null);

  const filteredConcepts = concepts.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTier = !selectedTier || c.tier === selectedTier;
    return matchesSearch && matchesTier;
  });

  return (
    <div className={styles.referenceLibrary}>
      <div className={styles.referenceHeader}>
        <input 
          type="search"
          placeholder="Search concepts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <div className={styles.tierFilter}>
          <button onClick={() => setSelectedTier(null)}>All</button>
          <button onClick={() => setSelectedTier('foundation')}>Foundation</button>
          <button onClick={() => setSelectedTier('keystone')}>Keystone</button>
          <button onClick={() => setSelectedTier('utility')}>Utility</button>
        </div>
      </div>
      <div className={styles.conceptGrid}>
        {filteredConcepts.map(concept => (
          <div key={concept.id} className={styles.conceptCard}>
            <h3>{concept.name}</h3>
            <div className={styles.conceptTier}>{concept.tier}</div>
            <p>{concept.explanation}</p>
            {concept.mnemonic && (
              <div className={styles.mnemonic}>
                <Sparkles size={14} />
                {concept.mnemonic.anchor}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

Update `Study.tsx`:
```tsx
case 'reference':
  return (
    <ConceptReferenceLibrary concepts={concepts} />
  );
```

---

### 🟢 **Priority 5: Add Session Controls**

#### Create `SessionControlBar` Component:

```tsx
export function SessionControlBar({
  onPause,
  onExit,
  onRestart,
  sessionStartTime,
  conceptsCompleted,
  totalConcepts
}: SessionControlBarProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(Date.now() - sessionStartTime);
    }, 1000);
    return () => clearInterval(timer);
  }, [sessionStartTime]);

  return (
    <div className={styles.controlBar}>
      <div className={styles.sessionStats}>
        <span className={styles.statItem}>
          <Clock size={16} /> {formatDuration(elapsed)}
        </span>
        <span className={styles.statItem}>
          <CheckCircle size={16} /> {conceptsCompleted}/{totalConcepts} completed
        </span>
      </div>
      <div className={styles.sessionActions}>
        <button onClick={onPause} className={styles.pauseButton}>
          <Pause size={16} /> Pause
        </button>
        <button onClick={onRestart} className={styles.restartButton}>
          <RotateCcw size={16} /> Restart
        </button>
        <button onClick={onExit} className={styles.exitButton}>
          <LogOut size={16} /> Exit Session
        </button>
      </div>
    </div>
  );
}
```

---

## Complete Workflow Diagram (After Fixes)

```
┌─────────────────────────────────────────────────────────────────┐
│ HOME PAGE                                                        │
│ • Select subject                                                 │
│ • Click "Generate" or "Load Existing"                          │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ GENERATE PAGE                                                    │
│ • AI generates concepts (HUD display)                           │
│ • Progress: Blueprints → Concepts → Validation                 │
└────────────────────────┬────────────────────────────────────────┘
                         ↓ (Auto-route on completion)
┌─────────────────────────────────────────────────────────────────┐
│ STUDY PAGE - Tab: OVERVIEW                                      │
│ Component: SessionScoutPreview                                   │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Step 1: Structure (View tier layout)                        │ │
│ │         ↓                                                    │ │
│ │ Step 2: Sprint (Nomenclature mastery)                       │ │
│ │         ↓                                                    │ │
│ │ Step 3: Prime (Acknowledge gaps)                            │ │
│ └─────────────────────────────────────────────────────────────┘ │
│ Action: "Start Velocity Learning →" → Switch to LEARN tab      │
└────────────────────────┬────────────────────────────────────────┘
                         ↓ (Tab switch)
┌─────────────────────────────────────────────────────────────────┐
│ STUDY PAGE - Tab: LEARN                                         │
│ Component: VelocityLearning                                      │
│                                                                  │
│ [Phase Navigator: 1-Prime → 2-Build → 3-Diagnose → 4-Learn → 5-Master → 6-Complete]
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ PHASE 1: PRIME (Lock-in Gate)                               │ │
│ │ • VelocityLockInGate component                              │ │
│ │ • User confirms commitment                                  │ │
│ │ Action: "Lock In!" → Phase 2                                │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                         ↓                                        │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ PHASE 2: BUILD (Concept Map) ⭐ IMPROVED                    │ │
│ │ • ConceptMapBuilder component                               │ │
│ │ • Header: "Step 3: Note - Build Your Concept Map"          │ │
│ │ • Instructions panel explaining drag-and-drop               │ │
│ │ • Progress: "2/2 concepts ✓ | 1/1 connections ✓"          │ │
│ │ • Sidebar with tiered concepts (Foundation/Keystone/Util)   │ │
│ │ • Canvas with node dragging + connection drawing            │ │
│ │ • AI suggestions panel                                      │ │
│ │ Action: "Complete Map Building →" → Phase 3                │ │
│ │ Alt Action: "Skip Map" (after 2min timeout) → Phase 3      │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                         ↓                                        │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ PHASE 3: DIAGNOSE (Assessment)                              │ │
│ │ • DiagnosticLaunchSystem component                          │ │
│ │ • Pre-test to gauge knowledge gaps                          │ │
│ │ Action: Auto-advance → Phase 4                              │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                         ↓                                        │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ PHASE 4: LEARN (Micro-learning Loops)                       │ │
│ │ • MicroLearningLoopController component                     │ │
│ │ • One concept at a time, iterative                          │ │
│ │ • Substeps: Read → Reflect → Practice → Verify             │ │
│ │ Action: Complete all concepts → Phase 5                     │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                         ↓                                        │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ PHASE 5: MASTER (Synthesis Challenge)                       │ │
│ │ • MasteryChallenge component                                │ │
│ │ • Cross-concept synthesis questions                         │ │
│ │ Action: Complete challenge → Phase 6                        │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                         ↓                                        │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ PHASE 6: COMPLETE (Session End)                             │ │
│ │ • If goal='explore': SensaSynopticView (browse mode)        │ │
│ │ • Else: "All Caught Up!" message                            │ │
│ │ Actions:                                                     │ │
│ │   - "Return to Dashboard" → Home                            │ │
│ │   - "Review Session" → Session summary                      │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ [Session Control Bar: Pause | Restart | Exit]                  │
└─────────────────────────────────────────────────────────────────┘
                         ↑ Can switch tabs anytime ↓
┌─────────────────────────────────────────────────────────────────┐
│ STUDY PAGE - Tab: REFERENCE ⭐ NEW                              │
│ Component: ConceptReferenceLibrary                               │
│ • Searchable concept glossary                                   │
│ • Filter by tier (Foundation/Keystone/Utility)                  │
│ • Quick review cards with mnemonics                             │
│ • PDF/resource links                                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Summary of Issues & Fixes

| **Issue** | **Impact** | **Fix** | **Priority** |
|-----------|-----------|---------|--------------|
| ConceptMapBuilder lacks instructions | User stuck, doesn't know what to do | Add header, onboarding toast, progress indicators | 🔴 Critical |
| No visible completion requirements | User doesn't know when they can proceed | Add "2/2 concepts ✓" progress tracker | 🔴 Critical |
| Duplicate SessionScoutPreview in two places | Confusing repeated content | Remove from VelocityLearning, keep in Overview only | 🟠 High |
| No phase navigation/progress indicator | User lost in multi-step flow | Add PhaseNavigator breadcrumb UI | 🟠 High |
| Reference tab not implemented | Dead-end navigation option | Implement ConceptReferenceLibrary | 🟡 Medium |
| No pause/exit/restart controls | Can't manage session state | Add SessionControlBar | 🟢 Low |
| No back navigation in phases | Phases only move forward, can't review | Add backward navigation with state preservation | 🟢 Low |

---

## Next Steps

1. **Immediate:** Fix ConceptMapBuilder UX (add header, instructions, progress)
2. **Short-term:** Remove duplicate SessionScoutPreview, add PhaseNavigator
3. **Medium-term:** Implement Reference tab with ConceptReferenceLibrary
4. **Long-term:** Add full session management (pause/resume/restart)

---

## Files That Need Changes

### Priority 1 (Critical):
- `src/components/learning/ConceptMapBuilder.tsx` - Add header, instructions, progress UI
- `src/components/learning/ConceptMapBuilder.module.css` - Add styles for new UI elements

### Priority 2 (High):
- `src/pages/VelocityLearning.tsx` - Remove SCOUT/PREVIEW phase
- `src/components/learning/PhaseNavigator.tsx` - **NEW FILE** - Create phase breadcrumb component
- `src/pages/VelocityLearning.module.css` - Add phase navigator styles

### Priority 3 (Medium):
- `src/components/learning/ConceptReferenceLibrary.tsx` - **NEW FILE** - Reference tab content
- `src/pages/Study.tsx` - Update reference tab case to render new component

### Priority 4 (Low):
- `src/components/learning/SessionControlBar.tsx` - **NEW FILE** - Session controls
- `src/pages/VelocityLearning.tsx` - Add control bar to layout

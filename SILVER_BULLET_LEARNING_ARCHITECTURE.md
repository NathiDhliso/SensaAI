# 🎯 Silver Bullet Learning Architecture
## Comprehensive Analysis & Restructuring Plan for SensaPBL

**Analysis Date:** January 3, 2026  
**Scope:** Generation Complete (Results) Page → Full Learning Journey  
**Goal:** Eliminate cognitive friction, optimize knowledge scaffolding, and create seamless learning flow

---

## 📊 Current State Analysis

### Generation Complete Page - Current Buttons & Routes

| Button | Destination | Purpose | Issues Identified |
|--------|-------------|---------|-------------------|
| `Start Learning` | `/learn` | Begin concept-by-concept learning | Requires re-parsing content; no lifecycle context |
| `NYC Memory Palace` | `/palace` | Pre-built spatial memory route | Disconnected from learning progress |
| `Regenerate Layout` | Same page | Re-run treemap generator | Function identical to NYC Palace button |
| `Custom Palace` | RouteBuilder modal | Create custom memory palace | 3-step wizard is 2 steps too many |
| `Save Result` | IndexedDB | Persist generation | No sync with cloud/progress |
| `Copy` | Clipboard | Copy raw text | Limited utility |
| `Download` | File download | Export .txt file | No structured format (JSON/Markdown) |
| `Back` | `/` | Return home | Loses generation context |

### Current Flow Problems

```
┌──────────────────────────────────────────────────────────────────────┐
│                    CURRENT DISJOINTED FLOW                          │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Home → Generate → Results → Learn → Sprint → SprintResults        │
│                        │                                             │
│                        ├──→ Palace (disconnected)                    │
│                        │                                             │
│                        └──→ SavedResults (separate location)         │
│                                                                      │
│   PROBLEM: 6 separate pages with no unified learning state          │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 🧠 Cognitive Load Issues Identified

### 1. **Germane Load Dilution** (Learning effort wasted on navigation)
- Students must decide between 4 learning modalities (Learn, Palace, Sprint)
- Each modality has separate UI paradigms requiring re-orientation
- Lifecycle phases (PREPARE → MODEL → DELIVER) not visually persistent

### 2. **Extraneous Load Amplifiers**
| Issue | Location | Impact |
|-------|----------|--------|
| Double content parsing | Results → Learn transition | 2-3 second delay |
| 67 concepts shown flat | Results page concept tags | Overwhelming choice paralysis |
| Hidden dependencies | Concept cards | Can't see prerequisites |
| Duplicate buttons | "NYC Palace" vs "Regenerate" | Confusion about function |
| Raw text generation view | Results page main panel | No structure, wall of text |

### 3. **Intrinsic Load Mismanagement**
- Complex concepts (Foundation tier) shown same size as Utility tier
- No visual hierarchy in concept list (first 8 shown arbitrarily)
- Lifecycle verbs (PREPARE/MODEL/DELIVER) visible but not actionable

### 4. **Missing Scaffolding Elements**
- No concept dependency graph visualization on Results page
- No "recommended first concept" guidance
- No spaced repetition integration
- No confusion pair drilling at concept boundaries

---

## 🎯 Silver Bullet Structure: The Unified Learning Command Center

### Core Principle: **Single Source of Truth UI**

```
┌────────────────────────────────────────────────────────────────────────┐
│                  UNIFIED LEARNING COMMAND CENTER                       │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   ┌──────────────────────────────────────────────────────────────────┐ │
│   │ [📊 Dashboard] [🗺️ Map View] [🏛️ Palace] [⚡ Sprint] [📈 Progress] │ │
│   └──────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│   All views share the same:                                            │
│   • Concept state (completed/current/locked)                           │
│   • Lifecycle phase indicators                                         │
│   • Dependency relationships                                           │
│   • Progress tracking                                                  │
│                                                                        │
│   NO PAGE NAVIGATION - Tab switching with persisted scroll position    │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🏗️ Proposed Architecture

### Phase 1: Results Page Transformation

#### A. Replace "Generated Content" Raw Text with Interactive Dependency Graph

```tsx
// NEW: Interactive concept graph replacing raw text view
<DependencyGraphView
  concepts={concepts}
  edges={dependencyGraph.edges}
  onConceptClick={(id) => scrollToConceptDetails(id)}
  highlightPath={currentLearningPath}
  tierColors={{
    Foundation: '#FFD700',  // Gold - largest, most important
    Keystone: '#C0C0C0',    // Silver - medium
    Utility: '#CD7F32',     // Bronze - smallest
  }}
/>
```

**Cognitive Benefit:**
- Students see HOW concepts connect (not just WHAT concepts exist)
- Foundation concepts visually larger → automatic prioritization
- Click any node to see its lifecycle phases inline

#### B. Consolidate Palace Buttons into Single "Memory Mode" Toggle

```tsx
// BEFORE: 3 confusing buttons
<button>NYC Memory Palace</button>
<button>Regenerate Layout</button>  // Does same thing!
<button>Custom Palace</button>

// AFTER: Single intelligent toggle
<MemoryModeToggle
  defaultMode="graph"
  modes={[
    { id: 'graph', label: 'Concept Map', icon: <Share2 /> },
    { id: 'floor', label: 'Floor Plan', icon: <Grid /> },
    { id: 'street', label: 'Street View', icon: <Map /> },
  ]}
  onModeChange={setCurrentVisualization}
/>
```

#### C. Lifecycle Phase Navigation Bar (Always Visible)

```tsx
// Persistent lifecycle bar across all learning views
<LifecycleNavigator
  phases={['PREPARE', 'MODEL', 'DELIVER']}
  currentPhase={currentConceptPhase}
  onPhaseClick={(phase) => filterConceptsByPhase(phase)}
  progressByPhase={{
    PREPARE: { total: 67, completed: 12 },
    MODEL: { total: 67, completed: 8 },
    DELIVER: { total: 67, completed: 3 },
  }}
/>
```

**Design:**
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   📋 PREPARE (12/67)  →  ⚙️ MODEL (8/67)  →  📊 DELIVER (3/67)   │
│   ████████░░░░░░░░░░     █████░░░░░░░░░░     ██░░░░░░░░░░░░  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### Phase 2: Eliminate Duplicate Routes & Unnecessary Steps

#### Current Routes to Consolidate:

```typescript
// BEFORE: 8 routes, fragmented experience
'/results/:id'      // Generation results
'/learn'            // Concept learning
'/palace'           // Memory palace
'/sprint'           // Speed test
'/sprint-results'   // Sprint scores
'/saved'            // Saved generations

// AFTER: 3 core routes + sub-views
'/study/:subjectId'           // Main learning command center
'/study/:subjectId/sprint'    // Sprint mode (full-screen focus)
'/library'                    // All saved subjects
```

#### Unified Study Page Architecture:

```tsx
// /study/:subjectId - The Silver Bullet Page
export default function StudyCommandCenter() {
  const [activeView, setActiveView] = useState<
    'overview' | 'learn' | 'map' | 'palace' | 'progress'
  >('overview');

  return (
    <div className={styles.commandCenter}>
      {/* Persistent Header */}
      <StudyHeader 
        subject={subject}
        lifecyclePhases={lifecyclePhases}
        cognitiveLoad={cognitiveMetrics}
      />
      
      {/* Tab Navigation */}
      <ViewTabs active={activeView} onChange={setActiveView} />
      
      {/* Dynamic Content Area */}
      <AnimatePresence mode="wait">
        {activeView === 'overview' && <OverviewDashboard />}
        {activeView === 'learn' && <ConceptLearning />}
        {activeView === 'map' && <DependencyMapView />}
        {activeView === 'palace' && <MemoryPalaceView />}
        {activeView === 'progress' && <ProgressAnalytics />}
      </AnimatePresence>
      
      {/* Persistent Footer: Quick Actions */}
      <QuickActionBar 
        onStartSprint={() => navigate(`/study/${subjectId}/sprint`)}
        onNextConcept={advanceToNextConcept}
      />
    </div>
  );
}
```

---

### Phase 3: Cognitive Load Mitigations

#### A. Smart Concept Chunking (Miller's Law: 7±2 Items)

```typescript
// Instead of showing all 67 concepts flat, group by dependencies
function getSmartChunks(concepts: LearningConcept[]): ConceptChunk[] {
  const foundations = concepts.filter(c => c.mnemonic?.tier === 'Foundation');
  
  return foundations.map(foundation => ({
    anchor: foundation,
    children: concepts.filter(c => 
      c.mnemonic?.parentId === foundation.id ||
      c.mnemonic?.dependsOn?.includes(foundation.name)
    ),
    // Max 5-7 children per chunk
    truncated: false,
  }));
}
```

**Visual Result:**
```
┌─────────────────────────────────────────────────────────────┐
│  📚 Your Learning Chunks (Based on Dependencies)            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🏗️ FOUNDATION: Power BI Desktop                           │
│     └── Data Sources (3 related)                           │
│     └── Power Query Editor (4 related)                     │
│     └── Data Transformation (2 related)                    │
│                                                             │
│  🏗️ FOUNDATION: Power BI Service                           │
│     └── Workspaces (2 related)                             │
│     └── Dashboards (3 related)                             │
│     └── Reports (5 related)                                │
│                                                             │
│  [Show all 67 concepts] [Filter by lifecycle phase]        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### B. Prerequisite Gates (Prevent Out-of-Order Learning)

```tsx
// In ConceptCard - Add prerequisite visualization
<PrerequisiteCheck
  concept={currentConcept}
  completedConcepts={progress.completedConcepts}
  onPrerequisiteClick={(id) => navigateToConcept(id)}
  renderWarning={(missing) => (
    <div className={styles.prereqWarning}>
      <AlertTriangle />
      <span>Complete these first for best understanding:</span>
      {missing.map(prereq => (
        <ConceptLink key={prereq.id} concept={prereq} />
      ))}
    </div>
  )}
/>
```

#### C. Lifecycle Phase Drill-Down (Not Just Labels)

Current problem: Lifecycle phases (PREPARE/MODEL/DELIVER) are shown but not actionable.

**Solution: Phase-Specific Learning Actions**

```tsx
// For each concept, show phase-specific micro-goals
<LifecycleActions concept={concept}>
  <PhaseCard phase="PREPARE" status={getPhaseStatus('prepare')}>
    <h4>Before You Start</h4>
    <Checklist items={[
      { label: concept.lifecycle.phase1.steps[0], done: false },
      { label: 'Understand: ' + concept.whyYouNeed, done: false },
    ]} />
    <ActionButton>Complete Preparation</ActionButton>
  </PhaseCard>
  
  <PhaseCard phase="MODEL" status={getPhaseStatus('model')}>
    <h4>Core Understanding</h4>
    <StepByStep steps={concept.lifecycle.phase2.steps} />
    <ActionButton>Practice in Sandbox</ActionButton>
  </PhaseCard>
  
  <PhaseCard phase="DELIVER" status={getPhaseStatus('deliver')}>
    <h4>Verify Mastery</h4>
    <QuizPrompt questions={conceptQuestions} />
    <ActionButton>Take Mini-Quiz</ActionButton>
  </PhaseCard>
</LifecycleActions>
```

---

### Phase 4: Confusion Prevention System

#### PREREQUISITE: Confusion Pair Data Structure

Your critique is **100% correct** — we need to add confusion pair generation to the data model first.

**Current State:**
- [src/lib/types/learning.ts](src/lib/types/learning.ts) — `LearningConcept` interface doesn't have `confusionPairs` field
- [src/lib/system-prompt.ts](src/lib/system-prompt.ts) — Generation prompt doesn't request "Common Confusions"
- [src/lib/content-adapter/parser.ts](src/lib/content-adapter/parser.ts) — Parser doesn't extract confusion pairs from markdown

**Implementation Steps:**

**Step 1: Update Type Definition**

```typescript
// File: src/lib/types/learning.ts

interface LearningConcept {
  id: string;
  name: string;
  stage: string;
  mnemonic: MnemonicContext;
  lifecycle: ConceptLifecycle;
  prerequisites: string[];
  dependsOn?: string[];
  
  // NEW FIELD
  confusionPairs: ConfusionPair[];
  confusionDrillQuestions?: QuizQuestion[];
}

interface ConfusionPair {
  id: string;
  relatedConceptId: string;
  relatedConceptName: string;
  commonMistake: string;        // "Students often confuse X with Y because..."
  correctDifference: string;     // "The key difference is..."
  mnemonicDistinguisher: string; // "Remember: X = ... Y = ..."
  priority: 'high' | 'medium' | 'low';
}
```

**Step 2: Update Generation Prompt**

```typescript
// File: src/lib/system-prompt.ts (around line 150-200)

// ADD to PASS 3 (Content Generation) section:
const pass3ContentGeneration = `
...existing prompt...

## CRITICAL: Common Confusions

For EACH concept, identify 2-3 concepts from other stages that students commonly confuse with it.

Format for each confusion pair:
\`\`\`
### Common Confusion: [Concept A] vs [Concept B]
**Common Mistake:** Students often think [Concept A] and [Concept B] are the same because...
**The Key Difference:** 
- [Concept A] means...
- [Concept B] means...
**Mnemonic Distinguisher:** Remember: [Concept A] = [metaphor], [Concept B] = [different metaphor]
**Why It Matters:** Confusing these causes...
\`\`\`

Example:
\`\`\`
### Common Confusion: Power Query vs Power BI Desktop
**Common Mistake:** Students think "Power Query" and "Power BI Desktop" are different products because they have different names.
**The Key Difference:**
- Power Query = A tool (data transformation engine inside Power BI)
- Power BI Desktop = A product (the complete application for creating dashboards)
**Mnemonic Distinguisher:** "Query" = the engine inside. "Desktop" = the whole car.
**Why It Matters:** Confusing these prevents students from understanding the architecture.
\`\`\`
`;
```

**Step 3: Update Parser to Extract Confusion Pairs**

```typescript
// File: src/lib/content-adapter/parser.ts

function parseConfusionPairs(markdown: string, allConceptNames: string[]): ConfusionPair[] {
  const confusionRegex = /### Common Confusion: (.+?) vs (.+?)\n\*\*Common Mistake:\*\* (.+?)\n\*\*The Key Difference:\*\*/s;
  const matches = [...markdown.matchAll(confusionRegex)];
  
  return matches.map(match => ({
    id: generateId(),
    relatedConceptId: findConceptIdByName(match[2], allConceptNames),
    relatedConceptName: match[2],
    commonMistake: match[3],
    correctDifference: extractSection(match.input, 'The Key Difference', 'Mnemonic Distinguisher'),
    mnemonicDistinguisher: extractSection(match.input, 'Mnemonic Distinguisher', 'Why It Matters'),
    priority: determineConfusionPriority(match.input),
  }));
}
```

**Step 4: Update Content Transformer**

```typescript
// File: src/lib/content-adapter/transformer.ts

function transformConceptWithConfusions(
  parsedConcept: ParsedConcept,
  allConcepts: string[],
  confusionData: ConfusionPair[]
): LearningConcept {
  const concept = transformConcept(parsedConcept); // existing logic
  
  // NEW: Attach confusion pairs
  concept.confusionPairs = confusionData.filter(
    pair => pair.relatedConceptName === concept.name || 
            confusionData.some(c => c.relatedConceptName === concept.name)
  );
  
  return concept;
}
```

**This prerequisite is CRITICAL because:**
1. Without confusion pairs in the data, we can't trigger drills
2. The LLM must explicitly generate them (they don't appear in lifecycle phases)
3. Parser must extract them from markdown
4. UI can then reference `concept.confusionPairs` to show drill triggers

**Estimated Effort:** 3 hours (1 type update + 2 prompt/parser updates)

---

#### A. Confusion Pair Drilling at Concept Boundaries

Once confusion pairs are in the data model, implement the drill trigger:

```tsx
// After completing ConceptCard
const handleConceptComplete = async () => {
  completeConcept(conceptId);
  
  // Check for confusion pairs (NOW AVAILABLE IN DATA)
  const concept = allConcepts.find(c => c.id === conceptId);
  if (concept.confusionPairs?.length > 0) {
    // Show quick drill before moving on
    showConfusionDrill({
      confusions: concept.confusionPairs,
      onComplete: () => advanceToNextConcept(),
      skippable: false, // Force engagement at concept boundary
    });
  } else {
    advanceToNextConcept();
  }
};
```

**UI Component: ConfusionDrill**

```tsx
// NEW FILE: src/components/learning/ConfusionDrill.tsx

interface ConfusionDrillProps {
  confusions: ConfusionPair[];
  onComplete: () => void;
}

export function ConfusionDrill({ confusions, onComplete }: ConfusionDrillProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const current = confusions[currentIndex];
  
  return (
    <Modal>
      <h2>⚡ Confusion Check</h2>
      <p>Before you move on, let's clarify a common mix-up:</p>
      
      <ConceptComparison
        concept1={current.relatedConceptName}
        concept2={current.relatedConceptName}
        commonMistake={current.commonMistake}
        difference={current.correctDifference}
        mnemonicTip={current.mnemonicDistinguisher}
      />
      
      <button onClick={() => {
        if (currentIndex < confusions.length - 1) {
          setCurrentIndex(currentIndex + 1);
        } else {
          onComplete();
        }
      }}>
        {currentIndex < confusions.length - 1 ? 'Next Comparison' : 'Got It!'}
      </button>
    </Modal>
  );
}
```

#### B. Smart Interleaving (Prevent Blocking)

```typescript
// Instead of linear concept progression, interleave based on cognitive science
function getOptimalNextConcept(
  completedConcepts: string[],
  allConcepts: LearningConcept[],
  lastConceptPhase: string
): LearningConcept {
  // 1. Avoid consecutive same-phase concepts (causes blocking)
  const candidates = allConcepts.filter(c => 
    !completedConcepts.includes(c.id) &&
    c.lifecycle?.phase1.title !== lastConceptPhase
  );
  
  // 2. Prefer concepts with satisfied prerequisites
  const ready = candidates.filter(c =>
    c.prerequisites.every(p => completedConcepts.includes(p))
  );
  
  // 3. Balance Foundation/Keystone/Utility progression
  const tier = getTierForBalance(completedConcepts);
  const tierMatches = ready.filter(c => c.mnemonic?.tier === tier);
  
  return tierMatches[0] || ready[0] || candidates[0];
}
```

---

### Phase 5: Single-Page Learning Experience

#### The "Study Session" Model

Replace fragmented page navigation with a **session-based model**:

```typescript
interface StudySession {
  id: string;
  subjectId: string;
  startedAt: Date;
  
  // Session goals
  targetConcepts: string[];      // What to learn this session
  targetPhases: LifecyclePhase[];// Focus on specific phases
  targetDuration: number;        // Minutes
  
  // Progress within session
  conceptsCompleted: string[];
  phasesCompleted: Record<string, LifecyclePhase[]>;
  confusionDrillsCompleted: number;
  
  // Cognitive metrics
  cognitiveLoad: number;
  breaksTaken: number;
  
  // Session type
  mode: 'deep-learn' | 'review' | 'sprint' | 'explore';
}
```

**Session Start Flow:**

```
┌─────────────────────────────────────────────────────────────┐
│           🎯 Start Study Session                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  How much time do you have?                                 │
│  [15 min] [30 min] [45 min] [Custom]                       │
│                                                             │
│  What's your goal?                                          │
│  [🆕 Learn New Concepts]     → Deep learning mode           │
│  [🔄 Review Completed]       → Spaced repetition            │
│  [⚡ Sprint Practice]        → Speed & automaticity         │
│  [🗺️ Explore Freely]        → Self-directed                │
│                                                             │
│  Recommended for you:                                       │
│  "Complete the PREPARE phase for Data Sources" (12 min)    │
│                                                             │
│                              [Start Session →]              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Implementation Priority Matrix: Code-First Refactoring

### ⚠️ REFACTOR-BEFORE-BUILD PRINCIPLE

**Before creating ANY new components, update existing code:**
1. Audit duplicate/unused code
2. Consolidate overlapping functionality
3. Refactor existing files
4. Remove dead code
5. **Then** create new components only if they don't exist

---

## 🔧 Phase 0: Code Audit & Consolidation (MUST DO FIRST)

### 0.1 Duplicate Button Code Audit

**File:** [src/pages/Results.tsx](src/pages/Results.tsx#L144-L200)

**Current Problem:** 3 palace buttons with near-identical styling, different handlers

```tsx
// CURRENT (REDUNDANT)
<button onClick={handleCreatePalace} className={styles.palaceButton}>
  <Map className={styles.buttonIcon} />
  NYC Memory Palace
</button>
<button onClick={handleRegenerateLayout} className={styles.customPalaceButton} style={{ marginTop: '0.5rem', opacity: 0.8 }}>
  <Map className={styles.buttonIcon} />
  Regenerate Layout
</button>
<button onClick={() => setShowRouteBuilder(true)} className={styles.customPalaceButton}>
  <Plus className={styles.buttonIcon} />
  Custom Palace
</button>
```

**Refactoring Step 1: Extract Button Group Component**

```tsx
// NEW FILE: src/components/palace/PalaceActionGroup.tsx
interface PalaceActionGroupProps {
  onEnterPalace: () => void;
  onCreateCustom: () => void;
}

export function PalaceActionGroup({ onEnterPalace, onCreateCustom }: PalaceActionGroupProps) {
  return (
    <div className={styles.palaceActionGroup}>
      <button onClick={onEnterPalace} className={styles.primaryPalaceButton}>
        <Map size={18} />
        Enter Memory Palace
      </button>
      <button onClick={onCreateCustom} className={styles.secondaryPalaceButton}>
        <Plus size={18} />
        Build Custom Route
      </button>
    </div>
  );
}
```

**Update Results.tsx:**
```tsx
// BEFORE (lines 144-200)
<button onClick={handleCreatePalace} className={styles.palaceButton}>...
<button onClick={handleRegenerateLayout} ...
<button onClick={() => setShowRouteBuilder(true)} ...

// AFTER
<PalaceActionGroup 
  onEnterPalace={handleCreatePalace}
  onCreateCustom={() => setShowRouteBuilder(true)}
/>
```

**Consolidate CSS:** [src/pages/Results.module.css](src/pages/Results.module.css#L220-L280)

```css
/* REMOVE duplicate .customPalaceButton, consolidate into .secondaryPalaceButton */
.palaceActionGroup {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.primaryPalaceButton {
  flex: 1;
  /* reuse existing palaceButton styles */
}

.secondaryPalaceButton {
  flex: 1;
  /* reuse existing customPalaceButton styles */
}

/* DELETE unused styles: */
/* - .customPalaceButton (now .secondaryPalaceButton) */
/* - .palaceButtons (container was redundant) */
```

**Effort:** 1 hour | **Lines Deleted:** ~50 | **Technical Debt Reduced:** High

---

### 0.2 Route Fragmentation Audit

**File:** [src/App.tsx](src/App.tsx#L1-L50)

**Current Problem:** 8 routes with similar patterns, no shared layout structure

```tsx
// CURRENT (fragmented)
<Route path="/results/:id" element={<ProtectedRoute><Results /></ProtectedRoute>} />
<Route path="/learn" element={<ProtectedRoute><Learn /></ProtectedRoute>} />
<Route path="/palace" element={<ProtectedRoute><Palace /></ProtectedRoute>} />
<Route path="/sprint" element={<ProtectedRoute><Sprint /></ProtectedRoute>} />
<Route path="/sprint-results" element={<ProtectedRoute><SprintResults /></ProtectedRoute>} />
<Route path="/saved" element={<ProtectedRoute><SavedResults /></ProtectedRoute>} />
```

**Refactoring Step 1: Create Shared Layout Wrapper**

```tsx
// NEW FILE: src/layouts/StudyLayout.tsx
export function StudyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.studyLayout}>
      <LifecycleNavigator /> {/* Always visible */}
      <div className={styles.studyContent}>
        {children}
      </div>
      <QuickActionBar /> {/* Always visible */}
    </div>
  );
}
```

**Update App.tsx Routes:**
```tsx
// BEFORE
<Route path="/learn" element={<ProtectedRoute><Learn /></ProtectedRoute>} />
<Route path="/palace" element={<ProtectedRoute><Palace /></ProtectedRoute>} />

// AFTER - Consolidate under /study/:subjectId
<Route path="/study/:subjectId" element={
  <ProtectedRoute>
    <StudyLayout>
      <StudyCommandCenter />
    </StudyLayout>
  </ProtectedRoute>
} />

// OLD ROUTES TO DEPRECATE (mark for removal after migration):
// - /results/:id (redirect to /study/:subjectId)
// - /learn (no longer standalone)
// - /palace (now tab in /study/:subjectId)
// - /sprint (now /study/:subjectId/sprint with full-screen wrapper)
```

**Effort:** 2 hours | **Routes Consolidated:** 6→2 | **Code Reuse:** High

---

### 0.3 Learning Store Audit

**File:** [src/store/learning-store.ts](src/store/learning-store.ts#L1-L100)

**Current Problem:** `customContent` state exists but not used consistently; `cognitiveMetrics` partially implemented

**Refactoring Step 1: Consolidate State Structure**

```typescript
// BEFORE (scattered state)
customContent: CustomContent | null;
sprintResult: SprintResult | null;
cognitiveMetrics: CognitiveMetrics;
showNeuralReset: boolean;

// AFTER (unified learning session state)
interface CurrentSession {
  id: string;
  subjectId: string;
  subject: string;
  mode: 'learn' | 'sprint' | 'explore';
  
  // Content
  stages: LearningStage[];
  concepts: LearningConcept[];
  
  // Progress
  progress: UserProgress;
  sprintResult?: SprintResult;
  
  // Metrics
  cognitiveMetrics: CognitiveMetrics;
  showNeuralReset: boolean;
}

// Replace multiple stores with single session
currentSession: CurrentSession | null;
```

**Update Actions:**
```typescript
// BEFORE
loadCustomContent(content) { ... }
setSprintResult(result) { ... }
triggerNeuralReset() { ... }

// AFTER (unified)
loadSession(session: CurrentSession) { ... }
updateSessionProgress(progress: UserProgress) { ... }
updateSessionMetrics(metrics: CognitiveMetrics) { ... }
```

**Effort:** 3 hours | **State Properties Consolidated:** 5→1 main store | **Bugs Prevented:** Medium (state inconsistency)

---

### 0.4 Component Duplication Audit

**Files to Audit:**

| Component | Location | Duplicates Found | Action |
|-----------|----------|-----------------|--------|
| Concept card display | `ConceptCard.tsx` | Similar rendering in `JourneyMap.tsx` | Consolidate into single component |
| Lifecycle phase rendering | Multiple files | Phase1/Phase2/Phase3 logic duplicated | Extract to `LifecyclePhaseRenderer.tsx` |
| Metric badges | `Results.tsx`, `CognitiveGauge.tsx` | Same badge styling | Create shared `Badge.tsx` component |
| Button variants | Multiple pages | Primary, Secondary, Success buttons re-coded | Create `ButtonVariant` enum + reusable component |

**Refactoring Step 1: Extract Lifecycle Renderer**

```typescript
// NEW FILE: src/components/learning/LifecyclePhaseRenderer.tsx
interface LifecyclePhaseRendererProps {
  lifecycle: ConceptLifecycle;
  phase: 'phase1' | 'phase2' | 'phase3';
  interactive?: boolean;
  onPhaseComplete?: () => void;
}

export function LifecyclePhaseRenderer({ 
  lifecycle, 
  phase, 
  interactive = false,
  onPhaseComplete 
}: LifecyclePhaseRendererProps) {
  const phaseData = lifecycle[phase];
  
  return (
    <div className={styles.phaseContainer}>
      <h3>{phaseData.title}</h3>
      <ul className={styles.stepList}>
        {phaseData.steps.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ul>
      {interactive && <button onClick={onPhaseComplete}>Complete</button>}
    </div>
  );
}
```

**Replace in Files:**
- [src/components/learning/ConceptCard.tsx](src/components/learning/ConceptCard.tsx#L80-L120) - Use renderer instead of inline lifecycle JSX
- [src/components/palace/LifecycleCard.tsx](src/components/palace/LifecycleCard.tsx) - Use same renderer

**Effort:** 2 hours | **Code Duplication Eliminated:** ~200 lines | **Maintenance Improvement:** High

---

### 0.5 CSS Module Cleanup

**Files:** [src/pages/Results.module.css](src/pages/Results.module.css), [src/pages/Learn.module.css](src/pages/Learn.module.css)

**Audit for:**
- Unused classes (search each class in corresponding .tsx file)
- Duplicate style definitions (e.g., `.primaryButton` defined twice)
- Over-specificity (e.g., `.container .header .title` instead of `.headerTitle`)
- Inconsistent spacing (using both `1rem` and `16px` for same value)

**Example Cleanup:**

```css
/* BEFORE: Results.module.css - Line 50 */
.palaceButtons {
  display: flex;
  gap: 0.5rem;
}

.palaceButtons .palaceButton,
.palaceButtons .customPalaceButton {
  flex: 1;
  padding: 0.625rem 0.75rem;
  font-size: 0.8125rem;
}

/* AFTER: Delete .palaceButtons container, use grid directly */
.palaceActionGroup {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}
```

**Effort:** 1 hour | **Lines Removed:** ~100 | **File Size Reduction:** 15-20%

---

## 📋 Code-First Implementation Priority (UPDATED)

### Phase 0: Consolidation (MUST DO FIRST - 10 hours)

| Task | Files to Update | Lines Changed | Debt Reduction |
|------|-----------------|-----------------|---|
| Merge duplicate palace buttons | `Results.tsx`, `Results.module.css` | +50, -80 | High |
| Extract `PalaceActionGroup` component | NEW component | +40 | Med |
| Consolidate routes in `App.tsx` | `App.tsx` | -30, +20 | High |
| Unify learning store state | `learning-store.ts` | -150, +200 | High |
| Extract `LifecyclePhaseRenderer` | NEW component | +60 | Med |
| Remove unused CSS | `Results.module.css`, `Learn.module.css` | -150 | Low |
| **Phase 0 Total** | **6 files** | **~200 net** | **Very High** |

### Phase 1: Enhancement (Do After Cleanup - 7 hours)

| Task | Files | Effort | Impact | Debt Risk |
|------|-------|--------|--------|-----------|
| Add dependency graph component | NEW + `Results.tsx` | 4 hrs | Very High | Low (new code only) |
| Create lifecycle nav bar | NEW component | 2 hrs | High | Low |
| Add concept chunking logic | `learning-store.ts` | 1 hr | High | Low (update only) |

### Phase 2: Refactoring (Do After Phase 1 - 8 hours)

| Task | Files | Effort | Debt Risk |
|------|-------|--------|-----------|
| Consolidate 6 routes → 3 | `App.tsx`, all pages | 8 hrs | Low (uses Phase 0 base) |
| Create `StudyLayout` wrapper | NEW + layout files | 2 hrs | Low |

### Phase 3: Vision (v2.0 - After debt cleared - 20+ hours)

| Task | Files | Effort | Prerequisites |
|------|-------|--------|----------------|
| Full Study Command Center | Multiple NEW | 20+ hrs | **Phase 0-2 complete** |

---

## 🗑️ Dead Code to Remove (High Priority)

| File | Issue | Action |
|------|-------|--------|
| [src/pages/SavedResults.tsx](src/pages/SavedResults.tsx) | Duplicate of Results page | Mark for deprecation after Phase 1 |
| [src/components/palace/RouteBuilder/RouteBuilder.tsx](src/components/palace/RouteBuilder/RouteBuilder.tsx#L64-L199) | 3-step wizard (should be 1-step) | Refactor to single-page component in Phase 1 |
| Unused CSS in `.module.css` files | 150+ lines | Delete after Phase 0 |
| Duplicate button styles | 50+ lines | Consolidate to `Button.tsx` in Phase 1 |

---

## ✅ Debt Reduction Metrics

**Before Phase 0:**
- Routes: 8 separate paths
- Duplicate buttons: 3 instances
- State stores: 2 (learning + palace, inconsistent)
- Unused CSS: ~150 lines
- Code duplication: ~200 lines

**After Phase 0:**
- Routes: Grouped under `/study/:subjectId` (path count same, but unified behavior)
- Duplicate buttons: 1 reusable component
- State stores: 1 unified session store
- Unused CSS: 0
- Code duplication: ~0

---

## 🎯 Implementation Checklist

### Before Writing Any New Code:

- [x] **0.1** Consolidate palace buttons into `PalaceActionGroup` ✅ (commit: 8fa3c67)
  - Merged 3 buttons → 2 clear actions ("Enter Memory Palace" + "Build Custom Route")
  - Created `.palaceActionGroup` CSS grid layout
- [x] **0.2** Extract `LifecyclePhaseRenderer` component ✅ (commit: 8fa3c67)
  - Created `LifecyclePhaseStep.tsx` + `LifecyclePhaseStep.module.css`
  - Exports: `LifecyclePhaseStep`, `LifecycleFlow`
  - Integrated into `ConceptCard.tsx`
- [ ] **0.3** Unify `learning-store.ts` state structure
- [ ] **0.4** Create `StudyLayout` wrapper
- [ ] **0.5** Remove unused CSS classes
- [ ] **0.6** Mark deprecated routes (`/saved`, `/results/:id`)
- [x] **0.7** Run TypeScript check: `npx tsc --noEmit` ✅ (all phases verified)
- [ ] **0.8** Test all refactored components

### Then Write New Code:

- [x] **1.1** Add `DependencyGraphView` component (builds on refactored state) ✅ (commit: b8ecefc)
  - Added `GraphView` using d3-hierarchy for dependency visualization
  - Integrated dependency graph preview card in Results.tsx
- [x] **1.2** Add `LifecycleNavigator` bar ✅ (commit: c2f2179)
  - Created `LifecycleNavigator.tsx` + `LifecycleNavigator.module.css`
  - Phase-colored progress (Blue→Amber→Green), clickable phases
  - Integrated into Learn.tsx and Results.tsx
- [x] **1.3** Add concept chunking logic to store ✅ (commit: b894b37)
  - Created `ConceptChunks.tsx` + `ConceptChunks.module.css`
  - Groups 67 concepts → 3 tier chunks (Foundation/Keystone/Utility)
  - Expandable "show more" (5 per tier default), Start Learning per tier
- [ ] **2.1** Create `/study/:subjectId` page (uses all above)

---

## 📊 Technical Debt Before/After

```
BEFORE REFACTORING:
├── 8 routes (fragmented)
├── 3 duplicate button implementations
├── 2 partially-implemented stores
├── 200+ lines code duplication
├── 150+ unused CSS lines
└── Complexity score: HIGH

AFTER PHASE 0:
├── Consolidated route structure
├── 1 reusable component per UI pattern
├── 1 unified session store
├── 0 code duplication
├── 0 unused CSS
└── Complexity score: MEDIUM
```

---

## 🎯 Key Metrics to Track

### Before/After Comparisons

| Metric | Current (Est.) | Target |
|--------|----------------|--------|
| Clicks to start learning | 4 | 1 |
| Time to first concept mastery | ~8 min | ~3 min |
| Page transitions in typical session | 6 | 0 (tab switches) |
| Concepts visible at once | 67 (flat) | 7 (chunked) |
| Lifecycle phase visibility | Labels only | Actionable progress |
| Dependency understanding | Hidden | Visual graph |

### Cognitive Load Indicators

```typescript
// Add tracking for these in cognitiveMetrics
interface EnhancedCognitiveMetrics {
  // Existing
  currentLoad: number;
  consecutiveCorrect: number;
  
  // NEW: Lifecycle-specific tracking
  phaseLoadBalance: {
    prepare: number;  // % of session in PREPARE
    model: number;    // % of session in MODEL  
    deliver: number;  // % of session in DELIVER
  };
  
  // NEW: Confusion prevention
  confusionDrillAccuracy: number;
  conceptRevisits: number;  // Going back = potential confusion
  
  // NEW: Flow state indicators
  uninterruptedConceptStreak: number;
  averageConceptTime: number;
  flowStateMinutes: number;
}
```

---

## 🚀 Quick Wins (Today)

### 1. Merge Duplicate Palace Buttons

```tsx
// In Results.tsx, replace:
<button onClick={handleCreatePalace}>NYC Memory Palace</button>
<button onClick={handleRegenerateLayout}>Regenerate Layout</button>
<button onClick={() => setShowRouteBuilder(true)}>Custom Palace</button>

// With:
<div className={styles.palaceSection}>
  <button onClick={handleCreatePalace} className={styles.primaryPalaceButton}>
    <Map /> Enter Memory Palace
  </button>
  <button 
    onClick={() => setShowRouteBuilder(true)} 
    className={styles.secondaryPalaceButton}
  >
    <Plus /> Build Custom Route
  </button>
</div>
```

### 2. Add Recommended Start Point

```tsx
// In Results.tsx, add above concept tags:
{displayPass1Data && (
  <div className={styles.recommendedStart}>
    <Zap className={styles.recommendedIcon} />
    <span>Recommended starting point:</span>
    <button 
      className={styles.startConceptButton}
      onClick={() => {
        const foundation = getFirstFoundationConcept(displayPass1Data);
        handleStartLearningAt(foundation.id);
      }}
    >
      {getFirstFoundationConcept(displayPass1Data)?.name || 'First Concept'}
    </button>
  </div>
)}
```

### 3. Replace Raw Text with Structured Preview

```tsx
// Replace <pre>{displayDocument}</pre> with:
<ContentStructurePreview
  domain={displayPass1Data.domain}
  lifecycle={displayPass1Data.lifecycle}
  concepts={parsedConcepts}
  onConceptClick={(id) => handleStartLearningAt(id)}
  maxVisible={12}
  groupBy="tier" // or "phase" or "stage"
/>
```

---

## 📚 Research References

### Cognitive Load Theory (Sweller, 1988)
- **Intrinsic load**: Complexity inherent to material → Address with smart chunking
- **Extraneous load**: Caused by poor design → Eliminate duplicate buttons, reduce page transitions
- **Germane load**: Effort for learning → Maximize with dependency visualization

### Miller's Law (1956)
- Working memory capacity: 7±2 items
- **Application**: Never show more than 7 concepts at once; use chunking

### Spacing Effect (Ebbinghaus, 1885)
- Distributed practice > massed practice
- **Application**: Session-based model with built-in review scheduling

### Interleaving Effect (Rohrer & Taylor, 2007)
- Mixed practice improves long-term retention
- **Application**: Smart next-concept selection alternates lifecycle phases

### Desirable Difficulties (Bjork, 1994)
- Some difficulty enhances learning
- **Application**: Confusion drills at concept boundaries; prerequisite gates

---

## ✅ Success Criteria

A successful implementation should achieve:

1. **Zero redundant clicks** - Every action moves learning forward
2. **Persistent context** - Lifecycle phases always visible
3. **Visual dependencies** - Students see concept relationships
4. **Chunked complexity** - 7±2 items visible at any time
5. **Session ownership** - Students commit to focused time blocks
6. **Confusion prevention** - Drill similar concepts together
7. **Measurable flow** - Track cognitive load and adapt

---

## 🎨 Detailed UI Specifications

### Design System Foundation

#### Typography Scale (Based on SensaPBL Existing System)

```css
/* Display/Headings: Plus Jakarta Sans - geometric, modern */
H1 (Page Title):     3.75rem / 48px | Weight: 700 | Line-height: 1.2
H2 (Section):        2.25rem / 36px | Weight: 700 | Line-height: 1.2
H3 (Subsection):     1.875rem / 30px | Weight: 600 | Line-height: 1.3
H4 (Card Title):     1.5rem / 24px   | Weight: 600 | Line-height: 1.3

/* Body/Reading: Source Sans 3 - humanist, warm */
Body Large:          1.125rem / 18px | Weight: 400 | Line-height: 1.625
Body Base:           1rem / 16px     | Weight: 400 | Line-height: 1.5
Body Small:          0.875rem / 14px | Weight: 400 | Line-height: 1.5
Label/Tag:           0.75rem / 12px  | Weight: 500 | Line-height: 1.25

/* Mono: JetBrains Mono - code clarity */
Code Block:          0.875rem / 14px | Weight: 400 | Line-height: 1.6
```

#### Color Palette (Light & Dark Mode)

```
PRIMARY ACTIONS:
  • Amethyst (#6B46C1) - Main CTAs, focus states
  • Hover: #553c9a (darker)
  • Active: #4a3676 (even darker)

SECONDARY ACTIONS:
  • Sage (#10B981) - Success, save, confirmation
  • Coral (#F97316) - Warnings, palace/memory features
  • Rose (#EC4899) - Confusion drills, important distinctions

BACKGROUNDS:
  Light Mode:
    • Surface (Cards): #FFFFFF
    • Elevated Surface: #F8FAFC (subtle lift)
    • Page Background: #FAF5FF (light purple tint)
    • Neutral: #F8FAFC
    
  Dark Mode:
    • Surface: #2D1B4E (deep purple)
    • Elevated: #3D2963 (slightly lighter)
    • Page Background: #1A0B2E (darkest)
    • Neutral: #251640 (very dark)

SEMANTIC:
  • Success: #22C55E → Background: #F0FDF4 | Text: #166534
  • Warning: #F59E0B → Background: #FFFBEB | Text: #92400E
  • Error: #DC2626 → Background: #FEF2F2 | Text: #991B1B
  • Info: #3B82F6 → Background: #DBEAFE | Text: #1E40AF

BORDERS:
  • Default: #E2E8F0 (light mode) / #4A3470 (dark mode)
  • Emphasis: #CBD5E1 (light) / #6B46C1 (dark)
  • Light: #F1F5F9 (light) / #3D2963 (dark)

SHADOWS:
  • Small: 0 1px 2px rgba(0,0,0,0.05)
  • Medium: 0 4px 6px -1px rgba(0,0,0,0.1)
  • Large: 0 10px 15px -3px rgba(0,0,0,0.1)
  • Glow Primary: 0 4px 15px rgba(107, 70, 193, 0.3)
```

#### Spacing Scale (8px grid)

```
xs:  0.25rem (4px)
sm:  0.5rem  (8px)
md:  1rem    (16px)
lg:  1.5rem  (24px)
xl:  2rem    (32px)
2xl: 2.5rem  (40px)
3xl: 3rem    (48px)

Component Padding:
  • Buttons: 0.625rem (vertical) × 1.25rem (horizontal)
  • Cards: 1.5rem all
  • Input/Forms: 0.75rem vertical × 1rem horizontal
  • Modal: 2rem all
```

---

### Component Design Specifications

#### 1. UNIFIED ACTION BUTTONS

**Current Problem:** 3 confusing palace buttons with unclear hierarchy

**New Design - Single Smart Button + Dropdown**

```tsx
// Implementation pattern
<div className={styles.memoryModeSection}>
  <button className={styles.primaryMemoryButton}>
    <Map size={18} strokeWidth={1.5} />
    Enter Memory Palace
  </button>
  <DropdownMenu>
    <Option>Floor Plan View</Option>
    <Option>Dependency Graph</Option>
    <Option>Street View</Option>
    <Divider />
    <Option>Create Custom Palace</Option>
  </DropdownMenu>
</div>
```

**Visual States:**

| State | Background | Border | Text | Icon | Shadow |
|-------|-----------|--------|------|------|--------|
| **Default** | `linear-gradient(135deg, #F59E0B 0%, #ea580c 100%)` | None | White | Coral (#F97316) | `0 4px 15px rgba(245,158,11,0.3)` |
| **Hover** | Gradient (brighter) | None | White | Same | `0 6px 20px rgba(245,158,11,0.4)` + `translateY(-2px)` |
| **Active/Pressed** | Gradient (darker) | None | White | Same | `0 2px 8px rgba(245,158,11,0.2)` + `translateY(0)` |
| **Disabled** | `#D1D5DB` | None | `#9CA3AF` | `#9CA3AF` | None; `opacity: 0.5` |
| **Loading** | Gradient (dimmed) | None | White | Spinner animation | Same as default |

**Dropdown Menu Styling:**

```css
.dropdownMenu {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
  box-shadow: 0 10px 25px rgba(0,0,0,0.15);
  min-width: 220px;
  overflow: hidden;
  z-index: 1000;
  
  animation: slideDown 0.2s ease-out;
}

.dropdownOption {
  padding: 0.75rem 1rem;
  color: var(--color-text-dark);
  cursor: pointer;
  transition: background-color 0.15s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.95rem;
}

.dropdownOption:hover {
  background: var(--color-bg-neutral);
}

.dropdownOption.active {
  background: var(--overlay-primary-10);
  color: var(--color-accent);
  font-weight: 500;
}

.dropdownDivider {
  height: 1px;
  background: var(--color-border);
  margin: 0.5rem 0;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-0.5rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

---

#### 2. LIFECYCLE NAVIGATOR BAR (Always Visible)

**Design Pattern:**

```
┌──────────────────────────────────────────────────────────────┐
│  📋 PREPARE (12/67)  →  ⚙️ MODEL (8/67)  →  📊 DELIVER (3/67)  │
│  ████████░░░░░░░░░░     █████░░░░░░░░░░     ██░░░░░░░░░░░░    │
└──────────────────────────────────────────────────────────────┘
```

**Component Styling:**

```css
.lifecycleNavigator {
  display: flex;
  gap: 2rem;
  padding: 1.5rem;
  background: linear-gradient(to right, 
    var(--color-bg-primary) 0%, 
    var(--color-bg-secondary) 100%);
  border-bottom: 2px solid var(--color-border-emphasis);
  align-items: center;
  justify-content: center;
}

.lifecyclePhase {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 160px;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  
  &:hover {
    background: var(--overlay-primary-10);
  }
}

.lifecyclePhase.active {
  background: var(--overlay-primary-15);
  border: 1px solid var(--color-accent);
  box-shadow: var(--shadow-glow-primary);
}

.phaseLabel {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  color: var(--color-text-dark);
  font-size: 0.95rem;
}

.phaseIcon {
  font-size: 1.25rem;
}

.progressBar {
  height: 6px;
  background: var(--color-border);
  border-radius: 3px;
  overflow: hidden;
}

.progressFill {
  height: 100%;
  background: linear-gradient(90deg, 
    var(--color-accent) 0%, 
    var(--color-accent-light) 100%);
  width: var(--fill-percentage);
  transition: width 0.3s ease;
}

.phaseCount {
  font-size: 0.75rem;
  color: var(--color-text-light);
  font-weight: 500;
}

.phaseArrow {
  font-size: 1.25rem;
  color: var(--color-text-light);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}
```

**Responsive Behavior:**

```
Desktop (1200px+):    Full layout, 3 phases visible
Tablet (768px-1199px): Stack into 2 rows or scroll horizontally
Mobile (< 768px):     Vertical stack, compact labels
```

---

#### 3. CONCEPT CHUNKING CARDS

**Card Structure:**

```
┌────────────────────────────────────────────┐
│ 🏗️ FOUNDATION: Power BI Desktop            │
├────────────────────────────────────────────┤
│ Depends on: None                           │
│ Dependents: 9 concepts                     │
│                                            │
│ ├─ 📊 Data Sources (3 related)             │
│ ├─ 🔧 Power Query Editor (4 related)       │
│ └─ 🔄 Data Transformation (2 related)      │
│                                            │
│ [▶ Expand] [Start Learning]                │
└────────────────────────────────────────────┘
```

**Styling:**

```css
.conceptChunk {
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: 1rem;
  padding: 1.5rem;
  margin-bottom: 1rem;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
}

.conceptChunk:hover {
  border-color: var(--color-accent);
  box-shadow: var(--shadow-glow-primary);
  transform: translateY(-4px);
}

.conceptChunk.foundation {
  border-left: 4px solid #FFD700; /* Gold */
}

.conceptChunk.keystone {
  border-left: 4px solid #C0C0C0; /* Silver */
}

.conceptChunk.utility {
  border-left: 4px solid #CD7F32; /* Bronze */
}

.chunkHeader {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.tierBadge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.375rem 0.75rem;
  border-radius: 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.tierBadge.foundation {
  background: rgba(255, 215, 0, 0.15);
  color: #FFD700;
}

.tierBadge.keystone {
  background: rgba(192, 192, 192, 0.15);
  color: #C0C0C0;
}

.tierBadge.utility {
  background: rgba(205, 127, 50, 0.15);
  color: #CD7F32;
}

.chunkTitle {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text-dark);
  flex: 1;
}

.chunkMetadata {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  padding: 1rem;
  background: var(--color-bg-neutral);
  border-radius: 0.5rem;
  margin-bottom: 1rem;
}

.metadataItem {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.metadataLabel {
  font-size: 0.75rem;
  color: var(--color-text-light);
  text-transform: uppercase;
  font-weight: 600;
  letter-spacing: 0.05em;
}

.metadataValue {
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--color-text-dark);
}

.childConcepts {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-left: 1.5rem;
  margin-bottom: 1rem;
  border-left: 2px solid var(--color-border);
}

.childConcept {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  border-radius: 0.375rem;
  transition: background-color 0.15s ease;
}

.childConcept:hover {
  background: var(--overlay-primary-5);
}

.childConceptIcon {
  font-size: 1rem;
}

.childConceptName {
  font-size: 0.95rem;
  color: var(--color-text-dark);
  font-weight: 500;
}

.relatedCount {
  font-size: 0.75rem;
  color: var(--color-text-light);
  margin-left: auto;
  background: var(--color-bg-neutral);
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
}

.chunkActions {
  display: flex;
  gap: 0.75rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}

.expandButton {
  padding: 0.5rem 1rem;
  background: var(--color-surface-subtle);
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  color: var(--color-text-dark);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.expandButton:hover {
  background: var(--color-bg-neutral);
  border-color: var(--color-accent);
}

.startButton {
  flex: 1;
  padding: 0.625rem 1rem;
  background: var(--gradient-accent);
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: var(--shadow-glow-primary);
}

.startButton:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-glow-primary-hover);
}
```

---

#### 4. DEPENDENCY GRAPH VISUALIZATION

**Visual Design (Replacing Raw Text):**

```
┌─────────────────────────────────────────────────────────┐
│ Concept Dependency Map - Power BI (67 concepts)         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│           🟡 Power BI Desktop                           │
│           (9 dependents - Foundation)                  │
│           ┌─────────────────────┐                       │
│           │                     │                       │
│        🔵 Data         🔵 Power Query        🔵 Data   │
│        Sources        Editor              Transform    │
│        (3)            (4)                 (2)          │
│                                                         │
│ Key:                                                    │
│ 🟡 Foundation (4+ dependents) - 7 concepts             │
│ 🔵 Keystone (2-3 dependents) - 18 concepts             │
│ ⚪ Utility (0-1 dependents) - 42 concepts              │
│                                                         │
│ [📊 View as Graph] [📋 View as List]                   │
└─────────────────────────────────────────────────────────┘
```

**SVG/Canvas Implementation:**

```css
.dependencyGraph {
  width: 100%;
  height: 500px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 1rem;
  padding: 1rem;
  position: relative;
  overflow: hidden;
}

.graphContainer {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.conceptNode {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
  filter: drop-shadow(var(--shadow-md));
  user-select: none;
}

.conceptNode.foundation {
  width: 80px;
  height: 80px;
  background: radial-gradient(circle, #FFD700 0%, #FFA500 100%);
}

.conceptNode.keystone {
  width: 60px;
  height: 60px;
  background: radial-gradient(circle, #C0C0C0 0%, #A9A9A9 100%);
}

.conceptNode.utility {
  width: 40px;
  height: 40px;
  background: radial-gradient(circle, #CD7F32 0%, #B8860B 100%);
}

.conceptNode:hover {
  filter: drop-shadow(var(--shadow-lg));
  transform: scale(1.1);
}

.conceptNode.selected {
  outline: 3px solid var(--color-accent);
}

.conceptNodeLabel {
  position: absolute;
  color: white;
  font-weight: 600;
  font-size: 0.75rem;
  text-align: center;
  max-width: 90%;
  line-height: 1.2;
  pointer-events: none;
}

.graphEdge {
  stroke: var(--color-border-emphasis);
  stroke-width: 2;
  fill: none;
  stroke-dasharray: 4 4;
  opacity: 0.5;
  pointer-events: none;
}

.graphEdge.highlighted {
  stroke: var(--color-accent);
  stroke-width: 2.5;
  stroke-dasharray: none;
  opacity: 1;
}

.graphLegend {
  position: absolute;
  bottom: 1rem;
  left: 1rem;
  background: var(--color-surface-elevated);
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
  font-size: 0.8rem;
  display: flex;
  gap: 1.5rem;
}

.legendItem {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.legendColor {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}
```

---

#### 5. SESSION START MODAL

**Full Design:**

```
┌──────────────────────────────────────────────────────────────┐
│ ✕                   🎯 Start Study Session            [Details]│
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  How much time do you have?                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │   15     │ │    30    │ │    45    │ │ CUSTOM   │        │
│  │   min    │ │   min    │ │   min    │ │  [90]min │        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│                                                              │
│  What's your goal?                                           │
│  ◯ 🆕 Learn New Concepts                                     │
│    "Deep dive into next phase. 35-40 min recommended"       │
│                                                              │
│  ◯ 🔄 Review Completed Concepts                              │
│    "Spaced repetition. Strengthen memory. 20-30 min"        │
│                                                              │
│  ◯ ⚡ Sprint Practice                                        │
│    "Speed & automaticity tests. 15-20 min optimal"          │
│                                                              │
│  ◯ 🗺️ Explore Freely                                        │
│    "No structure. Follow your curiosity"                    │
│                                                              │
│  📌 Recommended for you:                                     │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ "Complete the PREPARE phase for Data Sources"           │ │
│  │  ⏱ 12 minutes  •  📊 3 concepts  •  ↗️ Advance to Model  │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                      [Cancel]  [Start Session →]│
└──────────────────────────────────────────────────────────────┘
```

**Modal Styling:**

```css
.modalOverlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal {
  background: var(--color-surface);
  border-radius: 1.25rem;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(40px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modalHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2rem;
  border-bottom: 1px solid var(--color-border);
}

.modalTitle {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text-dark);
}

.modalTitleIcon {
  font-size: 1.75rem;
}

.closeButton {
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-neutral);
  border: none;
  border-radius: 0.5rem;
  color: var(--color-text-light);
  cursor: pointer;
  transition: all 0.15s ease;
}

.closeButton:hover {
  background: var(--color-border);
  color: var(--color-text-dark);
}

.modalContent {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.formSection {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.sectionLabel {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-dark);
}

.timeButtons {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.75rem;
}

.timeButton {
  padding: 1rem;
  background: var(--color-bg-neutral);
  border: 2px solid var(--color-border);
  border-radius: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
  font-weight: 600;
  color: var(--color-text-dark);
}

.timeButton:hover {
  border-color: var(--color-accent);
  background: var(--overlay-primary-5);
}

.timeButton.selected {
  background: var(--gradient-accent);
  color: white;
  border-color: var(--color-accent);
  box-shadow: var(--shadow-glow-primary);
}

.customTimeInput {
  padding: 0.75rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  font-size: 1rem;
  color: var(--color-text-dark);
}

.goalOptions {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.goalOption {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem;
  background: var(--color-bg-neutral);
  border: 2px solid var(--color-border);
  border-radius: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.goalOption:hover {
  border-color: var(--color-accent);
  background: var(--overlay-primary-5);
}

.goalOption.selected {
  background: var(--overlay-primary-10);
  border-color: var(--color-accent);
  box-shadow: var(--shadow-glow-primary);
}

.goalRadio {
  width: 20px;
  height: 20px;
  border: 2px solid var(--color-border-emphasis);
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 2px;
  transition: all 0.15s ease;
}

.goalOption.selected .goalRadio {
  border-color: var(--color-accent);
  background: var(--color-accent);
  box-shadow: inset 0 0 0 4px white;
}

.goalContent {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
}

.goalTitle {
  font-weight: 600;
  color: var(--color-text-dark);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
}

.goalIcon {
  font-size: 1.25rem;
}

.goalDescription {
  font-size: 0.875rem;
  color: var(--color-text-light);
  line-height: 1.5;
}

.recommendedSection {
  background: linear-gradient(135deg, 
    var(--overlay-primary-5) 0%, 
    var(--overlay-accent-5) 100%);
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
  padding: 1rem;
}

.recommendedLabel {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-dark);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.recommendedCard {
  background: var(--color-surface);
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  border-left: 3px solid var(--color-accent);
}

.recommendedTitle {
  font-weight: 600;
  color: var(--color-text-dark);
  margin-bottom: 0.5rem;
  font-size: 0.95rem;
}

.recommendedMeta {
  display: flex;
  gap: 1rem;
  font-size: 0.8rem;
  color: var(--color-text-light);
  font-weight: 500;
}

.metaItem {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.modalFooter {
  display: flex;
  gap: 1rem;
  padding: 1.5rem 2rem;
  border-top: 1px solid var(--color-border);
  justify-content: flex-end;
}

.modalButton {
  padding: 0.75rem 2rem;
  border: none;
  border-radius: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 1rem;
}

.modalButton.cancel {
  background: var(--color-bg-neutral);
  color: var(--color-text-dark);
  border: 1px solid var(--color-border);
}

.modalButton.cancel:hover {
  background: var(--color-border);
}

.modalButton.primary {
  background: var(--gradient-accent);
  color: white;
  box-shadow: var(--shadow-glow-primary);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.modalButton.primary:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-glow-primary-hover);
}

.modalButton.primary:active {
  transform: translateY(0);
}
```

---

#### 6. RESPONSIVE BREAKPOINTS

```css
/* Mobile First Approach */

/* Mobile (< 768px) */
@media (max-width: 767px) {
  .mainLayout {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
  }
  
  .sidebar {
    border-right: none;
    border-bottom: 1px solid var(--color-border);
    max-height: 200px;
    overflow-x: auto;
    display: flex;
    flex-direction: row;
    gap: 1rem;
    padding: 1rem;
  }
  
  .contentPanel {
    overflow-y: auto;
  }
  
  .lifecycleNavigator {
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
  }
  
  .metricsGrid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .timeButtons {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Tablet (768px - 1024px) */
@media (min-width: 768px) and (max-width: 1024px) {
  .mainLayout {
    grid-template-columns: minmax(280px, 35%) 1fr;
  }
  
  .metricsGrid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .lifecycleNavigator {
    gap: 1.5rem;
  }
}

/* Desktop (> 1024px) */
@media (min-width: 1025px) {
  .mainLayout {
    grid-template-columns: minmax(320px, 400px) 1fr;
  }
  
  .metricsGrid {
    grid-template-columns: repeat(4, 1fr);
  }
  
  .lifecycleNavigator {
    gap: 2rem;
  }
}

/* Ultra-wide (> 1600px) */
@media (min-width: 1600px) {
  .contentPanel {
    max-width: 1200px;
    margin: 0 auto;
  }
}
```

---

#### 7. ANIMATION & TRANSITION SPECIFICATIONS

```css
/* Standard Timing Functions */
--ease-out-quad: cubic-bezier(0.25, 0.46, 0.45, 0.94);
--ease-out-cubic: cubic-bezier(0.215, 0.61, 0.355, 1);
--ease-out-quart: cubic-bezier(0.165, 0.84, 0.44, 1);

/* Interaction Transitions */
.interactive {
  transition: all 0.2s ease-out-quad;
}

/* For color-only changes (buttons, backgrounds) */
.colorTransition {
  transition: background-color 0.15s ease-out-quad;
}

/* For motion (cards sliding in, etc.) */
.motionTransition {
  transition: transform 0.3s ease-out-cubic, opacity 0.3s ease-out-cubic;
}

/* Entrance Animations */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-24px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.fadeInUp {
  animation: fadeInUp 0.4s ease-out-cubic 0.1s both;
}

.slideInLeft {
  animation: slideInLeft 0.4s ease-out-cubic 0.1s both;
}

.scaleIn {
  animation: scaleIn 0.3s ease-out-quad;
}

/* Micro-interactions */
.buttonPressDown {
  transform: translateY(2px);
}

.cardHover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.iconSpinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Loading states */
.pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Notification toasts */
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(24px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.toast {
  animation: slideUp 0.3s ease-out-cubic, slideUp 0.3s ease-out-cubic 2.7s reverse forwards;
}
```

---

#### 8. ACCESSIBILITY (A11y) SPECIFICATIONS

```css
/* Focus States (Keyboard Navigation) */
button:focus-visible,
a:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
  border-radius: 0.25rem;
}

/* High Contrast Mode Support */
@media (prefers-contrast: more) {
  :root {
    --color-border: #333333;
    --color-text-dark: #000000;
    --color-accent: #0000FF;
  }
}

/* Reduced Motion Support */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* Dark Mode Respects System Preference */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    /* ... dark mode colors ... */
  }
}

/* Minimum Touch Target Size (48x48px) */
button,
a,
input[type="checkbox"],
input[type="radio"] {
  min-width: 48px;
  min-height: 48px;
}

/* ARIA Labels for Screen Readers */
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

/* Color Contrast Ratios (WCAG AA) */
/* Text on primary background: 4.5:1+ */
/* Text on secondary: 4.5:1+ */
/* Graphical elements: 3:1+ */

/* Semantic HTML Structure */
/* Use <button> for actions, <a> for navigation */
/* Use <form> with <label> for inputs */
/* Use <h1-h6> hierarchy correctly */
```

---

### Button State Matrix

| Component | State | Background | Text | Border | Icon | Cursor | Box-Shadow |
|-----------|-------|------------|------|--------|------|--------|-----------|
| **Primary Action** | Default | `#6B46C1` | White | None | White | pointer | `shadow-glow-primary` |
| | Hover | `#553c9a` | White | None | White | pointer | `shadow-glow-primary-hover` + `translateY(-2px)` |
| | Active | `#4a3676` | White | None | White | pointer | `shadow-md` + `translateY(0)` |
| | Disabled | `#D1D5DB` | `#9CA3AF` | None | `#9CA3AF` | not-allowed | None; `opacity: 0.5` |
| | Loading | `#553c9a` (dimmed) | White | None | Spinner | wait | Same as hover |
| **Secondary Action** | Default | `#F8FAFC` | `#1F2937` | `#E2E8F0` | `#4B5563` | pointer | `shadow-sm` |
| | Hover | `#F1F5F9` | `#1F2937` | `#CBD5E1` | `#1F2937` | pointer | `shadow-md` |
| | Active | `#E2E8F0` | `#1F2937` | `#CBD5E1` | `#1F2937` | pointer | `shadow-sm` |
| | Disabled | `#F8FAFC` | `#D1D5DB` | `#E2E8F0` | `#D1D5DB` | not-allowed | None; `opacity: 0.5` |
| **Success Button** | Default | `#22C55E` | White | None | White | pointer | `0 4px 15px rgba(34,197,94,0.3)` |
| | Hover | `#16A34A` | White | None | White | pointer | `0 6px 20px rgba(34,197,94,0.4)` + `translateY(-2px)` |
| **Danger Button** | Default | `#DC2626` | White | None | White | pointer | `0 4px 15px rgba(220,38,38,0.3)` |
| | Hover | `#B91C1C` | White | None | White | pointer | `0 6px 20px rgba(220,38,38,0.4)` + `translateY(-2px)` |

---

### Form Input Specifications

```css
.inputField {
  padding: 0.75rem 1rem;
  font-size: 1rem;
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  background: var(--color-surface);
  color: var(--color-text-dark);
  font-family: var(--font-body);
  transition: all 0.15s ease;
}

.inputField:focus {
  border-color: var(--color-accent);
  outline: none;
  box-shadow: 0 0 0 3px var(--overlay-primary-10);
}

.inputField:disabled {
  background: var(--color-bg-neutral);
  color: var(--color-text-muted);
  cursor: not-allowed;
}

.inputField.error {
  border-color: var(--color-error);
  background: var(--color-error-bg);
}

.inputField.error:focus {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

.inputLabel {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: var(--color-text-dark);
  font-size: 0.95rem;
}

.inputHint {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.875rem;
  color: var(--color-text-light);
}

.inputError {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: var(--color-error-text);
}
```

---

*This detailed UI specification ensures consistent, accessible implementation across all components. Designers and developers should reference these specifications when building components or modifying existing ones.*

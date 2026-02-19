# Learning Flow Architecture - Critical Fix Plan

## 🚨 CRITICAL PROBLEMS IDENTIFIED

### Problem 1: Non-Cohesive Phase Skipping
**Current Broken Behavior:**
```typescript
// High Focus (energized): SCOUT → PREVIEW → BUILD → DIAGNOSE → LEARN → MASTER
// Steady (neutral):      SCOUT → PREVIEW → BUILD → DIAGNOSE → LEARN → MASTER  
// Low Energy (tired):    OVERVIEW_MAP → COMPLETE ❌
```

**Issue:** Low energy users skip ALL learning phases. When they switch to "pumped" later, the system sees `completedConcepts.length === 0` and forces them through SCOUT/PREVIEW again, losing their overview progress.

### Problem 2: Progress Not Preserved Across Mood Changes
**Scenario:**
1. User starts tired → sees OVERVIEW_MAP → marks `overviewViewed = true`
2. User comes back energized → system checks `completedConcepts.length === 0`
3. System forces SCOUT → PREVIEW → BUILD (ignoring that they already saw the overview)
4. User feels like they're starting over

### Problem 3: Neuroscience-Based Task Mismatch
**Current Logic:**
- Low energy = skip everything, just show passive overview
- High energy = do everything from scratch

**Neuroscience Reality:**
- Low energy CAN do passive priming (overview, reading)
- High energy SHOULD build on prior passive exposure
- Medium energy SHOULD have a middle path, not identical to high

### Problem 4: Feature Organization Chaos
**Current Structure:**
- SCOUT and PREVIEW are only for `goal === 'learn-new'`
- OVERVIEW_MAP is only for `goal === 'review'` with no progress
- BUILD is for everyone (but skipped by low energy)
- No clear progression or accumulation

---

## 🎯 SOLUTION: Unified Progressive Learning Architecture

### Core Principle: **Accumulative Mastery Across All Moods**

Every phase should:
1. **Build on previous phases** (regardless of mood)
2. **Adapt complexity** to current energy level
3. **Preserve progress** across mood changes
4. **Follow neuroscience** (passive → active → mastery)

---

## 📋 NEW ARCHITECTURE

### Phase Progression (Universal for All Moods)

```
PHASE 0: PRIME (Intent Setting)
  ↓
PHASE 1: ORIENT (Passive Exposure) ← ALL MOODS START HERE
  ↓
PHASE 2: STRUCTURE (Schema Building)
  ↓
PHASE 3: ENCODE (Active Learning)
  ↓
PHASE 4: VERIFY (Mastery Check)
  ↓
PHASE 5: COMPLETE
```

### Mood-Based Adaptation (Same Phases, Different Depth)

| Phase | Low Energy (Tired) | Medium Energy (Steady) | High Energy (Pumped) |
|-------|-------------------|----------------------|---------------------|
| **ORIENT** | Passive overview map (read-only) | Interactive preview with guessing | Full scout + preview with predictions |
| **STRUCTURE** | Skip (use auto-generated map) | Guided map building (hints) | Full concept map building |
| **ENCODE** | Spaced review only (if prior progress) | Standard micro-learning loop | Micro-learning + diagnostic |
| **VERIFY** | Skip (mark as "reviewed") | Light quiz (3-5 questions) | Full mastery challenge |
| **COMPLETE** | Session summary | Session summary + next steps | Session summary + advanced options |

---

## 🔧 IMPLEMENTATION PLAN

### Step 1: Refactor Phase Definitions

**File:** `src/shared/hooks/useLearningFlow.ts`

**New Phase Types:**
```typescript
export type LearningPhase =
  | 'IDLE'           // No session
  | 'PRIME'          // Intent setting (all moods)
  | 'ORIENT'         // Passive exposure (all moods, adapted)
  | 'STRUCTURE'      // Schema building (all moods, adapted)
  | 'ENCODE'         // Active learning (all moods, adapted)
  | 'VERIFY'         // Mastery check (all moods, adapted)
  | 'COMPLETE';      // Session end
```

**Remove:** SCOUT, PREVIEW, OVERVIEW_MAP, BUILD, DIAGNOSE, LEARN, MASTER, REMEDIATE
**Why:** These are implementation details, not cognitive phases

### Step 2: Create Phase Adapters

**New File:** `src/shared/hooks/usePhaseAdapter.ts`

```typescript
interface PhaseAdapter {
  phase: LearningPhase;
  component: React.ComponentType;
  skipCondition?: (session: StudySession) => boolean;
  completionFlag: keyof StudySession;
}

function getPhaseAdapter(
  phase: LearningPhase, 
  mood: LearnerMood
): PhaseAdapter {
  switch (phase) {
    case 'ORIENT':
      if (mood === 'tired') {
        return {
          phase: 'ORIENT',
          component: PassiveOverviewMap,
          completionFlag: 'orientCompleted'
        };
      } else if (mood === 'okay') {
        return {
          phase: 'ORIENT',
          component: InteractivePreview,
          completionFlag: 'orientCompleted'
        };
      } else {
        return {
          phase: 'ORIENT',
          component: FullScoutPreview,
          completionFlag: 'orientCompleted'
        };
      }
    // ... other phases
  }
}
```

### Step 3: Unified Progress Tracking

**File:** `src/shared/types/learning.ts`

**Add to StudySession:**
```typescript
export interface StudySession {
  // ... existing fields
  
  // NEW: Universal phase completion flags
  phaseProgress: {
    orientCompleted: boolean;      // Replaces: scouted, previewed, overviewViewed
    structureCompleted: boolean;   // Replaces: mapBuilt
    encodeStarted: boolean;        // New: tracks if learning began
    verifyCompleted: boolean;      // Replaces: mastered
  };
  
  // NEW: Mood-specific adaptations used
  adaptations: {
    orientMode: 'passive' | 'interactive' | 'full';
    structureMode: 'skip' | 'guided' | 'full';
    encodeMode: 'review' | 'standard' | 'diagnostic';
    verifyMode: 'skip' | 'light' | 'full';
  };
  
  // DEPRECATED (keep for migration):
  scouted?: boolean;
  previewed?: boolean;
  overviewViewed?: boolean;
  mapBuilt?: boolean;
  mastered?: boolean;
}
```

### Step 4: Fix Phase Progression Logic

**File:** `src/shared/hooks/useLearningFlow.ts`

**New Logic:**
```typescript
const currentPhase = useMemo((): LearningPhase => {
  if (!currentSession) return 'IDLE';
  if (!studySession?.isActive) return 'PRIME';
  if (!studySession.primer) return 'PRIME';

  const { phaseProgress } = studySession;

  // PHASE 1: ORIENT (all moods, always first)
  if (!phaseProgress.orientCompleted) {
    return 'ORIENT';
  }

  // PHASE 2: STRUCTURE (adapt based on mood)
  if (!phaseProgress.structureCompleted) {
    // Low energy: auto-complete (skip interactive building)
    if (studySession.mood === 'tired') {
      markPhaseComplete('structureCompleted');
      // Fall through to next phase
    } else {
      return 'STRUCTURE';
    }
  }

  // PHASE 3: ENCODE (only if there are concepts to learn)
  if (activeConcept) {
    return 'ENCODE';
  }

  // PHASE 4: VERIFY (adapt based on mood)
  if (!phaseProgress.verifyCompleted) {
    // Low energy: auto-complete (skip mastery challenge)
    if (studySession.mood === 'tired') {
      markPhaseComplete('verifyCompleted');
      return 'COMPLETE';
    } else {
      return 'VERIFY';
    }
  }

  return 'COMPLETE';
}, [currentSession, studySession, activeConcept]);
```

### Step 5: Component Mapping

**File:** `src/pages/VelocityLearning.tsx`

**New Render Logic:**
```typescript
function renderPhaseContent() {
  const adapter = getPhaseAdapter(currentPhase, studySession?.mood || 'okay');
  
  switch (currentPhase) {
    case 'ORIENT':
      if (studySession?.mood === 'tired') {
        return <PassiveOverviewMap concepts={concepts} onComplete={completeOrient} />;
      } else if (studySession?.mood === 'okay') {
        return <InteractivePreview concepts={concepts} onComplete={completeOrient} />;
      } else {
        return <FullScoutPreview concepts={concepts} onComplete={completeOrient} />;
      }
    
    case 'STRUCTURE':
      if (studySession?.mood === 'okay') {
        return <GuidedMapBuilder concepts={concepts} onComplete={completeStructure} />;
      } else {
        return <ConceptMapBuilder concepts={concepts} onComplete={completeStructure} />;
      }
    
    case 'ENCODE':
      return <MicroLearningLoop concept={activeConcept} onComplete={handleConceptComplete} />;
    
    case 'VERIFY':
      if (studySession?.mood === 'okay') {
        return <LightQuiz concepts={completedConcepts} onComplete={completeVerify} />;
      } else {
        return <MasteryChallenge concepts={completedConcepts} onComplete={completeVerify} />;
      }
    
    default:
      return <SessionComplete />;
  }
}
```

---

## 🎯 BENEFITS OF NEW ARCHITECTURE

### 1. Progress Preservation
```
Session 1 (Tired):
  ORIENT (passive) ✓ → STRUCTURE (skipped) ✓ → ENCODE (0 concepts) → COMPLETE

Session 2 (Pumped):
  ORIENT (already done, skip) → STRUCTURE (already done, skip) → ENCODE (start learning) → VERIFY → COMPLETE
```

### 2. Neuroscience Alignment
- **Passive → Active:** All users start with passive exposure (ORIENT)
- **Schema First:** Structure phase builds mental models before encoding
- **Spaced Repetition:** Low energy users can do review in ENCODE phase
- **Mastery Gradient:** Verification adapts to energy level

### 3. Cohesive Experience
- Same phases for everyone
- Depth adapts to mood
- Progress accumulates
- No "starting over" feeling

### 4. Clear Feature Organization
```
ORIENT Phase:
  - PassiveOverviewMap (low energy)
  - InteractivePreview (medium energy)
  - FullScoutPreview (high energy)

STRUCTURE Phase:
  - Auto-generated (low energy)
  - GuidedMapBuilder (medium energy)
  - ConceptMapBuilder (high energy)

ENCODE Phase:
  - SpacedReview (low energy, if prior progress)
  - MicroLearningLoop (medium/high energy)
  - + Diagnostic (high energy only)

VERIFY Phase:
  - Skip (low energy)
  - LightQuiz (medium energy)
  - MasteryChallenge (high energy)
```

---

## 📝 MIGRATION PLAN

### Phase 1: Add New Fields (Non-Breaking)
1. Add `phaseProgress` and `adaptations` to `StudySession` type
2. Keep old fields (`scouted`, `previewed`, etc.) for backward compatibility
3. Write migration function to convert old → new format

### Phase 2: Update useLearningFlow
1. Refactor phase detection logic
2. Add phase adapter system
3. Test with all three moods

### Phase 3: Update Components
1. Rename components to match new phases
2. Add mood-based variants
3. Update completion handlers

### Phase 4: Update VelocityLearning
1. Refactor renderPhaseContent
2. Add phase adapter integration
3. Test phase transitions

### Phase 5: Deprecate Old Fields
1. Remove old phase types
2. Remove old completion flags
3. Clean up migration code

---

## 🧪 TEST SCENARIOS

### Scenario 1: Tired → Pumped Transition
```
Day 1 (Tired):
  PRIME → ORIENT (passive overview) → COMPLETE
  Progress: { orientCompleted: true, adaptations: { orientMode: 'passive' } }

Day 2 (Pumped):
  PRIME → ORIENT (skip, already done) → STRUCTURE (full map building) → ENCODE → VERIFY → COMPLETE
  Progress: { orientCompleted: true, structureCompleted: true, ... }
```

### Scenario 2: Pumped → Tired Transition
```
Day 1 (Pumped):
  PRIME → ORIENT (full scout) → STRUCTURE (map building) → ENCODE (5 concepts) → COMPLETE
  Progress: { orientCompleted: true, structureCompleted: true, completedConcepts: 5 }

Day 2 (Tired):
  PRIME → ORIENT (skip) → STRUCTURE (skip) → ENCODE (spaced review of 5 concepts) → COMPLETE
  Progress: { completedConcepts: 5, reviewed: 5 }
```

### Scenario 3: Steady Throughout
```
Day 1 (Steady):
  PRIME → ORIENT (interactive preview) → STRUCTURE (guided map) → ENCODE (3 concepts) → COMPLETE

Day 2 (Steady):
  PRIME → ORIENT (skip) → STRUCTURE (skip) → ENCODE (continue from concept 4) → VERIFY (light quiz) → COMPLETE
```

---

## 📊 SUCCESS METRICS

1. **Progress Preservation:** 100% of users retain progress across mood changes
2. **Phase Completion:** All users complete ORIENT phase (regardless of mood)
3. **Cohesion Score:** User survey on "feeling like starting over" (target: <10%)
4. **Adaptation Effectiveness:** Completion rates similar across all moods
5. **Neuroscience Alignment:** Passive exposure before active learning (100% compliance)

---

## 🚀 NEXT STEPS

1. **Review this plan** - Confirm architectural direction
2. **Create spec** - Formal requirements document
3. **Implement Phase 1** - Add new fields (non-breaking)
4. **Test migration** - Ensure old sessions still work
5. **Implement Phase 2-5** - Refactor flow logic
6. **User testing** - Validate with all three mood scenarios

---

## 💡 KEY INSIGHT

**The problem isn't that low energy users need different features - it's that they need the SAME features at DIFFERENT DEPTHS.**

Current broken approach: "Tired? Skip everything!"
New correct approach: "Tired? Here's the passive version of each phase."

This preserves the learning science while respecting cognitive bandwidth.

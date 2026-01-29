# Mastery Accumulation System

## Core Principle
**All progress counts toward your mastery journey, regardless of mood or session goal.**

Users can switch between different learning modes (tired → energized, stressed → focused) and their completed concepts will accumulate toward overall mastery.

## Key Changes

### 1. Flexible Flow Routing
The learning flow now adapts based on existing progress, not just the current session goal.

**Before:**
- `explore` goal → Skip everything, show browse view only
- `review` goal → Skip learning, show map only
- `learn-new` goal → Full flow only

**After:**
- All goals check if user has started learning
- If progress exists, continue the full flow
- Fresh sessions follow goal-specific shortcuts
- **Mastery accumulates across all session types**

### 2. Mid-Session Goal Changes
Users can now change their session goal/mood without losing progress:

```typescript
// New store methods
setSessionGoal(goal: StudyGoal)  // Change goal mid-session
setMood(mood: Mood)              // Update mood/energy level
```

**Example User Journey:**
1. Start session feeling tired → Choose `review` goal
2. Complete concept map (BUILD phase)
3. Feel more energized → Can switch to `learn-new` or `velocity`
4. Continue learning concepts (LEARN phase)
5. All concepts count toward mastery!

### 3. Progress Persistence
Completed concepts are tracked in `currentSession.progress.completedConcepts[]`:
- Persists across sessions
- Survives page refreshes (stored in IndexedDB)
- Syncs to cloud (S3 + DynamoDB)
- Counts toward mastery regardless of which goal was active

## Flow Logic

### Fresh Session (No Progress)
```typescript
if (studySession.goal === 'explore') {
    // No progress yet → Show calm browse view
    return 'COMPLETE';
}

if (studySession.goal === 'review') {
    // No progress yet → Light map review only
    if (!studySession.mapBuilt) return 'BUILD';
    return 'COMPLETE';
}

if (studySession.goal === 'learn-new' || studySession.goal === 'velocity') {
    // Full flow with all phases
    return 'PRIME' → 'BUILD' → 'DIAGNOSE' → 'LEARN' → 'MASTER' → 'COMPLETE';
}
```

### Continuing Session (Has Progress)
```typescript
const hasStartedLearning = currentSession.progress.completedConcepts.length > 0;

if (hasStartedLearning) {
    // User has progress → Continue full flow regardless of goal
    // This allows tired → energized transitions
    return standardFlow(); // PRIME → BUILD → DIAGNOSE → LEARN → MASTER → COMPLETE
}
```

## User Scenarios

### Scenario 1: Tired → Energized Transition
```
Session 1 (Tired):
- Goal: review
- Complete: Map building (BUILD)
- Progress: 0 concepts

Session 2 (Energized):
- Goal: velocity
- Continue from: DIAGNOSE phase
- Complete: 5 concepts
- Progress: 5 concepts ✅ (counts toward mastery!)
```

### Scenario 2: Stressed → Focused Transition
```
Session 1 (Stressed):
- Goal: explore
- Action: Browse concepts passively
- Progress: 0 concepts (just browsing)

Session 2 (Focused):
- Goal: learn-new
- Start from: PRIME phase
- Complete: 10 concepts
- Progress: 10 concepts ✅
```

### Scenario 3: Mixed Sessions
```
Day 1 (Energized):
- Goal: velocity
- Complete: 3 concepts
- Progress: 3/10 concepts

Day 2 (Tired):
- Goal: review
- Has progress → Continue learning
- Complete: 2 more concepts
- Progress: 5/10 concepts ✅

Day 3 (Energized):
- Goal: velocity
- Has progress → Continue learning
- Complete: 5 more concepts
- Progress: 10/10 concepts ✅
- Unlock: MASTER phase!
```

## Benefits

### 1. Flexible Learning
- Start tired, finish energized
- No penalty for changing moods
- Progress never lost

### 2. Mastery Accumulation
- Every concept counts
- Cross-session progress tracking
- Clear path to mastery

### 3. Adaptive Experience
- Flow adapts to your state
- Can access "energized" content when ready
- Can take breaks without losing progress

### 4. Motivation
- See cumulative progress
- Feel accomplishment across sessions
- Clear mastery journey

## Technical Implementation

### Store Methods
```typescript
// Change session goal mid-session
setSessionGoal(goal: 'learn-new' | 'velocity' | 'review' | 'explore')

// Update mood/energy level
setMood(mood: 'pumped' | 'good' | 'okay' | 'struggling' | 'tired')

// Track completed concepts
completeConcept(conceptId, score, outcome)
```

### Progress Tracking
```typescript
interface UserProgress {
  completedConcepts: string[];        // Accumulates across sessions
  completedStages: string[];          // Stage completion
  conceptsLearnedToday: number;       // Daily streak
  totalTimeSpentMinutes: number;      // Total learning time
  conceptScores: Record<string, number>; // Mastery scores
  conceptStatuses: Record<string, Status>; // Current status
}
```

### Flow Decision Logic
```typescript
// Check if user has started learning
const hasStartedLearning = currentSession.progress.completedConcepts.length > 0;

if (hasStartedLearning) {
    // Continue full flow regardless of current goal
    // Allows mood/goal transitions without losing progress
    return standardFlow();
} else {
    // Fresh session - follow goal-specific shortcuts
    return goalSpecificFlow();
}
```

## UI Indicators

### Progress Display
- "5 of 10 concepts mastered"
- "Continue your mastery journey"
- "Switch to velocity mode to accelerate"

### Goal Switcher (Future Enhancement)
```
Current: Review Mode (Tired)
Feeling better? → [Switch to Velocity Mode]
```

### Mastery Meter
```
Overall Progress: ████████░░ 80%
Today: 3 concepts
This Week: 12 concepts
Total Mastery: 45 concepts
```

## Summary

✅ **Mastery accumulates** across all session types
✅ **Mood changes** don't reset progress
✅ **Flexible flow** adapts to existing progress
✅ **Goal switching** enabled mid-session
✅ **Progress persists** across sessions and devices

Users can now learn at their own pace, switch between moods/goals, and see their mastery journey progress continuously!

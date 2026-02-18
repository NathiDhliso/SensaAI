# Complete UX Flow Audit - Study Session & ULC Integration

## Current User Flow (From Screenshot)

### Route: `/study/:subjectId`

**Component:** `Study.tsx` → `SessionStartModal.tsx`

**What User Sees:**
1. **"Tend Your Tree"** header (tree narrative active)
2. **"Microsoft Azure Administrator (AZ-104)"** subtitle
3. **Progress bar:** "Seed — 0 of 70 concepts"
4. **"How are you feeling?"** mood selector with 3 options:
   - High Focus (energized) - Deep work, complex challenges
   - Steady (neutral) - Balanced learning pace - **SELECTED** (30 min)
   - Low Energy (tired) - Light review only
5. **"Begin Growth"** button with "30 min" indicator

### Flow Sequence

```
User clicks "View" on saved content
  ↓
/launchpad/:subjectId (ContentLaunchpad)
  ↓
User clicks "Start Session"
  ↓
/study/:subjectId?tab=overview
  ↓
SessionScoutPreview (overview of concepts)
  ↓
User completes scout OR clicks continue
  ↓
SessionStartModal appears (SCREENSHOT HERE)
  ↓
User selects mood (High Focus / Steady / Low Energy)
  ↓
User clicks "Begin Growth"
  ↓
GuidedPrimer (Step 1: The Why - reason/action/reward)
  ↓
Session starts → /study/:subjectId?tab=learn
  ↓
VelocityLearning component (actual learning)
```

---

## Where ULC Should Appear

### ❌ WRONG: SessionStartModal
**Why:** This is the mood selection screen BEFORE the session starts. ULC is not relevant here.

### ❌ WRONG: During VelocityLearning
**Why:** This is active learning mode - user is focused on current concept, not the overall pattern.

### ✅ CORRECT: ContentLaunchpad (Gym Tab)
**Route:** `/launchpad/:subjectId`
**When:** BEFORE starting a session, when user is planning their approach
**Condition:** `bandwidth !== 'low'` (hide for tired/stressed users)

---

## Actual Code Locations

### 1. SessionStartModal.tsx
**Location:** `src/components/learning/session/SessionStartModal.tsx`
**Purpose:** Mood selection + session configuration
**ULC Relevance:** NONE - This is pre-session setup

**Current State:** ✅ No ULC code here (correct)

### 2. ContentLaunchpad.tsx
**Location:** `src/components/learning/launchpad/ContentLaunchpad.tsx`
**Purpose:** Analytics dashboard, readiness check, gym activities
**ULC Relevance:** HIGH - This is where users plan their systematic approach

**Current State:** ✅ ULC matrix implemented
**Current Condition:** `{ulcPattern && ulcPattern.detected && bandwidth !== 'low' && (`
**Issue:** Bandwidth is calculated from `lastSessionMood`, which may not exist on first visit

### 3. Study.tsx
**Location:** `src/pages/Study.tsx`
**Purpose:** Main study page with tabs (overview/learn)
**ULC Relevance:** NONE - User is either scouting or actively learning

**Current State:** ✅ No ULC code here (correct)

---

## Bandwidth Logic Issues

### Problem: Bandwidth Calculation in ContentLaunchpad

```typescript
// ContentLaunchpad.tsx line 108-111
const bandwidth: CognitiveBandwidth = useMemo(() => {
    return lastSessionMood ? moodToBandwidth(lastSessionMood) : 'medium';
}, [lastSessionMood]);
```

**Issue:** `lastSessionMood` is set AFTER user completes SessionStartModal, but ContentLaunchpad is shown BEFORE SessionStartModal.

**Timeline:**
1. User visits `/launchpad/:subjectId` → `lastSessionMood` is null → bandwidth = 'medium' → ULC shown
2. User clicks "Start Session" → `/study/:subjectId`
3. User sees SessionStartModal → selects mood → `setLastSessionMood(selectedMood)`
4. User completes session
5. Next time user visits `/launchpad/:subjectId` → `lastSessionMood` exists → bandwidth calculated correctly

**Result:** ULC is ALWAYS shown on first visit (bandwidth defaults to 'medium'), regardless of user's actual energy level.

---

## Correct ULC Placement

### ContentLaunchpad - Gym Tab

**Section Order:**
1. **Subject Context Stats** (always shown)
   - Concept counts (trunk/branch/leaf)
   - Due reviews
   - Knowledge health

2. **ULC Pattern Matrix** (conditional)
   - ✅ Shown when: `ulcPattern.detected && bandwidth !== 'low'`
   - ❌ Hidden when: `bandwidth === 'low'` (tired/stressed)
   - Purpose: Shows systematic verb × object structure
   - Interaction: Click cells to jump to specific concepts

3. **The Daily Stack** (always shown)
   - Due reviews
   - Spaced repetition queue

4. **The Build Lab** (always shown)
   - Concept Map
   - Peer Review

5. **The Proving Grounds** (always shown)
   - Mastery Challenge
   - Pre-Mortem

---

## Recommendations

### 1. Fix Bandwidth Logic for First-Time Users

**Option A: Ask mood in ContentLaunchpad**
```typescript
// Add mood selector to ContentLaunchpad header
// User selects mood → bandwidth calculated → ULC shown/hidden accordingly
```

**Option B: Default to showing ULC, hide after first session if user is low energy**
```typescript
// Current behavior (acceptable)
// First visit: Show ULC (bandwidth = 'medium')
// Subsequent visits: Respect lastSessionMood
```

**Option C: Detect time of day / user patterns**
```typescript
// Advanced: Use time of day + historical patterns
// Morning → likely high energy → show ULC
// Late night → likely low energy → hide ULC
```

**Recommendation:** Keep Option B (current behavior). It's acceptable to show ULC on first visit since we don't know user's energy level yet.

### 2. Add Visual Indicator for Bandwidth

```typescript
// ContentLaunchpad header
<div className={styles.bandwidthIndicator}>
  {bwConfig.icon}
  <span>{bwConfig.label}</span>
</div>
```

**Purpose:** User understands why ULC is shown/hidden

### 3. Document the Flow Clearly

**Add to ContentLaunchpad.tsx:**
```typescript
/**
 * ULC Pattern Visualization
 * 
 * Shows systematic verb × object learning pattern for procedural subjects.
 * 
 * Visibility Rules:
 * - Always hidden for low energy users (tired/stressed)
 * - Shown for medium/high energy users (neutral/energized)
 * - On first visit, defaults to medium (shown) since we don't know user's energy yet
 * - After first session, respects lastSessionMood from personalization store
 * 
 * Why hide for low energy?
 * - ULC requires active procedural thinking
 * - Low energy users need passive review, not systematic new patterns
 * - Aligns with GYM_UX_PHILOSOPHY.md
 */
```

---

## Testing Checklist

### First-Time User (No lastSessionMood)
- [ ] Visit `/launchpad/:subjectId`
- [ ] Verify bandwidth defaults to 'medium'
- [ ] Verify ULC is shown (if pattern detected)
- [ ] Click "Start Session"
- [ ] Select "Low Energy" in SessionStartModal
- [ ] Complete session
- [ ] Return to `/launchpad/:subjectId`
- [ ] Verify bandwidth is now 'low'
- [ ] Verify ULC is hidden

### Returning User (Has lastSessionMood)
- [ ] lastSessionMood = 'energized' → bandwidth = 'high' → ULC shown
- [ ] lastSessionMood = 'neutral' → bandwidth = 'medium' → ULC shown
- [ ] lastSessionMood = 'tired' → bandwidth = 'low' → ULC hidden
- [ ] lastSessionMood = 'stressed' → bandwidth = 'low' → ULC hidden

### ULC Matrix Interaction
- [ ] Hover over cell → tooltip shows "how" steps
- [ ] Click cell → navigates to concept
- [ ] Empty cell → disabled, shows "—"
- [ ] Stats update based on progress

---

## Files That Need NO Changes

### ✅ SessionStartModal.tsx
- This is mood selection BEFORE session
- ULC is not relevant here
- No changes needed

### ✅ Study.tsx
- This is the active learning page
- ULC is not relevant during active learning
- No changes needed

### ✅ VelocityLearning.tsx
- This is the concept-by-concept learning flow
- ULC is not relevant during focused learning
- No changes needed

---

## Files That Are Correct

### ✅ ContentLaunchpad.tsx
- ULC is correctly placed in Gym tab
- Bandwidth condition is correct: `bandwidth !== 'low'`
- Only issue: bandwidth defaults to 'medium' on first visit (acceptable)

### ✅ ulc-detector.ts
- Detection logic is correct
- Multi-word object extraction is correct
- No changes needed

---

## Summary

**The ULC is in the RIGHT place:** ContentLaunchpad, Gym tab

**The bandwidth logic is MOSTLY correct:** Hides for low energy, shows for medium/high

**The only "issue" is acceptable:** First-time users see ULC because we don't know their energy level yet. After first session, it respects their mood.

**No code changes needed.** The current implementation is correct.

**What was confusing:** The screenshot shows SessionStartModal (mood selection), which is a DIFFERENT screen than ContentLaunchpad (where ULC lives). These are separate steps in the flow.

---

## Visual Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ /launchpad/:subjectId (ContentLaunchpad)                    │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Gym Tab                                                 │  │
│ │                                                         │  │
│ │ 1. Subject Stats (always shown)                        │  │
│ │ 2. ULC Matrix (if bandwidth !== 'low')  ← HERE         │  │
│ │ 3. Daily Stack (always shown)                          │  │
│ │ 4. Build Lab (always shown)                            │  │
│ │ 5. Proving Grounds (always shown)                      │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ [Start Session] button                                       │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ /study/:subjectId?tab=overview                              │
│                                                              │
│ SessionScoutPreview (concept overview)                       │
│                                                              │
│ [Continue] button                                            │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ SessionStartModal (SCREENSHOT)                               │
│                                                              │
│ "How are you feeling?"                                       │
│ - High Focus                                                 │
│ - Steady                                                     │
│ - Low Energy                                                 │
│                                                              │
│ [Begin Growth] button                                        │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ GuidedPrimer (reason/action/reward)                          │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ /study/:subjectId?tab=learn                                  │
│                                                              │
│ VelocityLearning (active learning)                           │
└─────────────────────────────────────────────────────────────┘
```

**ULC appears:** Step 1 (ContentLaunchpad)
**Screenshot shows:** Step 3 (SessionStartModal)
**These are different screens!**

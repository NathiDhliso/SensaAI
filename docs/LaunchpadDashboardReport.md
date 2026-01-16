# Launchpad/Dashboard Analysis Report

**Date:** January 16, 2026  
**Scope:** ContentLaunchpad.tsx, MasteryDashboard.tsx, and supporting components  
**Purpose:** Evaluate whether the pre-learning insights effectively prepare users for the subject and identify gaps

---

## Executive Summary

The ContentLaunchpad serves as the "mission control" before users begin Velocity Learning. It displays content quality metrics, AI health indicators, and verification links. However, **several critical gaps** exist between what's shown and what users actually need to know before learning.

### 🔴 Critical Issues (High Priority)
1. **Mastery Index shows AI baseline, not user progress** — confusing metric identity
2. **"Content Depth Score" is misleadingly named** — actually measures structural completeness
3. **Bucket Readiness shows 0% for all tiers** — mastery not tracked until after learning
4. **No exam/certification context** — missing grounding to real-world objectives
5. **"Verify Credibility" always returns 98%** — hardcoded, no real verification

### 🟡 Moderate Issues (Medium Priority)
6. Missing difficulty/complexity indicator
7. Missing prerequisite knowledge warnings
8. Treemap doesn't communicate learning order
9. Health indicators don't explain impact on learning
10. SourceVerification links are generic Google searches

### 🟢 Working Well
- Self-Healing Repair flow (catches critical gaps)
- Confusion Pairs preview (when available)
- Equation Metadata breakdown (Q_P, Q_M, Q_f, G)
- Tutorial walkthrough for first-time users

---

## Detailed Analysis

### 1. ScoreCard Metrics — Are They Accurate?

#### 1.1 "Mastery Index" Card
**Current Behavior:**
```tsx
value={`${systemPromptMetrics.equationMetadata?.I_baseline
    ? Math.round(systemPromptMetrics.equationMetadata.I_baseline.value * 100)
    : (currentSession ? Math.round((currentSession.progress.completedConcepts.length / Math.max(1, currentSession.concepts.length)) * 100) : 0)}%`}
```

**Problem:** This shows the AI's **I_baseline** score — a measure of content quality, NOT user mastery. Users see "25%" and think they've already learned 25% before starting.

**User Expectation:** "How much do I already know about this topic?"  
**Actual Meaning:** "How well did the AI structure this content?"

**Recommendation:**
| Rename To | Show Instead |
|-----------|--------------|
| "Content Quality" | I_baseline (AI structural score) |
| "Starting Mastery" | 0% (user hasn't begun) |
| "Your Progress" | Only show after learning begins |

---

#### 1.2 "Content Depth Score" Card
**Current Behavior:**
```tsx
value={`${metrics.predictedPassRate}%`}
```

**Problem:** Named "Content Depth Score" but the variable is `predictedPassRate`. Neither name accurately describes what it measures:
- Weighted average of `lifecycleConsistency`, `positiveFraming`, `formatConsistency`, `completeness`
- Penalized if word count < 1000 or concepts < 10

**Actual Meaning:** "How structurally complete is the AI output?"

**User Expectation:** "How deep is this content?" or "Will I pass after studying?"

**Recommendation:**
| Rename To | Clarify |
|-----------|---------|
| "Structural Completeness" | Shows if AI generated all required fields |
| Keep % but add tooltip | "Based on SHAPE sections, mnemonics, and decision trees" |

---

#### 1.3 "Est. Mastery Time" Card
**Current Behavior:**
```tsx
const readingTimeMin = wordCount / 200; // 200 WPM
const conceptLearningTimeMin = totalConcepts * 3; // 3 min per concept
const masteryTimeMinutes = Math.round(readingTimeMin + conceptLearningTimeMin);
```

**Problem:** Formula assumes:
- Everyone reads at 200 WPM
- Every concept takes exactly 3 minutes
- No variation for difficulty, prerequisites, or learning style

**Example:** 5000 words + 20 concepts = 25 + 60 = 85 minutes  
**Reality:** Could be 45 minutes (expert) or 3 hours (novice)

**Recommendation:**
1. Show a **range**: "45-90 mins (typical)"
2. Add **adaptive multiplier** based on subject complexity
3. Include **"First time?" toggle** for padding

---

### 2. Content Coverage Treemap — Does It Communicate Learning Order?

**Current Behavior:**
```tsx
// Groups concepts by tier: Foundation → Keystone → Utility
// Colors: Green (Foundation), Purple (Keystone), Amber (Utility)
```

**Problem:** The treemap shows **what** exists, not **how to navigate** it. Users don't know:
- Which concepts to start with
- Dependencies between concepts
- Recommended sequence

**Missing Features:**
| Feature | Why It Matters |
|---------|---------------|
| Numbered order | "Start here → Then this → Finally this" |
| Dependency arrows | "Can't learn X without Y" |
| Clickable navigation | "Click to jump to concept" |
| Progress overlay | "Concepts I've completed" (post-learning) |

**Recommendation:**
1. Add **stage-based grouping** from `learningPath.stages`
2. Show **numbered badges** on each concept box
3. Add **"Suggested Start"** highlight on Foundation concepts

---

### 3. Bucket Readiness Checklist — Accurate or Misleading?

**Current Behavior:**
```tsx
const foundationMastered = getMasteredCount('foundation');
// Result: Always 0 on first visit (no concepts completed yet)
```

**Problem:** Shows "0% Hollow" for all tiers on first load. This is technically accurate (user hasn't mastered anything) but confusing because:
1. Users haven't started learning yet
2. "Hollow" sounds like content is missing, not that user hasn't progressed

**Recommendation:**
| Before Learning | After Learning |
|-----------------|----------------|
| Show **content counts** only | Show **mastery progress** |
| "Foundation: 8 concepts" | "Foundation: 6/8 mastered (75%)" |
| Remove "Hollow/Solid" labels | Use "Hollow/Solid" for progress |

---

### 4. Content Health Indicators — Do They Explain Impact?

**Current Behavior:**
```tsx
indicators: [
    { label: 'SHAPE Sections', value: '85%', status: 'complete' },
    { label: 'Memory Anchors', value: '60%', status: 'partial' },
    { label: 'Confusion Pairs', value: 3, status: 'complete' },
    { label: 'Decision Trees', value: 'None', status: 'missing' },
]
```

**Problem:** Users see "Memory Anchors: 60%" but don't understand:
- What are Memory Anchors?
- How does 60% affect my learning?
- Should I care?

**Missing Context:**
| Indicator | User Question | Not Answered |
|-----------|---------------|--------------|
| SHAPE Sections | "What's SHAPE?" | No explanation |
| Memory Anchors | "Will I forget things?" | No impact warning |
| Decision Trees | "Do I need these?" | No "why it matters" |

**Recommendation:**
1. Add **expandable tooltips** with impact explanations
2. Show **"Why this matters"** micro-copy
3. Link to tutorial section for each indicator

Example:
```
Memory Anchors: 60%
↳ "Concepts without anchors may be harder to recall under exam pressure"
```

---

### 5. Source Verification — Is It Real Verification?

**Current Behavior:**
```tsx
// Generates Google search URLs:
url: `https://www.google.com/search?q=${encodeURIComponent(term)}+official+documentation`
```

**Problem:** This isn't verification — it's a Google search. The "Live Web Check" badge is misleading.

**Also:**
```tsx
// "Verify Credibility" button
setCredibilityScore(analytics?.metrics.predictedPassRate || 0);
// Always returns predictedPassRate, not actual credibility check
// Then shows hardcoded "98% Exams Match"
```

**Critical Issue:** The "98% Exams Match" badge appears after a 2-second fake delay, regardless of actual content alignment.

**Recommendation:**
1. **Remove "98% Exams Match" or make it real** (integrate with blueprintMapping from Hybrid Grounding)
2. **Rename "Live Web Check" to "Quick Links"** — honest about what it is
3. **Add actual grounding data** from `officialSource` fields in concepts

---

### 6. Equation Metadata Card — Accurate Baselines?

**Current Behavior:**
```tsx
function createDefaultEquationMetadata(tierDist, shapeCov) {
    // Q_P = tier balance * 0.8 + 0.2
    // Q_M = shape coverage * 0.7 + 0.3
    // Q_f = 0.5 (hardcoded default)
    // G = 1.0 (hardcoded default)
    // I_baseline = G × Q_f × Q_M × Q_P
}
```

**Problem:** When AI doesn't provide `equationMetadata`, the fallback uses:
- **Q_f = 0.5** — always the same, regardless of actual fluency potential
- **G = 1.0** — assumes perfect governance, never penalized

**Result:** I_baseline is often ~20-30%, which looks "bad" but is actually expected before learning begins.

**Recommendation:**
1. **Explain the baseline clearly**: "This score represents content potential, not your mastery"
2. **Show expected progression**: "After learning: 75-90% achievable"
3. **Fix Q_f calculation** to consider actual decision tree/binary rule coverage

---

### 7. Missing Insights — What Should Users Know Pre-Learning?

#### 7.1 Missing: Subject Difficulty Indicator
Users don't know if content is:
- Beginner-friendly or Advanced
- High cognitive load or Easy reading
- Suitable for 1-hour or 3-hour session

**Add:**
```tsx
<ScoreCard
    title="Difficulty Level"
    value={getDifficultyLabel(cognitiveLoadScore)} // "Moderate" / "Advanced"
    icon={Brain}
/>
```

---

#### 7.2 Missing: Prerequisite Knowledge Warning
Users might start "Azure AZ-104" content without knowing they need "Azure Fundamentals" first.

**Add:**
```tsx
{prerequisites.length > 0 && (
    <div className={styles.prerequisiteWarning}>
        <AlertTriangle />
        <span>Recommended: Complete {prerequisites.join(', ')} first</span>
    </div>
)}
```

---

#### 7.3 Missing: Exam Objective Alignment (Grounding Integration)
With Hybrid Grounding implemented, the dashboard should show:
- Blueprint match status (OBJECTIVES_LOCKED vs UNGROUNDED_MODE)
- Confidence score (HIGH/MEDIUM/LOW)
- Coverage of exam skills measured

**Add:**
```tsx
{groundingStatus === 'OBJECTIVES_LOCKED' ? (
    <GroundingBadge
        confidence="HIGH"
        examCode="AZ-104"
        coveragePercent={87}
    />
) : (
    <KnowledgeCutoffBanner subject={result.subject} />
)}
```

---

#### 7.4 Missing: Learning Path Preview
Show the 5-Step SENSA Flow overview:
1. **See** — Set your goal (2 min)
2. **Explore** — Predict structure (5 min)
3. **Note** — Build concept map (10 min)
4. **Study** — Deep dive SHAPE (15 min)
5. **Apply** — Synthesize & flow (15 min)

**Why:** Users should know what they're committing to before clicking "Begin Learning"

---

### 8. Flow Alignment — Does Dashboard Match Generated Content?

#### 8.1 Disconnect: Lifecycle Phases Not Shown
The content has lifecycle phases (Prepare → Structure → Deliver), but the dashboard doesn't surface them.

**Add:**
```tsx
{systemPromptMetrics.lifecyclePhases && (
    <LifecyclePhasesPreview
        phases={systemPromptMetrics.lifecyclePhases}
    />
)}
```

---

#### 8.2 Disconnect: Recommendations Are Generic
Current recommendations:
- "Quick read: This module is concise..."
- "Focus on definitions..."
- "Apply your knowledge..."

These are generated from static rules, not from actual content analysis.

**Improve:**
```typescript
if (systemPromptMetrics.mnemonicCoverage.percentage < 50) {
    recommendations.push(
        `Mnemonics are limited (${systemPromptMetrics.mnemonicCoverage.percentage}%). ` +
        `Consider creating your own memory anchors for better retention.`
    );
}
```

---

## Questions You May Have Missed

### Q1: "What happens if a user starts learning but content has critical gaps?"
**Current:** Self-Healing catches this and shows repair UI  
**Gap:** No way to preview repair plan without triggering it

### Q2: "Can users skip the dashboard and go straight to learning?"
**Current:** Yes, via direct URL `/study/{subjectId}?tab=learn`  
**Gap:** No enforcement of dashboard review

### Q3: "How do users know if this content is recent or outdated?"
**Current:** `generatedAt` timestamp exists but isn't prominently shown  
**Gap:** No staleness warning (e.g., "Generated 6 months ago")

### Q4: "What if the AI generated content for the wrong subject?"
**Current:** No validation that content matches expected subject  
**Gap:** No sanity check comparing `result.subject` to expected domain

### Q5: "Can users compare multiple generations of the same subject?"
**Current:** Library shows all saved results  
**Gap:** No diff view or version comparison

### Q6: "How do users know if content aligns with their specific certification version?"
**Current:** No certification version tracking  
**Gap:** AZ-104 updated in 2025 — content might be based on 2023 objectives

---

## Implementation Priority Matrix

| Issue | Impact | Effort | Priority |
|-------|--------|--------|----------|
| Fix "Mastery Index" naming | High | Low | 🔴 P0 |
| Remove fake "98% Exams Match" | High | Low | 🔴 P0 |
| Add grounding status badge | High | Medium | 🔴 P0 |
| Fix Bucket Readiness pre-learning view | Medium | Low | 🟡 P1 |
| Add difficulty indicator | Medium | Low | 🟡 P1 |
| Add prerequisite warnings | Medium | Medium | 🟡 P1 |
| Improve recommendations | Medium | Medium | 🟡 P1 |
| Add learning path preview | Low | Low | 🟢 P2 |
| Add staleness warning | Low | Low | 🟢 P2 |
| Treemap navigation improvements | Low | High | 🟢 P2 |

---

## Recommended Changes Summary

### Immediate Fixes (Before Next Release)
1. Rename "Mastery Index" → "Content Quality Score"
2. Remove or fix "Verify Credibility" button (currently fake)
3. Add `<KnowledgeCutoffBanner>` to show AI provenance
4. Fix Bucket Readiness to show concept counts, not mastery (pre-learning)

### Short-Term Improvements
5. Integrate `blueprintMapping` and `officialSource` from Hybrid Grounding
6. Add difficulty/complexity indicator
7. Add prerequisite knowledge warnings
8. Show staleness warning if content > 90 days old

### Long-Term Enhancements
9. Interactive treemap with navigation
10. Real credibility verification against blueprint
11. Version comparison for regenerated content
12. Adaptive mastery time estimation

---

## Appendix: Component Map

```
ContentLaunchpad.tsx
├── ScoreCard (Mastery Index) ← FIX NAMING
├── ScoreCard (Content Depth) ← FIX NAMING
├── ScoreCard (Est. Time) ← ADD RANGE
├── CoverageTreemap ← ADD NAVIGATION
├── BucketReadinessChecklist ← FIX PRE-LEARNING VIEW
├── EquationMetadataCard ← OK (needs Q_f fix)
├── ContentHealthIndicators ← ADD TOOLTIPS
├── SourceVerification ← RENAME "Quick Links"
├── Insights + VerifyCredibility ← REMOVE FAKE 98%
└── ConfusionPairs ← OK
```

---

*Report generated as part of SensaPBL continuous improvement initiative*

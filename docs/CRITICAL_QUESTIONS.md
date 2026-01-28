# Critical Questions - Need Answers Before Implementation

**Status:** ⚠️ BLOCKING IMPLEMENTATION  
**Priority:** URGENT - Answer before coding  
**Owner:** Product/Architecture Team

---

## 🚨 These Questions Block MVP Development

The following design decisions must be made before implementing the critical fixes. Without these answers, developers will make assumptions that may need to be refactored later.

---

## Question 1: What is the Exact Structure of Storage?

**Why This Matters:** Every component reads/writes to storage. Without a clear schema, we'll have inconsistent data structures and bugs.

**Current State:** Unclear - multiple interfaces exist but aren't fully defined

**Need to Define:**

```typescript
// What does SavedResult actually contain?
interface SavedResult {
  id: string;
  subject: string;
  fullDocument: string;
  pass1Data: Pass1Result;
  
  // ❓ What metadata fields exist?
  metadata: {
    generatedAt: string;
    version: string;
    
    // ❓ Are these the right flags?
    scouted?: boolean;
    previewed?: boolean;
    mapBuilt?: boolean;
    mapReconstructed?: boolean;
    diagnosticComplete?: boolean;
    diagnosticReady?: boolean;
    mastered?: boolean;
    
    // ❓ What else?
    qualityMetrics?: unknown;
    fullDocument?: string; // Duplicate of top-level?
  };
  
  // ❓ Are these stored?
  concepts?: LearningConcept[];
  validation?: ValidationResult;
}

// What does StudySession contain?
interface StudySession {
  id: string;
  subjectId: string;
  goal: StudyGoal;
  targetDuration: number;
  startTime: number;
  
  // ❓ How is progress tracked?
  conceptsCompleted: string[];
  conceptProgress?: Map<string, ConceptProgress>; // Or object?
  
  // ❓ What about current state?
  currentPhase?: LearningPhase;
  activeConcept?: string | null;
  
  // ❓ What about primer data?
  primer?: {
    reason: string;
    action: string;
    reward: string;
  };
}

// What does ConceptProgress contain?
interface ConceptProgress {
  conceptId: string;
  attempts: number;
  lastAttemptScore: number;
  lastAttemptTime: number;
  status: 'not-started' | 'in-progress' | 'needs-review' | 'mastered' | 'skipped';
  timeSpent: number; // milliseconds
  
  // ❓ What else?
  firstAttemptTime?: number;
  masteryAchievedAt?: number;
  skipReason?: string;
}
```

**Decision Needed:**
1. Finalize all interface fields
2. Document which fields are required vs optional
3. Define where each piece of data is stored (localStorage? IndexedDB? Backend?)
4. Define data migration strategy for schema changes

**Impact if Not Answered:**
- Inconsistent data structures across components
- Storage corruption bugs
- Difficult to add features later
- Data loss on updates

---

## Question 2: What is "Fresh Session"? (for DIAGNOSE trigger)

**Why This Matters:** Determines when diagnostic phase is shown to users

**Current Code:**
```typescript
// Condition: IF fresh session AND concepts > 5
// ❓ But what is "fresh session"?
```

**Options:**

### Option A: First Time Ever
- User has never seen this subject before
- Check: `!session.metadata.diagnosticComplete`
- Pro: Simple, clear
- Con: Can't retake diagnostic

### Option B: First Time Today
- User hasn't studied this subject today
- Check: `lastStudyDate !== today`
- Pro: Allows daily assessment
- Con: Annoying for power users

### Option C: Per Generation
- Every new generation triggers diagnostic
- Check: `generationId !== lastDiagnosticGenerationId`
- Pro: Adapts to new content
- Con: Repetitive if regenerating same subject

### Option D: User Choice
- User can opt-in to diagnostic
- Check: User clicks "Take Diagnostic"
- Pro: User control
- Con: Most users will skip

**Recommended:** Option A (First Time Ever) with Option D (User Choice to retake)

**Decision Needed:**
- Which option to implement?
- Can user retake diagnostic?
- What happens if diagnostic is abandoned?

**Impact if Not Answered:**
- Diagnostic may never show (or always show)
- User confusion about when/why diagnostic appears
- Can't implement DIAGNOSE phase logic

---

## Question 3: What is mapReconstructed? (for MASTER trigger)

**Why This Matters:** MASTER phase (final challenge) won't trigger without this

**Current Code:**
```typescript
// VelocityLearning.tsx - MASTER phase condition
case 'MASTER':
  // Triggered when: mapReconstructed AND !mastered
  // ❓ But mapReconstructed is never set!

// learning-store.ts
markSessionMapBuilt(data) {
  // Sets metadata.mapBuilt
  // ❓ Should this also set mapReconstructed?
}
```

**Options:**

### Option A: Same as mapBuilt
- `mapReconstructed` is a typo, should be `mapBuilt`
- Fix: Rename all references to `mapBuilt`
- Pro: Simple fix
- Con: Loses semantic meaning

### Option B: Separate Flag
- `mapBuilt` = user completed BUILD phase
- `mapReconstructed` = user successfully reconstructed map from memory
- Fix: Add reconstruction verification step
- Pro: More rigorous mastery check
- Con: Adds complexity

### Option C: Derived Property
- `mapReconstructed` = computed from concept mastery
- Check: All concepts >= 0.8 score
- Pro: No extra flag needed
- Con: May not reflect actual map understanding

**Recommended:** Option A (rename to mapBuilt) for MVP, Option B for v1.1

**Decision Needed:**
- Which option to implement?
- What's the actual trigger for MASTER phase?
- Is map reconstruction a separate step?

**Impact if Not Answered:**
- MASTER phase never triggers
- Users can't complete final challenge
- No sense of completion/achievement

---

## Question 4: What Determines ActiveConcept?

**Why This Matters:** Core learning loop depends on concept selection logic

**Current Code:**
```typescript
// useLearningFlow.ts
const activeConcept = /* ❓ How is this selected? */

// Options seen in code:
// 1. First non-mastered concept
// 2. Lowest scoring concept
// 3. User choice from graph
// 4. Spaced repetition algorithm
```

**Options:**

### Option A: Sequential (First Non-Mastered)
```typescript
const activeConcept = concepts.find(c => 
  !session.progress.completedConcepts.includes(c.id)
);
```
- Pro: Simple, predictable
- Con: Ignores learning science

### Option B: Lowest Score First
```typescript
const activeConcept = concepts
  .filter(c => c.masteryScore < 0.8)
  .sort((a, b) => a.masteryScore - b.masteryScore)[0];
```
- Pro: Focuses on weaknesses
- Con: May be discouraging

### Option C: Spaced Repetition
```typescript
const activeConcept = concepts
  .filter(c => shouldReview(c, now))
  .sort((a, b) => a.nextReviewDate - b.nextReviewDate)[0];
```
- Pro: Scientifically optimal
- Con: Complex to implement

### Option D: User Choice
```typescript
const activeConcept = userSelectedConcept || defaultSelection;
```
- Pro: User agency
- Con: Users may choose poorly

**Recommended:** Option A (Sequential) for MVP, Option C (Spaced Repetition) for v1.1

**Decision Needed:**
- Which algorithm to use?
- Can user override selection?
- How to handle prerequisites?

**Impact if Not Answered:**
- Inconsistent concept selection
- Suboptimal learning paths
- User confusion about order

---

## Question 5: What's the Backend /generate Contract?

**Why This Matters:** Frontend can't call backend without knowing the API

**Current State:** Partially defined, but missing details

**Need to Define:**

### Request Schema
```typescript
// POST /generation/start
interface StartGenerationRequest {
  subject: string;
  userId: string;
  context?: string;
  fileContent?: string;
  
  // ❓ What else?
  domain?: string;
  systemPrompt?: string;
  options?: {
    skipDiagnostic?: boolean;
    conceptCount?: number;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
  };
}
```

### Response Schema
```typescript
interface StartGenerationResponse {
  jobId: string;
  sessionId: string;
  status: 'queued' | 'processing';
  
  // ❓ What else?
  estimatedTime?: number; // seconds
  queuePosition?: number;
}
```

### Status Schema
```typescript
// GET /generation/:jobId/status
interface GenerationStatus {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number; // 0-100
  
  // ❓ What details?
  currentPhase?: string;
  conceptsGenerated?: number;
  estimatedTimeRemaining?: number;
  
  // ❓ Error handling?
  error?: {
    code: GenerationErrorCode;
    message: string;
    retryable: boolean;
    retryAfter?: number; // seconds
  };
}
```

### Error Codes
```typescript
enum GenerationErrorCode {
  INVALID_INPUT = 'INVALID_INPUT',
  RATE_LIMIT = 'RATE_LIMIT',
  TIMEOUT = 'TIMEOUT',
  AI_SERVICE_ERROR = 'AI_SERVICE_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',
  
  // ❓ What else?
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  CONTENT_POLICY_VIOLATION = 'CONTENT_POLICY_VIOLATION',
}
```

### Streaming Protocol
```typescript
// ❓ How does streaming work?
// Option A: Server-Sent Events (SSE)
// GET /generation/stream/:jobId
// Returns: text/event-stream

// Option B: WebSocket
// WS /generation/stream/:jobId
// Bidirectional communication

// Option C: Polling
// GET /generation/:jobId/status every 2 seconds
// Simple but inefficient
```

**Decision Needed:**
1. Finalize all request/response schemas
2. Define all error codes and meanings
3. Choose streaming protocol
4. Define rate limits and quotas
5. Define authentication requirements

**Impact if Not Answered:**
- Can't implement generation flow
- Error handling will be broken
- No way to show progress to user
- Backend and frontend will be out of sync

---

## 📋 Decision Matrix

| Question | Urgency | Blocks | Recommended Answer | Decision Date | Status |
|----------|---------|--------|-------------------|---------------|--------|
| 1. Storage Schema | 🔴 Critical | All features | Document in STATE_SCHEMA.md | TBD | ⏳ Pending |
| 2. Fresh Session | 🟡 High | DIAGNOSE phase | First time ever + user choice | TBD | ⏳ Pending |
| 3. mapReconstructed | 🟡 High | MASTER phase | Rename to mapBuilt | TBD | ⏳ Pending |
| 4. ActiveConcept | 🟡 High | Learning loop | Sequential for MVP | TBD | ⏳ Pending |
| 5. Backend Contract | 🔴 Critical | Generation flow | Document in API_SPEC.md | TBD | ⏳ Pending |

---

## 🎯 Action Items

### For Product Team:
1. Review each question
2. Make decisions based on MVP scope
3. Document decisions in this file
4. Communicate to dev team

### For Dev Team:
1. Don't implement until decisions made
2. Create placeholder interfaces with `// TODO: Finalize`
3. Flag any new questions discovered
4. Update this document with findings

### For Architecture Team:
1. Review technical implications of each option
2. Recommend best practices
3. Consider future extensibility
4. Document in technical specs

---

## 📝 Decision Log

### Decision 1: [Question Number]
**Date:** TBD  
**Decision:** [Chosen option]  
**Rationale:** [Why this option]  
**Impact:** [What changes]  
**Owner:** [Who decided]

### Decision 2: [Question Number]
**Date:** TBD  
**Decision:** [Chosen option]  
**Rationale:** [Why this option]  
**Impact:** [What changes]  
**Owner:** [Who decided]

---

## 🚀 Next Steps

1. **Schedule Decision Meeting** (2 hours)
   - Attendees: Product, Dev Lead, Architect
   - Agenda: Answer all 5 questions
   - Output: Completed decision log

2. **Document Decisions** (2 hours)
   - Create STATE_SCHEMA.md
   - Create API_SPEC.md
   - Update TypeScript interfaces

3. **Communicate to Team** (1 hour)
   - Share decisions in team meeting
   - Update project documentation
   - Create implementation tickets

4. **Begin Implementation** (30 hours)
   - Start with critical blockers
   - Follow MVP checklist
   - Regular check-ins on progress

---

**Last Updated:** January 28, 2026  
**Next Review:** After decision meeting  
**Status:** ⏳ Awaiting decisions

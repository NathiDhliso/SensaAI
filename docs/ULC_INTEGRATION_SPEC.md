# Universal Life Cycle (ULC) Integration Specification

## Overview
The Universal Life Cycle (ULC) pattern should be surfaced to learners at strategic moments to help them understand the systematic structure of their subject and guide their practice approach.

## Integration Points

### 1. Content Launchpad - ULC Detection & Visualization (PRIORITY 1)

**When:** Immediately after loading content, before entering any learning session

**Where:** ContentLaunchpad.tsx - Add a new section between the header and the gym zones

**What to Show:**
- Automatic detection of ULC pattern in the subject
- Visual matrix showing Verbs × Objects
- Brief explanation: "This subject follows a Universal Life Cycle pattern"
- Emphasis on "how first, why second" approach

**Detection Logic:**
```typescript
interface ULCPattern {
  detected: boolean;
  verbs: string[];        // e.g., ["Create", "Configure", "Monitor"]
  objects: string[];      // e.g., ["Identity", "Storage", "Networking"]
  confidence: number;     // 0-100
}

function detectULC(concepts: ParsedConcept[]): ULCPattern {
  // 1. Extract verbs from concept names (Create X, Configure Y, Monitor Z)
  // 2. Extract objects/resources (the X, Y, Z)
  // 3. Check if verbs repeat across multiple objects
  // 4. Return pattern if confidence > 70%
}
```

**UI Component:**
```tsx
<section className={styles.ulcPattern}>
  <div className={styles.ulcHeader}>
    <Target size={18} />
    <h3>Learning Pattern Detected</h3>
    <span className={styles.ulcBadge}>
      {ulc.verbs.length} verbs × {ulc.objects.length} resources
    </span>
  </div>
  
  <div className={styles.ulcExplanation}>
    <p>This subject follows a <strong>Universal Life Cycle</strong> pattern: 
    you'll apply {ulc.verbs.length} core actions across {ulc.objects.length} resources.</p>
    <p className={styles.ulcTip}>
      💡 <strong>Pro tip:</strong> Master the "how" (procedure) first, 
      then layer on the "why" (context). The how is stable; the why changes.
    </p>
  </div>
  
  <div className={styles.ulcMatrix}>
    <div className={styles.matrixHeader}>
      <div className={styles.matrixCorner}></div>
      {ulc.verbs.map(verb => (
        <div key={verb} className={styles.matrixVerb}>{verb}</div>
      ))}
    </div>
    {ulc.objects.map(obj => (
      <div key={obj} className={styles.matrixRow}>
        <div className={styles.matrixObject}>{obj}</div>
        {ulc.verbs.map(verb => {
          const conceptId = findConceptId(verb, obj);
          const status = getConceptStatus(conceptId);
          return (
            <button
              key={`${verb}-${obj}`}
              className={`${styles.matrixCell} ${styles[`status-${status}`]}`}
              onClick={() => handleReviewConcept(conceptId)}
            >
              {status === 'mastered' ? '✓' : status === 'learning' ? '○' : '·'}
            </button>
          );
        })}
      </div>
    ))}
  </div>
  
  <button 
    className={styles.ulcToggle}
    onClick={() => setUlcExpanded(!ulcExpanded)}
  >
    {ulcExpanded ? 'Hide' : 'Learn More About ULC'}
  </button>
  
  {ulcExpanded && (
    <div className={styles.ulcDetails}>
      <h4>How to Use This Pattern</h4>
      <ol>
        <li><strong>Work systematically:</strong> One object at a time, one verb at a time</li>
        <li><strong>How before why:</strong> Learn the procedure first (stable), then the rationale (context-dependent)</li>
        <li><strong>Track your progress:</strong> Each cell in the matrix is a skill to master</li>
        <li><strong>Cross-object practice:</strong> Real problems combine multiple cells</li>
      </ol>
    </div>
  )}
</section>
```

### 2. AI Coach Guidance - Context-Aware ULC Reminders (PRIORITY 2)

**When:** During learning sessions, when the coach detects:
- Confusion between "how" and "why"
- Jumping between objects without completing verbs
- Struggling with context-dependent reasoning

**Where:** AI Coach persona responses (personas.ts)

**What to Add:**
```typescript
// Add to PHASE_RESPONSES for each persona
export const ULC_GUIDANCE: Record<PersonaId, {
  howBeforeWhy: string;
  systematicProgress: string;
  contextShift: string;
}> = {
  goggins: {
    howBeforeWhy: "Stop overthinking WHY. Master the HOW first. The procedure is your foundation.",
    systematicProgress: "One verb. One object. Complete it before moving on. No shortcuts.",
    contextShift: "The 'why' changes with every scenario. The 'how' stays the same. Build on rock, not sand."
  },
  sage: {
    howBeforeWhy: "Notice how the 'how' is stable, while the 'why' shifts with context. Build your foundation on what doesn't change.",
    systematicProgress: "Move through the matrix gently, one cell at a time. Mastery is systematic, not rushed.",
    contextShift: "The examiner's perspective will vary, but the procedure remains constant. Trust the stable ground."
  },
  // ... other personas
};
```

**Trigger Logic:**
```typescript
// In AI Coach intervention system
function shouldTriggerULCGuidance(
  sessionData: SessionData,
  ulcPattern: ULCPattern | null
): boolean {
  if (!ulcPattern?.detected) return false;
  
  // Trigger if:
  // 1. User has attempted same verb on 3+ objects with declining scores
  // 2. User is confusing "why" across different contexts
  // 3. User is jumping between objects without completing verb cycle
  
  return (
    sessionData.verbCompletionRate < 0.5 ||
    sessionData.contextConfusionCount > 2 ||
    sessionData.objectJumpCount > 3
  );
}
```

### 3. Gym Activity Selection - ULC-Aware Practice (PRIORITY 3)

**When:** In the Gym, when selecting practice activities

**Where:** GymActivityLauncher.tsx

**What to Add:**
- Filter activities by ULC cell (verb × object)
- Show progress through the ULC matrix
- Suggest next cell to practice based on completion

**UI Enhancement:**
```tsx
{ulcPattern?.detected && (
  <div className={styles.ulcPracticeGuide}>
    <h4>Systematic Practice</h4>
    <p>You're working on: <strong>{currentVerb} × {currentObject}</strong></p>
    <div className={styles.ulcProgress}>
      <span>Matrix Progress: {completedCells}/{totalCells} cells mastered</span>
      <div className={styles.progressBar}>
        <div 
          className={styles.progressFill}
          style={{ width: `${(completedCells/totalCells)*100}%` }}
        />
      </div>
    </div>
    <button 
      className={styles.nextCellButton}
      onClick={() => navigateToNextCell()}
    >
      Next: {nextVerb} × {nextObject} →
    </button>
  </div>
)}
```

## Design Principles

1. **Non-Blocking:** ULC guidance is informative, never blocks progression
2. **Contextual:** Only show when relevant (pattern detected, user struggling)
3. **Progressive Disclosure:** Brief by default, expandable for details
4. **Visual:** Matrix representation makes abstract pattern concrete
5. **Actionable:** Always provide next step ("Practice this cell next")

## Success Metrics

- **Pattern Recognition:** % of users who expand ULC details
- **Systematic Progress:** % of users who complete verbs before switching objects
- **Retention:** Score improvement on "how" vs "why" questions
- **Completion:** % of ULC matrix cells mastered

## Implementation Priority

1. **Phase 1 (MVP):** Launchpad detection + matrix visualization
2. **Phase 2:** AI Coach ULC-aware guidance
3. **Phase 3:** Gym activity filtering by ULC cell

## Files to Modify

### Phase 1 (Launchpad)
- `src/components/learning/launchpad/ContentLaunchpad.tsx` - Add ULC detection and matrix
- `src/components/learning/launchpad/ContentLaunchpad.module.css` - Matrix styling
- `src/features/content-generation/parsers/ulc-detector.ts` - NEW: Detection logic

### Phase 2 (Coach)
- `src/features/ai-coach/personas.ts` - Add ULC guidance responses
- `src/shared/hooks/useCoachMessage.ts` - Add ULC trigger logic

### Phase 3 (Gym)
- `src/components/learning/gym/GymActivityLauncher.tsx` - Add ULC filtering
- `src/store/slices/createStudySlice.ts` - Track ULC progress

## Example: Azure AZ-104

**Detected Pattern:**
```typescript
{
  detected: true,
  verbs: ["Create", "Configure", "Monitor"],
  objects: ["Identity", "Governance", "Storage", "Networking", "Compute", "Monitoring"],
  confidence: 95
}
```

**Matrix Display:**
```
              Create    Configure    Monitor
Identity        ✓          ○           ·
Governance      ✓          ✓           ○
Storage         ○          ·           ·
Networking      ·          ·           ·
Compute         ·          ·           ·
Monitoring      ·          ·           ·

Legend: ✓ Mastered  ○ Learning  · Not Started
```

**Coach Message (when user jumps from "Create Identity" to "Create Storage" without doing "Configure Identity"):**
> "Hold up. You're jumping objects. Finish the verb cycle first: Configure Identity, then Monitor Identity. Complete one row before moving to the next. That's how you build systematic mastery."

## Notes

- ULC detection should be automatic but allow manual override
- Not all subjects have ULC patterns - only show when confidence > 70%
- Matrix should be interactive - click cells to jump to that concept
- Progress should persist across sessions
- Consider adding "ULC Mode" toggle for users who want to follow the pattern strictly

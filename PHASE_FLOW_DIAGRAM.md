# Learning Phase Flow Diagram

## Complete Phase Sequence (learn-new / velocity goals)

```
┌─────────────────────────────────────────────────────────────────┐
│                    LEARNING FLOW SEQUENCE                        │
└─────────────────────────────────────────────────────────────────┘

1. PRIME (Lock In) 🚀
   ├─ Component: VelocityLockInGate
   ├─ Trigger: !studySession || !studySession.primer
   ├─ User Action: Confirm lock-in, set session parameters
   └─ Completion: setLockedIn(true) → startStudySession()
                  ↓
2. BUILD (Map Concepts) 🗺️
   ├─ Component: ConceptMapBuilder
   ├─ Trigger: !studySession.mapBuilt
   ├─ User Action: Build concept map with nodes and connections
   └─ Completion: markSessionMapBuilt(data)
                  ↓
3. DIAGNOSE (Assessment) 🎯
   ├─ Component: DiagnosticLaunchSystem
   ├─ Trigger: isFresh && foundationCount >= 5
   ├─ User Action: Complete diagnostic questions
   └─ Completion: completeDiagnostic(results)
                  ↓
4. LEARN (Learning) 🧠
   ├─ Component: MicroLearningLoopController
   ├─ Trigger: activeConcept exists
   ├─ User Action: Complete all concepts (PREPARE → MODEL → DELIVER)
   └─ Completion: All concepts done → markSessionMapReconstructed(true) ✅
                  ↓
5. MASTER (Mastery) 🏆
   ├─ Component: MasteryChallenge
   ├─ Trigger: studySession.mapReconstructed && !studySession.mastered ✅
   ├─ User Action: Complete final mastery challenge
   └─ Completion: markSessionMastered()
                  ↓
6. COMPLETE ✅
   ├─ Component: Session summary screen
   ├─ Trigger: studySession.mastered || no more work
   └─ User Action: Review stats, return to dashboard
```

## Simplified Flows

### Review Goal (Tired Users)
```
PRIME → BUILD → COMPLETE
(Skips: DIAGNOSE, LEARN, MASTER)
```

### Explore Goal (Stressed Users)
```
PRIME → COMPLETE (SensaSynopticView)
(Skips: BUILD, DIAGNOSE, LEARN, MASTER)
```

## Phase State Flags

| Phase | State Flag | Set By |
|-------|-----------|--------|
| PRIME | `studySession.primer` | `startStudySession()` |
| BUILD | `studySession.mapBuilt` | `markSessionMapBuilt()` |
| DIAGNOSE | `diagnosticSession.isComplete` | `completeDiagnostic()` |
| LEARN | `activeConcept === null` | All concepts completed |
| MASTER | `studySession.mapReconstructed` | `markSessionMapReconstructed()` ✅ |
| COMPLETE | `studySession.mastered` | `markSessionMastered()` |

## Key Fix

**Before:** LEARN → COMPLETE (skipped MASTER)
- `markSessionMapReconstructed()` was never called
- Flow jumped directly to COMPLETE after all concepts done

**After:** LEARN → MASTER → COMPLETE ✅
- `handleLoopComplete()` now checks if all concepts are done
- Calls `markSessionMapReconstructed(true)` to trigger MASTER phase
- User completes MasteryChallenge before reaching COMPLETE

## Phase Navigator Display

The PhaseNavigator component shows all 6 phases with icons:

| Order | Phase | Label | Icon |
|-------|-------|-------|------|
| 1 | PRIME | Lock In | 🚀 Rocket |
| 2 | BUILD | Map Concepts | 🗺️ Map |
| 3 | DIAGNOSE | Assessment | 🎯 Target |
| 4 | LEARN | Learning | 🧠 Brain |
| 5 | MASTER | Mastery | 🏆 Trophy |
| 6 | COMPLETE | Complete | ✅ CheckCircle |

## SENSA v2.0 Equation Integration

Each phase contributes to the Universal Learning Equation:
**I = min(h, G × Q_f × Q_M × Q_P)**

- **PRIME**: Sets G (Governance/Environment)
- **BUILD**: Builds Q_P (Preparation Quality)
- **DIAGNOSE**: Refines Q_P and Q_M
- **LEARN**: Builds Q_M (Modeling Quality)
- **MASTER**: Sets Q_f (Fluency Quality)
- **COMPLETE**: Final I (Mastery Index) calculated

## Testing the Flow

1. Start new session → Should see PRIME (Lock In)
2. Complete lock-in → Should see BUILD (Map Concepts)
3. Build concept map → Should see DIAGNOSE (if foundation concepts ≥ 5)
4. Complete diagnostic → Should see LEARN (first concept)
5. Complete all concepts → Should see MASTER (Mastery Challenge) ✅
6. Complete mastery → Should see COMPLETE (Session summary)

✅ All 6 phases now properly triggered in sequence!

# Unified Progressive Learning Flow - Design Document

## 1. Architecture Overview

### 1.1 Design Philosophy

This design implements a neuroscience-grounded learning flow where:
- **Cognitive goals are fixed** (what the brain needs to do)
- **Methods are adaptive** (how we achieve the goal based on working memory capacity)
- **Progress accumulates** (no "starting over" across mood changes)
- **Every phase has value** (no skipping based on mood alone)

### 1.2 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    VelocityLearning.tsx                      │
│                   (Orchestration Layer)                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ├─ useLearningFlow (Phase State Machine)
                              ├─ usePhaseAdapter (Method Selection)
                              └─ Phase Components (Cognitive Methods)
                              
┌─────────────────────────────────────────────────────────────┐
│                   Phase State Machine                        │
│  IDLE → PRIME → ORIENT → STRUCTURE → ENCODE → VERIFY →      │
│                        COMPLETE                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   Phase Adapter System                       │
│  Maps (Phase + Mood) → Component + Completion Handler       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   Progress Tracking                          │
│  phaseProgress: { orientCompleted, structureCompleted, ... } │
│  adaptations: { orientMode, structureMode, ... }             │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 Key Design Decisions

**Decision 1: Phase Adapter Pattern**
- Separates phase logic (what) from method selection (how)
- Enables testing phase logic independently of UI components
- Makes adding new mood variants straightforward

**Decision 2: Completion Flags Over Phase Names**
- Uses semantic flags (`orientCompleted`) instead of phase names (`scouted`, `previewed`)
- Allows multiple old phases to map to one new phase
- Makes migration logic clearer

**Decision 3: Method Names Reflect Cognitive Science**
- `'prior-knowledge'` not `'passive'` (describes what the brain does)
- `'retrieval'` not `'review'` (emphasizes the cognitive mechanism)
- `'recognition'` not `'easy'` (describes the retrieval type)

**Decision 4: No Auto-Skip for Tired Users**
- Every phase provides cognitive value at every energy level
- Tired users get different methods, not fewer phases
- Preserves neuroscience integrity

---

## 2. Data Model Design

### 2.1 Type Definitions

```typescript
// ============================================================================
// Phase Types
// ============================================================================

export type LearningPhase =
  | 'IDLE'           // No active session
  | 'PRIME'          // Intent setting + context retrieval
  | 'ORIENT'         // Schema priming (activate or build)
  | 'STRUCTURE'      // Schema building (externalize mental model)
  | 'ENCODE'         // Memory formation (encoding or retrieval)
  | 'VERIFY'         // Consolidation (testing effect)
  | 'COMPLETE';      // Session end + consolidation handoff

// ============================================================================
// Adaptation Types (Method Selection)
// ============================================================================

export type OrientMode = 
  | 'prior-knowledge'      // Tired: Activate existing schemas
  | 'prediction-skeleton'  // Medium: Scaffolded predictions
  | 'generative';          // High: Full scout + predict + questions

export type StructureMode =
  | 'annotate'    // Tired: Read + annotate pre-built map
  | 'guided'      // Medium: Guided construction with hints
  | 'full';       // High: Full generative construction

export type EncodeMode =
  | 'retrieval'           // Tired (returning): Spaced repetition
  | 'minimal-encoding'    // Tired (new): Low-interference presentation
  | 'standard'            // Medium: Elaboration prompts
  | 'interleaved';        // High: Mixed concepts

export type VerifyMode =
  | 'recognition'   // Tired: Multiple choice, "did you see this?"
  | 'cued-recall'   // Medium: Hints available
  | 'free-recall';  // High: No cues, transfer tasks


// ============================================================================
// Progress Tracking
// ============================================================================

export interface PhaseProgress {
  orientCompleted: boolean;
  structureCompleted: boolean;
  encodeStarted: boolean;
  verifyCompleted: boolean;
}

export interface PhaseAdaptations {
  orientMode?: OrientMode;
  structureMode?: StructureMode;
  encodeMode?: EncodeMode;
  verifyMode?: VerifyMode;
}

// ============================================================================
// Updated StudySession Type
// ============================================================================

export interface StudySession {
  // ... existing fields ...
  
  // NEW: Universal phase completion tracking
  phaseProgress: PhaseProgress;
  
  // NEW: Method tracking (which variant was used)
  adaptations: PhaseAdaptations;
  
  // DEPRECATED (keep for migration, remove after 30 days)
  scouted?: boolean;
  previewed?: boolean;
  overviewViewed?: boolean;
  mapBuilt?: boolean;
  mapReconstructed?: boolean;
  mastered?: boolean;
}
```

### 2.2 Migration Strategy

```typescript
/**
 * Migrates old session format to new unified format.
 * Called automatically on session load.
 */
export function migrateSessionToUnifiedFlow(
  session: StudySession
): StudySession {
  // If already migrated, return as-is
  if (session.phaseProgress) {
    return session;
  }

  // Map old flags to new phaseProgress
  const phaseProgress: PhaseProgress = {
    orientCompleted: Boolean(
      session.scouted || 
      session.previewed || 
      session.overviewViewed
    ),
    structureCompleted: Boolean(session.mapBuilt),
    encodeStarted: session.completedConcepts.length > 0,
    verifyCompleted: Boolean(session.mastered)
  };

  // Infer adaptations from old flags
  const adaptations: PhaseAdaptations = {};
  
  if (session.overviewViewed) {
    adaptations.orientMode = 'prior-knowledge';
  } else if (session.scouted && session.previewed) {
    adaptations.orientMode = 'generative';
  }
  
  if (session.mapBuilt) {
    adaptations.structureMode = 'full';
  }

  return {
    ...session,
    phaseProgress,
    adaptations
  };
}
```

---

## 3. Phase Adapter System

### 3.1 Adapter Interface

```typescript
export interface PhaseAdapter {
  phase: LearningPhase;
  component: React.ComponentType<PhaseComponentProps>;
  completionHandler: (session: StudySession) => Partial<StudySession>;
  skipCondition?: (session: StudySession) => boolean;
}

export interface PhaseComponentProps {
  concepts: LearningConcept[];
  session: StudySession;
  onComplete: () => void;
  onProgress?: (data: any) => void;
}
```


### 3.2 Adapter Implementation

```typescript
/**
 * Phase Adapter Hook
 * Maps (Phase + Mood) → Component + Handlers
 */
export function usePhaseAdapter(
  phase: LearningPhase,
  mood: LearnerMood
): PhaseAdapter | null {
  
  switch (phase) {
    case 'IDLE':
      return null;
      
    case 'PRIME':
      return {
        phase: 'PRIME',
        component: IntentSettingModal,
        completionHandler: (session) => ({
          primer: { /* set primer data */ }
        })
      };
      
    case 'ORIENT':
      return getOrientAdapter(mood);
      
    case 'STRUCTURE':
      return getStructureAdapter(mood);
      
    case 'ENCODE':
      return getEncodeAdapter(mood);
      
    case 'VERIFY':
      return getVerifyAdapter(mood);
      
    case 'COMPLETE':
      return {
        phase: 'COMPLETE',
        component: SessionComplete,
        completionHandler: (session) => ({
          isActive: false,
          endedAt: new Date().toISOString()
        })
      };
      
    default:
      return null;
  }
}

// ============================================================================
// ORIENT Phase Adapters
// ============================================================================

function getOrientAdapter(mood: LearnerMood): PhaseAdapter {
  const isTired = mood === 'tired';
  const isPumped = mood === 'pumped' || mood === 'good';
  
  if (isTired) {
    return {
      phase: 'ORIENT',
      component: PriorKnowledgeActivation,
      completionHandler: (session) => ({
        phaseProgress: {
          ...session.phaseProgress,
          orientCompleted: true
        },
        adaptations: {
          ...session.adaptations,
          orientMode: 'prior-knowledge'
        }
      })
    };
  }
  
  if (isPumped) {
    return {
      phase: 'ORIENT',
      component: GenerativeOrienting,
      completionHandler: (session) => ({
        phaseProgress: {
          ...session.phaseProgress,
          orientCompleted: true
        },
        adaptations: {
          ...session.adaptations,
          orientMode: 'generative'
        }
      })
    };
  }
  
  // Medium energy (okay, struggling)
  return {
    phase: 'ORIENT',
    component: PredictionSkeleton,
    completionHandler: (session) => ({
      phaseProgress: {
        ...session.phaseProgress,
        orientCompleted: true
      },
      adaptations: {
        ...session.adaptations,
        orientMode: 'prediction-skeleton'
      }
    })
  };
}


// ============================================================================
// STRUCTURE Phase Adapters
// ============================================================================

function getStructureAdapter(mood: LearnerMood): PhaseAdapter {
  const isTired = mood === 'tired';
  const isPumped = mood === 'pumped' || mood === 'good';
  
  if (isTired) {
    return {
      phase: 'STRUCTURE',
      component: AnnotatableMap,
      completionHandler: (session) => ({
        phaseProgress: {
          ...session.phaseProgress,
          structureCompleted: true
        },
        adaptations: {
          ...session.adaptations,
          structureMode: 'annotate'
        }
      })
    };
  }
  
  if (isPumped) {
    return {
      phase: 'STRUCTURE',
      component: ConceptMapBuilder,
      completionHandler: (session) => ({
        phaseProgress: {
          ...session.phaseProgress,
          structureCompleted: true
        },
        adaptations: {
          ...session.adaptations,
          structureMode: 'full'
        },
        conceptMap: { /* user-built map data */ }
      })
    };
  }
  
  // Medium energy
  return {
    phase: 'STRUCTURE',
    component: GuidedMapBuilder,
    completionHandler: (session) => ({
      phaseProgress: {
        ...session.phaseProgress,
        structureCompleted: true
      },
      adaptations: {
        ...session.adaptations,
        structureMode: 'guided'
      },
      conceptMap: { /* guided map data */ }
    })
  };
}

// ============================================================================
// ENCODE Phase Adapters
// ============================================================================

function getEncodeAdapter(mood: LearnerMood): PhaseAdapter {
  const isTired = mood === 'tired';
  const isPumped = mood === 'pumped' || mood === 'good';
  
  if (isTired) {
    // Check if user has prior progress
    return {
      phase: 'ENCODE',
      component: ({ session, ...props }) => {
        const hasPriorProgress = session.completedConcepts.length > 0;
        
        if (hasPriorProgress) {
          return <RetrievalPractice {...props} session={session} />;
        } else {
          return <MinimalInterferenceEncoding {...props} session={session} />;
        }
      },
      completionHandler: (session) => {
        const hasPriorProgress = session.completedConcepts.length > 0;
        return {
          phaseProgress: {
            ...session.phaseProgress,
            encodeStarted: true
          },
          adaptations: {
            ...session.adaptations,
            encodeMode: hasPriorProgress ? 'retrieval' : 'minimal-encoding'
          }
        };
      }
    };
  }
  
  if (isPumped) {
    return {
      phase: 'ENCODE',
      component: InterleavedAcquisition,
      completionHandler: (session) => ({
        phaseProgress: {
          ...session.phaseProgress,
          encodeStarted: true
        },
        adaptations: {
          ...session.adaptations,
          encodeMode: 'interleaved'
        }
      })
    };
  }
  
  // Medium energy
  return {
    phase: 'ENCODE',
    component: StandardAcquisition,
    completionHandler: (session) => ({
      phaseProgress: {
        ...session.phaseProgress,
        encodeStarted: true
      },
      adaptations: {
        ...session.adaptations,
        encodeMode: 'standard'
      }
    })
  };
}


// ============================================================================
// VERIFY Phase Adapters
// ============================================================================

function getVerifyAdapter(mood: LearnerMood): PhaseAdapter {
  const isTired = mood === 'tired';
  const isPumped = mood === 'pumped' || mood === 'good';
  
  if (isTired) {
    return {
      phase: 'VERIFY',
      component: RecognitionTasks,
      completionHandler: (session) => ({
        phaseProgress: {
          ...session.phaseProgress,
          verifyCompleted: true
        },
        adaptations: {
          ...session.adaptations,
          verifyMode: 'recognition'
        }
      })
    };
  }
  
  if (isPumped) {
    return {
      phase: 'VERIFY',
      component: FreeRecallTransfer,
      completionHandler: (session) => ({
        phaseProgress: {
          ...session.phaseProgress,
          verifyCompleted: true
        },
        adaptations: {
          ...session.adaptations,
          verifyMode: 'free-recall'
        }
      })
    };
  }
  
  // Medium energy
  return {
    phase: 'VERIFY',
    component: CuedRecall,
    completionHandler: (session) => ({
      phaseProgress: {
        ...session.phaseProgress,
        verifyCompleted: true
      },
      adaptations: {
        ...session.adaptations,
        verifyMode: 'cued-recall'
      }
    })
  };
}
```

---

## 4. Phase State Machine

### 4.1 State Machine Logic

```typescript
/**
 * Determines current phase based on session state.
 * This is the core state machine that drives the entire flow.
 */
export function useLearningFlow(): LearningFlow {
  const { currentSession, studySession } = useLearningStore();
  
  const currentPhase = useMemo((): LearningPhase => {
    // Level 0: No session
    if (!currentSession) return 'IDLE';
    
    // Level 1: Session exists but not active or no primer
    if (!studySession?.isActive || !studySession.primer) {
      return 'PRIME';
    }
    
    const { phaseProgress } = studySession;
    
    // Level 2: ORIENT (Schema Priming)
    // All users must complete this phase
    if (!phaseProgress.orientCompleted) {
      return 'ORIENT';
    }
    
    // Level 3: STRUCTURE (Schema Building)
    // All users must complete this phase (method varies by mood)
    if (!phaseProgress.structureCompleted) {
      return 'STRUCTURE';
    }
    
    // Level 4: ENCODE (Memory Formation)
    // Continue until all concepts are learned
    const hasMoreConcepts = currentSession.progress.completedConcepts.length 
      < currentSession.concepts.length;
    
    if (hasMoreConcepts) {
      return 'ENCODE';
    }
    
    // Level 5: VERIFY (Consolidation)
    // All users must complete this phase (method varies by mood)
    if (!phaseProgress.verifyCompleted) {
      return 'VERIFY';
    }
    
    // Level 6: COMPLETE
    return 'COMPLETE';
    
  }, [currentSession, studySession]);
  
  return {
    currentPhase,
    // ... other flow data
  };
}
```


### 4.2 Phase Transition Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                         IDLE                                  │
│                    (No session)                               │
└──────────────────────────────────────────────────────────────┘
                            │
                            │ User starts session
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                         PRIME                                 │
│              (Intent Setting + Context)                       │
│  • Tired: "What did you learn yesterday?"                    │
│  • Medium: Goal setting                                      │
│  • High: Goal + prediction                                   │
└──────────────────────────────────────────────────────────────┘
                            │
                            │ Primer set
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                        ORIENT                                 │
│                   (Schema Priming)                            │
│  • Tired: Prior knowledge activation                         │
│  • Medium: Prediction skeleton                               │
│  • High: Generative orienting                                │
└──────────────────────────────────────────────────────────────┘
                            │
                            │ orientCompleted = true
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                       STRUCTURE                               │
│                   (Schema Building)                           │
│  • Tired: Annotate pre-built map                            │
│  • Medium: Guided construction                               │
│  • High: Full construction                                   │
└──────────────────────────────────────────────────────────────┘
                            │
                            │ structureCompleted = true
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                        ENCODE                                 │
│                  (Memory Formation)                           │
│  • Tired: Retrieval or minimal encoding                      │
│  • Medium: Standard acquisition                              │
│  • High: Interleaved acquisition                             │
└──────────────────────────────────────────────────────────────┘
                            │
                            │ All concepts completed
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                        VERIFY                                 │
│                   (Consolidation)                             │
│  • Tired: Recognition tasks                                  │
│  • Medium: Cued recall                                       │
│  • High: Free recall + transfer                              │
└──────────────────────────────────────────────────────────────┘
                            │
                            │ verifyCompleted = true
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                       COMPLETE                                │
│            (Session End + Consolidation Handoff)              │
│  • Show session summary                                      │
│  • Prime overnight consolidation                             │
│  • Set expectations for next session                         │
└──────────────────────────────────────────────────────────────┘
```

---

## 5. Component Architecture

### 5.1 Component Hierarchy

```
VelocityLearning.tsx (Orchestrator)
├── useLearningFlow() → currentPhase
├── usePhaseAdapter(currentPhase, mood) → adapter
└── <adapter.component />
    ├── Phase-specific UI
    ├── Cognitive method implementation
    └── onComplete() → adapter.completionHandler()
```

### 5.2 ORIENT Phase Components

#### 5.2.1 PriorKnowledgeActivation (Tired)

```typescript
/**
 * Cognitive Goal: Activate existing schemas
 * Method: Retrieval cues for prior knowledge
 * Neuroscience: Low WM capacity requires activating existing schemas
 */
export function PriorKnowledgeActivation({
  concepts,
  session,
  onComplete
}: PhaseComponentProps) {
  const [responses, setResponses] = useState<Record<string, string>>({});
  
  return (
    <div className="prior-knowledge-activation">
      <h2>Let's Connect to What You Know</h2>
      <p>Before we dive in, let's activate your existing knowledge.</p>
      
      {concepts.slice(0, 3).map(concept => (
        <div key={concept.id} className="retrieval-prompt">
          <h3>{concept.name}</h3>
          <p>What do you already know about {concept.name}?</p>
          <textarea
            value={responses[concept.id] || ''}
            onChange={(e) => setResponses({
              ...responses,
              [concept.id]: e.target.value
            })}
            placeholder="Any prior experience, related concepts, or questions..."
          />
        </div>
      ))}
      
      <button onClick={onComplete}>
        Continue
      </button>
    </div>
  );
}
```


#### 5.2.2 PredictionSkeleton (Medium Energy)

```typescript
/**
 * Cognitive Goal: Build prediction schema
 * Method: Scaffolded predictions with structure
 * Neuroscience: Medium WM allows prediction without full generation
 */
export function PredictionSkeleton({
  concepts,
  session,
  onComplete
}: PhaseComponentProps) {
  const [predictions, setPredictions] = useState<Record<string, string>>({});
  
  return (
    <div className="prediction-skeleton">
      <h2>What Do You Expect?</h2>
      <p>Here's the structure we'll cover. What do you think each part means?</p>
      
      <div className="concept-structure">
        {concepts.map(concept => (
          <div key={concept.id} className="concept-preview">
            <div className="concept-header">
              <span className="concept-icon">{concept.icon}</span>
              <h3>{concept.name}</h3>
            </div>
            
            <div className="prediction-prompt">
              <label>What do you expect this concept covers?</label>
              <select
                value={predictions[concept.id] || ''}
                onChange={(e) => setPredictions({
                  ...predictions,
                  [concept.id]: e.target.value
                })}
              >
                <option value="">Make a prediction...</option>
                <option value="setup">Setting up or configuring</option>
                <option value="action">Taking an action</option>
                <option value="monitoring">Checking or verifying</option>
                <option value="troubleshooting">Fixing problems</option>
              </select>
            </div>
          </div>
        ))}
      </div>
      
      <button onClick={onComplete}>
        Continue to Learning
      </button>
    </div>
  );
}
```

#### 5.2.3 GenerativeOrienting (High Energy)

```typescript
/**
 * Cognitive Goal: Full generative schema building
 * Method: Scout + predict + question generation
 * Neuroscience: High WM enables deep generative processing
 */
export function GenerativeOrienting({
  concepts,
  session,
  onComplete
}: PhaseComponentProps) {
  const [scoutNotes, setScoutNotes] = useState<Record<string, string>>({});
  const [predictions, setPredictions] = useState<Record<string, string>>({});
  const [questions, setQuestions] = useState<Record<string, string[]>>({});
  
  return (
    <div className="generative-orienting">
      <h2>Scout the Territory</h2>
      
      <Tabs>
        <Tab label="Scout">
          <p>Survey the concepts. What patterns do you notice?</p>
          {concepts.map(concept => (
            <div key={concept.id} className="scout-card">
              <h3>{concept.name}</h3>
              <p className="hook">{concept.hookSentence}</p>
              <textarea
                placeholder="Your observations, connections, patterns..."
                value={scoutNotes[concept.id] || ''}
                onChange={(e) => setScoutNotes({
                  ...scoutNotes,
                  [concept.id]: e.target.value
                })}
              />
            </div>
          ))}
        </Tab>
        
        <Tab label="Predict">
          <p>Based on your scouting, predict what each concept will teach.</p>
          {concepts.map(concept => (
            <div key={concept.id} className="prediction-card">
              <h3>{concept.name}</h3>
              <textarea
                placeholder="What do you think this concept covers? How might it work?"
                value={predictions[concept.id] || ''}
                onChange={(e) => setPredictions({
                  ...predictions,
                  [concept.id]: e.target.value
                })}
              />
            </div>
          ))}
        </Tab>
        
        <Tab label="Question">
          <p>Generate questions you want answered.</p>
          <QuestionGenerator
            concepts={concepts}
            questions={questions}
            onChange={setQuestions}
          />
        </Tab>
      </Tabs>
      
      <button onClick={onComplete}>
        Begin Learning
      </button>
    </div>
  );
}
```


### 5.3 STRUCTURE Phase Components

#### 5.3.1 AnnotatableMap (Tired)

```typescript
/**
 * Cognitive Goal: Build mental schema
 * Method: Read + annotate pre-built map
 * Neuroscience: Tired users need schemas MORE, not less
 */
export function AnnotatableMap({
  concepts,
  session,
  onComplete
}: PhaseComponentProps) {
  const [annotations, setAnnotations] = useState<Record<string, string>>({});
  const [highlights, setHighlights] = useState<Set<string>>(new Set());
  
  // Generate pre-built map from concept dependencies
  const conceptMap = useMemo(() => 
    generateConceptMap(concepts), 
    [concepts]
  );
  
  return (
    <div className="annotatable-map">
      <h2>Your Learning Map</h2>
      <p>This map shows how concepts connect. Add notes as you explore.</p>
      
      <div className="map-container">
        <ConceptMapVisualization
          map={conceptMap}
          highlights={highlights}
          onNodeClick={(nodeId) => {
            const newHighlights = new Set(highlights);
            if (highlights.has(nodeId)) {
              newHighlights.delete(nodeId);
            } else {
              newHighlights.add(nodeId);
            }
            setHighlights(newHighlights);
          }}
        />
      </div>
      
      <div className="annotation-panel">
        <h3>Your Notes</h3>
        {concepts.map(concept => (
          <div key={concept.id} className="annotation-field">
            <label>{concept.name}</label>
            <textarea
              placeholder="Add your thoughts, connections, or questions..."
              value={annotations[concept.id] || ''}
              onChange={(e) => setAnnotations({
                ...annotations,
                [concept.id]: e.target.value
              })}
            />
          </div>
        ))}
      </div>
      
      <button 
        onClick={onComplete}
        disabled={highlights.size === 0}
      >
        Continue to Learning
      </button>
    </div>
  );
}
```

#### 5.3.2 GuidedMapBuilder (Medium Energy)

```typescript
/**
 * Cognitive Goal: Build mental schema
 * Method: Guided construction with hints
 * Neuroscience: Medium WM allows construction with scaffolding
 */
export function GuidedMapBuilder({
  concepts,
  session,
  onComplete
}: PhaseComponentProps) {
  const [userMap, setUserMap] = useState<ConceptMapData>({
    nodes: [],
    connections: []
  });
  const [showHints, setShowHints] = useState(false);
  
  return (
    <div className="guided-map-builder">
      <h2>Build Your Learning Map</h2>
      <p>Connect the concepts. Need help? Toggle hints.</p>
      
      <div className="builder-controls">
        <button onClick={() => setShowHints(!showHints)}>
          {showHints ? 'Hide' : 'Show'} Hints
        </button>
      </div>
      
      <ConceptMapBuilder
        concepts={concepts}
        map={userMap}
        onChange={setUserMap}
        hints={showHints ? generateHints(concepts) : undefined}
      />
      
      {showHints && (
        <div className="hint-panel">
          <h3>Connection Hints</h3>
          <ul>
            <li>Look for "requires" relationships</li>
            <li>Group related concepts together</li>
            <li>Foundation concepts usually have no dependencies</li>
          </ul>
        </div>
      )}
      
      <button 
        onClick={onComplete}
        disabled={userMap.connections.length < concepts.length - 1}
      >
        Continue to Learning
      </button>
    </div>
  );
}
```


### 5.4 ENCODE Phase Components

#### 5.4.1 RetrievalPractice (Tired, Returning Learner)

```typescript
/**
 * Cognitive Goal: Strengthen memory traces
 * Method: Spaced repetition retrieval
 * Neuroscience: Retrieval is MORE effective than re-encoding
 */
export function RetrievalPractice({
  concepts,
  session,
  onComplete
}: PhaseComponentProps) {
  const completedConcepts = concepts.filter(c => 
    session.completedConcepts.includes(c.id)
  );
  
  // Use spaced repetition algorithm
  const conceptsToReview = useSpacedRepetition(
    completedConcepts,
    session
  );
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, string>>({});
  
  const currentConcept = conceptsToReview[currentIndex];
  
  return (
    <div className="retrieval-practice">
      <h2>Retrieval Practice</h2>
      <p>Retrieving strengthens memory more than re-reading.</p>
      
      <div className="progress">
        {currentIndex + 1} of {conceptsToReview.length}
      </div>
      
      <div className="retrieval-card">
        <h3>{currentConcept.name}</h3>
        
        <div className="retrieval-prompt">
          <p>Without looking, what do you remember about this concept?</p>
          <textarea
            value={responses[currentConcept.id] || ''}
            onChange={(e) => setResponses({
              ...responses,
              [currentConcept.id]: e.target.value
            })}
            placeholder="Write what you remember..."
          />
        </div>
        
        <button onClick={() => {
          if (currentIndex < conceptsToReview.length - 1) {
            setCurrentIndex(currentIndex + 1);
          } else {
            onComplete();
          }
        }}>
          {currentIndex < conceptsToReview.length - 1 ? 'Next' : 'Complete'}
        </button>
      </div>
    </div>
  );
}
```

#### 5.4.2 MinimalInterferenceEncoding (Tired, New Learner)

```typescript
/**
 * Cognitive Goal: Form initial memory traces
 * Method: Low-interference presentation
 * Neuroscience: Reduced WM requires minimal competing demands
 */
export function MinimalInterferenceEncoding({
  concepts,
  session,
  onComplete,
  onProgress
}: PhaseComponentProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentConcept = concepts[currentIndex];
  
  return (
    <div className="minimal-encoding">
      <div className="progress-indicator">
        {currentIndex + 1} of {concepts.length}
      </div>
      
      <div className="concept-card-minimal">
        <h2>{currentConcept.name}</h2>
        
        <div className="core-content">
          <p className="hook">{currentConcept.hookSentence}</p>
          <p className="why">{currentConcept.whyYouNeed}</p>
        </div>
        
        {currentConcept.metaphor && (
          <div className="metaphor-box">
            <span className="icon">💡</span>
            <p>{currentConcept.metaphor}</p>
          </div>
        )}
        
        <div className="simple-check">
          <p>Did you see this concept?</p>
          <button onClick={() => {
            onProgress?.({ conceptId: currentConcept.id, seen: true });
            
            if (currentIndex < concepts.length - 1) {
              setCurrentIndex(currentIndex + 1);
            } else {
              onComplete();
            }
          }}>
            Yes, Continue
          </button>
        </div>
      </div>
    </div>
  );
}
```


#### 5.4.3 StandardAcquisition (Medium Energy)

```typescript
/**
 * Cognitive Goal: Form memory traces with elaboration
 * Method: Micro-learning with elaboration prompts
 * Neuroscience: Medium WM allows elaborative encoding
 */
export function StandardAcquisition({
  concepts,
  session,
  onComplete,
  onProgress
}: PhaseComponentProps) {
  // Reuse existing MicroLearningLoop with standard difficulty
  return (
    <MicroLearningLoopController
      concepts={concepts}
      session={session}
      difficulty="standard"
      onConceptComplete={(conceptId) => {
        onProgress?.({ conceptId, completed: true });
      }}
      onAllComplete={onComplete}
    />
  );
}
```

#### 5.4.4 InterleavedAcquisition (High Energy)

```typescript
/**
 * Cognitive Goal: Form flexible memory traces
 * Method: Interleaved practice across categories
 * Neuroscience: High WM enables interleaving for stronger encoding
 */
export function InterleavedAcquisition({
  concepts,
  session,
  onComplete,
  onProgress
}: PhaseComponentProps) {
  // Shuffle concepts across lifecycle phases for interleaving
  const interleavedConcepts = useMemo(() => {
    const byPhase = groupBy(concepts, c => c.lifecyclePhase);
    return interleave(
      byPhase.PREPARE || [],
      byPhase.MODEL || [],
      byPhase.DELIVER || []
    );
  }, [concepts]);
  
  return (
    <MicroLearningLoopController
      concepts={interleavedConcepts}
      session={session}
      difficulty="challenging"
      showInterleaveIndicator={true}
      onConceptComplete={(conceptId) => {
        onProgress?.({ conceptId, completed: true });
      }}
      onAllComplete={onComplete}
    />
  );
}
```

### 5.5 VERIFY Phase Components

#### 5.5.1 RecognitionTasks (Tired)

```typescript
/**
 * Cognitive Goal: Consolidate through testing effect
 * Method: Recognition (multiple choice)
 * Neuroscience: Even recognition provides testing effect benefits
 */
export function RecognitionTasks({
  concepts,
  session,
  onComplete
}: PhaseComponentProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, string>>({});
  
  const questions = useMemo(() => 
    generateRecognitionQuestions(concepts),
    [concepts]
  );
  
  const currentQuestion = questions[currentIndex];
  
  return (
    <div className="recognition-tasks">
      <h2>Quick Recognition Check</h2>
      <p>Testing strengthens memory, even when it feels easy.</p>
      
      <div className="progress">
        {currentIndex + 1} of {questions.length}
      </div>
      
      <div className="question-card">
        <p className="question">{currentQuestion.prompt}</p>
        
        <div className="options">
          {currentQuestion.options.map((option, idx) => (
            <button
              key={idx}
              className={responses[currentQuestion.id] === option ? 'selected' : ''}
              onClick={() => {
                setResponses({
                  ...responses,
                  [currentQuestion.id]: option
                });
                
                setTimeout(() => {
                  if (currentIndex < questions.length - 1) {
                    setCurrentIndex(currentIndex + 1);
                  } else {
                    onComplete();
                  }
                }, 500);
              }}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```


#### 5.5.2 CuedRecall (Medium Energy)

```typescript
/**
 * Cognitive Goal: Consolidate through retrieval
 * Method: Cued recall with hints
 * Neuroscience: Cued recall stronger than recognition
 */
export function CuedRecall({
  concepts,
  session,
  onComplete
}: PhaseComponentProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [response, setResponse] = useState('');
  
  const questions = useMemo(() => 
    generateCuedRecallQuestions(concepts),
    [concepts]
  );
  
  const currentQuestion = questions[currentIndex];
  
  return (
    <div className="cued-recall">
      <h2>Recall Challenge</h2>
      <p>Try to recall without hints first.</p>
      
      <div className="progress">
        {currentIndex + 1} of {questions.length}
      </div>
      
      <div className="question-card">
        <p className="cue">{currentQuestion.cue}</p>
        
        <textarea
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          placeholder="Your answer..."
        />
        
        {!showHint && (
          <button 
            className="hint-button"
            onClick={() => setShowHint(true)}
          >
            Need a hint?
          </button>
        )}
        
        {showHint && (
          <div className="hint-box">
            <p>{currentQuestion.hint}</p>
          </div>
        )}
        
        <button onClick={() => {
          if (currentIndex < questions.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setResponse('');
            setShowHint(false);
          } else {
            onComplete();
          }
        }}>
          {currentIndex < questions.length - 1 ? 'Next' : 'Complete'}
        </button>
      </div>
    </div>
  );
}
```

#### 5.5.3 FreeRecallTransfer (High Energy)

```typescript
/**
 * Cognitive Goal: Deep consolidation + transfer
 * Method: Free recall + application to new contexts
 * Neuroscience: Strongest form of retrieval practice
 */
export function FreeRecallTransfer({
  concepts,
  session,
  onComplete
}: PhaseComponentProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [response, setResponse] = useState('');
  
  const challenges = useMemo(() => 
    generateTransferChallenges(concepts),
    [concepts]
  );
  
  const currentChallenge = challenges[currentIndex];
  
  return (
    <div className="free-recall-transfer">
      <h2>Mastery Challenge</h2>
      <p>Apply what you've learned to new scenarios.</p>
      
      <div className="progress">
        {currentIndex + 1} of {challenges.length}
      </div>
      
      <div className="challenge-card">
        <h3>{currentChallenge.scenario}</h3>
        <p className="prompt">{currentChallenge.prompt}</p>
        
        <textarea
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          placeholder="Explain your approach..."
          rows={6}
        />
        
        <div className="requirements">
          <p>Your answer should include:</p>
          <ul>
            {currentChallenge.requirements.map((req, idx) => (
              <li key={idx}>{req}</li>
            ))}
          </ul>
        </div>
        
        <button 
          onClick={() => {
            if (currentIndex < challenges.length - 1) {
              setCurrentIndex(currentIndex + 1);
              setResponse('');
            } else {
              onComplete();
            }
          }}
          disabled={response.length < 50}
        >
          {currentIndex < challenges.length - 1 ? 'Next Challenge' : 'Complete'}
        </button>
      </div>
    </div>
  );
}
```


### 5.6 COMPLETE Phase Component

```typescript
/**
 * Cognitive Goal: Prime overnight consolidation
 * Method: Explicit consolidation messaging + session summary
 * Neuroscience: Setting expectations primes better recall
 */
export function SessionComplete({
  concepts,
  session,
  onComplete
}: PhaseComponentProps) {
  const { adaptations, phaseProgress } = session;
  
  return (
    <div className="session-complete">
      <div className="celebration">
        <span className="icon">🎉</span>
        <h2>Session Complete!</h2>
      </div>
      
      <div className="session-summary">
        <h3>What You Accomplished</h3>
        <ul>
          <li>
            <strong>Concepts covered:</strong> {session.completedConcepts.length}
          </li>
          <li>
            <strong>Learning method:</strong> {getMethodDescription(adaptations)}
          </li>
          <li>
            <strong>Time spent:</strong> {formatDuration(session)}
          </li>
        </ul>
      </div>
      
      <div className="consolidation-priming">
        <h3>What Happens Next</h3>
        <p className="priming-message">
          Your brain will consolidate these concepts while you sleep, 
          making new connections and strengthening memories. You might 
          wake up with new questions or insights — that's your brain working!
        </p>
        
        <div className="sleep-tip">
          <span className="icon">💤</span>
          <p>
            Getting good sleep tonight will help lock in what you learned. 
            Your brain replays and strengthens these memories during sleep.
          </p>
        </div>
      </div>
      
      <div className="next-session-preview">
        <h3>Next Session</h3>
        <p>
          {getNextSessionPreview(session, concepts)}
        </p>
      </div>
      
      <button onClick={onComplete}>
        Finish
      </button>
    </div>
  );
}

function getMethodDescription(adaptations: PhaseAdaptations): string {
  const methods = [];
  
  if (adaptations.orientMode === 'prior-knowledge') {
    methods.push('prior knowledge activation');
  } else if (adaptations.orientMode === 'generative') {
    methods.push('generative orienting');
  }
  
  if (adaptations.encodeMode === 'retrieval') {
    methods.push('retrieval practice (most effective!)');
  } else if (adaptations.encodeMode === 'interleaved') {
    methods.push('interleaved learning');
  }
  
  return methods.join(', ') || 'standard learning';
}

function getNextSessionPreview(
  session: StudySession,
  concepts: LearningConcept[]
): string {
  const remaining = concepts.length - session.completedConcepts.length;
  
  if (remaining > 0) {
    return `Continue with ${remaining} more concepts. Your brain will be ready to build on today's foundation.`;
  }
  
  return `Review and strengthen your knowledge through retrieval practice. The best time is tomorrow morning after sleep consolidation.`;
}
```

---

## 6. Integration with VelocityLearning

### 6.1 Updated VelocityLearning Component

```typescript
export function VelocityLearning() {
  const { currentSession, studySession, updateSession } = useLearningStore();
  const { currentPhase, activeConcept } = useLearningFlow();
  
  // Get adapter for current phase and mood
  const adapter = usePhaseAdapter(
    currentPhase,
    studySession?.mood || 'okay'
  );
  
  // Handle phase completion
  const handlePhaseComplete = useCallback(() => {
    if (!adapter || !studySession) return;
    
    const updates = adapter.completionHandler(studySession);
    updateSession(studySession.id, updates);
  }, [adapter, studySession, updateSession]);
  
  // Render phase component
  const renderPhaseContent = () => {
    if (!adapter || !currentSession) return null;
    
    const Component = adapter.component;
    
    return (
      <Component
        concepts={currentSession.concepts}
        session={studySession!}
        onComplete={handlePhaseComplete}
        onProgress={(data) => {
          // Handle progress updates (e.g., concept completion)
          if (data.conceptId && data.completed) {
            updateSession(studySession!.id, {
              completedConcepts: [
                ...studySession!.completedConcepts,
                data.conceptId
              ]
            });
          }
        }}
      />
    );
  };
  
  return (
    <div className="velocity-learning">
      <PhaseIndicator 
        currentPhase={currentPhase}
        completedPhases={getCompletedPhases(studySession)}
      />
      
      {renderPhaseContent()}
    </div>
  );
}
```


### 6.2 Phase Indicator Component

```typescript
/**
 * Visual indicator showing phase progression
 */
export function PhaseIndicator({
  currentPhase,
  completedPhases
}: {
  currentPhase: LearningPhase;
  completedPhases: LearningPhase[];
}) {
  const phases: LearningPhase[] = [
    'PRIME',
    'ORIENT',
    'STRUCTURE',
    'ENCODE',
    'VERIFY',
    'COMPLETE'
  ];
  
  return (
    <div className="phase-indicator">
      {phases.map((phase, index) => {
        const isCompleted = completedPhases.includes(phase);
        const isCurrent = phase === currentPhase;
        const isUpcoming = !isCompleted && !isCurrent;
        
        return (
          <div
            key={phase}
            className={cn('phase-step', {
              completed: isCompleted,
              current: isCurrent,
              upcoming: isUpcoming
            })}
          >
            <div className="phase-icon">
              {isCompleted ? '✓' : index + 1}
            </div>
            <div className="phase-label">
              {getPhaseLabel(phase)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function getPhaseLabel(phase: LearningPhase): string {
  const labels: Record<LearningPhase, string> = {
    IDLE: 'Start',
    PRIME: 'Set Intent',
    ORIENT: 'Prime Schema',
    STRUCTURE: 'Build Map',
    ENCODE: 'Learn',
    VERIFY: 'Consolidate',
    COMPLETE: 'Complete'
  };
  return labels[phase];
}
```

---

## 7. Store Integration

### 7.1 Updated Learning Store Actions

```typescript
// Add to learning store
export const useLearningStore = create<LearningStore>((set, get) => ({
  // ... existing state ...
  
  // NEW: Initialize session with unified flow structure
  startSession: (config: SessionConfig) => {
    const session: StudySession = {
      id: generateId(),
      subjectId: config.subjectId,
      startedAt: new Date().toISOString(),
      goal: config.goal,
      targetDuration: config.duration,
      isActive: true,
      
      // NEW: Initialize phase progress
      phaseProgress: {
        orientCompleted: false,
        structureCompleted: false,
        encodeStarted: false,
        verifyCompleted: false
      },
      
      // NEW: Initialize adaptations
      adaptations: {},
      
      // Existing fields
      targetConcepts: [],
      targetPhases: [],
      conceptsCompleted: [],
      phasesCompleted: {},
      confusionDrillsCompleted: 0,
      metrics: initializeMetrics(),
      breaksTaken: 0,
      goalAchieved: false,
      primer: null,
      predictions: {},
      checkpointOffers: 0,
      lastCheckpointAt: null,
      isInFlowState: false,
      timeToastShownAt: null,
      mood: config.mood
    };
    
    set({ studySession: session });
  },
  
  // NEW: Update session with partial updates
  updateSession: (sessionId: string, updates: Partial<StudySession>) => {
    const { studySession } = get();
    if (studySession?.id !== sessionId) return;
    
    set({
      studySession: {
        ...studySession,
        ...updates
      }
    });
  },
  
  // NEW: Complete phase (helper method)
  completePhase: (phase: keyof PhaseProgress) => {
    const { studySession } = get();
    if (!studySession) return;
    
    set({
      studySession: {
        ...studySession,
        phaseProgress: {
          ...studySession.phaseProgress,
          [phase]: true
        }
      }
    });
  }
}));
```

---

## 8. Testing Strategy

### 8.1 Unit Tests

```typescript
describe('Phase State Machine', () => {
  it('should start at PRIME when session is created', () => {
    const session = createMockSession({ primer: null });
    const phase = determinePhase(session);
    expect(phase).toBe('PRIME');
  });
  
  it('should move to ORIENT after primer is set', () => {
    const session = createMockSession({
      primer: { reason: 'test', action: 'test', reward: 'test' },
      phaseProgress: { orientCompleted: false }
    });
    const phase = determinePhase(session);
    expect(phase).toBe('ORIENT');
  });
  
  it('should skip completed phases', () => {
    const session = createMockSession({
      primer: { reason: 'test', action: 'test', reward: 'test' },
      phaseProgress: {
        orientCompleted: true,
        structureCompleted: false
      }
    });
    const phase = determinePhase(session);
    expect(phase).toBe('STRUCTURE');
  });
  
  it('should not skip STRUCTURE for tired users', () => {
    const session = createMockSession({
      mood: 'tired',
      phaseProgress: {
        orientCompleted: true,
        structureCompleted: false
      }
    });
    const phase = determinePhase(session);
    expect(phase).toBe('STRUCTURE'); // NOT skipped
  });
});
```


### 8.2 Integration Tests

```typescript
describe('Phase Adapter System', () => {
  it('should return correct component for tired ORIENT', () => {
    const adapter = getPhaseAdapter('ORIENT', 'tired');
    expect(adapter.component).toBe(PriorKnowledgeActivation);
    expect(adapter.completionHandler).toBeDefined();
  });
  
  it('should set correct adaptation mode on completion', () => {
    const adapter = getPhaseAdapter('ORIENT', 'tired');
    const session = createMockSession();
    const updates = adapter.completionHandler(session);
    
    expect(updates.phaseProgress.orientCompleted).toBe(true);
    expect(updates.adaptations.orientMode).toBe('prior-knowledge');
  });
  
  it('should use retrieval for tired returning learners', () => {
    const adapter = getPhaseAdapter('ENCODE', 'tired');
    const session = createMockSession({
      completedConcepts: ['concept1', 'concept2']
    });
    
    // Component should be RetrievalPractice
    const updates = adapter.completionHandler(session);
    expect(updates.adaptations.encodeMode).toBe('retrieval');
  });
});
```

### 8.3 User Journey Tests

```typescript
describe('Tired → Pumped Transition', () => {
  it('should preserve progress across mood changes', () => {
    // Day 1: Tired user
    const day1Session = createMockSession({
      mood: 'tired',
      phaseProgress: {
        orientCompleted: true,
        structureCompleted: true,
        encodeStarted: false,
        verifyCompleted: false
      },
      adaptations: {
        orientMode: 'prior-knowledge',
        structureMode: 'annotate'
      }
    });
    
    // Day 2: Same user, now pumped
    const day2Session = {
      ...day1Session,
      mood: 'pumped' as LearnerMood
    };
    
    const phase = determinePhase(day2Session);
    
    // Should skip ORIENT and STRUCTURE (already completed)
    expect(phase).toBe('ENCODE');
    
    // Should use high-energy method for ENCODE
    const adapter = getPhaseAdapter(phase, 'pumped');
    expect(adapter.component).toBe(InterleavedAcquisition);
  });
});
```

---

## 9. Migration Implementation

### 9.1 Migration Function

```typescript
/**
 * Migrates sessions from old format to unified flow format.
 * Runs automatically on app load.
 */
export function migrateAllSessions() {
  const sessions = getAllSessions(); // From storage
  
  const migratedSessions = sessions.map(session => {
    // Skip if already migrated
    if (session.phaseProgress) {
      return session;
    }
    
    console.log(`Migrating session ${session.id}...`);
    
    return migrateSessionToUnifiedFlow(session);
  });
  
  saveAllSessions(migratedSessions);
  
  console.log(`Migrated ${migratedSessions.length} sessions`);
}

/**
 * Individual session migration logic
 */
export function migrateSessionToUnifiedFlow(
  session: StudySession
): StudySession {
  const phaseProgress: PhaseProgress = {
    // ORIENT completed if any of these old flags are true
    orientCompleted: Boolean(
      session.scouted || 
      session.previewed || 
      session.overviewViewed
    ),
    
    // STRUCTURE completed if map was built
    structureCompleted: Boolean(session.mapBuilt),
    
    // ENCODE started if any concepts completed
    encodeStarted: session.completedConcepts.length > 0,
    
    // VERIFY completed if mastered
    verifyCompleted: Boolean(session.mastered)
  };
  
  const adaptations: PhaseAdaptations = {};
  
  // Infer ORIENT mode from old flags
  if (session.overviewViewed) {
    adaptations.orientMode = 'prior-knowledge';
  } else if (session.scouted && session.previewed) {
    adaptations.orientMode = 'generative';
  } else if (session.previewed) {
    adaptations.orientMode = 'prediction-skeleton';
  }
  
  // Infer STRUCTURE mode
  if (session.mapBuilt) {
    // Assume full mode if they built it
    adaptations.structureMode = 'full';
  }
  
  // Infer ENCODE mode
  if (session.completedConcepts.length > 0) {
    // Default to standard if we can't determine
    adaptations.encodeMode = 'standard';
  }
  
  // Infer VERIFY mode
  if (session.mastered) {
    // Assume full mode if they completed mastery
    adaptations.verifyMode = 'free-recall';
  }
  
  return {
    ...session,
    phaseProgress,
    adaptations
  };
}
```

### 9.2 Migration Validation

```typescript
/**
 * Validates migrated sessions to ensure data integrity
 */
export function validateMigration(
  oldSession: StudySession,
  newSession: StudySession
): boolean {
  // Check that progress is preserved
  if (oldSession.completedConcepts.length > 0) {
    if (!newSession.phaseProgress.encodeStarted) {
      console.error('Migration error: encodeStarted should be true');
      return false;
    }
  }
  
  // Check that completed concepts are preserved
  if (oldSession.completedConcepts.length !== newSession.completedConcepts.length) {
    console.error('Migration error: completedConcepts mismatch');
    return false;
  }
  
  // Check that adaptations are set
  if (!newSession.adaptations) {
    console.error('Migration error: adaptations not set');
    return false;
  }
  
  return true;
}
```

---

## 10. Performance Considerations

### 10.1 Memoization Strategy

```typescript
// Memoize phase determination
const currentPhase = useMemo((): LearningPhase => {
  return determinePhase(studySession);
}, [studySession?.phaseProgress, studySession?.completedConcepts]);

// Memoize adapter selection
const adapter = useMemo(() => {
  return getPhaseAdapter(currentPhase, studySession?.mood || 'okay');
}, [currentPhase, studySession?.mood]);

// Memoize concept map generation
const conceptMap = useMemo(() => {
  return generateConceptMap(concepts);
}, [concepts]);
```

### 10.2 Lazy Loading Components

```typescript
// Lazy load phase components to reduce initial bundle size
const PriorKnowledgeActivation = lazy(() => 
  import('./components/orient/PriorKnowledgeActivation')
);

const GenerativeOrienting = lazy(() => 
  import('./components/orient/GenerativeOrienting')
);

// ... other components
```


---

## 11. File Structure

```
src/
├── shared/
│   ├── types/
│   │   └── learning.ts (updated with new types)
│   └── hooks/
│       ├── useLearningFlow.ts (refactored state machine)
│       └── usePhaseAdapter.ts (NEW: adapter system)
│
├── features/
│   └── unified-flow/
│       ├── components/
│       │   ├── orient/
│       │   │   ├── PriorKnowledgeActivation.tsx
│       │   │   ├── PredictionSkeleton.tsx
│       │   │   └── GenerativeOrienting.tsx
│       │   ├── structure/
│       │   │   ├── AnnotatableMap.tsx
│       │   │   ├── GuidedMapBuilder.tsx
│       │   │   └── ConceptMapBuilder.tsx (existing)
│       │   ├── encode/
│       │   │   ├── RetrievalPractice.tsx
│       │   │   ├── MinimalInterferenceEncoding.tsx
│       │   │   ├── StandardAcquisition.tsx
│       │   │   └── InterleavedAcquisition.tsx
│       │   ├── verify/
│       │   │   ├── RecognitionTasks.tsx
│       │   │   ├── CuedRecall.tsx
│       │   │   └── FreeRecallTransfer.tsx
│       │   ├── complete/
│       │   │   └── SessionComplete.tsx
│       │   └── shared/
│       │       └── PhaseIndicator.tsx
│       ├── utils/
│       │   ├── migration.ts (session migration logic)
│       │   ├── phase-adapter.ts (adapter implementations)
│       │   └── question-generators.ts (generate questions for VERIFY)
│       └── index.ts
│
├── pages/
│   └── VelocityLearning.tsx (updated orchestrator)
│
└── store/
    └── slices/
        └── createStudySlice.ts (updated with new actions)
```

---

## 12. Implementation Phases

### Phase 1: Foundation (Week 1)
**Goal:** Add new types and migration without breaking existing functionality

**Tasks:**
1. Add new types to `learning.ts`
   - `PhaseProgress` interface
   - `PhaseAdaptations` interface
   - New `LearningPhase` enum values
   - Adaptation mode types

2. Update `StudySession` type
   - Add `phaseProgress` field
   - Add `adaptations` field
   - Mark old fields as deprecated

3. Implement migration function
   - `migrateSessionToUnifiedFlow()`
   - `validateMigration()`
   - Add migration tests

4. Run migration on app load
   - Add migration hook
   - Log migration results
   - Validate all sessions

**Success Criteria:**
- All existing sessions migrate successfully
- No data loss
- App continues to work with old logic

### Phase 2: Phase Adapter System (Week 2)
**Goal:** Build adapter system and refactor state machine

**Tasks:**
1. Create `usePhaseAdapter` hook
   - Implement adapter interface
   - Implement all phase adapters
   - Add adapter tests

2. Refactor `useLearningFlow`
   - Update phase determination logic
   - Use `phaseProgress` flags
   - Remove old phase logic

3. Update store actions
   - Add `updateSession()` method
   - Add `completePhase()` helper
   - Update session initialization

**Success Criteria:**
- Phase determination uses new logic
- Adapters return correct components
- Tests pass for all mood combinations

### Phase 3: ORIENT Components (Week 3)
**Goal:** Implement all ORIENT phase variants

**Tasks:**
1. Build `PriorKnowledgeActivation` (tired)
2. Build `PredictionSkeleton` (medium)
3. Build `GenerativeOrienting` (high)
4. Add completion handlers
5. Test all variants

**Success Criteria:**
- All ORIENT variants functional
- Completion sets correct flags
- Smooth transitions to STRUCTURE

### Phase 4: STRUCTURE Components (Week 4)
**Goal:** Implement all STRUCTURE phase variants

**Tasks:**
1. Build `AnnotatableMap` (tired)
2. Update `GuidedMapBuilder` (medium)
3. Verify `ConceptMapBuilder` (high)
4. Add completion handlers
5. Test all variants

**Success Criteria:**
- All STRUCTURE variants functional
- Tired users get pre-built map
- Completion sets correct flags

### Phase 5: ENCODE Components (Week 5)
**Goal:** Implement all ENCODE phase variants

**Tasks:**
1. Build `RetrievalPractice` (tired, returning)
2. Build `MinimalInterferenceEncoding` (tired, new)
3. Adapt `StandardAcquisition` (medium)
4. Build `InterleavedAcquisition` (high)
5. Test all variants

**Success Criteria:**
- Retrieval practice works for returning learners
- Minimal encoding works for new learners
- Interleaving works correctly

### Phase 6: VERIFY Components (Week 6)
**Goal:** Implement all VERIFY phase variants

**Tasks:**
1. Build `RecognitionTasks` (tired)
2. Build `CuedRecall` (medium)
3. Build `FreeRecallTransfer` (high)
4. Implement question generators
5. Test all variants

**Success Criteria:**
- All VERIFY variants functional
- Tired users get recognition tasks (not skipped)
- Testing effect benefits preserved

### Phase 7: COMPLETE & Integration (Week 7)
**Goal:** Complete the flow and integrate everything

**Tasks:**
1. Build `SessionComplete` component
2. Add consolidation priming message
3. Update `VelocityLearning` orchestrator
4. Add `PhaseIndicator` component
5. Integration testing

**Success Criteria:**
- Complete flow works end-to-end
- All mood transitions work
- Progress persists correctly

### Phase 8: Polish & Cleanup (Week 8)
**Goal:** Remove deprecated code and polish UX

**Tasks:**
1. Remove old phase types
2. Remove old completion flags
3. Remove migration code (after 30 days)
4. Add animations and transitions
5. User testing and feedback

**Success Criteria:**
- No deprecated code remains
- Smooth animations
- User satisfaction ≥4.5/5

---

## 13. Rollout Strategy

### 13.1 Feature Flag

```typescript
// Add feature flag for gradual rollout
export const UNIFIED_FLOW_ENABLED = 
  import.meta.env.VITE_UNIFIED_FLOW_ENABLED === 'true';

// In VelocityLearning
export function VelocityLearning() {
  if (UNIFIED_FLOW_ENABLED) {
    return <UnifiedFlowVelocityLearning />;
  }
  return <LegacyVelocityLearning />;
}
```

### 13.2 Gradual Rollout Plan

**Week 1-2:** Internal testing only
- Enable for dev team
- Test all mood combinations
- Fix critical bugs

**Week 3-4:** Beta testing (10% of users)
- Enable for opted-in beta users
- Collect feedback
- Monitor metrics

**Week 5-6:** Expanded rollout (50% of users)
- Enable for half of user base
- A/B test against old flow
- Compare completion rates

**Week 7-8:** Full rollout (100% of users)
- Enable for all users
- Monitor for issues
- Prepare to remove old code

**Week 9+:** Cleanup
- Remove feature flag
- Remove old flow code
- Remove migration code (after 30 days)

---

## 14. Success Metrics

### 14.1 Technical Metrics

- **Migration Success Rate:** 100% of sessions migrate without data loss
- **Phase Determination Performance:** <50ms
- **Component Load Time:** <100ms per phase
- **Memory Usage:** No increase vs. old flow

### 14.2 User Experience Metrics

- **Progress Preservation:** 100% of users retain progress across mood changes
- **Phase Completion Rate:** ≥90% for all phases, all moods
- **Session Resumption Rate:** +30% vs. old flow
- **User Satisfaction:** ≥4.5/5 for flow coherence

### 14.3 Learning Effectiveness Metrics

- **Tired User Completion:** +20% vs. old flow
- **Concept Retention:** +15% (measured 7 days later)
- **Retrieval Practice Usage:** 100% of tired returning learners
- **Testing Effect Benefit:** Measurable improvement in VERIFY phase

---

## 15. Risk Mitigation

### 15.1 Data Loss Risk
**Mitigation:**
- Comprehensive migration tests
- Validation after migration
- Keep old fields during transition
- Backup before migration

### 15.2 Performance Risk
**Mitigation:**
- Memoization of expensive calculations
- Lazy loading of components
- Performance monitoring
- Rollback plan if issues

### 15.3 User Confusion Risk
**Mitigation:**
- Clear onboarding for new flow
- Visual indicators of changes
- Help documentation
- Support for questions

### 15.4 Incomplete Component Risk
**Mitigation:**
- Fallback components
- Graceful degradation
- Clear error messages
- Feature flag for rollback

---

## 16. Future Enhancements

### 16.1 Time-of-Day Optimization
Add `timeContext` to distinguish morning (post-sleep) from evening (pre-sleep) tired states for even better adaptation.

### 16.2 Adaptive Phase Duration
Adjust phase duration based on user performance and engagement.

### 16.3 Personalized Recommendations
Use ML to recommend optimal mood-method combinations for each user.

### 16.4 Cross-Device Sync
Sync phase progress across devices for seamless learning.

---

## 17. Conclusion

This design implements a neuroscience-grounded learning flow that:
- Respects cognitive science principles
- Preserves progress across mood changes
- Provides value at every energy level
- Scales to future enhancements

The architecture is modular, testable, and maintainable, with clear separation between phase logic (what) and method selection (how).

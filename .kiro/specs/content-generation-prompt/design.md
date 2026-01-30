# Design Document

## Overview

This design specifies a multi-phase prompt architecture for generating structured learning content using Claude AI. The system replaces the current monolithic 4000-line prompt with three focused phases that prevent hallucination, eliminate circular definitions, and generate only the content actually consumed by the application's 4 main features.

## Architecture

### High-Level Flow

```
User Input (Subject) 
  ↓
Phase 1: Domain Analysis (Claude Sonnet 4)
  → Generates: Concept names, tiers, dependencies
  → Output: JSON with 20-50 concepts
  ↓
Phase 2: Content Generation (Claude Sonnet 4, batched)
  → Generates: SHAPE framework, lifecycle phases, mnemonics
  → Output: JSON with full concept details
  ↓
Phase 3: Validation (Claude Haiku)
  → Validates: No circular definitions, no compound words, valid dependencies
  → Output: Validation report + regeneration targets
  ↓
Storage (DynamoDB + S3)
```

### Phase Separation Rationale

**Why 3 phases instead of 1?**
1. **Focused prompts** = less hallucination (each phase has single responsibility)
2. **Incremental validation** = catch errors early before expensive content generation
3. **Partial recovery** = if Phase 2 fails, Phase 1 results are preserved
4. **Cost optimization** = use cheaper model (Haiku) for validation
5. **Testability** = each phase has clear inputs/outputs for property testing

## Components and Interfaces

### Phase 1: Domain Analysis Prompt

**Purpose:** Analyze subject domain and identify core concepts with dependencies.

**Input:**
```typescript
interface Phase1Input {
  subject: string;           // e.g., "AWS Solutions Architect"
  targetConceptCount?: number; // Default: 35
  focusAreas?: string[];     // e.g., ["certification", "practical"]
}
```

**Output:**
```typescript
interface Phase1Output {
  domain: string;
  concepts: Array<{
    name: string;
    tier: 'foundation' | 'keystone' | 'utility';
    dependsOn: string[];     // Concept names only
  }>;
  lifecycle: {
    phase1: string;          // e.g., "PROVISION"
    phase2: string;          // e.g., "CONFIGURE"
    phase3: string;          // e.g., "MONITOR"
  };
}
```

**Prompt Structure (Pseudocode):**
```
You are analyzing the domain: {subject}

Task: Identify 20-50 core concepts that professionals must know.

For each concept:
1. Name: Clear, specific concept name
2. Tier: Classify as foundation/keystone/utility
   - Foundation: Core building blocks (20-30%)
   - Keystone: Connecting concepts (30-40%)
   - Utility: Specialized tools (30-40%)
3. Dependencies: List concept names this depends on

Output format: JSON
Constraints:
- Concept names must be unique
- Dependencies must reference other concepts in the list
- No circular dependencies
- Foundation concepts should have 0-2 dependencies
- Keystone concepts should depend on foundation concepts
- Utility concepts should depend on keystone or foundation concepts
```


### Phase 2: Content Generation Prompt

**Purpose:** Generate detailed educational content for each concept.

**Input:**
```typescript
interface Phase2Input {
  concepts: Phase1Output['concepts'];  // From Phase 1
  lifecycle: Phase1Output['lifecycle'];
  batchSize: number;                   // Default: 10 concepts per batch
}
```

**Output:**
```typescript
interface Phase2Output {
  concepts: Array<{
    name: string;
    tier: 'foundation' | 'keystone' | 'utility';
    dependsOn: string[];
    
    // SHAPE Framework
    shape: {
      simpleCore: string;              // One sentence, zero jargon
      highStakesExample: string;       // Real company + year + impact
      analogicalModel: string;         // Physical metaphor
      patternRecognition: {
        question: string;
        answer: string;
      };
      eliminationLogic: string;        // How to eliminate wrong answers
    };
    
    // Lifecycle Phases
    lifecycle: {
      phase1: {                        // e.g., PROVISION
        hookSentence: string;
        prerequisite: string;
        execution: string;
      };
      phase2: string[];                // e.g., CONFIGURE steps
      phase3: {                        // e.g., MONITOR
        tool: string;
        metrics: string[];
      };
    };
    
    // Memory Palace
    mnemonic: {
      tier: 'foundation' | 'keystone' | 'utility';
      anchor: string;                  // e.g., "Volcano 🌋"
      story: string;                   // Vivid scene
      parentName?: string;
    };
    
    // Practice Questions (optional)
    practiceQuestions?: Array<{
      question: string;
      choices: string[];               // Exactly 4
      correctIndex: number;            // 0-3
      explanation: string;
    }>;
  }>;
}
```

**Prompt Structure (Pseudocode):**
```
You are generating educational content for these concepts:
{conceptList}

For each concept, generate:

1. SHAPE Framework:
   - simpleCore: One sentence explanation with ZERO jargon
     ❌ BAD: "RLS is row-level security"
     ✅ GOOD: "A filter that automatically hides rows based on who's logged in"
   
   - highStakesExample: Real company + year + specific impact
     ✅ "In 2019, Capital One's breach exposed 100M records due to misconfigured access"
   
   - analogicalModel: Map to familiar physical system
     ✅ "Think of Lambda like a restaurant kitchen: you're the chef (code), AWS handles equipment (infrastructure)"
   
   - patternRecognition: Self-test question + answer
   - eliminationLogic: How to eliminate wrong answers

2. Lifecycle Phases ({phase1}, {phase2}, {phase3}):
   - Phase 1: What enables this? What to select? How to begin?
   - Phase 2: Configuration steps (list of actions)
   - Phase 3: How to verify? What metrics? What thresholds?

3. Mnemonic Anchor:
   - Select a CONCRETE PHYSICAL OBJECT (not the concept name!)
   - Include appropriate emoji
   - Write vivid story connecting anchor to concept function
   
   ❌ BAD: "API Gateway" → "Gateway 🚪" (uses concept name)
   ❌ BAD: "Virtual Network" → "Network Network+" (compound word)
   ✅ GOOD: "Virtual Network" → "Volcano 🌋" (isolated channels like lava flows)

CRITICAL RULES:
- simpleCore must NOT contain the concept name
- hookSentence must NOT repeat the concept name
- Mnemonic anchor must NOT be a substring of concept name
- Mnemonic anchor must NOT be a compound word (X X+, X (X + Y))
- All fields must be substantive (no "TBD", "See docs", etc.)

Output format: JSON
```


### Phase 3: Validation Prompt

**Purpose:** Validate generated content and identify issues for regeneration.

**Input:**
```typescript
interface Phase3Input {
  concepts: Phase2Output['concepts'];
}
```

**Output:**
```typescript
interface Phase3Output {
  valid: boolean;
  score: number;                       // 0-100
  issues: Array<{
    conceptName: string;
    field: string;                     // e.g., "shape.simpleCore"
    issue: string;                     // e.g., "circular_definition"
    severity: 'error' | 'warning';
  }>;
  confusionPairs: Array<{
    conceptA: string;
    conceptB: string;
    distinctionKey: string;
    whenToUseA: string;
    whenToUseB: string;
  }>;
}
```

**Prompt Structure (Pseudocode):**
```
You are validating generated learning content.

For each concept, check:

1. Required Fields:
   - All SHAPE fields present and non-empty
   - All lifecycle phases present
   - Mnemonic anchor present

2. Circular Definitions:
   - hookSentence does NOT contain concept name
   - shape.simpleCore does NOT contain concept name
   - No patterns like "X is X" or "X provides X functionality"

3. Mnemonic Quality:
   - Anchor is NOT a compound word (X X+, X (X + Y))
   - Anchor is NOT substring of concept name
   - Anchor includes emoji
   - Story is substantive (>50 characters)

4. Dependencies:
   - All dependsOn references exist in concept list
   - No circular dependencies
   - Tier hierarchy respected (foundation → keystone → utility)

5. Confusion Pairs:
   - Identify 3-5 concept pairs with similar names or overlapping functions
   - For each pair, provide distinction key and usage guidance

Output format: JSON with issues array and confusionPairs array
```

## Data Models

### LearningConcept (Final Output)

```typescript
interface LearningConcept {
  id: string;                          // Generated UUID
  name: string;
  stageId: string;                     // Assigned based on tier
  order: number;
  tier: 'foundation' | 'keystone' | 'utility';
  cognitiveLevel: 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';
  lifecyclePhase: 'PREPARE' | 'MODEL' | 'DELIVER';
  dependencies: string[];              // Concept IDs (resolved from names)
  outdegree: number;                   // Calculated from other concepts' dependencies
  
  // Content
  hookSentence: string;
  whyYouNeed: string;
  shape: ShapeContent;
  lifecycle: ConceptLifecycle;
  mnemonic: MnemonicContext;
  
  // Optional
  practiceQuestions?: PracticeQuestion[];
  commonPitfalls?: string[];
}
```

### Validation Rules

**Circular Definition Detection:**
```typescript
function hasCircularDefinition(conceptName: string, text: string): boolean {
  const normalized = conceptName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const textNormalized = text.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  // Check if concept name appears in text
  if (textNormalized.includes(normalized)) {
    return true;
  }
  
  // Check for patterns like "X is X" or "X provides X"
  const patterns = [
    new RegExp(`${normalized}\\s+is\\s+${normalized}`, 'i'),
    new RegExp(`${normalized}\\s+provides\\s+${normalized}`, 'i'),
    new RegExp(`${normalized}\\s+enables\\s+${normalized}`, 'i'),
  ];
  
  return patterns.some(pattern => pattern.test(text));
}
```

**Compound Word Detection:**
```typescript
function isCompoundWord(anchor: string): boolean {
  // Patterns: "X X+", "X (X + Y)", "X X"
  const patterns = [
    /(\w+)\s+\1\+/,                    // "House House+"
    /(\w+)\s+\((\1)\s+\+/,             // "Castle (Castle +"
    /(\w+)\s+\1\s/,                    // "Network Network "
  ];
  
  return patterns.some(pattern => pattern.test(anchor));
}
```

**Dependency Cycle Detection:**
```typescript
function hasCycle(concepts: Concept[]): boolean {
  const graph = buildGraph(concepts);
  const visited = new Set<string>();
  const recStack = new Set<string>();
  
  function dfs(node: string): boolean {
    visited.add(node);
    recStack.add(node);
    
    for (const neighbor of graph.get(node) || []) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true;
      } else if (recStack.has(neighbor)) {
        return true;  // Cycle detected
      }
    }
    
    recStack.delete(node);
    return false;
  }
  
  for (const concept of concepts) {
    if (!visited.has(concept.name)) {
      if (dfs(concept.name)) return true;
    }
  }
  
  return false;
}
```


## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Phase Data Flow

*For any* completed Phase 1 execution, the Phase 1 output should be passed as input to Phase 2, and Phase 2 output should be passed as input to Phase 3.

**Validates: Requirements 1.2, 1.3**

### Property 2: Validation Before Progression

*For any* phase execution, validation must complete successfully before proceeding to the next phase.

**Validates: Requirements 1.4**

### Property 3: Isolated Phase Regeneration

*For any* validation failure in a specific phase, only that phase should regenerate (not all phases).

**Validates: Requirements 1.5**

### Property 4: Phase 1 Concept Count

*For any* Phase 1 execution, the output should contain between 20 and 50 concepts.

**Validates: Requirements 2.1**

### Property 5: Single Tier Classification

*For any* generated concept, it should have exactly one tier value from the set {foundation, keystone, utility}.

**Validates: Requirements 2.2**

### Property 6: Valid Dependency References

*For any* concept dependency, the target should be a valid concept name that exists in the generated concept list.

**Validates: Requirements 2.3**

### Property 7: Phase 1 Content Minimalism

*For any* Phase 1 output, detailed content fields (SHAPE framework, lifecycle phases, mnemonic stories) should be absent.

**Validates: Requirements 2.4**

### Property 8: Phase 1 JSON Validity

*For any* Phase 1 output, it should parse as valid JSON and match the DomainAnalysis schema.

**Validates: Requirements 2.5**

### Property 9: SHAPE Framework Completeness

*For any* Phase 2 concept output, all five SHAPE fields (simpleCore, highStakesExample, analogicalModel, patternRecognition, eliminationLogic) should be present and non-empty.

**Validates: Requirements 3.2**

### Property 10: Lifecycle Phase Completeness

*For any* Phase 2 concept output, all three lifecycle phases (phase1, phase2, phase3) should be present and non-empty.

**Validates: Requirements 3.3**

### Property 11: No Compound Word Anchors

*For any* mnemonic anchor, it should not match compound word patterns like "X X+", "X (X + Y)", or "X X".

**Validates: Requirements 3.4, 4.2**

### Property 12: No Circular Definitions

*For any* concept, the hookSentence and shape.simpleCore fields should not contain the concept name.

**Validates: Requirements 3.5, 5.1, 5.3**

### Property 13: Phase 2 JSON Validity

*For any* Phase 2 output, it should parse as valid JSON and match the ContentGeneration schema.

**Validates: Requirements 3.6**

### Property 14: Anchor Not Substring of Concept Name

*For any* mnemonic anchor, it should not be a substring of the concept name (case-insensitive).

**Validates: Requirements 4.3**

### Property 15: Anchor Contains Emoji

*For any* mnemonic anchor, it should contain at least one emoji character.

**Validates: Requirements 4.4**

### Property 16: Mnemonic Story Minimum Length

*For any* mnemonic story, it should be at least 50 characters long.

**Validates: Requirements 4.5**

### Property 17: Validation Regeneration Trigger

*For any* concept with circular definition detected by validation, the validation system should flag that field for regeneration.

**Validates: Requirements 5.4**

### Property 18: Required Field Validation

*For any* Phase 3 validation run, it should check that all required fields (SHAPE, lifecycle, mnemonic) exist and are non-empty.

**Validates: Requirements 6.1**

### Property 19: Circular Definition Detection

*For any* concept with circular definition in hookSentence or simpleCore, Phase 3 validation should detect and report it.

**Validates: Requirements 6.2**

### Property 20: Compound Word Detection

*For any* concept with compound word anchor, Phase 3 validation should detect and report it.

**Validates: Requirements 6.3**

### Property 21: Dependency Existence Validation

*For any* concept dependency, Phase 3 validation should verify the target concept exists in the concept list.

**Validates: Requirements 6.4**

### Property 22: Specific Error Messages

*For any* validation failure, the error message should identify the specific field that failed and the reason.

**Validates: Requirements 6.5**

### Property 23: No Extra Fields

*For any* generated concept, it should not contain fields beyond those defined in the LearningConcept interface.

**Validates: Requirements 7.1, 7.2**

### Property 24: Practice Questions Only for Apply Level

*For any* concept with cognitiveLevel below "apply", it should not have practice questions.

**Validates: Requirements 7.4**

### Property 25: Optional Field Skipping

*For any* generation request without optional field flags, those optional fields should be absent from the output.

**Validates: Requirements 7.5**

### Property 26: Circular Dependency Detection

*For any* dependency graph with cycles, Phase 3 validation should detect and report them.

**Validates: Requirements 8.1**

### Property 27: Foundation Dependency Limit

*For any* foundation tier concept, it should have at most 2 dependencies.

**Validates: Requirements 8.2**

### Property 28: Keystone Depends on Foundation

*For any* keystone tier concept, all its dependencies should be foundation tier concepts.

**Validates: Requirements 8.3**

### Property 29: Utility Depends on Keystone or Foundation

*For any* utility tier concept, all its dependencies should be keystone or foundation tier concepts.

**Validates: Requirements 8.4**

### Property 30: Cycle Breaking Removes One Edge

*For any* circular dependency detected, the cycle-breaking algorithm should remove exactly one edge (the lowest confidence).

**Validates: Requirements 8.5**

### Property 31: Confusion Pair Count

*For any* Phase 3 execution, the output should contain between 3 and 5 confusion pairs.

**Validates: Requirements 9.1**

### Property 32: Confusion Pair Distinction Key

*For any* confusion pair, it should have a non-empty distinctionKey field.

**Validates: Requirements 9.2**

### Property 33: Confusion Pair Usage Guidance

*For any* confusion pair, it should have both whenToUseA and whenToUseB fields populated with non-empty strings.

**Validates: Requirements 9.3**

### Property 34: Confusion Pair Similarity Threshold

*For any* confusion pair, the similarity score between the two concepts should be above 0.6 (60% similar).

**Validates: Requirements 9.4**

### Property 35: Confusion Pairs JSON Validity

*For any* confusion pairs output, it should parse as valid JSON.

**Validates: Requirements 9.5**

### Property 36: Practice Question Count

*For any* concept with practice questions, it should have between 2 and 4 questions.

**Validates: Requirements 10.1**

### Property 37: Four Answer Choices

*For any* practice question, it should have exactly 4 answer choices.

**Validates: Requirements 10.2**

### Property 38: One Correct Answer

*For any* practice question, exactly one answer choice should be marked as correct.

**Validates: Requirements 10.3**

### Property 39: Correct Answer Explanation

*For any* practice question, the correct answer should have a non-empty explanation.

**Validates: Requirements 10.4**

### Property 40: Wrong Answer Explanations

*For any* practice question, each wrong answer should have a non-empty explanation.

**Validates: Requirements 10.5**

### Property 41: Skip Regeneration for High Scores

*For any* validation run with score greater than 90%, regeneration should not occur.

**Validates: Requirements 11.4**

### Property 42: Cost Estimate Provided

*For any* generation request, a cost estimate should be returned before execution begins.

**Validates: Requirements 11.5**

### Property 43: Partial Completion Saves

*For any* Phase 2 execution that generates N concepts then fails, the N completed concepts should be saved.

**Validates: Requirements 12.1**

### Property 44: Retry Targets Missing Concepts

*For any* partial generation with M missing concepts, the retry operation should target only those M concepts.

**Validates: Requirements 12.2**

### Property 45: Retry Merge Preserves Existing

*For any* successful retry, the final result should contain both the original concepts and the newly generated concepts.

**Validates: Requirements 12.3**

### Property 46: Failed Retry Marks Pending

*For any* retry that fails 3 times, the missing concepts should be marked with status "pending".

**Validates: Requirements 12.4**


## Error Handling

### Phase Failure Recovery

**Scenario:** Phase 2 generates 40/47 concepts then fails

**Recovery Strategy:**
1. Save the 40 completed concepts to temporary storage
2. Present user with options:
   - "Retry missing 7 concepts"
   - "Continue with 40 concepts"
   - "Start over"
3. If retry selected:
   - Call Phase 2 with only the 7 missing concept names
   - Merge results with the 40 existing concepts
   - Validate merged result
4. If retry fails 3 times:
   - Mark missing concepts as "pending"
   - Allow user to continue with partial content
   - Schedule background job to retry later

### Validation Failure Recovery

**Scenario:** Phase 3 detects circular definitions in 5 concepts

**Recovery Strategy:**
1. Extract the 5 problematic concepts
2. Call Phase 2 again with only those 5 concepts
3. Use more explicit anti-circular instructions in prompt
4. Validate regenerated concepts
5. If still failing after 2 attempts:
   - Flag concepts for manual review
   - Continue with remaining valid concepts

### Circular Dependency Recovery

**Scenario:** Dependency graph has cycle: A → B → C → A

**Recovery Strategy:**
1. Detect cycle using DFS algorithm
2. Calculate confidence score for each edge in cycle
3. Remove edge with lowest confidence
4. Re-validate graph
5. If multiple cycles exist, repeat until acyclic

### API Rate Limit Handling

**Scenario:** Claude API returns 429 Too Many Requests

**Recovery Strategy:**
1. Exponential backoff: 2s, 4s, 8s, 16s, 32s
2. After 5 retries, show user:
   - "API rate limit exceeded. Try again in 5 minutes?"
   - Option to save draft and resume later
3. Store generation state in localStorage
4. On resume, check which phases completed and continue from there

## Testing Strategy

### Unit Tests

Unit tests verify specific examples and edge cases:

**Example: Circular Definition Detection**
```typescript
describe('hasCircularDefinition', () => {
  it('detects concept name in definition', () => {
    expect(hasCircularDefinition('API Gateway', 'API Gateway is a gateway for APIs')).toBe(true);
  });
  
  it('detects "X is X" pattern', () => {
    expect(hasCircularDefinition('Load Balancer', 'Load Balancer is a load balancer')).toBe(true);
  });
  
  it('allows valid definition', () => {
    expect(hasCircularDefinition('Load Balancer', 'Distributes traffic across multiple servers')).toBe(false);
  });
});
```

**Example: Compound Word Detection**
```typescript
describe('isCompoundWord', () => {
  it('detects "X X+" pattern', () => {
    expect(isCompoundWord('House House+')).toBe(true);
  });
  
  it('detects "X (X + Y)" pattern', () => {
    expect(isCompoundWord('Castle (Castle + Scroll)')).toBe(true);
  });
  
  it('allows valid anchor', () => {
    expect(isCompoundWord('Volcano 🌋')).toBe(false);
  });
});
```

**Example: Dependency Cycle Detection**
```typescript
describe('hasCycle', () => {
  it('detects simple cycle', () => {
    const concepts = [
      { name: 'A', dependsOn: ['B'] },
      { name: 'B', dependsOn: ['C'] },
      { name: 'C', dependsOn: ['A'] },
    ];
    expect(hasCycle(concepts)).toBe(true);
  });
  
  it('allows acyclic graph', () => {
    const concepts = [
      { name: 'A', dependsOn: [] },
      { name: 'B', dependsOn: ['A'] },
      { name: 'C', dependsOn: ['A', 'B'] },
    ];
    expect(hasCycle(concepts)).toBe(false);
  });
});
```

### Property-Based Tests

Property tests verify universal properties across all inputs using fast-check library:

**Property 1: Phase Data Flow**
```typescript
import fc from 'fast-check';

describe('Property: Phase Data Flow', () => {
  it('Phase 1 output is passed to Phase 2', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          subject: fc.string({ minLength: 3, maxLength: 50 }),
          targetConceptCount: fc.integer({ min: 20, max: 50 }),
        }),
        async (input) => {
          const phase1Output = await executePhase1(input);
          const phase2Input = capturePhase2Input();
          
          expect(phase2Input.concepts).toEqual(phase1Output.concepts);
          expect(phase2Input.lifecycle).toEqual(phase1Output.lifecycle);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

**Property 12: No Circular Definitions**
```typescript
describe('Property: No Circular Definitions', () => {
  it('hookSentence and simpleCore do not contain concept name', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.record({
          name: fc.string({ minLength: 5, maxLength: 30 }),
          tier: fc.constantFrom('foundation', 'keystone', 'utility'),
        }), { minLength: 20, maxLength: 50 }),
        async (concepts) => {
          const phase2Output = await executePhase2({ concepts });
          
          for (const concept of phase2Output.concepts) {
            expect(hasCircularDefinition(concept.name, concept.hookSentence)).toBe(false);
            expect(hasCircularDefinition(concept.name, concept.shape.simpleCore)).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

**Property 11: No Compound Word Anchors**
```typescript
describe('Property: No Compound Word Anchors', () => {
  it('mnemonic anchors are not compound words', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.record({
          name: fc.string({ minLength: 5, maxLength: 30 }),
          tier: fc.constantFrom('foundation', 'keystone', 'utility'),
        }), { minLength: 20, maxLength: 50 }),
        async (concepts) => {
          const phase2Output = await executePhase2({ concepts });
          
          for (const concept of phase2Output.concepts) {
            expect(isCompoundWord(concept.mnemonic.anchor)).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

**Property 26: Circular Dependency Detection**
```typescript
describe('Property: Circular Dependency Detection', () => {
  it('validation detects cycles in dependency graph', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.record({
          name: fc.string({ minLength: 5, maxLength: 30 }),
          dependsOn: fc.array(fc.string(), { maxLength: 3 }),
        }), { minLength: 10, maxLength: 30 }),
        async (concepts) => {
          // Inject a cycle
          if (concepts.length >= 3) {
            concepts[0].dependsOn = [concepts[1].name];
            concepts[1].dependsOn = [concepts[2].name];
            concepts[2].dependsOn = [concepts[0].name];
          }
          
          const phase3Output = await executePhase3({ concepts });
          
          const hasCycleIssue = phase3Output.issues.some(
            issue => issue.issue === 'circular_dependency'
          );
          expect(hasCycleIssue).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Test Configuration

All property-based tests should:
- Run minimum 100 iterations (due to randomization)
- Tag with feature name and property number
- Reference design document property
- Use fast-check library for input generation

**Example Tag Format:**
```typescript
// Feature: content-generation-prompt, Property 12: No Circular Definitions
```

### Integration Tests

Integration tests verify end-to-end flow:

**Test: Complete Generation Flow**
```typescript
describe('Integration: Complete Generation', () => {
  it('generates valid content from subject to storage', async () => {
    const input = { subject: 'AWS Lambda', targetConceptCount: 30 };
    
    // Phase 1
    const phase1Output = await executePhase1(input);
    expect(phase1Output.concepts.length).toBeGreaterThanOrEqual(20);
    expect(phase1Output.concepts.length).toBeLessThanOrEqual(50);
    
    // Phase 2
    const phase2Output = await executePhase2(phase1Output);
    expect(phase2Output.concepts.length).toBe(phase1Output.concepts.length);
    
    // Phase 3
    const phase3Output = await executePhase3(phase2Output);
    expect(phase3Output.valid).toBe(true);
    expect(phase3Output.issues.length).toBe(0);
    
    // Storage
    const stored = await saveToStorage(phase2Output);
    expect(stored.success).toBe(true);
  });
});
```

### Manual Testing Checklist

Before deploying to production:

- [ ] Generate content for 5 different subjects (AWS, Azure, Kubernetes, Python, React)
- [ ] Verify no circular definitions in any concept
- [ ] Verify no compound word anchors in any concept
- [ ] Verify all mnemonic anchors are visual metaphors
- [ ] Verify dependency graphs are acyclic
- [ ] Verify confusion pairs make sense
- [ ] Verify practice questions have 4 choices and explanations
- [ ] Test partial failure recovery (kill Phase 2 mid-execution)
- [ ] Test validation failure recovery (inject bad data)
- [ ] Test API rate limit handling (simulate 429 errors)
- [ ] Verify cost estimates are accurate (±10%)
- [ ] Test caching (generate same subject twice, verify cache hit)


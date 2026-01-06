# System Prompt Silver Bullet Update Plan

## Executive Summary

After comprehensive scanning of your app architecture, I've identified **7 high-impact, zero-risk updates** to `SYSTEM_PROMPT_V4` that directly align generated content with your existing parsers, UI components, and testing systems.

---

## Gap Analysis Matrix

| App Component | Expects | System Prompt Currently Produces | Gap |
|--------------|---------|----------------------------------|-----|
| `ConceptCard.tsx` | `hookSentence`, `metaphor`, `whyYouNeed` | Verbose paragraphs | ⚠️ Requires transformer guessing |
| `ConfusionDrill.tsx` | `ConfusionPair[]` with `distinctionKey` | Decision Framework Trees (loose) | ⚠️ Missing dedicated output |
| `sprint-generator.ts` | Binary YES/NO patterns | No binary patterns | ⚠️ AI invents from scratch |
| `diagnostic-generator.ts` | `difficulty` tiers per concept | No difficulty markers | ⚠️ Generic distribution |
| `transformer.ts` | 5-8 concepts per stage | "4-6 stages" (no distribution rule) | ⚠️ Imbalanced stages |
| `parser.ts` | SHAPE sections (S/H/A/P/E) | SHAPE in batch prompt only | ⚠️ Not in base prompt |
| Learning Types | `lifecycle.phase1.steps[]` | Free-form bullets | ⚠️ Inconsistent extraction |

---

## Silver Bullet Updates (Implementation Ready)

### 1. ✅ ADD CONFUSION PAIRS OUTPUT (Step 5.5)

**Why**: Your `ConfusionDrill.tsx` and `confusion-generator.ts` need pre-identified pairs. Currently the AI generates these from scratch at runtime.

**Insert After**: Step 5 (Worked Example)

```markdown
## STEP 5.5: CONFUSION PAIRS [DISCRIMINATION READINESS]

Identify 3-5 pairs of concepts from the Master Chart that learners commonly confuse. For each pair:

**OUTPUT FORMAT (JSON Block):**
```json
{
  "confusionPairs": [
    {
      "id": "conf-1",
      "conceptA": "Concept Name A",
      "conceptB": "Concept Name B",
      "distinctionKey": "The ONE question that reveals which applies",
      "whenToUseA": "Choose A when [specific scenario]",
      "whenToUseB": "Choose B when [specific scenario]"
    }
  ]
}
```

**SELECTION CRITERIA:**
- Concepts that share similar names or functions
- Concepts from the same lifecycle phase
- Concepts frequently tested together in exams

**POSITIVE FRAMING:**
- ✅ "Choose A when you need [capability]"
- ✅ "B excels at [specific function]"
- ❌ "Don't use A if..." / "A fails when..."
```

**Impact**: Pre-populates confusion pairs → faster ConfusionDrill load → better Sprint discrimination questions

---

### 2. ✅ ENFORCE STAGE DISTRIBUTION RULE (Step 7 Update)

**Why**: Your `transformToLearningStages()` distributes concepts evenly, but the prompt doesn't enforce balance, causing lopsided Journey Maps.

**Replace in Step 7**:

**Current**:
> "Define a suggested study sequence that organizes concepts into **4-6 progressive stages**. Each stage should contain 5-8 related concepts."

**New**:
```markdown
Define a suggested study sequence that organizes ALL concepts into exactly **4-6 progressive stages**.

**MANDATORY DISTRIBUTION RULE:**
| Total Concepts | Stage Count | Concepts Per Stage |
|----------------|-------------|-------------------|
| 15-20          | 4 stages    | 4-5 each          |
| 21-28          | 5 stages    | 4-6 each          |
| 29-35          | 6 stages    | 5-6 each          |

**VALIDATION:**
- No stage may have fewer than 3 concepts
- No stage may have more than 8 concepts
- All concepts MUST be assigned to exactly one stage
```

**Impact**: Balanced Journey Maps → better UX → consistent celebration cadence

---

### 3. ✅ ADD BINARY PATTERN RULES (Step 4 Enhancement)

**Why**: Your Sprint tests binary YES/NO decisions in 6 seconds. Adding pattern rules gives the AI pre-structured material.

**Add to Step 4 (Visual Mental Anchors)**, as 4th component for each anchor:

```markdown
4. **Binary Decision Rule (For Sprint Testing):**
   • A single YES/NO decision rule that distinguishes this anchor's concepts
   • Format: "If [condition], YES → [concept]. Otherwise, consider [alternative]."
   • Must be answerable in under 6 seconds
   • Example: "If you need cross-region traffic distribution, YES → use Global Accelerator. Otherwise, consider regional Load Balancers."
```

**Impact**: Sprint question generation draws from structured patterns → higher quality discrimination questions

---

### 4. ✅ ADD HOOK SENTENCE + MICRO-METAPHOR (Step 3 Update)

**Why**: Your `LearningConcept` type has `hookSentence` and `metaphor` fields. Currently `transformer.ts` generates these with fallback logic.

**Update Step 3, Foundation Level (Phase 1)**:

**Current**:
```markdown
* **Foundation Level (Phase 1): The "Blueprint Pattern"**
   - Prerequisite: (What enables this? If nothing required, write "[None]")
   - Selection: (Which type/approach best serves the goal?)
   - Execution: (The specific Tool/Form/Process/Document to begin)
```

**New**:
```markdown
* **Foundation Level (Phase 1): The "Blueprint Pattern"**
   - **Hook Sentence**: A compelling 10-15 word sentence that makes the learner want to know more
   - **Micro-Metaphor**: A 3-5 word physical analogy (e.g., "The traffic cop at the intersection")
   - Prerequisite: (What enables this? If nothing required, write "[None]")
   - Selection: (Which type/approach best serves the goal?)
   - Execution: (The specific Tool/Form/Process/Document to begin)
```

**Impact**: Parser extracts directly → no fallback guessing → consistent card quality

---

### 5. ✅ ADD DIFFICULTY TIERS (Step 7 Enhancement)

**Why**: Your `DiagnosticModal` uses difficulty for personalization. Your `getConceptsToSkip()` needs tier data.

**Add to Step 7 stage structure**:

```markdown
**STRUCTURE FOR EACH STAGE:**
1. **Stage Name & Order:** Clear numbering and descriptive title
2. **Concepts Included:** List with difficulty markers
   - 🟢 [Concept Name] - foundational (terminology/basics)
   - 🟡 [Concept Name] - intermediate (relationships/application)
   - 🔴 [Concept Name] - advanced (edge cases/optimization)
3. **Difficulty Profile:** e.g., "60% foundational, 30% intermediate, 10% advanced"
4. **Capabilities Gained:** What the learner can now do
5. **Narrative Handshake:** Bridge to previous stage
```

**Impact**: Diagnostic skips known concepts → personalized learning path → faster time-to-sprint

---

### 6. ✅ ELEVATE SHAPE FRAMEWORK TO BASE PROMPT (Step 3.5)

**Why**: SHAPE (Simple/High-Stakes/Analogical/Pattern/Elimination) is in your batch generation prompt but not the base system prompt. This creates inconsistency.

**Add as Step 3.5** (after Master Hierarchical Chart):

```markdown
## STEP 3.5: SHAPE MICRO-LEARNING FORMAT [REQUIRED FOR EACH CONCEPT]

Every concept in the Master Chart MUST include SHAPE sections designed for 2-minute learning:

**S - SIMPLE CORE** (15 seconds)
One sentence, no jargon. A beginner could repeat it.

**H - HIGH-STAKES EXAMPLE** (30 seconds)
Real company + year + specific numbers or human impact.

**A - ANALOGICAL MODEL** (45 seconds)
Map 3-4 technical terms to a familiar physical system.

**P - PATTERN RECOGNITION** (20 seconds)
"You know you've mastered this when you can answer: [question]"
Answer: [immediate answer below]

**E - ELIMINATION LOGIC** (10 seconds)
"⚠️ Don't confuse [X] with [Y]: [key difference]"

**QUALITY GATE:** Concepts without complete SHAPE sections will be rejected.
```

**Impact**: Consistent 2-minute learning cards → parser reliability → better speed reader pacing

---

### 7. ✅ ADD PREREQUISITE CHAIN MARKERS (Step 3 Enhancement)

**Why**: Your `extractPrerequisites()` in `transformer.ts` tries to infer prerequisites from text. Explicit markers improve accuracy.

**Update Step 3, add to Foundation Level**:

```markdown
   - Prerequisite: (What enables this? Use format: "[ConceptName]" for internal deps, "[None]" if first concept)
     Example: "[Azure Active Directory]" or "[None]"
```

**Impact**: Accurate dependency graph → proper concept unlocking → no orphan concepts

---

## Implementation Sequence

```
Priority 1 (Parser Alignment):
├── #4 Hook Sentence + Micro-Metaphor
├── #6 SHAPE Framework Elevation  
└── #7 Prerequisite Chain Markers

Priority 2 (Learning Path Quality):
├── #2 Stage Distribution Rule
└── #5 Difficulty Tiers

Priority 3 (Testing Systems):
├── #1 Confusion Pairs Output
└── #3 Binary Pattern Rules
```

---

## Risk Assessment

| Update | Breaking Change Risk | Parser Change Needed | Recommendation |
|--------|---------------------|---------------------|----------------|
| #1 Confusion Pairs | ✅ None | No - new section | Implement |
| #2 Distribution Rule | ✅ None | No - clarifies existing | Implement |
| #3 Binary Patterns | ✅ None | No - additive | Implement |
| #4 Hook/Metaphor | ✅ None | Minor - new extraction | Implement |
| #5 Difficulty Tiers | ✅ None | Minor - new field | Implement |
| #6 SHAPE Elevation | ✅ None | Already exists | Implement |
| #7 Prerequisite Markers | ✅ None | Improves existing | Implement |

**All updates are ADDITIVE or CLARIFYING. None break existing parsing logic.**

---

## Validation Checklist

After implementation, verify:
- [ ] `parser.ts` extracts hookSentence without fallback
- [ ] `parser.ts` extracts difficulty tier from stage output
- [ ] `transformer.ts` generates balanced stage concept counts
- [ ] `confusion-generator.ts` can use pre-generated pairs
- [ ] `sprint-generator.ts` references binary patterns
- [ ] ConceptCard displays SHAPE sections correctly
- [ ] JourneyMap shows balanced stage sizes

---

## Next Steps

1. **Approve this plan** - Confirm updates align with your vision
2. **I will update** `system-prompt.ts` with all 7 changes
3. **Update parser** for new field extraction (hookSentence, difficulty)
4. **Test generation** with a sample subject
5. **Validate UI** displays new structured content

Ready to implement when you confirm.

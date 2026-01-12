"""
SENSA System Prompt for Lambda
This is a Python version of the TypeScript system-prompt.ts
Contains the full learning science for SENSA v2.0
"""

SYSTEM_PROMPT_V4 = """ACT AS: An expert professor and curriculum designer for the subject: {subject}.

OBJECTIVE: Create a "Visual Master Hierarchical Chart" (Structured Outline), "Decision Framework Trees", "Mental Anchor Set", and "Learning Path Sequence" for this subject. PRIORITY: Factual Accuracy, Strict Visual Structure, Positive Cognitive Framing, and Cognitive Load Optimization. You must expose the critical details, dependencies, and specific terminology using capability-focused language.

---

## STEP 2: DEFINE THE LIFECYCLE

Analyze the subject and derive a logical 3-phase operational cycle that authentically represents how professionals work with this content.

**Requirements:**
* Each phase must be a single ACTION VERB in CAPS that is specific to the subject domain
* Phase 1 = Foundation/Setup/Preparation phase (what enables the work)
* Phase 2 = Core Action/Implementation/Execution phase (the primary activity)
* Phase 3 = Verification/Monitoring/Evaluation phase (validation and outcomes)

---

## STEP 3: GENERATE THE MASTER HIERARCHICAL CHART

**CRITICAL FOR SENSA v2.0:** The `tier` field MUST appear at the TOP LEVEL of each concept object.

**TOP-LEVEL CONCEPT STRUCTURE:**

```json
{{
  "id": "concept-001",
  "name": "Concept Name",
  "tier": "foundation" | "keystone" | "utility",
  "stageId": "PREPARE" | "MODEL" | "DELIVER",
  "order": 1,
  "dependencies": [],
  "outdegree": 8,
  "mnemonic": {{ "tier": "Foundation", "anchor": "...", "story": "..." }},
  "phase1": {{ "hookSentence": "...", "microMetaphor": "...", ... }},
  "phase2": [ ... ],
  "phase3": {{ "tool": "...", "metrics": [...], ... }}
}}
```

**TIER CLASSIFICATION RULES:**

| Tier | % of Total | Outdegree | Dependencies |
|------|------------|-----------|---------------|
| **foundation** | 25-30% | ≥ 5 | 0 or only other foundation |
| **keystone** | 30-40% | 2-4 | 2+ foundation |
| **utility** | 35-40% | 0-1 | keystone or utility |

---

## CONTENT DENSITY & POSITIVE FRAMING RULES:

* **Foundation Level (Phase 1): The "Blueprint Pattern"**
   - **Hook Sentence**: A compelling 10-15 word sentence that makes the learner want to know more
   - **Micro-Metaphor**: A 3-5 word physical analogy
   - Prerequisite, Selection, Execution details

* **Configuration Level (Phase 2): The "Capability Pattern"**
   - Use specific action verbs: "Enable", "Configure", "Define", "Establish", "Set", "Apply"
   - Mark important comparisons using **[Critical Distinction]:**
   - Include **[Design Boundary]:** and **[Prerequisite Check]:**

* **Verification Level (Phase 3): The "Evidence Pattern"**
   - Name the exact tool, document, metric, test, or procedure
   - Include specific metrics, deadlines, or thresholds

**POSITIVE FRAMING TRANSFORMATION GUIDE:**

| Negative Statement | Positive Reframe |
|---|---|
| "Cannot change after creation" | "[Design Boundary]: Selection made at creation time" |
| "Requires minimum of X" | "[Prerequisite Check]: Best performance with X or higher" |

---

## STEP 3.5: SHAPE MICRO-LEARNING FORMAT [Required for Each Concept]

Every concept MUST include SHAPE sections designed for 2-minute learning bursts:

**S - SIMPLE CORE** (15 seconds)
One sentence. No jargon. A complete beginner could repeat it.

**H - HIGH-STAKES EXAMPLE** (30 seconds)
A SPECIFIC real-world application. MUST name a real entity (Company, Agency, Historical Event) + Year + Outcome.
BAD: "A large corporation used this..."
GOOD: "SpaceX used this in 2020 to optimize Falcon 9 landing trajectory..."

**A - ANALOGICAL MODEL** (45 seconds)
Map to a familiar system (construction, cooking, sports, etc.)
3-4 specific technical concepts mapped to physical elements.

**P - PATTERN RECOGNITION** (20 seconds)
A self-test question: "You know you've mastered this when you can answer:"
Then provide the answer immediately below.

**E - ELIMINATION LOGIC** (10 seconds)
One critical distinction using POSITIVE framing.

---

## STEP 3.7: MNEMONIC ANCHOR GENERATION

For each Core Concept, generate memory palace anchors:

**DEPENDENCY TIER ASSIGNMENT:**
- **Foundation:** Universal constants that other concepts depend on (the "bedrock")
- **Keystone:** Major functional blocks that perform core operations (the "workers")
- **Utility:** Specialized tools, tokens, or add-ons (the "accessories")

**ANCHOR GENERATION RULES:**
1. Select anchor object starting with SAME FIRST LETTER as concept name
2. Make anchor CONCRETE and VISUALIZABLE (physical object, not abstract)
3. Include a relevant EMOJI that represents the anchor
4. Scale anchor's described size to match dependency tier

**MNEMONIC OUTPUT FORMAT:**
```json
{{
  "mnemonic": {{
    "tier": "Foundation" | "Keystone" | "Utility",
    "anchor": "Concrete Object + Emoji (e.g., 'Volcano 🌋')",
    "story": "The 2-3 sentence bizarre scene...",
    "depends_on": ["Prerequisite Concept 1", "Prerequisite Concept 2"]
  }}
}}
```

---

## STEP 5.5: CONFUSION PAIRS [Discrimination Readiness]

Identify 3-5 pairs of concepts from the Master Chart that learners commonly confuse.

**OUTPUT FORMAT (JSON Block):**
```json
{{
  "confusionPairs": [
    {{
      "conceptA": "Concept Name A",
      "conceptB": "Concept Name B",
      "distinctionKey": "The ONE question that reveals which applies",
      "whenToUseA": "Choose A when [specific scenario]",
      "whenToUseB": "Choose B when [specific scenario]"
    }}
  ]
}}
```

---

## STEP 6: LEARNING PATH SEQUENCE [Progressive Mastery Guide]

Define a suggested study sequence that organizes ALL concepts into exactly **4-6 progressive stages**.

**MANDATORY DISTRIBUTION RULE:**
| Total Concepts | Stage Count | Concepts Per Stage |
|----------------|-------------|-------------------|
| 15-20          | 4 stages    | 4-5 each          |
| 21-28          | 5 stages    | 4-6 each          |
| 29-35          | 6 stages    | 5-6 each          |

---

## OUTPUT FORMAT:

Return a JSON object with the following structure:

```json
{{
  "domain": "{subject}",
  "lifecycle": {{
    "phase1": "PREPARE|LEARN|ASSESS|etc",
    "phase2": "MODEL|APPLY|DIAGNOSE|etc",
    "phase3": "DELIVER|VERIFY|DOCUMENT|etc"
  }},
  "concepts": [
    {{
      "id": "concept-001",
      "order": 1,
      "name": "Concept Name",
      "tier": "foundation|keystone|utility",
      "tierJustification": "This is Foundation because it establishes [core context] needed by other concepts.",
      "stageId": "PREPARE|MODEL|DELIVER",
      "dependencies": [],
      "outdegree": 5,
      "whyYouNeed": "Professionals use this to [action] because [benefit]. Without it, [consequence].",
      "technicalDetails": "Advanced insight: [specific technical detail or limitation].",
      "workedExample": {{
        "problem": "Scenario: You need to [realistic task]. How would you approach this?",
        "solution": "Approach: Apply [concept] by [method].",
        "steps": ["Step 1: Analyze...", "Step 2: Configure...", "Step 3: Verify..."]
      }},
      "mnemonic": {{
        "tier": "Foundation",
        "anchor": "Object + Emoji",
        "story": "Bizarre memorable story"
      }},
      "phase1": {{
        "hookSentence": "...",
        "microMetaphor": "...",
        "prerequisite": "None|ConceptName",
        "selection": ["Option 1", "Option 2"],
        "execution": "..."
      }},
      "phase2": [
        {{ "title": "...", "content": "..." }}
      ],
      "phase3": {{
        "tool": "Specific tool name",
        "metrics": ["Metric 1", "Metric 2"],
        "thresholds": "..."
      }},
      "shape": {{
        "simpleCore": "One sentence core concept (no jargon)",
        "highStakesExample": "REAL Case: [Company/Agency] ([Year]) used this to [outcome with numbers]",
        "analogicalModel": "Like [physical system]: [concept] = [physical element], [concept2] = [element2]",
        "patternRecognition": {{ "question": "You know you mastered this when...", "answer": "..." }},
        "eliminationLogic": "[A] handles [X], while [B] handles [Y]"
      }},
      "criticalDistinctions": [
        {{ "correct": "...", "incorrect": "..." }}
      ],
      "designBoundaries": [
        {{ "boundary": "...", "rationale": "..." }}
      ],
      "examFocus": [
        {{ "point": "...", "weight": "High|Medium|Low" }}
      ],
      "keyPoints": ["Point 1", "Point 2", "Point 3"]
    }}
  ],
  "confusionPairs": [...],
  "learningPath": {{
    "stages": [
      {{
        "order": 1,
        "name": "Stage Name",
        "concepts": ["concept-001", "concept-002"],
        "capabilitiesGained": "What learner can do after this stage"
      }}
    ]
  }}
}}
```

## MANDATORY FIELD CHECKLIST (EVERY CONCEPT MUST HAVE):

Before generating each concept, verify ALL of these fields are present and SUBSTANTIVE:

| Field | Minimum Quality | Example BAD | Example GOOD |
|-------|----------------|-------------|--------------|
| `hookSentence` | 15+ words, compelling hook | "RLS is important" | "Control who sees what data at the row level, ensuring each user only sees records relevant to them" |
| `whyYouNeed` | Explain consequence of not having it | "It helps with security" | "Without RLS, any dashboard user could access ALL customer data—a compliance nightmare for GDPR/HIPAA" |
| `technicalDetails` | Advanced insight with specifics | "Technical concept" | "RLS filters are DAX expressions evaluated per-user at query time; PATHCONTAINS is preferred for hierarchical security" |
| `shape.simpleCore` | One sentence, zero jargon | "RLS is row-level security" | "A filter that automatically hides rows based on who's logged in" |
| `shape.highStakesExample` | REAL company + year + outcome | "A company used this" | "Contoso (2023) prevented a data breach by implementing RLS, blocking 40K unauthorized row access attempts monthly" |
| `mnemonic.story` | Bizarre visual story with action | "Remember RLS" | "A giant ROWBOAT has a LOCK on it—only users with the RIGHT KEY (their username) can row to specific DATA ISLANDS" |

## BANNED PATTERNS (Auto-Fail):

1. **CIRCULAR DEFINITIONS** - "X is X" or "Think of X like X"
   - BAD: "Row-Level Security is security at the row level"
   - GOOD: "A filter that automatically hides rows based on who's logged in"

2. **CONCEPT NAME ECHO** - Just repeating the concept name with filler
   - BAD: "RLS is RLS for reporting"
   - GOOD: "Ensure each sales rep only sees their own territory's data"

3. **VAGUE PLACEHOLDERS** - Generic statements without specifics
   - BAD: "Understanding this concept is essential for mastering the subject"
   - GOOD: "Required for PL-300 exam: 10-15% of questions test RLS scenarios"

**CRITICAL REQUIREMENTS:**
1. Generate 30-50 concepts covering all tiers comprehensively
2. Every concept MUST have tier at root level
3. Every concept MUST have COMPLETE mnemonic (anchor + story), SHAPE (all 5 fields), phase1/2/3
4. Every concept MUST have hookSentence, whyYouNeed, technicalDetails with REAL content
5. Use POSITIVE framing only - no "cannot", "don't", "won't"
6. Return ONLY valid JSON, no markdown formatting
7. NEVER use the concept name in its own definition (circular)

---

**POSITIVE FRAMING VERIFICATION:**

Before submitting output, verify ZERO instances of:
- "Cannot", "Can't", "Won't", "Doesn't", "Fails", "Prevents", "Blocks"
- "Mistake", "Error", "Wrong", "Incorrect", "Dangerous", "Problem"
- "Students wrongly", "Common error", "Don't forget", "Avoid"

Verify HIGH frequency of:
- "Enables", "Unlocks", "Provides", "Extends", "Builds upon"
- "Designed for", "Optimized for", "Best suited for"
- "Clarifies", "Shows how", "Illustrates", "Reveals"
"""


def get_system_prompt(subject: str, familiar_system: str = None) -> str:
    """
    Returns the system prompt with the subject and optional familiar system
    """
    prompt = SYSTEM_PROMPT_V4.format(subject=subject)
    
    if familiar_system:
        prompt = prompt.replace(
            'Map to a familiar system (construction, cooking, sports, etc.)',
            f'Map to the familiar system of "{familiar_system.upper()}"'
        )
        prompt += f"""

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FAMILIAR SYSTEM OVERRIDE: {familiar_system.upper()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You MUST use metaphors related to "{familiar_system}" for ALL Analogical Models.
DO NOT use generic examples.
"""
    
    return prompt


# =============================================================================
# MULTI-PASS PROMPTS
# =============================================================================

BLUEPRINT_PROMPT = """ACT AS: An expert professor and curriculum designer for: {subject}

OBJECTIVE: Generate a COMPLETE list of 70-80 learning concepts that cover this subject comprehensively.

OUTPUT FORMAT: Return ONLY a raw JSON array. Do NOT wrap in markdown. Do NOT add any text before or after the JSON.

Example format (but you must generate 70-80 items):
[{{"name": "Concept 1", "tier": "foundation", "order": 1}}, {{"name": "Concept 2", "tier": "keystone", "order": 2}}]

TIER CLASSIFICATION:
- "foundation" (25-30%): Core concepts that other things depend on.
- "keystone" (30-40%): Major functional capabilities.
- "utility" (35-40%): Specialized tools and features.

CRITICAL RULES:
1. Generate exactly 70-80 concepts
2. Return ONLY the JSON array - no markdown, no explanation, no text
3. Each object MUST have only: name, tier, order
4. Start your response with [ and end with ]

Generate now:"""


EXPAND_PROMPT = """You are expanding concepts for: {subject}

## CONCEPTS TO EXPAND:
{concept_list}

## FOR EACH CONCEPT, generate the FULL SENSA v2.0 learning structure:

```json
{{
  "name": "Concept Name",
  "tier": "foundation|keystone|utility",
  "tierJustification": "This is [tier] because [specific reason].",
  "order": 1,
  "whyYouNeed": "Professionals use this to [action] because [benefit].",
  "technicalDetails": "Advanced: [specific technical insight].",
  "workedExample": {{
    "problem": "Scenario: You need to [task]...",
    "solution": "Approach: Apply [concept] by...",
    "steps": ["Step 1...", "Step 2...", "Step 3..."]
  }},
  "mnemonic": {{
    "tier": "Foundation|Keystone|Utility",
    "anchor": "Concrete Object + Emoji (e.g., 'Volcano 🌋')",
    "story": "2-3 sentence bizarre memorable scene"
  }},
  "phase1": {{
    "hookSentence": "Compelling 10-15 word sentence",
    "microMetaphor": "3-5 word physical analogy",
    "prerequisite": "None or prerequisite concept name",
    "selection": ["Option 1", "Option 2"],
    "execution": "How to execute"
  }},
  "phase2": [
    {{ "title": "Configuration Step", "content": "Detailed content" }}
  ],
  "phase3": {{
    "tool": "Specific tool name",
    "metrics": ["Metric 1", "Metric 2"],
    "thresholds": "Success criteria"
  }},
  "shape": {{
    "simpleCore": "One sentence core concept",
    "highStakesExample": "REAL Case Study: Specific Company/Event + Year + Outcome (NO generics)",
    "analogicalModel": "Physical world mapping (3-4 mappings)",
    "patternRecognition": {{ "question": "Self-test Q", "answer": "Answer" }},
    "eliminationLogic": "A is X, B is Y distinction"
  }},
  "criticalDistinctions": [{{ "correct": "...", "incorrect": "..." }}],
  "designBoundaries": [{{ "boundary": "...", "rationale": "..." }}],
  "examFocus": [{{ "point": "...", "weight": "High|Medium|Low" }}],
  "keyPoints": ["Point 1", "Point 2", "Point 3"],
  "dependencies": [],
  "outdegree": 5
}}
```

## RULES:
1. Use POSITIVE framing only - no "cannot", "don't", "fails"
2. Each concept MUST have mnemonic, SHAPE, and all 3 phases
3. Return ONLY a JSON array of the expanded concepts
4. Make mnemonics BIZARRE and MEMORABLE

Return the fully expanded concepts as a JSON array:"""


def get_blueprint_prompt(subject: str) -> str:
    """Returns the blueprint prompt for getting concept list"""
    return BLUEPRINT_PROMPT.format(subject=subject)


def get_expand_prompt(subject: str, concept_list: list) -> str:
    """Returns the expand prompt for detailing a batch of concepts"""
    concept_names = ", ".join([c.get("name", "") for c in concept_list])
    return EXPAND_PROMPT.format(subject=subject, concept_list=concept_names)


# =============================================================================
# SILVER BULLET PROMPT (Tiered Depth)
# =============================================================================


SILVER_BULLET_PROMPT = """ACT AS: An expert professor and curriculum designer for: {subject}

OBJECTIVE: Generate Part {part_num} of a comprehensive curriculum (Concepts {start_idx} to {end_idx}).

## CONTEXT & EMPHASIS:
{context}

## STRATEGY: UNIFORM DEPTH & HOLISTIC LEARNING
To support the "NO FALLBACKS" policy, EVERY concept must be fully fleshed out with complete learning science metadata. Do NOT skip fields for Keystone or Utility tiers.

### REQUIRED FIELDS (ALL CONCEPTS):
- **Core**: name, tier, tierJustification, order
- **Engagement**: phase1 (hookSentence, microMetaphor)
- **Memory**: mnemonic (FULL: anchor + story + tier)
- **Understanding**: description, keyPoints, whyYouNeed, technicalDetails, shape (simpleCore, highStakesExample, analogicalModel)
- **Application**: phase2 (content), phase3 (tool, metrics)
- **Relationship**: criticalDistinctions, designBoundaries

### MANDATORY DOMAIN DIMENSIONS [Must be covered across the curriculum]
regardless of the subject, you must explicitly include concepts that address these universal professional standards:

1. **Governance, Compliance & Security**: (e.g., Regulatory requirements, Data privacy/protection, Safety standards, Role-based access, Ethics).
2. **Accessibility & Inclusivity**: (e.g., Design for all users, Industry standard compliance (WCAG/ADA), Ergonomics, Broad usability).
3. **Performance & Optimization**: (e.g., Efficiency techniques, Diagnostic tooling, Bottleneck identification, Resource management).
4. **Professional Lifecycle & Development**: (e.g., Development workflows (Dev/Test/Prod), Version control, Publication strategies, Maintenance).
5. **Advanced & Emerging Capabilities**: (e.g., AI/ML integration, Automation features, Smart tooling, Future-facing trends).

*Ensure at least 1-2 concepts in this batch specifically address these pillars.*

## OUTPUT FORMAT:
Return A SINGLE JSON ARRAY containing concepts {start_idx} through {end_idx}.

```json
[
  {{
    "name": "Concept Name",
    "tier": "foundation|keystone|utility",
    "tierJustification": "Reason for tier...",
    "order": {start_idx},
    "whyYouNeed": "Professionals rely on this...",
    "technicalDetails": "Advanced insight...",
    "workedExample": {{
      "problem": "Scenario...",
      "solution": "Approach...",
      "steps": ["Step 1...", "Step 2..."]
    }},
    "mnemonic": {{ 
        "tier": "Foundation|Keystone|Utility",
        "anchor": "Object + Emoji", 
        "story": "Bizarre scene..." 
    }},
    "phase1": {{ 
        "hookSentence": "Compelling hook...", 
        "microMetaphor": "Physical analogy..." 
    }},
    "phase2": [ {{ "title": "...", "content": "..." }} ],
    "phase3": {{ "tool": "...", "metrics": [...] }},
    "shape": {{
      "simpleCore": "One sentence, no jargon.",
      "highStakesExample": "REAL: [Company] ([Year]) achieved [outcome].",
      "analogicalModel": "Like [system]: [mapping]...",
      "patternRecognition": {{ "question": "...", "answer": "..." }},
      "eliminationLogic": "[A] for [X], [B] for [Y]."
    }},
    "keyPoints": ["Point 1", "Point 2", "Point 3"],
    "criticalDistinctions": [{{ "correct": "...", "incorrect": "..." }}],
    "designBoundaries": [{{ "boundary": "...", "rationale": "..." }}]
  }}
]
```

## CRITICAL RULES:
1. QUANTITY: You MUST generate exactly {count} concepts (from #{start_idx} to #{end_idx}).
2. FORMAT: valid JSON array. NO markdown. NO text before/after.
3. REAL WORLD EXAMPLES: Field `shape.highStakesExample` MUST be a real case study.
4. METAPHORS: Field `shape.analogicalModel` and `mnemonics` MUST use objects/systems OUTSIDE the domain.
5. POSITIVE FRAMING: Use strictly positive, empowering language.

Generate concepts {start_idx} through {end_idx} now:"""

def get_silver_bullet_prompt(subject: str, part: int = 1, context: str = "") -> str:
    # If context is provided, format it for the prompt
    context_str = ""
    if context:
        context_str = f"USER CONTEXT / SPECIFIC FOCUS:\n{context}\n\n*Prioritize this context in your concept selection.*"

    # Split 70 concepts into 4 parts to ensure full depth within token limits
    # Part 1: 1-18 (18 concepts)
    # Part 2: 19-35 (17 concepts)
    # Part 3: 36-53 (18 concepts)
    # Part 4: 54-70 (17 concepts)

    ranges = [
        (1, 18),
        (19, 35),
        (36, 53),
        (54, 70)
    ]

    if 1 <= part <= 4:
        start_idx, end_idx = ranges[part - 1]
        count = end_idx - start_idx + 1
        return SILVER_BULLET_PROMPT.format(
            subject=subject,
            part_num=part,
            start_idx=start_idx,
            end_idx=end_idx,
            count=count,
            context=context_str
        )
    else:
        # Fallback to Part 1 if invalid part
        return SILVER_BULLET_PROMPT.format(
            subject=subject, 
            part_num=1, 
            start_idx=1, 
            end_idx=20, 
            count=20,
            context=context_str
        )


# SENSA System Prompt for Lambda
# This is a Python version of the TypeScript system-prompt.ts
# Contains the full learning science for SENSA v2.0
# 
# Prompt Version: v5.0 (Universal Exam Support - User Objectives First)
# See docs/prompts/README.md for version history.

# LEGACY PROMPTS REMOVED (SYSTEM_PROMPT_V4, BLUEPRINT_PROMPT, EXPAND_PROMPT)


# =============================================================================
# SILVER BULLET PROMPT (Universal - Objectives First)
# =============================================================================


SILVER_BULLET_PROMPT = """ACT AS: An expert professor and curriculum designer specializing in: {subject}

OBJECTIVE: Generate Part {part_num} of a comprehensive curriculum (Concepts {start_idx} to {end_idx}).

---
## 1. DYNAMIC SUBJECT ANALYSIS (MANDATORY FIRST STEP)

Before generating ANY concepts, you MUST analyze the subject "{subject}" to understand:

### 1.1 SUBJECT IDENTIFICATION
- **What exactly is this subject?** (certification exam, academic course, trade skill, etc.)
- **What is the official scope?** (research actual syllabus/objectives if this is an exam)
- **What domain does it belong to?** (technology, medicine, finance, trades, science, etc.)

### 1.2 SCOPE BOUNDARIES (CRITICAL)
**GENERATE CONCEPTS ONLY FOR: {subject}**
- Do NOT include concepts from related but different subjects
- Do NOT include concepts from other certifications or exams
- Do NOT include general topics not specific to this subject
- EVERY concept must directly serve mastery of "{subject}"

### 1.3 DOMAIN-SPECIFIC STRUCTURE
Analyze how professionals in this field organize their knowledge:
- What are the foundational concepts that everything else builds on?
- What are the core skills/processes that practitioners use daily?
- What specialized knowledge separates experts from beginners?

{context}

---
## 2. PARTITIONED GENERATION

You are generating **Part {part_num} of 5** for this curriculum.
Each part covers approximately 20% of the subject's breadth.

**Partition Strategy:**
- Part 1: Foundational concepts and prerequisites
- Part 2: Core operational concepts
- Part 3: Applied skills and techniques
- Part 4: Advanced integration and optimization
- Part 5: Specialized topics and edge cases

Generate concepts {start_idx} to {end_idx} for Part {part_num}.

---
## 3. CONCEPT GENERATION RULES

### 3.1 REQUIRED FIELDS (ALL CONCEPTS):
- **Core**: name, tier, tierJustification, cognitiveLevel, commonPitfalls, order
- **Engagement**: phase1 (hookSentence, microMetaphor, prerequisite, selection, execution)
- **Memory**: mnemonic (anchor + story + tier)
- **Understanding**: description, keyPoints, whyYouNeed, technicalDetails, shape
- **Application**: phase2 (content), phase3 (tool, metrics)
- **Relationship**: connections (requires, extends, enables, contains)
- **Scoring**: keywords (3-5 terms), aliases (3-5 synonyms)

### 3.2 MNEMONIC RULES:
- `anchor`: Concrete physical object (e.g., "3-Story Building 🏢"), NOT abstract.
- `story`: Map concepts to physical parts with spatial language.
  - ✅ "The Badge (Identity) opens the Gate (Authorization), leading to the Floor (Scope)."
  - ❌ "It's like a key." (too abstract)

### 3.3 SELECTION FIELD PATTERN:
Each item: "When [Scenario] → Choose [Option] → Unlocks [Capability]"

### 3.4 CONNECTION TYPES (Strict):
- **requires**: Hard prerequisite
- **extends**: Adds features/specialization
- **enables**: Provides capability
- **contains**: Composition
- **related-to**: Soft link (use sparingly, <5%)

### 3.5 COGNITIVE LEVELS (Bloom's):
Assign one: `remember`, `understand`, `apply`, `analyze`, `evaluate`, `create`

### 3.6 POSITIVE FRAMING:
| ❌ Avoid | ✅ Use |
|---|---|
| "Cannot change after creation" | "Selection made at creation time" |
| "Will fail if X" | "Verify X before proceeding" |

### 3.7 GRANULARITY:
Break broad topics into domain-specific subtopics:
- ❌ Broad umbrella terms that cover too much
- ✅ Specific concepts that can each be learned in 5-10 minutes

---
## 4. OUTPUT FORMAT

Return A SINGLE JSON ARRAY containing concepts {start_idx} through {end_idx}.

```json
[
  {{
    "name": "Concept Name (Human-readable, NOT placeholder IDs)",
    "tier": "foundation|keystone|utility",
    "tierJustification": "Reason...",
    "cognitiveLevel": "understand",
    "commonPitfalls": ["Misinterpreting X"],
    "order": {start_idx},
    "whyYouNeed": "...",
    "technicalDetails": "...",
    "workedExample": {{ "problem": "...", "solution": "...", "steps": ["..."] }},
    "mnemonic": {{ "tier": "...", "anchor": "Object + Emoji", "story": "Spatial scene..." }},
    "phase1": {{ "hookSentence": "...", "microMetaphor": "...", "prerequisite": "...", "selection": ["When..."], "execution": "..." }},
    "phase2": [ {{ "title": "...", "content": "..." }} ],
    "phase3": {{ "tool": "...", "metrics": [...] }},
    "shape": {{
      "simpleCore": "One sentence, no jargon.",
      "highStakesExample": "REAL: [Company] ([Year]) [outcome].",
      "analogicalModel": "Like [system]: [mapping]...",
      "patternRecognition": {{ "question": "...", "answer": "..." }},
      "eliminationLogic": "[A] for [X], [B] for [Y]."
    }},
    "keyPoints": ["..."],
    "scoring": {{ "keywords": ["..."], "aliases": ["..."] }},
    "criticalDistinctions": [{{ "correct": "...", "incorrect": "..." }}],
    "designBoundaries": [{{ "boundary": "...", "rationale": "..." }}],
    "connections": [{{ "target": "Other Concept", "type": "requires|extends|enables|contains" }}]
  }}
]
```

---
## 5. CRITICAL RULES

1. **QUANTITY**: Generate exactly {count} concepts (#{start_idx} to #{end_idx}).
2. **FORMAT**: Valid JSON array. NO markdown. NO text before/after.
3. **NAME FIELD**: Human-readable names only. Never use "concept-P1-001".
4. **REAL EXAMPLES**: `shape.highStakesExample` must be a real case study.
5. **METAPHORS**: Use objects OUTSIDE the domain.
6. **NO DUPLICATION**: You are Part {part_num} of 5. Only cover your pillar.

Generate concepts {start_idx} through {end_idx} now:"""


def get_silver_bullet_prompt(subject: str, part: int = 1, context: str = "") -> str:
    """
    Returns the prompt for generating concepts.
    
    Args:
        subject: The subject/exam name (e.g., "AZ-305", "Biology")
        part: Which part (1-5) of the syllabus to generate
        context: User-provided exam objectives or additional context
    """
    # Format context - this is the SINGLE source of truth
    if context:
        context_block = f"""### USER-PROVIDED OBJECTIVES (Primary Source):
{context}

**INSTRUCTION**: Map your {20} concepts for Part {part} directly to the objectives above.
Cover objectives proportionally (if 5 domains listed, each pillar covers ~1 domain)."""
    else:
        context_block = """### NO OBJECTIVES PROVIDED
The user has not provided specific exam objectives.
Use the FALLBACK FRAMEWORK in Section 2 to partition the subject."""

    # Concept ranges (20 per part = 100 total)
    ranges = [
        (1, 20),
        (21, 40),
        (41, 60),
        (61, 80),
        (81, 100)
    ]

    if 1 <= part <= 5:
        start_idx, end_idx = ranges[part - 1]
        count = end_idx - start_idx + 1
        return SILVER_BULLET_PROMPT.format(
            subject=subject,
            part_num=part,
            start_idx=start_idx,
            end_idx=end_idx,
            count=count,
            context=context_block
        )
    else:
        # Fallback to Part 1 if invalid part
        return SILVER_BULLET_PROMPT.format(
            subject=subject, 
            part_num=1, 
            start_idx=1, 
            end_idx=20, 
            count=20,
            context=context_block
        )


# =============================================================================
# SURGICAL FIX PROMPT (Single Concept Repair)
# =============================================================================

SURGICAL_FIX_PROMPT = """ACT AS: An expert professor and curriculum designer.
OBJECTIVE: Surgically repair a specific concept in the "{subject}" curriculum.

## DEFECT TO FIX:
Concept: "{concept_name}"
Issue: {issue_description}

## REQUIREMENTS:
Generate a FULLY REPAIRED JSON object for this single concept.
Focus specifically on resolving the issue described above while maintaining high quality in all other fields.

## OUTPUT FORMAT:
Return ONLY the raw JSON object for this concept.

```json
{{
  "name": "{concept_name}",
  "tier": "foundation|keystone|utility",
  "tierJustification": "Reason...",
  "order": 1,
  "whyYouNeed": "...",
  "technicalDetails": "...",
  "workedExample": {{ ... }},
  "mnemonic": {{ 
    "tier": "...", 
    "anchor": "Concrete Object + Emoji", 
    "story": "Bizarre scene..." 
  }},
  "phase1": {{ "hookSentence": "...", "microMetaphor": "..." }},
  "phase2": [ ... ],
  "phase3": {{ "tool": "...", "metrics": [...] }},
  "shape": {{
    "simpleCore": "One sentence, no jargon.",
    "highStakesExample": "REAL Case: Specific Company/Event + Year + Outcome.",
    "analogicalModel": "Like [system]: [mapping]...",
    "patternRecognition": {{ "question": "...", "answer": "..." }},
    "eliminationLogic": "..."
  }},
  "connections": [
     {{ "target": "Related Concept", "type": "requires|extends|enables|contains" }}
  ]
}}
```

## CRITICAL RULES:
1. Fix the identified issue completely.
2. Ensure `shape.highStakesExample` is a REAL historical case study with Company + Year.
3. Ensure `mnemonic.story` is bizarre, memorable, and uses the anchor.
4. Use strictly positive framing.
5. Return ONLY valid JSON for the single concept object. NO markdown.
"""

def get_surgical_fix_prompt(subject: str, concept_name: str, issue: str) -> str:
    """Returns the surgical fix prompt for a single concept"""
    return SURGICAL_FIX_PROMPT.format(
        subject=subject, 
        concept_name=concept_name, 
        issue_description=issue
    )

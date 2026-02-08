# SENSA System Prompt for Lambda
# This is a Python version of the TypeScript system-prompt.ts
# Contains the full learning science for SENSA v2.0
# 
# Prompt Version: v6.0 (Universal Macro Workflow Blueprint - Silver Bullet Edition)
# See docs/prompts/README.md for version history.

# LEGACY PROMPTS REMOVED (SYSTEM_PROMPT_V4, BLUEPRINT_PROMPT, EXPAND_PROMPT)


# =============================================================================
# CLASSIFICATION PROMPT (Pre-step: Classify subject before generation)
# =============================================================================

CLASSIFICATION_PROMPT = """You are an expert curriculum architect. Your ONLY task is to classify the following subject into one of 4 learning types and extract its macro structure.

Subject: {subject}
{context}

═══════════════════════════════════════════════════════════════════════════
STEP 1: CLASSIFY THE SUBJECT
═══════════════════════════════════════════════════════════════════════════

Ask: "What is this subject teaching?" Then classify:

TYPE A — PROCEDURAL MASTERY ("procedural")
  Goal: Execute a repeatable process on defined objects
  Examples: Surgery, coding, Azure administration, calculus, welding
  Structure: Sequential stages on an object lifecycle

TYPE B — CONCEPTUAL FLUENCY ("conceptual")
  Goal: Deploy the right concept at the right time in novel situations
  Examples: Law, philosophy, music theory, economics, literary analysis
  Structure: Core moves + application patterns

TYPE C — ADAPTIVE INTEGRATION ("cyclic")
  Goal: Navigate iterative cycles with increasing sophistication
  Examples: Design thinking, scientific research, jazz improvisation, agile
  Structure: Fundamental cycle + meta-awareness layers

TYPE D — EMBODIED JUDGMENT ("perceptual")
  Goal: Perceive what novices miss and act on subtle cues
  Examples: Medical diagnosis, chess, wine tasting, art critique, debugging
  Structure: Perceptual ladder + deliberate practice structures

═══════════════════════════════════════════════════════════════════════════
STEP 2: EXTRACT MACRO STRUCTURE
═══════════════════════════════════════════════════════════════════════════

Based on the classification, extract the appropriate macro structure:

For PROCEDURAL: Extract the object lifecycle stages (3-7 stages)
  Example: Azure VM → PROVISION → CONFIGURE → SECURE → MONITOR → OPTIMIZE → DECOMMISSION

For CONCEPTUAL: Extract core moves (5-12 distinct "moves")
  Example: Law → IDENTIFY_ISSUE → APPLY_RULE → DISTINGUISH_PRECEDENT → CONSTRUCT_ARGUMENT → EVALUATE_POLICY

For CYCLIC: Extract the fundamental cycle phases (3-6 phases)
  Example: Design Thinking → EMPATHIZE → DEFINE → IDEATE → PROTOTYPE → TEST

For PERCEPTUAL: Extract the perceptual ladder levels (3-5 levels)
  Example: Chess → MATERIAL_COUNTING → PATTERN_RECOGNITION → POSITIONAL_EVALUATION → STRATEGIC_PLANNING

Also extract:
- Connective Tissue: The gateway skill, threshold concept, and signature move for this subject
- Lifecycle: 3 action verbs in CAPS representing the learning phases

═══════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT (JSON ONLY)
═══════════════════════════════════════════════════════════════════════════

Return ONLY valid JSON. No markdown. No text before or after.

{{
  "subjectType": "procedural" | "conceptual" | "cyclic" | "perceptual",
  "classification": {{
    "type": "procedural" | "conceptual" | "cyclic" | "perceptual",
    "label": "Procedural Mastery" | "Conceptual Fluency" | "Adaptive Integration" | "Embodied Judgment",
    "goal": "One sentence describing the learning goal",
    "confidence": 0.0-1.0,
    "justification": "Why this type was chosen",
    "hybridElements": []
  }},
  "macroStructure": {{
    "type": "procedural" | "conceptual" | "cyclic" | "perceptual",
    "data": {{
      "stages": ["STAGE_1", "STAGE_2", ...]
    }}
  }},
  "connectiveTissue": {{
    "gatewaySkill": "The one skill that unlocks everything else",
    "thresholdConcept": "The concept that changes how you see the domain",
    "signatureMove": "What experts do that novices cannot"
  }},
  "lifecycle": {{
    "phase1": "VERB1",
    "phase2": "VERB2",
    "phase3": "VERB3"
  }}
}}

Classify the subject now."""


def get_classification_prompt(subject: str, context: str = "") -> str:
    context_block = ""
    if context:
        context_block = f"\nAdditional Context:\n{context}"
    return CLASSIFICATION_PROMPT.format(subject=subject, context=context_block)


# =============================================================================
# SILVER BULLET PROMPT (Universal - Classification-Aware)
# =============================================================================


SILVER_BULLET_PROMPT = """ACT AS: An expert professor and curriculum designer specializing in: {subject}

OBJECTIVE: Generate Part {part_num} of a comprehensive curriculum (Concepts {start_idx} to {end_idx}).

---
## 1. SUBJECT CLASSIFICATION (PRE-ANALYZED)

This subject has been classified as: **{subject_type_label}** ({subject_type})
Classification goal: {classification_goal}

### Macro Structure:
{macro_structure_text}

### Connective Tissue:
- Gateway Skill: {gateway_skill}
- Threshold Concept: {threshold_concept}
- Signature Move: {signature_move}

### Lifecycle Phases:
- Phase 1: {lifecycle_phase1}
- Phase 2: {lifecycle_phase2}
- Phase 3: {lifecycle_phase3}

**CRITICAL: Adapt your concept generation to this classification:**
- **Procedural**: Frame concepts as process steps, tool usage, and checkpoints along the object lifecycle stages
- **Conceptual**: Frame concepts as cognitive moves with application patterns and when/how to deploy them
- **Cyclic**: Frame concepts as cycle positions with iteration awareness and connections to adjacent phases
- **Perceptual**: Frame concepts as perceptual levels showing what experts notice that novices miss

---
## 2. SCOPE & PARTITIONED GENERATION

**GENERATE CONCEPTS ONLY FOR: {subject}**
- Do NOT include concepts from related but different subjects
- EVERY concept must directly serve mastery of "{subject}"

You are generating **Part {part_num} of 5** for this curriculum.
Each part covers approximately 20% of the subject's breadth.

**Partition Strategy (Knowledge Dimensions):**
- Part 1: **Core Mechanics** — Foundational building blocks, data structures, key terminology, prerequisite knowledge
- Part 2: **Workflows & Operations** — Day-to-day processes, standard procedures, configuration, transformation, modeling
- Part 3: **Output & Delivery** — Creating deliverables, visualization, reporting, presentation, publishing, sharing, collaboration
- Part 4: **Governance & Infrastructure** — Security, access control, compliance, deployment, refresh/sync, gateways, environments, administration
- Part 5: **Advanced & Ecosystem** — Optimization, performance tuning, platform-specific features, AI/automation capabilities, mobile/cross-platform, integrations, edge cases

**CRITICAL COVERAGE RULE:**
Each part must cover its assigned knowledge dimension COMPLETELY. Do NOT let concepts from one dimension bleed into another part.
Think about what a certification exam or real-world practitioner would need to know in this dimension — cover ALL of it.

**Coverage Dimensions by Classification Type:**
- **Procedural**: Ensure each part covers the tools, settings, and platform features relevant to that dimension — not just the process steps
- **Conceptual**: Ensure each part covers the governance frameworks, collaboration patterns, and delivery mechanisms — not just the theoretical concepts
- **Cyclic**: Ensure each part covers the infrastructure, team workflows, and iteration tooling — not just the cycle phases
- **Perceptual**: Ensure each part covers the diagnostic tools, reporting systems, and practice environments — not just the perceptual skills

Generate concepts {start_idx} to {end_idx} for Part {part_num}.

{context}

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
6. **NO DUPLICATION**: You are Part {part_num} of 5. Only cover your assigned knowledge dimension.
7. **FULL DIMENSION COVERAGE**: Cover ALL important topics within your assigned dimension. Think: "What would a certification exam test in this dimension?" Do not leave gaps.

Generate concepts {start_idx} through {end_idx} now:"""


def get_silver_bullet_prompt(
    subject: str,
    part: int = 1,
    context: str = "",
    classification: dict = None,
) -> str:
    if context:
        context_block = f"""### USER-PROVIDED OBJECTIVES (Primary Source):
{context}

**INSTRUCTION**: Map your concepts for Part {part} directly to the objectives above.
Cover objectives proportionally (if 5 domains listed, each knowledge dimension covers ~1 domain)."""
    else:
        context_block = ""

    cls = classification or {}
    cls_data = cls.get("classification", {})
    macro = cls.get("macroStructure", {})
    tissue = cls.get("connectiveTissue", {})
    lifecycle = cls.get("lifecycle", {})

    subject_type = cls.get("subjectType", "conceptual")
    type_labels = {
        "procedural": "Procedural Mastery",
        "conceptual": "Conceptual Fluency",
        "cyclic": "Adaptive Integration",
        "perceptual": "Embodied Judgment",
    }
    subject_type_label = type_labels.get(subject_type, "Conceptual Fluency")
    classification_goal = cls_data.get("goal", f"Master {subject}")

    macro_data = macro.get("data", {})
    stages = macro_data.get("stages", [])
    macro_structure_text = "\n".join([f"  - {s}" for s in stages]) if stages else "  (Not available)"

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
    else:
        start_idx, end_idx, count = 1, 20, 20
        part = 1

    return SILVER_BULLET_PROMPT.format(
        subject=subject,
        part_num=part,
        start_idx=start_idx,
        end_idx=end_idx,
        count=count,
        context=context_block,
        subject_type=subject_type,
        subject_type_label=subject_type_label,
        classification_goal=classification_goal,
        macro_structure_text=macro_structure_text,
        gateway_skill=tissue.get("gatewaySkill", "Core domain skill"),
        threshold_concept=tissue.get("thresholdConcept", "Fundamental insight"),
        signature_move=tissue.get("signatureMove", "Expert-level application"),
        lifecycle_phase1=lifecycle.get("phase1", "PREPARE"),
        lifecycle_phase2=lifecycle.get("phase2", "MODEL"),
        lifecycle_phase3=lifecycle.get("phase3", "DELIVER"),
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

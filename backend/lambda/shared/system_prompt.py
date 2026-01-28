# SENSA System Prompt for Lambda
# This is a Python version of the TypeScript system-prompt.ts
# Contains the full learning science for SENSA v2.0
# 
# Prompt Version: v4.2 (Cognitive Distinctions & Uniform Depth)
# See docs/prompts/README.md for version history.

# LEGACY PROMPTS REMOVED (SYSTEM_PROMPT_V4, BLUEPRINT_PROMPT, EXPAND_PROMPT)


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
- **Core**: name, tier, tierJustification, cognitiveLevel, commonPitfalls, order
- **Engagement**: phase1 (hookSentence, microMetaphor, prerequisite, selection, execution)
- **Memory**: mnemonic (FULL: anchor + story + tier)
- **Understanding**: description, keyPoints, whyYouNeed, technicalDetails, shape (simpleCore, highStakesExample, analogicalModel)
- **Application**: phase2 (content), phase3 (tool, metrics)
- **Relationship**: connections (MUST be strictly typed: requires, extends, enables, contains), criticalDistinctions, designBoundaries

### COGNITIVE CLASSIFICATION (Bloom's Taxonomy):
Assign one to `cognitiveLevel`: `remember`, `understand`, `apply`, `analyze`, `evaluate`, `create`.

### CRITICAL CLARIFICATIONS (Common Pitfalls):
Provide 2-3 items in `commonPitfalls` that resolve typical learner confusion. Frame POSITIVELY as precision checks.

### STRICT CONNECTION RULES (Sensa v2.0) - MANDATORY:
Every concept MUST have a `connections` array with at least 1-2 semantic relationships.
Define connections using ONLY these Semantic Relationship verbs:
1. **requires**: Hard dependency (Prerequisite). "A cannot function without B." (Most common)
2. **extends**: Enhancement/Specialization. "A adds features or specificity to B."
3. **enables**: Capability Flow. "A provides the power/access that B uses."
4. **contains**: Composition. "A includes B as a sub-component."
5. **related-to**: Soft association (Use SPARINGLY - max 5% of all connections).

⚠️ QUALITY GATE: Generic "related-to" connections indicate shallow understanding.
Prefer SPECIFIC relationships (requires, extends, enables, contains) that describe HOW concepts interact.

Example of GOOD connections:
- "Data Source Connectors" enables "Query Folding" (capability flow)
- "Star Schema Design" requires "Dimension Table Patterns" (hard dependency)
- "Workspace" contains "Datasets" (composition)

Example of BAD connections (AVOID):
- "Concept A" related-to "Concept B" (too vague - WHY are they related?)

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
    "cognitiveLevel": "understand",
    "commonPitfalls": ["Misinterpreting X", "Assuming Y"],
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
        "microMetaphor": "Physical analogy...",
        "prerequisite": "Required concept or knowledge...",
        "selection": ["Criteria 1", "Criteria 2"],
        "execution": "Implementation guidance..."
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
    "designBoundaries": [{{ "boundary": "...", "rationale": "..." }}],
    "connections": [
      {{ "target": "Other Concept Name", "type": "requires|extends|enables|contains" }}
    ]
  }}
]
```

## CRITICAL RULES:
1. QUANTITY: You MUST generate exactly {count} concepts (from #{start_idx} to #{end_idx}).
2. FORMAT: valid JSON array. NO markdown. NO text before/after.
3. REAL WORLD EXAMPLES: Field `shape.highStakesExample` MUST be a real case study.
4. METAPHORS: Field `shape.analogicalModel` and `mnemonics` MUST use objects/systems OUTSIDE the domain.
5. POSITIVE FRAMING: Use strictly positive, empowering language.

## ANTI-DUPLICATION PROTOCOL (CRITICAL FOR PARALLEL GENERATION):
You are generating PART {part_num} of 5 parallel batches. To ensure ZERO duplicate concepts:

### Step 1: Subject Breakdown (Internal - Do NOT output)
Before generating concepts, mentally partition the subject into 5 non-overlapping knowledge pillars.
Use this generic framework for ANY subject:
- **Pillar 1**: Foundations & Core Terminology (definitions, base concepts)
- **Pillar 2**: Architecture & Structure (how things connect/organize)
- **Pillar 3**: Implementation & Configuration (hands-on actions)
- **Pillar 4**: Security, Compliance & Governance (rules, restrictions, policies)
- **Pillar 5**: Advanced Topics & Optimization (performance, troubleshooting, edge cases)

You are responsible for **PILLAR {part_num}**. Focus EXCLUSIVELY on concepts belonging to this pillar.

### Step 2: Concept ID Schema (MANDATORY)
Every concept ID MUST follow this format: `concept-P{{part_num}}-{{seq}}`
Examples: `concept-P1-001`, `concept-P2-007`, `concept-P3-014`
This makes cross-part auditing unambiguous.

### Step 3: Uniqueness Validation (Self-Check)
Before outputting, verify:
- NO concept name is repeated from common terms (if a term is "obvious", other parts likely covered it).
- Names are SPECIFIC, not generic. Avoid "Introduction to X" or "Overview of Y".
- If a concept seems foundational, assume Part 1 already has it—unless you ARE Part 1.

Generate concepts {start_idx} through {end_idx} now:"""


def get_silver_bullet_prompt(subject: str, part: int = 1, context: str = "") -> str:
    # If context is provided, format it for the prompt
    context_str = ""
    if context:
        context_str = f"USER CONTEXT / SPECIFIC FOCUS:\n{context}\n\n*Prioritize this context in your concept selection.*"

    # DOMAIN-BASED PARTITIONING: Ensure unique coverage across parts
    # This instructs the AI to logically slice the subject itself into 5 parts
    domain_focus = f"""
DOMAIN PILLAR IDENTIFIER:
CURRENT PART: {part} OF 5
STRICT RULE: Partition the subject into 5 distinct, non-overlapping logical pillars. 
You are currently responsible for PILLAR {part}.
Focus EXCLUSIVELY on concepts relevant to this assigned segment of the syllabus. 
DO NOT REPEAT topics that logically belong in other segments (e.g., if you are Pillar 1, do not cover advanced topics meant for Pillar 5).
"""

    # Split 70 concepts into 5 parts (approx 14 each) to ensure full depth within token limits
    # Smaller batches = higher success rate and less likely to truncate JSON
    # Part 1: 1-14
    # Part 2: 15-28
    # Part 3: 29-42
    # Part 4: 43-56
    # Part 5: 57-70

    ranges = [
        (1, 14),
        (15, 28),
        (29, 42),
        (43, 56),
        (57, 70)
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
            context=context_str + domain_focus
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
    "highStakesExample": "REAL Case: Specific Company/Event + Year + Outcome (NO generic examples).",
    "analogicalModel": "Like [system]: [mapping]...",
    "patternRecognition": {{ "question": "...", "answer": "..." }},
    "eliminationLogic": "..."
  }},
  "strictConnections": [
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


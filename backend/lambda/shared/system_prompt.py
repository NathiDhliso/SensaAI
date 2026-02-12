# SENSA System Prompt for Lambda
# Prompt Version: v7.0 (Exam-Context Tree Structure)
#
# Tree Hierarchy:
#   Trunk  = Main exam domain/objective
#   Branch = Sub-topic within a trunk
#   Leaf   = Granular testable concept
#
# Generation: 1 partition per trunk domain
# =============================================================================
# CLASSIFICATION PROMPT
# =============================================================================
CLASSIFICATION_PROMPT = """You are an expert curriculum architect. Classify the following subject and extract its exam structure.

Subject: {subject}
{context}

═══════════════════════════════════════════════════════════════════════════
STEP 1: CLASSIFY THE SUBJECT
═══════════════════════════════════════════════════════════════════════════

Ask: "What is this subject teaching?" Then classify:

TYPE A — PROCEDURAL MASTERY ("procedural")
 Goal: Execute a repeatable process on defined objects
 Examples: Surgery, coding, Azure administration, calculus, welding

TYPE B — CONCEPTUAL FLUENCY ("conceptual")
 Goal: Deploy the right concept at the right time in novel situations
 Examples: Law, philosophy, music theory, economics, literary analysis

TYPE C — ADAPTIVE INTEGRATION ("cyclic")
 Goal: Navigate iterative cycles with increasing sophistication
 Examples: Design thinking, scientific research, jazz improvisation, agile

TYPE D — EMBODIED JUDGMENT ("perceptual")
 Goal: Perceive what novices miss and act on subtle cues
 Examples: Medical diagnosis, chess, wine tasting, art critique, debugging

═══════════════════════════════════════════════════════════════════════════
STEP 2: EXTRACT EXAM DOMAINS (TRUNKS)
═══════════════════════════════════════════════════════════════════════════

Identify the **main exam objectives/domains** (trunks) for this subject.
These are the top-level categories that the exam tests.
**EVERY subject is treated as exam preparation.** There is no non-exam path.

For each domain:
- Estimate its exam weight if known (decimal, e.g. 0.20 for 20%) — if provided, weights should sum to 1.0. If unknown, omit weight and the system will distribute equally.
- List 3-6 key sub-topics (these become branches)

**PRIORITY ORDER for extracting domains:**
1. If the user provided exam objectives/syllabus in context → extract domains directly from those (highest fidelity)
   - If the context is a FLAT LIST of objectives without domain headers, GROUP them into 4-6 logical exam domains by topic similarity
   - Each objective becomes a subtopic under the domain it belongs to
2. If the subject names a known certification/exam (e.g. AZ-104, PL-300, CPA, NCLEX) → use the official exam blueprint from your training data
3. For any other subject → structure it AS IF it were a formal exam: identify 4-6 testable domains with realistic weights, sub-topics, and assessable outcomes

**CRITICAL**: Even for subjects like "guitar" or "cooking", frame domains as exam objectives:
- Guitar → "Technique & Mechanics (0.25)", "Music Theory & Notation (0.20)", "Repertoire & Performance (0.30)", "Ear Training & Aural Skills (0.25)"
- The domains must be assessable, weighted, and structured for testing

Examples:
- AZ-104: Identity & Governance (0.22), Storage (0.17), Networking (0.22), Compute (0.22), Monitoring (0.17)
- PL-300: Prepare Data (0.27), Model Data (0.27), Visualize & Analyze (0.30), Deploy & Maintain (0.16)

═══════════════════════════════════════════════════════════════════════════
STEP 3: EXTRACT CONNECTIVE TISSUE
═══════════════════════════════════════════════════════════════════════════

Extract:
- Connective Tissue: gateway skill, threshold concept, signature move
- Lifecycle: 3 action verbs in CAPS representing learning phases

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
 "examDomains": [
 {{
 "name": "Domain Name",
 "weight": 0.20 | null,
 "subtopics": ["Sub-topic 1", "Sub-topic 2", "Sub-topic 3"]
 }}
 ],
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
# TREE GENERATION PROMPT (Exam-Context Tree Structure)
# =============================================================================
TREE_GENERATION_PROMPT = """ACT AS: An expert professor and exam preparation specialist for: {subject}
OBJECTIVE: Generate the concept tree for exam domain "{domain_name}" ({domain_weight_pct}% of exam).
---
## 1. EXAM CONTEXT
You are generating concepts for **ONE exam domain**: **{domain_name}**
This domain covers approximately {domain_weight_pct}% of the exam.
**CRITICAL CONTEXT**: Generate concepts strictly for what is tested in the EXAM context.
- Frame concepts as the exam tests them, NOT as a practitioner would use them on the job
- The tree must reflect the EXAM STRUCTURE and testable knowledge
- Every leaf concept should map to something that could appear as an exam question
### Subject Classification: **{subject_type_label}** ({subject_type})
Classification goal: {classification_goal}
### Connective Tissue:
- Gateway Skill: {gateway_skill}
- Threshold Concept: {threshold_concept}
- Signature Move: {signature_move}
{context}
---
## 2. TREE STRUCTURE RULES
Generate concepts in a strict 3-level tree:
### TRUNK (exactly 1 concept)
- Name: "{domain_name}"
- High-level overview of what this exam domain covers
- `treeLevel`: "trunk"
- `parentName`: null
- `cognitiveLevel`: "understand"
### BRANCHES ({branch_count} concepts)
- Key sub-topics within this exam domain
- Each branch groups related testable knowledge
- `treeLevel`: "branch"
- `parentName`: "{domain_name}" (the trunk)
{branch_list}
### LEAVES (3-5 per branch, ~{leaf_target} total)
- Granular, testable exam concepts
- Each leaf maps to specific exam-testable knowledge
- Learnable in 5-10 minutes
- `treeLevel`: "leaf"
- `parentName`: the branch concept name it belongs to
---
## 3. CONCEPT GENERATION RULES
### 3.1 REQUIRED FIELDS (ALL CONCEPTS):
- **Tree**: treeLevel, parentName, trunkDomain
- **Core**: name, cognitiveLevel, commonPitfalls, order
- **Engagement**: phase1 (hookSentence, microMetaphor, prerequisite, selection, execution)
- **Memory**: mnemonic (anchor + story)
- **Understanding**: keyPoints, whyYouNeed, technicalDetails, shape
- **Application**: phase2 (content), phase3 (tool, metrics)
- **Relationship**: connections (see §3.4)
- **Scoring**: keywords (3-5 terms), aliases (3-5 synonyms)
### 3.2 TREE-LEVEL CONTENT RULES:
**TRUNK** (domain overview):
- Broader, general content about the domain
- `connections`: "enables" to each branch
**BRANCH** (sub-topic):
- Medium granularity, grouping related knowledge
- `connections`: "is-part-of" to trunk, "enables" to its leaves
**LEAF** (testable detail):
- Maximum exam-relevant granularity
- At least 60% of leaves MUST be `apply` or higher cognitive level
- `connections`: "is-part-of" to its branch, plus cross-branch connections where relevant
### 3.3 MNEMONIC RULES:
- `anchor`: Concrete physical object (e.g., "3-Story Building"), NOT abstract
- `story`: Map concepts to physical parts with spatial language
### 3.4 CONNECTION TYPES (6 Universal Types):
- **requires**: Hard prerequisite (must know B before A)
- **enables**: Capability chain (A unlocks B)
- **is-part-of**: Part-whole composition (A is component of B)
- **is-type-of**: Taxonomy (A is specific instance of B)
- **causes**: Causal chain (A triggers B)
- **constrains**: Boundary condition (A limits B)
**FORBIDDEN**: "related-to", "relates", "extends", or vague associations.
**MINIMUM**: Every concept MUST have at least 2 connections.
**CROSS-DOMAIN**: Leaves may reference concepts in OTHER domains (use exact names).
### 3.5 SELECTION FIELD PATTERN:
Each item: "When [Scenario] Choose [Option] Unlocks [Capability]"
### 3.6 COGNITIVE LEVELS (Bloom's):
Assign one: `remember`, `understand`, `apply`, `analyze`, `evaluate`, `create`
Trunk concepts: always `understand`
Branch concepts: `understand` or `apply`
Leaf concepts: prefer `apply`, `analyze`, `evaluate`, `create`
### 3.7 POSITIVE FRAMING:
| Avoid | Use |
|---|---|
| "Cannot change after creation" | "Selection made at creation time" |
| "Will fail if X" | "Verify X before proceeding" |
### 3.8 ANTI-TEMPLATE RULE (CRITICAL — READ CAREFULLY):
Every field MUST contain SPECIFIC, SUBSTANTIVE content. The following patterns are **STRICTLY FORBIDDEN** and will cause the entire output to be rejected:

**FORBIDDEN hookSentence patterns:**
- "Why [X] matters in [exam]" → INSTEAD write a specific insight, e.g. "Without proper NSG rules, a VM is exposed to the entire internet even inside a VNet"
- "Understanding [X] is important" → INSTEAD explain the specific consequence of not knowing it

**FORBIDDEN microMetaphor patterns:**
- "Think of [X] as a building block" → INSTEAD use a vivid, specific metaphor, e.g. "Think of NSGs as bouncers at a nightclub — they check every packet's ID (IP, port, protocol) before letting it through"

**FORBIDDEN whyYouNeed patterns:**
- "Why [X] matters" or "Detailed explanation of [keyPoint]" → INSTEAD write 2-3 sentences explaining the SPECIFIC technical reason

**FORBIDDEN phase2 patterns:**
- "Detailed explanation of [keyPoint]" → INSTEAD write actual technical content explaining HOW and WHY

**FORBIDDEN patternRecognition patterns:**
- Empty question/answer → INSTEAD write a specific exam-style scenario question with a concrete answer

**FORBIDDEN criticalDistinctions patterns:**
- "Proper use of [X] vs Common misunderstanding" → INSTEAD write specific correct vs incorrect statements, e.g. {{"correct": "NSGs are stateful — return traffic is auto-allowed", "incorrect": "You need separate inbound and outbound rules for the same connection"}}

**FORBIDDEN shape.simpleCore patterns:**
- "[X] is a core concept in [Y]" → INSTEAD write one plain-English sentence explaining what it DOES

**TEST YOURSELF**: Before outputting, verify that EVERY field contains domain-specific technical content. If you can swap the concept name and the field still makes sense, the content is too generic.
---
## 4. OUTPUT FORMAT
Return A SINGLE JSON ARRAY containing ALL concepts for this domain.
### 4.1 DOMAIN-ADAPTIVE CONTENT:
**phase2**: Procedural=execution steps, Conceptual=critical inquiry, Cyclic=iteration protocol, Perceptual=observation protocol
**workedExample**: Procedural=config walkthrough, Conceptual=case study, Cyclic=iteration log, Perceptual=diagnostic walkthrough
### 4.2 JSON TEMPLATE
```json
[
 {{
 "name": "Concept Name",
 "treeLevel": "trunk|branch|leaf",
 "parentName": "Parent Concept Name or null",
 "trunkDomain": "{domain_name}",
 "cognitiveLevel": "apply",
 "commonPitfalls": ["Misinterpreting X"],
 "order": {start_idx},
 "whyYouNeed": "...",
 "technicalDetails": "...",
 "workedExample": {{ "problem": "...", "solution": "...", "steps": ["..."] }},
 "mnemonic": {{ "anchor": "Object + Emoji", "story": "Spatial scene..." }},
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
 "connections": [{{ "target": "Other Concept", "type": "requires|enables|is-part-of|is-type-of|causes|constrains" }}]
 }}
]
```
---
## 5. CRITICAL RULES
1. **TREE INTEGRITY**: Every branch `parentName` = trunk name. Every leaf `parentName` = a branch name. Trunk `parentName` = null.
2. **QUANTITY**: Generate approximately {count} concepts (1 trunk + {branch_count} branches + ~{leaf_target} leaves).
3. **FORMAT**: Valid JSON array. NO markdown. NO text before/after.
4. **NAME FIELD**: Human-readable names only. Never use "concept-P1-001".
5. **EXAM CONTEXT**: Every concept framed for the exam, not real-world job context.
6. **REAL EXAMPLES**: `shape.highStakesExample` must be a real case study.
7. **NO DUPLICATION**: Only generate for "{domain_name}". Other domains are separate.
Generate the concept tree for "{domain_name}" now:"""
def _parse_exam_tree(context: str) -> list:
    import re as _re
    lines = context.strip().split('\n')
    domains = []
    current_domain = None
    current_subtopic = None
    current_subtopics = []
    current_objectives = []
    PERCENTAGE_PATTERN = _re.compile(r'\(\s*\d+[\s\-–]*\d*\s*%\s*\)')
    WEIGHT_PATTERN = _re.compile(r'\d+[\s\-–]+\d+\s*%')
    BULLET_PREFIX = _re.compile(r'^[\s]*[-–—•*]+\s*')
    NUMBERING_PREFIX = _re.compile(r'^[\s]*\d+[\.\)\:]\s*')
    LETTER_PREFIX = _re.compile(r'^[\s]*[a-zA-Z][\.\)]\s*')
    ACTION_VERBS = {
        "create", "configure", "manage", "implement", "deploy", "monitor",
        "assign", "apply", "interpret", "provision", "troubleshoot", "set up",
        "perform", "export", "modify", "map", "query", "analyze", "evaluate",
        "design", "build", "define", "establish", "develop", "integrate",
        "secure", "optimize", "migrate", "backup", "restore", "connect",
    }
    def clean_line(text):
        text = BULLET_PREFIX.sub('', text)
        text = NUMBERING_PREFIX.sub('', text)
        text = LETTER_PREFIX.sub('', text)
        text = PERCENTAGE_PATTERN.sub('', text)
        text = WEIGHT_PATTERN.sub('', text)
        text = text.strip().rstrip(':').rstrip('-').rstrip('–').strip()
        return text
    def starts_with_action_verb(text):
        lower = text.lower()
        for verb in ACTION_VERBS:
            if lower.startswith(verb + " ") or lower.startswith(verb + "\t"):
                return True
        return False
    def has_percentage_weight(raw_line):
        return bool(PERCENTAGE_PATTERN.search(raw_line)) or bool(WEIGHT_PATTERN.search(raw_line))
    def extract_weight(raw_line):
        m = _re.search(r'(\d+)\s*[\-–]\s*(\d+)\s*%', raw_line)
        if m:
            return (int(m.group(1)) + int(m.group(2))) / 200.0
        m2 = _re.search(r'(\d+)\s*%', raw_line)
        if m2:
            return int(m2.group(1)) / 100.0
        return None
    def flush_subtopic():
        nonlocal current_subtopic, current_objectives
        if current_subtopic and current_objectives:
            current_subtopics.append({
                "name": current_subtopic,
                "objectives": current_objectives[:]
            })
        elif current_objectives and not current_subtopic:
            if current_subtopics:
                current_subtopics[-1]["objectives"].extend(current_objectives[:])
            else:
                current_subtopics.append({
                    "name": "General",
                    "objectives": current_objectives[:]
                })
        current_subtopic = None
        current_objectives = []
    def flush_domain(raw_line=""):
        nonlocal current_domain, current_subtopics, current_subtopic, current_objectives
        flush_subtopic()
        if current_domain:
            weight = extract_weight(raw_line) if raw_line else None
            domains.append({
                "name": current_domain,
                "weight": weight,
                "subtopics": current_subtopics[:]
            })
        current_domain = None
        current_subtopics = []
    last_domain_raw = ""
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        indent = len(line) - len(line.lstrip())
        clean = clean_line(stripped)
        if not clean or len(clean) < 4:
            continue
        is_action_leaf = starts_with_action_verb(clean)
        is_indented = indent >= 2 or stripped.startswith('-') or stripped.startswith('•')
        has_weight = has_percentage_weight(line)
        words = clean.split()
        is_short_header = len(words) <= 10 and not is_action_leaf and not is_indented
        is_domain_header = has_weight or (is_short_header and current_domain is None and len(clean) > 4)
        is_new_domain_after_content = (
            is_short_header
            and current_domain is not None
            and (current_objectives or current_subtopics)
            and len(clean) > 4
        )
        if has_weight or is_new_domain_after_content:
            flush_domain(last_domain_raw)
            current_domain = clean
            last_domain_raw = line
        elif is_domain_header and current_domain is None:
            current_domain = clean
            last_domain_raw = line
        elif current_domain is not None:
            if is_action_leaf:
                current_objectives.append(clean)
            elif is_indented:
                current_objectives.append(clean)
            elif is_short_header and not current_objectives and not current_subtopics:
                flush_subtopic()
                current_subtopic = clean
            elif len(clean) > 10:
                current_objectives.append(clean)
        else:
            if len(clean) > 10:
                current_domain = clean
                last_domain_raw = line
    flush_domain(last_domain_raw)
    if len(domains) <= 1:
        return []
    return domains
def _get_exam_domains(context: str, classification: dict = None) -> list:
    context_domains = _parse_exam_tree(context) if context else []
    if context_domains:
        total_weight = sum(d.get("weight") or 0 for d in context_domains)
        if total_weight < 0.5:
            equal_weight = round(1.0 / len(context_domains), 2)
            for d in context_domains:
                if not d.get("weight"):
                    d["weight"] = equal_weight
        return context_domains
    if classification and classification.get("examDomains"):
        return classification["examDomains"]
    return []
def get_tree_generation_prompt(
    subject: str,
    domain: dict,
    domain_index: int,
    total_domains: int,
    context: str = "",
    classification: dict = None,
) -> str:
    domain_name = domain.get("name", f"Domain {domain_index + 1}")
    weight = domain.get("weight") or round(1.0 / max(total_domains, 1), 2)
    domain_weight_pct = int(weight * 100)
    subtopics = domain.get("subtopics", [])
    total_target = 100
    domain_concept_target = max(10, int(total_target * weight))
    if subtopics:
        branch_count = len(subtopics)
    else:
        branch_count = max(3, min(6, domain_concept_target // 5))
    leaf_target = domain_concept_target - 1 - branch_count
    count = 1 + branch_count + leaf_target
    if subtopics:
        branch_lines = []
        for st in subtopics:
            if isinstance(st, dict):
                st_name = st.get("name", "")
                objectives = st.get("objectives", [])
                branch_lines.append(f"- **{st_name}**")
                for obj in objectives[:6]:
                    branch_lines.append(f"  - Leaf topic: {obj}")
            elif isinstance(st, str):
                branch_lines.append(f"- **{st}**")
        branch_list = "\n".join(branch_lines)
    else:
        branch_list = f"(Determine {branch_count} logical sub-topic groupings for this domain based on exam structure)"
    if subtopics:
        objective_lines = []
        for st in subtopics:
            if isinstance(st, dict):
                st_name = st.get("name", "")
                objectives = st.get("objectives", [])
                objective_lines.append(f"**Sub-topic: {st_name}**")
                for obj in objectives:
                    objective_lines.append(f"  - {obj}")
        if objective_lines:
            nl = "\n"
            context_block = f"### EXAM OBJECTIVES FOR THIS DOMAIN:\n{nl.join(objective_lines)}\n**CRITICAL**: Generate leaf concepts that cover EACH objective listed above."
        else:
            context_block = ""
    elif context:
        context_block = f"### USER-PROVIDED CONTEXT:\n{context}\n**INSTRUCTION**: Map concepts for domain \"{domain_name}\" to relevant objectives above."
    else:
        context_block = ""
    cls = classification or {}
    cls_data = cls.get("classification", {})
    tissue = cls.get("connectiveTissue", {})
    subject_type = cls.get("subjectType", "conceptual")
    type_labels = {
        "procedural": "Procedural Mastery",
        "conceptual": "Conceptual Fluency",
        "cyclic": "Adaptive Integration",
        "perceptual": "Embodied Judgment",
    }
    start_idx = domain_index * count + 1
    return TREE_GENERATION_PROMPT.format(
        subject=subject,
        domain_name=domain_name,
        domain_weight_pct=domain_weight_pct,
        subject_type=subject_type,
        subject_type_label=type_labels.get(subject_type, "Conceptual Fluency"),
        classification_goal=cls_data.get("goal", f"Master {subject}"),
        gateway_skill=tissue.get("gatewaySkill", "Core domain skill"),
        threshold_concept=tissue.get("thresholdConcept", "Fundamental insight"),
        signature_move=tissue.get("signatureMove", "Expert-level application"),
        context=context_block,
        branch_count=branch_count,
        branch_list=branch_list,
        leaf_target=leaf_target,
        start_idx=start_idx,
        count=count,
    )
def get_silver_bullet_prompt(
    subject: str,
    part: int = 1,
    context: str = "",
    classification: dict = None,
) -> str:
    domains = _get_exam_domains(context, classification)
    if not domains:
        default_weight = 0.20
        domains = [{"name": f"Domain {i+1}", "weight": default_weight, "subtopics": []} for i in range(5)]
    domain_index = max(0, min(part - 1, len(domains) - 1))
    domain = domains[domain_index]
    return get_tree_generation_prompt(
        subject=subject,
        domain=domain,
        domain_index=domain_index,
        total_domains=len(domains),
        context=context,
        classification=classification,
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
 "treeLevel": "trunk|branch|leaf",
 "parentName": "Parent Concept Name or null",
 "trunkDomain": "Exam Domain Name",
 "cognitiveLevel": "remember|understand|apply|analyze|evaluate|create",
 "order": 1,
 "whyYouNeed": "...",
 "technicalDetails": "...",
 "workedExample": {{ "problem": "...", "solution": "...", "steps": ["..."] }},
 "mnemonic": {{ 
 "anchor": "Concrete Object + Emoji", 
 "story": "Spatial scene..." 
 }},
 "phase1": {{ "hookSentence": "...", "microMetaphor": "...", "prerequisite": "...", "selection": ["When..."], "execution": "..." }},
 "phase2": [ {{ "title": "...", "content": "..." }} ],
 "phase3": {{ "tool": "...", "metrics": [...] }},
 "shape": {{
 "simpleCore": "One sentence, no jargon.",
 "highStakesExample": "REAL Case: Specific Company/Event + Year + Outcome.",
 "analogicalModel": "Like [system]: [mapping]...",
 "patternRecognition": {{ "question": "...", "answer": "..." }},
 "eliminationLogic": "..."
 }},
 "keyPoints": ["..."],
 "commonPitfalls": ["..."],
 "scoring": {{ "keywords": ["..."], "aliases": ["..."] }},
 "connections": [
 {{ "target": "Related Concept", "type": "requires|enables|is-part-of|is-type-of|causes|constrains" }}
 ]
}}
```
## CONNECTION TYPES (6 Universal Types — No generic fallback):
- **requires**: Hard prerequisite (A requires B = B must be understood before A)
- **enables**: Capability chain (A enables B = learning A makes B possible)
- **is-part-of**: Part-whole composition (A is part of B = A is component within B)
- **is-type-of**: Taxonomy (A is type of B = A is specific instance of B)
- **causes**: Causal chain (A causes B = A directly produces or triggers B)
- **constrains**: Boundary condition (A constrains B = A sets rules/limits on B)
## CRITICAL RULES:
1. Fix the identified issue completely.
2. Ensure `shape.highStakesExample` is a REAL historical case study with Company + Year.
3. Ensure `mnemonic.story` is bizarre, memorable, and uses the anchor.
4. Use strictly positive framing.
5. Return ONLY valid JSON for the single concept object. NO markdown.
6. Every connection MUST use one of the 6 types above. Do NOT use "related-to", "extends", or "contains".
"""
def get_surgical_fix_prompt(subject: str, concept_name: str, issue: str) -> str:
    """Returns the surgical fix prompt for a single concept"""
    return SURGICAL_FIX_PROMPT.format(
        subject=subject, 
        concept_name=concept_name, 
        issue_description=issue
    )

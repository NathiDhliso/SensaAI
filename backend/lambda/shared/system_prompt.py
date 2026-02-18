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
- Music Theory: Rhythm & Meter (0.20), Scales & Intervals (0.25), Harmony & Chord Progressions (0.25), Form & Analysis (0.15), Ear Training & Dictation (0.15)
- Constitutional Law: Judicial Review & Structure (0.20), Individual Rights (0.25), Federalism & Separation of Powers (0.20), Equal Protection & Due Process (0.20), First Amendment (0.15)
- Marathon Training: Physiology & Energy Systems (0.20), Training Periodization (0.25), Nutrition & Hydration (0.20), Injury Prevention (0.15), Race Strategy (0.20)

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
{ulc_naming_guidance}
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
- `connections`: NONE outgoing. Trunks are roots — they receive `is-part-of` from branches. Do NOT add connections on trunk concepts.
**BRANCH** (sub-topic):
- Medium granularity, grouping related knowledge
- `connections`: Exactly 1 `is-part-of` → its trunk (mandatory). Then 0-1 `requires` → a sibling branch that must be learned first. Max 2 connections total.
**LEAF** (testable detail):
- Maximum exam-relevant granularity
- At least 60% of leaves MUST be `apply` or higher cognitive level
- `connections`: Exactly 1 `is-part-of` → its branch (mandatory). Then 1-2 additional connections to OTHER leaves within the SAME branch using `requires`, `causes`, or `constrains`. Max 3 connections total. Cross-branch leaf connections are FORBIDDEN — they create unreadable graphs.
### 3.3 MNEMONIC RULES:
- `anchor`: Concrete physical object (e.g., "3-Story Building"), NOT abstract
- `story`: Map concepts to physical parts with spatial language
### 3.4 TRACES — Typed Relational Architecture for Cognitive Encoding Specificity
Neuroscience shows that the TYPE of relationship between concepts determines retrieval strength (Tulving, 1973), spreading activation paths (Anderson, 1983), and expert-vs-novice knowledge organization (Chi et al., 1981). Vague links ("enables") produce shallow encoding. Specific links ("requires", "constrains") create precision retrieval cues.
**THE 6 TRACES TYPES** (each activates a distinct cognitive retrieval pathway):
| Type | Cognitive Operation | The learner asks... |
|---|---|---|
| **requires** | Prerequisite sequencing | "What must I know BEFORE this?" |
| **enables** | Capability chaining | "What can I do AFTER learning this?" |
| **is-part-of** | Compositional decomposition | "What is this a PIECE of?" |
| **is-type-of** | Taxonomic classification | "What CATEGORY does this belong to?" |
| **causes** | Causal reasoning | "What HAPPENS because of this?" |
| **constrains** | Boundary recognition | "What LIMITS or governs this?" |
**TRACES DECISION ALGORITHM** — For each connection, ask these questions IN ORDER. Use the FIRST match:
1. Must you understand B before A makes sense? → `requires`
2. Is A a component or sub-part of B? → `is-part-of`
3. Is A a specific instance or variant of B? → `is-type-of`
4. Does A directly produce, trigger, or result in B? → `causes`
5. Does A set rules, limits, policies, or boundaries on B? → `constrains`
6. ONLY IF none of the above apply: Does learning A make B accessible? → `enables`
**DISTRIBUTION CONSTRAINT**: `enables` must NOT exceed 20% of all connections across the tree. If you find yourself defaulting to "enables", re-run the decision algorithm — most "enables" are actually "requires", "causes", or "constrains" in disguise.
**FORBIDDEN**: "related-to", "relates", "extends", "depends-on", or any vague association.
**GRAPH TOPOLOGY RULES** (these produce a clean, readable concept map):
1. **STRUCTURAL SPINE**: Every branch has exactly 1 `is-part-of` → its trunk. Every leaf has exactly 1 `is-part-of` → its branch. Trunks have 0 outgoing connections. This spine is mandatory and non-negotiable.
2. **MAX CONNECTIONS**: Trunk = 0, Branch = 2, Leaf = 3. Exceeding these caps causes **automatic rejection**.
3. **DIRECTIONAL FLOW**: `requires` MUST point to a concept with a LOWER `order` number. If concept A (order 15) requires concept B, then B.order < 15. This enforces a prerequisite chain that flows forward through the learning sequence. Backward requires (pointing to higher-order concepts) are **forbidden**.
4. **NO CYCLES**: If A requires B, then B must NOT require A, and no chain B→...→A may exist. Before adding a `requires`, verify the target does not already require the source through any path.
5. **SAME-BRANCH LOCALITY**: Leaf connections beyond the mandatory `is-part-of` MUST target other leaves within the SAME branch. Cross-branch leaf connections are forbidden — they create tangled, unreadable graphs.
6. **BRANCH PREREQUISITES ONLY**: The only cross-branch connection allowed is a branch-to-branch `requires` (e.g., "Prompt Engineering" requires "Document Creation"). This creates a clean inter-branch learning sequence without leaf-level cross-wiring.
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
---
## 4. OUTPUT FORMAT
Return A SINGLE JSON ARRAY containing ALL concepts for this domain.
### 4.1 DOMAIN-ADAPTIVE CONTENT:
**phase2**: Procedural=execution steps, Conceptual=critical inquiry, Cyclic=iteration protocol, Perceptual=observation protocol
**workedExample**: Procedural=config walkthrough, Conceptual=case study, Cyclic=iteration log, Perceptual=diagnostic walkthrough
### 4.2 QUALITY STANDARD — CONCRETE EXAMPLE
Below is ONE fully-worked leaf concept. **Every concept you generate must match this depth and specificity.** Do NOT use placeholder text like "Detailed explanation of..." or "Why X matters" — write real technical content.
### FIELD STYLE GUIDE (violating these causes automatic rejection):
**hookSentence** — Lead with a surprising fact, a specific failure scenario, or a concrete exam trap from the subject domain. BANNED: "Without proper X...", "Without X...", "Improperly configured X...". GOOD examples:
  - "Plants absorb only 1-2%% of sunlight that hits their leaves — yet this narrow band powers virtually all life on Earth..."
  - "A single misplaced comma in a contract clause reversed a $2.13 million ruling in Rogers Communications v. Bell Aliant..."
  - "The ii-V-I progression appears in over 80%% of jazz standards — recognizing it by ear is the gateway to improvisation..."
**microMetaphor** — Use "[Concept] are/is [concrete metaphor] — [how the mapping works]". BANNED: "Think of X as...". GOOD examples:
  - "Chloroplasts are solar panel factories — they capture photons and convert them into chemical energy stored in ATP and NADPH."
  - "Precedent is a trail of cairns — each ruling marks the path, and courts follow the most recent visible marker."
**whyYouNeed** — State the specific problem this concept solves, then explain how it is tested or applied. BANNED: "X is crucial/critical/essential...", "X provides a secure way...", "X are essential for...". GOOD examples:
  - "Exam questions present unfamiliar chord progressions and ask you to identify the key center — without understanding diatonic function, every answer looks plausible..."
  - "Contract law exams present ambiguous clauses and ask whether consideration exists — knowing the doctrine prevents confusing gifts with enforceable promises..."
```json
{{
 "name": "The Light-Dependent Reactions",
 "treeLevel": "leaf",
 "parentName": "Photosynthesis Mechanisms",
 "trunkDomain": "Energy & Metabolism",
 "cognitiveLevel": "apply",
 "commonPitfalls": [
   "Confusing light-dependent reactions (thylakoid, produce ATP + NADPH) with Calvin cycle (stroma, uses ATP + NADPH to fix CO₂)",
   "Assuming O₂ comes from the Calvin cycle — it is released during photolysis of water at PSII"
 ],
 "order": 15,
 "whyYouNeed": "Exam questions show chloroplast diagrams and ask where molecules are produced. Students who cannot trace electron flow from H₂O → PSII → ETC → PSI → NADP⁺ reductase misidentify ATP vs. NADPH sources and lose marks on transport chain questions.",
 "technicalDetails": "Occurs on the thylakoid membrane. PSII (P680) splits water (2H₂O → 4H⁺ + 4e⁻ + O₂). Electrons pass through the ETC (plastoquinone → cytochrome b6f → plastocyanin), creating a proton gradient that drives ATP synthase (chemiosmosis). PSI (P700) re-energizes electrons to reduce NADP⁺ to NADPH via ferredoxin.",
 "workedExample": {{
   "problem": "A plant is given water labeled with ¹⁸O. Where will the ¹⁸O atoms appear — in glucose or in O₂ gas released?",
   "solution": "The ¹⁸O appears in O₂ gas, not glucose. O₂ comes from photolysis of water at PSII. The oxygen in glucose comes from CO₂ fixed in the Calvin cycle.",
   "steps": ["Water is split at PSII in the light-dependent reactions", "Photolysis: 2H₂O → 4H⁺ + 4e⁻ + O₂ — O₂ comes directly from H₂O", "CO₂ (not H₂O) provides oxygen atoms in glucose via the Calvin cycle", "Conclusion: ¹⁸O from labeled water → released as ¹⁸O₂ gas"]
 }},
 "mnemonic": {{
   "anchor": "Solar Panel Factory ☀️",
   "story": "A rooftop solar panel (thylakoid) with two relay stations (PSII, PSI). First panel cracks water bottles (photolysis) releasing bubbles (O₂). Current flows through wires (ETC) to a battery charger (ATP synthase) filling batteries (ATP). Second panel boosts current to a generator (NADP⁺ reductase) producing fuel cells (NADPH)."
 }},
 "phase1": {{
   "hookSentence": "Plants absorb only 1-2%% of sunlight hitting their leaves — yet this narrow band powers the ATP and NADPH production that sustains virtually all life on Earth.",
   "microMetaphor": "The thylakoid membrane is a hydroelectric dam — photolysis floods protons into the thylakoid space, and ATP synthase is the turbine converting that gradient into usable energy.",
   "prerequisite": "Basic cell organelles (chloroplast structure) and oxidation-reduction reactions",
   "selection": [
     "When tracing energy conversion → Follow electron path H₂O → PSII → ETC → PSI → NADPH → Unlocks predicting where inhibitors block the chain",
     "When explaining ATP production → Focus on proton gradient and chemiosmosis → Unlocks connection to oxidative phosphorylation"
   ],
   "execution": "Identify photon absorption at PSII → Trace electron flow through ETC → Explain proton gradient → Connect to ATP synthase → Follow PSI to NADPH → Verify with isotope tracing"
 }},
 "phase2": [
   {{ "title": "Non-cyclic electron flow", "content": "Primary pathway: H₂O → PSII → plastoquinone → cytochrome b6f → plastocyanin → PSI → ferredoxin → NADP⁺ reductase → NADPH. Produces both ATP and NADPH. O₂ released from water splitting." }},
   {{ "title": "Cyclic electron flow", "content": "When Calvin cycle needs more ATP than NADPH, PSI electrons cycle back through cytochrome b6f. Generates ATP without NADPH or O₂. Fine-tunes the ATP:NADPH ratio." }},
   {{ "title": "Photophosphorylation vs. oxidative phosphorylation", "content": "Both use proton gradient + ATP synthase. Photophosphorylation uses light energy across thylakoid membrane; oxidative phosphorylation uses NADH/FADH₂ energy across inner mitochondrial membrane." }}
 ],
 "phase3": {{
   "tool": "Hill reaction assay — measure O₂ evolution with isolated chloroplasts and DCPIP electron acceptor",
   "metrics": ["O₂ evolution rate under different light wavelengths", "DCPIP reduction (blue → colorless) as electron transport proxy"]
 }},
 "shape": {{
   "simpleCore": "Light-dependent reactions capture solar energy to split water, releasing O₂ and producing ATP + NADPH — the energy carriers that fuel the Calvin cycle.",
   "highStakesExample": "Deepwater Horizon (2010) — crude oil blocked sunlight, reducing phytoplankton photosynthesis by 50%% in affected zones. Marine phytoplankton produce ~50%% of Earth's O₂ via light-dependent reactions, showing how disrupting photon availability cascades through the global oxygen budget.",
   "analogicalModel": "Two-stage rocket: Stage 1 (PSII) cracks fuel (water), releasing exhaust (O₂). Stage 2 (PSI) reignites electrons to reach escape velocity (NADPH). The transfer tunnel (ETC) spins a generator (ATP synthase).",
   "patternRecognition": {{
     "question": "DCMU (herbicide blocking PSII → plastoquinone electron flow) is added to chloroplasts. What happens to O₂, ATP, and NADPH production?",
     "answer": "O₂ stops (electrons cannot leave PSII). Non-cyclic ATP stops (no ETC flow). NADPH stops (no electrons reach PSI). Cyclic photophosphorylation around PSI may still produce some ATP."
   }},
   "eliminationLogic": "Light-dependent = thylakoid, needs light, produces ATP + NADPH + O₂. Calvin cycle = stroma, consumes ATP + NADPH, produces G3P. O₂ question → light-dependent. Carbon fixation → Calvin cycle."
 }},
 "keyPoints": ["Thylakoid membranes in chloroplasts", "Photolysis at PSII releases O₂", "ETC creates proton gradient for ATP synthase", "PSI reduces NADP⁺ to NADPH", "Cyclic flow produces only ATP"],
 "scoring": {{ "keywords": ["light-dependent", "thylakoid", "photolysis", "photosystem", "chemiosmosis"], "aliases": ["light reactions", "thylakoid reactions"] }},
 "criticalDistinctions": [
   {{ "correct": "O₂ from splitting H₂O at PSII (photolysis)", "incorrect": "O₂ produced in Calvin cycle during carbon fixation" }},
   {{ "correct": "Non-cyclic produces ATP + NADPH; cyclic produces only ATP", "incorrect": "Cyclic flow produces both ATP and NADPH" }}
 ],
 "designBoundaries": [
   {{ "boundary": "Light-dependent reactions produce energy carriers (ATP, NADPH) but do NOT fix carbon", "rationale": "Carbon fixation is Calvin cycle in stroma — confusing locations is the #1 exam error" }}
 ],
 "connections": [
   {{ "target": "Photosynthesis Mechanisms", "type": "is-part-of" }},
   {{ "target": "Chloroplast Structure", "type": "requires" }},
   {{ "target": "Chemiosmosis and ATP Synthase", "type": "causes" }}
 ]
}}
```
**CRITICAL**: The example above is the MINIMUM quality bar. Every concept you generate must match this depth and specificity **for your subject domain**. Adapt terminology, examples, and scenarios to the actual subject. If a field could apply to any concept by swapping the name, it is too generic and will be rejected.
---
## 5. CRITICAL RULES
1. **TREE INTEGRITY**: Every branch `parentName` = trunk name. Every leaf `parentName` = a branch name. Trunk `parentName` = null.
2. **QUANTITY**: Generate approximately {count} concepts (1 trunk + {branch_count} branches + ~{leaf_target} leaves).
3. **FORMAT**: Valid JSON array. NO markdown. NO text before/after.
4. **NAME FIELD**: Human-readable names only. Never use "concept-P1-001".
5. **ASSESSMENT CONTEXT**: Every concept framed for how it would be tested or assessed, not casual exploration.
6. **REAL EXAMPLES**: `shape.highStakesExample` must reference a real event, case study, or documented scenario with specifics (names, dates, outcomes). **SUBJECT-SPECIFIC**: Use examples from the actual subject domain — technology subjects use tech incidents, law subjects use landmark cases, science subjects use documented experiments or events, etc.
7. **NO DUPLICATION**: Only generate for "{domain_name}". Other domains are separate.
8. **UNIQUE EXAMPLES**: Every concept MUST use a DIFFERENT company/incident for `highStakesExample`. Never repeat the same case study across concepts. Every `mnemonic.anchor` must be a unique physical object — no two concepts may share the same anchor. Every `shape.patternRecognition.question` must present a unique scenario.
9. **CRITICAL DISTINCTIONS QUALITY**: The `incorrect` side must be a **plausible misconception** that a real student would hold — NOT an obviously wrong strawman. Bad: "IaaS and PaaS are the same thing". Good: "PaaS handles OS patching automatically" vs "PaaS still requires you to manage OS updates like IaaS".
10. **NO GENERIC FILLER**: Every field must contain domain-specific technical content. The following patterns cause **automatic rejection**:
   - "Why X matters", "Think of X as...", "Detailed explanation of Y", "Proper use of X vs Common misunderstanding"
   - "Without proper X, your/you...", "Improperly configured X...", "Without X security/access/controls..."
   - "X is a crucial/critical/essential component/part/aspect", "X provides a secure way to", "X are essential/crucial for"
11. **COMPLETE WORKED EXAMPLES**: Every branch and leaf concept MUST include a `workedExample` with ALL three fields populated:
   - `problem`: A specific, realistic scenario or exam-style question (minimum 20 words)
   - `solution`: The complete, correct answer with reasoning (minimum 20 words)
   - `steps`: Array of 3-6 numbered solution steps showing the reasoning process
   Empty or placeholder workedExamples cause **automatic rejection**.
12. **OBJECTIVE-BOUND GENERATION**: If exam objectives are listed above, every leaf concept MUST map to at least one listed objective. Do NOT invent topics beyond the provided objectives. Do NOT add concepts for technologies, features, or skills not explicitly listed. Concepts that cannot be traced back to a specific listed objective will be **automatically rejected**. If the objectives are silent on a topic, that topic is out of scope — even if it seems related.
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
    all_domains: list = None,
) -> str:
    domain_name = domain.get("name", f"Domain {domain_index + 1}")
    weight = domain.get("weight") or round(1.0 / max(total_domains, 1), 2)
    domain_weight_pct = int(weight * 100)
    subtopics = domain.get("subtopics", [])
    total_target = 100
    domain_concept_target = max(10, int(total_target * weight))
    has_string_subtopics = subtopics and all(isinstance(st, str) for st in subtopics)
    has_dict_subtopics = subtopics and any(isinstance(st, dict) for st in subtopics)
    if has_dict_subtopics:
        branch_count = sum(1 for st in subtopics if isinstance(st, dict))
    elif has_string_subtopics:
        branch_count = max(3, min(6, len(subtopics) // 3))
    else:
        branch_count = max(3, min(6, domain_concept_target // 5))
    leaf_target = domain_concept_target - 1 - branch_count
    count = 1 + branch_count + leaf_target
    if has_dict_subtopics:
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
    elif has_string_subtopics:
        branch_list = f"(Group the {len(subtopics)} exam objectives below into {branch_count} logical sub-topic branches. Each branch should cover a coherent cluster of related objectives.)"
    else:
        branch_list = f"(Determine {branch_count} logical sub-topic groupings for this domain based on exam structure)"
    nl = "\n"
    if has_dict_subtopics:
        objective_lines = []
        for st in subtopics:
            if isinstance(st, dict):
                st_name = st.get("name", "")
                objectives = st.get("objectives", [])
                objective_lines.append(f"**Sub-topic: {st_name}**")
                for obj in objectives:
                    objective_lines.append(f"  - {obj}")
        if objective_lines:
            context_block = f"### EXAM OBJECTIVES FOR THIS DOMAIN:\n{nl.join(objective_lines)}\n**CRITICAL**: Generate leaf concepts that cover EACH objective listed above. Do NOT generate concepts for topics not in this list — unlisted topics are out of scope and will be rejected."
        else:
            context_block = ""
    elif has_string_subtopics:
        objective_lines = [f"  - {st}" for st in subtopics]
        context_block = f"### EXAM OBJECTIVES FOR THIS DOMAIN:\n{nl.join(objective_lines)}\n**CRITICAL**: Generate leaf concepts that cover EACH objective listed above. Group related objectives under {branch_count} branch concepts. Do NOT generate concepts for topics not in this list — unlisted topics are out of scope and will be rejected."
    elif context:
        context_block = f"### USER-PROVIDED CONTEXT:\n{context}\n**INSTRUCTION**: Map concepts for domain \"{domain_name}\" to relevant objectives above."
    else:
        context_block = ""
    if all_domains and len(all_domains) > 1:
        sibling_names = [d.get("name", "") for i, d in enumerate(all_domains) if i != domain_index and d.get("name")]
        if sibling_names:
            sibling_list = ", ".join(f'"{s}"' for s in sibling_names)
            context_block += f"\n### SIBLING DOMAINS (generated separately — do NOT overlap):\n{sibling_list}\n**CRITICAL**: Do NOT generate concepts that belong to the above domains. If a topic could fit in multiple domains, only cover the aspects specific to \"{domain_name}\". Use different real-world examples and mnemonic anchors than what other domains might use."
    cls = classification or {}
    cls_data = cls.get("classification", {})
    tissue = cls.get("connectiveTissue", {})
    lifecycle = cls.get("lifecycle", {})
    subject_type = cls.get("subjectType", "conceptual")
    type_labels = {
        "procedural": "Procedural Mastery",
        "conceptual": "Conceptual Fluency",
        "cyclic": "Adaptive Integration",
        "perceptual": "Embodied Judgment",
    }
    
    # ULC Naming Guidance (only for procedural subjects)
    ulc_naming_guidance = ""
    if subject_type == "procedural" and lifecycle:
        phase1_verb = lifecycle.get("phase1", "").upper()
        phase2_verb = lifecycle.get("phase2", "").upper()
        phase3_verb = lifecycle.get("phase3", "").upper()
        
        if phase1_verb and phase2_verb and phase3_verb:
            ulc_naming_guidance = f"""
### Universal Life Cycle (ULC) Naming Convention:
**CRITICAL for Procedural Subjects**: This subject follows a systematic pattern where learners apply consistent verbs across multiple objects/resources.

**Lifecycle Verbs** (from classification): {phase1_verb}, {phase2_verb}, {phase3_verb}

**Naming Rules for LEAF Concepts**:
- Use the pattern: **[Verb] [Object/Resource]**
- Examples:
  - "{phase1_verb.capitalize()} Azure Storage Accounts"
  - "{phase2_verb.capitalize()} Virtual Networks"
  - "{phase3_verb.capitalize()} Identity Services"
- The verb should be one of the lifecycle verbs or a closely related action verb
- The object should be a clear, specific resource/entity (2-3 words max)
- Avoid generic names like "Storage Overview" — use "{phase1_verb.capitalize()} Storage Accounts" instead

**Why This Matters**: Systematic verb-object naming enables learners to see the Universal Life Cycle pattern — the same actions applied across different resources. This makes the subject structure immediately visible and supports systematic practice.

**Branch Concepts**: Can use broader names (e.g., "Storage Management", "Networking Fundamentals")
**Trunk Concept**: Use the domain name as-is (e.g., "{domain_name}")
"""
    
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
        ulc_naming_guidance=ulc_naming_guidance,
        context=context_block,
        branch_count=branch_count,
        branch_list=branch_list,
        leaf_target=leaf_target,
        count=count,
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
## TRACES CONNECTION TYPES (Typed Relational Architecture — use decision algorithm):
For each connection, ask IN ORDER and use the FIRST match:
1. Must you understand B before A? → **requires**
2. Is A a component of B? → **is-part-of**
3. Is A a specific variant of B? → **is-type-of**
4. Does A directly trigger or produce B? → **causes**
5. Does A set rules/limits on B? → **constrains**
6. ONLY if none above apply → **enables**
## GRAPH TOPOLOGY RULES:
- Trunk concepts: 0 outgoing connections (they receive is-part-of from branches).
- Branch concepts: Max 2 connections (1 is-part-of → trunk + 0-1 requires → sibling branch).
- Leaf concepts: Max 3 connections (1 is-part-of → branch + 1-2 same-branch connections). Cross-branch leaf connections are FORBIDDEN.
- `requires` must point to concepts with LOWER order numbers (prerequisite = earlier in sequence).
## CRITICAL RULES:
1. Fix the identified issue completely.
2. Ensure `shape.highStakesExample` is a REAL historical case study with Company + Year.
3. Ensure `mnemonic.story` is bizarre, memorable, and uses the anchor.
4. Use strictly positive framing.
5. Return ONLY valid JSON for the single concept object. NO markdown.
6. Every connection MUST use one of the 6 types above. Do NOT use "related-to", "extends", or "contains".
7. Respect the MAX connection caps above. Do NOT exceed them.
"""
def get_surgical_fix_prompt(subject: str, concept_name: str, issue: str) -> str:
    return SURGICAL_FIX_PROMPT.format(
        subject=subject, 
        concept_name=concept_name, 
        issue_description=issue
    )
GAP_FILL_PROMPT = """ACT AS: Expert professor and exam specialist for: {subject}
TASK: Generate supplementary leaf concepts to fill coverage gaps in domain "{domain_name}".

## EXISTING CONCEPTS IN THIS DOMAIN (DO NOT DUPLICATE):
{existing_concept_list}

## EXISTING BRANCHES (attach new leaves to these via parentName):
{existing_branch_list}

## UNCOVERED OBJECTIVES — GENERATE A LEAF CONCEPT FOR EACH:
{missing_objective_list}

## GENERATION RULES:
1. Generate exactly ONE leaf concept per uncovered objective (combine only if objectives are nearly identical)
2. Set `parentName` to the most relevant existing branch above
3. If no existing branch fits, create ONE new branch concept with `parentName`: "{domain_name}" and attach its leaves to it
4. `trunkDomain`: "{domain_name}"
5. `treeLevel`: "leaf" (or "branch" only if creating a new grouping)
6. Cognitive level: prefer "apply", "analyze", or higher for leaves
7. TRACES connections: Leaf max 3 (1 is-part-of → branch + 1-2 same-branch). Branch max 2 (1 is-part-of → trunk + 0-1 requires → sibling branch). Cross-branch leaf connections FORBIDDEN. `requires` must point to lower-order concepts only.
8. `workedExample`: problem (minimum 20 words), solution (minimum 20 words), steps (3-6 items) — REQUIRED
9. `mnemonic`: unique concrete anchor + spatial story — NO duplicates with existing concepts
10. ALL standard fields required: name, treeLevel, parentName, trunkDomain, cognitiveLevel, order, whyYouNeed, technicalDetails, workedExample, mnemonic, phase1 (hookSentence, microMetaphor, prerequisite, selection, execution), phase2 (array of title+content), phase3 (tool, metrics), shape (simpleCore, highStakesExample, analogicalModel, patternRecognition, eliminationLogic), keyPoints, commonPitfalls, scoring (keywords, aliases), connections, criticalDistinctions, designBoundaries
11. **OBJECTIVE-BOUND**: Generate ONLY for the uncovered objectives listed above. Do NOT add concepts for topics not in the list. If it is not listed, it is out of scope.

## FIELD QUALITY (automatic rejection if violated):
- hookSentence: Lead with surprising fact or specific failure. BANNED: "Without proper X..."
- microMetaphor: Use "X is/are [metaphor] — [mapping]". BANNED: "Think of X as..."
- whyYouNeed: State the problem solved. BANNED: "X is crucial/essential..."
- highStakesExample: REAL event with company/name + year + outcome
- mnemonic.anchor: Unique physical object, NOT the concept name
- selection items: "When [Scenario] Choose [Option] Unlocks [Capability]"
- criticalDistinctions: correct vs plausible misconception (NOT obvious strawman)

## OUTPUT:
Return ONLY a valid JSON array of concept objects. No markdown fences. No text before or after.
Generate the gap-fill concepts now:"""
def get_gap_fill_prompt(
    subject: str,
    domain_name: str,
    existing_concepts: list,
    existing_branches: list,
    missing_objectives: list,
) -> str:
    existing_concept_list = "\n".join(f"- {name}" for name in existing_concepts) if existing_concepts else "(none)"
    existing_branch_list = "\n".join(f"- {name}" for name in existing_branches) if existing_branches else "(none)"
    missing_objective_list = "\n".join(f"{i+1}. {obj}" for i, obj in enumerate(missing_objectives))
    return GAP_FILL_PROMPT.format(
        subject=subject,
        domain_name=domain_name,
        existing_concept_list=existing_concept_list,
        existing_branch_list=existing_branch_list,
        missing_objective_list=missing_objective_list,
    )

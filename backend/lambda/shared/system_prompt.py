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
- `connections`: mix of "enables" and "causes" to branches (NOT all "enables")
**BRANCH** (sub-topic):
- Medium granularity, grouping related knowledge
- `connections`: "is-part-of" to trunk, plus "requires"/"enables"/"constrains" to sibling branches where applicable
**LEAF** (testable detail):
- Maximum exam-relevant granularity
- At least 60% of leaves MUST be `apply` or higher cognitive level
- `connections`: "is-part-of" to its branch, PLUS at least 1 cross-branch connection using "requires", "is-type-of", "causes", or "constrains" (NOT "enables" unless no other type fits)
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
**DISTRIBUTION CONSTRAINT**: `enables` must NOT exceed 30% of all connections across the tree. If you find yourself defaulting to "enables", re-run the decision algorithm — most "enables" are actually "requires", "causes", or "constrains" in disguise.
**FORBIDDEN**: "related-to", "relates", "extends", "depends-on", or any vague association.
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
   "Confusing the light-dependent reactions (thylakoid membranes, produce ATP + NADPH) with the Calvin cycle (stroma, uses ATP + NADPH to fix CO₂)",
   "Assuming oxygen is produced in the Calvin cycle — O₂ is released during photolysis of water in Photosystem II, not during carbon fixation"
 ],
 "order": 15,
 "whyYouNeed": "Exam questions present diagrams of the chloroplast and ask where specific molecules are produced. Students who cannot trace the electron flow from H₂O through PSII → cytochrome b6f → PSI → NADP⁺ reductase consistently misidentify the source of ATP vs. NADPH and lose marks on transport chain questions.",
 "technicalDetails": "Light-dependent reactions occur on the thylakoid membrane. Photosystem II (P680) absorbs photons and splits water (photolysis: 2H₂O → 4H⁺ + 4e⁻ + O₂). Excited electrons pass through the electron transport chain (plastoquinone → cytochrome b6f → plastocyanin), creating a proton gradient that drives ATP synthase (chemiosmosis). Photosystem I (P700) re-energizes electrons, which reduce NADP⁺ to NADPH via ferredoxin and NADP⁺ reductase.",
 "workedExample": {{
   "problem": "A plant is given water labeled with ¹⁸O (heavy oxygen isotope). Where will the ¹⁸O atoms appear — in the glucose produced or in the oxygen gas released?",
   "solution": "The ¹⁸O will appear in the O₂ gas released, not in glucose. Oxygen gas comes from photolysis of water in PSII. The oxygen in glucose comes from CO₂ fixed in the Calvin cycle.",
   "steps": [
     "Identify that water is split in the light-dependent reactions at Photosystem II",
     "Recall the photolysis equation: 2H₂O → 4H⁺ + 4e⁻ + O₂ — the O₂ comes directly from H₂O",
     "Recognize that CO₂ (not H₂O) provides the oxygen atoms incorporated into G3P and glucose during the Calvin cycle",
     "Conclude: ¹⁸O from labeled water → released as ¹⁸O₂ gas"
   ]
 }},
 "mnemonic": {{
   "anchor": "Solar Panel Factory ☀️",
   "story": "Picture a rooftop solar panel (thylakoid membrane) with two relay stations (PSII and PSI). Sunlight hits the first panel, which cracks open water bottles (photolysis) releasing bubbles (O₂). The electrical current flows through wires (electron transport chain) to a battery charger (ATP synthase) that fills batteries (ATP). The second panel boosts the remaining current to power a special generator (NADP⁺ reductase) that produces fuel cells (NADPH)."
 }},
 "phase1": {{
   "hookSentence": "Plants absorb only 1-2%% of the sunlight hitting their leaves — yet this narrow band of captured photon energy drives the production of ATP and NADPH that powers virtually all life on Earth.",
   "microMetaphor": "The thylakoid membrane is a hydroelectric dam — photolysis floods protons into the thylakoid space, and ATP synthase is the turbine that converts that proton gradient into usable energy.",
   "prerequisite": "Understanding of basic cell organelles (chloroplast structure) and the concept of oxidation-reduction reactions",
   "selection": [
     "When tracing energy conversion → Follow the electron path from H₂O through PSII → ETC → PSI → NADPH → Unlocks ability to predict where inhibitors block the chain",
     "When explaining ATP production → Focus on the proton gradient across the thylakoid membrane and chemiosmosis → Unlocks connection to cellular respiration's oxidative phosphorylation"
   ],
   "execution": "Identify photon absorption at PSII → Trace electron flow through ETC → Explain proton gradient formation → Connect to ATP synthase → Follow PSI to NADPH production → Verify with isotope tracing experiments"
 }},
 "phase2": [
   {{
     "title": "Non-cyclic electron flow",
     "content": "The primary pathway: electrons flow from H₂O → PSII → plastoquinone → cytochrome b6f → plastocyanin → PSI → ferredoxin → NADP⁺ reductase → NADPH. This produces both ATP (via the proton gradient) and NADPH. Oxygen is released as a byproduct of water splitting."
   }},
   {{
     "title": "Cyclic electron flow",
     "content": "When the Calvin cycle demands more ATP than NADPH, electrons from PSI cycle back through cytochrome b6f instead of reducing NADP⁺. This generates additional ATP without producing NADPH or O₂. It fine-tunes the ATP:NADPH ratio."
   }},
   {{
     "title": "Photophosphorylation vs. oxidative phosphorylation",
     "content": "Both use a proton gradient + ATP synthase, but photophosphorylation uses light energy to drive electron flow across the thylakoid membrane, while oxidative phosphorylation uses chemical energy from NADH/FADH₂ across the inner mitochondrial membrane."
   }}
 ],
 "phase3": {{
   "tool": "Hill reaction assay — measure O₂ evolution rate with isolated chloroplasts and an electron acceptor (DCPIP)",
   "metrics": ["Rate of O₂ evolution under different light wavelengths", "DCPIP reduction (color change from blue to colorless) as proxy for electron transport activity"]
 }},
 "shape": {{
   "simpleCore": "The light-dependent reactions capture solar energy to split water, releasing O₂ and converting ADP + Pi to ATP and NADP⁺ to NADPH — the energy carriers that fuel the Calvin cycle.",
   "highStakesExample": "Deepwater Horizon Oil Spill (2010) — the massive crude oil layer on the Gulf of Mexico surface blocked sunlight penetration, reducing phytoplankton photosynthesis by up to 50%% in affected zones. Since marine phytoplankton produce ~50%% of Earth's oxygen via light-dependent reactions, the spill demonstrated how disrupting photon availability cascades through the entire global oxygen budget.",
   "analogicalModel": "Like a two-stage rocket: Stage 1 (PSII) provides the initial thrust by cracking fuel (water), releasing exhaust (O₂) and pushing electrons forward. Stage 2 (PSI) reignites the electrons with a second photon boost to reach escape velocity (NADPH). The transfer tunnel between stages (ETC) harvests momentum to spin a generator (ATP synthase).",
   "patternRecognition": {{
     "question": "A researcher adds DCMU (a herbicide that blocks electron flow from PSII to plastoquinone) to isolated chloroplasts. What happens to O₂ production, ATP synthesis, and NADPH production?",
     "answer": "O₂ production stops (water splitting still occurs but electrons cannot leave PSII). Non-cyclic ATP synthesis stops (no electron flow through cytochrome b6f). NADPH production stops (no electrons reach PSI). However, cyclic photophosphorylation around PSI may still produce some ATP if PSI is independently activated."
   }},
   "eliminationLogic": "Light-dependent reactions = thylakoid membrane, need light, produce ATP + NADPH + O₂; Calvin cycle = stroma, do not directly need light, consume ATP + NADPH, produce G3P. If a question mentions O₂ release → light-dependent. If it mentions carbon fixation → Calvin cycle."
 }},
 "keyPoints": [
   "Occurs on thylakoid membranes inside chloroplasts",
   "Photolysis of water at PSII releases O₂ and provides electrons",
   "Electron transport chain creates proton gradient for ATP synthase (chemiosmosis)",
   "PSI reduces NADP⁺ to NADPH via ferredoxin",
   "Cyclic electron flow produces only ATP (no NADPH or O₂)"
 ],
 "scoring": {{
   "keywords": ["light-dependent", "thylakoid", "photolysis", "photosystem", "chemiosmosis", "ATP synthase"],
   "aliases": ["light reactions", "photo-dependent reactions", "thylakoid reactions"]
 }},
 "criticalDistinctions": [
   {{ "correct": "O₂ is released from the splitting of H₂O at Photosystem II (photolysis)", "incorrect": "O₂ is produced during the Calvin cycle when CO₂ is fixed into glucose" }},
   {{ "correct": "Non-cyclic flow produces both ATP and NADPH; cyclic flow produces only ATP", "incorrect": "Cyclic electron flow produces both ATP and NADPH but skips water splitting" }}
 ],
 "designBoundaries": [
   {{ "boundary": "Light-dependent reactions produce energy carriers (ATP, NADPH) but do NOT fix carbon", "rationale": "Carbon fixation occurs in the Calvin cycle in the stroma — confusing these locations is the #1 exam error" }}
 ],
 "connections": [
   {{ "target": "Photosynthesis Mechanisms", "type": "is-part-of" }},
   {{ "target": "Chloroplast Structure", "type": "requires" }},
   {{ "target": "Cyclic Photophosphorylation", "type": "is-type-of" }},
   {{ "target": "Calvin Cycle", "type": "enables" }},
   {{ "target": "ATP Synthase", "type": "causes" }}
 ]
}}
```
**CRITICAL**: The example above is the MINIMUM quality bar. Every concept you generate must match this level of depth and specificity **for your subject domain**. Adapt all terminology, examples, and scenarios to the actual subject being generated. If a field could apply to any concept by just swapping the name, the content is too generic and will be rejected.
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
            context_block = f"### EXAM OBJECTIVES FOR THIS DOMAIN:\n{nl.join(objective_lines)}\n**CRITICAL**: Generate leaf concepts that cover EACH objective listed above."
        else:
            context_block = ""
    elif has_string_subtopics:
        objective_lines = [f"  - {st}" for st in subtopics]
        context_block = f"### EXAM OBJECTIVES FOR THIS DOMAIN:\n{nl.join(objective_lines)}\n**CRITICAL**: Generate leaf concepts that cover EACH objective listed above. Group related objectives under {branch_count} branch concepts."
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
    subject_type = cls.get("subjectType", "conceptual")
    type_labels = {
        "procedural": "Procedural Mastery",
        "conceptual": "Conceptual Fluency",
        "cyclic": "Adaptive Integration",
        "perceptual": "Embodied Judgment",
    }
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

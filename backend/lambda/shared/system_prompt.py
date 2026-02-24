import json

# SENSA System Prompt for Lambda
# Prompt Version: v9.0 (Exam-First Deep Structure — Zero Scope Creep)
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
CLASSIFICATION_PROMPT = """You are an expert cognitive scientist, curriculum architect, and **exam preparation specialist**.
OBJECTIVE: Analyze the subject "{subject}" and extract its structural blueprint — **strictly through the lens of what the exam tests**.
Goal: Every output must serve one purpose: preparing the learner to pass the exam. No practitioner knowledge beyond what the exam requires.

{context}

═══════════════════════════════════════════════════════════════════════════
PART A: EXAM-ORIENTED DEEP STRUCTURE EXTRACTION
(Rule: Extract the structural pattern that helps learners PREDICT how exam questions are constructed and answered. Focus on the exam syllabus structure, NOT on how practitioners use the knowledge on the job.)
═══════════════════════════════════════════════════════════════════════════

STEP 1: IDENTIFY THE ARCHETYPES (as tested by the exam)
Which of these 4 structural archetypes best describes how the EXAM organizes and tests this subject?
1. "sequential-flow" (Pipeline): The exam tests a chronological process (e.g., deployment steps, lifecycle phases, data flow).
2. "see-saw" (Balance): The exam tests trade-offs and constraints (e.g., CAP Theorem, cost vs. performance).
3. "spatial-map" (Geography): The exam tests where things live and how they relate (e.g., resource hierarchies, network topologies).
4. "heuristic" (Rule of Thumb): The exam tests decision-making under constraints (e.g., troubleshooting, security triage).

Select the `primaryArchetype`. If the subject is a hybrid, you may optionally select a `secondaryArchetype`. Set `isHybrid` to true if using two archetypes.

STEP 2: EXTRACT THE INVARIANT (THE EXAM'S CORE PRINCIPLE)
What is the ONE structural rule that, if the learner internalizes it, makes exam questions predictable?
State the principle directly. Do NOT use prefixes like "If you remember nothing else:". CRITICAL: Use strictly POSITIVE framing. Frame it as: "The exam consistently tests [principle] across all domains."

STEP 3: DEFINE THE UNIVERSAL LIFE CYCLE (ULC) BLUEPRINTS
Identify the 1 to 3 core "verbs" (Lifecycle Phases) the EXAM expects candidates to demonstrate.
Do NOT invent 3 phases if the exam only tests 1 or 2 core actions. Return null for unused phases.
For EACH verb, define the "Atomic Sequence" — the repeatable mental checklist for answering exam questions that test this verb.

STEP 4: SYNTHESIS & REVEAL SCRIPT
First, write a `synthesisRationale` explaining how the archetype and invariant help the learner decode exam questions.
Then, write the `revealScript`: A focused, 2-3 sentence insight illuminating how the exam is structured.
CRITICAL: Use strictly POSITIVE, scholarly framing. Focus on exam structure elegance.

═══════════════════════════════════════════════════════════════════════════
PART B: EXAM SYLLABUS MAPPING
(Rule: Act as a strict Exam Administrator mapping out the testable domain weightings. Every domain must map to actual exam content.)
═══════════════════════════════════════════════════════════════════════════

Group the provided context into 4-6 testable exam domains. Estimate realistic exam weights (must sum to 1.0).
**CRITICAL**: Every domain and subtopic MUST correspond to content that appears on the exam. Do NOT add domains for "general knowledge" or "nice to know" topics that fall outside exam scope.

═══════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT (JSON ONLY)
═══════════════════════════════════════════════════════════════════════════
Return ONLY valid JSON. No markdown fences. No text before or after.

{{
  "subjectType": "procedural" | "conceptual" | "cyclic" | "perceptual",
  "classification": {{
    "type": "procedural" | "conceptual" | "cyclic" | "perceptual",
    "label": "Procedural Mastery" | "Conceptual Fluency" | "Adaptive Integration" | "Embodied Judgment",
    "goal": "One sentence describing the high-level learning goal"
  }},
  "deepStructure": {{
    "primaryArchetype": "sequential-flow" | "see-saw" | "spatial-map" | "heuristic",
    "secondaryArchetype": "sequential-flow" | "see-saw" | "spatial-map" | "heuristic" | null,
    "isHybrid": true | false,
    "invariantRule": "The core principle stated directly without prefixes...",
    "synthesisRationale": "Chain of Thought: Explain why this specific archetype fits...",
    "revealScript": "The expert insight illuminating the deep structure..."
  }},
  "lifecycleBlueprints": {{
    "phase1": {{
      "verb": "VERB1",
      "blueprintName": "Name of the trick",
      "sequence": ["Step 1", "Step 2", "Step 3"]
    }},
    "phase2": {{
      "verb": "VERB2",
      "blueprintName": "Name of the trick",
      "sequence": ["Step A", "Step B"]
    }},
    "phase3": null
  }},
  "examDomains": [
    {{
      "name": "Domain Name",
      "weight": 0.20,
      "subtopics": ["Sub-topic 1", "Sub-topic 2"]
    }}
  ]
}}

Analyze the subject now."""

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

**EXAM-FIRST MANDATE** (violating any of these causes AUTOMATIC REJECTION):
1. Every concept MUST map to knowledge the exam explicitly tests — no "nice to know" filler
2. Frame concepts as the exam tests them, NOT as a practitioner would use them on the job
3. The tree must reflect the EXAM SYLLABUS structure, not a textbook's chapter order
4. Every leaf concept MUST answer: "What exam question does this prepare the learner for?"
5. If a concept cannot be tied to a specific exam objective or question type, it is OUT OF SCOPE — do NOT generate it
6. `whyYouNeed` must explain how this concept is TESTED, not why it matters in practice
7. `patternRecognition` must simulate a REAL exam question format for this subject
8. `eliminationLogic` must teach how to eliminate wrong answers ON THE EXAM
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
### LEAVES (minimum 3 per branch, target 4-5 per branch, ~{leaf_target} total)
- Granular, testable exam concepts — the MOST IMPORTANT tier
- Each leaf maps to specific exam-testable knowledge
- Learnable in 5-10 minutes
- `treeLevel`: "leaf"
- `parentName`: the branch concept name it belongs to
- **MANDATORY**: Every branch MUST have at least 3 leaf children. If a branch has fewer than 3 testable sub-concepts, merge it into a sibling branch instead.
---
## 3. CONCEPT GENERATION RULES
### 3.1 REQUIRED FIELDS (ALL CONCEPTS):
- **Tree**: treeLevel, parentName, trunkDomain
- **Core**: name, cognitiveLevel, commonPitfalls, order
- **Engagement**: phase1 (hookSentence, microMetaphor, prerequisite, selection, execution)
- **Memory**: mnemonic (anchor + story)
- **Understanding**: keyPoints, whyYouNeed, technicalDetails, shape
- **Exam Approach Blueprints**: perspectives (2-4 items per concept — see §3.6)
- **Deep Structure**: blueprintSteps (leaf concepts only — see §3.7), primaryLifecycleVerb (leaf concepts only — see §3.7)
- **Application**: phase2 (array of plain strings), phase3 (tool, metrics)
- **Relationship**: connections (see §3.4)
- **Scoring**: keywords (3-5 terms), aliases (3-5 synonyms)
- **Exam Context**: examContext (leaf concepts only — see §3.8)
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
### 3.4 THE RATE FRAMEWORK FOR MINDMAP CONNECTIONS
The silver bullet goal: every line must instantly communicate the nature of the relationship without needing to read the label.
4 Line Types (Use these for the connection `type`):
1. `solid` → Is / Has / Belongs to (A direct, factual relationship. Parent-child, category-member, whole-part. "This thing IS or HAS that thing.")
2. `dashed` → Influences / Relates to (An indirect or associative relationship. Cross-branch connections, cause-effect, correlation. "This thing AFFECTS or CONNECTS to that thing.")
3. `arrow` → Leads to / Produces / Requires (A directional relationship. Sequence, dependency, output. "This thing CREATES or NEEDS that thing.")
4. `double-arrow` → Exchanges with / Depends mutually (Bidirectional dependency or feedback loop. "These things FEED each other.")

**The One Rule**: Before making a connection, finish this sentence: "A [source node] _______ a [target node]." Then map the verb to the line type:
- is / has / contains → `solid`
- influences / relates / connects → `dashed`
- leads to / requires / produces → `arrow`
- mutually depends / reinforces → `double-arrow`
If you can't finish the sentence, the connection shouldn't exist yet. FORBIDDEN types: "requires", "is-part-of", "enables". ONLY use the 4 types above.

**GRAPH TOPOLOGY RULES**:
- Trunk = 0 outgoing connections. Branch = max 2 (1 `solid` → trunk + 0-1 `arrow` → sibling branch). Leaf = max 3 (1 `solid` → branch + 1-2 same-branch connections).
- `arrow` MUST point to a LOWER `order` number if used for sequence. No cycles.
- Cross-branch leaf connections are FORBIDDEN.
### 3.5 COGNITIVE LEVELS (Bloom's):
Trunk: `understand`. Branch: `understand`/`apply`. Leaf: prefer `apply`, `analyze`, `evaluate`, `create`.
### 3.6 EXAM APPROACH BLUEPRINTS — `perspectives` field
This is the most important field for learners. Each perspective represents a different **exam-tested approach** to the same concept. The student flicks between them to understand every angle the exam might test.

**Structure**: `perspectives` is an array of 2-4 objects:
```json
{{ "label": "Portal", "blueprint": "How the exam tests this via this approach", "steps": ["Step 1", "Step 2", ...] }}
```

**Label guidance by subject type** (each label = an angle the EXAM tests):
- **Procedural (cloud/infra)**: `"Portal"`, `"CLI"`, `"Terraform"`, `"PowerShell"` — the exam tests the same task via different tools
- **Procedural (coding)**: `"Imperative"`, `"Declarative"`, `"Functional"`, `"OOP"` — the exam tests different paradigm approaches
- **Conceptual (law)**: `"Plaintiff"`, `"Defendant"`, `"Court"` — the exam tests analysis from each party's perspective
- **Conceptual (finance)**: `"Micro View"`, `"Macro View"`, `"Risk Lens"` — the exam tests at different analytical scales
- **Cyclic**: `"Diverge"`, `"Converge"`, `"Reflect"` — the exam tests recognition of phase transitions
- **Perceptual**: `"Pattern Recognition"`, `"Differential"`, `"Confirmation"` — the exam tests diagnostic reasoning approaches

**Steps**: Real exam-relevant commands, procedures, or reasoning chains — not generic descriptions. Every step must reflect what the exam expects the candidate to know.

**CRITICAL**: Every leaf concept MUST have `perspectives`. Trunk and branch concepts may omit it.
{blueprint_scaffold}
### 3.7 BLUEPRINT-ALIGNED LIFECYCLE — `blueprintSteps` + `primaryLifecycleVerb` fields
These fields connect each concept to the subject's deep structure, creating a repeating mnemonic scaffold AND enabling visual sorting on the concept map.

#### `primaryLifecycleVerb` (REQUIRED for all leaf concepts)
Each leaf concept must declare the ONE lifecycle verb that BEST describes this concept's primary action. This determines which arm/branch the concept appears on in the concept map.

**Rules**:
1. The value MUST be one of the lifecycle verbs from the blueprint (e.g., "PREPARE", "MODEL", "DELIVER")
2. Choose the verb that most directly describes what this concept IS ABOUT — not just one it touches
3. Aim for roughly equal distribution across verbs — each verb should have a similar number of concepts
4. Set `"primaryLifecycleVerb": "VERB"` as a top-level field on the concept object

#### `blueprintSteps` (REQUIRED for all leaf concepts)
**Structure**: `blueprintSteps` is an array of objects, one per lifecycle phase that exists.
**CRITICAL ORDERING**: The FIRST entry in the array MUST use the same verb as `primaryLifecycleVerb`.

```json
{{ "verb": "PREPARE", "atomicStep": "Identify scope", "instantiation": "Determine which Azure resources need RBAC role assignment" }}
```

- `verb`: The lifecycle verb from the blueprint (e.g., PREPARE, MODEL, DELIVER)
- `atomicStep`: The exact atomic step from the blueprint sequence (copy verbatim)
- `instantiation`: How THIS concept instantiates that atomic step — the specific domain action

**Rules**:
1. Every leaf concept MUST have `blueprintSteps` for each lifecycle phase provided
2. The FIRST element's verb MUST match `primaryLifecycleVerb`
3. The `atomicStep` value MUST be copied verbatim from the blueprint sequence — do NOT rephrase
4. The `instantiation` must be concrete and specific to THIS concept — not a generic restatement
5. The pattern should feel like the same skeleton with different flesh: a learner who sees 3-4 concepts will internalize the scaffold

**CRITICAL**: Every leaf concept MUST have `blueprintSteps`. Trunk and branch concepts may omit it.
### 3.8 EXAM CONTEXT — `examContext` field (leaf concepts only)
This field anchors every concept to the exam syllabus. It tells the learner exactly WHERE this concept fits in the exam and HOW it will be tested.

**Structure**:
```json
{{ "examObjective": "The specific exam objective this concept maps to", "questionTypes": ["multiple-choice", "scenario-based"], "examTip": "Actionable advice for answering exam questions on this topic" }}
```

- `examObjective`: Copy the EXACT exam objective/task from the syllabus (or paraphrase if not provided). Must be specific, not generic.
- `questionTypes`: Array of 1-3 question formats the exam uses for this topic. Valid types: `"multiple-choice"`, `"scenario-based"`, `"drag-and-drop"`, `"case-study"`, `"fill-in-the-blank"`, `"true-false"`, `"matching"`, `"short-answer"`, `"essay"`, `"practical"`, `"oral"`.
- `examTip`: One sentence of concrete exam strategy. BANNED: generic advice like "Read the question carefully". GOOD: "When the question mentions 'least privilege', eliminate any answer that grants broader permissions than needed."

**CRITICAL**: Every leaf concept MUST have `examContext`. Trunk and branch concepts may omit it.
---
## 4. OUTPUT FORMAT
Return A SINGLE JSON ARRAY containing ALL concepts for this domain.
### 4.1 QUALITY STANDARD — CONCRETE EXAMPLE
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
   "Non-cyclic electron flow: H₂O → PSII → plastoquinone → cytochrome b6f → plastocyanin → PSI → ferredoxin → NADP⁺ reductase → NADPH. Produces both ATP and NADPH. O₂ released from water splitting.",
   "Cyclic electron flow: When Calvin cycle needs more ATP than NADPH, PSI electrons cycle back through cytochrome b6f. Generates ATP without NADPH or O₂.",
   "Photophosphorylation vs. oxidative phosphorylation: Both use proton gradient + ATP synthase. Photophosphorylation uses light energy across thylakoid membrane; oxidative phosphorylation uses NADH/FADH₂ energy."
 ],
 "phase3": {{
   "tool": "Hill reaction assay — measure O₂ evolution with isolated chloroplasts and DCPIP electron acceptor",
   "metrics": ["O₂ evolution rate under different light wavelengths", "DCPIP reduction (blue → colorless) as electron transport proxy"]
 }},
 "perspectives": [
   {{
     "label": "Mechanistic",
     "blueprint": "Trace the physical movement of electrons and protons through each protein complex in sequence",
     "steps": ["Photon strikes P680 at PSII → electron ejected to high energy state", "Photolysis splits H₂O → 2H⁺ + 2e⁻ + ½O₂ (replaces ejected electron)", "Electron flows: plastoquinone → cytochrome b6f → plastocyanin (proton gradient builds)", "Proton gradient drives ATP synthase → ATP produced (chemiosmosis)", "Photon strikes P700 at PSI → electron re-energized → ferredoxin → NADP⁺ reductase → NADPH"]
   }},
   {{
     "label": "Isotope Tracing",
     "blueprint": "Follow labeled atoms (¹⁸O, ¹⁴C) to determine which molecule each atom ends up in",
     "steps": ["Label water with ¹⁸O → track where oxygen atoms go", "¹⁸O from H₂O → released as ¹⁸O₂ gas at PSII (photolysis)", "CO₂ provides carbon AND oxygen for glucose in Calvin cycle", "Conclusion: O₂ gas = from water, not CO₂; glucose oxygen = from CO₂"]
   }},
   {{
     "label": "Inhibitor Analysis",
     "blueprint": "Block specific steps with inhibitors and predict which products stop being made",
     "steps": ["DCMU blocks PSII → plastoquinone electron flow stops", "Result: O₂ stops (no photolysis), non-cyclic ATP stops, NADPH stops", "Cyclic flow around PSI may still produce some ATP", "Antimycin A blocks cyclic flow → only non-cyclic remains active"]
   }}
 ],
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
 "connections": [
   {{ "target": "Photosynthesis Mechanisms", "type": "is-part-of" }},
   {{ "target": "Chloroplast Structure", "type": "requires" }},
   {{ "target": "Chemiosmosis and ATP Synthase", "type": "causes" }}
 ],
 "blueprintSteps": [
   {{ "verb": "IDENTIFY", "atomicStep": "Locate the reaction site", "instantiation": "Thylakoid membrane in the chloroplast — specifically PSII and PSI complexes embedded in the lipid bilayer" }},
   {{ "verb": "TRACE", "atomicStep": "Follow the energy pathway", "instantiation": "Photon → P680 excitation → electron ejection → ETC (plastoquinone → cyt b6f → plastocyanin) → P700 → ferredoxin → NADP⁺ reductase → NADPH" }},
   {{ "verb": "VERIFY", "atomicStep": "Confirm products and byproducts", "instantiation": "Products: ATP (chemiosmosis), NADPH (terminal acceptor). Byproduct: O₂ (from photolysis of H₂O at PSII). Verify: O₂ comes from water, NOT CO₂." }}
 ],
 "primaryLifecycleVerb": "IDENTIFY",
 "examContext": {{
   "examObjective": "Explain the role of light-dependent reactions in photosynthesis, including the products formed and their destinations",
   "questionTypes": ["multiple-choice", "scenario-based"],
   "examTip": "When a diagram shows the thylakoid membrane, trace the electron flow LEFT to RIGHT (PSII → ETC → PSI) — questions about 'where is O₂ produced' always point to PSII/photolysis, never the Calvin cycle."
 }}
}}
```
**CRITICAL**: The example above is the MINIMUM quality bar. Every concept you generate must match this depth and specificity **for your subject domain**. Adapt terminology, examples, and scenarios to the actual subject. If a field could apply to any concept by swapping the name, it is too generic and will be rejected.
---
## 4.2 SHAPE LENS RULES (subject-type-specific)
The `shape` object has 5 lenses. Each must be tailored to the subject type:

**`simpleCore`** — One sentence, zero jargon. The irreducible idea.
- Procedural: "What this resource/action does in one sentence."
- Conceptual: "The core principle in plain language."
- Cyclic/Perceptual: "The key insight that changes how you see this."

**`analogicalModel`** — "[Concept] is/are [concrete system] — [precise mapping of parts]."
- Procedural (Azure/AWS/GCP): Map to a physical infrastructure analogy (e.g., "An NSG is a building security desk — rules are the visitor policy, inbound = arrivals, outbound = departures").
- Procedural (CLI/Terraform/Portal): Explicitly name the tool context: "In Terraform, this resource block is like a blueprint — `azurerm_virtual_network` declares the floor plan before any walls are built."
- Conceptual (Law/Music/Finance): Map to a familiar social/physical system.
- Perceptual: Map to a sensory or spatial experience.
BANNED: "Think of X as..." — use "X is/are [metaphor] —" format only.

**`highStakesExample`** — REAL event: Company/Person + Year + specific outcome.
- Procedural (cloud/infra): Use real outages, breaches, or misconfigurations (e.g., "Capital One (2019) — misconfigured WAF allowed SSRF, exposing 100M records stored in S3").
- Procedural (DevOps/IaC): Use real deployment failures or rollback incidents.
- Conceptual (Law): Use real court cases with citation and ruling.
- Conceptual (Finance): Use real market events with dates and figures.
- Perceptual (Medicine/Chess): Use real diagnostic errors or match decisions.
BANNED: Generic "Company X lost money because of poor Y" — must have real names, year, and specific technical detail.
**FACTUAL ACCURACY — CRITICAL**: The connection between the event and the concept MUST be the documented, publicly known cause. DO NOT invent a technical mechanism linking a real disaster to the concept being taught.
- FORBIDDEN: Claiming the Columbia disaster was caused by "linear approximations for atmospheric drag" (it was foam strike damage to thermal tiles).
- FORBIDDEN: Claiming the Tacoma Narrows collapse was preventable by "algebraic modeling" (the aeroelastic flutter mechanism was not understood at the time).
- FORBIDDEN: Claiming the Mars Climate Orbiter failed due to "rational function asymptotic analysis" (it was a metric/imperial unit mismatch).
- FORBIDDEN: Inventing specific equations, coordinates, or calculations that were never documented (e.g., fabricated trajectory equations for the Titanic).
- FORBIDDEN: Attributing a disaster to the concept being taught when the real cause was something else entirely.
If you cannot find a real, documented connection between a well-known disaster and the concept, use a DIFFERENT, LESS FAMOUS event where the connection is genuine — or use a real business/scientific application instead of a disaster.

**`patternRecognition`** — Scenario-based Q&A that forces the learner to apply the concept.
- Procedural: "You are given [specific exam scenario with resource names/configs]. What happens / What should you do?"
- Conceptual: "A client presents [specific fact pattern]. Which doctrine applies and why?"
- Cyclic: "The team is at [specific phase]. What signal tells you to iterate vs. proceed?"
- Perceptual: "You observe [specific symptom/pattern]. What is the most likely cause?"
The `answer` must explain the reasoning chain, not just state the answer.

**`eliminationLogic`** — How to eliminate wrong answers on an exam.
- Procedural: "If the question mentions [X] → eliminate [Y] because [reason]. If [A] and [B] are both present → choose [A] because [distinction]."
- Conceptual: "Distinguish [concept] from [similar concept]: [concept] requires [element], [similar] does not."
- Perceptual: "When you see [signal] → rule out [condition] first because [reason]."
This must be actionable decision logic, not a restatement of the concept.
---
## 5. CRITICAL RULES
1. **TREE INTEGRITY**: Every branch `parentName` = trunk name. Every leaf `parentName` = a branch name. Trunk `parentName` = null.
2. **QUANTITY**: ~{count} concepts (1 trunk + {branch_count} branches + ~{leaf_target} leaves). **TIER RATIO**: Leaves MUST outnumber branches. Target ratio: leaves ≥ 2× branches. If you have {branch_count} branches, you MUST generate at least {leaf_target} leaves. Do NOT create extra branches — each branch MUST have 3-5 leaf children.
3. **FORMAT**: Valid JSON array. NO markdown. NO text before/after.
4. **NAME FIELD**: Human-readable names only.
5. **EXAM-BOUND FRAMING**: Frame EVERY field for how the concept is TESTED on the exam. `whyYouNeed` = how it's tested, `patternRecognition` = exam question simulation, `eliminationLogic` = exam answer elimination. No casual exploration.
6. **REAL EXAMPLES**: `shape.highStakesExample` must reference a real event with specifics (names, dates, outcomes) from the subject domain. The causal link between the event and the concept must be the DOCUMENTED cause — never fabricate a technical mechanism to connect a famous disaster to the concept being taught. If unsure whether the connection is real, use a different example.
7. **NO DUPLICATION**: Only generate for "{domain_name}".
8. **UNIQUENESS**: Every `highStakesExample` uses a different case. Every `mnemonic.anchor` is a unique physical object. Every `patternRecognition.question` is a unique scenario.
9. **CRITICAL DISTINCTIONS**: The `incorrect` side must be a plausible misconception, not an obvious strawman.
10. **NO GENERIC FILLER** — BANNED patterns: "Why X matters", "Think of X as...", "Without proper X...", "X is crucial/essential...", "Detailed explanation of..."
11. **COMPLETE WORKED EXAMPLES**: `problem` (20+ words), `solution` (20+ words), `steps` (3-6 items). All three required.
12. **OBJECTIVE-BOUND**: If exam objectives are listed, every leaf MUST map to a listed objective. Do NOT invent topics beyond the provided objectives. Every leaf's `examContext.examObjective` must cite the specific objective it covers.
13. **ZERO SCOPE CREEP**: If a topic is interesting but NOT on the exam syllabus, do NOT generate it. Coverage of exam objectives takes absolute priority over depth or breadth beyond the syllabus.
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

    # Dynamic total_target: scale with exam complexity
    # Count total objectives across all domains to size the target appropriately
    total_objectives = 0
    if all_domains:
        for d in all_domains:
            for st in d.get("subtopics", []):
                if isinstance(st, str):
                    total_objectives += 1
                elif isinstance(st, dict):
                    total_objectives += max(1, len(st.get("objectives", [])))
    # Base target is 40 concepts; capped to fit within Lambda 900s timeout
    # (each concept generates ~3-5K chars of JSON, limited by output token budget)
    total_target = min(40, max(40, int(total_objectives * 1.2))) if total_objectives > 0 else 40
    domain_concept_target = max(6, int(total_target * weight))
    has_string_subtopics = subtopics and all(isinstance(st, str) for st in subtopics)
    has_dict_subtopics = subtopics and any(isinstance(st, dict) for st in subtopics)
    if has_dict_subtopics:
        branch_count = sum(1 for st in subtopics if isinstance(st, dict))
    elif has_string_subtopics:
        branch_count = max(3, min(6, len(subtopics) // 3))
    else:
        branch_count = max(3, min(6, domain_concept_target // 5))
    leaf_target = domain_concept_target - 1 - branch_count
    # Enforce leaf > branch invariant (minimum 3 leaves per branch)
    min_leaves = branch_count * 3
    if leaf_target < min_leaves:
        leaf_target = min_leaves
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

**`primaryLifecycleVerb` Assignment for Concept Map Arms**:
Each leaf concept MUST set `"primaryLifecycleVerb"` to exactly one of: "{phase1_verb}", "{phase2_verb}", or "{phase3_verb}".
This field determines which arm/branch the concept appears on in the visual concept map.
- **DISTRIBUTE EVENLY**: Aim for roughly equal numbers of concepts per verb. If you have 15 leaves, each verb should get ~5.
- **CHOOSE BY PRIMARY ACTION**: Pick the verb that BEST describes the concept's core action (e.g., "Create Storage Account" → "{phase1_verb}", "Configure Networking" → "{phase2_verb}").
- The concept name's leading verb must match `primaryLifecycleVerb` whenever possible.

**Branch Concepts**: Can use broader names (e.g., "Storage Management", "Networking Fundamentals")
**Trunk Concept**: Use the domain name as-is (e.g., "{domain_name}")
"""
    # Blueprint scaffold injection
    blueprint_scaffold = ""
    blueprints = cls.get("lifecycleBlueprints", {})
    if blueprints:
        scaffold_lines = []
        scaffold_lines.append("### DEEP STRUCTURE BLUEPRINT (Mnemonic Scaffold)")
        scaffold_lines.append("The classification phase identified the following lifecycle blueprint for this subject.")
        scaffold_lines.append("Every leaf concept MUST instantiate each phase's atomic steps for its specific domain content.")
        scaffold_lines.append("")
        for phase_key in ["phase1", "phase2", "phase3"]:
            bp = blueprints.get(phase_key)
            if bp and isinstance(bp, dict) and bp.get("verb"):
                verb = bp["verb"]
                bp_name = bp.get("blueprintName", "")
                sequence = bp.get("sequence", [])
                if sequence:
                    steps_str = " → ".join(sequence)
                    scaffold_lines.append(f"**{verb}** ({bp_name}): {steps_str}")
                    scaffold_lines.append(f"  Atomic steps: {json.dumps(sequence)}")
        if len(scaffold_lines) > 3:
            scaffold_lines.append("")
            scaffold_lines.append('For each leaf concept, generate `blueprintSteps` that maps each atomic step to this concept\'s specific content (see §3.7).')
            blueprint_scaffold = "\n".join(scaffold_lines)
        else:
            blueprint_scaffold = ""
    
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
        blueprint_scaffold=blueprint_scaffold,
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
 ],
 "blueprintSteps": [
 {{ "verb": "VERB", "atomicStep": "Exact atomic step from blueprint", "instantiation": "How this concept instantiates that step" }}
 ],
 "examContext": {{
 "examObjective": "The specific exam objective this concept maps to",
 "questionTypes": ["multiple-choice", "scenario-based"],
 "examTip": "Concrete exam strategy for this topic"
 }}
}}
```
## THE RATE FRAMEWORK FOR MINDMAP CONNECTIONS:
The silver bullet goal: every line must instantly communicate the nature of the relationship.
4 Line Types (Use these for the connection `type`):
1. `solid` → Is / Has / Belongs to (A direct, factual relationship. Parent-child, category-member, whole-part.)
2. `dashed` → Influences / Relates to (An indirect or associative relationship. Cross-branch connections, cause-effect, correlation.)
3. `arrow` → Leads to / Produces / Requires (A directional relationship. Sequence, dependency, output.)
4. `double-arrow` → Exchanges with / Depends mutually (Bidirectional dependency or feedback loop.)

**The One Rule**: Finish the sentence: "A [source node] _______ a [target node]." Map the verb:
- is / has / contains → `solid`
- influences / relates / connects → `dashed`
- leads to / requires / produces → `arrow`
- mutually depends / reinforces → `double-arrow`

## GRAPH TOPOLOGY RULES:
- Trunk concepts: 0 outgoing connections.
- Branch concepts: Max 2 connections (1 `solid` → trunk + 0-1 `arrow` → sibling branch).
- Leaf concepts: Max 3 connections (1 `solid` → branch + 1-2 same-branch connections). Cross-branch leaf connections are FORBIDDEN.
- `arrow` must point to concepts with LOWER order numbers (if sequence).
## CRITICAL RULES:
1. Fix the identified issue completely.
2. Ensure `shape.highStakesExample` is a REAL historical case study with Company + Year.
3. Ensure `mnemonic.story` is bizarre, memorable, and uses the anchor.
4. Use strictly positive framing.
5. Return ONLY valid JSON for the single concept object. NO markdown.
6. Every connection MUST use one of the 4 RATE types (`solid`, `dashed`, `arrow`, `double-arrow`). Do NOT use old types like "requires" or "is-part-of".
7. Respect the MAX connection caps above. Do NOT exceed them.
"""
def get_surgical_fix_prompt(subject: str, concept_name: str, issue: str) -> str:
    return SURGICAL_FIX_PROMPT.format(
        subject=subject, 
        concept_name=concept_name, 
        issue_description=issue
    )
GAP_FILL_PROMPT = """ACT AS: Expert professor and exam preparation specialist for: {subject}
TASK: Generate supplementary leaf concepts to fill EXAM COVERAGE GAPS in domain "{domain_name}".
**EXAM-FIRST MANDATE**: Every concept generated here must map directly to an uncovered exam objective. Do NOT add concepts for "nice to know" topics — only fill gaps in exam syllabus coverage.

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
10. ALL standard fields required: name, treeLevel, parentName, trunkDomain, cognitiveLevel, order, whyYouNeed, technicalDetails, workedExample, mnemonic, phase1 (hookSentence, microMetaphor, prerequisite, selection, execution), phase2 (array of title+content), phase3 (tool, metrics), shape (simpleCore, highStakesExample, analogicalModel, patternRecognition, eliminationLogic), keyPoints, commonPitfalls, scoring (keywords, aliases), connections, blueprintSteps (array of verb/atomicStep/instantiation objects — leaf concepts only), primaryLifecycleVerb (string — the ONE lifecycle verb this concept primarily belongs to — leaf concepts only), examContext (examObjective, questionTypes array, examTip — leaf concepts only)
11. **OBJECTIVE-BOUND**: Generate ONLY for the uncovered objectives listed above. Do NOT add concepts for topics not in the list. If it is not listed, it is out of scope. Every concept's `examContext.examObjective` must cite the exact uncovered objective it fills.

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

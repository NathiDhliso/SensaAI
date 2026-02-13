# Desirable Results — Generated Content Quality Guide

What each field in a generated concept should look like, using AZ-104 as an example.

---

## 1. What Lambda Returns Per Concept

Lambda returns a JSON array of concepts. Each concept has these fields. Below is what a **good** result looks like vs. a **bad** one, using "Network Security Groups" from AZ-104.

### Core Identity

| Field | Good | Bad |
|-------|------|-----|
| `name` | "Network Security Groups (NSGs)" | "concept-P1-003" or "Security" |
| `cognitiveLevel` | "apply" | missing (defaults to "remember") |
| `order` | 12 | missing or 0 |
| `commonPitfalls` | ["Forgetting NSGs are stateful", "Wrong priority order (lower number = higher priority)"] | [] or missing |

**Rules:**
- `name` must be human-readable, specific, and learnable in 5-10 minutes
- `cognitiveLevel` must be one of: remember, understand, apply, analyze, evaluate, create
- Configuration/troubleshooting concepts must be `apply` or higher — never `remember`

---

### Engagement — phase1

```json
{
 "hookSentence": "Without NSGs, every VM you deploy is wide open to the internet — no firewall, no rules, no protection.",
 "microMetaphor": "Think of an NSG as a bouncer at a nightclub with a very specific guest list.",
 "prerequisite": "Virtual Networks, Subnets",
 "selection": [
 "When you need to filter traffic at the subnet level Choose NSG on subnet Unlocks bulk protection for all VMs",
 "When you need per-VM rules Choose NSG on NIC Unlocks granular control per machine"
 ],
 "execution": "Create NSG Define inbound/outbound rules by priority Associate to subnet or NIC Test with Network Watcher"
}
```

| Field | Good | Bad |
|-------|------|-----|
| `hookSentence` | Specific, creates urgency, mentions real consequence | "NSGs are important." or generic filler |
| `microMetaphor` | Concrete object OUTSIDE the domain (bouncer, guest list) | "NSGs are like a firewall" (same domain) |
| `prerequisite` | Names actual other concepts in the set | "None" for everything, or "Basic knowledge" |
| `selection` | Follows "When [scenario] Choose [option] Unlocks [capability]" pattern | Generic bullet points with no decision logic |
| `execution` | Step-by-step action sequence a practitioner would follow | "Use NSGs to secure your network" (vague) |

---

### Memory — mnemonic

```json
{
 "anchor": "Nightclub Bouncer ",
 "story": "The Bouncer (NSG) stands at the Door (subnet). He checks the Guest List (rules) sorted by VIP number (priority). Guests with low numbers get checked first. If your name isn't on the list, you're turned away (default deny)."
}
```

| Field | Good | Bad |
|-------|------|-----|
| `anchor` | Concrete physical object + emoji | "Security concept" (abstract) |
| `story` | Spatial scene mapping concept parts to physical parts | "NSGs filter traffic" (just restates the definition) |

---

### Understanding — SHAPE

```json
{
 "simpleCore": "An NSG is a set of allow/deny rules that filter network traffic to and from Azure resources, evaluated by priority number.",
 "highStakesExample": "REAL: Capital One (2019) — a misconfigured WAF allowed an attacker to access 100M customer records. Proper NSG rules on the metadata endpoint would have blocked the lateral movement.",
 "analogicalModel": "Like an airport security checkpoint: each rule is a scanner (priority order), passengers (packets) go through scanners in sequence, first match wins, and anyone not cleared gets rejected.",
 "patternRecognition": {
 "question": "Port 443 is open inbound but HTTPS still fails. The VM has a second NSG on its NIC. What's wrong?",
 "answer": "Traffic must pass BOTH the subnet NSG AND the NIC NSG. The NIC-level NSG is likely missing the port 443 allow rule."
 },
 "eliminationLogic": "If the question mentions 'between subnets in the same VNet' NSG (not Azure Firewall). If it mentions 'across VNets or to internet' Azure Firewall. If it mentions 'application-layer filtering (URLs)' Application Gateway WAF."
}
```

| Field | Good | Bad |
|-------|------|-----|
| `simpleCore` | One sentence, no jargon, a non-technical person could understand | Paragraph of technical detail |
| `highStakesExample` | Real company, real year, real outcome | "A company had a security breach" (fabricated/vague) |
| `analogicalModel` | Maps concept parts to analogy parts (scanner=rule, passenger=packet) | "It's like a filter" (no mapping) |
| `patternRecognition` | Exam-style question with a specific trap + clear answer | "What is an NSG?" (recall, not pattern) |
| `eliminationLogic` | Decision tree: "If X choose A, if Y choose B" | "NSGs are used for security" (no decision logic) |

---

### Application — phase2, phase3

```json
"phase2": [
 "Create an NSG in the Azure Portal: Networking Network Security Groups Create",
 "Add an inbound rule: Priority 100, Source: Any, Destination: VirtualNetwork, Port: 443, Action: Allow",
 "Associate the NSG to a subnet: Virtual Network Subnets Select subnet NSG dropdown"
],
"phase3": {
 "tool": "Azure Network Watcher — IP Flow Verify",
 "metrics": ["Rules evaluated per request", "Denied traffic count", "NSG flow logs"],
 "thresholds": "Zero unexpected denies in flow logs after rule changes"
}
```

| Field | Good | Bad |
|-------|------|-----|
| `phase2` | Specific steps with actual UI paths or CLI commands | "Configure NSG rules as needed" |
| `phase3.tool` | Named Azure tool that verifies this concept works | "Testing tool" |
| `phase3.metrics` | Measurable indicators | ["Security", "Performance"] (vague) |

### Domain-Adaptive Fields

The `phase2`, `phase3`, `workedExample`, `eliminationLogic`, and `commonPitfalls` fields are optimized for procedural subjects (IT, engineering, medicine). For non-procedural subjects, the same JSON fields carry **different content** based on the subject type classification that Lambda already performs.

The schema stays the same — the **interpretation** changes:

| Field | Procedural (AZ-104, Surgery) | Conceptual (History, Philosophy) | Perceptual (Radiology, Chess) |
|-------|------------------------------|----------------------------------|-------------------------------|
| `phase2` | Execution steps: "Click here, type this, run that" | Critical inquiry: "What questions should a student ask to analyze this concept?" | Observation protocol: "What to look for first, second, third" |
| `phase3.tool` | Named verification tool: "Azure Network Watcher" | Primary source or lens: "Robespierre's 'Report on the Principles of Political Morality' (1794)" | Practice environment: "CXR trainer with annotated normals" |
| `phase3.metrics` | Measurable indicators: "Flow logs, denied count" | Analytical depth markers: "Can identify 3+ competing interpretations" | Perceptual accuracy: "Sensitivity rate, false positive rate" |
| `workedExample` | Problem Solution Steps | Case Study: Context Analysis Conclusion | Diagnostic walkthrough: Presentation Findings Reasoning |
| `eliminationLogic` | Binary: "If X A, if Y B" | Nuanced: "If the question frames it as [lens] apply [framework], unless [exception]" | Pattern-based: "If you see [finding] + [finding] [diagnosis], not [mimic]" |
| `commonPitfalls` | Wrong config: "Forgetting NSGs are stateful" | Misinterpretation: "Conflating the Reign of Terror with the entire Revolution" | Perceptual error: "Mistaking a skin fold for a pneumothorax line" |

**Example — Conceptual subject (The Reign of Terror):**

```json
"phase2": [
 "What triggered the shift from revolutionary idealism to state violence?",
 "How did the Committee of Public Safety justify mass execution as 'virtue'?",
 "What structural conditions made the Terror possible (war, famine, factionalism)?"
],
"phase3": {
 "tool": "Robespierre's 'Report on the Principles of Political Morality' (Feb 1794)",
 "metrics": ["Can distinguish Terror from broader Revolution", "Can name 3 factions and their positions"],
 "thresholds": "Student can argue FOR and AGAINST the Terror's necessity using primary sources"
},
"workedExample": {
 "problem": "Was the Reign of Terror a betrayal of revolutionary ideals or their logical conclusion?",
 "solution": "Both positions are defensible. The Terror extended 'liberty' logic (enemies of freedom must be eliminated) while contradicting 'rights of man' (due process abandoned).",
 "steps": [
 "Identify the revolutionary ideals (Declaration of the Rights of Man, 1789)",
 "Map which ideals the Terror upheld (popular sovereignty, defense of republic)",
 "Map which ideals the Terror violated (individual rights, rule of law)",
 "Evaluate: Was the context (foreign invasion, civil war) sufficient justification?"
 ]
},
"eliminationLogic": "If the question asks 'cause' structural factors (war, economic crisis). If it asks 'justification' ideological arguments (Robespierre's virtue-terror link). If it asks 'consequence' Thermidorian Reaction and Napoleon's rise."
```

---

### Relationships — connections

```json
"connections": [
 { "target": "Virtual Networks", "type": "requires" },
 { "target": "Subnets", "type": "requires" },
 { "target": "Application Security Groups", "type": "enables" },
 { "target": "Azure Firewall", "type": "is-type-of" },
 { "target": "Azure Policy", "type": "constrains" }
]
```

| Rule | Good | Bad |
|------|------|-----|
| Minimum 2 connections | 3-5 connections per concept | 0-1 connections |
| Uses all 6 types across the set | requires, enables, is-part-of, is-type-of, causes, constrains | Everything is "requires" |
| Targets exist | "Virtual Networks" (a real concept in the set) | "Networking basics" (doesn't exist in the set) |
| No self-references | target is always a different concept | target is the concept itself |

---

### Supporting Fields

```json
"keyPoints": [
 "Rules evaluated by priority (100-4096, lower = first)",
 "Stateful — return traffic automatically allowed",
 "Default rules: deny all inbound, allow all outbound",
 "Can attach to subnet OR NIC (both evaluated if both exist)"
],
"technicalDetails": "NSG rules are 5-tuple: source, source port, destination, destination port, protocol. Evaluated in priority order (100 = highest priority). Default rules at priority 65000+ cannot be deleted but can be overridden.",
"workedExample": {
 "problem": "Allow HTTPS traffic to a web server VM while blocking all other inbound traffic",
 "solution": "Create inbound rule: Priority 100, Source Any, Dest port 443, Protocol TCP, Action Allow. Default deny-all handles the rest.",
 "steps": [
 "Navigate to the NSG attached to the VM's subnet",
 "Add inbound security rule",
 "Set priority to 100, destination port to 443, protocol TCP, action Allow",
 "Verify with Network Watcher IP Flow Verify"
 ]
},
"criticalDistinctions": [
 { "correct": "NSGs are stateful — if you allow inbound, return traffic is auto-allowed", "incorrect": "Thinking you need separate outbound rules for return traffic" }
],
"designBoundaries": [
 { "boundary": "NSGs operate at Layer 3/4 only", "rationale": "For Layer 7 (URL/header filtering), use Application Gateway WAF" }
]
```

---

## 2. What the Full Set Should Look Like

For AZ-104 (~82 leaf objectives), the full generation should produce:

| Metric | Target |
|--------|--------|
| **Total concepts** | 60-80 |
| **Objective coverage** | >=95% (gap-fill pass catches what main generation misses) |
| **Concepts with cognitiveLevel apply+** | >=30% of total |
| **Concepts with all SHAPE fields filled** | >=90% |
| **Concepts with >=2 connections** | 100% |
| **Concepts with mnemonic (anchor + story)** | >=95% |
| **Concepts with workedExample** | >=50% (all apply+ concepts should have one) |
| **Concepts with real highStakesExample** | >=80% (real company, real year) |
| **Concepts with patternRecognition** | >=80% |
| **Concepts with eliminationLogic** | >=70% |
| **Average connections per concept** | 2-4 |
| **Connection type variety** | All 6 types used across the set |

---

## 3. Tier Distribution (LLM-Declared)

Tiers ARE in the generated JSON — declared by the LLM via the `treeLevel` field, then validated by `_validate_tree_structure()` in Lambda:

| Tier | Role | Target % |
|------|------|----------|
| **trunk** | Main exam domain/objective — top-level container | ~15-20% |
| **branch** | Sub-topic within a trunk — groups related knowledge | ~35-50% |
| **leaf** | Granular testable concept — exam-level detail | ~30-50% |

Each concept also declares `parentName` (direct parent) and `trunkDomain` (top-level trunk). If most concepts are "leaf" with no branches, the tree structure is too flat.

---

## 4. What the Audit Checks

When the student pastes exam objectives, the audit compares generated concepts against them:

| Audit Metric | Target |
|-------------|--------|
| **Objectives parsed** | Exact leaf count (no headers, no prose) |
| **Objectives covered** | >=90% matched to at least one concept (gap-fill improves coverage) |
| **Unmapped concepts** | <=10% (concepts that don't match any objective) |
| **Content health average** | >=70% (based on which fields are filled with real content) |
| **Bloom's distribution** | >=30% at apply or higher |
| **No "100% lower-order" warning** | At least some concepts at apply/analyze/evaluate |

---

## 5. Field-by-Field Checklist

Quick pass/fail for each concept:

| Field | Pass | Fail |
|-------|------|------|
| `name` | Specific, human-readable, 2-6 words | Generic, placeholder ID, or too broad |
| `cognitiveLevel` | Present and appropriate for the topic | Missing or everything is "remember" |
| `phase1.hookSentence` | Creates urgency or curiosity, domain-specific | Generic or empty |
| `phase1.microMetaphor` | Object outside the domain with mapped parts | Same-domain comparison or empty |
| `phase1.selection` | "When Choose Unlocks" pattern | Generic bullets |
| `phase1.execution` | Step-by-step action sequence | Vague instruction |
| `mnemonic.anchor` | Physical object + emoji | Abstract noun |
| `mnemonic.story` | Spatial scene with mapped parts | Restates the definition |
| `shape.simpleCore` | One sentence, no jargon | Paragraph or missing |
| `shape.highStakesExample` | Real company, year, outcome | Fabricated or vague |
| `shape.analogicalModel` | System analogy with part-to-part mapping | "It's like X" with no mapping |
| `shape.patternRecognition` | Exam-style trap question + answer | Recall question or missing |
| `shape.eliminationLogic` | "If X A, if Y B" decision tree | Missing or vague |
| `connections` | >=2, uses correct types, targets exist | 0-1, all "requires", phantom targets |
| `keyPoints` | 3-5 specific, testable facts | Empty or generic |
| `commonPitfalls` | Real mistakes practitioners make | Empty or trivial |
| `workedExample` | Problem + solution + steps (for apply+ concepts) | Missing on apply+ concepts |

---

## 6. Perfect Dashboard — What the Audit Should Show

The ContentLaunchpad dashboard validates generated content against pasted exam objectives. Here's what each section should look like for a **perfectly generated** AZ-104 set.

### 6.1 Top Metric Cards

The dashboard shows 4 metric cards across the top:

```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ 62 / 78 │ │ 0 / 65 │ │ 82% │ │ 65 │
│ Objectives │ │ Unmapped │ │ Content │ │ Concepts │
│ Covered │ │ Concepts │ │ Health │ │ │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
 green green green blue
```

| Card | Perfect Value | What It Means | Warning Signs |
|------|--------------|---------------|---------------|
| **Objectives Covered** | 75+ / 82 (>=90%) | Concepts match at least 90% of pasted leaf objectives | <75% = gap-fill may have failed |
| **Unmapped Concepts** | 0 / 65 | Every generated concept maps to at least one objective | >5 = fluff concepts that aren't on the exam |
| **Content Health** | 80%+ | Average completeness score across all concepts | <60% = missing SHAPE fields, mnemonics, or examples |
| **Concepts** | 60-80 | Total concepts generated | <40 = too few, >100 = bloated |

### 6.2 Objectives Panel

```
┌─────────────────────────────────────────────────────────┐
│ 78 Exam Objectives Loaded Saved│
└─────────────────────────────────────────────────────────┘
```

**Perfect:** Shows the exact leaf objective count (no domain headers, no sub-domain headers, no intro prose). For AZ-104 this is ~78, for PL-300 this is ~78.

**Bad:** Shows 120+ (headers leaked through) or shows 0 (objectives not pasted).

### 6.3 Honest Assessment (harshInsights)

The audit engine generates these insight strings. For a **perfect** generation, you should see:

**What you WANT to see:**
```
┌─────────────────────────────────────────────────────────────────────┐
│ Honest Assessment │
│ │
│ "All 65 concepts map to your stated objectives. Coverage looks │
│ solid — focus on learning depth, not breadth." │
│ │
│ "16 of your 78 objectives have NO matching concepts: │
│ 'Configure Azure DNS zones' and 15 more. These are gaps in │
│ your generated content — you'll need to regenerate or study │
│ these separately." │
└─────────────────────────────────────────────────────────────────────┘
```

The first insight (all concepts aligned) is the **best possible** result for concept quality. The second insight (some uncovered objectives) is normal — with the automatic gap-fill pass, 90-99% coverage is typical.

**What you NEVER want to see:**

| Insight Text | What Went Wrong |
|-------------|----------------|
| "100% of content targets lower-order thinking (remember/understand). Zero concepts reach analyze, evaluate, or create." | `cognitiveLevel` is missing on all concepts — Lambda didn't set it, or content was generated before Bloom's enforcement was added |
| "X concepts have content health below 40%." | Concepts are skeletons — missing SHAPE, mnemonics, phase1, or other core fields |
| "X of Y concepts don't match any of your Z objectives (Concept A, Concept B, ...)" | Lambda generated off-topic concepts that aren't on the exam |
| "X leaf concepts vs only Y trunk/branch. The generation over-indexed on peripheral topics." | Connection graph is broken — too few connections, so most concepts compute as "leaf" tier |
| "No exam objectives provided." | Student hasn't pasted objectives yet — audit can only check structural health, not alignment |

### 6.4 Concept-by-Concept Audit

Each concept row shows:

```
┌─────────────────────────────────────────────────────────────────────┐
│ Network Security Groups (NSGs) trunk Aligned │
│ ──────────────────────────────────────────────────────────────────│
│ Content Health: 85% │ Objective Match: 72% │ Bloom's: apply │
│ │
│ Matched Objective: "Configure network security groups" │
│ │
│ Strengths: Hook sentence, Professional relevance, Core │
│ explanation, High-stakes scenario, Memory anchor, │
│ Pattern drill, Elimination logic, 4 key points, │
│ 2 pitfalls │
│ │
│ Issues: (none) │
└─────────────────────────────────────────────────────────────────────┘
```

**Per-concept perfect result:**

| Field | Perfect | Problem |
|-------|---------|---------|
| **Verdict badge** | "Aligned" (green) | "Not in Objectives" (red) or "Supplementary" (yellow) |
| **Content Health** | 80-100% | <40% = skeleton, missing core fields |
| **Objective Match** | >=30% (triggers "aligned" verdict) | <15% = "not-in-objectives" |
| **Bloom's Level** | Appropriate for the topic (apply for config, analyze for troubleshooting) | "remember" on everything |
| **Strengths list** | 7+ items (all SHAPE fields + mnemonic + keyPoints + pitfalls) | 0-2 items = hollow concept |
| **Issues list** | 0 issues | "Missing: Core explanation" (critical) or "Missing: Memory anchor" (warning) |

**Verdict distribution for a perfect set:**

| Verdict | Count | % | Meaning |
|---------|-------|---|---------|
| **objective-aligned** | 60+ | >=90% | Concept matches an exam objective (score >= 0.3) |
| **supplementary** | 0-5 | <=8% | Loosely related background (score 0.15-0.29) |
| **not-in-objectives** | 0 | 0% | Off-topic fluff (score < 0.15) |

### 6.5 Footer

```
┌─────────────────────────────────────────────────────────────────────┐
│ Generated: 2/9/2026 │ Overall: 85% │ Tier Split: 10T/35B/20L │
└─────────────────────────────────────────────────────────────────────┘
```

| Footer | Perfect | Problem |
|-------|---------|---------|
| **Overall** | 80%+ (average of objectivesCoverage and contentHealth) | <60% = either poor coverage or poor content quality |
| **Tier Split** | ~15-20% T / ~35-50% B / ~30-50% L | All L = tree too flat, all T = no branches |

### 6.6 Summary — Perfect Dashboard at a Glance

| Dashboard Element | Perfect State |
|-------------------|---------------|
| Objectives Covered | 75+ / 82 (green) |
| Unmapped Concepts | 0 / 65 (green) |
| Content Health | 80%+ (green) |
| Concepts | 60-80 (blue) |
| Objectives Loaded | "78 Exam Objectives Loaded" with Saved badge |
| Insight 1 | "All X concepts map to your stated objectives" |
| Insight 2 | "Y of 82 objectives have NO matching concepts" (Y <= 8) |
| No "100% lower-order" insight | Bloom's enforcement working |
| No "health below 40%" insight | All concepts have real content |
| No "over-indexed on peripheral" insight | Tier distribution is balanced |
| Every concept row | "Aligned" verdict, 80%+ health, 7+ strengths, 0 issues |
| Footer Overall | 80%+ |
| Footer Tier Split | Roughly 15-20% trunk / 35-50% branch / 30-50% leaf |

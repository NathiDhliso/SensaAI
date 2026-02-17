# Learn How to Learn — The SensaAI Method

**The Universal Learning Cycle: Four Phases Every Learner Moves Through**

---

## The Core Insight

Every subject — whether it's Azure cloud architecture, constitutional law, jazz improvisation, or medical radiology — is mastered through the same four cognitive phases. These phases aren't categories of subjects. They're stages of understanding that every learner passes through sequentially, regardless of domain.

SensaAI's entire system is built around this cycle.

```
PERCEPTUAL → CONCEPTUAL → PROCEDURAL → CYCLIC
   (See)        (Know)       (Do)        (Keep)
```

---

## Phase 1: Perceptual — See the Landscape

Decompose the subject into its verbs and concepts so you can see the entire playing field before you touch any detail.

Imagine you're about to hike through a national park you've never visited. You don't start walking into the trees. You find a lookout point first. From up there you can see the whole park — the mountain range to the north, the river valley in the middle, the forest to the south. You can see which trails connect them. Now you know where you're going and roughly how to get there. Learning a subject works the same way: get to the lookout point before you start walking.

### The Two Questions

Every learning journey starts with the same two questions, asked in order:

**Question 1: What is the goal?**

Not a vague goal like "pass the exam" or "learn Azure." A *structural* goal — one that names the verbs and the concepts. The goal is a sentence you could say out loud and someone would know exactly what mastery looks like:

> *"The goal is to execute tasks designed for an Azure administrator, which are **creating, configuring, and monitoring** the following resources: **identity, governance, storage, networking, compute, and monitoring**."*

That single sentence contains everything: the role (Azure administrator), the verbs (create, configure, monitor), and the concepts (identity, governance, storage, networking, compute, monitoring). You now know what "done" looks like.

| Domain | Goal as Verb-Concept Structure |
|---|---|
| **Constitutional Law** | *Analyse, argue, and distinguish* the following doctrines: *separation of powers, due process, equal protection, federalism, and individual rights* |
| **Jazz Improvisation** | *Hear, voice-lead, and improvise over* the following structures: *ii-V-I progressions, modal interchange, tritone substitutions, rhythm changes, and blues form* |
| **Medical Radiology** | *Identify, differentiate, and report* the following findings: *consolidation, effusion, pneumothorax, masses, fractures, and normal variants* |

**Question 2: What is the path to that goal?**

Now that you have a verb-concept structure, the path reveals itself. Each concept is a territory. Each verb is something you'll eventually do within that territory. The path is the order in which you walk through the territories.

But real subjects are messy — the concepts interconnect, the verbs overlap, and 80 objectives across 5 domains can feel like a tangled web. This is where **chunking** comes in.

### What This Looks Like in Practice

- **Collapse the web into a few paths.** Group the interconnected goals into 3 to 6 chunked paths. Each chunk is a domain of related concepts that share verbs. For AZ-104, 82 objectives collapse into 5 domain paths: Identity & Governance, Storage, Networking, Compute, and Monitoring.
- **Name each chunk as a mini-goal.** Each chunk gets its own verb-concept sentence: "Create and manage storage accounts, configure blob access, and implement lifecycle policies." Five manageable goals instead of 82 scattered objectives.
- **Break each chunk into granular steps.** Within each chunked path, order the individual concepts from foundational to advanced. "Virtual Networks" before "Network Security Groups" before "Azure Firewall." The granular path emerges from the dependencies between concepts within each chunk.
- **Find shared ground between chunks.** Some concepts (like Azure Active Directory) appear across multiple domain paths. These shared concepts are your foundation — learn them first and they unlock progress across multiple paths simultaneously.
- **See the hierarchy.** Your chunked paths are the trunks (big domains). Within each trunk, related concepts cluster into branches (sub-topics). Each branch contains leaves (granular testable skills). You now see the tree — trunk, branch, leaf — before you climb it.
- **Spot the critical path.** Some concepts unlock disproportionately many others. In any subject, roughly 5 foundation concepts unlock 80% of everything else. Identify them. They're your first targets.
- **Prime your vocabulary.** You can't think about a subject if you don't speak its language. Match each key term to a plain-English metaphor so the jargon stops being a wall and starts being a window.
- **Make predictions.** Before you learn anything formally, guess which concepts are most important and which verbs you'll struggle with. This activates prior knowledge and creates cognitive hooks for new information to attach to.

### Why It Matters

- **Expert categorisation** (Chi, Feltovich & Glaser, 1981): Experts and novices look at the same material and literally see different things. Brain imaging shows that experts activate prefrontal schema networks that compress complex information into structural categories, while novices process each surface feature individually, overwhelming working memory. Defining the goal as verbs × concepts forces the expert's structural view from the start.
- **Advance organisers** (Ausubel, 1968): A conceptual framework presented *before* detailed learning creates a neural scaffolding — a set of activated association cortex pathways — that new information physically binds to during encoding. Without the scaffold, new facts float unattached and are pruned during sleep consolidation.
- **Working memory limits** (Miller, 1956): The prefrontal cortex can hold roughly 7±2 items simultaneously. Eighty objectives exceed this by an order of magnitude. Chunking compresses without losing structure — each chunk becomes a single "slot" in working memory, with its internal structure retrievable on demand.

**The output of Phase 1 is a verb-concept map.** You know what you'll do, what you'll do it to, how they're grouped, and in what order you'll tackle them.

---

## Phase 2: Conceptual — Know the Ideas

Deeply understand each concept — what it means, how it connects to its neighbours, and why it matters.

Think about the first day at a new school. You don't learn everything about every person at once. You meet one person at a time. You learn their name, something memorable about them ("she's the one who plays drums"), and how they relate to people you already know ("she's in the same class as the boy you met yesterday"). After a few days, you don't just know names — you know the social map. Learning concepts works the same way: meet each one individually, anchor it to something memorable, and connect it to the ones you already know.

### What This Looks Like in Practice

- **Test yourself before you study.** Answer a question about the concept *before* reading the explanation. Get it wrong — that's the point. The act of searching for an answer you don't have yet primes the brain to absorb the correct answer more deeply when it arrives.
- **Build from metaphor to precision.** Start with an analogy you already understand, then layer on the technical detail. Understanding moves from intuition ("it's like a bouncer at a nightclub") to precision ("rules evaluated by priority number, lower = higher precedence"). The metaphor gives your brain a familiar structure to hang unfamiliar details on.
- **Map the relationships.** How does this concept connect to others? Does it *require* something else as a prerequisite? Is it *part of* a larger system? Does it *cause* something downstream? The *type* of relationship matters — it becomes a distinct retrieval cue later. Six types form the TRACES framework: requires, enables, is-part-of, is-type-of, causes, constrains.
- **Confront the pitfalls.** Every concept has common mistakes and misconceptions. Encountering them during learning, not during an exam, is how you build discrimination. "NSGs are stateful" is a fact; "Thinking you need separate outbound rules for return traffic" is the pitfall that makes the fact stick.

### Why It Matters

- **Encoding specificity** (Tulving & Thomson, 1973): The way you encode a memory determines which cues can retrieve it. Neurologically, each relationship type ("requires," "causes," "is-part-of") activates a distinct pattern of hippocampal-cortical binding during encoding, creating a separate retrieval route. Encoding a concept with multiple typed relationships gives you multiple independent paths back to it during recall.
- **Desirable difficulties** (Bjork & Bjork, 1992): When you attempt retrieval and fail, the brain generates a *prediction error* — a dopaminergic signal from the midbrain that flags the gap between expectation and reality. This signal strengthens the synaptic connections formed when the correct answer is subsequently presented. Testing before teaching exploits this mechanism directly.
- **Structural alignment** (Gentner & Markman, 1997): The hippocampus doesn't store isolated facts — it binds features into relational structures. Deep learning is the process of encoding *relationships between* ideas, not the ideas themselves. A concept connected to five others through typed relationships is neurally richer (more dendritic connections, more retrieval pathways) than five isolated facts.
- **Meaningful learning** (Ausubel, 1968): New knowledge integrates into existing cortical schemas only when explicit links are formed during encoding. Without those links, the hippocampus treats the information as episodic noise and prunes it during overnight synaptic homeostasis.

**The output of Phase 2 is understanding.** You can explain each concept in your own words, draw the connections between them, and identify the common mistakes.

---

## Phase 3: Procedural — Do the Work

Connect the dots with action — execute the verbs of the subject at both the macro flow and the granular step level.

Think about learning a sport. You can watch football all day and understand the rules, the positions, the strategies. But the first time you step onto the pitch and someone passes you the ball, understanding isn't enough — you have to *do* something with it. And "doing" operates at two levels: the big picture (read the field, identify the open player, decide to pass or shoot) and the micro-execution (plant your foot, angle your body, strike the ball with the inside of your foot). Learning a subject is the same: you need to execute both the strategic flow across multiple concepts and the precise steps within each one.

### What This Looks Like in Practice

- **Cross-concept synthesis.** Combine multiple ideas into a coherent action plan. A real problem never isolates a single concept — it spans several. You need to integrate storage configuration with networking rules with identity permissions into one solution, not recite each in isolation.
- **Worked examples.** Walk through a complete problem from start to finish: what's the scenario, what's the solution, what are the specific steps? Then attempt a similar problem yourself. The gap between watching and doing is where procedural memory forms.
- **Elimination logic.** Build decision trees: "If the question mentions traffic between subnets in the same VNet → NSG. If it mentions traffic across VNets → Azure Firewall. If it mentions URL filtering → Application Gateway WAF." This is how experts navigate complex decision spaces in seconds.
- **Deliberate practice on weak areas.** Identify the specific procedures you struggle with and attack them with targeted drills — not random repetition, but focused effort on the exact gap. Practice the pass you keep missing, not the one you already nail.

### Why It Matters

- **Deliberate practice** (Ericsson, 1993): Procedural skill consolidates in the basal ganglia and cerebellum through repeated effortful execution with immediate feedback. The key word is *effortful* — passive repetition doesn't trigger the cortical-striatal loop that converts declarative knowledge ("I know what an NSG is") into procedural memory ("I can configure an NSG without thinking about each step"). The feedback is what calibrates each repetition.
- **Productive failure** (Kapur, 2008): When learners attempt a problem and fail *before* seeing the correct procedure, they generate multiple partial solution schemas. These failed schemas aren't wasted — they create a richer associative network in the prefrontal cortex, so when the correct procedure is finally presented, it integrates into a web of attempted alternatives rather than sitting in isolation. The struggle literally builds more neural scaffolding for the solution to attach to.
- **Transfer-appropriate processing** (Morris, Bransford & Franks, 1977): Memory retrieval is strongest when the cognitive processes used at retrieval match those used at encoding. If you encoded the knowledge by reading, you'll be best at recognising it in text. If you encoded it by *doing*, you'll be best at *doing* it again. The procedural phase ensures you encode through action, so you can retrieve through action.

**The output of Phase 3 is competence.** You can execute the procedures, solve cross-concept problems, and make decisions under ambiguity.

---

## Phase 4: Cyclic — Keep It Forever

Lock knowledge into long-term memory through spaced repetition, interleaving, and deliberate review cycles.

Think about a garden. You plant seeds (Phase 1–3), and for a while the garden looks great. But if you walk away and never come back, the plants die. Keeping a garden alive requires a rhythm — you come back regularly, water what's drying out, prune what's overgrown, and check which plants need more attention than others. You don't water everything the same amount on the same day; you water each plant based on how thirsty *it* is. Learning is the same: knowledge dies without regular, targeted return visits, and each concept needs a different schedule based on how well you know it.

Phase 4 is not a final step you complete once. It's a continuous loop that runs alongside and after the other three phases.

### What This Looks Like in Practice

- **Spaced repetition.** Review each concept at scientifically optimal intervals. The better you performed last time, the longer before you need to revisit. The spacing engine handles the scheduling — you just show up.
- **Interleaving.** Don't review all concepts from one domain in a row. Mix them. Alternate between different types of problems even when it feels harder. The friction of switching is the point — it forces deeper processing.
- **Contextual review.** When a concept comes up for review, you don't see a cold flashcard. You see your own history — your concept map with the relevant node highlighted, your previous blank sheet response, the mastery question that tripped you up. Remembering *your experience* of learning triggers recall far more powerfully than being told a fact again.
- **Forgetting curve awareness.** Watch your knowledge health in real time. Green means fresh, yellow means fading, red means probably forgotten. The visual urgency of watching knowledge decay creates motivation that abstract "5 concepts due" never can.
- **Targeted branch review.** When a cluster of related concepts all decay at the same time, review them together as a connected group — not as isolated cards. Relationships refresh alongside facts.

### Why It Matters

- **Forgetting curve** (Ebbinghaus, 1885): Without reactivation, synaptic connections physically weaken as the receptor proteins that maintain long-term potentiation degrade over hours and days. Each reactivation triggers *reconsolidation* — the memory trace is destabilised, updated, and physically rebuilt with stronger synaptic weights and more redundant pathways. This is why spaced retrieval makes memories more durable: each recall event literally reconstructs the trace stronger.
- **Interleaving effect** (Rohrer & Taylor, 2007): Blocked practice ("study all of Topic A, then all of Topic B") feels easier but produces weaker long-term retention. Interleaving forces the prefrontal cortex to perform *discrimination* — "is this a Topic A problem or a Topic B problem?" — before executing the solution. This discrimination step strengthens the brain's categorisation circuits, making retrieval more precise under exam conditions where problems arrive in random order.
- **Sleep consolidation** (Walker, 2005): During slow-wave sleep, the hippocampus "replays" recently encoded memories to the neocortex, transferring them from fragile hippocampal traces to distributed cortical networks. Spaced repetition across multiple days gives the brain multiple replay opportunities, each one strengthening the cortical representation. Cramming in a single session gives the hippocampus one shot — and one shot is rarely enough.
- **Construction-integration** (Kintsch, 1988): During the integration phase of memory consolidation, the brain prunes vague or weakly-connected associations and strengthens specific, well-connected ones. Interleaved review — where concepts from different domains are mixed — forces the integration process to maintain precise boundaries between related ideas, preventing the blurring that comes from blocked repetition of similar material.

**The output of Phase 4 is retention.** You don't just know the subject today — you know it next week, next month, and next year.

---

## The Full Cycle — How the Phases Connect

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Phase 1: PERCEPTUAL                                            │
│  "See the landscape"                                            │
│  ┌──────────────────────────────────────────────────────┐       │
│  │ Goal → Path → Chunk → Hierarchy → Vocabulary         │       │
│  └──────────────────────────┬───────────────────────────┘       │
│                             │                                   │
│                             ▼                                   │
│  Phase 2: CONCEPTUAL                                            │
│  "Know the ideas"                                               │
│  ┌──────────────────────────────────────────────────────┐       │
│  │ Map → Test → Encode → Verify                         │       │
│  └──────────────────────────┬───────────────────────────┘       │
│                             │                                   │
│                             ▼                                   │
│  Phase 3: PROCEDURAL                                            │
│  "Do the work"                                                  │
│  ┌──────────────────────────────────────────────────────┐       │
│  │ Synthesis → Worked Examples → Decision Trees         │       │
│  │ → Deliberate Practice                                │       │
│  └──────────────────────────┬───────────────────────────┘       │
│                             │                                   │
│                             ▼                                   │
│  Phase 4: CYCLIC                                                │
│  "Keep it forever"                                              │
│  ┌──────────────────────────────────────────────────────┐       │
│  │ Spaced Repetition → Interleaving → Contextual Review │       │
│  │ → Forgetting Curve → Targeted Branch Review          │       │
│  └──────────────────────────┬───────────────────────────┘       │
│                             │                                   │
│               ┌─────────────┘                                   │
│               │ Decay detected?                                 │
│               │ New concepts added?                             │
│               │ Weak areas surfaced?                            │
│               ▼                                                 │
│         Return to Phase 1, 2, or 3 as needed                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

The cycle is not strictly linear. Phase 4 continuously feeds back into the earlier phases:

- **Decay detected** → Return to Phase 2 (re-learn the faded concept with contextual review)
- **New concepts added** → Return to Phase 1 (re-scan the updated landscape)
- **Weak procedures surfaced** → Return to Phase 3 (targeted practice)

This feedback loop transforms the four phases from a one-time sequence into a living system of continuous mastery.

---

## Verb × Phase Matrix

The three core learning verbs — **See**, **Know**, **Do** — each dominate one phase, while **Keep** sustains them all. This matrix shows the primary verb active in each cognitive phase:

```
              │  See  │  Know │  Do   │  Keep │
──────────────┼───────┼───────┼───────┼───────┤
 PERCEPTUAL   │   ●   │       │       │       │
 CONCEPTUAL   │       │   ●   │       │       │
 PROCEDURAL   │       │       │   ●   │       │
 CYCLIC       │       │       │       │   ●   │
```

Every session step in SensaAI maps to exactly one cell in this matrix. When you're in SCOUT, you're **Seeing**. When you're in the micro-loop (Test → Encode → Verify), you're **Knowing**. When you're in APPLY or GYM, you're **Doing**. When the spacing engine fires, you're **Keeping**.

---

## The Universal Learning Equation

SensaAI tracks the health of this entire cycle with a single equation:

```
I = min(h, G × Q_f × Q_M × Q_P)
```

| Factor | What It Measures | Which Phase It Maps To |
|---|---|---|
| **h** (bandwidth ceiling) | Your cognitive state right now (mood-dependent) | Pre-condition for all phases |
| **G** (generation quality) | Richness of the AI-generated content | Phase 1 + 2 (quality of the landscape and concepts) |
| **Q_f** (frequency quality) | Consistency of spaced repetition | Phase 4 (are you showing up for reviews?) |
| **Q_M** (mastery quality) | Depth of understanding demonstrated | Phase 2 + 3 (do you understand and can you execute?) |
| **Q_P** (process quality) | Fidelity of the learning loop | All phases (are you following the full cycle?) |

**I** (information absorbed) is capped by your weakest factor. If your content is excellent (G=1) but you never review (Q_f=0.2), your absorption collapses. If you review religiously but the content is shallow, same result. The equation makes the bottleneck visible so you can fix it.

---

## One Sentence Per Phase

If you remember nothing else from this document, remember this:

1. **Perceptual** — See the whole subject before you touch any part of it.
2. **Conceptual** — Understand each idea deeply and map how it connects to everything else.
3. **Procedural** — Execute the verbs of the subject — both the macro flow and the granular steps.
4. **Cyclic** — Return, review, and reinforce at spaced intervals so you never lose what you learned.

This is how humans learn. SensaAI just makes it systematic.

---

## Appendix: Where SensaAI Implements Each Phase

The table below traces a learner's complete journey through SensaAI. Each row belongs to exactly one cognitive phase and one core verb — so you can read top-to-bottom and watch the 4-phase cycle unfold in the actual app.

| Phase | Verb | Session Step | What Happens | Cognitive Function |
|---|---|---|---|---|
| | | | | |
| **PERCEPTUAL** | **See** | **Home — Subject + Exam Selection** | Define the subject and select the certification exam (auto-loads official objectives as verb-concept structure) | Answer Question 1: define the goal |
| | | **Home — Domain Trunks** | Define 2–6 exam domains as trunks (chunked paths) | Answer Question 2: chunk the paths |
| | | **Generation — AI Classification** | AI decomposes the subject into domains with weighted objectives | Automated chunking for subjects without predefined structure |
| | | **SCOUT — Structure Preview** | View the trunk/branch/leaf hierarchy of the entire study pack | **See** the tree that emerged from your goal decomposition |
| | | **SCOUT — Critical Path** | Foundation concepts highlighted in gold | **See** which 5 concepts unlock 80% of the rest |
| | | **SCOUT — Nomenclature Sprint** | 60-second term-to-metaphor matching game | Build vocabulary fluency before deep study |
| | | **SCOUT — Gap Priming** | Preview questions that activate prior knowledge | Create hooks for new information |
| | | | | |
| **CONCEPTUAL** | **Know** | **BUILD — Concept Map** | Drag and connect concepts with labelled TRACES relationships | Force explicit relationship thinking |
| | | **LEARN — Test** (predict & expose gaps) | Answer a diagnostic question *before* being taught | Activate prediction error, expose gaps |
| | | **LEARN — Encode** (build understanding) | Layered presentation: metaphor → architecture → execution → pitfalls → high-stakes scenario | Build understanding from intuition to precision |
| | | **LEARN — Verify** (confirm retention) | Pattern-recognition question to confirm the concept stuck | Lock in understanding before moving on |
| | | | | |
| **PROCEDURAL** | **Do** | **APPLY — Mastery Challenge** | Cross-concept test requiring integration of multiple ideas | Prove you can reason, not just recall |
| | | **GYM — Blank Sheet Test** | Write everything you know from pure memory | Force organised retrieval of procedures |
| | | **GYM — Creative Transfer** | Apply knowledge to a novel scenario you've never seen | Test whether understanding transfers beyond the original context |
| | | **GYM — Pre-Mortem** | Predict what could go wrong in a procedure | Build failure-awareness before it happens in reality |
| | | **GYM — Peer Review (Interrogator)** | Defend your procedural decisions under pressure | Stress-test your reasoning against challenges |
| | | **GYM — Confusion Drill** | Distinguish between easily-confused procedures | Sharpen discrimination at the action level |
| | | | | |
| **CYCLIC** | **Keep** | **Spacing Engine (SM-2)** | Schedules reviews at optimal intervals based on past performance | Fight the forgetting curve with minimal effort |
| | | **Forgetting Curve Visualisation** | Green/yellow/red decay indicators on every concept | Make the invisible forgetting curve visible and urgent |
| | | **Knowledge Health %** | Overall percentage of study pack still in the green zone | One number that tells you how much you still know |
| | | **Contextual Spaced Repetition** | Shows your concept map, previous responses, and failed questions during review | Make reviews personal, not generic |
| | | **Interleaving Bridge Narratives** | Generates "X requires Y" transitions when switching concepts | Maintain relational structure during review |
| | | **Proactive AI Coach** | Detects patterns (3 skips, 90 min elapsed, score streaks) and intervenes | Prevent grinding when returns are diminishing |
| | | **GYM — Daily Stack** | SM-2 driven review queue, always available | Voluntary adherence to spacing schedule |

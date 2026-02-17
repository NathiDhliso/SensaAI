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

**Goal:** Decompose the subject into its verbs and concepts so you can see the entire playing field before you touch any detail.

When you sit down to learn something new, your first job is not to memorise facts. It's to *see*. But seeing isn't passive — it's an active decomposition. You need to crack open the subject and identify two things: **what you will do** (the verbs) and **what you will do it to** (the concepts).

### The Two Questions

Every learning journey starts with the same two questions, asked in order:

**Question 1: What is the goal?**

Not a vague goal like "pass the exam" or "learn Azure." A *structural* goal — one that names the verbs and the concepts. The goal is a sentence you could say out loud and someone would know exactly what mastery looks like:

> *"The goal is to execute tasks designed for an Azure administrator, which are **creating, configuring, and monitoring** the following resources: **identity, governance, storage, networking, compute, and monitoring**."*

That single sentence contains everything: the role (Azure administrator), the verbs (create, configure, monitor), and the concepts (identity, governance, storage, networking, compute, monitoring). You now know what "done" looks like.

Other examples across domains:

| Domain | Goal as Verb-Concept Structure |
|---|---|
| **Constitutional Law** | *Analyse, argue, and distinguish* the following doctrines: *separation of powers, due process, equal protection, federalism, and individual rights* |
| **Jazz Improvisation** | *Hear, voice-lead, and improvise over* the following structures: *ii-V-I progressions, modal interchange, tritone substitutions, rhythm changes, and blues form* |
| **Medical Radiology** | *Identify, differentiate, and report* the following findings: *consolidation, effusion, pneumothorax, masses, fractures, and normal variants* |

The pattern is always **[verbs] × [concepts]**. The verbs tell you what competence *looks like*. The concepts tell you what competence *operates on*.

**Question 2: What is the path to that goal?**

Now that you have a verb-concept structure, the path reveals itself. Each concept is a territory. Each verb is something you'll eventually do within that territory. The path is the order in which you walk through the territories.

But real subjects are messy — the concepts interconnect, the verbs overlap, and 80 objectives across 5 domains can feel like a tangled web. This is where **chunking** comes in.

**Chunking strategy for complex goals:**

1. **Collapse the web into a few paths.** Group the interconnected goals into a small number of chunked paths — ideally 3 to 6. Each chunk is a domain of related concepts that share verbs. For AZ-104, the 82 objectives collapse into 5 domain paths: Identity & Governance, Storage, Networking, Compute, and Monitoring.
2. **Name each chunk as a mini-goal.** Each chunk gets its own verb-concept sentence: "Create and manage storage accounts, configure blob access, and implement lifecycle policies." Now you have 5 manageable goals instead of 82 scattered objectives.
3. **Break each chunk into granular steps.** Within each chunked path, order the individual concepts from foundational to advanced. "Virtual Networks" comes before "Network Security Groups" which comes before "Azure Firewall." The granular path emerges from the dependencies between concepts within each chunk.
4. **Look for shared ground between chunks.** Some concepts (like Azure Active Directory) appear across multiple domain paths. These shared concepts are your foundation — learn them first and they unlock progress across multiple paths simultaneously.

You're working top-down: the macro goal decomposes into chunked paths, each chunked path decomposes into granular concept sequences. The hierarchy is already emerging.

### What This Looks Like in Practice

With the goal defined and the paths chunked, the rest of the Perceptual phase fills in the detail:

- **See the hierarchy.** Your chunked paths are the trunks (big domains). Within each trunk, related concepts cluster into branches (sub-topics). Each branch contains leaves (granular testable skills). You now see the tree — trunk, branch, leaf — before you climb it.
- **Spot the critical path.** Some concepts unlock disproportionately many others. In any subject, roughly 5 foundation concepts unlock 80% of everything else. Identify them. They're your first targets.
- **Prime your vocabulary.** You can't think about a subject if you don't speak its language. Match each key term to a plain-English metaphor so the jargon stops being a wall and starts being a window.
- **Make predictions.** Before you learn anything formally, guess which concepts are most important and which verbs you'll struggle with. This activates prior knowledge and creates cognitive hooks for new information to attach to.

### Why It Matters

Novices dive into details and drown. Experts always start with the verb-concept structure — they know what they're doing and what they're doing it to before they start. Research on expert categorisation (Chi, Feltovich & Glaser, 1981) shows that experts organise knowledge by structural principles, while novices organise by surface features. Defining the goal as verbs × concepts is what separates learning from flailing.

The chunking strategy is backed by Miller's research on working memory (1956): humans can hold 7±2 items in working memory. Eighty objectives overwhelm; five chunked paths don't. Chunking is not simplification — it's compression that preserves the structure.

### Where SensaAI Does This

| Session Step | What Happens | Cognitive Function |
|---|---|---|
| **Home — Subject + Exam Selection** | Define the subject and select the certification exam (auto-loads official objectives as verb-concept structure) | Answer Question 1: define the goal |
| **Home — Domain Trunks** | Define 2-6 exam domains as trunks (chunked paths) | Answer Question 2: chunk the paths |
| **Generation — AI Classification** | AI decomposes the subject into domains with weighted objectives | Automated chunking for subjects without predefined structure |
| **SCOUT — Structure Preview** | View the trunk/branch/leaf hierarchy of the entire study pack | See the tree that emerged from your goal decomposition |
| **SCOUT — Critical Path** | Foundation concepts highlighted in gold | See which 5 concepts unlock 80% of the rest |
| **SCOUT — Nomenclature Sprint** | 60-second term-to-metaphor matching game | Build vocabulary fluency before deep study |
| **SCOUT — Gap Priming** | Preview questions that activate prior knowledge | Create hooks for new information |

**The output of Phase 1 is a verb-concept map.** You know what you'll do (the verbs), what you'll do it to (the concepts), how they're grouped (the chunked paths), and in what order you'll tackle them (the hierarchy). You don't know the details yet — but you can see the entire playing field. This map is the scaffold that everything else hangs on.

---

## Phase 2: Conceptual — Know the Ideas

**Goal:** Deeply understand the core concepts — what each one means, how it connects to others, and why it matters.

Now that you can see the landscape, you zoom in. You take each concept and build a rich mental model around it: a metaphor, a core explanation, common mistakes, a real-world example, and — critically — how it relates to the concepts around it.

This is conceptual learning. You're not memorising; you're understanding.

### What This Looks Like in Practice

- **Test yourself before you study.** Answer a question about the concept *before* reading the explanation. This "desirable difficulty" (Bjork & Bjork, 1992) makes the subsequent learning dramatically more effective because your brain is actively searching for the answer, not passively receiving it.
- **Build from metaphor to precision.** Start with an analogy you already understand, then layer on the technical detail. Understanding moves from intuition ("it's like a bouncer at a nightclub") to precision ("rules evaluated by priority number, lower = higher precedence").
- **Map the relationships.** How does this concept connect to others? Does it *require* something else as a prerequisite? Is it *part of* a larger system? Does it *cause* something downstream? The type of relationship matters — it becomes a retrieval cue later.
- **Confront the pitfalls.** Every concept has common mistakes and misconceptions. Encountering them during learning, not during an exam, is how you build discrimination.

### Why It Matters

Ausubel's theory of meaningful learning (1968) shows that new knowledge sticks only when it connects to existing knowledge through explicit relationships. Isolated facts are forgotten. Connected ideas form a network that supports recall and reasoning.

The TRACES framework — **T**yped **R**elational **A**rchitecture for **C**ognitive **E**ncoding **S**pecificity — encodes six distinct relationship types (requires, enables, is-part-of, is-type-of, causes, constrains). Each type activates a different retrieval pathway in memory. "What must I know before this?" is a fundamentally different cognitive question than "What happens because of this?" — and the brain stores them differently.

### Where SensaAI Does This

| Session Step | What Happens | Cognitive Function |
|---|---|---|
| **BUILD — Concept Map** | Drag and connect concepts with labelled TRACES relationships | Force explicit relationship thinking |
| **STUDY — Preview AI (Test First)** | Answer a diagnostic question before being taught | Activate retrieval, expose gaps |
| **STUDY — Build AI (Learn)** | Layered presentation: metaphor → architecture → execution → pitfalls → high-stakes scenario | Build understanding from intuition to precision |
| **STUDY — Retain AI (Verify)** | Pattern-recognition question to confirm the concept stuck | Lock in understanding before moving on |

**The output of Phase 2 is understanding.** You can explain each concept in your own words. You can draw the connections between concepts. You know the common mistakes and can avoid them. You don't just know *what* — you know *why* and *how it fits*.

---

## Phase 3: Procedural — Do the Work

**Goal:** Connect the dots with action — execute grouped verbs at both the high-level view and the granular step level.

Understanding is necessary but not sufficient. You now need to *do* things with what you know. This is where you engage with the verbs of the subject — configure, analyse, compose, diagnose, argue, design — and practice executing them at two levels:

1. **High-level procedural flow:** The macro sequence of actions across multiple concepts (e.g., "First assess the network topology, then configure security groups, then validate with monitoring").
2. **Granular execution steps:** The specific micro-steps within each concept (e.g., "Navigate to NSG → Add inbound rule → Set priority 100 → Protocol TCP → Port 443 → Allow").

### What This Looks Like in Practice

- **Cross-concept synthesis.** Combine multiple ideas into a coherent action plan. The mastery challenge doesn't test isolated facts — it tests whether you can *integrate* concepts to solve a problem that spans several of them.
- **Worked examples.** Walk through a complete problem from start to finish: what's the scenario, what's the solution, what are the specific steps? Then attempt a similar problem yourself.
- **Elimination logic.** Learn the decision trees: "If the question mentions X, choose A. If it mentions Y, choose B." This is how experts navigate complex decision spaces quickly.
- **Deliberate practice on weak areas.** Identify the specific procedures you struggle with and attack them with targeted drills — not random repetition, but focused effort on the gap.

### Why It Matters

Ericsson's deliberate practice research (1993) shows that expertise comes from voluntary, focused practice with immediate feedback — not from passive review. The procedural phase is where you transform theoretical understanding into executable skill.

Kapur's productive failure research (2008) adds a crucial nuance: struggling *before* receiving the correct procedure leads to deeper learning than being shown the procedure first. This is why the mastery challenge is hard — the struggle is the point.

### Where SensaAI Does This

| Session Step | What Happens | Cognitive Function |
|---|---|---|
| **APPLY — Mastery Challenge** | Cross-concept test requiring integration of multiple ideas | Prove you can reason, not just recall |
| **GYM — Blank Sheet Test** | Write everything you know from pure memory | Force organised retrieval of procedures |
| **GYM — Creative Transfer** | Apply knowledge to a novel scenario you've never seen | Test whether understanding transfers beyond the original context |
| **GYM — Pre-Mortem** | Predict what could go wrong in a procedure | Build failure-awareness before it happens in reality |
| **GYM — Peer Review (Interrogator)** | Defend your procedural decisions under pressure | Stress-test your reasoning against challenges |
| **GYM — Confusion Drill** | Distinguish between easily-confused procedures | Sharpen discrimination at the action level |

**The output of Phase 3 is competence.** You can execute the procedures of the subject. You can solve cross-concept problems. You can make decisions under ambiguity using elimination logic. You don't just understand the ideas — you can *do* things with them.

---

## Phase 4: Cyclic — Keep It Forever

**Goal:** Lock knowledge into long-term memory through spaced repetition, interleaving, and deliberate review cycles.

Learning is not a single event. Memory decays. The forgetting curve (Ebbinghaus, 1885) is real and relentless — within 24 hours of learning something, you've already lost most of it unless you actively intervene.

Phase 4 is not a final step you complete once. It's a continuous loop that runs alongside and after the other three phases. It's the cyclic action of returning, reviewing, and reinforcing — with increasing intervals between each return.

### What This Looks Like in Practice

- **Spaced repetition.** Review each concept at scientifically optimal intervals. The better you performed last time, the longer before you need to revisit. The spacing engine handles the scheduling — you just show up.
- **Interleaving.** Don't review all concepts from one domain in a row. Mix them. Alternating between different types of problems (even when it feels harder) produces deeper learning than blocked practice (Rohrer & Taylor, 2007).
- **Contextual review.** When a concept comes up for review, you don't just see a cold flashcard. You see your own history — your concept map with the relevant node highlighted, your previous blank sheet response, the mastery question that tripped you up last time. Episodic memory (remembering *your experience* of learning) is far more powerful than semantic memory (being told a fact again).
- **Forgetting curve awareness.** Watch your knowledge health in real time. Green means fresh, yellow means fading, red means probably forgotten. The visual urgency of seeing knowledge decay creates motivation that abstract "5 concepts due" never can.
- **Targeted branch review.** When a cluster of related concepts all decay at the same time, review them together as a connected group — not as isolated cards.

### Why It Matters

Spaced repetition is the single most evidence-backed technique in all of learning science. But it only works if the learner actually shows up for reviews. The cyclic phase solves the compliance problem by making the forgetting curve visible, making reviews personal (contextual), and making the review experience itself a learning event (interleaved, not rote).

The interleaving bridge — a narrative transition between concepts ("X requires Y — let's build on that foundation") — maintains the relational structure from Phase 2 even during reviews. You never lose the *why* behind the *what*.

### Where SensaAI Does This

| System Component | What Happens | Cognitive Function |
|---|---|---|
| **Spacing Engine (SM-2)** | Schedules reviews at optimal intervals based on past performance | Fight the forgetting curve with minimal effort |
| **Forgetting Curve Visualisation** | Green/yellow/red decay indicators on every concept | Make the invisible forgetting curve visible and urgent |
| **Knowledge Health %** | Overall percentage of study pack still in the green zone | One number that tells you how much you still know |
| **Contextual Spaced Repetition** | Shows your concept map, previous responses, and failed questions during review | Make reviews personal, not generic |
| **Interleaving Bridge Narratives** | Generates "X requires Y" transitions when switching concepts | Maintain relational structure during review |
| **Proactive AI Coach** | Detects patterns (3 skips, 90 min elapsed, score streaks) and intervenes | Prevent grinding when returns are diminishing |
| **GYM — Daily Stack** | SM-2 driven review queue, always available | Voluntary adherence to spacing schedule |

**The output of Phase 4 is retention.** You don't just know the subject today — you know it next week, next month, and next year. The cyclic loop transforms short-term understanding into durable, retrievable knowledge.

---

## The Full Cycle — How the Phases Connect

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Phase 1: PERCEPTUAL                                            │
│  "See the landscape"                                            │
│  ┌──────────────────────────────────────────────────────┐       │
│  │ Structure Preview → Nomenclature → Gap Priming       │       │
│  │ → Critical Path                                      │       │
│  └──────────────────────────┬───────────────────────────┘       │
│                             │                                   │
│                             ▼                                   │
│  Phase 2: CONCEPTUAL                                            │
│  "Know the ideas"                                               │
│  ┌──────────────────────────────────────────────────────┐       │
│  │ Concept Map → Test First → Learn (layered)           │       │
│  │ → Verify                                             │       │
│  └──────────────────────────┬───────────────────────────┘       │
│                             │                                   │
│                             ▼                                   │
│  Phase 3: PROCEDURAL                                            │
│  "Do the work"                                                  │
│  ┌──────────────────────────────────────────────────────┐       │
│  │ Mastery Challenge → Blank Sheet → Creative Transfer  │       │
│  │ → Confusion Drill → Pre-Mortem                       │       │
│  └──────────────────────────┬───────────────────────────┘       │
│                             │                                   │
│                             ▼                                   │
│  Phase 4: CYCLIC                                                │
│  "Keep it forever"                                              │
│  ┌──────────────────────────────────────────────────────┐       │
│  │ Spaced Repetition → Interleaving → Contextual Review │       │
│  │ → Forgetting Curve → Coach Interventions             │       │
│  └──────────────────────────┬───────────────────────────┘       │
│                             │                                   │
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

The cycle is not strictly linear. Phase 4 (Cyclic) continuously feeds back into the earlier phases:

- **Decay detected** → Return to Phase 2 (re-learn the faded concept with contextual review)
- **New concepts added** → Return to Phase 1 (re-scan the updated landscape)
- **Weak procedures surfaced** → Return to Phase 3 (targeted practice in the Gym)

This feedback loop is what transforms the four phases from a one-time sequence into a living system of continuous mastery.

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

## The Research Foundation

Each phase is grounded in decades of cognitive science:

| Phase | Key Research | Core Finding |
|---|---|---|
| **Perceptual** | Chi, Feltovich & Glaser (1981) — Expert Categorisation | Experts see structural principles; novices see surface features. Start with structure. |
| **Perceptual** | Ausubel (1968) — Advance Organisers | A conceptual framework presented *before* detailed learning dramatically improves retention. |
| **Conceptual** | Tulving & Thomson (1973) — Encoding Specificity | The way you encode information determines how you retrieve it. Relationship *type* matters. |
| **Conceptual** | Bjork & Bjork (1992) — Desirable Difficulties | Making learning harder (test before teach) improves long-term retention. |
| **Conceptual** | Gentner & Markman (1997) — Structural Alignment | Deep learning = encoding relational structure, not surface features. |
| **Procedural** | Ericsson (1993) — Deliberate Practice | Expertise requires focused, voluntary practice with immediate feedback. |
| **Procedural** | Kapur (2008) — Productive Failure | Struggling before instruction produces deeper learning than instruction-first approaches. |
| **Cyclic** | Ebbinghaus (1885) — Forgetting Curve | Memory decays exponentially without reinforcement. |
| **Cyclic** | Rohrer & Taylor (2007) — Interleaving Effect | Mixed practice outperforms blocked practice for long-term retention. |
| **Cyclic** | Kintsch (1988) — Construction-Integration | The integration phase prunes vague links and strengthens specific ones. |

---

## One Sentence Per Phase

If you remember nothing else from this document, remember this:

1. **Perceptual** — See the whole subject before you touch any part of it.
2. **Conceptual** — Understand each idea deeply and map how it connects to everything else.
3. **Procedural** — Execute the verbs of the subject — both the macro flow and the granular steps.
4. **Cyclic** — Return, review, and reinforce at spaced intervals so you never lose what you learned.

This is how humans learn. SensaAI just makes it systematic.

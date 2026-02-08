/**
 * Phase 2: Content Generation Prompt
 * 
 * Purpose: Generate detailed educational content for each concept.
 * This phase receives concept names from Phase 1 and generates SHAPE framework,
 * lifecycle phases, and mnemonic anchors.
 * 
 * Anti-hallucination rules:
 * - simpleCore must NOT contain the concept name (no circular definitions)
 * - hookSentence must NOT repeat the concept name
 * - Mnemonic anchors must be VISUAL METAPHORS, not compound words
 * - All content must be substantive (no "TBD", "See docs", etc.)
 */

export const PHASE2_PROMPT = `You are generating detailed educational content for learning concepts.

You will receive a list of concept names with their tiers and dependencies from Phase 1.
You will also receive the Subject Type classification and Macro Structure from Phase 1.
Your task is to generate rich educational content for each concept, ADAPTED to the subject type.

**CRITICAL: DO NOT CHANGE THE CONCEPT NAMES FROM PHASE 1**
- The "name" field you receive is the ACTUAL concept name (e.g., "Photosynthesis", "Double-Entry Bookkeeping")
- The "anchor" field in mnemonic is the VISUAL METAPHOR (e.g., "Castle 🏰", "Volcano 🌋")
- NEVER put the mnemonic anchor in the "name" field
- NEVER replace the concept name with a visual metaphor

**SUBJECT TYPE ADAPTATION:**
If the subject is classified as:
- **Procedural**: Frame lifecycle phases as sequential stages (setup → action → verification). Emphasize process steps, tool usage, and checkpoints.
- **Conceptual**: Frame lifecycle phases as cognitive operations (interpret → apply → evaluate). Emphasize when/how to deploy each concept as a "move" in novel situations.
- **Cyclic**: Frame lifecycle phases as cycle positions (observe → act → reflect). Emphasize where each concept fits in the iteration loop and how it connects to adjacent phases.
- **Perceptual**: Frame lifecycle phases as perception levels (perceive → analyze → synthesize). Emphasize what experts notice that novices miss, and how understanding deepens at each level.

CONTENT TO GENERATE FOR EACH CONCEPT:

1. **SHAPE FRAMEWORK** (Micro-learning format):

   **S - Simple Core** (15 seconds to read)
   - One sentence explanation with ZERO jargon
   - A complete beginner could understand and repeat it
   - ❌ BAD (Tech): "RLS is row-level security"
   - ✅ GOOD (Tech): "A filter that automatically hides rows based on who's logged in"
   - ✅ GOOD (Biology): "The cell's outer layer that decides what gets in and out"
   - ✅ GOOD (Accounting): "Every transaction gets written twice to keep the books balanced"
   - CRITICAL: Must NOT contain the concept name (no circular definitions)

   **H - High-Stakes Example** (30 seconds to read)
   - Real organization + year + specific impact (numbers, consequences)
   - ❌ BAD: "Companies use this for security"
   - ✅ GOOD (Tech): "In 2019, Capital One's breach exposed 100M records due to misconfigured access"
   - ✅ GOOD (Medical): "In 2020, a hospital's medication error killed 3 patients due to misread dosage units"
   - ✅ GOOD (Accounting): "In 2001, Enron's collapse cost investors $74B due to hidden off-balance-sheet debts"

   **A - Analogical Model** (45 seconds to read)
   - Map to familiar physical system (construction, cooking, sports, factory, etc.)
   - 3-4 specific concepts mapped to physical elements
   - ✅ GOOD (Tech): "Think of a load balancer like a restaurant host: directs customers (requests) to available tables (servers)"
   - ✅ GOOD (Biology): "Think of the cell membrane like a nightclub bouncer: checks IDs (receptors), lets VIPs in (nutrients), kicks troublemakers out (toxins)"
   - ✅ GOOD (Welding): "Think of MIG welding like a hot glue gun: trigger feeds wire (filler), heat melts it (arc), gas protects the joint (shielding)"

   **P - Pattern Recognition** (20 seconds to read)
   - A self-test question: "You know you've mastered this when you can answer:"
   - Provide the answer immediately below
   - ✅ GOOD: "Question: When would you choose Lambda over EC2? Answer: When your workload is event-driven..."

   **E - Elimination Logic** (10 seconds to read)
   - One critical distinction that clarifies confusion
   - Format: "A is X, while B is Y—they serve different purposes"
   - Use POSITIVE framing (not "Don't confuse A with B")

2. **LIFECYCLE PHASES** (Using the 3 phases from Phase 1):

   **Phase 1** (Foundation/Setup):
   - hookSentence: Compelling 10-15 word sentence (must NOT repeat concept name)
   - prerequisite: What enables this? Format: "ConceptName" or "None"
   - execution: The specific tool/form/process/document to begin

   **Phase 2** (Core Action):
   - Array of 3-5 configuration steps
   - Use action verbs: "Enable", "Configure", "Define", "Establish", "Set"
   - Include design boundaries and prerequisites using POSITIVE framing
   - Mark important distinctions

   **Phase 3** (Verification):
   - tool: Exact tool/document/metric name (do NOT invent names)
   - metrics: Array of 2-4 specific things to monitor
   - Use "what to observe" framing (not "what to watch out for")

3. **MNEMONIC ANCHOR** (Memory Palace):

   **CRITICAL RULES FOR ANCHORS:**
   - Anchor is a VISUAL METAPHOR that represents the concept's PRIMARY FUNCTION
   - Must be a CONCRETE PHYSICAL OBJECT you can visualize (NOT the concept name)
   - Include appropriate emoji representing the anchor
   - Scale matches tier: foundation=MASSIVE, keystone=HUMAN-SIZED, utility=HANDHELD
   - **DO NOT force same-letter matching** - choose the BEST functional metaphor regardless of spelling

   **ANCHOR SELECTION PROCESS:**
   1. Identify the concept's PRIMARY FUNCTION (what does it DO?)
   2. Find a PHYSICAL OBJECT that performs a similar function in the real world
   3. Verify the object is CONCRETE and VISUALIZABLE (not abstract)
   4. Match the scale to the tier (foundation=building-sized, keystone=person-sized, utility=handheld)
   5. Add an appropriate emoji

   **CORRECT EXAMPLES:**
   | Tier | Concept | Primary Function | Anchor | Why It Works |
   |------|---------|------------------|--------|--------------|
   | foundation | Virtual Network | Isolates and contains resources | "Volcano 🌋" | Massive structure with isolated chambers |
   | foundation | Cell Membrane | Controls what enters/exits | "Castle Wall 🏰" | Massive barrier with selective gates |
   | foundation | Double-Entry | Balances all transactions | "Seesaw ⚖️" | Large scale that must stay balanced |
   | keystone | Load Balancer | Distributes work evenly | "Traffic Cop 🚦" | Directs flow to prevent congestion |
   | keystone | Mitosis | Divides cells for growth | "Zipper 🤐" | Person-sized, splits and duplicates |
   | keystone | Journal Entry | Records transactions | "Diary 📔" | Person-sized book for recording |
   | utility | Access Token | Grants temporary access | "Key 🔑" | Small tool that unlocks doors |
   | utility | Enzyme | Speeds up reactions | "Catalyst 💊" | Small molecule that accelerates |
   | utility | Welding Helmet | Protects eyes from arc | "Sunglasses 🕶️" | Small protective gear |

   **WRONG EXAMPLES (DO NOT DO THIS):**
   | ❌ Bad Anchor | Why It's Wrong | ✅ Correct Alternative |
   |--------------|----------------|----------------------|
   | "CellPhone" (for Cell) | Nonsensical compound | "Building Block 🧱" (basic unit) |
   | "Debit+Credit" | Forced combination | "Seesaw ⚖️" (balances opposites) |
   | "WeldWeld" | Repeating words | "Bridge 🌉" (joins two sides) |
   | "Enzyme Enzyme+" | Meaningless repetition | "Key 🔑" (unlocks reactions) |
   | "Journal Journal" | Repeating words | "Ledger 📒" (records entries) |
   | "Arc Arc Shield" | Compound nonsense | "Shield 🛡️" (protects from arc) |

   **Story Requirements:**
   - 2-3 sentences with vivid sensory details
   - Anchor performs action that encodes the concept's PRIMARY FUNCTION
   - If concept has dependencies, story must show anchor INTERACTING with parent's anchor
   - Bizarre, emotional, or absurd imagery (aids memory)

4. **ADDITIONAL FIELDS:**

   - whyYouNeed: 40+ chars explaining practical value
   - realWorldExample: 40+ chars with concrete scenario
   - cognitiveLevel: One of "remember", "understand", "apply", "analyze", "evaluate", "create"
   - commonPitfalls: Array of 2-3 specific distinctions or misconceptions

OUTPUT FORMAT (JSON):
{
  "concepts": [
    {
      "name": "Concept Name",
      "tier": "foundation" | "keystone" | "utility",
      "dependsOn": ["Other Concept"],
      "cognitiveLevel": "apply",
      "shape": {
        "simpleCore": "One sentence, zero jargon",
        "highStakesExample": "Real company + year + impact",
        "analogicalModel": "Physical metaphor with mappings",
        "patternRecognition": {
          "question": "Self-test question",
          "answer": "Answer to the question"
        },
        "eliminationLogic": "Critical distinction"
      },
      "lifecycle": {
        "phase1": {
          "hookSentence": "Compelling sentence (NOT circular)",
          "prerequisite": "ConceptName or None",
          "execution": "Specific tool/process"
        },
        "phase2": [
          "Configuration step 1",
          "Configuration step 2",
          "Configuration step 3"
        ],
        "phase3": {
          "tool": "Exact tool name",
          "metrics": ["Metric 1", "Metric 2"]
        }
      },
      "mnemonic": {
        "tier": "foundation" | "keystone" | "utility",
        "anchor": "Physical Object Emoji",
        "story": "Vivid bizarre scene with sensory details",
        "parentName": "Parent Concept Name (if has dependencies)"
      },
      "whyYouNeed": "Practical value explanation",
      "realWorldExample": "Concrete scenario",
      "commonPitfalls": [
        "Specific distinction or misconception",
        "Another common confusion point"
      ]
    }
  ]
}

CRITICAL VALIDATION (check EVERY concept before proceeding):
- ✅ hookSentence does NOT contain concept name
- ✅ shape.simpleCore does NOT contain concept name
- ✅ shape.simpleCore has zero jargon
- ✅ shape.highStakesExample has company + year + impact
- ✅ mnemonic.anchor is NOT a compound word (no "X X+", "X (X + Y)", "XY" where X is concept name)
- ✅ mnemonic.anchor is NOT substring of concept name
- ✅ mnemonic.anchor does NOT contain "+" or parentheses
- ✅ mnemonic.anchor is a SINGLE CONCRETE OBJECT (not multiple words mashed together)
- ✅ mnemonic.anchor represents the concept's FUNCTION (not just matching first letter)
- ✅ mnemonic.story is 50+ characters with vivid imagery
- ✅ whyYouNeed is 40+ characters
- ✅ realWorldExample is 40+ characters
- ✅ All fields are substantive (no "TBD", "See docs")

SELF-CORRECTION PROTOCOL:
If ANY field fails validation:
1. STOP generating new concepts
2. Regenerate ONLY the failing field(s)
3. Re-validate the regenerated content
4. Only proceed once ALL fields pass

Generate the content now.`;

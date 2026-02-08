/**
 * Phase 1: Domain Analysis Prompt
 * 
 * Purpose: Analyze subject domain and identify core concepts with dependencies.
 * This phase generates ONLY concept names, tiers, and dependencies - no detailed content.
 * 
 * Anti-hallucination rules:
 * - Concept names must be real, verifiable terms from the domain
 * - Dependencies must reference other concepts in the list
 * - No circular dependencies allowed
 * - Foundation concepts should have 0-2 dependencies
 */

export const PHASE1_PROMPT = `You are analyzing a subject domain to identify core concepts and their relationships.

TASK: Identify 50-100 core concepts that professionals must know in this domain.

HARD RULE: USER OBJECTIVES ARE THE SINGLE SOURCE OF TRUTH.
- If the user provides "USER OBJECTIVES / CONTEXT", you MUST map concepts DIRECTLY to those objectives.
- Ignore generic tier classifications if they conflict with the specific user objectives.
- If no user objectives are provided, use your best judgment based on the domain.

OUTPUT REQUIREMENTS:

1. **Domain Name**: The subject being analyzed
2. **Lifecycle Phases**: A 3-phase operational cycle specific to this domain
   - Phase 1: Enabling phase (what enables the work)
   - Phase 2: Core activity (the primary action)
   - Phase 3: Validation phase (outcomes and verification)

LIFECYCLE VERB MAP (select based on domain type):
| Domain | Phase 1 | Phase 2 | Phase 3 |
|---|---|---|---|
| IT/Cloud | PROVISION | CONFIGURE | MONITOR |
| Coding | DEFINE | IMPLEMENT | DEBUG |
| Business/Finance | RECOGNIZE | MEASURE | DISCLOSE |
| Process | INITIATE | EXECUTE | CLOSE |
| Learning | INTRODUCE | PRACTICE | ASSESS |

Identify your domain type and use the matching verbs. Use CAPS for verbs.

3. **Concepts Array**: 50-100 concepts, each with:
   - name: Clear, specific concept name (real terminology from the domain)
   - tier: Classify as "foundation", "keystone", or "utility"
     * foundation: Core building blocks (20-30%) - universal constants others depend on
     * keystone: Major functional blocks (30-40%) - perform core operations
     * utility: Specialized tools/add-ons (30-40%) - accessories and helpers
   - dependsOn: Array of concept names this depends on (use exact names from your list)

TIER CLASSIFICATION RULES:
- Foundation: Universal constants, always present
  - Tech: Network, Storage, Identity, Naming
  - Biology: Cell, DNA, Protein, Membrane
  - Accounting: Double-Entry, Chart of Accounts, General Ledger
  - Welding: Base Metal, Heat, Filler Material, Shielding Gas
  - Medicine: Anatomy, Physiology, Pathology, Pharmacology
- Keystone: Major workers that perform operations
  - Tech: Virtual Machine, Function, Load Balancer, Database
  - Biology: Mitosis, Photosynthesis, Respiration, Digestion
  - Accounting: Journal Entry, Trial Balance, Financial Statement
  - Welding: MIG Welding, TIG Welding, Arc Welding, Flux Core
  - Medicine: Diagnosis, Treatment, Surgery, Medication
- Utility: Small tools and accessories
  - Tech: Tags, Locks, Tokens, Metrics
  - Biology: Enzyme, Hormone, Vitamin, Antibody
  - Accounting: Receipt, Invoice, Voucher, Reconciliation
  - Welding: Helmet, Wire Brush, Chipping Hammer, Clamp
  - Medicine: Stethoscope, Thermometer, Syringe, Bandage

DEPENDENCY RULES:
- Foundation concepts: 0-2 dependencies (they are the bedrock)
- Keystone concepts: Should depend on foundation concepts
- Utility concepts: Should depend on keystone or foundation concepts
- NO circular dependencies (A→B→C→A is forbidden)
- Dependencies must reference concept names that exist in your list

GRANULARITY & ELABORATION RULES:
1. **Break Down Topics**: Do not just list broad categories. Break them down into specific, testable concepts:
   - Instead of "Authentication" → "Multi-Factor Authentication", "Single Sign-On", "Password Policies"
   - Instead of "Database Design" → "Normalization", "Primary Keys", "Foreign Key Constraints"
   - Instead of "Cell Biology" → "Cell Membrane", "Mitochondria", "Nucleus Function"
2. **Specifics over Generics**: Avoid broad headers. Use testable, specific concept names.
3. **Hierarchical Coverage**: Ensure major pillars have 5-10 child concepts each.

ANTI-HALLUCINATION RULES:
- Use REAL terminology from the domain (verifiable in official docs)
- Do NOT invent concept names
- Do NOT create dependencies to concepts not in your list
- Do NOT create circular dependency chains

OUTPUT FORMAT (JSON):
{
  "domain": "Subject Name",
  "lifecycle": {
    "phase1": "VERB1",
    "phase2": "VERB2",
    "phase3": "VERB3"
  },
  "concepts": [
    {
      "name": "Concept Name",
      "tier": "foundation" | "keystone" | "utility",
      "dependsOn": ["Other Concept Name", ...]
    }
  ]
}

VALIDATION CHECKLIST (verify before returning):
- ✅ 50-100 concepts total
- ✅ Each concept has exactly one tier
- ✅ All dependsOn references exist in the concepts array
- ✅ No circular dependencies
- ✅ Foundation concepts have 0-2 dependencies
- ✅ Lifecycle phases are single action verbs in CAPS
- ✅ Valid JSON format

Generate the domain analysis now.`;

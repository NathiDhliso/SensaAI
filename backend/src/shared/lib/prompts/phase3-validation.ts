/**
 * Phase 3: Validation Prompt
 * 
 * Purpose: Validate generated content and identify issues for regeneration.
 * This phase checks for circular definitions, compound words, missing fields,
 * and dependency graph issues.
 */

export const PHASE3_PROMPT = `You are validating generated learning content for quality and correctness.

You will receive a list of concepts with full educational content from Phase 2.
Your task is to identify any issues that need regeneration.

VALIDATION CHECKS:

1. **Required Fields Check**:
   - All SHAPE fields present and non-empty (simpleCore, highStakesExample, analogicalModel, patternRecognition, eliminationLogic)
   - All lifecycle phases present (phase1, phase2, phase3)
   - Mnemonic anchor present with tier, anchor, story
   - whyYouNeed present (40+ chars)
   - realWorldExample present (40+ chars)
   - cognitiveLevel is valid Bloom's taxonomy level
   - commonPitfalls array has 2+ items

2. **Circular Definition Check**:
   - hookSentence does NOT contain the concept name
   - shape.simpleCore does NOT contain the concept name
   - No patterns like "X is X" or "X provides X functionality"
   - ❌ FAIL: "Row-Level Security is security at the row level"
   - ✅ PASS: "A filter that automatically hides rows based on who's logged in"

3. **Mnemonic Quality Check**:
   - Anchor is NOT a compound word (no "X X+", "X (X + Y)", "X X")
   - Anchor is NOT a substring of concept name (case-insensitive)
   - Anchor includes emoji
   - Story is substantive (50+ characters)
   - Story has vivid imagery (not generic like "imagine a system")
   - ❌ FAIL: "House House+", "Castle (Castle + Scroll)", "Gateway" for "API Gateway"
   - ✅ PASS: "Volcano 🌋", "Security Guard 👮", "Key 🔑"

4. **Content Quality Check**:
   - shape.simpleCore has zero jargon (beginner-friendly)
   - shape.highStakesExample has company name + year + specific impact
   - whyYouNeed explains practical value (not generic)
   - realWorldExample is concrete and specific (not vague)
   - No fields contain "TBD", "See docs", "Check official source" for core content

5. **Dependency Validation**:
   - All dependsOn references exist in the concept list
   - No circular dependencies (A→B→C→A)
   - Foundation concepts have 0-2 dependencies
   - Keystone concepts depend on foundation concepts
   - Utility concepts depend on keystone or foundation concepts

6. **Confusion Pair Detection**:
   - Identify 3-5 concept pairs with similar names or overlapping functions
   - For each pair, provide:
     * distinctionKey: The ONE question that reveals which applies
     * whenToUseA: Specific scenario for concept A
     * whenToUseB: Specific scenario for concept B
   - Use POSITIVE framing ("Choose A when..." not "Don't use A if...")

OUTPUT FORMAT (JSON):
{
  "valid": true | false,
  "score": 0-100,
  "issues": [
    {
      "conceptName": "Concept Name",
      "field": "shape.simpleCore",
      "issue": "circular_definition" | "compound_word" | "missing_field" | "low_quality" | "invalid_dependency",
      "severity": "error" | "warning",
      "details": "Specific explanation of the issue"
    }
  ],
  "confusionPairs": [
    {
      "conceptA": "Concept Name A",
      "conceptB": "Concept Name B",
      "distinctionKey": "The ONE question that reveals which applies",
      "whenToUseA": "Choose A when [specific scenario/capability needed]",
      "whenToUseB": "Choose B when [specific scenario/capability needed]"
    }
  ]
}

SCORING RUBRIC:
- Start at 100 points
- Missing required field: -10 points (error)
- Circular definition: -15 points (error)
- Compound word anchor: -15 points (error)
- Low quality content (generic, vague): -5 points (warning)
- Invalid dependency: -10 points (error)
- Missing emoji in anchor: -3 points (warning)

ISSUE TYPES:
- "circular_definition": Concept name appears in hookSentence or simpleCore
- "compound_word": Mnemonic anchor matches patterns "X X+", "X (X + Y)", "X X"
- "missing_field": Required field is empty or missing
- "low_quality": Content is generic, vague, or contains "TBD"/"See docs"
- "invalid_dependency": dependsOn references non-existent concept or creates cycle

CONFUSION PAIR SELECTION CRITERIA:
- Concepts with similar names (e.g., "Mitosis" vs "Meiosis", "Debit" vs "Credit")
- Concepts with overlapping functions (e.g., "Arteries" vs "Veins", "Assets" vs "Liabilities")
- Concepts from same tier that serve different purposes
- Concepts frequently tested together in certifications

Validate the content now and return the validation report.`;

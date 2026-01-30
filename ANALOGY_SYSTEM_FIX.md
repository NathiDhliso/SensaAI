# Analogy System Fix - Mnemonic Anchor Generation

## Problem Identified

The mnemonic anchor system was generating nonsensical analogies like:
- "CloudCake" for "Cloud"
- "Key+Person" for "Key"
- "FairyGodmother" for "Fairy"
- "Factory Factory" for "Factory"

These bad analogies appeared in the Nomenclature Sprint and Foundation/Keystone/Utility visualization, making the learning experience confusing and unhelpful.

## Root Cause

The AI was trying to force same-letter matching between concept names and anchors, creating compound words and nonsensical combinations. The prompt guidance wasn't explicit enough about:
1. NOT forcing same-letter matching
2. Selecting anchors based on FUNCTION, not spelling
3. Avoiding compound words and forced combinations

## Changes Made

### 1. Updated Phase 2 Content Generation Prompt
**File:** `backend/src/shared/lib/prompts/phase2-content-generation.ts`

**Key Changes:**
- Added explicit rule: "DO NOT force same-letter matching"
- Added "ANCHOR SELECTION PROCESS" with 5 clear steps
- Expanded examples table with "Primary Function" column
- Added more "WRONG EXAMPLES" showing bad patterns like "CloudCake", "Key+Person", "FairyGodmother"
- Enhanced validation checklist to catch compound words and concept-name-based anchors

**New Selection Process:**
```
1. Identify the concept's PRIMARY FUNCTION (what does it DO?)
2. Find a PHYSICAL OBJECT that performs a similar function in the real world
3. Verify the object is CONCRETE and VISUALIZABLE (not abstract)
4. Match the scale to the tier (foundation=building-sized, keystone=person-sized, utility=handheld)
5. Add an appropriate emoji
```

### 2. Enhanced Compound Word Detection
**File:** `backend/src/shared/lib/validation/content-validators.ts`

**Enhanced `isCompoundWord()` function to detect:**
- Patterns with "+" symbol (e.g., "Key+Person")
- Patterns with parentheses (e.g., "Castle (Castle + Scroll)")
- Anchors starting with concept name (e.g., "CloudCake" for "Cloud")
- Repeating words (e.g., "Factory Factory")

**New signature:**
```typescript
export function isCompoundWord(anchor: string, conceptName?: string): boolean
```

### 3. Updated System Prompt
**File:** `backend/src/shared/lib/system-prompt.ts`

**Key Changes:**
- Added "DO NOT force same-letter matching" rule
- Added "ANCHOR SELECTION PROCESS" section
- Expanded examples with "Primary Function" column
- Added more wrong examples showing common mistakes

### 4. Updated Tests
**File:** `backend/src/shared/lib/validation/__tests__/content-validators.test.ts`

**Added test cases for:**
- Detecting "+" symbols in anchors
- Detecting anchors starting with concept name
- Allowing valid anchors that don't match concept name

## Expected Results

After these changes, the AI should generate meaningful, functional analogies across all domains:

| Concept | Domain | Bad (Before) | Good (After) | Why It Works |
|---------|--------|--------------|--------------|--------------|
| Cloud | Tech | "CloudCake" | "Warehouse 🏭" | Stores data like a warehouse stores goods |
| Cell Membrane | Biology | "MembranePhone" | "Castle Wall 🏰" | Controls entry like a wall with gates |
| Double-Entry | Accounting | "Entry+Entry" | "Seesaw ⚖️" | Balances like a seesaw must balance |
| MIG Welding | Welding | "MIG MIG+" | "Glue Gun 🔫" | Bonds materials like glue |
| Enzyme | Biology | "Enzyme Enzyme" | "Key 🔑" | Unlocks reactions like a key unlocks doors |
| Factory | "Factory Factory" | "Assembly Line 🏭" | Represents production process |
| Security | "Shield Shield" | "Guard 👮" | Represents protection/control |

## Testing

To verify the fix:

1. **Generate new content** for any subject
2. **Check the Nomenclature Sprint** (in SCOUT phase) - analogies should make sense
3. **Check the Foundation/Keystone/Utility view** - visual metaphors should be clear
4. **Run backend tests**: `npm test` in `backend/` directory

## Files Modified

1. `backend/src/shared/lib/prompts/phase2-content-generation.ts` - Enhanced anchor generation guidance
2. `backend/src/shared/lib/validation/content-validators.ts` - Enhanced compound word detection
3. `backend/src/shared/lib/system-prompt.ts` - Updated mnemonic anchor rules
4. `backend/src/shared/lib/validation/__tests__/content-validators.test.ts` - Added test coverage
5. `backend/src/shared/lib/generation/multi-phase-orchestrator.ts` - Added validation for compound words and circular definitions

## Validation Enhancements

The multi-phase orchestrator now validates:
- **Compound words** in mnemonic anchors (e.g., "CloudCake", "Key+Person")
- **Circular definitions** in simpleCore and hookSentence
- **Anchor quality** by checking if anchor starts with concept name

These validations will catch bad analogies during content generation and trigger regeneration if needed.

## Related Components

These components consume the mnemonic anchors and will benefit from the fix:

- `src/components/learning/activities/NomenclatureSprint.tsx` - Uses `concept.mnemonic.anchor`
- `src/components/learning/session/SessionScoutPreview.tsx` - Shows nomenclature sprint
- `src/pages/VelocityLearning.tsx` - Orchestrates the learning flow
- Backend content generation pipeline - Validates and generates anchors

## Migration Notes

**Existing content** with bad analogies will remain until regenerated. To fix existing content:

1. Delete the session from the library
2. Generate new content for the same subject
3. The new content will use the improved analogy system

**No database migration needed** - this is a prompt/validation fix only.

---

**Status:** ✅ Complete
**Date:** January 30, 2026
**Impact:** High - Improves learning experience and memory retention

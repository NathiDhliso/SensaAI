# Self-Healing Feature: Architecture Analysis

## The Question

**"Why doesn't the prompt just produce healed concepts?"**

This is the right question. The self-healing feature is essentially a band-aid for poor AI generation.

## Current Architecture

```
AI Generation (Backend)
    ↓
Concepts Stored in DynamoDB
    ↓
Frontend Loads Concepts
    ↓
Validation Detects Gaps ❌
    ↓
Self-Healing Repairs Gaps (AI calls again)
    ↓
Concepts Finally Valid ✅
```

## The Problem

1. **Double AI Cost** - We pay for generation, then pay again to fix what was generated
2. **Slower UX** - Users wait for generation, then wait again for repairs
3. **Complexity** - Entire repair orchestration system with retry logic, validation, etc.
4. **Band-aid Architecture** - Fixing symptoms instead of root cause

## Root Cause Analysis

### Why Do Concepts Have Gaps?

Looking at the system prompt (`backend/src/shared/lib/system-prompt.ts`), it's actually **very comprehensive**:

✅ Has strict quality requirements
✅ Includes SHAPE format requirements
✅ Has banned patterns (circular definitions, empty fallbacks)
✅ Has mandatory field checklist
✅ Has quality gates

**So why do gaps still occur?**

1. **AI doesn't always follow instructions** - Even with perfect prompts, LLMs occasionally skip fields
2. **Token limits** - For large subjects (30+ concepts), the AI might truncate
3. **Complexity overload** - The prompt is 800+ lines - AI might lose track
4. **Legacy content** - Old concepts generated before prompt improvements

## Recommended Solutions

### Option 1: Improve Prompt (Best Long-term)

**Strengthen the prompt to prevent gaps:**

```typescript
// Add to system prompt
CRITICAL VALIDATION RULES:
Before returning ANY concept, verify:
1. hookSentence exists and is 15+ words
2. shape.simpleCore exists and is NOT circular
3. shape.highStakesExample exists with real company/year
4. mnemonic.story exists and is vivid
5. whyYouNeed exists and is specific
6. realWorldExample exists with concrete details

If ANY field is missing or circular:
- DO NOT return the concept
- Generate that specific field again
- Verify it passes validation
- Then return the complete concept
```

**Add structured output validation:**

```typescript
// Use Claude's structured output feature
{
  "type": "object",
  "required": ["hookSentence", "shape", "mnemonic", "whyYouNeed", "realWorldExample"],
  "properties": {
    "hookSentence": { "type": "string", "minLength": 50 },
    "shape": {
      "required": ["simpleCore", "highStakesExample"],
      "properties": {
        "simpleCore": { "type": "string", "minLength": 30 },
        "highStakesExample": { "type": "string", "minLength": 50 }
      }
    }
  }
}
```

### Option 2: Backend Validation (Pragmatic)

**Move validation to the Lambda:**

```typescript
// In backend/src/features/generation/services/bedrock.ts

async function generateConcept(subject: string, conceptName: string): Promise<Concept> {
  let attempts = 0;
  const maxAttempts = 3;
  
  while (attempts < maxAttempts) {
    const concept = await callBedrockAPI(subject, conceptName);
    const gaps = validateConceptContent(concept);
    
    if (gaps.filter(g => g.severity === 'critical').length === 0) {
      return concept; // Valid!
    }
    
    // Repair specific fields that failed
    for (const gap of gaps) {
      concept[gap.field] = await repairField(subject, conceptName, gap);
    }
    
    attempts++;
  }
  
  throw new Error('Failed to generate valid concept after retries');
}
```

**Benefits:**
- ✅ Frontend always receives valid concepts
- ✅ No frontend repair complexity
- ✅ Retry logic happens during generation (user only waits once)
- ✅ Failed generations never reach DynamoDB

### Option 3: Hybrid Approach (Recommended)

**Combine both:**

1. **Improve prompt** - Reduce gap frequency from ~20% to ~5%
2. **Backend validation** - Catch the remaining 5% during generation
3. **Remove frontend repair** - Simplify architecture
4. **Keep validation** - For debugging and monitoring

```typescript
// Frontend becomes simpler
const loadData = async () => {
  const data = await storageManager.loadResult(subjectId);
  
  // Just validate for monitoring (don't repair)
  const gaps = validateAllConcepts(data.concepts);
  if (gaps.length > 0) {
    console.warn('[Quality Monitor] Gaps detected:', gaps);
    // Send to analytics/monitoring
  }
  
  // Use concepts as-is (they're already valid from backend)
  setConcepts(data.concepts);
};
```

## Impact Analysis

### If We Remove Self-Healing

**Code to Delete:**
- `src/lib/generation/repair-orchestrator.ts` (430 lines)
- `src/lib/generation/lifecycle-engine.ts` (60 lines)
- Repair logic in `ContentLaunchpad.tsx` (~100 lines)
- `RepairPlan` types and interfaces

**Code to Keep:**
- `src/lib/validation/content-quality.ts` (for monitoring)
- Validation in `ContentLaunchpad.tsx` (for debugging)

**Benefits:**
- 📉 ~600 lines of code removed
- 📉 Simpler architecture
- 📉 Fewer AI API calls
- 📈 Faster user experience
- 📈 Lower costs

**Risks:**
- ⚠️ Legacy content with gaps can't be auto-fixed
- ⚠️ Need to ensure backend validation is robust

### Migration Path

1. **Phase 1: Improve Prompt** (1-2 days)
   - Add validation requirements to system prompt
   - Test with various subjects
   - Measure gap reduction

2. **Phase 2: Backend Validation** (2-3 days)
   - Add validation to Lambda
   - Add retry logic for failed fields
   - Test thoroughly

3. **Phase 3: Remove Frontend Repair** (1 day)
   - Delete repair orchestrator
   - Simplify ContentLaunchpad
   - Keep validation for monitoring

4. **Phase 4: Legacy Content** (optional)
   - Run one-time repair job on existing DynamoDB records
   - Or: Keep frontend repair as "legacy mode" for old content

## Recommendation

**Go with Option 3 (Hybrid Approach):**

1. Improve the prompt to reduce gaps to <5%
2. Add backend validation with retry during generation
3. Remove frontend repair complexity
4. Keep validation for monitoring/debugging

This gives you:
- ✅ Better quality at the source
- ✅ Simpler frontend architecture
- ✅ Faster user experience
- ✅ Lower costs
- ✅ Better monitoring

## Next Steps

Would you like me to:

A. **Improve the system prompt** - Add validation requirements and structured output
B. **Add backend validation** - Move repair logic to Lambda
C. **Remove frontend repair** - Simplify the architecture
D. **All of the above** - Complete migration

Let me know which direction you want to go!

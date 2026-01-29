Technical Implementation Plan: Hardening SensaArchitect

This document outlines the technical architecture required to address critical engineering gaps in the SensaArchitect codebase. It moves beyond the "Happy Path" to handle edge cases, state conflicts, and AI non-determinism.

1. AI Coach Hardening

A. Audio Interrupt Service (Singleton)

Problem: Clicking "Next" while audio plays creates a cacophony.
Solution: Enhance the global AudioService singleton in src/services/AudioService.ts.

Technical Specs:

Properties to Add:

playlist: Queue<string>

fadeDuration: number (default 0.2s)

Methods to Enhance:

play(url, priority): If priority === 'high' (Coach), immediately fade out currentSource and play new. If normal, queue it.

B. Fatigue & Repetition Algorithm

Problem: Users hear the same "Goggins" line 5 times in an hour.
Solution: A "Least Recently Used" (LRU) tracking system in useVoice.ts.

Algorithm:

Input: A requested situation (e.g., prime_intro).

Fetch: Get all valid line IDs for this situation from static-lines.ts.

Filter: available = lines.filter(id => !history.lastPlayedIds.includes(id))

Fallback: If available.length === 0, clear history for this category, reset.

Select: Randomly pick from available.

C. Heuristic Struggle Detector

Problem: "Struggle" is subjective. We need a quantifiable metric.
Solution: useStruggleDetector hook monitoring interaction velocity.

Metrics to Track:

timeSinceLastAction: > 45 seconds (configurable).

errorRate: > 2 consecutive wrong answers in Quiz/Drill.

backspaceVelocity: High rate of deletion in text inputs (indicates hesitation).

2. Robust Content Generation (Backend)

A. JSON Repair & Validation Pipeline

Problem: LLMs output malformed JSON (trailing commas, unclosed brackets).
Solution: A multi-stage parsing pipeline in backend/lambda/generate_concepts/services/bedrock_service.py.

Pipeline Steps:

Raw Output: Receive string from Claude.

Sanitization: Regex replace to remove Markdown code blocks (json ... ).

Stage 1 Parse: Try standard json.loads().

Stage 2 Repair (On Fail): Use a custom regex parser to fix trailing commas/quotes.

Stage 3 Hallucination Check:

Verify concept_count matches requested count.

Verify tier values are strictly ['foundation', 'keystone', 'utility'].

B. Keyword & Alias Injection (For Blank Sheet)

Problem: Client-side scoring fails on synonyms.
Solution: Force the LLM to generate the scoring rubric during generation.

Prompt Update (system_prompt.py):
Add this to the System Prompt:

"For every concept, generate an 'aliases' array (3-5 synonyms) and 'keywords' array (core terms required for a correct definition). Do not include the concept name itself in keywords."

3. Resilient Storage & Sync

A. Field-Level Merging (CRDT-lite)

Problem: "Last write wins" destroys data in multi-device scenarios.
Solution: Timestamp-based merging per field in src/lib/storage/sync-engine.ts.

Merge Logic:

function mergeProgress(local: Progress, cloud: Progress): Progress {
  // Union of completed concepts (you can't "un-learn" a concept usually)
  const mergedConcepts = Array.from(new Set([...local.completed, ...cloud.completed]));
  
  return {
    ...cloud,
    completed: mergedConcepts,
    // Keep highest scores
    quizScores: mergeScores(local.scores, cloud.scores) 
  };
}


B. IndexedDB Quota Management

Problem: Browser wipes data if disk is full.
Solution: StorageManager service in indexed-db.ts.

Check: navigator.storage.estimate() on app load.

Request: navigator.storage.persist() (ask user for permission).

Eviction Policy: If usage > quota * 0.8, delete cached audio files first.

4. Learning Session Enhancements

A. Blank Sheet Scoring (Fuzzy Match)

Problem: Exact match is too strict.
Solution: Client-side fuzzy matching using the keywords generated in Section 2B.

File: src/lib/learning/scoring/blank-sheet-scorer.ts

Algorithm:

Tokenize: Split user input into words, remove stop words (the, a, is).

Stem: Simple suffix removal (running -> run).

Match: Check if user tokens overlap with concept.scoring.keywords.

Score: (matches / totalKeywords) * 100.

B. Anti-Cheat Timer

Problem: setInterval slows down in background tabs.
Solution: Delta-based timing in src/hooks/useCountdownTimer.ts.

Implementation:
Use Date.now() delta comparisons instead of relying on the interval tick count.
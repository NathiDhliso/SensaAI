/**
 * useULCCoach
 *
 * ULC-aware coaching hook. Detects when a learner is jumping between
 * objects without completing verb cycles and surfaces persona-appropriate
 * guidance messages.
 *
 * Integrates with the existing useCoachMessage infrastructure but adds
 * ULC-specific trigger logic and message templates.
 */
import { useCallback, useRef } from 'react';
import { usePersonalizationStore } from '@/store/personalization-store';
import type { ULCPattern } from '@/features/content-generation/parsers/ulc-detector';
import type { PersonaId } from '@/features/ai-coach/personas';

// ── ULC Guidance Messages per Persona ────────────────────────────────────────

const ULC_GUIDANCE: Record<PersonaId, {
    howBeforeWhy: string;
    systematicProgress: string;
    contextShift: string;
    objectJumping: string;
    verbComplete: string;
}> = {
    goggins: {
        howBeforeWhy: "Stop overthinking WHY. Master the HOW first. The procedure is your foundation — build on rock, not sand.",
        systematicProgress: "One verb. One object. Complete it before moving on. No shortcuts. Finish the row.",
        contextShift: "The 'why' changes with every scenario. The 'how' stays the same. Stop chasing context — own the procedure.",
        objectJumping: "You're jumping objects. Finish the verb cycle first. Complete one row before you move to the next. That's how you build systematic mastery.",
        verbComplete: "Verb mastered across all objects. That's a column done. Keep going — finish the matrix."
    },
    sage: {
        howBeforeWhy: "Notice how the 'how' is stable, while the 'why' shifts with context. Build your foundation on what doesn't change.",
        systematicProgress: "Move through the matrix gently, one cell at a time. Mastery is systematic, not rushed.",
        contextShift: "The examiner's perspective will vary, but the procedure remains constant. Trust the stable ground.",
        objectJumping: "You're moving between resources before completing the action cycle. Consider finishing one row — it builds a more solid foundation.",
        verbComplete: "You've applied this action across all resources. That's a complete column — a real skill mastered."
    },
    socratic: {
        howBeforeWhy: "What changes between scenarios — the procedure or the rationale? Which one should you master first?",
        systematicProgress: "Which cell in the matrix would give you the most leverage right now? What's the next logical step?",
        contextShift: "If the 'why' shifts with context, what does that tell you about where to anchor your learning?",
        objectJumping: "You've moved to a new resource before completing all actions on the previous one. What's driving that choice?",
        verbComplete: "You've applied this action to every resource. What patterns do you notice across them?"
    },
    coach: {
        howBeforeWhy: "Procedure first, context second! Master the HOW — it's your playbook. The WHY is just commentary.",
        systematicProgress: "Work the matrix! One row at a time, one cell at a time. That's how champions train!",
        contextShift: "The play doesn't change — only the defense does. Know your plays cold, then adapt!",
        objectJumping: "Hey! You're jumping around the matrix. Finish the row first! Complete the verb cycle before moving on!",
        verbComplete: "Column complete! You've run that play on every resource. That's a real skill in the bag!"
    },
    buddy: {
        howBeforeWhy: "Okay so here's the thing — learn the HOW first. It's the same every time. The WHY is just context that changes.",
        systematicProgress: "Let's work through the matrix together — one cell at a time. No need to rush!",
        contextShift: "The procedure is always the same, but the reason changes depending on the scenario. Focus on the stable stuff first!",
        objectJumping: "Hey, looks like you're jumping around a bit! Try finishing all the actions for one resource before moving to the next.",
        verbComplete: "Nice! You've done that action for every resource. That's a whole column done — solid work!"
    }
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export interface ULCCoachOptions {
    /** Minimum time between ULC coach messages (default: 60s) */
    cooldownMs?: number;
}

export interface ULCCoachReturn {
    /** Get a ULC guidance message for the current situation */
    getULCMessage: (
        situation: 'howBeforeWhy' | 'systematicProgress' | 'contextShift' | 'objectJumping' | 'verbComplete'
    ) => string;
    /** Check if the learner is jumping objects (should trigger guidance) */
    detectObjectJumping: (
        pattern: ULCPattern,
        recentConceptIds: string[]
    ) => boolean;
    /** Check if a verb column is complete (should trigger celebration) */
    detectVerbComplete: (
        pattern: ULCPattern,
        verbIndex: number
    ) => boolean;
    /** Get the next recommended cell based on systematic progress */
    getNextRecommendedCell: (
        pattern: ULCPattern
    ) => { verb: string; object: string; conceptId: string } | null;
}

export function useULCCoach(options: ULCCoachOptions = {}): ULCCoachReturn {
    const { cooldownMs = 60000 } = options;
    const { selectedPersona } = usePersonalizationStore();
    const lastMessageTimeRef = useRef<number>(0);

    const getULCMessage = useCallback(
        (situation: keyof typeof ULC_GUIDANCE[PersonaId]): string => {
            const now = Date.now();
            if (now - lastMessageTimeRef.current < cooldownMs) {
                return '';
            }
            lastMessageTimeRef.current = now;
            const guidance = ULC_GUIDANCE[selectedPersona as PersonaId] || ULC_GUIDANCE.buddy;
            return guidance[situation] || '';
        },
        [selectedPersona, cooldownMs]
    );

    /**
     * Detect if the learner is jumping between objects without completing verb cycles.
     * Looks at the last N concept IDs practiced and checks if they span multiple objects
     * without completing any single object's verb set.
     */
    const detectObjectJumping = useCallback(
        (pattern: ULCPattern, recentConceptIds: string[]): boolean => {
            if (!pattern.detected || recentConceptIds.length < 3) return false;

            // Find which objects the recent concepts belong to
            const recentObjects = new Set<string>();
            for (const conceptId of recentConceptIds.slice(-6)) {
                for (const row of pattern.matrix) {
                    for (const cell of row) {
                        if (cell.conceptId === conceptId) {
                            recentObjects.add(cell.object);
                        }
                    }
                }
            }

            // If they've touched 3+ different objects in the last 6 concepts, that's jumping
            if (recentObjects.size < 3) return false;

            // Check if any single object has all its verbs completed
            const anyObjectComplete = pattern.matrix.some(row => {
                const filledCells = row.filter(c => c.conceptId);
                return filledCells.length > 0 && filledCells.every(c => c.status === 'mastered');
            });

            // Jumping is a problem only if no object is complete yet
            return !anyObjectComplete;
        },
        []
    );

    /**
     * Detect if a verb column has just been completed (all objects mastered for that verb).
     */
    const detectVerbComplete = useCallback(
        (pattern: ULCPattern, verbIndex: number): boolean => {
            if (!pattern.detected || verbIndex >= pattern.verbs.length) return false;
            const columnCells = pattern.matrix.map(row => row[verbIndex]).filter(c => c.conceptId);
            return columnCells.length > 0 && columnCells.every(c => c.status === 'mastered');
        },
        []
    );

    /**
     * Get the next recommended cell based on systematic (row-first) progress.
     * Strategy: Complete all verbs for one object before moving to the next.
     */
    const getNextRecommendedCell = useCallback(
        (pattern: ULCPattern): { verb: string; object: string; conceptId: string } | null => {
            if (!pattern.detected) return null;

            // Find the first row with incomplete cells
            for (const row of pattern.matrix) {
                const incompleteCells = row.filter(
                    c => c.conceptId && c.status !== 'mastered'
                );
                if (incompleteCells.length > 0) {
                    const cell = incompleteCells[0];
                    return {
                        verb: cell.verb,
                        object: cell.object,
                        conceptId: cell.conceptId!
                    };
                }
            }

            return null;
        },
        []
    );

    return {
        getULCMessage,
        detectObjectJumping,
        detectVerbComplete,
        getNextRecommendedCell
    };
}

export default useULCCoach;

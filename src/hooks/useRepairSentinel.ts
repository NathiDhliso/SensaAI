/**
 * useRepairSentinel Hook
 * 
 * Monitors learning state and triggers proactive repair interventions
 * when Q_M (Modeling) or Q_f (Fluency) scores drop below thresholds.
 * 
 * Extracted from MicroLearningLoopController for cleaner architecture.
 */
import { useState, useEffect, useCallback } from 'react';
import { useSensaFlow } from './useSensaFlow';

export interface RepairTrigger {
    type: 'QM' | 'Qf';
    reason: string;
    currentValue: number;
    potentialValue: number;
}

interface RepairSentinelConfig {
    qmThreshold?: number;      // Default: 0.4
    qfThreshold?: number;      // Default: 0.6
    minAttempts?: number;      // Default: 2 (for Qf)
    cooldownConcepts?: number; // Default: 5
}

interface RepairSentinelState {
    trigger: RepairTrigger | null;
    activeRepair: 'bridge-builder' | 'speed-drill' | null;
    declinedCount: { QM: number; Qf: number };
    lastTriggeredConceptIndex: number;
}

export function useRepairSentinel(
    loopState: string,
    attempts: number,
    conceptIndex: number,
    config: RepairSentinelConfig = {}
) {
    const {
        qmThreshold = 0.4,
        qfThreshold = 0.6,
        minAttempts = 2,
        cooldownConcepts = 5
    } = config;

    const sensaFlow = useSensaFlow();

    const [state, setState] = useState<RepairSentinelState>({
        trigger: null,
        activeRepair: null,
        declinedCount: { QM: 0, Qf: 0 },
        lastTriggeredConceptIndex: -999
    });

    // Check if we're on cooldown
    const isOnCooldown = conceptIndex - state.lastTriggeredConceptIndex < cooldownConcepts;
    const hasDeclinedTooMuch = state.declinedCount.QM >= 2 || state.declinedCount.Qf >= 2;

    // Proactive Trigger Logic
    useEffect(() => {
        // Skip if already showing a trigger or active repair
        if (state.trigger || state.activeRepair) return;
        // Skip if on cooldown or declined too much
        if (isOnCooldown || hasDeclinedTooMuch) return;

        // Q_f Check: If attempts accumulating and slow
        if (attempts >= minAttempts && sensaFlow.Q_f < qfThreshold) {
            setState(prev => ({
                ...prev,
                trigger: {
                    type: 'Qf',
                    reason: "You're getting it right, but speed is low. Boost fluency?",
                    currentValue: sensaFlow.Q_f,
                    potentialValue: Math.min(1.0, sensaFlow.Q_f + 0.35)
                },
                lastTriggeredConceptIndex: conceptIndex
            }));
            return;
        }

        // Q_M Check: If in learn phase and modeling is weak
        if (loopState === 'learn' && sensaFlow.Q_M < qmThreshold) {
            setState(prev => ({
                ...prev,
                trigger: {
                    type: 'QM',
                    reason: "Deep connections are missing. Build a bridge?",
                    currentValue: sensaFlow.Q_M,
                    potentialValue: Math.min(1.0, sensaFlow.Q_M + 0.35)
                },
                lastTriggeredConceptIndex: conceptIndex
            }));
        }
    }, [attempts, sensaFlow.Q_f, sensaFlow.Q_M, loopState, state.trigger, state.activeRepair, isOnCooldown, hasDeclinedTooMuch, conceptIndex, minAttempts, qfThreshold, qmThreshold]);

    const acceptRepair = useCallback(() => {
        if (!state.trigger) return;

        const repairType = state.trigger.type === 'QM' ? 'bridge-builder' : 'speed-drill';
        setState(prev => ({
            ...prev,
            trigger: null,
            activeRepair: repairType
        }));
    }, [state.trigger]);

    const declineRepair = useCallback(() => {
        if (!state.trigger) return;

        setState(prev => ({
            ...prev,
            trigger: null,
            declinedCount: {
                ...prev.declinedCount,
                [state.trigger!.type]: prev.declinedCount[state.trigger!.type] + 1
            }
        }));
    }, [state.trigger]);

    const completeRepair = useCallback((quality: number) => {
        // In a real implementation, this would update sensaFlow
        console.log('Repair completed with quality:', quality);
        setState(prev => ({
            ...prev,
            activeRepair: null
        }));
    }, []);

    const cancelRepair = useCallback(() => {
        setState(prev => ({
            ...prev,
            activeRepair: null
        }));
    }, []);

    return {
        trigger: state.trigger,
        activeRepair: state.activeRepair,
        acceptRepair,
        declineRepair,
        completeRepair,
        cancelRepair,
        isOnCooldown,
        hasDeclinedTooMuch
    };
}

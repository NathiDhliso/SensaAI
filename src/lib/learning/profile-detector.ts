/**
 * Profile Detector - Predictive Learning Profile Inference
 * 
 * This module analyzes behavioral signals to automatically determine
 * the optimal learning mode for a student without requiring any quiz
 * or administrative input.
 * 
 * Silver Bullet Approach:
 * - Velocity-optimal: For students who struggle with cognitive overload
 * - Palace-optimal: For students who struggle with visualization (aphantasia)
 * - Hybrid: For students who struggle with both
 * - Undetermined: Not enough data yet, or student handles both well
 */

import type { BehavioralSignals, LearningProfile } from '@/store/personalization-store';

// Thresholds for profile detection
const THRESHOLDS = {
    // Cognitive overload indicators
    HIGH_TIME_PER_CONCEPT: 180,      // >3 minutes = struggling
    HIGH_REVISIT_COUNT: 3,           // Revisiting concepts frequently
    HIGH_ERROR_STREAK: 3,            // Multiple consecutive errors

    LOW_ENGAGEMENT: 0.2,             // Below 20% engagement

    // Confidence thresholds
    MIN_CONCEPTS_FOR_INFERENCE: 5,   // Need at least 5 concepts viewed
    HIGH_CONFIDENCE: 70,
    MEDIUM_CONFIDENCE: 50,
};

/**
 * Calculates cognitive overload risk score (0-100)
 */
function calculateOverloadRisk(signals: BehavioralSignals): number {
    let score = 0;

    // Factor 1: Time per concept (slower = higher risk)
    if (signals.avgTimePerConcept > THRESHOLDS.HIGH_TIME_PER_CONCEPT) {
        score += 30;
    } else if (signals.avgTimePerConcept > THRESHOLDS.HIGH_TIME_PER_CONCEPT * 0.6) {
        score += 15;
    }

    // Factor 2: Concept revisits (more revisits = higher risk)
    if (signals.conceptRevisits >= THRESHOLDS.HIGH_REVISIT_COUNT) {
        score += 30;
    } else if (signals.conceptRevisits >= THRESHOLDS.HIGH_REVISIT_COUNT - 1) {
        score += 15;
    }

    // Factor 3: Consecutive errors
    if (signals.consecutiveErrors >= THRESHOLDS.HIGH_ERROR_STREAK) {
        score += 25;
    } else if (signals.consecutiveErrors >= THRESHOLDS.HIGH_ERROR_STREAK - 1) {
        score += 12;
    }

    // Factor 4: Low velocity engagement suggests struggle with chunked learning
    if (signals.velocityEngagement < THRESHOLDS.LOW_ENGAGEMENT && signals.totalConceptsViewed > 3) {
        score += 15;
    }

    return Math.min(100, score);
}



/**
 * Infers the optimal learning profile based on behavioral signals.
 * Returns both the profile and a confidence score.
 */
export function inferLearningProfile(
    signals: BehavioralSignals,
    _aphantasiaModeEnabled: boolean = false
): { profile: LearningProfile; confidence: number } {
    // Not enough data yet
    if (signals.totalConceptsViewed < THRESHOLDS.MIN_CONCEPTS_FOR_INFERENCE) {
        return { profile: 'undetermined', confidence: 0 };
    }

    const overloadScore = calculateOverloadRisk(signals);

    if (overloadScore >= 50) {
        // Cognitive overload detected - recommend velocity's chunked approach
        return {
            profile: 'velocity-optimal',
            confidence: Math.min(100, overloadScore)
        };
    }

    // Student seems to handle content well
    return { profile: 'undetermined', confidence: 30 };
}

/**
 * Returns a human-readable recommendation for the detected profile
 */
export function getProfileRecommendation(profile: LearningProfile): string {
    switch (profile) {
        case 'velocity-optimal':
            return 'Velocity mode breaks content into bite-sized chunks to reduce cognitive load.';
        case 'undetermined':
        default:
            return 'Explore content to find what works best for you.';
    }
}

/**
 * Returns the recommended tab ID based on profile
 */
export function getRecommendedTab(profile: LearningProfile): 'learn' | null {
    switch (profile) {
        case 'velocity-optimal':
            return 'learn';
        case 'undetermined':
        default:
            return null;
    }
}

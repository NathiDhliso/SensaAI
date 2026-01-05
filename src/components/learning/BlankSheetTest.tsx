/**
 * BlankSheetTestComponent
 * 
 * Implements the blank sheet test for measuring knowledge retention.
 * Clean, distraction-free interface with real-time typing metrics.
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */

import { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    FileText,
    Clock,
    BarChart3,
    CheckCircle2,
    AlertTriangle,
    Send,
    Lightbulb,
    Sparkles,
    Volume2,
    Loader2,
    Square
} from 'lucide-react';
import { useVoice } from '@/hooks/useVoice';
import type { LearningConcept } from '@/lib/types/learning';
import {
    generateCoachFeedback,
    type CoachFeedback,
    type BlankSheetScore
} from '@/lib/ai/phases';
import { usePersonalizationStore } from '@/store/personalization-store';
import styles from './BlankSheetTest.module.css';

// ============================================================================
// TYPES
// ============================================================================

export interface BlankSheetTestProps {
    /** Concept being tested */
    concept: LearningConcept;
    /** Key points to check against */
    keyPoints: string[];
    /** Callback when test completes */
    onComplete: (result: BlankSheetResult) => void;
    /** Callback to skip */
    onSkip: () => void;
}

export interface BlankSheetResult {
    /** User's response text */
    responseText: string;
    /** Score from 0-100 */
    score: number;
    /** Key points that were identified */
    identifiedPoints: string[];
    /** Key points that were missed */
    missedPoints: string[];
    /** Points that need manual review */
    uncertainPoints: string[];
    /** Confidence in the scoring (0-1) */
    scoringConfidence: number;
    /** Typing metrics */
    metrics: TypingMetrics;
    /** AI Coach Feedback */
    coachFeedback?: CoachFeedback;
}

export interface TypingMetrics {
    /** Total time in seconds */
    totalTime: number;
    /** Total words typed */
    wordCount: number;
    /** Total characters typed */
    characterCount: number;
    /** Words per minute */
    wordsPerMinute: number;
    /** Time to first keystroke */
    timeToFirstKeystroke: number;
    /** Pauses detected (>3 seconds between keystrokes) */
    pauseCount: number;
}

// ============================================================================
// RESPONSE ANALYSIS ENGINE
// ============================================================================

interface AnalysisResult {
    point: string;
    status: 'identified' | 'missed' | 'uncertain';
    confidence: number;
    matchedPhrases: string[];
}

/**
 * Analyze user response against key points
 * Returns score and identification of gaps
 */
function analyzeResponse(
    response: string,
    keyPoints: string[]
): {
    results: AnalysisResult[];
    score: number;
    confidence: number;
} {
    const responseWords = response.toLowerCase().split(/\s+/);
    const responsePhrases = extractPhrases(response.toLowerCase());
    const results: AnalysisResult[] = [];

    for (const point of keyPoints) {
        const pointWords = point.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        const pointPhrases = extractPhrases(point.toLowerCase());

        // Check for word matches
        const wordMatches = pointWords.filter(pw =>
            responseWords.some(rw => rw.includes(pw) || pw.includes(rw))
        );

        // Check for phrase matches
        const phraseMatches = pointPhrases.filter(pp =>
            responsePhrases.some(rp => rp.includes(pp) || pp.includes(rp))
        );

        const wordMatchRatio = pointWords.length > 0 ? wordMatches.length / pointWords.length : 0;
        const phraseMatchRatio = pointPhrases.length > 0 ? phraseMatches.length / pointPhrases.length : 0;

        // Combined confidence score
        const confidence = (wordMatchRatio * 0.6) + (phraseMatchRatio * 0.4);

        let status: 'identified' | 'missed' | 'uncertain';
        if (confidence >= 0.6) {
            status = 'identified';
        } else if (confidence >= 0.3) {
            status = 'uncertain';
        } else {
            status = 'missed';
        }

        results.push({
            point,
            status,
            confidence,
            matchedPhrases: [...wordMatches, ...phraseMatches],
        });
    }

    // Calculate overall score
    const identifiedCount = results.filter(r => r.status === 'identified').length;
    const uncertainCount = results.filter(r => r.status === 'uncertain').length;
    const score = Math.round(
        ((identifiedCount * 1.0) + (uncertainCount * 0.5)) / keyPoints.length * 100
    );

    // Calculate overall confidence
    const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;

    return { results, score, confidence: avgConfidence };
}

/**
 * Extract meaningful phrases from text
 */
function extractPhrases(text: string): string[] {
    const words = text.split(/\s+/).filter(w => w.length > 2);
    const phrases: string[] = [];

    // Extract 2-word and 3-word phrases
    for (let i = 0; i < words.length - 1; i++) {
        phrases.push(`${words[i]} ${words[i + 1]}`);
        if (i < words.length - 2) {
            phrases.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
        }
    }

    return phrases;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function BlankSheetTest({
    concept,
    keyPoints,
    onComplete,
    onSkip,
}: BlankSheetTestProps) {
    const [response, setResponse] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [result, setResult] = useState<BlankSheetResult | null>(null);

    // Timing state
    const [startTime] = useState(Date.now());
    const [firstKeystrokeTime, setFirstKeystrokeTime] = useState<number | null>(null);
    const [lastKeystrokeTime, setLastKeystrokeTime] = useState<number | null>(null);
    const [pauseCount, setPauseCount] = useState(0);

    const { selectedPersona } = usePersonalizationStore();
    const { toggle, isPlaying: isVoicePlaying, isLoading: isVoiceLoading } = useVoice();

    // Real-time metrics
    const metrics = useMemo((): TypingMetrics => {
        const now = Date.now();
        const totalTime = (now - startTime) / 1000;
        const words = response.trim().split(/\s+/).filter(Boolean);
        const wordCount = words.length;
        const characterCount = response.length;
        const wordsPerMinute = totalTime > 0 ? Math.round((wordCount / totalTime) * 60) : 0;
        const timeToFirstKeystroke = firstKeystrokeTime
            ? (firstKeystrokeTime - startTime) / 1000
            : 0;

        return {
            totalTime,
            wordCount,
            characterCount,
            wordsPerMinute,
            timeToFirstKeystroke,
            pauseCount,
        };
    }, [response, startTime, firstKeystrokeTime, pauseCount]);

    // Character count validation
    const isValid = response.length >= 50;
    const charactersRemaining = Math.max(0, 50 - response.length);

    // Handle input changes
    const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        const now = Date.now();

        // Track first keystroke
        if (!firstKeystrokeTime && value.length > 0) {
            setFirstKeystrokeTime(now);
        }

        // Track pauses (>3 seconds between keystrokes)
        if (lastKeystrokeTime && (now - lastKeystrokeTime) > 3000) {
            setPauseCount(prev => prev + 1);
        }

        setLastKeystrokeTime(now);
        setResponse(value);
    }, [firstKeystrokeTime, lastKeystrokeTime]);

    // Handle submit
    const handleSubmit = useCallback(() => {
        if (!isValid) return;

        setIsSubmitting(true);

        // Analyze response
        const analysis = analyzeResponse(response, keyPoints);

        const blankSheetResult: BlankSheetResult = {
            responseText: response,
            score: analysis.score,
            identifiedPoints: analysis.results
                .filter(r => r.status === 'identified')
                .map(r => r.point),
            missedPoints: analysis.results
                .filter(r => r.status === 'missed')
                .map(r => r.point),
            uncertainPoints: analysis.results
                .filter(r => r.status === 'uncertain')
                .map(r => r.point),
            scoringConfidence: analysis.confidence,
            metrics: {
                ...metrics,
                totalTime: (Date.now() - startTime) / 1000,
            },
        };

        // Generate AI Coach Feedback (single concept mode)
        const scoreAdapter: BlankSheetScore = {
            conceptsRecalled: blankSheetResult.identifiedPoints.length,
            conceptsTotal: keyPoints.length,
            connectionsRecalled: 0,
            connectionsTotal: 0,
            labelsAccuracy: 0,
            overallScore: blankSheetResult.score,
            strengthAreas: blankSheetResult.identifiedPoints,
            focusAreas: blankSheetResult.missedPoints
        };

        const feedback = generateCoachFeedback(scoreAdapter, selectedPersona);
        blankSheetResult.coachFeedback = feedback;

        setResult(blankSheetResult);
        setShowResults(true);
        setIsSubmitting(false);
    }, [response, keyPoints, isValid, metrics, startTime, selectedPersona]);

    // Handle continue after results
    const handleContinue = useCallback(() => {
        if (result) {
            onComplete(result);
        }
    }, [result, onComplete]);

    // Results view
    if (showResults && result) {
        return (
            <motion.div
                className={styles.container}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
            >
                <div className={styles.resultsCard}>
                    <div className={styles.scoreSection}>
                        <div className={`${styles.scoreCircle} ${result.score >= 70 ? styles.scoreGood : result.score >= 40 ? styles.scoreOkay : styles.scoreLow}`}>
                            <span className={styles.scoreValue}>{result.score}</span>
                            <span className={styles.scoreLabel}>Score</span>
                        </div>
                        <h2 className={styles.resultsTitle}>
                            {result.score >= 70 ? 'Great Recall!' : result.score >= 40 ? 'Good Progress' : 'Keep Learning'}
                        </h2>
                    </div>

                    {/* AI Coach Feedback */}
                    {result.coachFeedback && (
                        <div className={styles.coachFeedback}>
                            <div className={styles.coachHeader}>
                                <Sparkles size={16} />
                                <span>Coach Insight</span>
                            </div>
                            <h3 className={styles.feedbackHeadline}>{result.coachFeedback.headline}</h3>
                            <p className={styles.feedbackMessage}>
                                "{result.coachFeedback.encouragement}"
                                <button
                                    onClick={() => toggle(result.coachFeedback!.encouragement + " " + result.coachFeedback!.message)}
                                    disabled={isVoiceLoading}
                                    title={isVoicePlaying ? "Stop" : "Hear coach"}
                                    style={{ marginLeft: '10px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', display: 'inline-flex', verticalAlign: 'middle' }}
                                >
                                    {isVoiceLoading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> :
                                        isVoicePlaying ? <Square size={16} fill="currentColor" /> : <Volume2 size={16} />}
                                </button>
                            </p>
                            <p className={styles.feedbackDetail}>
                                {result.coachFeedback.message}
                            </p>
                            <div className={styles.nextAction}>
                                <strong>Next Step:</strong> {result.coachFeedback.nextAction}
                            </div>
                        </div>
                    )}

                    <div className={styles.metricsRow}>
                        <div className={styles.metricItem}>
                            <Clock size={16} />
                            <span>{Math.round(result.metrics.totalTime)}s</span>
                        </div>
                        <div className={styles.metricItem}>
                            <FileText size={16} />
                            <span>{result.metrics.wordCount} words</span>
                        </div>
                        <div className={styles.metricItem}>
                            <BarChart3 size={16} />
                            <span>{result.metrics.wordsPerMinute} wpm</span>
                        </div>
                    </div>

                    {/* Identified points */}
                    {result.identifiedPoints.length > 0 && (
                        <div className={styles.pointsSection}>
                            <h4 className={styles.pointsTitle}>
                                <CheckCircle2 size={16} className={styles.successIcon} />
                                Correctly Recalled ({result.identifiedPoints.length})
                            </h4>
                            <ul className={styles.pointsList}>
                                {result.identifiedPoints.map((point, idx) => (
                                    <li key={idx} className={styles.pointSuccess}>{point}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Missed points */}
                    {result.missedPoints.length > 0 && (
                        <div className={styles.pointsSection}>
                            <h4 className={styles.pointsTitle}>
                                <Lightbulb size={16} className={styles.missedIcon} />
                                To Review ({result.missedPoints.length})
                            </h4>
                            <ul className={styles.pointsList}>
                                {result.missedPoints.map((point, idx) => (
                                    <li key={idx} className={styles.pointMissed}>{point}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Uncertain points */}
                    {result.uncertainPoints.length > 0 && (
                        <div className={styles.pointsSection}>
                            <h4 className={styles.pointsTitle}>
                                <AlertTriangle size={16} className={styles.uncertainIcon} />
                                Needs Clarification ({result.uncertainPoints.length})
                            </h4>
                            <ul className={styles.pointsList}>
                                {result.uncertainPoints.map((point, idx) => (
                                    <li key={idx} className={styles.pointUncertain}>{point}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <button className={styles.continueButton} onClick={handleContinue}>
                        Continue Learning
                    </button>
                </div>
            </motion.div>
        );
    }

    // Main test view
    return (
        <motion.div
            className={styles.container}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <div className={styles.testCard}>
                <div className={styles.header}>
                    <div className={styles.headerIcon}>
                        <FileText size={24} />
                    </div>
                    <div>
                        <h2 className={styles.title}>Blank Sheet Test</h2>
                        <p className={styles.subtitle}>
                            Write everything you know about <strong>{concept.name}</strong>
                        </p>
                    </div>
                </div>

                <div className={styles.prompt}>
                    <p>Without looking at any notes, write down:</p>
                    <ul>
                        <li>Key concepts and definitions</li>
                        <li>How it works or how to use it</li>
                        <li>Why it matters</li>
                        <li>Any examples you remember</li>
                    </ul>
                </div>

                <div className={styles.textareaWrapper}>
                    <textarea
                        className={styles.textarea}
                        value={response}
                        onChange={handleChange}
                        placeholder="Start typing everything you remember..."
                        autoFocus
                    />

                    <div className={styles.textareaFooter}>
                        <div className={`${styles.charCount} ${isValid ? styles.charCountValid : ''}`}>
                            {isValid ? (
                                <><CheckCircle2 size={14} /> {response.length} characters</>
                            ) : (
                                <>{charactersRemaining} more characters needed</>
                            )}
                        </div>
                        <div className={styles.liveMetrics}>
                            <span>{metrics.wordCount} words</span>
                            <span>•</span>
                            <span>{metrics.wordsPerMinute} wpm</span>
                        </div>
                    </div>
                </div>

                <div className={styles.actions}>
                    <button
                        className={styles.submitButton}
                        onClick={handleSubmit}
                        disabled={!isValid || isSubmitting}
                    >
                        <Send size={18} />
                        {isSubmitting ? 'Analyzing...' : 'Submit Response'}
                    </button>
                    <button className={styles.skipButton} onClick={onSkip}>
                        Skip this test
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

export default BlankSheetTest;

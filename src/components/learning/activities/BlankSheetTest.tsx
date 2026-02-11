/**
 * BlankSheetTestComponent
 * 
 * PRODUCTION-HARDENED VERSION
 * 
 * Implements the blank sheet test for measuring knowledge retention.
 * Clean, distraction-free interface with real-time typing metrics.
 * 
 * Now integrates with BlankSheetScorer for fuzzy keyword matching when
 * concept has scoring metadata (keywords/aliases from LLM generation).
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */
import { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
 FileText,
 Clock,
 CheckCircle2,
 AlertTriangle,
 Send,
 Lightbulb,
 Sparkles,
 Volume2,
 Loader2,
 Square,
 Activity,
 Trophy
} from 'lucide-react';
import { useVoice } from '@/features/ai-coach/voice/useVoice';
import type { LearningConcept } from '@/shared/types/learning';
import { VELOCITY_CONFIG } from '@/shared/constants/ui-constants';
import {
 generateCoachFeedback,
 type CoachFeedback,
 type BlankSheetScore
} from '@/features/learning-session/phases';
import { usePersonalizationStore } from '@/store/personalization-store';
import { useMetaphorContent } from '@/shared/hooks/useMetaphorContent';
import { calculateRecallScore } from '@/features/learning-session/scoring/blank-sheet-scorer';
import { useVisualTheme } from '@/shared/hooks/useVisualTheme';
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
 /** Callback when remediation is needed (score < 60%) */
 onNeedRemediation?: (result: BlankSheetResult) => void;
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
 /** Whether remediation is required (score < 60%) */
 needsRemediation: boolean;
 /** Remediation attempts count */
 remediationAttempts?: number;
 /** Keywords matched by BlankSheetScorer (when available) */
 matchedKeywords?: string[];
 /** Alias matches from BlankSheetScorer (when available) */
 aliasMatches?: string[];
 /** Feedback from BlankSheetScorer (when available) */
 scoringFeedback?: string;
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
 * 
 * ARCHITECT FIX: Now includes negation detection to prevent "keyword stuffing" exploit.
 * Penalizes responses containing negation words near key terms unless the key point itself is negative.
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
 // Negation markers for semantic accuracy check
 const negationWords = ['not', 'never', 'no', 'cannot', 'cant', "can't", 'wont', "won't", 'dont', "don't", 'isnt', "isn't"];
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
 // ARCHITECT FIX: Negation Detection
 // Check if key point contains negation (e.g., "cannot be null")
 const keyPointIsNegative = negationWords.some(neg => point.toLowerCase().includes(neg));
 // Check if user response contains negation near matched keywords (within 3 words)
 let negationPenalty = 0;
 if (wordMatches.length > 0 && !keyPointIsNegative) {
 const responseText = response.toLowerCase();
 for (const match of wordMatches) {
 const matchIndex = responseText.indexOf(match);
 if (matchIndex === -1) continue;
 // Extract window of ±3 words around the match
 const beforeText = responseText.slice(Math.max(0, matchIndex - 30), matchIndex);
 const afterText = responseText.slice(matchIndex, matchIndex + match.length + 30);
 // Check if negation appears near the keyword
 const hasNegationNearby = negationWords.some(neg =>
 beforeText.includes(neg) || afterText.includes(neg)
 );
 if (hasNegationNearby) {
 negationPenalty += 0.3; // Reduce confidence by 30% per negated keyword
 }
 }
 }
 const wordMatchRatio = pointWords.length > 0 ? wordMatches.length / pointWords.length : 0;
 const phraseMatchRatio = pointPhrases.length > 0 ? phraseMatches.length / pointPhrases.length : 0;
 // Combined confidence score (with negation penalty applied)
 const rawConfidence = (wordMatchRatio * VELOCITY_CONFIG.BLANK_SHEET.CONFIDENCE_WORD_WEIGHT) + (phraseMatchRatio * VELOCITY_CONFIG.BLANK_SHEET.CONFIDENCE_PHRASE_WEIGHT);
 const confidence = Math.max(0, rawConfidence - negationPenalty);
 let status: 'identified' | 'missed' | 'uncertain';
 if (confidence >= VELOCITY_CONFIG.BLANK_SHEET.IDENTIFIED_THRESHOLD) {
 status = 'identified';
 } else if (confidence >= VELOCITY_CONFIG.BLANK_SHEET.UNCERTAIN_THRESHOLD) {
 status = 'uncertain';
 } else {
 status = 'missed';
 }
 results.push({
 point,
 status,
 confidence,
 matchedPhrases: [...wordMatches, ...phraseMatches]
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
 onNeedRemediation
}: BlankSheetTestProps) {
 const { isScholarly } = useVisualTheme();
 const [response, setResponse] = useState('');
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [showResults, setShowResults] = useState(false);
 const [result, setResult] = useState<BlankSheetResult | null>(null);
 // Timing state
 const [startTime] = useState(() => Date.now());
 const [firstKeystrokeTime, setFirstKeystrokeTime] = useState<number | null>(null);
 const [lastKeystrokeTime, setLastKeystrokeTime] = useState<number | null>(null);
 const [pauseCount, setPauseCount] = useState(0);
 const { selectedPersona } = usePersonalizationStore();
 const { metaphorsEnabled } = useMetaphorContent(concept);
 const { toggle, isPlaying: isVoicePlaying, isLoading: isVoiceLoading } = useVoice();
 // Real-time metrics - use callback to calculate on demand
 const getMetrics = useCallback((): TypingMetrics => {
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
 pauseCount
 };
 }, [response, startTime, firstKeystrokeTime, pauseCount]);
 // Current metrics snapshot for display (computed from response changes)
 const metrics = useMemo(() => {
 const words = response.trim().split(/\s+/).filter(Boolean);
 return {
 totalTime: 0, // Not real-time, updated on submit
 wordCount: words.length,
 characterCount: response.length,
 wordsPerMinute: 0, // Display WPM requires real-time, deferred to getMetrics
 timeToFirstKeystroke: 0,
 pauseCount
 };
 }, [response, pauseCount]);
 // Character count validation
 const isValid = response.length >= VELOCITY_CONFIG.BLANK_SHEET.MIN_CHARS;
 const charactersRemaining = Math.max(0, VELOCITY_CONFIG.BLANK_SHEET.MIN_CHARS - response.length);
 // Handle input changes
 const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
 const value = e.target.value;
 const now = Date.now();
 // Track first keystroke
 if (!firstKeystrokeTime && value.length > 0) {
 setFirstKeystrokeTime(now);
 }
 // Track pauses (>3 seconds between keystrokes)
 if (lastKeystrokeTime && (now - lastKeystrokeTime) > VELOCITY_CONFIG.BLANK_SHEET.PAUSE_THRESHOLD_MS) {
 setPauseCount(prev => prev + 1);
 }
 setLastKeystrokeTime(now);
 setResponse(value);
 }, [firstKeystrokeTime, lastKeystrokeTime]);
 // Handle submit
 const handleSubmit = useCallback(() => {
 if (!isValid) return;
 setIsSubmitting(true);
 // Get final metrics at submit time
 const finalMetrics = getMetrics();
 // Check if concept has scoring metadata for enhanced scoring
 const conceptScoring = (concept as { scoring?: { keywords?: string[]; aliases?: string[] } }).scoring;
 const hasScoring = conceptScoring?.keywords && conceptScoring.keywords.length > 0;
 let blankSheetResult: BlankSheetResult;
 if (hasScoring) {
 // Use enhanced BlankSheetScorer with keyword matching
 // Type is narrowed by hasScoring check above
 const scorerResult = calculateRecallScore(response, {
 scoring: {
 keywords: conceptScoring!.keywords!,
 aliases: conceptScoring!.aliases || []
 }
 });
 blankSheetResult = {
 responseText: response,
 score: scorerResult.score,
 identifiedPoints: scorerResult.matchedKeywords,
 missedPoints: scorerResult.missedKeywords,
 uncertainPoints: [], // Scorer doesn't have uncertain state
 scoringConfidence: scorerResult.confidence,
 metrics: finalMetrics,
 needsRemediation: scorerResult.score < 60,
 matchedKeywords: scorerResult.matchedKeywords,
 aliasMatches: scorerResult.aliasMatches,
 scoringFeedback: scorerResult.feedback
 };
 } else {
 // Fallback to key-point analysis
 const analysis = analyzeResponse(response, keyPoints);
 blankSheetResult = {
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
 metrics: finalMetrics,
 needsRemediation: analysis.score < 60
 };
 }
 // Generate AI Coach Feedback (single concept mode)
 const scoreAdapter: BlankSheetScore = {
 conceptsRecalled: blankSheetResult.identifiedPoints.length,
 conceptsTotal: hasScoring ? conceptScoring!.keywords!.length : keyPoints.length,
 connectionsRecalled: 0,
 connectionsTotal: 0,
 labelsAccuracy: 0,
 overallScore: blankSheetResult.score,
 strengthAreas: blankSheetResult.identifiedPoints,
 focusAreas: blankSheetResult.missedPoints
 };
 const feedback = generateCoachFeedback(scoreAdapter, selectedPersona);
 blankSheetResult.coachFeedback = feedback;
 // METAPHOR EXIT STRATEGY (Cognitive Science Enhancement)
 // Check if user is relying on metaphor vocabulary instead of technical terms
 const { updateGraduationScore, metaphorGraduation } = usePersonalizationStore.getState();
 const currentGraduation = metaphorGraduation[concept.id] || 0;
 let metaphorPenalty = 0;
 let metaphorFeedback: string | undefined;
 if (metaphorsEnabled && concept.metaphor) {
 const metaphorWords = concept.metaphor.toLowerCase()
 .split(/\s+/)
 .filter(w => w.length > 4) // Only significant words
 .filter(w => !['like', 'think', 'imagine', 'compar'].some(stop => w.includes(stop))); // Exclude common framing words
 const responseLower = response.toLowerCase();
 const usedMetaphorWords = metaphorWords.filter(mw => responseLower.includes(mw));
 // If user used significant metaphor vocabulary
 if (usedMetaphorWords.length > 0) {
 // If they are already "graduated" (>80 score previously), this is a regression
 if (currentGraduation > 80) {
 metaphorPenalty = 10; // Penalize for regression
 metaphorFeedback = isScholarly
 ? `Dependency Detected: You're still relying on the "${concept.metaphor.slice(0, 20)}..." analogy. To graduate, explain this using only technical terms.`
 : ` Dependency Detected: You're still relying on the "${concept.metaphor.slice(0, 20)}..." analogy. To graduate, explain this using only technical terms.`;
 } else if (blankSheetResult.score > 70) {
 // High score but used metaphor -> Warning for next time
 metaphorFeedback = isScholarly
 ? `Next Level: You understand this well. Try explaining it next time without using the metaphor to prove deep technical mastery.`
 : ` Next Level: You understand this well! Try explaining it next time without using the metaphor to prove deep technical mastery.`;
 }
 } else {
 // Clean technical explanation! Boost graduation.
 if (blankSheetResult.score > 70) {
 updateGraduationScore(concept.id, Math.min(100, currentGraduation + 20));
 }
 }
 }
 // Apply penalty if applicable
 if (metaphorPenalty > 0) {
 blankSheetResult.score = Math.max(0, blankSheetResult.score - metaphorPenalty);
 // Append feedback
 if (metaphorFeedback) {
 blankSheetResult.scoringFeedback = (blankSheetResult.scoringFeedback ? blankSheetResult.scoringFeedback + "\n\n" : "") + metaphorFeedback;
 }
 } else if (metaphorFeedback) {
 // Just append the "Next Level" tip without penalty
 blankSheetResult.scoringFeedback = (blankSheetResult.scoringFeedback ? blankSheetResult.scoringFeedback + "\n\n" : "") + metaphorFeedback;
 }
 setResult(blankSheetResult);
 setShowResults(true);
 setIsSubmitting(false);
 }, [response, keyPoints, concept, isValid, getMetrics, selectedPersona]);
 // Handle continue after results
 const handleContinue = useCallback(() => {
 if (result) {
 if (result.needsRemediation && onNeedRemediation) {
 onNeedRemediation(result);
 } else {
 onComplete(result);
 }
 }
 }, [result, onComplete, onNeedRemediation]);
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
 className={styles.coachAudioButton}
 >
 {isVoiceLoading ? <Loader2 size={16} className={styles.spinning} /> :
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
 <Activity size={16} />
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
 {/* METAPHOR GRADUATION BADGE */}
 {result.score >= 80 && !result.scoringFeedback?.includes('Dependency Detected') && (
 <div className={styles.graduationBadge}>
 <Trophy size={16} className={styles.gradIcon} />
 <span>Metaphor Graduated: Technical Mastery Achieved</span>
 </div>
 )}
 {result.needsRemediation ? (
 <button className={`${styles.continueButton} ${styles.remediationButton}`} onClick={handleContinue}>
 Neural Reset Required
 </button>
 ) : (
 <button className={styles.continueButton} onClick={handleContinue}>
 Continue Learning
 </button>
 )}
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
 onKeyDown={(e) => {
 if (e.key === 'Enter' && e.ctrlKey && isValid && !isSubmitting) {
 e.preventDefault();
 handleSubmit();
 }
 }}
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
 </div>
 </div>
 </motion.div>
 );
}
export default BlankSheetTest;

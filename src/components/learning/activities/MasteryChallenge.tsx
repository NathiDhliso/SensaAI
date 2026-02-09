import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Trophy,
    Brain,
    CheckCircle2,
    XCircle,
    ChevronRight,
    Link2,
    FileText,
    Zap,
} from 'lucide-react';
import type { LearningConcept } from '@/shared/types/learning';
import { usePauseGlobalTimer } from '@/shared/hooks/usePauseGlobalTimer';
import styles from './MasteryChallenge.module.css';

interface MasteryChallengeProps {
    concepts: LearningConcept[];
    onComplete: (passed: boolean) => void;
}

type MasteryRound = 'intro' | 'recall' | 'connections' | 'synthesis' | 'results';

interface RecallQuestion {
    conceptName: string;
    question: string;
    correct: string;
    options: string[];
}

interface ConnectionQuestion {
    conceptA: string;
    conceptB: string;
    correctType: string;
    options: string[];
}

function shuffle<T>(arr: T[]): T[] {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

function generateRecallQuestions(concepts: LearningConcept[]): RecallQuestion[] {
    const pool = shuffle(concepts).slice(0, 8);
    const questions: RecallQuestion[] = [];

    for (const concept of pool) {
        const otherConcepts = concepts.filter(c => c.id !== concept.id);
        if (otherConcepts.length < 2) continue;

        if (concept.hookSentence && concept.hookSentence.length > 10) {
            const distractors = shuffle(otherConcepts)
                .slice(0, 3)
                .map(c => c.hookSentence || c.whyYouNeed || `A property of ${c.name}`)
                .filter(d => d && d.length > 5);

            if (distractors.length >= 2) {
                questions.push({
                    conceptName: concept.name,
                    question: `Which statement best describes "${concept.name}"?`,
                    correct: concept.hookSentence,
                    options: shuffle([concept.hookSentence, ...distractors.slice(0, 3)]),
                });
            }
        }

        if (concept.commonPitfalls && concept.commonPitfalls.length > 0) {
            const pitfall = concept.commonPitfalls[0];
            const fakeOptions = shuffle(otherConcepts)
                .slice(0, 3)
                .map(c => {
                    if (c.commonPitfalls && c.commonPitfalls.length > 0) return c.commonPitfalls[0];
                    return c.hookSentence || `Common issue with ${c.name}`;
                });

            if (fakeOptions.length >= 2) {
                questions.push({
                    conceptName: concept.name,
                    question: `Which is a common pitfall when working with "${concept.name}"?`,
                    correct: pitfall,
                    options: shuffle([pitfall, ...fakeOptions.slice(0, 3)]),
                });
            }
        }

        if (concept.howToUse && concept.howToUse.length > 0) {
            const step = concept.howToUse[0];
            const fakeSteps = shuffle(otherConcepts)
                .slice(0, 3)
                .map(c => (c.howToUse && c.howToUse[0]) || `Configure ${c.name} settings`);

            questions.push({
                conceptName: concept.name,
                question: `What is a key step when applying "${concept.name}"?`,
                correct: step,
                options: shuffle([step, ...fakeSteps.slice(0, 3)]),
            });
        }
    }

    return shuffle(questions).slice(0, 6);
}

function generateConnectionQuestions(concepts: LearningConcept[]): ConnectionQuestion[] {
    const questions: ConnectionQuestion[] = [];
    const connectionLabels: Record<string, string> = {
        'requires': 'Requires (depends on)',
        'enables': 'Enables (unlocks)',
        'is-part-of': 'Is part of',
        'is-type-of': 'Is a type of',
        'causes': 'Causes',
        'constrains': 'Constrains (limits)',
    };

    const allTypes = Object.keys(connectionLabels);

    for (const concept of concepts) {
        if (!concept.connections || concept.connections.length === 0) continue;

        for (const conn of concept.connections.slice(0, 2)) {
            const targetConcept = concepts.find(c => c.id === conn.target || c.name === conn.target);
            if (!targetConcept) continue;

            const correctLabel = connectionLabels[conn.type] || conn.type;
            const wrongTypes = shuffle(allTypes.filter(t => t !== conn.type)).slice(0, 3);
            const wrongLabels = wrongTypes.map(t => connectionLabels[t] || t);

            questions.push({
                conceptA: concept.name,
                conceptB: targetConcept.name,
                correctType: correctLabel,
                options: shuffle([correctLabel, ...wrongLabels]),
            });
        }
    }

    return shuffle(questions).slice(0, 5);
}

function scoreSynthesis(response: string, concepts: LearningConcept[]): { score: number; matched: string[]; missed: string[] } {
    const lower = response.toLowerCase();
    const conceptNames = concepts.map(c => c.name.toLowerCase());
    const matched = conceptNames.filter(n => lower.includes(n));
    const missed = conceptNames.filter(n => !lower.includes(n));
    const coverage = conceptNames.length > 0 ? matched.length / conceptNames.length : 0;
    const lengthBonus = Math.min(0.15, response.split(/\s+/).length / 200);
    const score = Math.min(1, coverage * 0.7 + lengthBonus + (response.length > 100 ? 0.15 : 0));
    return { score, matched, missed };
}

export default function MasteryChallenge({ concepts, onComplete }: MasteryChallengeProps) {
    usePauseGlobalTimer();

    const [round, setRound] = useState<MasteryRound>('intro');
    const [recallAnswers, setRecallAnswers] = useState<boolean[]>([]);
    const [currentRecallIndex, setCurrentRecallIndex] = useState(0);
    const [selectedRecallAnswer, setSelectedRecallAnswer] = useState<number | null>(null);
    const [recallFeedback, setRecallFeedback] = useState<'correct' | 'incorrect' | null>(null);

    const [connectionAnswers, setConnectionAnswers] = useState<boolean[]>([]);
    const [currentConnectionIndex, setCurrentConnectionIndex] = useState(0);
    const [selectedConnectionAnswer, setSelectedConnectionAnswer] = useState<number | null>(null);
    const [connectionFeedback, setConnectionFeedback] = useState<'correct' | 'incorrect' | null>(null);

    const [synthesisResponse, setSynthesisResponse] = useState('');

    const recallQuestions = useMemo(() => generateRecallQuestions(concepts), [concepts]);
    const connectionQuestions = useMemo(() => generateConnectionQuestions(concepts), [concepts]);

    const synthesisPrompt = useMemo(() => {
        const names = concepts.slice(0, 5).map(c => c.name);
        return `Explain how ${names.join(', ')}${concepts.length > 5 ? ' and others' : ''} work together. Describe the relationships between them and how you would apply them in a real scenario.`;
    }, [concepts]);

    const handleRecallAnswer = useCallback((optionIndex: number) => {
        if (recallFeedback) return;
        const q = recallQuestions[currentRecallIndex];
        const isCorrect = q.options[optionIndex] === q.correct;
        setSelectedRecallAnswer(optionIndex);
        setRecallFeedback(isCorrect ? 'correct' : 'incorrect');

        setTimeout(() => {
            setRecallAnswers(prev => [...prev, isCorrect]);
            if (currentRecallIndex < recallQuestions.length - 1) {
                setCurrentRecallIndex(prev => prev + 1);
                setSelectedRecallAnswer(null);
                setRecallFeedback(null);
            } else {
                if (connectionQuestions.length > 0) {
                    setRound('connections');
                } else {
                    setRound('synthesis');
                }
            }
        }, 1200);
    }, [recallFeedback, recallQuestions, currentRecallIndex, connectionQuestions.length]);

    const handleConnectionAnswer = useCallback((optionIndex: number) => {
        if (connectionFeedback) return;
        const q = connectionQuestions[currentConnectionIndex];
        const isCorrect = q.options[optionIndex] === q.correctType;
        setSelectedConnectionAnswer(optionIndex);
        setConnectionFeedback(isCorrect ? 'correct' : 'incorrect');

        setTimeout(() => {
            setConnectionAnswers(prev => [...prev, isCorrect]);
            if (currentConnectionIndex < connectionQuestions.length - 1) {
                setCurrentConnectionIndex(prev => prev + 1);
                setSelectedConnectionAnswer(null);
                setConnectionFeedback(null);
            } else {
                setRound('synthesis');
            }
        }, 1200);
    }, [connectionFeedback, connectionQuestions, currentConnectionIndex]);

    const handleSynthesisSubmit = useCallback(() => {
        setRound('results');
    }, []);

    const finalScore = useMemo(() => {
        if (round !== 'results') return null;

        const recallCorrect = recallAnswers.filter(Boolean).length;
        const recallTotal = recallQuestions.length;
        const recallScore = recallTotal > 0 ? recallCorrect / recallTotal : 0;

        const connCorrect = connectionAnswers.filter(Boolean).length;
        const connTotal = connectionQuestions.length;
        const connScore = connTotal > 0 ? connCorrect / connTotal : 0;

        const synthesis = scoreSynthesis(synthesisResponse, concepts);

        const hasConnections = connectionQuestions.length > 0;
        const overall = hasConnections
            ? recallScore * 0.35 + connScore * 0.30 + synthesis.score * 0.35
            : recallScore * 0.50 + synthesis.score * 0.50;

        return {
            recallCorrect,
            recallTotal,
            recallScore: Math.round(recallScore * 100),
            connCorrect,
            connTotal,
            connScore: Math.round(connScore * 100),
            synthesisScore: Math.round(synthesis.score * 100),
            synthesisMatched: synthesis.matched,
            synthesisMissed: synthesis.missed,
            overall: Math.round(overall * 100),
            passed: overall >= 0.40,
        };
    }, [round, recallAnswers, recallQuestions, connectionAnswers, connectionQuestions, synthesisResponse, concepts]);

    const roundLabels = useMemo(() => {
        const labels = ['Recall', 'Connections', 'Synthesis'];
        if (connectionQuestions.length === 0) return ['Recall', 'Synthesis'];
        return labels;
    }, [connectionQuestions.length]);

    const currentRoundIndex = round === 'recall' ? 0
        : round === 'connections' ? 1
        : round === 'synthesis' ? (connectionQuestions.length > 0 ? 2 : 1)
        : -1;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.headerContent}>
                    <div className={styles.headerIcon}>
                        <Trophy size={24} />
                    </div>
                    <div>
                        <h2 className={styles.title}>
                            {round === 'intro' && 'Mastery Challenge'}
                            {round === 'recall' && 'Round 1: Rapid Recall'}
                            {round === 'connections' && 'Round 2: Connection Mapping'}
                            {round === 'synthesis' && `Round ${connectionQuestions.length > 0 ? '3' : '2'}: Synthesis`}
                            {round === 'results' && 'Challenge Complete'}
                        </h2>
                        <p className={styles.subtitle}>
                            {round === 'intro' && `${concepts.length} concepts across ${roundLabels.length} rounds`}
                            {round === 'recall' && `Question ${currentRecallIndex + 1} of ${recallQuestions.length}`}
                            {round === 'connections' && `Question ${currentConnectionIndex + 1} of ${connectionQuestions.length}`}
                            {round === 'synthesis' && 'Demonstrate how concepts work together'}
                            {round === 'results' && `Score: ${finalScore?.overall ?? 0}%`}
                        </p>
                    </div>
                </div>
            </div>

            {round !== 'intro' && round !== 'results' && (
                <div className={styles.roundIndicator}>
                    {roundLabels.map((label, i) => (
                        <div key={label} className={styles.roundStep}>
                            <div className={`${styles.roundDot} ${i < currentRoundIndex ? styles.roundComplete : ''} ${i === currentRoundIndex ? styles.roundActive : ''}`}>
                                {i < currentRoundIndex ? <CheckCircle2 size={14} /> : i + 1}
                            </div>
                            <span className={styles.roundLabel}>{label}</span>
                            {i < roundLabels.length - 1 && <div className={styles.roundLine} />}
                        </div>
                    ))}
                </div>
            )}

            <div className={styles.content}>
                <AnimatePresence mode="wait">
                    {round === 'intro' && (
                        <motion.div
                            key="intro"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className={styles.introContainer}
                        >
                            <div className={styles.infoCard}>
                                <h3>Prove Your Mastery</h3>
                                <div className={styles.roundPreviewList}>
                                    <div className={styles.roundPreview}>
                                        <Zap size={20} />
                                        <div>
                                            <strong>Rapid Recall</strong>
                                            <p>{recallQuestions.length} questions testing your knowledge of individual concepts</p>
                                        </div>
                                    </div>
                                    {connectionQuestions.length > 0 && (
                                        <div className={styles.roundPreview}>
                                            <Link2 size={20} />
                                            <div>
                                                <strong>Connection Mapping</strong>
                                                <p>{connectionQuestions.length} questions on how concepts relate to each other</p>
                                            </div>
                                        </div>
                                    )}
                                    <div className={styles.roundPreview}>
                                        <FileText size={20} />
                                        <div>
                                            <strong>Synthesis</strong>
                                            <p>Explain how concepts work together in a real scenario</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button className={styles.startButton} onClick={() => setRound('recall')}>
                                Begin Challenge
                                <ChevronRight size={20} />
                            </button>
                        </motion.div>
                    )}

                    {round === 'recall' && recallQuestions.length > 0 && (
                        <motion.div
                            key={`recall-${currentRecallIndex}`}
                            initial={{ opacity: 0, x: 30 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -30 }}
                            className={styles.questionContainer}
                        >
                            <div className={styles.questionBadge}>
                                <Brain size={14} />
                                {recallQuestions[currentRecallIndex].conceptName}
                            </div>
                            <p className={styles.questionText}>
                                {recallQuestions[currentRecallIndex].question}
                            </p>
                            <div className={styles.optionsList}>
                                {recallQuestions[currentRecallIndex].options.map((option, idx) => {
                                    const correctIdx = recallQuestions[currentRecallIndex].options.indexOf(recallQuestions[currentRecallIndex].correct);
                                    let cls = styles.optionButton;
                                    if (recallFeedback) {
                                        if (idx === correctIdx) cls += ` ${styles.correct}`;
                                        else if (idx === selectedRecallAnswer) cls += ` ${styles.incorrect}`;
                                        else cls += ` ${styles.disabled}`;
                                    } else if (selectedRecallAnswer === idx) {
                                        cls += ` ${styles.selected}`;
                                    }

                                    return (
                                        <button
                                            key={idx}
                                            className={cls}
                                            onClick={() => handleRecallAnswer(idx)}
                                            disabled={!!recallFeedback}
                                        >
                                            <span className={styles.optionLetter}>{String.fromCharCode(65 + idx)}</span>
                                            <span className={styles.optionText}>{option}</span>
                                            {recallFeedback && idx === correctIdx && <CheckCircle2 size={16} className={styles.resultIcon} />}
                                            {recallFeedback && idx === selectedRecallAnswer && idx !== correctIdx && <XCircle size={16} className={styles.resultIcon} />}
                                        </button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}

                    {round === 'connections' && connectionQuestions.length > 0 && (
                        <motion.div
                            key={`conn-${currentConnectionIndex}`}
                            initial={{ opacity: 0, x: 30 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -30 }}
                            className={styles.questionContainer}
                        >
                            <div className={styles.connectionHeader}>
                                <span className={styles.connectionConcept}>{connectionQuestions[currentConnectionIndex].conceptA}</span>
                                <Link2 size={18} className={styles.connectionArrow} />
                                <span className={styles.connectionConcept}>{connectionQuestions[currentConnectionIndex].conceptB}</span>
                            </div>
                            <p className={styles.questionText}>
                                What is the relationship between these concepts?
                            </p>
                            <div className={styles.optionsList}>
                                {connectionQuestions[currentConnectionIndex].options.map((option, idx) => {
                                    const correctIdx = connectionQuestions[currentConnectionIndex].options.indexOf(connectionQuestions[currentConnectionIndex].correctType);
                                    let cls = styles.optionButton;
                                    if (connectionFeedback) {
                                        if (idx === correctIdx) cls += ` ${styles.correct}`;
                                        else if (idx === selectedConnectionAnswer) cls += ` ${styles.incorrect}`;
                                        else cls += ` ${styles.disabled}`;
                                    } else if (selectedConnectionAnswer === idx) {
                                        cls += ` ${styles.selected}`;
                                    }

                                    return (
                                        <button
                                            key={idx}
                                            className={cls}
                                            onClick={() => handleConnectionAnswer(idx)}
                                            disabled={!!connectionFeedback}
                                        >
                                            <span className={styles.optionLetter}>{String.fromCharCode(65 + idx)}</span>
                                            <span className={styles.optionText}>{option}</span>
                                            {connectionFeedback && idx === correctIdx && <CheckCircle2 size={16} className={styles.resultIcon} />}
                                            {connectionFeedback && idx === selectedConnectionAnswer && idx !== correctIdx && <XCircle size={16} className={styles.resultIcon} />}
                                        </button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}

                    {round === 'synthesis' && (
                        <motion.div
                            key="synthesis"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className={styles.challengeContainer}
                        >
                            <div className={styles.scenarioCard}>
                                <p>{synthesisPrompt}</p>
                            </div>

                            <textarea
                                className={styles.textarea}
                                value={synthesisResponse}
                                onChange={(e) => setSynthesisResponse(e.target.value)}
                                placeholder="Reference specific concepts by name. Explain how they connect and what steps to take..."
                            />

                            <div className={styles.synthesisFooter}>
                                <span className={styles.wordCount}>
                                    {synthesisResponse.split(/\s+/).filter(Boolean).length} words
                                </span>
                                <button
                                    className={styles.submitButton}
                                    onClick={handleSynthesisSubmit}
                                    disabled={synthesisResponse.split(/\s+/).filter(Boolean).length < 20}
                                >
                                    <CheckCircle2 size={16} />
                                    Submit
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {round === 'results' && finalScore && (
                        <motion.div
                            key="results"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className={styles.completeContainer}
                        >
                            <div className={`${styles.celebrationCard} ${finalScore.passed ? '' : styles.celebrationFailed}`}>
                                <Trophy size={48} className={styles.celebrationIcon} />
                                <h2>{finalScore.passed ? (finalScore.overall >= 70 ? 'Outstanding!' : 'Well Done!') : 'Keep Practicing'}</h2>
                                <p className={styles.overallScore}>{finalScore.overall}%</p>
                            </div>

                            <div className={styles.scoreBreakdown}>
                                <div className={styles.scoreRow}>
                                    <span><Zap size={16} /> Rapid Recall</span>
                                    <span className={styles.scoreValue}>{finalScore.recallCorrect}/{finalScore.recallTotal} ({finalScore.recallScore}%)</span>
                                </div>
                                {finalScore.connTotal > 0 && (
                                    <div className={styles.scoreRow}>
                                        <span><Link2 size={16} /> Connections</span>
                                        <span className={styles.scoreValue}>{finalScore.connCorrect}/{finalScore.connTotal} ({finalScore.connScore}%)</span>
                                    </div>
                                )}
                                <div className={styles.scoreRow}>
                                    <span><FileText size={16} /> Synthesis</span>
                                    <span className={styles.scoreValue}>{finalScore.synthesisScore}%</span>
                                </div>
                                <div className={`${styles.scoreRow} ${styles.finalScore}`}>
                                    <span>Overall</span>
                                    <span className={styles.scoreValue}>{finalScore.overall}%</span>
                                </div>
                            </div>

                            {finalScore.synthesisMatched.length > 0 && (
                                <div className={styles.responseCard}>
                                    <h3>Concepts Referenced</h3>
                                    <div className={styles.responseContent}>
                                        <p>{finalScore.synthesisMatched.join(', ')}</p>
                                    </div>
                                </div>
                            )}

                            {finalScore.synthesisMissed.length > 0 && (
                                <div className={styles.responseCard}>
                                    <h3>Concepts Missed</h3>
                                    <div className={styles.responseContent}>
                                        <p>{finalScore.synthesisMissed.join(', ')}</p>
                                    </div>
                                </div>
                            )}

                            <button className={styles.startButton} onClick={() => onComplete(finalScore.passed)}>
                                {finalScore.passed ? 'Complete Mastery' : 'Continue'}
                                <Trophy size={20} />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

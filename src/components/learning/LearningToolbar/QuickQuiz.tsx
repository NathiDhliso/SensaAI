import { useState, useMemo } from 'react';
import { X, CheckCircle, XCircle, ChevronRight } from 'lucide-react';
import { useLearningStore } from '@/store/learning-store';
import styles from './LearningToolbar.module.css';

interface QuickQuizProps {
    isOpen: boolean;
    onClose: () => void;
    conceptId?: string;
}

interface QuizQuestion {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
}

export function QuickQuiz({ isOpen, onClose, conceptId }: QuickQuizProps) {
    const { getConcepts, currentSession } = useLearningStore();
    const concepts = getConcepts();

    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [showFeedback, setShowFeedback] = useState(false);
    const [answers, setAnswers] = useState<('correct' | 'incorrect')[]>([]);

    const targetConcept = conceptId 
        ? concepts.find(c => c.id === conceptId)
        : concepts.find(c => c.id === currentSession?.progress?.currentConceptId);

    const questions: QuizQuestion[] = useMemo(() => {
        if (!targetConcept) return [];

        const qs: QuizQuestion[] = [];

        qs.push({
            question: `What is the main purpose of ${targetConcept.name}?`,
            options: [
                targetConcept.whyYouNeed.slice(0, 80) + '...',
                'To manage user authentication only',
                'For logging and debugging purposes',
                'To handle network requests exclusively',
            ],
            correctIndex: 0,
            explanation: targetConcept.whyYouNeed,
        });

        if (targetConcept.lifecycle) {
            qs.push({
                question: `What is the first step in the ${targetConcept.lifecycle.phase1.title} phase?`,
                options: [
                    targetConcept.lifecycle.phase1.steps[0] || 'Initialize',
                    'Deploy to production',
                    'Write documentation',
                    'Run tests',
                ],
                correctIndex: 0,
                explanation: `The first step is: ${targetConcept.lifecycle.phase1.steps[0]}`,
            });
        }

        qs.push({
            question: `Which metaphor best describes ${targetConcept.name}?`,
            options: [
                targetConcept.metaphor,
                'A simple calculator',
                'A traffic light system',
                'A filing cabinet',
            ],
            correctIndex: 0,
            explanation: `${targetConcept.name} is like ${targetConcept.metaphor}`,
        });

        return qs.slice(0, 3);
    }, [targetConcept]);

    const handleSelectOption = (index: number) => {
        if (showFeedback) return;

        setSelectedOption(index);
        setShowFeedback(true);

        const isCorrect = index === questions[currentIndex].correctIndex;
        setAnswers(prev => [...prev, isCorrect ? 'correct' : 'incorrect']);
    };

    const handleNext = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setSelectedOption(null);
            setShowFeedback(false);
        } else {
            onClose();
        }
    };

    if (!isOpen) return null;

    const currentQuestion = questions[currentIndex];
    const isCorrect = selectedOption === currentQuestion?.correctIndex;
    const isComplete = currentIndex >= questions.length - 1 && showFeedback;
    const correctCount = answers.filter(a => a === 'correct').length;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h2 className={styles.modalTitle}>
                        🧠 Quick Check
                    </h2>
                    <button className={styles.closeButton} onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.modalContent}>
                    {!targetConcept || questions.length === 0 ? (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyStateIcon}>📝</div>
                            <p className={styles.emptyStateText}>
                                No concept selected for quiz. Start learning first!
                            </p>
                        </div>
                    ) : (
                        <div className={styles.quizContainer}>
                            <div className={styles.quizProgress}>
                                <span className={styles.quizProgressText}>
                                    Question {currentIndex + 1} of {questions.length}
                                </span>
                                <div className={styles.quizProgressDots}>
                                    {questions.map((_, idx) => (
                                        <div
                                            key={idx}
                                            className={`${styles.quizProgressDot} ${
                                                answers[idx] === 'correct' ? styles.correct :
                                                answers[idx] === 'incorrect' ? styles.incorrect :
                                                idx === currentIndex ? styles.current : ''
                                            }`}
                                        />
                                    ))}
                                </div>
                            </div>

                            <p className={styles.quizQuestion}>{currentQuestion.question}</p>

                            <div className={styles.quizOptions}>
                                {currentQuestion.options.map((option, idx) => {
                                    const letters = ['A', 'B', 'C', 'D'];
                                    let optionClass = styles.quizOption;
                                    
                                    if (showFeedback) {
                                        optionClass += ` ${styles.disabled}`;
                                        if (idx === currentQuestion.correctIndex) {
                                            optionClass += ` ${styles.correct}`;
                                        } else if (idx === selectedOption) {
                                            optionClass += ` ${styles.incorrect}`;
                                        }
                                    } else if (idx === selectedOption) {
                                        optionClass += ` ${styles.selected}`;
                                    }

                                    return (
                                        <button
                                            key={idx}
                                            className={optionClass}
                                            onClick={() => handleSelectOption(idx)}
                                            disabled={showFeedback}
                                        >
                                            <span className={styles.quizOptionLetter}>{letters[idx]}</span>
                                            <span className={styles.quizOptionText}>{option}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {showFeedback && (
                                <div className={`${styles.quizFeedback} ${isCorrect ? styles.correct : styles.incorrect}`}>
                                    {isCorrect ? (
                                        <CheckCircle size={20} className={styles.quizFeedbackIcon} />
                                    ) : (
                                        <XCircle size={20} className={styles.quizFeedbackIcon} />
                                    )}
                                    <p className={styles.quizFeedbackText}>
                                        {isCorrect 
                                            ? "Correct! " + currentQuestion.explanation
                                            : "Not quite. " + currentQuestion.explanation
                                        }
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className={styles.modalFooter}>
                    {isComplete ? (
                        <>
                            <span style={{ marginRight: 'auto', color: 'var(--color-text-medium)' }}>
                                Score: {correctCount}/{questions.length}
                            </span>
                            <button className={styles.primaryButton} onClick={onClose}>
                                Done
                            </button>
                        </>
                    ) : (
                        <>
                            <button className={styles.secondaryButton} onClick={onClose}>
                                Skip
                            </button>
                            {showFeedback && (
                                <button className={styles.primaryButton} onClick={handleNext}>
                                    {currentIndex < questions.length - 1 ? (
                                        <>Next <ChevronRight size={16} /></>
                                    ) : (
                                        'Finish'
                                    )}
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

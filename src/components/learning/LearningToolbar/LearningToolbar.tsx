/**
 * LearningToolbar Component
 * 
 * Toolbar with learning utilities: Focus Timer, Progress Analytics, Quiz.
 * When a focus session is active, the timer button is hidden since
 * UnifiedSessionBar handles session display.
 */

import { useState } from 'react';
import { Timer, BarChart3, Brain, Flame, FileText, RotateCcw } from 'lucide-react';
import { useLearningStore } from '@/store/learning-store';
import { FocusTimer } from './FocusTimer';
import { ProgressAnalytics } from './ProgressAnalytics';
import { QuickQuiz } from './QuickQuiz';
import styles from './LearningToolbar.module.css';

export function LearningToolbar() {
    const { currentSession, isSessionActive, resetProgress } = useLearningStore();
    const progress = currentSession?.progress;

    const [showTimer, setShowTimer] = useState(false);
    const [showAnalytics, setShowAnalytics] = useState(false);
    const [showQuiz, setShowQuiz] = useState(false);
    const [showSource, setShowSource] = useState(false);
    const [showResetConfirm, setShowResetConfirm] = useState(false);

    const handleResetConfirm = () => {
        resetProgress();
        setShowResetConfirm(false);
    };

    return (
        <>
            <div className={styles.toolbar}>
                {progress && progress.conceptsLearnedToday > 0 && (
                    <div className={styles.streakBadge}>
                        <Flame size={14} />
                        {progress.conceptsLearnedToday} today
                    </div>
                )}

                {/* Only show divider and timer button when session is NOT active */}
                {!isSessionActive && (
                    <>
                        {progress && progress.conceptsLearnedToday > 0 && (
                            <div className={styles.toolbarDivider} />
                        )}

                        <button
                            className={styles.toolbarButton}
                            onClick={() => setShowTimer(true)}
                            title="Start Focus Session"
                        >
                            <Timer size={14} />
                            Focus
                        </button>
                    </>
                )}

                <button
                    className={`${styles.toolbarButton} ${styles.statsButton}`}
                    onClick={() => setShowAnalytics(true)}
                    title="Progress Analytics"
                >
                    <BarChart3 size={14} />
                    Stats
                    {progress && progress.completedConcepts.length > 0 && (
                        <span className={styles.statsBadge}>
                            {progress.completedConcepts.length}
                        </span>
                    )}
                </button>

                <button
                    className={styles.toolbarButton}
                    onClick={() => setShowQuiz(true)}
                    title="Quick Quiz"
                >
                    <Brain size={14} />
                    Quiz
                </button>

                {/* View Source button - shows original generated document */}
                <button
                    className={styles.toolbarButton}
                    onClick={() => setShowSource(true)}
                    title="View Source Document"
                >
                    <FileText size={14} />
                    Source
                </button>

                {/* Reset Progress button - only show if there's progress */}
                {progress && progress.completedConcepts.length > 0 && (
                    <button
                        className={`${styles.toolbarButton} ${styles.resetButton}`}
                        onClick={() => setShowResetConfirm(true)}
                        title="Reset Learning Progress"
                    >
                        <RotateCcw size={14} />
                        Reset
                    </button>
                )}
            </div>

            <FocusTimer
                isOpen={showTimer}
                onClose={() => setShowTimer(false)}
            />
            <ProgressAnalytics
                isOpen={showAnalytics}
                onClose={() => setShowAnalytics(false)}
            />
            <QuickQuiz
                isOpen={showQuiz}
                onClose={() => setShowQuiz(false)}
            />

            {/* Source Document Modal */}
            {showSource && (
                <div className={styles.sourceOverlay} onClick={() => setShowSource(false)}>
                    <div className={styles.sourceModal} onClick={e => e.stopPropagation()}>
                        <div className={styles.sourceHeader}>
                            <h3>Source Document</h3>
                            <button 
                                className={styles.sourceCloseButton} 
                                onClick={() => setShowSource(false)}
                            >
                                ×
                            </button>
                        </div>
                        <div className={styles.sourceContent}>
                            {currentSession?.metadata ? (
                                <div className={styles.sourceInfo}>
                                    <p><strong>Domain:</strong> {currentSession.metadata.domain}</p>
                                    <p><strong>Role:</strong> {currentSession.metadata.role}</p>
                                    <p><strong>Concepts:</strong> {currentSession.metadata.conceptCount}</p>
                                    <p className={styles.sourceHint}>
                                        The full document can be found in your Saved Results.
                                    </p>
                                </div>
                            ) : (
                                <p>No source document available.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Reset Confirmation Modal */}
            {showResetConfirm && (
                <div className={styles.sourceOverlay} onClick={() => setShowResetConfirm(false)}>
                    <div className={styles.resetModal} onClick={e => e.stopPropagation()}>
                        <div className={styles.resetIcon}>
                            <RotateCcw size={32} />
                        </div>
                        <h3>Reset Learning Progress?</h3>
                        <p>
                            This will reset your progress for the current document. 
                            All completed concepts will be unmarked.
                        </p>
                        <div className={styles.resetActions}>
                            <button 
                                className={styles.resetCancelButton}
                                onClick={() => setShowResetConfirm(false)}
                            >
                                Cancel
                            </button>
                            <button 
                                className={styles.resetConfirmButton}
                                onClick={handleResetConfirm}
                            >
                                Reset Progress
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

import { useState } from 'react';
import { Lightbulb, Rocket, CheckCircle, ArrowRight } from 'lucide-react';
import type { LearningConcept } from '@/shared/types/learning';
import styles from './CreativeTransferActivity.module.css';

interface CreativeTransferActivityProps {
    concept: LearningConcept;
    onComplete: (success: boolean) => void;
}

const SCENARIOS = [
    "Design a solution for a startup that needs to scale 10x in a month.",
    "Explain how you would apply this if you had zero budget.",
    "How would this concept change if used in a high-security banking environment?",
    "Apply this concept to optimize a coffee shop's workflow.",
    "What if you had to explain this to a 5-year-old? Write the script."
];

export function CreativeTransferActivity({ concept, onComplete }: CreativeTransferActivityProps) {
    const [scenario] = useState(() => SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)]);
    const [response, setResponse] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <Rocket size={24} className={styles.icon} />
                <div>
                    <h3 className={styles.title}>Creative Transfer</h3>
                    <p className={styles.subtitle}>Apply "{concept.name}" in a new context</p>
                </div>
            </div>

            <div className={styles.challengeCard}>
                <div className={styles.challengeLabel}>
                    <Lightbulb size={16} /> Design Challenge
                </div>
                <p className={styles.scenarioText}>
                    {scenario} <br />
                    <strong>How does {concept.name} fit here?</strong>
                </p>
            </div>

            {!isSubmitted ? (
                <div className={styles.inputSection}>
                    <textarea
                        className={styles.textarea}
                        value={response}
                        onChange={(e) => setResponse(e.target.value)}
                        placeholder="Describe your approach..."
                        rows={6}
                    />
                    <button
                        className={styles.submitButton}
                        disabled={response.length < 50}
                        onClick={() => setIsSubmitted(true)}
                    >
                        Submit Solution
                    </button>
                    {response.length > 0 && response.length < 50 && (
                        <span className={styles.hint}>Keep going... ({50 - response.length} more chars)</span>
                    )}
                </div>
            ) : (
                <div className={styles.successSection}>
                    <div className={styles.successIcon}>
                        <CheckCircle size={48} />
                    </div>
                    <h4>Mastery Demonstrated!</h4>
                    <p>You've successfully applied the concept to a novel situation. This confirms deep understanding.</p>
                    <button
                        className={styles.continueButton}
                        onClick={() => onComplete(true)}
                    >
                        Complete Session <ArrowRight size={16} />
                    </button>
                </div>
            )}
        </div>
    );
}

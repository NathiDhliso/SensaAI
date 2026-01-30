import { useState } from 'react';
import { MessageCircle, Send, User } from 'lucide-react';
import type { LearningConcept } from '@/shared/types/learning';
import { MOCK_PEERS, type SimulatedPeer } from '@/features/social/types';
import styles from './PeerReviewActivity.module.css';

interface PeerReviewActivityProps {
    concept: LearningConcept;
    onComplete: (success: boolean) => void;
}

export function PeerReviewActivity({ concept, onComplete }: PeerReviewActivityProps) {
    const [selectedPeer] = useState<SimulatedPeer>(() => MOCK_PEERS[Math.floor(Math.random() * MOCK_PEERS.length)]);
    const [response, setResponse] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [feedback, setFeedback] = useState<string | null>(null);

    // Simulate a peer statement that might have a misconception
    const peerStatement = `I think ${concept.name} is basically just like ${concept.metaphor || 'a magic box'}, right? It doesn't really matter how it works internally as long as we get the result.`;

    const handleSubmit = () => {
        setIsSubmitted(true);
        // specific logic to analyze response could go here
        // For now, simple length check
        if (response.length > 20) {
            setFeedback(`Thanks for the clarification! That makes more sense now. I see why the details matter.`);
            setTimeout(() => onComplete(true), 2000);
        } else {
            setFeedback("I'm not sure I follow... can you explain a bit more?");
            setTimeout(() => setIsSubmitted(false), 2000);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <MessageCircle size={24} />
                <h3>Peer Discussion</h3>
            </div>

            <div className={styles.chatArea}>
                <div className={styles.peerMessage}>
                    <div className={styles.avatar}>
                        <User size={20} />
                    </div>
                    <div className={styles.bubble}>
                        <div className={styles.peerName}>{selectedPeer.name} ({selectedPeer.role})</div>
                        <p>{peerStatement}</p>
                    </div>
                </div>

                {isSubmitted && (
                    <div className={`${styles.userMessage} ${styles.response}`}>
                        <p>{response}</p>
                    </div>
                )}

                {feedback && (
                    <div className={styles.peerMessage}>
                        <div className={styles.avatar}>
                            <User size={20} />
                        </div>
                        <div className={styles.bubble}>
                            <div className={styles.peerName}>{selectedPeer.name}</div>
                            <p>{feedback}</p>
                        </div>
                    </div>
                )}
            </div>

            {!isSubmitted && (
                <div className={styles.inputArea}>
                    <textarea
                        value={response}
                        onChange={(e) => setResponse(e.target.value)}
                        placeholder={`Explain to ${selectedPeer.name} why that's not quite right...`}
                        className={styles.textarea}
                    />
                    <button
                        onClick={handleSubmit}
                        disabled={response.length === 0}
                        className={styles.sendButton}
                    >
                        <Send size={18} />
                        Reply
                    </button>
                </div>
            )}
        </div>
    );
}

import { useState, useMemo } from 'react';
import { MessageCircle, Send, User, CheckCircle, XCircle } from 'lucide-react';
import type { LearningConcept } from '@/shared/types/learning';
import { MOCK_PEERS, type SimulatedPeer } from '@/features/social/types';
import styles from './PeerReviewActivity.module.css';

interface PeerReviewActivityProps {
    concept: LearningConcept;
    allConcepts?: LearningConcept[];
    onComplete: (success: boolean) => void;
}

function generateMisconception(concept: LearningConcept, allConcepts?: LearningConcept[]): { statement: string; correctionKeywords: string[] } {
    const pitfalls = concept.commonPitfalls ?? [];
    const keyPoints = concept.keyPoints ?? [];
    const howToUse = concept.howToUse ?? [];

    if (pitfalls.length > 0) {
        const pitfall = pitfalls[Math.floor(Math.random() * pitfalls.length)];
        const keywords = keyPoints.slice(0, 3).flatMap(kp => kp.toLowerCase().split(/\s+/).filter(w => w.length > 4));
        return {
            statement: `I was reading about ${concept.name} and I think ${pitfall.charAt(0).toLowerCase() + pitfall.slice(1)}. That's correct, right?`,
            correctionKeywords: keywords.length > 0 ? keywords : [concept.name.toLowerCase()],
        };
    }

    const sameTier = allConcepts?.filter(c => c.id !== concept.id && c.tier === concept.tier) ?? [];
    if (sameTier.length > 0) {
        const confused = sameTier[Math.floor(Math.random() * sameTier.length)];
        const keywords = [
            concept.name.toLowerCase(),
            ...(howToUse.slice(0, 2).flatMap(s => s.toLowerCase().split(/\s+/).filter(w => w.length > 4))),
        ];
        return {
            statement: `I keep mixing up ${concept.name} and ${confused.name}. They're basically the same thing, aren't they? You use them interchangeably.`,
            correctionKeywords: keywords.length > 0 ? keywords : [concept.name.toLowerCase()],
        };
    }

    const keywords = [
        concept.name.toLowerCase(),
        ...(keyPoints.slice(0, 2).flatMap(kp => kp.toLowerCase().split(/\s+/).filter(w => w.length > 4))),
    ];
    return {
        statement: `I think ${concept.name} is only used in very specific edge cases and most people never need to understand it deeply. The details don't really matter.`,
        correctionKeywords: keywords.length > 0 ? keywords : [concept.name.toLowerCase()],
    };
}

function scoreCorrection(response: string, keywords: string[]): { score: number; matched: string[]; missed: string[] } {
    const lower = response.toLowerCase();
    const words = lower.split(/\s+/);
    const matched: string[] = [];
    const missed: string[] = [];

    for (const kw of keywords) {
        if (lower.includes(kw) || words.some(w => w.includes(kw) || kw.includes(w))) {
            matched.push(kw);
        } else {
            missed.push(kw);
        }
    }

    const lengthBonus = Math.min(0.2, response.length / 500);
    const keywordScore = keywords.length > 0 ? matched.length / keywords.length : 0;
    return { score: Math.min(1, keywordScore * 0.8 + lengthBonus), matched, missed };
}

export function PeerReviewActivity({ concept, allConcepts, onComplete }: PeerReviewActivityProps) {
    const [selectedPeer] = useState<SimulatedPeer>(() => MOCK_PEERS[Math.floor(Math.random() * MOCK_PEERS.length)]);
    const [response, setResponse] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [result, setResult] = useState<{ passed: boolean; feedback: string } | null>(null);

    const misconception = useMemo(() => generateMisconception(concept, allConcepts), [concept, allConcepts]);

    const handleSubmit = () => {
        setIsSubmitted(true);
        const { score } = scoreCorrection(response, misconception.correctionKeywords);
        const passed = score >= 0.4;

        if (passed) {
            setResult({
                passed: true,
                feedback: `That makes a lot more sense now! I was definitely confused about that. Thanks for the clear explanation.`,
            });
            setTimeout(() => onComplete(true), 2500);
        } else {
            setResult({
                passed: false,
                feedback: `Hmm, I'm still not sure I understand the difference. Could you be more specific about how ${concept.name} actually works?`,
            });
            setTimeout(() => {
                setIsSubmitted(false);
                setResult(null);
            }, 2500);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <MessageCircle size={24} />
                <h3>Correct the Misconception</h3>
            </div>

            <div className={styles.chatArea}>
                <div className={styles.peerMessage}>
                    <div className={styles.avatar}>
                        <User size={20} />
                    </div>
                    <div className={styles.bubble}>
                        <div className={styles.peerName}>{selectedPeer.name} ({selectedPeer.role})</div>
                        <p>{misconception.statement}</p>
                    </div>
                </div>

                {isSubmitted && (
                    <div className={`${styles.userMessage} ${styles.response}`}>
                        <p>{response}</p>
                    </div>
                )}

                {result && (
                    <div className={styles.peerMessage}>
                        <div className={styles.avatar}>
                            {result.passed ? <CheckCircle size={20} /> : <XCircle size={20} />}
                        </div>
                        <div className={styles.bubble}>
                            <div className={styles.peerName}>{selectedPeer.name}</div>
                            <p>{result.feedback}</p>
                        </div>
                    </div>
                )}
            </div>

            {!isSubmitted && (
                <div className={styles.inputArea}>
                    <textarea
                        value={response}
                        onChange={(e) => setResponse(e.target.value)}
                        placeholder={`Explain why ${selectedPeer.name}'s understanding isn't quite right...`}
                        className={styles.textarea}
                    />
                    <button
                        onClick={handleSubmit}
                        disabled={response.length < 20}
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

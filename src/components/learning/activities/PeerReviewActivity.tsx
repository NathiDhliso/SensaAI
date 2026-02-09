import { useState, useMemo } from 'react';
import { MessageCircle, Send, User, CheckCircle, XCircle, Shield } from 'lucide-react';
import type { LearningConcept } from '@/shared/types/learning';
import { MOCK_PEERS, type SimulatedPeer } from '@/features/social/types';
import styles from './PeerReviewActivity.module.css';

type ConversationStage = 'diagnosis' | 'pushback' | 'defense' | 'resolution';

interface PeerReviewActivityProps {
    concept: LearningConcept;
    allConcepts?: LearningConcept[];
    onComplete: (success: boolean) => void;
}

interface ChatMessage {
    sender: 'peer' | 'user';
    text: string;
    icon?: 'check' | 'x' | 'shield';
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

function pickPushbackChallenge(concept: LearningConcept): string {
    const pitfalls = concept.commonPitfalls ?? [];
    const technicalDetails = concept.technicalDetails ?? '';
    const howToUse = concept.howToUse ?? [];

    if (pitfalls.length > 0) {
        const pitfall = pitfalls[Math.floor(Math.random() * pitfalls.length)];
        return `Okay, but if that's true, then why does this happen: "${pitfall}"?`;
    }

    if (technicalDetails.length > 20) {
        const snippet = technicalDetails.slice(0, 120);
        return `Interesting, but how does that square with this: "${snippet}..."?`;
    }

    if (howToUse.length > 0) {
        const step = howToUse[Math.floor(Math.random() * howToUse.length)];
        return `Sure, but then explain why the process includes: "${step}"?`;
    }

    return `Okay, but can you explain why that distinction actually matters in practice?`;
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

function scoreDefense(response: string, concept: LearningConcept): number {
    const lower = response.toLowerCase();
    const nameParts = concept.name.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const pitfallWords = (concept.commonPitfalls ?? []).flatMap(p => p.toLowerCase().split(/\s+/).filter(w => w.length > 4));
    const allTargets = [...new Set([...nameParts, ...pitfallWords])];

    let hits = 0;
    for (const t of allTargets) {
        if (lower.includes(t)) hits++;
    }

    const coverage = allTargets.length > 0 ? hits / allTargets.length : 0;
    const lengthBonus = Math.min(0.15, response.length / 600);
    return Math.min(1, coverage * 0.85 + lengthBonus);
}

export function PeerReviewActivity({ concept, allConcepts, onComplete }: PeerReviewActivityProps) {
    const [selectedPeer] = useState<SimulatedPeer>(() => MOCK_PEERS[Math.floor(Math.random() * MOCK_PEERS.length)]);
    const [stage, setStage] = useState<ConversationStage>('diagnosis');
    const [inputText, setInputText] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [finalResult, setFinalResult] = useState<{ passed: boolean; feedback: string } | null>(null);
    const [showInput, setShowInput] = useState(true);

    const misconception = useMemo(() => generateMisconception(concept, allConcepts), [concept, allConcepts]);
    const pushbackQuestion = useMemo(() => pickPushbackChallenge(concept), [concept]);

    const stageLabel: Record<ConversationStage, string> = {
        diagnosis: 'Diagnose the error',
        pushback: 'Peer pushes back...',
        defense: 'Defend your reasoning',
        resolution: 'Resolution',
    };

    const handleSubmit = () => {
        if (inputText.length < 20) return;
        const userText = inputText;
        setInputText('');

        if (stage === 'diagnosis') {
            const { score } = scoreCorrection(userText, misconception.correctionKeywords);
            const diagnosisPassed = score >= 0.35;

            setMessages(prev => [
                ...prev,
                { sender: 'user', text: userText },
            ]);

            if (diagnosisPassed) {
                setShowInput(false);
                setTimeout(() => {
                    setMessages(prev => [
                        ...prev,
                        { sender: 'peer', text: pushbackQuestion, icon: 'shield' },
                    ]);
                    setStage('defense');
                    setShowInput(true);
                }, 1200);
            } else {
                setShowInput(false);
                setFinalResult({
                    passed: false,
                    feedback: `Hmm, I'm still not sure I understand. Could you be more specific about how ${concept.name} actually works?`,
                });
                setMessages(prev => [
                    ...prev,
                    { sender: 'peer', text: `Hmm, I'm still not sure I understand. Could you be more specific about how ${concept.name} actually works?`, icon: 'x' },
                ]);
                setStage('resolution');
                setTimeout(() => onComplete(false), 2500);
            }
            return;
        }

        if (stage === 'defense') {
            const defenseScore = scoreDefense(userText, concept);
            const defensePassed = defenseScore >= 0.3;

            setMessages(prev => [
                ...prev,
                { sender: 'user', text: userText },
            ]);
            setShowInput(false);

            const feedback = defensePassed
                ? `That actually makes a lot of sense now. I can see why my original thinking was off. Thanks for walking me through it!`
                : `I appreciate the effort, but I'm still not fully convinced. I think there's more nuance here that we're missing.`;

            setTimeout(() => {
                setFinalResult({ passed: defensePassed, feedback });
                setMessages(prev => [
                    ...prev,
                    { sender: 'peer', text: feedback, icon: defensePassed ? 'check' : 'x' },
                ]);
                setStage('resolution');
                setTimeout(() => onComplete(defensePassed), 2500);
            }, 1000);
            return;
        }
    };

    const getPlaceholder = () => {
        if (stage === 'diagnosis') return `Explain why ${selectedPeer.name}'s understanding isn't quite right...`;
        if (stage === 'defense') return `Defend your position \u2014 why does this still hold?`;
        return '';
    };

    const renderIcon = (icon?: 'check' | 'x' | 'shield') => {
        if (icon === 'check') return <CheckCircle size={20} />;
        if (icon === 'x') return <XCircle size={20} />;
        if (icon === 'shield') return <Shield size={20} />;
        return <User size={20} />;
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <MessageCircle size={24} />
                <h3>The Interrogator</h3>
                <span className={styles.stageBadge}>{stageLabel[stage]}</span>
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

                {messages.map((msg, i) => (
                    msg.sender === 'user' ? (
                        <div key={i} className={`${styles.userMessage} ${styles.response}`}>
                            <p>{msg.text}</p>
                        </div>
                    ) : (
                        <div key={i} className={styles.peerMessage}>
                            <div className={styles.avatar}>
                                {renderIcon(msg.icon)}
                            </div>
                            <div className={styles.bubble}>
                                <div className={styles.peerName}>{selectedPeer.name}</div>
                                <p>{msg.text}</p>
                            </div>
                        </div>
                    )
                ))}
            </div>

            {showInput && !finalResult && (
                <div className={styles.inputArea}>
                    <textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder={getPlaceholder()}
                        className={styles.textarea}
                    />
                    <button
                        onClick={handleSubmit}
                        disabled={inputText.length < 20}
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

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { MessageCircle, Send, User, CheckCircle, XCircle, Shield, Loader2 } from 'lucide-react';
import type { LearningConcept } from '@/shared/types/learning';
interface AIReviewer {
 id: string;
 name: string;
 role: string;
 expertise: 'novice' | 'intermediate' | 'expert';
 personality: 'critical' | 'supportive' | 'curious';
}
const REVIEWER_NAMES = [
 'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey',
 'Riley', 'Quinn', 'Avery', 'Cameron', 'Drew'
];
function generateReviewer(conceptName: string, cognitiveLevel?: string): AIReviewer {
 const hash = conceptName.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
 const name = REVIEWER_NAMES[hash % REVIEWER_NAMES.length];
 const expertiseByLevel: Record<string, AIReviewer['expertise']> = {
 'remember': 'novice', 'understand': 'novice',
 'apply': 'intermediate', 'analyze': 'intermediate',
 'evaluate': 'expert', 'create': 'expert'
 };
 const expertise = cognitiveLevel ? (expertiseByLevel[cognitiveLevel] ?? 'intermediate') : 'intermediate';
 const personalities: AIReviewer['personality'][] = ['critical', 'supportive', 'curious'];
 const personality = personalities[hash % personalities.length];
 const rolesByExpertise: Record<AIReviewer['expertise'], string[]> = {
 novice: ['Student', 'Trainee', 'Apprentice'],
 intermediate: ['Practitioner', 'Analyst', 'Specialist'],
 expert: ['Senior Specialist', 'Lead', 'Consultant']
 };
 const roles = rolesByExpertise[expertise];
 const role = roles[hash % roles.length];
 return { id: `reviewer-${hash}`, name, role, expertise, personality };
}
import { useMetaphorContent } from '@/shared/hooks/useMetaphorContent';
import {
 generateAIPushback,
 scoreWithAI
} from '@/features/learning-session/activities/gym-ai-service';
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
 const baseKeywords = [
 ...keyPoints.slice(0, 3).flatMap(kp => kp.toLowerCase().split(/\s+/).filter(w => w.length > 4)),
 ...(concept.shape?.simpleCore?.toLowerCase().split(/\s+/).filter(w => w.length > 4) ?? [])
 ];
 const keywords = baseKeywords.length > 0 ? [...new Set(baseKeywords)] : [concept.name.toLowerCase()];
 if (pitfalls.length > 0) {
 const pitfall = pitfalls[Math.floor(Math.random() * pitfalls.length)];
 return {
 statement: `I was reading about ${concept.name} and I think ${pitfall.charAt(0).toLowerCase() + pitfall.slice(1)}. That's correct, right?`,
 correctionKeywords: keywords
 };
 }
 const requires = concept.connections?.filter(c => c.type === 'requires') ?? [];
 if (requires.length > 0) {
 const dep = requires[Math.floor(Math.random() * requires.length)];
 return {
 statement: `I'm pretty sure you can learn ${concept.name} without knowing ${dep.target} first. The dependency is just a suggestion, right?`,
 correctionKeywords: [...keywords, dep.target.toLowerCase()]
 };
 }
 const sameTier = allConcepts?.filter(c => c.id !== concept.id && c.tier === concept.tier) ?? [];
 if (sameTier.length > 0) {
 const confused = sameTier[Math.floor(Math.random() * sameTier.length)];
 const extra = howToUse.slice(0, 2).flatMap(s => s.toLowerCase().split(/\s+/).filter(w => w.length > 4));
 return {
 statement: `I keep mixing up ${concept.name} and ${confused.name}. They're basically the same thing, aren't they? You use them interchangeably.`,
 correctionKeywords: [...new Set([concept.name.toLowerCase(), ...extra, ...keywords])]
 };
 }
 return {
 statement: `I think ${concept.name} is only used in very specific edge cases and most people never need to understand it deeply. The details don't really matter.`,
 correctionKeywords: keywords
 };
}
function pickPushbackChallenge(concept: LearningConcept): string {
 const pitfalls = concept.commonPitfalls ?? [];
 const technicalDetails = concept.technicalDetails ?? '';
 const howToUse = concept.howToUse ?? [];
 const challenges: string[] = [];
 if (concept.shape?.highStakesExample) {
 challenges.push(`Okay, but consider this real scenario: "${concept.shape.highStakesExample.slice(0, 150)}". How does your explanation hold up?`);
 }
 if (pitfalls.length > 0) {
 const pitfall = pitfalls[Math.floor(Math.random() * pitfalls.length)];
 challenges.push(`Okay, but if that's true, then why does this happen: "${pitfall}"?`);
 }
 if (concept.lifecycle?.phase3?.steps && concept.lifecycle.phase3.steps.length > 0) {
 const validation = concept.lifecycle.phase3.steps[0];
 challenges.push(`Then how would you verify that using: "${validation}"?`);
 }
 if (technicalDetails.length > 20) {
 const snippet = technicalDetails.slice(0, 120);
 challenges.push(`Interesting, but how does that square with this: "${snippet}..."?`);
 }
 if (howToUse.length > 0) {
 const step = howToUse[Math.floor(Math.random() * howToUse.length)];
 challenges.push(`Sure, but then explain why the process includes: "${step}"?`);
 }
 if (challenges.length === 0) {
 return `Okay, but can you explain why that distinction actually matters in practice?`;
 }
 return challenges[Math.floor(Math.random() * challenges.length)];
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
 const [selectedPeer] = useState<AIReviewer>(() => generateReviewer(concept.name, concept.cognitiveLevel));
 const { analogicalModel } = useMetaphorContent(concept);
 const [stage, setStage] = useState<ConversationStage>('diagnosis');
 const [inputText, setInputText] = useState('');
 const [messages, setMessages] = useState<ChatMessage[]>([]);
 const [finalResult, setFinalResult] = useState<{ passed: boolean; feedback: string } | null>(null);
 const [showInput, setShowInput] = useState(true);
 const [aiLoading, setAiLoading] = useState(false);
 const chatEndRef = useRef<HTMLDivElement>(null);
 const fallbackMisconception = useMemo(() => generateMisconception(concept, allConcepts), [concept, allConcepts]);
 const fallbackPushback = useMemo(() => pickPushbackChallenge(concept), [concept]);
 const misconception = fallbackMisconception;

 useEffect(() => {
 chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
 }, [messages, aiLoading]);

 const stageLabel: Record<ConversationStage, string> = {
 diagnosis: 'Diagnose the error',
 pushback: 'Peer pushes back...',
 defense: 'Defend your reasoning',
 resolution: 'Resolution'
 };
 const handleDiagnosisSubmit = useCallback(async (userText: string) => {
 setMessages(prev => [...prev, { sender: 'user', text: userText }]);
 setShowInput(false);
 setAiLoading(true);
 const aiScore = await scoreWithAI(concept, userText, 'peer-review', misconception.statement);
 const fallbackScore = scoreCorrection(userText, misconception.correctionKeywords);
 const score = aiScore ? aiScore.score : fallbackScore.score;
 const diagnosisPassed = score >= 0.35;
 setAiLoading(false);
 if (diagnosisPassed) {
 setStage('pushback');
 setAiLoading(true);
 const aiPush = await generateAIPushback(concept, userText);
 setAiLoading(false);
 const pushText = aiPush?.challenge || fallbackPushback;
 setTimeout(() => {
 setMessages(prev => [...prev, { sender: 'peer', text: pushText, icon: 'shield' }]);
 setStage('defense');
 setShowInput(true);
 }, 800);
 } else {
 const failFeedback = aiScore?.feedback
 || `Hmm, I'm still not sure I understand. Could you be more specific about how ${concept.name} actually works?`;
 setMessages(prev => [...prev, { sender: 'peer', text: failFeedback, icon: 'x' }]);
 setStage('resolution');
 setFinalResult({ passed: false, feedback: failFeedback });
 setTimeout(() => onComplete(false), 2500);
 }
 }, [concept, misconception.statement, misconception.correctionKeywords, fallbackPushback, onComplete]);

 const handleDefenseSubmit = useCallback(async (userText: string) => {
 setMessages(prev => [...prev, { sender: 'user', text: userText }]);
 setShowInput(false);
 setAiLoading(true);
 const pushbackQuestion = messages.find(m => m.sender === 'peer' && m.icon === 'shield')?.text;
 const aiScore = await scoreWithAI(concept, userText, 'defense', pushbackQuestion);
 const fallbackDefense = scoreDefense(userText, concept);
 const score = aiScore ? aiScore.score : fallbackDefense;
 const defensePassed = score >= 0.3;
 setAiLoading(false);
 const feedback = aiScore?.feedback
 || (defensePassed
 ? `That actually makes a lot of sense now. I can see why my original thinking was off. Thanks for walking me through it!`
 : `I appreciate the effort, but I'm still not fully convinced. I think there's more nuance here that we're missing.`);
 setTimeout(() => {
 setMessages(prev => [...prev, { sender: 'peer', text: feedback, icon: defensePassed ? 'check' : 'x' }]);
 setFinalResult({ passed: defensePassed, feedback });
 setStage('resolution');
 setTimeout(() => onComplete(defensePassed), 2500);
 }, 800);
 }, [concept, messages, onComplete]);

 const handleSubmit = () => {
 if (inputText.length < 20) return;
 const userText = inputText;
 setInputText('');
 if (stage === 'diagnosis') {
 handleDiagnosisSubmit(userText);
 return;
 }
 if (stage === 'defense') {
 handleDefenseSubmit(userText);
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
 {analogicalModel && analogicalModel.trim().length > 0 && (
 <p className={styles.analogyContext}>{analogicalModel}</p>
 )}
 </div>
 </div>
 {messages.map((msg, i) => (
 msg.sender === 'user' ? (
 <div key={i} className={styles.userMessage}>
 <div className={styles.bubble}>
 <p>{msg.text}</p>
 </div>
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
 <div ref={chatEndRef} />
 </div>
 {aiLoading && (
 <div className={styles.thinkingRow}>
 <Loader2 size={16} className={styles.spinner} />
 <span>Thinking...</span>
 </div>
 )}
 {finalResult && stage === 'resolution' && (
 <div className={finalResult.passed ? styles.resultSuccess : styles.resultFail}>
 {finalResult.passed ? <CheckCircle size={16} /> : <XCircle size={16} />}
 <span>{finalResult.passed ? 'Well reasoned.' : 'Not quite there.'}</span>
 </div>
 )}
 {showInput && !finalResult && !aiLoading && (
 <div className={styles.inputArea}>
 <textarea
 value={inputText}
 onChange={(e) => setInputText(e.target.value)}
 onKeyDown={(e) => {
 if (e.key === 'Enter' && !e.shiftKey) {
 e.preventDefault();
 if (inputText.length >= 20) handleSubmit();
 }
 }}
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

import { useState, useMemo } from 'react';
import { Lightbulb, Rocket, CheckCircle, ArrowRight, XCircle } from 'lucide-react';
import type { LearningConcept } from '@/shared/types/learning';
import type { SubjectType } from '@/shared/types/macro-workflow';
import { useMetaphorContent } from '@/shared/hooks/useMetaphorContent';
import styles from './CreativeTransferActivity.module.css';
interface CreativeTransferActivityProps {
 concept: LearningConcept;
 subjectType?: SubjectType;
 onComplete: (success: boolean) => void;
}
const TYPE_SCENARIOS: Record<SubjectType, string[]> = {
 procedural: [
 'A colleague skipped two stages and went straight to the output. Walk them through the correct sequence using {name} and explain what breaks if stages are skipped.',
 'You need to train a new team member on {name}. Write the step-by-step procedure they should follow, including checkpoints.',
 'The system failed at the {name} stage. Describe your troubleshooting process and what you would verify at each step.'
 ],
 conceptual: [
 'A client presents a problem you have never seen before. Explain how you would apply {name} as one of your "moves" to analyze the situation.',
 'Two experts disagree about when to use {name}. Write the argument for each side, then state which context each is correct in.',
 'You are teaching {name} to someone from a completely different field. Create an analogy from their domain that captures the core principle.'
 ],
 cyclic: [
 'You have completed one full cycle involving {name}. Describe what you learned in this iteration and what you would change in the next cycle.',
 'A stakeholder wants to skip the {name} phase of the cycle to save time. Explain the consequences of breaking the loop.',
 'Document a "cycle log" for {name}: what was your input, what happened, what insight emerged, and what changes for next time.'
 ],
 perceptual: [
 'You are mentoring a novice who cannot yet see the pattern that {name} represents. Describe what they should look for and how to train their eye.',
 'Two cases look identical on the surface but {name} reveals a critical difference. Describe both cases and the distinguishing signal.',
 'Create a progressive drill sequence for {name}: start with an obvious example, then make each subsequent one harder to detect.'
 ]
};
const FALLBACK_SCENARIOS = [
 'Explain how {name} would apply in a context you have never encountered before. Be specific about which aspects transfer and which do not.',
 'A decision-maker asks "Why does {name} matter?" Give a 60-second elevator pitch with a concrete example.'
];
function generateScenario(concept: LearningConcept, subjectType?: SubjectType): string {
 const scenarios = subjectType ? TYPE_SCENARIOS[subjectType] : FALLBACK_SCENARIOS;
 const template = scenarios[Math.floor(Math.random() * scenarios.length)];
 return template.replace(/\{name\}/g, concept.name);
}
function scoreTransferResponse(response: string, concept: LearningConcept): { score: number; passed: boolean } {
 const lower = response.toLowerCase();
 const targets: string[] = [
 concept.name.toLowerCase(),
 ...(concept.keyPoints ?? []).slice(0, 3).flatMap(kp => kp.toLowerCase().split(/\s+/).filter(w => w.length > 4)),
 ...(concept.howToUse ?? []).slice(0, 2).flatMap(s => s.toLowerCase().split(/\s+/).filter(w => w.length > 4))
 ];
 const unique = [...new Set(targets)];
 const matched = unique.filter(t => lower.includes(t));
 const keywordScore = unique.length > 0 ? matched.length / unique.length : 0;
 const lengthScore = Math.min(0.3, response.length / 400);
 const total = Math.min(1, keywordScore * 0.7 + lengthScore);
 return { score: total, passed: total >= 0.35 };
}
export function CreativeTransferActivity({ concept, subjectType, onComplete }: CreativeTransferActivityProps) {
 const scenario = useMemo(() => generateScenario(concept, subjectType), [concept, subjectType]);
 const { analogicalModel } = useMetaphorContent(concept);
 const [response, setResponse] = useState('');
 const [result, setResult] = useState<{ passed: boolean; score: number } | null>(null);
 const handleSubmit = () => {
 const r = scoreTransferResponse(response, concept);
 setResult(r);
 if (r.passed) {
 setTimeout(() => onComplete(true), 2000);
 } else {
 setTimeout(() => setResult(null), 3000);
 }
 };
 return (
 <div className={styles.container}>
 <div className={styles.header}>
 <Rocket size={24} className={styles.icon} />
 <div>
 <h3 className={styles.title}>Transfer Challenge</h3>
 <p className={styles.subtitle}>Apply "{concept.name}" in a new context</p>
 </div>
 </div>
 <div className={styles.challengeCard}>
 <div className={styles.challengeLabel}>
 <Lightbulb size={16} /> Scenario
 </div>
 <p className={styles.scenarioText}>{scenario}</p>
 {analogicalModel && (
 <p className={styles.analogyHint}>{analogicalModel}</p>
 )}
 </div>
 {!result ? (
 <div className={styles.inputSection}>
 <textarea
 className={styles.textarea}
 value={response}
 onChange={(e) => setResponse(e.target.value)}
 onKeyDown={(e) => {
 if (e.key === 'Enter' && !e.shiftKey) {
 e.preventDefault();
 if (response.length >= 40) handleSubmit();
 }
 }}
 placeholder="Use specific terms and steps from what you learned..."
 rows={6}
 />
 <button
 className={styles.submitButton}
 disabled={response.length < 40}
 onClick={handleSubmit}
 >
 Submit
 </button>
 {response.length > 0 && response.length < 40 && (
 <span className={styles.hint}>{40 - response.length} more characters needed</span>
 )}
 </div>
 ) : result.passed ? (
 <div className={styles.successSection}>
 <div className={styles.successIcon}>
 <CheckCircle size={48} />
 </div>
 <h4>Strong Transfer</h4>
 <p>You applied the concept with relevant detail. Score: {Math.round(result.score * 100)}%</p>
 <button className={styles.continueButton} onClick={() => onComplete(true)}>
 Continue <ArrowRight size={16} />
 </button>
 </div>
 ) : (
 <div className={styles.successSection}>
 <div className={styles.successIcon} style={{ color: 'var(--color-warning)' }}>
 <XCircle size={48} />
 </div>
 <h4>Try Again</h4>
 <p>Use specific terminology from {concept.name}. Mention the actual steps or principles.</p>
 </div>
 )}
 </div>
 );
}

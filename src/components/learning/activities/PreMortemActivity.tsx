import { useState, useMemo, useEffect } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import type { LearningConcept } from '@/shared/types/learning';
import { generateAIBrokenConfig } from '@/features/learning-session/activities/gym-ai-service';
import { UI_TIMINGS } from '@/shared/constants/ui-constants';
import styles from './PreMortemActivity.module.css';

interface PreMortemActivityProps {
 concept: LearningConcept;
 onComplete: (success: boolean) => void;
}

interface BrokenConfig {
 steps: string[];
 alteredIndex: number;
 originalStep: string;
 alteredStep: string;
 explanation: string;
}

function buildBrokenConfig(concept: LearningConcept): BrokenConfig {
 const howToUse = concept.howToUse ?? [];
 const lifecycle = concept.lifecycle;
 const phase3 = lifecycle?.phase3;

 let sourceSteps: string[] = [];

 if (howToUse.length >= 3) {
 sourceSteps = [...howToUse];
 } else if (lifecycle) {
 const p1 = lifecycle.phase1?.steps ?? [];
 const p2 = lifecycle.phase2?.steps ?? [];
 const p3 = lifecycle.phase3?.steps ?? [];
 sourceSteps = [...p1, ...p2, ...p3].filter(s => s.length > 5);
 }

 if (sourceSteps.length < 3) {
 sourceSteps = [
 `Identify the core principle behind ${concept.name}`,
 `Apply ${concept.name} to a specific scenario`,
 `Verify the outcome meets the expected criteria`,
 `Reflect on edge cases or exceptions`
 ];
 }

 const alteredIndex = Math.floor(Math.random() * sourceSteps.length);
 const originalStep = sourceSteps[alteredIndex];

 const mutations = [
 `[REMOVED]`,
 `Skip this step entirely`,
 `Do the opposite: undo ${originalStep.slice(0, 40).toLowerCase()}`
 ];
 const alteredStep = mutations[Math.floor(Math.random() * mutations.length)];

 const metrics = phase3?.steps ?? [];
 const metricsHint = metrics.length > 0
 ? ` The validation metric "${metrics[0]}" would catch this failure.`
 : '';

 const explanation = `Without "${originalStep}", the process breaks because this step ensures correctness at stage ${alteredIndex + 1}.${metricsHint}`;

 const displaySteps = sourceSteps.map((s, i) => i === alteredIndex ? alteredStep : s);

 return {
 steps: displaySteps,
 alteredIndex,
 originalStep,
 alteredStep,
 explanation
 };
}

export default function PreMortemActivity({ concept, onComplete }: PreMortemActivityProps) {
 const fallbackConfig = useMemo(() => buildBrokenConfig(concept), [concept]);
 const [config, setConfig] = useState<BrokenConfig>(fallbackConfig);
 const [configLoading, setConfigLoading] = useState(true);
 const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
 const [resolved, setResolved] = useState(false);

 useEffect(() => {
 let cancelled = false;
 generateAIBrokenConfig(concept).then(result => {
 if (cancelled) return;
 if (result) {
 setConfig(result);
 }
 setConfigLoading(false);
 });
 return () => { cancelled = true; };
 }, [concept]);

 const handleSelect = (index: number) => {
 if (resolved) return;
 setSelectedIndex(index);
 setResolved(true);

 const correct = index === config.alteredIndex;
 setTimeout(() => onComplete(correct), UI_TIMINGS.ACTIVITY_RESULT_CLEAR);
 };

 const isCorrect = selectedIndex === config.alteredIndex;

 if (configLoading) {
 return (
 <div className={styles.container}>
 <div className={styles.header}>
 <AlertTriangle size={24} />
 <h3>Pre-Mortem: Find the Failure</h3>
 </div>
 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '3rem', color: 'var(--color-text-muted)' }}>
 <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
 <span>Generating scenario...</span>
 </div>
 </div>
 );
 }

 return (
 <div className={styles.container}>
 <div className={styles.header}>
 <AlertTriangle size={24} />
 <h3>Pre-Mortem: Find the Failure</h3>
 </div>

 <div className={styles.scenario}>
 <div className={styles.scenarioTitle}>System Configuration: {concept.name}</div>
 <ol className={styles.stepList}>
 {config.steps.map((step, i) => {
 let stepClass = styles.step;
 if (resolved && i === config.alteredIndex) {
 stepClass = `${styles.step} ${styles.correctHighlight}`;
 }
 if (step.startsWith('[REMOVED]') || step.startsWith('Skip') || step.startsWith('Do the opposite')) {
 stepClass = `${styles.step} ${styles.alteredStep}`;
 }
 return (
 <li key={i} className={stepClass}>
 <span className={styles.stepNumber}>{i + 1}</span>
 <span>{step}</span>
 </li>
 );
 })}
 </ol>
 </div>

 <p className={styles.prompt}>This process will fail. At which step?</p>

 <div className={styles.options}>
 {config.steps.map((step, i) => {
 let btnClass = styles.optionButton;
 if (resolved && selectedIndex === i) {
 btnClass += ` ${isCorrect ? styles.selectedCorrect : styles.selectedWrong}`;
 }
 if (resolved && i === config.alteredIndex && selectedIndex !== i) {
 btnClass += ` ${styles.correctHighlight}`;
 }

 return (
 <button
 key={i}
 className={btnClass}
 onClick={() => handleSelect(i)}
 disabled={resolved}
 >
 <span className={styles.stepNumber}>{i + 1}</span>
 <span>Step {i + 1}: {step.length > 60 ? step.slice(0, 57) + '...' : step}</span>
 </button>
 );
 })}
 </div>

 {resolved && (
 <div className={`${styles.feedback} ${isCorrect ? styles.feedbackSuccess : styles.feedbackFail}`}>
 <div className={styles.feedbackTitle}>
 {isCorrect ? <CheckCircle size={18} /> : <XCircle size={18} />}
 {isCorrect ? 'Correct!' : `Not quite \u2014 it was Step ${config.alteredIndex + 1}`}
 </div>
 <div className={styles.feedbackBody}>
 <p><strong>Original step:</strong> {config.originalStep}</p>
 <p>{config.explanation}</p>
 </div>
 </div>
 )}
 </div>
 );
}

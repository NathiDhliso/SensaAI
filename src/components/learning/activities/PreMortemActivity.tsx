import { useState, useMemo } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react';
import type { LearningConcept } from '@/shared/types/learning';
import styles from './PreMortemActivity.module.css';

interface PreMortemActivityProps {
 concept: LearningConcept;
 onComplete: (success: boolean) => void;
}

interface FailureScenario {
 narrative: string;
 steps: string[];
 sabotageIndex: number;
 sabotageReason: string;
 consequence: string;
 insufficientData: boolean;
}

const SABOTAGE_TEMPLATES = [
 (step: string) => `Skips: ${step}`,
 (step: string) => `Reverses: ${step}`,
 (step: string) => `Applies ${step} to the wrong target`,
 (step: string) => `Performs ${step} out of order`,
];

function buildFailureScenario(concept: LearningConcept): FailureScenario {
 const howToUse = (concept.howToUse ?? []).filter(s => s.length > 10);
 const p2 = (concept.lifecycle?.phase2?.steps ?? []).filter(s => s.length > 10);
 const p1 = (concept.lifecycle?.phase1?.steps ?? []).filter(s => s.length > 10);
 const p3 = (concept.lifecycle?.phase3?.steps ?? []).filter(s => s.length > 10);

 let sourceSteps: string[] = [];
 if (howToUse.length >= 3) {
 sourceSteps = howToUse.slice(0, 5);
 } else {
 sourceSteps = [...p1, ...p2, ...p3].slice(0, 5);
 }

 if (sourceSteps.length < 3) {
 return {
  narrative: '',
  steps: [],
  sabotageIndex: -1,
  sabotageReason: '',
  consequence: '',
  insufficientData: true,
 };
 }

 const sabotageIndex = Math.floor(Math.random() * sourceSteps.length);
 const originalStep = sourceSteps[sabotageIndex];
 const template = SABOTAGE_TEMPLATES[Math.floor(Math.random() * SABOTAGE_TEMPLATES.length)];
 const sabotageDescription = template(originalStep.toLowerCase().replace(/^(prerequisite:|tool:|metrics:|thresholds:)/i, '').trim());

 const displaySteps = sourceSteps.map((s, i) =>
 i === sabotageIndex ? sabotageDescription : s
 );

 const pitfall = concept.commonPitfalls?.[0];
 const consequence = pitfall
 ? `This triggers the classic pitfall: "${pitfall}"`
 : `The process produces an incorrect or incomplete result at stage ${sabotageIndex + 1}.`;

 const highStakes = concept.shape?.highStakesExample;
 const narrative = highStakes
 ? `A team is configuring ${concept.name}. ${highStakes.split('.')[0]}. Review their process below — one step has been corrupted.`
 : `A team is deploying ${concept.name} in a production environment. Their process has one critical error. Find it before the system fails.`;

 return {
 narrative,
 steps: displaySteps,
 sabotageIndex,
 sabotageReason: originalStep,
 consequence,
 insufficientData: false,
 };
}

export default function PreMortemActivity({ concept, onComplete }: PreMortemActivityProps) {
 const scenario = useMemo(() => buildFailureScenario(concept), [concept]);
 const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
 const [resolved, setResolved] = useState(false);

 const handleSelect = (index: number) => {
 if (resolved) return;
 setSelectedIndex(index);
 setResolved(true);
 const correct = index === scenario.sabotageIndex;
 setTimeout(() => onComplete(correct), 3500);
 };

 const isCorrect = selectedIndex === scenario.sabotageIndex;

 if (scenario.insufficientData) {
 return (
  <div className={styles.container}>
   <div className={styles.header}>
    <AlertTriangle size={20} />
    <h3>Pre-Mortem: Find the Failure</h3>
   </div>
   <div className={styles.insufficientNotice}>
    <Info size={16} />
    <div>
     <p><strong>Not enough step data for this concept.</strong></p>
     <p>This activity requires at least 3 lifecycle steps to build a failure scenario. Try regenerating the content for "{concept.name}" to add richer step data.</p>
    </div>
   </div>
   <button className={styles.stepCard} onClick={() => onComplete(false)} style={{ marginTop: '0.5rem', maxWidth: 200 }}>
    Skip Activity
   </button>
  </div>
 );
 }

 return (
 <div className={styles.container}>
 <div className={styles.header}>
 <AlertTriangle size={20} />
 <h3>Pre-Mortem: Find the Failure</h3>
 </div>

 <div className={styles.narrative}>
 {scenario.narrative}
 </div>

 <div className={styles.stepGrid}>
 {scenario.steps.map((step, i) => {
 const isSabotaged = i === scenario.sabotageIndex;
 const isSelected = selectedIndex === i;
 let cls = styles.stepCard;
 if (resolved && isSabotaged) cls += ` ${styles.stepCardFailure}`;
 else if (resolved && isSelected && !isSabotaged) cls += ` ${styles.stepCardWrong}`;
 return (
 <button
 key={i}
 className={cls}
 onClick={() => handleSelect(i)}
 disabled={resolved}
 >
 <span className={styles.stepBadge}>{i + 1}</span>
 <span className={styles.stepText}>{step}</span>
 </button>
 );
 })}
 </div>

 {!resolved && (
 <p className={styles.prompt}>
 <AlertTriangle size={14} /> Which step will cause the failure?
 </p>
 )}

 {resolved && (
 <div className={`${styles.feedback} ${isCorrect ? styles.feedbackCorrect : styles.feedbackWrong}`}>
 <div className={styles.feedbackHeader}>
 {isCorrect ? <CheckCircle size={18} /> : <XCircle size={18} />}
 <strong>
 {isCorrect
 ? `Correct — Step ${scenario.sabotageIndex + 1} is the failure point`
 : `Step ${scenario.sabotageIndex + 1} was the failure — not Step ${selectedIndex! + 1}`
 }
 </strong>
 </div>
 <p className={styles.feedbackOriginal}>
 <span className={styles.feedbackLabel}>What it should have been:</span>
 {scenario.sabotageReason}
 </p>
 <p className={styles.feedbackConsequence}>{scenario.consequence}</p>
 </div>
 )}
 </div>
 );
}

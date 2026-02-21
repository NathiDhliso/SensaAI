import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getRandomTerm, getDomainName } from '@/shared/utils/subject-domain-detector';
import { GENERATION_NARRATIVE } from '@/shared/constants/tree-narrative';
import type { SubjectType } from '@/shared/types/generation';
import styles from '@/pages/ContentGenerator.module.css';
const TYPE_LABELS: Record<SubjectType, string> = {
  procedural: 'PROCEDURAL MASTERY',
  conceptual: 'CONCEPTUAL FLUENCY',
  cyclic: 'ADAPTIVE INTEGRATION',
  perceptual: 'EMBODIED JUDGMENT'
};
interface CognitiveStreamProps {
  pass: number;
  intensity: number;
  isGenerating: boolean;
  isInitializing?: boolean;
  subject?: string;
  subjectType?: SubjectType | null;
}
export const CognitiveStream: React.FC<CognitiveStreamProps> = ({ pass, intensity, isGenerating, isInitializing, subject, subjectType }) => {
  const [thought, setThought] = useState('');
  useEffect(() => {
    if (!isGenerating) {
      setThought(isInitializing ? "CONNECTING :: PREPARING_GENERATION" : "SYSTEM_READY :: WAITING_FOR_INPUT");
      return;
    }
    const getThoughts = () => {
      const subjectName = subject || 'content';
      const domainName = getDomainName(subjectName);
      const typeLabel = subjectType ? TYPE_LABELS[subjectType] : null;
      const nodes = getRandomTerm(subjectName, 'nodes');
      const concepts = getRandomTerm(subjectName, 'concepts');
      const structures = getRandomTerm(subjectName, 'structures');
      const processes = getRandomTerm(subjectName, 'processes');
      const classificationThoughts = [
        `CLASSIFYING LEARNING TARGET...`,
        `ANALYZING ${subjectName.toUpperCase()} STRUCTURE TYPE...`,
        `DETECTING ${domainName.toUpperCase()} PEDAGOGY PATTERN...`,
        `EVALUATING: PROCEDURAL vs CONCEPTUAL vs CYCLIC vs PERCEPTUAL...`,
        `SCANNING ${nodes.toUpperCase()} FOR MACRO STRUCTURE...`,
        `ISOLATING CORE ${concepts.toUpperCase()}...`,
        `CROSS-REFERENCING ${structures.toUpperCase()}...`,
        "EXTRACTING DOMAIN ARCHITECTURE...",
        ...GENERATION_NARRATIVE.pass1
      ];
      if (typeLabel) {
        classificationThoughts.push(
          `TYPE LOCKED :: ${typeLabel}`,
          `APPLYING ${typeLabel} FRAMEWORK...`,
          `MAPPING ${typeLabel} MACRO STRUCTURE...`,
        );
      }
      const typeAwarePass2 = typeLabel
        ? [
          `${typeLabel} :: MAPPING ${structures.toUpperCase()}...`,
          `${typeLabel} :: TRACING ${processes.toUpperCase()}...`,
          `GENERATING TYPE-ADAPTED ${concepts.toUpperCase()}...`,
          `CONNECTING ${nodes.toUpperCase()} VIA ${typeLabel}...`,
          `IDENTIFYING ${domainName.toUpperCase()} DEPENDENCIES...`,
          "WEAVING CONTEXTUAL RELATIONSHIPS...",
          `CALCULATING ${concepts.toUpperCase()} ENTROPY...`,
          "OPTIMIZING KNOWLEDGE PATHWAYS...",
          ...GENERATION_NARRATIVE.pass2
        ]
        : [
          `MAPPING ${subjectName.toUpperCase()} ${structures.toUpperCase()}...`,
          `TRACING ${processes.toUpperCase()}...`,
          `VALIDATING ${concepts.toUpperCase()}...`,
          `CONNECTING ${nodes.toUpperCase()}...`,
          `IDENTIFYING ${domainName.toUpperCase()} DEPENDENCIES...`,
          "WEAVING CONTEXTUAL RELATIONSHIPS...",
          `CALCULATING ${concepts.toUpperCase()} ENTROPY...`,
          "OPTIMIZING KNOWLEDGE PATHWAYS...",
          ...GENERATION_NARRATIVE.pass2
        ];
      const thoughtsWithContext = {
        pass1: classificationThoughts,
        pass2: typeAwarePass2,
        pass3: [
          `SYNTHESIZING ${concepts.toUpperCase()}...`,
          `STRUCTURING ${nodes.toUpperCase()}...`,
          `ORGANIZING ${structures.toUpperCase()}...`,
          "GENERATING RETENTION ANCHORS...",
          `CRYSTALLIZING ${domainName.toUpperCase()} INSIGHTS...`,
          `ENCODING ${processes.toUpperCase()}...`,
          "VALIDATING LEARNING HIERARCHY...",
          "FINALIZING COGNITIVE ARCHITECTURE...",
          ...GENERATION_NARRATIVE.pass3
        ],
        pass4: [
          "RUNNING FINAL DIAGNOSTICS...",
          `VERIFYING ${concepts.toUpperCase()} INTEGRITY...`,
          `CHECKING ${nodes.toUpperCase()} COHERENCE...`,
          `VALIDATING ${structures.toUpperCase()}...`,
          "OPTIMIZING TRANSFER EFFICIENCY...",
          `CALIBRATING ${domainName.toUpperCase()} COMPLEXITY...`,
          "FINALIZING KNOWLEDGE MAP...",
          "PREPARING DELIVERY SEQUENCE...",
          ...GENERATION_NARRATIVE.pass4
        ]
      };
      if (pass === 1) return thoughtsWithContext.pass1;
      if (pass === 2) return thoughtsWithContext.pass2;
      if (pass === 3) return thoughtsWithContext.pass3;
      if (pass === 4) return thoughtsWithContext.pass4;
      return [`PROCESSING ${subjectName.toUpperCase()}...`];
    };
    const thoughts = getThoughts();
    const intervalTime = Math.max(2000, 5000 - (intensity * 30));
    let lastIndex = -1;
    const pickNextThought = () => {
      let nextIndex;
      do {
        nextIndex = Math.floor(Math.random() * thoughts.length);
      } while (nextIndex === lastIndex && thoughts.length > 1);
      lastIndex = nextIndex;
      setThought(thoughts[nextIndex]);
    };
    pickNextThought();
    const intervalId = setInterval(pickNextThought, intervalTime);
    return () => clearInterval(intervalId);
  }, [pass, intensity, isGenerating, isInitializing, subjectType]);
  const BAR_COUNT = 36;
  const isHigh = intensity > 80;
  return (
    <div className={styles.cognitiveStreamContainer}>
      <AnimatePresence mode="wait">
        <motion.div
          key={thought}
          initial={{ opacity: 0, y: 8, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -8, filter: 'blur(8px)' }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className={styles.thoughtText}
        >
          {thought}
        </motion.div>
      </AnimatePresence>
      <div className={styles.streamDecoration}>
        {Array.from({ length: BAR_COUNT }).map((_, i) => (
          <div
            key={i}
            className={`${styles.streamBit} ${isHigh ? styles.streamBitHigh : ''}`}
            style={{
              animationDelay: `${(i * (1.1 / BAR_COUNT)).toFixed(3)}s`,
              animationDuration: `${0.8 + Math.sin(i * 0.4) * 0.3}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

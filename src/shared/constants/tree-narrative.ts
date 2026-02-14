export type TierType = 'trunk' | 'branch' | 'leaf';

export interface NarrativeText {
  label: string;
  description: string;
  scholarly: string;
}

export const TIER_NARRATIVE: Record<TierType, NarrativeText> = {
  trunk: {
    label: 'Trunk',
    description: 'The strong core that holds everything together',
    scholarly: 'Core domain pillar'
  },
  branch: {
    label: 'Branch',
    description: 'Reaching out to connect related ideas',
    scholarly: 'Thematic sub-domain'
  },
  leaf: {
    label: 'Leaf',
    description: 'Where real growth happens — testable detail',
    scholarly: 'Granular concept'
  }
};

export const GENERATION_NARRATIVE = {
  pass1: [
    'PLANTING SEEDS :: ANALYZING SOIL COMPOSITION...',
    'READING THE TERRAIN :: MAPPING ROOT STRUCTURE...',
    'SELECTING TRUNK ARCHITECTURE...',
    'ESTABLISHING ROOT SYSTEM :: DEEP FOUNDATIONS...',
    'IDENTIFYING GROWTH ZONES...',
    'ANALYZING CANOPY POTENTIAL...',
    'SURVEYING KNOWLEDGE TERRAIN...',
    'DETECTING NATURAL BRANCHING PATTERNS...'
  ],
  pass2: [
    'GROWING TRUNK :: CORE STRUCTURE EMERGING...',
    'BRANCHING OUT :: CONNECTING IDEAS...',
    'LEAVES UNFURLING :: DETAIL CRYSTALIZING...',
    'STRENGTHENING BRANCH CONNECTIONS...',
    'WEAVING CANOPY NETWORK...',
    'TRACING NUTRIENT PATHWAYS...',
    'REINFORCING TRUNK INTEGRITY...',
    'EXTENDING BRANCH REACH...'
  ],
  pass3: [
    'CANOPY TAKING SHAPE :: SYNTHESIZING...',
    'PHOTOSYNTHESIS :: CONVERTING IDEAS TO KNOWLEDGE...',
    'PRUNING REDUNDANT BRANCHES...',
    'STRENGTHENING ROOT-TO-LEAF PATHWAYS...',
    'ENCODING GROWTH RINGS :: RETENTION ANCHORS...',
    'BALANCING CANOPY DISTRIBUTION...',
    'HARDENING BARK :: FINALIZING STRUCTURE...',
    'MAPPING ANNUAL GROWTH RINGS...'
  ],
  pass4: [
    'FINAL INSPECTION :: CHECKING TREE HEALTH...',
    'VERIFYING ROOT DEPTH :: FOUNDATION SOLID...',
    'COUNTING GROWTH RINGS :: INTEGRITY CHECK...',
    'TESTING BRANCH LOAD CAPACITY...',
    'CANOPY COVERAGE ANALYSIS...',
    'KNOWLEDGE TREE READY FOR HARVEST...',
    'ECOSYSTEM INTEGRITY VERIFIED...',
    'PREPARING YOUR GROVE...'
  ]
};

export const PHASE_NARRATIVE: Record<string, NarrativeText> = {
  PRIME: {
    label: 'Plant',
    description: 'Set your roots — commit to deep growth',
    scholarly: 'Session initialization'
  },
  SCOUT: {
    label: 'Survey',
    description: 'Survey your tree — see the full canopy',
    scholarly: 'Content overview'
  },
  PREVIEW: {
    label: 'Survey',
    description: 'Map the branches before you climb',
    scholarly: 'Structure familiarization'
  },
  BUILD: {
    label: 'Graft',
    description: 'Connect branches — build your mental map',
    scholarly: 'Concept mapping'
  },
  DIAGNOSE: {
    label: 'Assess',
    description: 'Test the soil — find where to grow',
    scholarly: 'Knowledge assessment'
  },
  LEARN: {
    label: 'Grow',
    description: 'New branches forming — absorb and extend',
    scholarly: 'Active learning'
  },
  MASTER: {
    label: 'Harvest',
    description: 'Reap what you grew — prove mastery',
    scholarly: 'Mastery verification'
  },
  COMPLETE: {
    label: 'Flourish',
    description: 'Your tree stands tall',
    scholarly: 'Session complete'
  }
};

export const SESSION_NARRATIVE = {
  moodFraming: {
    energized: {
      label: 'Full Sunlight',
      description: 'Maximum growth conditions — push hard',
      scholarly: 'High-intensity session'
    },
    neutral: {
      label: 'Steady Growth',
      description: 'Good conditions — grow at natural pace',
      scholarly: 'Standard session'
    },
    tired: {
      label: 'Deep Roots',
      description: 'Nurture what you have — review and strengthen',
      scholarly: 'Review session'
    },
    stressed: {
      label: 'Gentle Shade',
      description: 'Rest under the canopy — browse without pressure',
      scholarly: 'Exploration session'
    }
  },
  goals: {
    'learn-new': {
      label: 'New Growth',
      description: 'Extend your branches into new territory',
      scholarly: 'Acquire new concepts'
    },
    review: {
      label: 'Ring Strengthening',
      description: 'Reinforce existing growth rings',
      scholarly: 'Review existing material'
    },
    velocity: {
      label: 'Rapid Growth',
      description: 'Accelerated branching — grow fast',
      scholarly: 'Intensive learning'
    },
    explore: {
      label: 'Canopy Walk',
      description: 'Wander through the branches freely',
      scholarly: 'Free exploration'
    }
  }
};

export const CELEBRATION_NARRATIVE = {
  conceptMastered: [
    'New leaf unfurled',
    'Branch strengthened',
    'Growth ring added'
  ],
  stageDone: {
    title: 'Branch Complete',
    message: 'A new branch of your knowledge tree is fully grown.',
    scholarly: { title: 'Section Complete', message: 'You have completed this section.' }
  },
  courseDone: {
    title: 'Tree Stands Tall',
    message: 'Your knowledge tree has reached full canopy. Every trunk, branch, and leaf is in place.',
    scholarly: { title: 'Course Complete', message: 'You have completed all sections.' }
  }
};

export function getProgressNarrative(completedCount: number, totalCount: number): NarrativeText {
  const ratio = totalCount > 0 ? completedCount / totalCount : 0;
  if (ratio === 0) {
    return {
      label: 'Seed',
      description: 'Your knowledge tree awaits planting',
      scholarly: 'Not started'
    };
  }
  if (ratio < 0.25) {
    return {
      label: 'Seedling',
      description: 'Roots are taking hold — keep going',
      scholarly: `${Math.round(ratio * 100)}% complete`
    };
  }
  if (ratio < 0.5) {
    return {
      label: 'Sapling',
      description: 'Trunk is forming — branches emerging',
      scholarly: `${Math.round(ratio * 100)}% complete`
    };
  }
  if (ratio < 0.75) {
    return {
      label: 'Young Tree',
      description: 'Canopy spreading — leaves filling in',
      scholarly: `${Math.round(ratio * 100)}% complete`
    };
  }
  if (ratio < 1) {
    return {
      label: 'Maturing',
      description: 'Almost full canopy — final branches growing',
      scholarly: `${Math.round(ratio * 100)}% complete`
    };
  }
  return {
    label: 'Full Canopy',
    description: 'Your knowledge tree stands complete',
    scholarly: '100% complete'
  };
}

export function getTierNarrative(tier: TierType, isScholarly: boolean): string {
  const narrative = TIER_NARRATIVE[tier];
  return isScholarly ? narrative.scholarly : narrative.description;
}

export function getPhaseNarrative(phase: string, isScholarly: boolean): { label: string; description: string } {
  const narrative = PHASE_NARRATIVE[phase] || PHASE_NARRATIVE.LEARN;
  return {
    label: isScholarly ? narrative.scholarly : narrative.label,
    description: isScholarly ? narrative.scholarly : narrative.description
  };
}

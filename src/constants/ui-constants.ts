export const PASS_NAMES = [
  'Domain Analysis',
  'Dependency Mapping',
  'Content Generation',
  'Quality Validation',
] as const;

/**
 * Whimsical loading messages for the Memory Palace generation experience
 * Creates the feeling of an "Augmented Reality Scavenger Hunt" being built
 */
export const GENERATION_MESSAGES = {
  pass1: [
    'Exploring the knowledge landscape...',
    'Mapping the terrain of your topic...',
    'Discovering hidden concept caves...',
  ],
  pass2: [
    'Building bizarre mental bridges...',
    'Connecting the dots with invisible thread...',
    'Weaving a web of dependencies...',
  ],
  pass3: [
    'Synthesizing core concepts...',
    'Establishing key terminology...',
    'Building the knowledge structure...',
    'Defining relationships and hierarchies...',
    'Creating memory anchors...',
  ],
  pass4: [
    'Polishing the learning experience...',
    'Validating structural integrity...',
    'Final quality assurance check...',
  ],
} as const;

export const EXAMPLE_SUBJECTS = [
  'Data Science Fundamentals',
  'Project Management',
  'Financial Analysis',
  'Software Development',
  'Healthcare Administration',
  'Business Strategy',
] as const;

export const MAX_DROPDOWN_OPTIONS = 7;
export const MAX_PRIMARY_ACTIONS = 3;
export const MILLERS_LAW_MAX = 7;
export const MILLERS_LAW_MIN = 3;

export const QUALITY_THRESHOLDS = {
  lifecycleConsistency: 90,
  positiveFraming: 85,
  formatConsistency: 90,
  completeness: 80,
} as const;

/**
 * Centralized UI timing constants
 * Use these instead of magic numbers in setTimeout calls
 */
export const UI_TIMINGS = {
  // Feedback display durations
  TOAST_SHORT: 2000,        // For "Copied!", "Saved!" confirmations
  TOAST_MEDIUM: 3000,       // For confirmation messages
  TOAST_LONG: 5000,         // For error messages, welcome toasts

  // Generic Delays
  DELAY_FAST: 200,
  DELAY_SHORT: 500,
  DELAY_MEDIUM: 1500,

  // Interaction delays
  BLUR_DELAY: 200,          // Delay before closing dropdowns on blur
  DEBOUNCE_DEFAULT: 300,    // Default debounce for inputs

  // Animation/update timings
  MARKER_UPDATE_FAST: 100,  // Quick marker position updates
  MARKER_UPDATE_SLOW: 150,  // Normal marker position updates
  MAP_LOAD_DELAY: 500,      // Delay after map loads

  // Session timings (in milliseconds)
  CHECKPOINT_EXPIRY: 3600000, // 1 hour - session checkpoint expiry

  // Diagnostic timings
  DIAGNOSTIC_QUESTION_TIME: 6000,   // 6 seconds per diagnostic question
  DIAGNOSTIC_FEEDBACK_TIME: 1500,   // 1.5 seconds for correct/incorrect feedback
  DIAGNOSTIC_RESULTS_DELAY: 3000,   // 3 seconds analyzing results animation

  // Sprint/automaticity timings


  // General timeouts
  GENERATION_TIMEOUT: 60000,        // 60 seconds generation timeout
  PANEL_EXIT_DELAY: 300,            // Delay for panel close animations
  ONE_SECOND: 1000,                 // Standard 1s interval
  TOUR_INTERVAL: 8000,              // 8 seconds per tour stop
  NEXT_TICK: 100,                   // Generic next-tick delay for state transitions

  // Drill timings
  CONFUSION_QUESTION_MS: 15000,     // 15 seconds per confusion drill question
  MASTERY_TIME_SECONDS: 600,        // 10 minutes for mastery challenge
} as const;

/**
 * Diagnostic configuration constants
 */
export const DIAGNOSTIC_CONFIG = {
  QUESTION_COUNT: 20,
  SECONDS_PER_QUESTION: 6,
  TOTAL_TIME_SECONDS: 120,  // 2 minutes total
  DISTRIBUTION: {
    beginner: 7,
    intermediate: 7,
    advanced: 6,
  },
} as const;



/**
 * Focus session configuration constants
 * Used for Pomodoro-style focus timers and concept pacing
 */
export const FOCUS_SESSION_CONFIG = {
  DEFAULT_FOCUS_MINUTES: 25,
  DEFAULT_BREAK_MINUTES: 5,
  LONG_BREAK_MINUTES: 15,
  SESSIONS_UNTIL_LONG_BREAK: 4,
  CONCEPT_TARGET_SECONDS: 120,  // 2 minutes optimal reading pace per concept
  PACE_THRESHOLDS: {
    optimal: 0.5,    // Under 50% of target = optimal
    good: 0.85,      // Under 85% = good
    warning: 1.0,    // At target = warning
  },
} as const;

/**
 * Celebration modal configuration
 */
export const CELEBRATION_CONFIG = {
  AUTO_DISMISS_MS: 4000,  // Auto-dismiss celebration after 4 seconds
} as const;

/**
 * Velocity Learning Engine configuration
 * Centralizes all magic numbers for the Velocity feature.
 */
export const VELOCITY_CONFIG = {
  // Loop Duration (MicroLearningLoopController)
  LOOP: {
    BASE_TIME_SECONDS: 60,
    MIN_TIME_SECONDS: 60,
    MAX_TIME_SECONDS: 180,
    TIME_STEP_PER_COMPLEXITY: 120 / 9, // ~13.33s per complexity point
  },

  // Scoring Thresholds (MicroLearningLoopController & VelocityDashboard)
  SCORING: {
    MASTERY_THRESHOLD: 0.7,      // 70% to master
    NEEDS_LEARNING_THRESHOLD: 0.4, // Below 40% needs relearning
    CONFIDENCE_THRESHOLD: 0.6,     // 60% confidence required
    HIGH_COGNITIVE_LOAD: 0.8,    // 80% load triggers break recommendation
    MODERATE_COGNITIVE_LOAD: 0.4, // 40% load is moderate
    TREND_SIGNIFICANCE: 5,        // 5% change is significant
    DEFAULT_VELOCITY_BASELINE: 5, // Baseline for velocity calculations
  },

  // Blank Sheet Test
  BLANK_SHEET: {
    MIN_CHARS: 15,
    MIN_WORD_LENGTH: 3,
    PHRASE_LENGTH_MIN: 2,
    PHRASE_LENGTH_MAX: 3,
    CONFIDENCE_WORD_WEIGHT: 0.6,
    CONFIDENCE_PHRASE_WEIGHT: 0.4,
    IDENTIFIED_THRESHOLD: 0.6,
    UNCERTAIN_THRESHOLD: 0.3,
    PAUSE_THRESHOLD_MS: 3000,
  },

  // Confusion Prevention
  CONFUSION: {
    SIMILARITY_THRESHOLD: 0.6,    // 60% similarity triggers drill
    NAME_WEIGHT: 0.3,
    CATEGORY_WEIGHT: 0.2,
    HOOK_WEIGHT: 0.2,
    USAGE_WEIGHT: 0.3,
    MIN_DIFFERENCE_CHARS: 20,
    MIN_EXAMPLE_CHARS: 10,
  },

  // Guided Primer
  PRIMER: {
    BREATHE_STEP_DURATION_MS: 5000,
    TRANSITION_DELAY_MS: 600,
    AUDIO_DELAY_MS: 300,
  },

  // Diagnostic Launch System
  DIAGNOSTIC: {
    FOUNDATION_CONCEPTS_MIN: 5,
    PASS_THRESHOLD: 0.7,
    CONCEPTS_TO_TEST: 7,
    QUESTIONS_PER_CONCEPT: 2,
    MIN_ANSWER_CHARS: 10,
  }
} as const;

/**
 * Flow State Detection Configuration
 * Used to detect when users are in a productive "flow" state
 * and protect them from interruptions.
 */
export const FLOW_STATE = {
  // Detection thresholds
  MIN_STREAK_FOR_FLOW: 3,           // 3+ concepts without pause
  SPEED_THRESHOLD: 0.8,             // 80% of user's baseline time
  MAX_IDLE_MS: 30_000,              // 30 seconds max between concepts
  ACCURACY_THRESHOLD: 0.7,          // 70% verification accuracy

  // Flow protection
  CHECKPOINT_BUFFER_MS: 15 * 60 * 1000,   // 15 min extension when in flow
  HEALTH_BREAK_THRESHOLD_MS: 90 * 60 * 1000, // 90 min before health nudge

  // UI
  FLOW_INDICATOR_FADE_MS: 3000,     // Flow mode indicator fade duration
} as const;

/**
 * Momentum Checkpoint Configuration
 * Governs when and how to present "natural pauses" to users.
 */
export const MOMENTUM_CHECKPOINT = {
  // Timing
  TIME_TOAST_DELAY_MS: 500,         // Delay before showing time toast
  CHECKPOINT_ANIMATION_MS: 400,     // Checkpoint card animation duration
  RECAP_ANIMATION_MS: 500,          // Session recap animation duration

  // Thresholds
  MIN_CONCEPTS_FOR_RECAP: 1,        // At least 1 concept needed for recap
  STREAK_CELEBRATION_THRESHOLD: 5,  // 5+ concepts for "on fire" celebration

  // Buffer after dismissal
  POST_CONTINUE_BUFFER_MS: 15 * 60 * 1000, // 15 min before next checkpoint offer
} as const;

/**
 * Knowledge Warmth Configuration
 * Manages the "Forgetting Curve" to keep knowledge fresh before lectures.
 */
export const KNOWLEDGE_WARMTH = {
  /** Hot: Last recall within 24 hours */
  HOT_THRESHOLD_HOURS: 24,
  /** Warm: Last recall within 3 days */
  WARM_THRESHOLD_HOURS: 72,
  /** Cool: Last recall within 7 days */
  COOL_THRESHOLD_HOURS: 168,
  /** Cold: Last recall over 7 days ago (triggers Prime Refresh) */
} as const;

export type KnowledgeWarmthLevel = 'hot' | 'warm' | 'cool' | 'cold';


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
    'Dreaming up bizarre scenarios...',
    'Placing anchors in strange places...',
    'Constructing your memory palace...',
    'Scattering surreal objects across the landscape...',
    'Inviting peculiar characters to guard your knowledge...',
  ],
  pass4: [
    'Polishing the surrealist experience...',
    'Making sure the dream holds together...',
    'Final reality check on unreality...',
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
  SPRINT_QUESTION_TIME: 6000,       // 6 seconds per sprint question
  SPRINT_FEEDBACK_TIME: 2000,       // 2 seconds for feedback after answer

  // Learning session timings
  TWO_HOUR_SESSION_MS: 7200000,     // 2 hours in milliseconds
  LEARNING_PHASE_MS: 5400000,       // 90 minutes learning phase
  SPRINT_PHASE_MS: 900000,          // 15 minutes sprint phase

  // General timeouts
  GENERATION_TIMEOUT: 60000,        // 60 seconds generation timeout
  PANEL_EXIT_DELAY: 300,            // Delay for panel close animations
  ONE_SECOND: 1000,                 // Standard 1s interval
  TOUR_INTERVAL: 8000,              // 8 seconds per tour stop
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
 * Sprint configuration constants
 */
export const SPRINT_CONFIG = {
  QUESTION_COUNT: 30,
  SECONDS_PER_QUESTION: 6,
  TOTAL_TIME_MINUTES: 15,
  DISTRIBUTION: {
    core: 10,
    discrimination: 10,
    application: 10,
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

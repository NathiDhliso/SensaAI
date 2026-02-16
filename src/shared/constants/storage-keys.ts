/**
 * Centralized Local Storage Keys
 * Prevents magic strings and ensures consistency across the application.
 */
export const STORAGE_KEYS = {
 AUDIO_PREFERENCES: 'audio-preferences',
 PALACE_GUIDE_SEEN: 'palace-guide-seen',
 PALACE_PREVIEW_SEEN: 'palace-preview-ever-seen',
 LEARNING_STORE: 'sensa-learning',
 SAVED_RESULTS: 'sensa-saved-results',
 // Activity draft autosave keys (used by useActivityAutosave)
 DRAFT_CONCEPT_MAP: 'concept-map',
 DRAFT_BLANK_SHEET: 'blank-sheet',
 DRAFT_MASTERY: 'mastery',
 DRAFT_EXPLORE_GUESSES: 'explore-guesses',
 // SENSA flow equation persistence
 SENSA_EQUATION: 'sensa-equation'
} as const;

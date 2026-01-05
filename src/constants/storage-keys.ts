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
} as const;

/**
 * Application-wide configuration constants
 */

// Google Maps Configuration
export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
export const GOOGLE_MAPS_LIBRARIES: ("places" | "geometry")[] = ['places', 'geometry'];

// Common Types
export interface Coordinates {
    lat: number;
    lng: number;
}

export const CONCEPT_LIMITS = {
    subject: { min: 50, max: 75 },
    // CHANGE THIS: Match the subject limits. Do not throttle the data.
    feature: { min: 40, max: 60 },
    topic: { min: 10, max: 20 }
};

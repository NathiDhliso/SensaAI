/**
 * Generates a deterministic or random alias for subject versioning.
 * Format: 3 letters + 2 digits (e.g., "XLA92")
 */
export const generateAlias = (): string => {
 const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
 const digits = '0123456789';
 let result = '';
 for (let i = 0; i < 3; i++) {
 result += chars.charAt(Math.floor(Math.random() * chars.length));
 }
 for (let i = 0; i < 2; i++) {
 result += digits.charAt(Math.floor(Math.random() * digits.length));
 }
 return result;
};
/**
 * Smart normalization for subject comparison.
 * Applies synonyms and strips non-alphanumeric characters.
 */
export const normalizeSubject = (str: string): string => {
 let s = str.toLowerCase();
 // Common synonyms for cloud/cert exams
 s = s.replace(/azure/g, 'az');
 s = s.replace(/administrator/g, 'admin');
 s = s.replace(/microsoft/g, 'ms');
 s = s.replace(/certification/g, 'cert');
 s = s.replace(/power\s?bi/g, 'powerbi'); // catch "power bi" and "powerbi"
 // Exam code mappings - unify variations like "Azure 104" -> "az104"
 s = s.replace(/az\s*-?\s*104/g, 'az104');
 s = s.replace(/pl\s*-?\s*300/g, 'pl300');
 s = s.replace(/az\s*-?\s*900/g, 'az900');
 s = s.replace(/dp\s*-?\s*900/g, 'dp900');
 // Strip non-alphanumeric
 return s.replace(/[^a-z0-9]/g, '');
};
/**
 * Levenshtein distance for fuzzy matching.
 */
export const levenshtein = (a: string, b: string): number => {
 const matrix: number[][] = [];
 for (let i = 0; i <= b.length; i++) { matrix[i] = [i]; }
 for (let j = 0; j <= a.length; j++) { matrix[0][j] = j; }
 for (let i = 1; i <= b.length; i++) {
 for (let j = 1; j <= a.length; j++) {
 if (b.charAt(i - 1) === a.charAt(j - 1)) {
 matrix[i][j] = matrix[i - 1][j - 1];
 } else {
 matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
 }
 }
 }
 return matrix[b.length][a.length];
};
import type { SavedResult } from '../types';
export interface ImportResult {
 success: boolean;
 result?: SavedResult;
 error?: string;
}
/**
 * Import a saved result from a JSON file
 */
export async function importFromFile(file: File): Promise<ImportResult> {
 return new Promise((resolve) => {
 const reader = new FileReader();
 reader.onload = (e) => {
 try {
 const content = e.target?.result as string;
 const data = JSON.parse(content);
 // Validate required fields
 if (!data.id || !data.subject || !data.fullDocument) {
 resolve({
 success: false,
 error: 'Invalid file format: missing required fields'
 });
 return;
 }
 const result: SavedResult = {
 id: data.id,
 subject: data.subject,
 generatedAt: data.generatedAt || new Date().toISOString(),
 fullDocument: data.fullDocument,
 pass1Data: data.pass1Data,
 validation: data.validation,
 savedLocally: true
 };
 resolve({ success: true, result });
 } catch {
 resolve({
 success: false,
 error: 'Failed to parse file: invalid JSON'
 });
 }
 };
 reader.onerror = () => {
 resolve({
 success: false,
 error: 'Failed to read file'
 });
 };
 reader.readAsText(file);
 });
}
/**
 * Create a hidden file input for importing files
 */
export function createFileInput(onSelect: (file: File) => void): HTMLInputElement {
 const input = document.createElement('input');
 input.type = 'file';
 input.accept = '.json';
 input.style.display = 'none';
 input.onchange = () => {
 const file = input.files?.[0];
 if (file) {
 onSelect(file);
 }
 input.remove();
 };
 document.body.appendChild(input);
 return input;
}
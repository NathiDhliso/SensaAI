import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(__dirname, 'voice-data.json');
const OUTPUT_FILE = path.join(__dirname, '../src/lib/voice/static-lines.ts');

const voiceData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

let fileContent = `// Auto-generated mapping of static text to filenames
export const STATIC_VOICE_LINES: Record<string, string> = {
`;

voiceData.forEach(persona => {
    persona.lines.forEach(line => {
        // Escape single quotes in text
        const cleanText = line.text.replace(/'/g, "\\'");
        fileContent += `    '${cleanText}': '${line.filename}',\n`;
    });
});

fileContent += `};\n`;

fs.writeFileSync(OUTPUT_FILE, fileContent);
console.log(`Generated map at ${OUTPUT_FILE}`);

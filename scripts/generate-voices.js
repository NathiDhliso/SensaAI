import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';
// ES Module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Configuration
const API_KEY = process.argv[2];
const DATA_FILE = path.join(__dirname, 'voice-data.json');
const OUTPUT_DIR = path.join(__dirname, '../public/Audio/voice');
if (!API_KEY) {
 console.error('\x1b[31m%s\x1b[0m', 'Error: Please provide your ElevenLabs API Key as an argument.');
 console.log('Usage: node scripts/generate-voices.js <YOUR_API_KEY>');
 process.exit(1);
}
// 1. Create Output Directory
if (!fs.existsSync(OUTPUT_DIR)) {
 fs.mkdirSync(OUTPUT_DIR, { recursive: true });
 console.log(`Created output directory: ${OUTPUT_DIR}`);
}
// 2. Read Data
const voiceData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
// 3. Helper function to delay (avoid rate limits)
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
// 4. Helper function to download
const downloadVoice = (text, voiceId, filename) => {
 return new Promise((resolve, reject) => {
 const filePath = path.join(OUTPUT_DIR, filename);
 // Skip if exists
 if (fs.existsSync(filePath)) {
 console.log(`\x1b[33m[SKIP]\x1b[0m ${filename} (already exists)`);
 resolve();
 return;
 }
 const data = JSON.stringify({
 text: text,
 model_id: "eleven_monolingual_v1",
 voice_settings: {
 stability: 0.5,
 similarity_boost: 0.75
 }
 });
 const options = {
 hostname: 'api.elevenlabs.io',
 path: `/v1/text-to-speech/${voiceId}`,
 method: 'POST',
 headers: {
 'xi-api-key': API_KEY,
 'Content-Type': 'application/json',
 'Content-Length': data.length
 }
 };
 const req = https.request(options, (res) => {
 if (res.statusCode !== 200) {
 console.error(`\x1b[31m[FAIL]\x1b[0m ${filename} (Status: ${res.statusCode})`);
 // Consume response data to free up memory
 res.resume();
 reject(new Error(`Status Code: ${res.statusCode}`));
 return;
 }
 const fileStream = fs.createWriteStream(filePath);
 res.pipe(fileStream);
 fileStream.on('finish', () => {
 fileStream.close();
 console.log(`\x1b[32m[DONE]\x1b[0m ${filename}`);
 resolve();
 });
 });
 req.on('error', (e) => {
 console.error(`\x1b[31m[ERROR]\x1b[0m ${filename}: ${e.message}`);
 reject(e);
 });
 req.write(data);
 req.end();
 });
};
// 5. Main Execution Loop
const main = async () => {
 console.log('Starting Batch Voice Generation...');
 let successCount = 0;
 let failCount = 0;
 for (const persona of voiceData) {
 console.log(`\nProcessing Persona: \x1b[36m${persona.persona}\x1b[0m`);
 for (const line of persona.lines) {
 try {
 await downloadVoice(line.text, persona.voiceId, line.filename);
 successCount++;
 // Small delay to be nice to the API
 await delay(250);
 } catch (err) {
 console.error(err);
 failCount++;
 }
 }
 }
 console.log('\n-----------------------------------');
 console.log(`Generation Complete!`);
 console.log(`Success: \x1b[32m${successCount}\x1b[0m`);
 console.log(`Failed: \x1b[31m${failCount}\x1b[0m`);
 console.log('-----------------------------------');
};
main();
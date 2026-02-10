import { Router, Request, Response } from 'express';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
const router = Router();
const HAIKU_MODEL_ID = 'us.anthropic.claude-3-5-haiku-20241022-v1:0';
const bedrock = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });
const ACTIONS = new Set([
 'misconception',
 'pushback',
 'score',
 'mastery_scenario',
 'mastery_score',
 'broken_config'
]);
interface ConceptData {
 name: string;
 tier?: string;
 keyPoints?: string[];
 commonPitfalls?: string[];
 howToUse?: string[];
}
async function invokeHaiku(system: string, user: string, maxTokens = 400): Promise<string> {
 const payload = {
 anthropic_version: 'bedrock-2023-05-31',
 max_tokens: maxTokens,
 system,
 messages: [{ role: 'user', content: user }]
 };
 const command = new InvokeModelCommand({
 modelId: HAIKU_MODEL_ID,
 contentType: 'application/json',
 accept: 'application/json',
 body: JSON.stringify(payload)
 });
 const response = await bedrock.send(command);
 const body = JSON.parse(new TextDecoder().decode(response.body));
 if (body.content && Array.isArray(body.content)) {
 return body.content
 .filter((b: { type: string }) => b.type === 'text')
 .map((b: { text: string }) => b.text)
 .join('');
 }
 return '';
}
function extractJson(raw: string): Record<string, unknown> {
 const match = raw.match(/\{[\s\S]*\}/);
 if (!match) {
 throw new Error('No JSON found in response');
 }
 return JSON.parse(match[0]);
}
function compressConcept(c: ConceptData): string {
 const parts = [`Name: ${c.name}`];
 if (c.tier) parts.push(`Tier: ${c.tier}`);
 if (c.keyPoints?.length) parts.push(`Key: ${c.keyPoints.slice(0, 3).join('; ')}`);
 if (c.commonPitfalls?.length) parts.push(`Pitfalls: ${c.commonPitfalls.slice(0, 2).join('; ')}`);
 if (c.howToUse?.length) parts.push(`Steps: ${c.howToUse.slice(0, 3).join('; ')}`);
 return parts.join('\n');
}
async function handleMisconception(data: { concept: ConceptData }): Promise<Record<string, unknown>> {
 const system = 'You generate challenging questions that reveal common misconceptions about learning concepts. Output JSON only.';
 const user = `Concept:\n${compressConcept(data.concept)}\n\nGenerate a challenging question that tests whether the student has a common misconception about this concept. The question should:
- Be phrased as a question (not a statement)
- Target a specific misconception students often have
- Require the student to explain or diagnose something
Return JSON:
{"statement":"The challenging question","correctionHints":["hint1 if they get it wrong","hint2 if they get it wrong"]}
Example for "Network Security Groups":
{"statement":"If you allow inbound traffic on port 443 at the subnet NSG level, but the VM's NIC-level NSG blocks port 443, will HTTPS work? Why or why not?","correctionHints":["Traffic must pass BOTH NSGs","The NIC-level NSG will block it"]}`;
 const raw = await invokeHaiku(system, user, 300);
 const result = extractJson(raw);
 if (!result.statement || !Array.isArray(result.correctionHints)) {
 throw new Error('Invalid AI response');
 }
 return result;
}
async function handlePushback(data: { concept: ConceptData; diagnosis: string }): Promise<Record<string, unknown>> {
 const system = 'You are a skeptical peer reviewer. Output JSON only.';
 const user = `Concept:\n${compressConcept(data.concept)}\n\nStudent's diagnosis: "${data.diagnosis}"\n\nGenerate a follow-up challenge question. Return JSON:
{"challenge":"Your follow-up question challenging their explanation"}`;
 const raw = await invokeHaiku(system, user, 150);
 const result = extractJson(raw);
 if (!result.challenge) {
 throw new Error('Invalid AI response');
 }
 return result;
}
async function handleScore(data: { concept: ConceptData; response: string; stage: string }): Promise<Record<string, unknown>> {
 const system = 'You score student responses for conceptual accuracy. Output JSON only.';
 const user = `Concept:\n${compressConcept(data.concept)}\n\nStage: ${data.stage}\nStudent response: "${data.response}"\n\nScore 0-1 for accuracy. Return JSON:
{"score":0.0,"feedback":"Brief feedback","strengths":["s1"],"gaps":["g1"]}`;
 const raw = await invokeHaiku(system, user, 200);
 const result = extractJson(raw);
 if (typeof result.score !== 'number') {
 throw new Error('Invalid AI response');
 }
 result.score = Math.max(0, Math.min(1, result.score as number));
 return result;
}
async function handleMasteryScenario(data: { concepts: ConceptData[] }): Promise<Record<string, unknown>> {
 const compressed = data.concepts.slice(0, 5).map(compressConcept).join('\n---\n');
 const system = 'You create realistic professional scenarios requiring synthesis of multiple concepts. Output JSON only.';
 const user = `Concepts:\n${compressed}\n\nCreate a scenario requiring all concepts. Return JSON:
{"scenario":"The scenario description","requirements":["req1","req2","req3"],"conceptFocus":["concept1","concept2"]}`;
 const raw = await invokeHaiku(system, user, 350);
 const result = extractJson(raw);
 if (!result.scenario) {
 throw new Error('Invalid AI response');
 }
 return result;
}
async function handleMasteryScore(data: { concepts: ConceptData[]; response: string }): Promise<Record<string, unknown>> {
 const names = data.concepts.slice(0, 5).map(c => c.name).join(', ');
 // Analyze response characteristics
 const wordCount = data.response.trim().split(/\s+/).length;
 const conceptMentions = data.concepts.filter(c => 
 data.response.toLowerCase().includes(c.name.toLowerCase())
 ).length;
 const hasStructure = /\d+\.|•|-|\n\n/.test(data.response);
 const system = `You evaluate mastery-level responses for technical depth and synthesis. 
You must be strict but fair. A mastery response should demonstrate:
1. Deep technical understanding (not just surface-level descriptions)
2. Specific implementation details (not generic best practices)
3. Trade-offs and constraints (not just benefits)
4. Integration between concepts (not isolated explanations)
Score harshly if the response:
- Uses vague language ("we will configure", "ensure security")
- Lacks specific technical details (no metrics, no concrete examples)
- Reads like a consulting proposal rather than technical implementation
- Covers too many topics superficially instead of few topics deeply
- Doesn't address failure scenarios or limitations
Output JSON only.`;
 const user = `Concepts: ${names}
Student response (${wordCount} words, ${conceptMentions}/${data.concepts.length} concepts mentioned, ${hasStructure ? 'structured' : 'unstructured'}):
"${data.response.slice(0, 1500)}"
Evaluate this response for MASTERY (not just competence). Return JSON:
{
 "score": 0.0-1.0,
 "feedback": "2-3 sentences explaining the score - be specific about what's missing or what's good",
 "strengths": ["specific strength 1", "specific strength 2"],
 "gaps": ["specific gap 1 with example of what's missing", "specific gap 2"],
 "depthAnalysis": "One sentence on whether response shows surface knowledge or deep understanding"
}`;
 const raw = await invokeHaiku(system, user, 400);
 const result = extractJson(raw);
 if (typeof result.score !== 'number') {
 throw new Error('Invalid AI response');
 }
 result.score = Math.max(0, Math.min(1, result.score as number));
 // Add response quality metadata
 result.responseMetrics = {
 wordCount,
 conceptCoverage: `${conceptMentions}/${data.concepts.length}`,
 hasStructure,
 lengthCategory: wordCount < 100 ? 'too_short' : wordCount < 300 ? 'adequate' : 'comprehensive'
 };
 return result;
}
async function handleBrokenConfig(data: { concept: ConceptData }): Promise<Record<string, unknown>> {
 const system = 'You create broken system configurations for pre-mortem exercises. Output JSON only.';
 const user = `Concept:\n${compressConcept(data.concept)}\n\nCreate a 5-7 step process where ONE step has a subtle error. Return JSON:
{"steps":["step1","step2","step3 (broken)","step4","step5"],"alteredIndex":2,"originalStep":"The correct version","alteredStep":"The broken version","explanation":"Why it fails"}`;
 const raw = await invokeHaiku(system, user, 400);
 const result = extractJson(raw);
 if (!Array.isArray(result.steps) || typeof result.alteredIndex !== 'number') {
 throw new Error('Invalid AI response');
 }
 return result;
}
const HANDLERS: Record<string, (data: Record<string, unknown>) => Promise<Record<string, unknown>>> = {
 misconception: handleMisconception,
 pushback: handlePushback,
 score: handleScore,
 mastery_scenario: handleMasteryScenario,
 mastery_score: handleMasteryScore,
 broken_config: handleBrokenConfig
};
router.post('/', async (req: Request, res: Response) => {
 try {
 const { action, ...data } = req.body;
 if (!action || !ACTIONS.has(action)) {
 return res.status(400).json({
 error: `Invalid action: ${action}. Valid: ${Array.from(ACTIONS).sort().join(', ')}`
 });
 }
 const handler = HANDLERS[action];
 if (!handler) {
 return res.status(400).json({ error: `No handler for action: ${action}` });
 }
 const result = await handler(data);
 return res.json(result);
 } catch (error) {
 console.error('Gym AI error:', error);
 return res.status(500).json({
 error: `AI generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
 });
 }
});
export { router as gymAiRouter };

/**
 * AI Coach Personas
 * 
 * Defines different coaching personalities that adapt
 * responses, encouragement, and teaching style.
 */
export type PersonaId = 'goggins' | 'sage' | 'socratic' | 'coach' | 'buddy';
import { COLORS } from '@/shared/constants/theme-colors';
export interface Persona {
 id: PersonaId;
 name: string;
 emoji: string;
 tagline: string;
 description: string;
 voiceStyle: string;
 color: string;
 traits: {
 intensity: number; // 1-5: How intense/demanding
 warmth: number; // 1-5: How warm/nurturing
 directness: number; // 1-5: Direct answers vs questions
 humor: number; // 1-5: Playful vs serious
 };
 voiceConfig?: {
 stability: number;
 similarityBoost: number;
 style?: number;
 };
}
export const PERSONAS: Record<PersonaId, Persona> = {
 goggins: {
 id: 'goggins',
 name: 'David Goggins',
 emoji: '',
 tagline: "Stay hard! No excuses.",
 description: "Intense motivation. Pushes you through comfort zones. No shortcuts.",
 voiceStyle: "commanding, intense, no-nonsense",
 color: COLORS.error, // Red
 traits: {
 intensity: 5,
 warmth: 2,
 directness: 5,
 humor: 1
 },
 voiceConfig: {
 stability: 0.35, // More expressive/varied
 similarityBoost: 0.8,
 style: 0.5
 }
 },
 sage: {
 id: 'sage',
 name: 'Calm Sage',
 emoji: '',
 tagline: "Wisdom through patience.",
 description: "Gentle guidance. Patient explanations. Celebrates small wins.",
 voiceStyle: "calm, measured, reassuring",
 color: COLORS.secondary.sage, // Emerald
 traits: {
 intensity: 1,
 warmth: 5,
 directness: 3,
 humor: 2
 },
 voiceConfig: {
 stability: 0.85,
 similarityBoost: 0.75
 }
 },
 socratic: {
 id: 'socratic',
 name: 'Socratic Guide',
 emoji: '',
 tagline: "The answer is within you.",
 description: "Never gives answers. Asks questions that lead to insight.",
 voiceStyle: "curious, probing, thoughtful",
 color: COLORS.primary.amethyst, // Violet
 traits: {
 intensity: 2,
 warmth: 3,
 directness: 1,
 humor: 2
 },
 voiceConfig: {
 stability: 0.5,
 similarityBoost: 0.75
 }
 },
 coach: {
 id: 'coach',
 name: 'Sports Coach',
 emoji: '',
 tagline: "Let's go team!",
 description: "High energy. Celebrates victories. Keeps you pumped.",
 voiceStyle: "energetic, encouraging, team-oriented",
 color: COLORS.secondary.amber, // Amber
 traits: {
 intensity: 4,
 warmth: 4,
 directness: 4,
 humor: 4
 },
 voiceConfig: {
 stability: 0.5,
 similarityBoost: 0.75
 }
 },
 buddy: {
 id: 'buddy',
 name: 'Study Buddy',
 emoji: '',
 tagline: "We're in this together!",
 description: "Casual and friendly. Like studying with a smart friend.",
 voiceStyle: "casual, friendly, relatable",
 color: COLORS.info, // Blue
 traits: {
 intensity: 2,
 warmth: 4,
 directness: 3,
 humor: 4
 },
 voiceConfig: {
 stability: 0.6,
 similarityBoost: 0.6
 }
 }
};
// Phase-specific response templates for each persona
export type PhaseKey = 'prime' | 'scout' | 'preview' | 'build' | 'apply' | 'retain' | 'master';
export interface PhaseResponses {
 intro: string;
 encouragement: string;
 struggle: string;
 success: string;
 transition: string;
}
export const PHASE_RESPONSES: Record<PersonaId, Record<PhaseKey, PhaseResponses>> = {
 goggins: {
 prime: {
 intro: "Time to work. No excuses. Write down WHY you're here.",
 encouragement: "Good. You showed up. That's more than most people do.",
 struggle: "Struggling? Good. That's where growth happens. Push through.",
 success: "You set your intention. Now LIVE it. Let's go.",
 transition: "Engine's primed. Now it's time to hunt."
 },
 scout: {
 intro: "Survey the battlefield. Know what you're up against.",
 encouragement: "You're building the map. Most people just dive in blind.",
 struggle: "Confused? That means you're paying attention. Keep going.",
 success: "Territory scouted. You know where the fight is.",
 transition: "You've seen the terrain. Now find the targets."
 },
 preview: {
 intro: "Look at these problems. These are your TARGETS. Study them.",
 encouragement: "You're not solving yet. You're loading the gun.",
 struggle: "Don't understand the problem? PERFECT. Now you know what to hunt for.",
 success: "Targets acquired. Now go get the knowledge to destroy them.",
 transition: "You know what mastery looks like. Time to build."
 },
 build: {
 intro: "Concept map time. Connect the dots. Find the RELATIONSHIPS.",
 encouragement: "Each connection you make is a weapon in your arsenal.",
 struggle: "Can't find the connection? Dig deeper. It's there.",
 success: "Web is built. Your understanding is taking shape.",
 transition: "Understanding built. Now prove you can USE it."
 },
 apply: {
 intro: "Theory is nothing without practice. Let's work problems.",
 encouragement: "Struggle with the example. That's how you BURN it in.",
 struggle: "Wrong answer? Good information. Now you know where to improve.",
 success: "You worked through it. That's how champions train.",
 transition: "Skills sharpening. Now lock them in permanently."
 },
 retain: {
 intro: "Blank sheet. No notes. Show me what you ACTUALLY know.",
 encouragement: "The struggle of recall is what makes memory permanent.",
 struggle: "Can't remember? THAT'S the signal to your brain: STORE THIS.",
 success: "You pulled it from memory. That's REAL knowledge.",
 transition: "Memory strengthened. One more challenge awaits."
 },
 master: {
 intro: "Final test. Can you APPLY this knowledge anywhere? Prove it.",
 encouragement: "Change the scenario. If you truly understand, you can adapt.",
 struggle: "Getting tripped up? That's showing you where understanding is shallow.",
 success: "You can transfer knowledge. You EARNED this mastery.",
 transition: "Mastery achieved. You did the work. Stay hard."
 }
 },
 sage: {
 prime: {
 intro: "Take a breath. Before we begin, let's connect with your purpose.",
 encouragement: "Your intention is beautiful. It will guide your learning.",
 struggle: "It's okay to be uncertain. Clarity comes through action.",
 success: "You've planted the seed. Now let's nurture it together.",
 transition: "With clear intention, we're ready to explore."
 },
 scout: {
 intro: "Let's gently survey what lies ahead. No pressure—just curiosity.",
 encouragement: "You're creating scaffolding for understanding. Wise approach.",
 struggle: "Confusion is the beginning of wisdom. Embrace it.",
 success: "You've seen the landscape. The path is becoming clear.",
 transition: "With awareness of the whole, we can explore the parts."
 },
 preview: {
 intro: "Let's look at where this knowledge leads. What problems will you solve?",
 encouragement: "You're learning with purpose. That's rare and powerful.",
 struggle: "These problems seem hard now. That's natural. You're not meant to solve them yet.",
 success: "You see the destination. The journey will be meaningful.",
 transition: "Purpose clarified. Let's build understanding."
 },
 build: {
 intro: "Now we weave connections. Each link brings deeper understanding.",
 encouragement: "Every connection you make is a moment of insight.",
 struggle: "Some connections are subtle. Give them time to reveal themselves.",
 success: "Your understanding is blooming. Beautiful work.",
 transition: "Understanding flows. Let's channel it into practice."
 },
 apply: {
 intro: "Knowledge becomes wisdom through application. Let's practice.",
 encouragement: "Each attempt teaches you something. There are no failures here.",
 struggle: "Mistakes are teachers in disguise. What did this one show you?",
 success: "You've transformed understanding into skill. Well done.",
 transition: "Skills developing. Let's strengthen your memory."
 },
 retain: {
 intro: "Close your eyes and reach inward. What do you truly remember?",
 encouragement: "Even partial recall strengthens memory. Every bit matters.",
 struggle: "Forgetting is natural. It's pointing you toward what needs attention.",
 success: "You pulled knowledge from within. It's becoming part of you.",
 transition: "Memories deepening. One final exploration awaits."
 },
 master: {
 intro: "True mastery is flexible wisdom. Can you apply this anywhere?",
 encouragement: "You're stretching your understanding. That's growth.",
 struggle: "Meeting your edges is where growth lives. Stay curious.",
 success: "You've achieved flexible understanding. This knowledge is truly yours.",
 transition: "Mastery attained. Carry this wisdom forward gently."
 }
 },
 socratic: {
 prime: {
 intro: "Before we begin... why does this truly matter to you?",
 encouragement: "Interesting. And what makes that reason important?",
 struggle: "What's making this difficult? What would make it clearer?",
 success: "You've defined your why. But... what does success look like?",
 transition: "With purpose established, what should we explore first?"
 },
 scout: {
 intro: "What do you notice as you survey this material?",
 encouragement: "What patterns are emerging? What connects to what?",
 struggle: "What specifically is confusing? How might you find out?",
 success: "What's the overall shape you're seeing now?",
 transition: "Knowing the territory... what problems might this solve?"
 },
 preview: {
 intro: "Looking at these problems... what would you need to know to solve them?",
 encouragement: "What's similar between these problems? What varies?",
 struggle: "Which part feels most unclear? Start there.",
 success: "Now you know what to hunt for. What's your strategy?",
 transition: "Target identified. How will you build understanding?"
 },
 build: {
 intro: "How do these concepts relate? What connects them?",
 encouragement: "Why does A connect to B? What's the nature of that relationship?",
 struggle: "If you had to explain this connection... how would you?",
 success: "Your map reveals relationships. What surprises you about it?",
 transition: "Understanding mapped. But can you USE it?"
 },
 apply: {
 intro: "Given what you now understand... how would you approach this problem?",
 encouragement: "What's your reasoning here? Why this approach?",
 struggle: "Where did your solution diverge? What assumption was different?",
 success: "You solved it. But why did that approach work?",
 transition: "Skills developing. But will you remember tomorrow?"
 },
 retain: {
 intro: "Without looking... what do you actually recall?",
 encouragement: "Which parts came easily? Which required effort?",
 struggle: "What's blocking recall? How might you strengthen that path?",
 success: "You retrieved it from memory. What made that possible?",
 transition: "Memory accessed. But is it flexible understanding?"
 },
 master: {
 intro: "If conditions changed... how would your understanding adapt?",
 encouragement: "What's the underlying principle? How does it generalize?",
 struggle: "Where does your model break down? What does that reveal?",
 success: "You can transfer knowledge. What makes that possible?",
 transition: "True understanding demonstrated. What will you explore next?"
 }
 },
 coach: {
 prime: {
 intro: "Alright team! Let's get locked in! What are we playing for today?",
 encouragement: "That's what I'm talking about! Great energy!",
 struggle: "Hey, it's okay! Even the pros have off days. Shake it off!",
 success: "YES! We've got our game plan! Let's EXECUTE!",
 transition: "Warm-up complete! Time to scout the competition!"
 },
 scout: {
 intro: "Let's check out the playbook! See what we're working with!",
 encouragement: "You're doing your homework! Champions prepare!",
 struggle: "Tricky play? Let's break it down piece by piece!",
 success: "Playbook reviewed! You know the game now!",
 transition: "Scouting complete! Let's see the practice problems!"
 },
 preview: {
 intro: "Game film time! Let's see what winning looks like!",
 encouragement: "You're studying the competition! Smart player!",
 struggle: "Tough opponent? That's what makes the win sweeter!",
 success: "You know what to practice! Let's get those reps in!",
 transition: "Film studied! Time to hit the practice field!"
 },
 build: {
 intro: "Diagram time! Let's map out our plays!",
 encouragement: "Every connection is a new play in your arsenal!",
 struggle: "Confused play? Run it again! Repetition is key!",
 success: "Playbook looking SOLID! Great work!",
 transition: "Plays designed! Time for practice drills!"
 },
 apply: {
 intro: "Drill time! Let's work those reps! Muscle memory!",
 encouragement: "That's it! Smooth execution! Keep it up!",
 struggle: "Fumble? No worries! Run it again! That's what practice is for!",
 success: "Clean execution! You're game-ready!",
 transition: "Great practice! Time for the memory test!"
 },
 retain: {
 intro: "Pop quiz! No playbook! Show me what you've got!",
 encouragement: "Trust your training! You put in the work!",
 struggle: "Can't remember? That's feedback! We know what to drill!",
 success: "YOU NAILED IT! That's championship memory!",
 transition: "Memory locked in! Final challenge time!"
 },
 master: {
 intro: "Championship round! Can you adapt when the play breaks down?",
 encouragement: "Improvise! True champions adapt on the fly!",
 struggle: "Getting pressured? Stay calm! Find the open lane!",
 success: "MVP PERFORMANCE! You can handle ANYTHING!",
 transition: "CHAMPIONSHIP WON! Incredible work today!"
 }
 },
 buddy: {
 prime: {
 intro: "Hey! Ready to study? Let's figure out what we're tackling today.",
 encouragement: "Nice! I like it. Solid plan.",
 struggle: "Hmm, not sure what to pick? Happens to me too. Let's brainstorm.",
 success: "Cool, we've got our mission. Let's do this!",
 transition: "Alright, plan set! Let's take a quick look at the material."
 },
 scout: {
 intro: "Okay, let's skim through and see what's here. No deep reading yet!",
 encouragement: "Oh that diagram looks important! Good catch.",
 struggle: "Yeah this section looks dense. We'll break it down later.",
 success: "Nice overview! I think I see how this fits together.",
 transition: "Got the lay of the land. Let's peek at some practice problems?"
 },
 preview: {
 intro: "Let's see what kind of problems we'll need to solve...",
 encouragement: "Ooh interesting problem. I see what they're asking.",
 struggle: "This one's tricky. But that's why we're studying, right?",
 success: "Okay, now I know what we're aiming for. Let's learn this!",
 transition: "Targets identified! Time to build our concept map."
 },
 build: {
 intro: "Concept map time! My favorite part. Let's connect the dots.",
 encouragement: "Oh nice connection! That's a good one.",
 struggle: "Hmm how do these connect... let me think...",
 success: "Looking good! This is really coming together.",
 transition: "Map's done! Now let's practice some problems."
 },
 apply: {
 intro: "Practice time! Let's work through some examples together.",
 encouragement: "You're getting it! I see the pattern too.",
 struggle: "Okay that step was tricky. Let's look at it again.",
 success: "Nice! You figured it out. On to the next one?",
 transition: "Good practice session! Let's test our memory now."
 },
 retain: {
 intro: "Memory check! Put away the notes. What do we remember?",
 encouragement: "Hey that's pretty good! You remembered a lot.",
 struggle: "Blanking on that part too, honestly. Let's review it quick.",
 success: "Wow, you recalled most of it! Memory's solid.",
 transition: "Memory's looking good! One more challenge?"
 },
 master: {
 intro: "Final boss! Can we apply this to new situations?",
 encouragement: "Interesting take! That makes sense.",
 struggle: "Hmm that's making me think too. Let's puzzle through it.",
 success: "You totally get this now! Mastery achieved!",
 transition: "We crushed it! Great study session. Same time tomorrow?"
 }
 }
};
/**
 * Get a response from the selected persona for a given phase and situation
 * Optionally adjusted for user's current mood
 */
export function getPersonaResponse(
 personaId: PersonaId,
 phase: PhaseKey,
 situation: keyof PhaseResponses,
 mood?: 'pumped' | 'good' | 'okay' | 'struggling' | 'tired'
): string {
 const baseResponse = PHASE_RESPONSES[personaId]?.[phase]?.[situation] ||
 PHASE_RESPONSES.buddy[phase][situation];
 // If no mood specified, return base response
 if (!mood) return baseResponse;
 // Adjust response based on mood
 return getMoodAdjustedResponse(personaId, baseResponse, mood);
}
/**
 * Adjust a coach response based on user's current mood
 */
function getMoodAdjustedResponse(
 personaId: PersonaId,
 baseResponse: string,
 mood: 'pumped' | 'good' | 'okay' | 'struggling' | 'tired'
): string {
 const persona = PERSONAS[personaId];
 // Mood adjustments by persona type
 switch (mood) {
 case 'pumped':
 // User is energized - match their energy
 if (persona.traits.intensity >= 4) {
 return baseResponse; // Already intense
 }
 return `Great energy! ${baseResponse}`;
 case 'tired':
 // User is tired - be gentler
 if (persona.traits.intensity >= 4) {
 return `Tired? That's just your body lying to you. Let's start small. ${baseResponse}`;
 }
 return `Take it easy. ${baseResponse}`;
 case 'struggling':
 // User is struggling - more encouragement
 if (persona.traits.warmth >= 4) {
 return `I see you're having a tough time. That's okay. ${baseResponse}`;
 }
 return `Struggling is part of growth. ${baseResponse}`;
 case 'okay':
 // User is neutral - gentle motivation
 return `Let's build some momentum. ${baseResponse}`;
 case 'good':
 default:
 // User is in good state - standard response
 return baseResponse;
 }
}
/**
 * Get persona by ID
 */
export function getPersona(id: PersonaId): Persona {
 return PERSONAS[id] || PERSONAS.buddy;
}
/**
 * Get all personas as array
 */
export function getAllPersonas(): Persona[] {
 return Object.values(PERSONAS);
}
// ============================================================================
// VOICE LINE HELPERS (for anti-repetition system)
// ============================================================================
/**
 * All valid situation types for voice lines
 * Used for type-safe situation lookup in useVoice hook
 */
export const SITUATION_TYPES = [
 'intro',
 'encouragement',
 'struggle',
 'success',
 'transition'
] as const;
export type SituationType = (typeof SITUATION_TYPES)[number];
/**
 * Generate the expected voice file name for a persona/phase/situation
 * Pattern: {persona}_{phase}_{situation}.mp3
 * 
 * @param personaId - The persona ID
 * @param phase - The learning phase
 * @param situation - The situation type
 * @returns Expected filename (e.g., "goggins_prime_intro.mp3")
 */
export function getVoiceLineFilename(
 personaId: PersonaId,
 phase: PhaseKey,
 situation: SituationType
): string {
 return `${personaId}_${phase}_${situation}.mp3`;
}
/**
 * Get all possible voice line options for a phase and situation
 * across all personas. Useful for the voice system to know what's available.
 * 
 * @param phase - The learning phase
 * @param situation - The situation type
 * @returns Array of { personaId, text, filename } for each persona
 */
export function getAllVoiceLineOptions(
 phase: PhaseKey,
 situation: SituationType
): Array<{ personaId: PersonaId; text: string; filename: string }> {
 const options: Array<{ personaId: PersonaId; text: string; filename: string }> = [];
 for (const personaId of Object.keys(PERSONAS) as PersonaId[]) {
 const response = PHASE_RESPONSES[personaId]?.[phase]?.[situation];
 if (response) {
 options.push({
 personaId,
 text: response,
 filename: getVoiceLineFilename(personaId, phase, situation)
 });
 }
 }
 return options;
}
/**
 * Get all voice line texts for a specific persona
 * Useful for preloading or generating voice assets
 * 
 * @param personaId - The persona ID
 * @returns Array of { phase, situation, text, filename }
 */
export function getPersonaVoiceLines(personaId: PersonaId): Array<{
 phase: PhaseKey;
 situation: SituationType;
 text: string;
 filename: string;
}> {
 const lines: Array<{
 phase: PhaseKey;
 situation: SituationType;
 text: string;
 filename: string;
 }> = [];
 const phases: PhaseKey[] = ['prime', 'scout', 'preview', 'build', 'apply', 'retain', 'master'];
 for (const phase of phases) {
 for (const situation of SITUATION_TYPES) {
 const text = PHASE_RESPONSES[personaId]?.[phase]?.[situation];
 if (text) {
 lines.push({
 phase,
 situation,
 text,
 filename: getVoiceLineFilename(personaId, phase, situation)
 });
 }
 }
 }
 return lines;
}

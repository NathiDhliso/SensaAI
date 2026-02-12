import type { ParsedConcept, ParsedGeneratedContent } from '@/shared/utils/content-builder';
import { isRealContent } from '@/shared/utils/content-builder';

export interface AuditIssue {
 field: string;
 severity: 'critical' | 'warning' | 'info';
 message: string;
 impact: string;
}

export interface ObjectiveMatch {
 objectiveText: string;
 similarity: number;
}

export interface ConceptVerdict {
 conceptId: string;
 conceptName: string;
 tier: string;
 cognitiveLevel: string;
 verdict: 'objective-aligned' | 'supplementary' | 'not-in-objectives' | 'unverified';
 contentHealth: number;
 objectiveAlignment: number;
 matchedObjective: string | null;
 issues: AuditIssue[];
 strengths: string[];
 freshness: 'fresh' | 'staling' | 'stale';
 nextReviewDate: Date;
}

export interface AuditInsight {
 message: string;
 tone: 'positive' | 'negative' | 'neutral';
}

export interface ContentAuditResult {
 hasObjectives: boolean;
 overallScore: number;
 objectivesCoverage: number;
 contentHealth: number;
 conceptCount: number;
 objectivesProvided: number;
 objectivesCovered: number;
 unmappedConcepts: number;
 tierDistribution: { trunk: number; branch: number; leaf: number };
 bloomsDistribution: Record<string, number>;
 verdicts: ConceptVerdict[];
 harshInsights: AuditInsight[];
}

function hasEntries(arr: unknown[] | undefined): boolean {
 return Array.isArray(arr) && arr.length > 0;
}

function tokenize(text: string): string[] {
 return text
 .toLowerCase()
 .replace(/[^a-z0-9\s]/g, ' ')
 .split(/\s+/)
 .filter(w => w.length > 2);
}

const STOP_WORDS = new Set([
 'the', 'and', 'for', 'with', 'that', 'this', 'from', 'are', 'was',
 'were', 'been', 'have', 'has', 'had', 'will', 'can', 'may',
 'how', 'what', 'when', 'where', 'which', 'who'
]);

function meaningfulTokens(text: string): string[] {
 return tokenize(text).filter(t => !STOP_WORDS.has(t));
}

function extractBigrams(tokens: string[]): string[] {
 const bigrams: string[] = [];
 for (let i = 0; i < tokens.length - 1; i++) {
 bigrams.push(`${tokens[i]} ${tokens[i + 1]}`);
 }
 return bigrams;
}

function matchConceptToObjectives(
 conceptName: string,
 conceptDescription: string,
 objectives: string[],
): { bestMatch: string | null; score: number } {
 if (objectives.length === 0) return { bestMatch: null, score: 0 };

 const conceptText = `${conceptName} ${conceptDescription}`;
 const conceptTokens = meaningfulTokens(conceptText);
 const conceptTokenSet = new Set(conceptTokens);
 const conceptBigrams = new Set(extractBigrams(conceptTokens));
 if (conceptTokenSet.size === 0) return { bestMatch: null, score: 0 };

 const conceptNameLower = conceptName.toLowerCase();

 let bestScore = 0;
 let bestMatch: string | null = null;

 for (const objective of objectives) {
 const objTokens = meaningfulTokens(objective);
 if (objTokens.length === 0) continue;

 const objBigrams = extractBigrams(objTokens);

 let tokenMatches = 0;
 for (const token of objTokens) {
 for (const cToken of conceptTokenSet) {
 if (cToken === token || cToken.includes(token) || token.includes(cToken)) {
 tokenMatches++;
 break;
 }
 }
 }

 let bigramMatches = 0;
 for (const bg of objBigrams) {
 if (conceptBigrams.has(bg) || conceptNameLower.includes(bg)) {
 bigramMatches++;
 }
 }

 const tokenScore = tokenMatches / Math.max(objTokens.length, 1);
 const bigramBonus = objBigrams.length > 0 ? (bigramMatches / objBigrams.length) * 0.3 : 0;

 const objLower = objective.toLowerCase();
 const nameBonus = objLower.includes(conceptNameLower) || conceptNameLower.includes(objLower) ? 0.4 : 0;

 const nameTokens = meaningfulTokens(conceptName);
 let nameTokenHits = 0;
 for (const nt of nameTokens) {
 if (objTokens.some(ot => ot === nt || ot.includes(nt) || nt.includes(ot))) {
 nameTokenHits++;
 }
 }
 const nameOverlap = nameTokens.length > 0 ? (nameTokenHits / nameTokens.length) * 0.2 : 0;

 const score = Math.min(tokenScore + bigramBonus + nameBonus + nameOverlap, 1);

 if (score > bestScore) {
 bestScore = score;
 bestMatch = objective;
 }
 }

 return { bestMatch: bestScore >= 0.25 ? bestMatch : null, score: bestScore };
}

function scoreContentHealth(concept: ParsedConcept): { score: number; issues: AuditIssue[]; strengths: string[] } {
 let score = 0;
 const issues: AuditIssue[] = [];
 const strengths: string[] = [];

 const textChecks: { field: string; value: string | undefined; points: number; label: string }[] = [
 { field: 'phase1.hookSentence', value: concept.phase1?.hookSentence, points: 10, label: 'Hook sentence' },
 { field: 'whyYouNeed', value: concept.whyYouNeed, points: 10, label: 'Professional relevance' },
 { field: 'shape.simpleCore', value: concept.shape?.simpleCore || concept.shape?.simple, points: 15, label: 'Core explanation' },
 { field: 'shape.highStakesExample', value: concept.shape?.highStakesExample || concept.shape?.highStakes, points: 10, label: 'High-stakes scenario' },
 { field: 'shape.analogicalModel', value: concept.shape?.analogicalModel || concept.shape?.analogy, points: 5, label: 'Mental model / analogy' },
 { field: 'technicalDetails', value: concept.technicalDetails, points: 10, label: 'Technical depth' }
 ];

 for (const check of textChecks) {
 if (check.value && isRealContent(check.value, concept.name)) {
 score += check.points;
 if (check.points >= 10) strengths.push(check.label);
 } else {
 issues.push({
 field: check.field,
 severity: check.points >= 15 ? 'critical' : 'warning',
 message: `Missing: ${check.label}`,
 impact: check.points >= 15
 ? 'Core content gap \u2014 this concept will feel hollow when you study it.'
 : 'Minor gap \u2014 the concept functions but lacks depth.'
 });
 }
 }

 if (concept.mnemonic?.story && isRealContent(concept.mnemonic.story, concept.name)) {
 score += 10;
 strengths.push('Memory anchor');
 } else {
 issues.push({
 field: 'mnemonic.story',
 severity: 'warning',
 message: 'No memory anchor',
 impact: 'Without a mnemonic, expect faster recall decay (Ebbinghaus).'
 });
 }

 const patternQ = concept.shape?.patternRecognition?.question || concept.shape?.pattern?.question;
 const patternA = concept.shape?.patternRecognition?.answer || concept.shape?.pattern?.answer;
 if (patternQ && patternA) {
 score += 10;
 strengths.push('Pattern drill');
 }

 const elimLogic = concept.shape?.eliminationLogic || concept.shape?.elimination;
 if (elimLogic && isRealContent(elimLogic, concept.name)) {
 score += 10;
 strengths.push('Elimination logic');
 }

 const hasWorkedExample = concept.workedExample
 && concept.workedExample.problem
 && concept.workedExample.solution
 && isRealContent(concept.workedExample.problem, concept.name);
 if (hasWorkedExample) {
 score += 5;
 strengths.push('Worked example');
 } else {
 const level = concept.cognitiveLevel || 'remember';
 const isHigherOrder = ['apply', 'analyze', 'evaluate', 'create'].includes(level);
 if (isHigherOrder) {
 issues.push({
 field: 'workedExample',
 severity: 'warning',
 message: 'Missing: Worked example',
 impact: `This is an "${level}" concept — a worked example would reinforce application skills.`
 });
 }
 }

 if (hasEntries(concept.keyPoints)) {
 score += 5;
 strengths.push(`${concept.keyPoints!.length} key points`);
 }

 if (hasEntries(concept.commonPitfalls)) {
 score += 5;
 strengths.push(`${concept.commonPitfalls!.length} pitfalls`);
 }

 return { score, issues, strengths };
}

function generateHarshInsights(
 verdicts: ConceptVerdict[],
 objectives: string[],
 tierDist: ContentAuditResult['tierDistribution'],
 bloomsDist: Record<string, number>,
 totalConcepts: number,
): AuditInsight[] {
 const insights: AuditInsight[] = [];
 const hasObjectives = objectives.length > 0;

 if (!hasObjectives) {
 insights.push({
 message: 'No exam objectives provided. This audit can only check structural content quality \u2014 it CANNOT tell you whether these concepts are actually on your exam. Paste your exam objectives below to get real alignment scoring.',
 tone: 'neutral'
 });
 }

 if (hasObjectives) {
 const unmapped = verdicts.filter(v => v.verdict === 'not-in-objectives');
 if (unmapped.length > 0) {
 const names = unmapped.map(v => v.conceptName).slice(0, 4);
 insights.push({
 message: `${unmapped.length} of ${totalConcepts} concepts don't match any of your ${objectives.length} objectives (${names.join(', ')}${unmapped.length > 4 ? ', ...' : ''}). These may be background knowledge or genuine fluff \u2014 they won't be directly tested.`,
 tone: 'negative'
 });
 }

 const coveredObjectives = new Set<string>();
 for (const v of verdicts) {
 if (v.matchedObjective) coveredObjectives.add(v.matchedObjective);
 }
 const uncovered = objectives.filter(o => !coveredObjectives.has(o));
 if (uncovered.length > 0) {
 insights.push({
 message: `${uncovered.length} of your ${objectives.length} objectives have NO matching concepts: "${uncovered[0]}"${uncovered.length > 1 ? ` and ${uncovered.length - 1} more` : ''}. These are gaps in your generated content \u2014 you'll need to regenerate or study these separately.`,
 tone: 'negative'
 });
 }

 const aligned = verdicts.filter(v => v.verdict === 'objective-aligned').length;
 if (aligned === totalConcepts && totalConcepts > 0) {
 insights.push({
 message: `All ${totalConcepts} concepts map to your stated objectives. Coverage looks solid \u2014 focus on learning depth, not breadth.`,
 tone: 'positive'
 });
 }
 }

 const lowHealth = verdicts.filter(v => v.contentHealth < 40);
 if (lowHealth.length > 0) {
 insights.push({
 message: `${lowHealth.length} concepts have content health below 40%. They're missing core explanations, examples, or memory aids. Even if they're on the exam, you can't learn from incomplete content.`,
 tone: 'negative'
 });
 }

 const lowerOrder = (bloomsDist['remember'] || 0) + (bloomsDist['understand'] || 0);
 const higherOrder = (bloomsDist['analyze'] || 0) + (bloomsDist['evaluate'] || 0) + (bloomsDist['create'] || 0);
 if (lowerOrder > 0 && higherOrder === 0 && totalConcepts > 5) {
 insights.push({
 message: '100% of content targets lower-order thinking (remember/understand). Zero concepts reach analyze, evaluate, or create. Exams test higher-order reasoning \u2014 your content doesn\'t prepare you for that.',
 tone: 'negative'
 });
 }

 if (tierDist.leaf > tierDist.trunk * 2 && totalConcepts > 8) {
 insights.push({
 message: `${tierDist.leaf} leaf concepts vs only ${tierDist.trunk} trunk. The generation over-indexed on peripheral topics.`,
 tone: 'negative'
 });
 }

 return insights;
}

export function auditContent(
 parsedContent: ParsedGeneratedContent,
 examObjectives: string[] = [],
): ContentAuditResult {
 const { concepts } = parsedContent;
 const hasObjectives = examObjectives.length > 0;

 const tierDist = { trunk: 0, branch: 0, leaf: 0 };
 const bloomsDist: Record<string, number> = {};
 const verdicts: ConceptVerdict[] = [];
 const coveredObjectives = new Set<string>();

 for (const concept of concepts) {
 const tier = concept.tier || 'leaf';
 if (tier in tierDist) tierDist[tier as keyof typeof tierDist]++;

 const level = concept.cognitiveLevel || 'remember';
 bloomsDist[level] = (bloomsDist[level] || 0) + 1;

 const healthResult = scoreContentHealth(concept);

 const conceptDesc = [
 concept.whyYouNeed || '',
 concept.shape?.simpleCore || '',
 concept.technicalDetails || '',
 ...(concept.examFocus || []),
 ...(concept.phase1?.selection || [])
 ].join(' ');

 const objMatch = matchConceptToObjectives(concept.name, conceptDesc, examObjectives);
 if (objMatch.bestMatch) coveredObjectives.add(objMatch.bestMatch);

 let verdict: ConceptVerdict['verdict'];
 if (!hasObjectives) {
 verdict = 'unverified';
 } else if (objMatch.score >= 0.3) {
 verdict = 'objective-aligned';
 } else if (objMatch.score >= 0.15) {
 verdict = 'supplementary';
 } else {
 verdict = 'not-in-objectives';
 }

 if (hasObjectives && verdict === 'not-in-objectives') {
 healthResult.issues.push({
 field: 'objective-alignment',
 severity: 'critical',
 message: 'Not mapped to any exam objective',
 impact: 'This concept does not match any of your stated exam objectives. It may be background knowledge or fluff \u2014 it won\'t be directly tested.'
 });
 }

 verdicts.push({
 conceptId: concept.id,
 conceptName: concept.name,
 tier,
 cognitiveLevel: concept.cognitiveLevel || 'remember',
 verdict,
 contentHealth: healthResult.score,
 objectiveAlignment: Math.round(objMatch.score * 100),
 matchedObjective: objMatch.bestMatch,
 issues: healthResult.issues,
 strengths: healthResult.strengths,
 freshness: 'fresh' as const,
 nextReviewDate: new Date()
 });
 }

 verdicts.sort((a, b) => {
 if (hasObjectives) {
 const verdictOrder: Record<string, number> = { 'not-in-objectives': 0, 'supplementary': 1, 'objective-aligned': 2, 'unverified': 1 };
 const orderDiff = (verdictOrder[a.verdict] || 0) - (verdictOrder[b.verdict] || 0);
 if (orderDiff !== 0) return orderDiff;
 }
 return a.contentHealth - b.contentHealth;
 });

 const avgContentHealth = verdicts.length > 0
 ? Math.round(verdicts.reduce((sum, v) => sum + v.contentHealth, 0) / verdicts.length)
 : 0;

 const objectivesCovered = coveredObjectives.size;
 const objectivesCoverage = hasObjectives
 ? Math.round((objectivesCovered / examObjectives.length) * 100)
 : 0;

 const unmappedConcepts = hasObjectives
 ? verdicts.filter(v => v.verdict === 'not-in-objectives').length
 : 0;

 const overallScore = hasObjectives
 ? Math.round(objectivesCoverage * 0.5 + avgContentHealth * 0.5)
 : avgContentHealth;

 const harshInsights = generateHarshInsights(verdicts, examObjectives, tierDist, bloomsDist, concepts.length);

 return {
 hasObjectives,
 overallScore,
 objectivesCoverage,
 contentHealth: avgContentHealth,
 conceptCount: concepts.length,
 objectivesProvided: examObjectives.length,
 objectivesCovered,
 unmappedConcepts,
 tierDistribution: tierDist,
 bloomsDistribution: bloomsDist,
 verdicts,
 harshInsights
 };
}

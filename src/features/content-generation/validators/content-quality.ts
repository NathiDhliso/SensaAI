/**
 * Content Quality Validator - Rebuilt
 */
export interface ContentGap {
 field: string;
 conceptId?: string;
 conceptName: string;
 severity: 'critical' | 'warning';
 message: string;
}
export interface VerifiableConcept {
 id?: string;
 name: string;
 hookSentence?: string;
 whyYouNeed?: string;
 technicalDetails?: string;
 realWorldExample?: string;
 metaphor?: string;
 officialSource?: string;
 blueprintMapping?: string;
 mnemonic?: { anchor?: string; story?: string;[key: string]: unknown };
 shape?: {
 simpleCore?: string;
 highStakesExample?: string;
 analogicalModel?: string;
 patternRecognition?: { question?: string; answer?: string };
 eliminationLogic?: string;
 };
 [key: string]: unknown;
}
const OFFICIAL_DOMAINS = [
 'learn.microsoft.com',
 'docs.microsoft.com',
 'docs.aws.amazon.com',
 'cloud.google.com',
 'docs.oracle.com',
 'kubernetes.io',
 'developer.hashicorp.com',
 'docs.docker.com'
];
export function isValidOfficialUrl(url: string | undefined): boolean {
 if (!url || url.trim() === '') return false;
 try {
 const parsedUrl = new URL(url);
 return OFFICIAL_DOMAINS.some(domain => parsedUrl.hostname.includes(domain));
 } catch {
 return false;
 }
}
const PLACEHOLDER_PATTERNS = [
 'pending generation',
 'to be generated',
 '[placeholder]',
 'tbd',
 'todo'
];
export function isRealContent(text: string | undefined, conceptName: string): boolean {
 if (!text || text.trim() === '') return false;
 const lowerText = text.toLowerCase();
 const lowerName = conceptName.toLowerCase();
 const coreName = lowerName.replace(/\s*\([^)]*\)\s*/g, '').trim();
 const acronymMatch = conceptName.match(/\(([^)]+)\)/);
 const acronym = acronymMatch ? acronymMatch[1].toLowerCase() : '';
 if (lowerText.trim() === lowerName.trim()) return false;
 if (coreName && lowerText.trim() === coreName) return false;
 if (lowerText.includes('think of') && lowerText.includes('like')) {
 const likeIndex = lowerText.indexOf('like');
 const beforeLike = lowerText.substring(0, likeIndex);
 const afterLike = lowerText.substring(likeIndex);
 const nameInBefore = beforeLike.includes(coreName) || (acronym && beforeLike.includes(acronym));
 const nameInAfter = afterLike.includes(coreName) || (acronym && afterLike.includes(acronym));
 if (nameInBefore && nameInAfter && text.trim().length < 150) return false;
 }
 const escapedCoreName = coreName.replace(/[.*+?^${}()|[\]\\]/g, '$&');
 const nameFrequency = (lowerText.match(new RegExp(escapedCoreName, 'gi')) || []).length;
 if (nameFrequency >= 3 && text.trim().length < 150) return false;
 const trimmedText = lowerText.trim();
 if (trimmedText.startsWith(coreName) && trimmedText.endsWith(coreName) && text.trim().length < 100) {
 return false;
 }
 for (const pattern of PLACEHOLDER_PATTERNS) {
 if (lowerText.includes(pattern)) return false;
 }
 if (text.trim().length < 15) return false;
 return true;
}
export function auditConceptContent(concept: {
 id: string;
 name: string;
 hookSentence?: string;
 whyYouNeed?: string;
 technicalDetails?: string;
 realWorldExample?: string;
 mnemonic?: { story?: string };
 shape?: { simpleCore?: string; highStakesExample?: string };
}): void {
 if (import.meta.env.PROD) return;
 const gaps: string[] = [];
 if (!isRealContent(concept.hookSentence, concept.name)) {
 gaps.push('hookSentence');
 }
 if (!isRealContent(concept.whyYouNeed, concept.name)) {
 gaps.push('whyYouNeed');
 }
 if (!isRealContent(concept.realWorldExample, concept.name)) {
 gaps.push('realWorldExample');
 }
 if (!isRealContent(concept.technicalDetails, concept.name)) {
 gaps.push('technicalDetails');
 }
 if (!concept.mnemonic?.story || !isRealContent(concept.mnemonic.story, concept.name)) {
 gaps.push('mnemonic.story');
 }
 if (!concept.shape?.simpleCore || !isRealContent(concept.shape.simpleCore, concept.name)) {
 gaps.push('shape.simpleCore');
 }
 if (!concept.shape?.highStakesExample || !isRealContent(concept.shape.highStakesExample, concept.name)) {
 gaps.push('shape.highStakesExample');
 }
 if (gaps.length > 0) {
 console.warn(
 `[Content Gap] "${concept.name}" is missing: ${gaps.join(', ')}`,
 { conceptId: concept.id, gaps }
 );
 }
}
export function validateConceptContent(concept: VerifiableConcept): ContentGap[] {
 const gaps: ContentGap[] = [];
 if (!isRealContent(concept.hookSentence || '', concept.name)) {
 gaps.push({
 field: 'hookSentence',
 conceptId: concept.id,
 conceptName: concept.name,
 severity: 'critical',
 message: 'Missing hook sentence'
 });
 }
 if (!isRealContent(concept.whyYouNeed || '', concept.name)) {
 gaps.push({
 field: 'whyYouNeed',
 conceptId: concept.id,
 conceptName: concept.name,
 severity: 'critical',
 message: 'Missing "why you need" explanation'
 });
 }
 if (!isRealContent(concept.realWorldExample || '', concept.name)) {
 gaps.push({
 field: 'realWorldExample',
 conceptId: concept.id,
 conceptName: concept.name,
 severity: 'critical',
 message: 'Missing real-world example'
 });
 }
 if (!concept.mnemonic?.story || !isRealContent(concept.mnemonic.story || '', concept.name)) {
 gaps.push({
 field: 'mnemonic.story',
 conceptId: concept.id,
 conceptName: concept.name,
 severity: 'critical',
 message: 'Missing memory anchor story'
 });
 }
 if (!concept.shape?.simpleCore || !isRealContent(concept.shape.simpleCore || '', concept.name)) {
 gaps.push({
 field: 'shape.simpleCore',
 conceptId: concept.id,
 conceptName: concept.name,
 severity: 'critical',
 message: 'Missing SHAPE simple core'
 });
 }
 if (!concept.shape?.highStakesExample || !isRealContent(concept.shape.highStakesExample || '', concept.name)) {
 gaps.push({
 field: 'shape.highStakesExample',
 conceptId: concept.id,
 conceptName: concept.name,
 severity: 'critical',
 message: 'Missing SHAPE high-stakes example'
 });
 }
 if (!concept.officialSource || !isValidOfficialUrl(concept.officialSource)) {
 gaps.push({
 field: 'officialSource',
 conceptId: concept.id,
 conceptName: concept.name,
 severity: 'warning',
 message: 'Missing official documentation URL'
 });
 }
 if (!concept.blueprintMapping || concept.blueprintMapping.length < 10) {
 gaps.push({
 field: 'blueprintMapping',
 conceptId: concept.id,
 conceptName: concept.name,
 severity: 'warning',
 message: 'Missing exam blueprint objective mapping'
 });
 }
 return gaps;
}
export function getContentGapMessage(gap: ContentGap): string {
 return ` ${gap.message} — Flag to Support`;
}
export function hasCriticalGaps(concept: Parameters<typeof validateConceptContent>[0]): boolean {
 const gaps = validateConceptContent(concept);
 return gaps.some(g => g.severity === 'critical');
}
export function verifyContextRelevance(subjectTitle: string, fileContent: string): { score: number; keywords: string[] } {
 if (!subjectTitle || !fileContent) return { score: 0, keywords: [] };
 const stopWords = new Set(['the', 'and', 'or', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'a', 'an', 'is', 'are', 'i', 'exam', 'guide', 'test', 'certification']);
 const subjectKeywords = subjectTitle.toLowerCase()
 .replace(/[^\w\s]/g, '')
 .split(/\s+/)
 .filter(w => w.length > 2 && !stopWords.has(w));
 if (subjectKeywords.length === 0) return { score: 1, keywords: [] };
 const contentLower = fileContent.toLowerCase().substring(0, 10000);
 let matches = 0;
 subjectKeywords.forEach(kw => {
 if (contentLower.includes(kw)) {
 matches++;
 const count = contentLower.split(kw).length - 1;
 if (count > 2) matches += 0.5;
 }
 });
 const rawScore = matches / subjectKeywords.length;
 return {
 score: Math.min(1.0, rawScore),
 keywords: subjectKeywords
 };
}
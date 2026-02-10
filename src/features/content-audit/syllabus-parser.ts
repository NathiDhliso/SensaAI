const ACTION_VERBS = new Set([
 'create', 'configure', 'manage', 'implement', 'deploy', 'monitor',
 'assign', 'apply', 'interpret', 'provision', 'troubleshoot', 'set up',
 'perform', 'export', 'modify', 'map', 'query', 'analyze', 'evaluate',
 'design', 'build', 'define', 'establish', 'develop', 'integrate',
 'secure', 'optimize', 'migrate', 'backup', 'restore', 'connect',
 'describe', 'explain', 'identify', 'list', 'compare', 'contrast',
 'distinguish', 'classify', 'summarize', 'demonstrate', 'calculate',
 'determine', 'select', 'choose', 'plan', 'recommend', 'assess',
 'diagnose', 'resolve', 'install', 'update', 'remove', 'enable',
 'disable', 'customize', 'extend', 'automate', 'validate', 'verify',
 'test', 'debug', 'review', 'audit', 'document', 'report',
 'understand', 'use', 'work with', 'navigate', 'access',
 'enhance', 'promote', 'certify', 'publish', 'import',
 'pivot', 'unpivot', 'transpose', 'merge', 'append',
 'format', 'group', 'layer', 'detect', 'provide'
]);

const SKIP_PATTERNS = [
 /^(course|exam|assessment|grading|schedule|syllabus|overview|introduction|prerequisite|textbook|reference|instructor|office|email|phone|website|date|time|location|room|building)/i,
 /^(total|final|midterm|quiz|assignment|homework|project|lab|tutorial|seminar|workshop|review|revision|summary|conclusion|appendix|bibliography|glossary|index)/i,
 /^(skills measured|skills at a glance|audience profile)/i,
 /^page\s*\d/i,
 /^copyright/i,
 /^\d+$/
];

const EXAM_SKIP_PATTERNS = [
 /^(answer|correct answer|solution|ans)\s*[:=]/i,
 /^(choose|select|pick|mark|circle|indicate|identify which|tick)\s+(the|all|one|two|three|correct|best|most)/i,
 /^(instructions?|directions?|read|note|time allowed|duration|attempt|answer all|section [a-z])\s*[:.\-–]/i,
 /^(true|false)\s*$/i,
 /^[a-e][.)]\s*.{1,80}$/i,
 /^(none of the above|all of the above|both [a-e] and [a-e]|not applicable)/i,
 /^(figure|diagram|table|image|refer to|see|shown below|given below|the following)/i,
 /^\d+\s*\/\s*\d+\s*$/,
 /^(name|student|date|class|grade|score|id|roll)\s*[:_]/i,
 /^_{3}$/,
 /^\.{3}$/,
 /^(end of|stop here|do not|turn over|continued|go to)/i
];

function cleanText(line: string): string {
 let text = line;
 text = text.replace(/^[\s]*[-–—•*·∙]+\s*/, '');
 text = text.replace(/^[\s]*(?:q(?:uestion)?\s*)?\d+[.):]\s*/i, '');
 text = text.replace(/^[\s]*[a-zA-Z][.):]\s*/, '');
 text = text.replace(/^[\s]*(?:module|unit|chapter|section|topic|week|lesson|part|lecture)\s*\d*[\s:\-–]*/i, '');
 text = text.replace(/\(\s*\d+[\s\-–]*\d*\s*%?\s*\)/g, '');
 text = text.replace(/\d+[\s\-–]+\d+\s*%/g, '');
 text = text.replace(/\(\s*\d+\s*(?:marks?|points?|hrs?|hours?|credits?|minutes?)\s*\)/gi, '');
 text = text.replace(/\d+\s*(?:marks?|points?|hrs?|hours?|credits?|minutes?)\s*$/gi, '');
 text = text.replace(/\[\s*\d+\s*\]\s*$/g, '');
 text = text.replace(/\/\s*\d+\s*$/g, '');
 text = text.replace(/\s*[-\u2013\u2014:]+\s*$/, '');
 text = text.replace(/^\s*[-\u2013\u2014:]+\s*/, '');
 text = text.replace(/\s{2}/g, ' ').trim();
 return text;
}

function shouldSkip(text: string): boolean {
 if (text.length < 4) return true;
 const lower = text.toLowerCase();
 if (SKIP_PATTERNS.some(p => p.test(lower))) return true;
 if (EXAM_SKIP_PATTERNS.some(p => p.test(lower))) return true;
 if (/^[a-e][.):]/i.test(text) && text.length < 100) return true;
 return false;
}

function startsWithActionVerb(text: string): boolean {
 const lower = text.toLowerCase();
 for (const verb of ACTION_VERBS) {
 if (lower.startsWith(verb + ' ') || lower.startsWith(verb + '\t')) return true;
 }
 return false;
}

function hasPercentageWeight(rawLine: string): boolean {
 return /\(\s*\d+[\s\-–]*\d*\s*%\s*\)/.test(rawLine) || /\d+[\s\-–]+\d+\s*%/.test(rawLine);
}

function isDomainHeader(rawLine: string, cleanedText: string): boolean {
 if (hasPercentageWeight(rawLine) && cleanedText.length > 8) return true;
 const words = cleanedText.split(/\s+/);
 if (words.length <= 6 && cleanedText.length > 8 && !startsWithActionVerb(cleanedText)) {
 if (/^[A-Z]/.test(cleanedText) && !cleanedText.includes('.') && cleanedText.length < 80) {
 return true;
 }
 }
 return false;
}

function isProse(text: string): boolean {
 if (text.length < 30) return false;
 const proseIndicators = /\b(you should|you will|you can|as a candidate|this exam|this course|work closely|work with|responsible for|expected to|able to|proficient at|collaborate with|data analyst|closely with)\b/i;
 if (proseIndicators.test(text)) return true;
 const sentencePattern = /[.!?]\s+[A-Z]/;
 if (sentencePattern.test(text)) return true;
 if (/\.$/.test(text.trim()) && text.length > 40) return true;
 return false;
}

function isSectionHeader(index: number, items: Array<{ text: string }>): boolean {
 const { text } = items[index];
 if (!startsWithActionVerb(text)) return false;

 const words = text.split(/\s+/);
 if (words.length > 8) return false;

 const hasSpecificDetail = /(?:including|such as|for example|e\.g\.|,)/i.test(text);
 if (hasSpecificDetail) return false;

 const isByUsingQualifier = /\bby using\b/i.test(text);

 let followingActionLines = 0;
 for (let j = index + 1; j < items.length && j <= index + 6; j++) {
 if (startsWithActionVerb(items[j].text)) {
 followingActionLines++;
 } else {
 break;
 }
 }

 if (isByUsingQualifier && followingActionLines >= 2) return true;
 if (followingActionLines >= 3) return true;

 return false;
}

export function parseSyllabusText(raw: string): string[] {
 const rawLines = raw.split(/\n/);

 const cleaned: Array<{ raw: string; text: string }> = [];
 for (const rawLine of rawLines) {
 const trimmed = rawLine.trim();
 if (!trimmed) continue;
 const text = cleanText(trimmed);
 if (shouldSkip(text)) continue;
 if (isDomainHeader(rawLine, text)) continue;
 cleaned.push({ raw: rawLine, text });
 }

 const objectives: string[] = [];
 const seen = new Set<string>();

 for (let i = 0; i < cleaned.length; i++) {
 const { text } = cleaned[i];

 if (isProse(text)) continue;
 if (isSectionHeader(i, cleaned)) continue;

 if (startsWithActionVerb(text) || text.length >= 15) {
 const norm = text.toLowerCase();
 if (!seen.has(norm)) {
 seen.add(norm);
 objectives.push(text);
 }
 }
 }

 return objectives;
}

export function parseSyllabusText(raw: string): string[] {
  const lines = raw
    .split(/\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  const cleaned: string[] = [];

  for (const line of lines) {
    let text = line;

    text = text.replace(/^[\s]*[-–—•*◦▪▸►→⇒·∙]+\s*/, '');

    text = text.replace(/^[\s]*(?:q(?:uestion)?\s*)?\d+[\.\)\:]\s*/i, '');
    text = text.replace(/^[\s]*[a-zA-Z][\.\)]\s*/, '');
    text = text.replace(/^[\s]*(?:module|unit|chapter|section|topic|week|lesson|part|lecture)\s*\d*[\s:\-–]*/i, '');

    text = text.replace(/\(\s*\d+[\s\-–]*\d*\s*%?\s*\)/g, '');
    text = text.replace(/\d+[\s\-–]+\d+\s*%/g, '');
    text = text.replace(/\(\s*\d+\s*(?:marks?|points?|hrs?|hours?|credits?|minutes?)\s*\)/gi, '');
    text = text.replace(/\d+\s*(?:marks?|points?|hrs?|hours?|credits?|minutes?)\s*$/gi, '');
    text = text.replace(/\[\s*\d+\s*\]\s*$/g, '');
    text = text.replace(/\/\s*\d+\s*$/g, '');

    text = text.replace(/\s*[\-–—:]+\s*$/, '');
    text = text.replace(/^\s*[\-–—:]+\s*/, '');

    text = text.replace(/\s{2,}/g, ' ').trim();

    if (text.length < 4) continue;

    const lower = text.toLowerCase();

    const skipPatterns = [
      /^(course|exam|assessment|grading|schedule|syllabus|overview|introduction|prerequisite|textbook|reference|instructor|office|email|phone|website|date|time|location|room|building)/i,
      /^(total|final|midterm|quiz|assignment|homework|project|lab|tutorial|seminar|workshop|review|revision|summary|conclusion|appendix|bibliography|glossary|index)/i,
      /^page\s*\d/i,
      /^copyright/i,
      /^\d+$/,
    ];
    if (skipPatterns.some(p => p.test(lower))) continue;

    const examSkipPatterns = [
      /^(answer|correct answer|solution|ans)\s*[:=]/i,
      /^(choose|select|pick|mark|circle|indicate|identify which|tick)\s+(the|all|one|two|three|correct|best|most)/i,
      /^(instructions?|directions?|read|note|time allowed|duration|attempt|answer all|section [a-z])\s*[:.\-–]/i,
      /^(true|false)\s*$/i,
      /^[a-e][\.\)]\s*.{1,80}$/i,
      /^(none of the above|all of the above|both [a-e] and [a-e]|not applicable)/i,
      /^(figure|diagram|table|image|refer to|see|shown below|given below|the following)/i,
      /^\d+\s*\/\s*\d+\s*$/,
      /^(name|student|date|class|grade|score|id|roll)\s*[:_]/i,
      /^_{3,}$/,
      /^\.{3,}$/,
      /^(end of|stop here|do not|turn over|continued|go to)/i,
    ];
    if (examSkipPatterns.some(p => p.test(lower))) continue;

    if (/^[a-e][\.\)]\s/i.test(text) && text.length < 100) continue;

    if (!cleaned.includes(text)) {
      cleaned.push(text);
    }
  }

  return cleaned;
}

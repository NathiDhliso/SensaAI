/**
 * Exam Objectives Fetcher
 * 
 * Lightweight web fetch service that grabs the latest exam objectives
 * from official sources before content generation.
 * 
 * Supports common certification providers and exam formats.
 */

import { toast } from '@/shared/utils/toast';

export interface ExamObjective {
  id: string;
  title: string;
  description: string;
  weight?: number; // Percentage weight on exam
  subObjectives?: ExamObjective[];
  source: string;
  lastUpdated: string;
}

export interface ExamObjectivesResult {
  examCode: string;
  examTitle: string;
  objectives: ExamObjective[];
  source: string;
  fetchedAt: string;
  totalObjectives: number;
}

export interface FetchOptions {
  timeout?: number; // Default 10 seconds
  retries?: number; // Default 2
  includeSubObjectives?: boolean; // Default true
}

// Known exam objective sources
const EXAM_SOURCES = {
  // AWS Certifications
  'aws-saa-c03': 'https://d1.awsstatic.com/training-and-certification/docs-sa-assoc/AWS-Certified-Solutions-Architect-Associate_Exam-Guide.pdf',
  'aws-sap-c02': 'https://d1.awsstatic.com/training-and-certification/docs-sa-pro/AWS-Certified-Solutions-Architect-Professional_Exam-Guide.pdf',
  'aws-dva-c02': 'https://d1.awsstatic.com/training-and-certification/docs-dev-associate/AWS-Certified-Developer-Associate_Exam-Guide.pdf',
  'aws-soa-c02': 'https://d1.awsstatic.com/training-and-certification/docs-sysops-associate/AWS-Certified-SysOps-Administrator-Associate_Exam-Guide.pdf',

  // Microsoft Azure
  'az-104': 'https://query.prod.cms.rt.microsoft.com/cms/api/am/binary/RE4pCWy',
  'az-204': 'https://query.prod.cms.rt.microsoft.com/cms/api/am/binary/RE4nMqP',
  'az-303': 'https://query.prod.cms.rt.microsoft.com/cms/api/am/binary/RE4psD6',
  'pl-300': 'https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/pl-300',
  'pl-900': 'https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/pl-900',
  'dp-203': 'https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/dp-203',

  // Google Cloud
  'gcp-ace': 'https://cloud.google.com/certification/guides/cloud-engineer',
  'gcp-pca': 'https://cloud.google.com/certification/guides/professional-cloud-architect',

  // CompTIA
  'comptia-security-plus': 'https://www.comptia.org/certifications/security',
  'comptia-network-plus': 'https://www.comptia.org/certifications/network',

  // Cisco
  'ccna': 'https://www.cisco.com/c/en/us/training-events/training-certifications/certifications/associate/ccna.html',
  'ccnp': 'https://www.cisco.com/c/en/us/training-events/training-certifications/certifications/professional/ccnp-enterprise.html',
} as const;

/**
 * Detect exam code from subject string
 */
export function detectExamCode(subject: string): string | null {
  const normalized = subject.toLowerCase().replace(/[^a-z0-9]/g, '');

  // Direct matches
  for (const [code] of Object.entries(EXAM_SOURCES)) {
    const normalizedCode = code.replace(/[^a-z0-9]/g, '');
    if (normalized.includes(normalizedCode)) {
      return code;
    }
  }

  // Pattern matches
  if (normalized.includes('aws') && normalized.includes('solution')) return 'aws-saa-c03';
  if (normalized.includes('aws') && normalized.includes('developer')) return 'aws-dva-c02';
  if (normalized.includes('aws') && normalized.includes('sysops')) return 'aws-soa-c02';
  if (normalized.includes('azure') && normalized.includes('administrator')) return 'az-104';
  if (normalized.includes('azure') && normalized.includes('developer')) return 'az-204';
  if (normalized.includes('power') && normalized.includes('bi')) return 'pl-300';
  if (normalized.includes('data') && normalized.includes('analyst')) return 'pl-300';
  if (normalized.includes('gcp') || normalized.includes('google')) return 'gcp-ace';
  if (normalized.includes('security') && normalized.includes('plus')) return 'comptia-security-plus';
  if (normalized.includes('ccna')) return 'ccna';

  return null;
}

/**
 * Fetch exam objectives from official sources
 */
export async function fetchExamObjectives(
  subject: string,
  options: FetchOptions = {}
): Promise<ExamObjectivesResult | null> {
  const {
    timeout = 10000,
    retries = 2,
    includeSubObjectives = true
  } = options;

  // Detect exam code
  const examCode = detectExamCode(subject);
  if (!examCode) {
    console.log(`[ExamFetcher] No known exam pattern detected for: ${subject}`);
    return null;
  }

  const sourceUrl = EXAM_SOURCES[examCode as keyof typeof EXAM_SOURCES];
  if (!sourceUrl) {
    console.log(`[ExamFetcher] No source URL configured for: ${examCode}`);
    return null;
  }

  console.log(`[ExamFetcher] Fetching objectives for ${examCode} from ${sourceUrl}`);

  // For now, skip PDF parsing and return a graceful fallback
  // PDF parsing requires additional libraries (pdf-parse, pdfjs-dist)
  // which add significant bundle size
  console.log(`[ExamFetcher] PDF parsing not yet implemented. Using fallback objectives.`);
  
  // Return a basic structure that indicates we know about this exam
  // but couldn't fetch the latest objectives
  const result: ExamObjectivesResult = {
    examCode,
    examTitle: getExamTitle(examCode),
    objectives: getFallbackObjectives(examCode),
    source: 'Fallback (PDF parsing not implemented)',
    fetchedAt: new Date().toISOString(),
    totalObjectives: 0,
  };

  return result;
}

/**
 * Parse exam objectives from fetched content
 */
function parseExamObjectives(
  examCode: string,
  content: string,
  includeSubObjectives: boolean
): ExamObjective[] {
  const objectives: ExamObjective[] = [];

  try {
    // AWS exam guides (PDF text extraction patterns)
    if (examCode.startsWith('aws-')) {
      return parseAWSObjectives(content, includeSubObjectives);
    }

    // Microsoft Azure & Power Platform & Data
    if (examCode.startsWith('az-') || examCode.startsWith('pl-') || examCode.startsWith('dp-')) {
      return parseAzureObjectives(content, includeSubObjectives);
    }

    // Google Cloud
    if (examCode.startsWith('gcp-')) {
      return parseGCPObjectives(content, includeSubObjectives);
    }

    // CompTIA
    if (examCode.startsWith('comptia-')) {
      return parseCompTIAObjectives(content, includeSubObjectives);
    }

    // Cisco
    if (examCode.startsWith('ccna') || examCode.startsWith('ccnp')) {
      return parseCiscoObjectives(content, includeSubObjectives);
    }

    // Generic fallback parser
    return parseGenericObjectives(content, includeSubObjectives);

  } catch (error) {
    console.error(`[ExamFetcher] Parse error for ${examCode}:`, error);
    return [];
  }
}

/**
 * Parse AWS exam objectives
 */
function parseAWSObjectives(content: string, includeSubObjectives: boolean): ExamObjective[] {
  const objectives: ExamObjective[] = [];

  // AWS exam guides typically have "Domain X:" patterns
  const domainPattern = /Domain\s+(\d+):\s*([^\n]+)/gi;
  const taskPattern = /Task\s+(\d+(?:\.\d+)?):\s*([^\n]+)/gi;

  let match;
  let currentDomain: ExamObjective | null = null;

  // Extract domains
  while ((match = domainPattern.exec(content)) !== null) {
    const [, number, title] = match;

    // Extract weight if present (e.g., "22% of scored content")
    const weightMatch = content.match(new RegExp(`Domain\\s+${number}[^%]*?(\\d+)%`, 'i'));
    const weight = weightMatch ? parseInt(weightMatch[1]) : undefined;

    currentDomain = {
      id: `domain-${number}`,
      title: title.trim(),
      description: `Domain ${number}: ${title.trim()}`,
      weight,
      subObjectives: [],
      source: 'AWS Exam Guide',
      lastUpdated: new Date().toISOString(),
    };

    objectives.push(currentDomain);
  }

  // Extract tasks if including sub-objectives
  if (includeSubObjectives && currentDomain) {
    taskPattern.lastIndex = 0; // Reset regex
    while ((match = taskPattern.exec(content)) !== null) {
      const [, taskNumber, taskTitle] = match;

      // Find which domain this task belongs to
      const domainNumber = Math.floor(parseFloat(taskNumber));
      const domain = objectives.find(obj => obj.id === `domain-${domainNumber}`);

      if (domain) {
        domain.subObjectives = domain.subObjectives || [];
        domain.subObjectives.push({
          id: `task-${taskNumber}`,
          title: taskTitle.trim(),
          description: taskTitle.trim(),
          source: 'AWS Exam Guide',
          lastUpdated: new Date().toISOString(),
        });
      }
    }
  }

  return objectives;
}

/**
 * Parse Azure exam objectives
 */
function parseAzureObjectives(content: string, _includeSubObjectives: boolean): ExamObjective[] {
  const objectives: ExamObjective[] = [];

  // Azure typically uses "Skills measured" sections
  // const skillPattern = /(?:Skills?\s+measured|Audience\s+profile)[:\s]*([^\n]+)/gi;
  const sectionPattern = /([A-Z][^(]*)\s*\((\d+)[-–](\d+)%\)/g;

  let match;

  // Extract main skill areas with weights
  while ((match = sectionPattern.exec(content)) !== null) {
    const [, title, minWeight, maxWeight] = match;
    const avgWeight = Math.round((parseInt(minWeight) + parseInt(maxWeight)) / 2);

    objectives.push({
      id: `skill-${objectives.length + 1}`,
      title: title.trim(),
      description: title.trim(),
      weight: avgWeight,
      subObjectives: [],
      source: 'Microsoft Learn',
      lastUpdated: new Date().toISOString(),
    });
  }

  return objectives;
}

/**
 * Parse Google Cloud exam objectives
 */
function parseGCPObjectives(content: string, _includeSubObjectives: boolean): ExamObjective[] {
  const objectives: ExamObjective[] = [];

  // GCP typically lists sections with bullet points
  const sectionPattern = /Section\s+(\d+)[:\.]?\s*([^\n]+)/gi;
  // const bulletPattern = /[•·▪▫]\s*([^\n]+)/g;

  let match;

  while ((match = sectionPattern.exec(content)) !== null) {
    const [, number, title] = match;

    objectives.push({
      id: `section-${number}`,
      title: title.trim(),
      description: `Section ${number}: ${title.trim()}`,
      subObjectives: [],
      source: 'Google Cloud',
      lastUpdated: new Date().toISOString(),
    });
  }

  return objectives;
}

/**
 * Parse CompTIA exam objectives
 */
function parseCompTIAObjectives(content: string, _includeSubObjectives: boolean): ExamObjective[] {
  const objectives: ExamObjective[] = [];

  // CompTIA uses numbered domains
  const domainPattern = /(\d+\.\d+)\s+([^\n]+)/g;

  let match;

  while ((match = domainPattern.exec(content)) !== null) {
    const [, number, title] = match;

    objectives.push({
      id: `objective-${number}`,
      title: title.trim(),
      description: `${number} ${title.trim()}`,
      source: 'CompTIA',
      lastUpdated: new Date().toISOString(),
    });
  }

  return objectives;
}

/**
 * Parse Cisco exam objectives
 */
function parseCiscoObjectives(content: string, _includeSubObjectives: boolean): ExamObjective[] {
  const objectives: ExamObjective[] = [];

  // Cisco typically uses percentage-based topics
  const topicPattern = /([A-Z][^%]*?)\s*(\d+)%/g;

  let match;

  while ((match = topicPattern.exec(content)) !== null) {
    const [, title, weight] = match;

    objectives.push({
      id: `topic-${objectives.length + 1}`,
      title: title.trim(),
      description: title.trim(),
      weight: parseInt(weight),
      source: 'Cisco',
      lastUpdated: new Date().toISOString(),
    });
  }

  return objectives;
}

/**
 * Generic objective parser for unknown formats
 */
function parseGenericObjectives(content: string, _includeSubObjectives: boolean): ExamObjective[] {
  const objectives: ExamObjective[] = [];

  // Look for common patterns: numbered lists, bullet points, headers
  const patterns = [
    /(\d+\.\d*)\s*([^\n]+)/g, // 1.1 Topic
    /([A-Z][^:\n]*?):\s*([^\n]+)/g, // Topic: Description
    /[•·▪▫-]\s*([^\n]+)/g, // • Bullet point
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const title = match[2] || match[1];
      if (title && title.length > 10 && title.length < 200) {
        objectives.push({
          id: `generic-${objectives.length + 1}`,
          title: title.trim(),
          description: title.trim(),
          source: 'Generic Parser',
          lastUpdated: new Date().toISOString(),
        });
      }
    }

    if (objectives.length > 0) break; // Use first successful pattern
  }

  return objectives;
}

/**
 * Get human-readable exam title
 */
function getExamTitle(examCode: string): string {
  const titles: Record<string, string> = {
    'aws-saa-c03': 'AWS Certified Solutions Architect - Associate',
    'aws-sap-c02': 'AWS Certified Solutions Architect - Professional',
    'aws-dva-c02': 'AWS Certified Developer - Associate',
    'aws-soa-c02': 'AWS Certified SysOps Administrator - Associate',
    'az-104': 'Microsoft Azure Administrator',
    'az-204': 'Developing Solutions for Microsoft Azure',
    'az-303': 'Microsoft Azure Architect Technologies',
    'gcp-ace': 'Google Cloud Associate Cloud Engineer',
    'gcp-pca': 'Google Cloud Professional Cloud Architect',
    'comptia-security-plus': 'CompTIA Security+',
    'comptia-network-plus': 'CompTIA Network+',
    'ccna': 'Cisco Certified Network Associate',
    'ccnp': 'Cisco Certified Network Professional',
  };

  return titles[examCode] || examCode.toUpperCase();
}

/**
 * Get fallback objectives when fetching fails
 */
function getFallbackObjectives(examCode: string): ExamObjective[] {
  // Return empty array - the AI will generate content based on the exam title
  // without specific objectives
  return [];
}

/**
 * Format objectives as context string for AI generation
 */
export function formatObjectivesAsContext(result: ExamObjectivesResult): string {
  let context = `EXAM OBJECTIVES FOR ${result.examTitle} (${result.examCode.toUpperCase()})\n`;
  context += `Source: ${result.source}\n`;
  context += `Fetched: ${new Date(result.fetchedAt).toLocaleDateString()}\n\n`;

  if (result.objectives.length === 0) {
    context += "NOTE: Specific exam objectives could not be fetched. Generate content based on the exam title and common knowledge of this certification.\n\n";
    return context;
  }

  context += `Total Objectives: ${result.totalObjectives}\n\n`;
  context += "CRITICAL INSTRUCTION: Map all generated concepts directly to these official exam objectives.\n\n";

  for (const objective of result.objectives) {
    context += `${objective.id}: ${objective.title}`;
    if (objective.weight) {
      context += ` (${objective.weight}% weight)`;
    }
    context += `\n`;

    if (objective.subObjectives && objective.subObjectives.length > 0) {
      for (const sub of objective.subObjectives) {
        context += `  - ${sub.title}\n`;
      }
    }
    context += `\n`;
  }

  return context;
}
/**
 * CLM Enhancement Types
 * Type definitions for advanced CLM features:
 * - Generation Health Monitor
 * - Comparative Analysis Auditor
 * - Smart Regeneration Recommender
 * - Learner Feedback Integration
 * - Automated A/B Testing
 * - Cost Optimization Analyzer
 * - Dependency Impact Analyzer
 * - AI JSON Edit Guardian
 */

// ============================================================================
// 1. Generation Health Monitor
// ============================================================================

export type HealthStatus = 'healthy' | 'warning' | 'critical' | 'unknown';

export interface GenerationHealthDiagnostic {
  id: string;
  category: 'token-limit' | 'lambda-timeout' | 'api-throttle' | 'low-concepts' | 'domain-gap' | 'model-error';
  message: string;
  severity: 'info' | 'warning' | 'error';
  suggestedAction: string;
  documentationUrl?: string;
}

export interface GenerationHealthScore {
  overall: number; // 0-100
  conceptCount: HealthMetric;
  domainCoverage: HealthMetric;
  executionTime: HealthMetric;
  tokenUtilization: HealthMetric;
  errorRate: HealthMetric;
}

export interface HealthMetric {
  value: number;
  baseline: number;
  status: HealthStatus;
  trend: 'improving' | 'stable' | 'declining';
  delta: number; // percentage change from baseline
}

export interface GenerationHealthReport {
  subject: string;
  generationId: string;
  timestamp: string;
  healthScore: GenerationHealthScore;
  diagnostics: GenerationHealthDiagnostic[];
  conceptCount: number;
  expectedConceptBaseline: number;
  domainCount: number;
  expectedDomainMinimum: number;
  executionTimeMs: number;
  timeoutThresholdMs: number;
  tokensUsed: number;
  tokenLimit: number;
  nearTimeout: boolean;
  insufficientDomains: boolean;
  lowConceptCount: boolean;
}

// ============================================================================
// 2. Comparative Analysis Auditor
// ============================================================================

export type RegressionType = 'concept-count' | 'quality-score' | 'coverage' | 'domain-loss' | 'connection-loss';

export interface VersionComparison {
  subject: string;
  previousVersion: VersionSnapshot;
  currentVersion: VersionSnapshot;
  regressions: Regression[];
  improvements: Improvement[];
  overallVerdict: 'better' | 'worse' | 'mixed' | 'equivalent';
  confidenceScore: number;
  recommendation: 'keep-current' | 'rollback' | 'partial-rollback' | 'needs-review';
}

export interface VersionSnapshot {
  versionId: string;
  timestamp: string;
  conceptCount: number;
  domainCount: number;
  qualityScore: number;
  coveragePercentage: number;
  conceptIds: string[];
  domainBreakdown: Record<string, number>;
}

export interface Regression {
  type: RegressionType;
  severity: 'minor' | 'moderate' | 'severe';
  description: string;
  previousValue: number | string;
  currentValue: number | string;
  affectedConcepts: string[];
  suggestedAction: string;
}

export interface Improvement {
  type: string;
  description: string;
  previousValue: number | string;
  currentValue: number | string;
  impact: 'low' | 'medium' | 'high';
}

// ============================================================================
// 3. Smart Regeneration Recommender
// ============================================================================

export type UpdateStrategy = 'full-regeneration' | 'surgical-update' | 'partial-regeneration' | 'no-action';

export interface RegenerationRecommendation {
  subject: string;
  recommendedStrategy: UpdateStrategy;
  confidence: number; // 0-100
  reasoning: string;
  strategies: StrategyOption[];
  domainAnalysis: DomainRegenerationAnalysis[];
  estimatedImpact: ImpactEstimate;
}

export interface StrategyOption {
  strategy: UpdateStrategy;
  description: string;
  estimatedCostUsd: number;
  estimatedTimeMinutes: number;
  estimatedTokens: number;
  riskLevel: 'low' | 'medium' | 'high';
  pros: string[];
  cons: string[];
  affectedConceptCount: number;
  confidenceScore: number;
}

export interface DomainRegenerationAnalysis {
  domain: string;
  needsRegeneration: boolean;
  reason: string;
  staleness: number; // 0-100
  qualityScore: number; // 0-100
  conceptCount: number;
  lastUpdated: string;
}

export interface ImpactEstimate {
  conceptsAffected: number;
  learnersAffected: number;
  estimatedDowntimeMinutes: number;
  learningPathDisruption: 'none' | 'minimal' | 'moderate' | 'significant';
}

// ============================================================================
// 4. Learner Feedback Integration
// ============================================================================

export interface LearnerPerformanceData {
  conceptId: string;
  conceptName: string;
  domain: string;
  averageMasteryScore: number;
  medianMasteryScore: number;
  attemptsToMastery: number;
  learnerCount: number;
  consistentlyStruggledBy: number; // percentage of learners struggling
  commonErrors: CommonError[];
  masteryDistribution: MasteryBucket[];
}

export interface CommonError {
  errorType: string;
  frequency: number;
  description: string;
  suggestedClarification: string;
}

export interface MasteryBucket {
  range: string; // e.g., "0-20", "21-40"
  count: number;
  percentage: number;
}

export interface LearnerFeedbackReport {
  subject: string;
  totalLearners: number;
  reportDate: string;
  problemConcepts: LearnerPerformanceData[];
  heatmapData: HeatmapCell[];
  overallMasteryAverage: number;
  clarificationSuggestions: ClarificationSuggestion[];
}

export interface HeatmapCell {
  conceptId: string;
  conceptName: string;
  domain: string;
  masteryScore: number; // 0-100
  difficulty: number; // 0-100
  learnerCount: number;
  color: string; // computed hex color
}

export interface ClarificationSuggestion {
  conceptId: string;
  conceptName: string;
  currentExplanation: string;
  suggestedExplanation: string;
  reasoning: string;
  basedOnErrors: string[];
  confidenceScore: number;
}

// ============================================================================
// 5. Automated A/B Testing
// ============================================================================

export type ABTestStatus = 'draft' | 'running' | 'paused' | 'completed' | 'cancelled';
export type ABMetricType = 'mastery-score' | 'time-to-mastery' | 'retention' | 'satisfaction' | 'error-rate';

export interface ABTest {
  testId: string;
  subject: string;
  name: string;
  description: string;
  status: ABTestStatus;
  variantA: ABVariant;
  variantB: ABVariant;
  trafficSplit: number; // percentage going to variant B (0-100)
  metrics: ABMetricType[];
  startDate: string;
  endDate?: string;
  minimumSampleSize: number;
  currentSampleSize: number;
  results?: ABTestResults;
  createdBy: string;
  createdAt: string;
}

export interface ABVariant {
  id: string;
  name: string;
  description: string;
  versionId: string;
  conceptIds: string[];
  learnerCount: number;
}

export interface ABTestResults {
  winner: 'A' | 'B' | 'inconclusive';
  statisticalSignificance: number; // p-value
  confidenceLevel: number; // percentage
  metricComparisons: MetricComparison[];
  sampleSizeA: number;
  sampleSizeB: number;
  recommendation: string;
}

export interface MetricComparison {
  metric: ABMetricType;
  variantAValue: number;
  variantBValue: number;
  difference: number;
  percentChange: number;
  pValue: number;
  isSignificant: boolean;
  winner: 'A' | 'B' | 'tie';
}

// ============================================================================
// 6. Cost Optimization Analyzer
// ============================================================================

export type CostCategory = 'generation' | 'audit' | 'update' | 'storage' | 'compute';

export interface CostReport {
  subject: string;
  period: { start: string; end: string };
  totalCostUsd: number;
  costPerLearner: number;
  breakdown: CostBreakdown[];
  trends: CostTrend[];
  optimizations: CostOptimization[];
  alerts: CostAlert[];
  projections: CostProjection;
}

export interface CostBreakdown {
  category: CostCategory;
  costUsd: number;
  percentage: number;
  itemCount: number;
  details: string;
}

export interface CostTrend {
  date: string;
  totalCost: number;
  byCategory: Record<CostCategory, number>;
}

export interface CostOptimization {
  id: string;
  title: string;
  description: string;
  estimatedSavingsUsd: number;
  estimatedSavingsPercentage: number;
  effort: 'low' | 'medium' | 'high';
  category: CostCategory;
  recommendation: string;
  implementation: string;
}

export interface CostAlert {
  id: string;
  type: 'threshold-exceeded' | 'spike-detected' | 'budget-warning' | 'anomaly';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  currentValue: number;
  threshold: number;
  timestamp: string;
}

export interface CostProjection {
  nextMonthEstimate: number;
  nextQuarterEstimate: number;
  annualEstimate: number;
  assumptions: string[];
}

// ============================================================================
// 7. Dependency Impact Analyzer
// ============================================================================

export type DependencyType = 'prerequisite' | 'related' | 'builds-on' | 'alternative' | 'traces-connection';

export interface DependencyGraph {
  subject: string;
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  clusters: DependencyCluster[];
}

export interface DependencyNode {
  conceptId: string;
  conceptName: string;
  domain: string;
  tier: 'trunk' | 'branch' | 'leaf';
  inDegree: number;
  outDegree: number;
  criticalityScore: number; // 0-100, how many concepts depend on this
}

export interface DependencyEdge {
  source: string;
  target: string;
  type: DependencyType;
  strength: number; // 0-100
}

export interface DependencyCluster {
  id: string;
  name: string;
  conceptIds: string[];
  internalCohesion: number; // 0-100
}

export interface ImpactAnalysis {
  targetConceptId: string;
  targetConceptName: string;
  changeType: 'modify' | 'delete' | 'restructure';
  directImpacts: ConceptImpact[];
  transitiveImpacts: ConceptImpact[];
  brokenConnections: BrokenConnection[];
  learningPathDisruptions: LearningPathDisruption[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  overallImpactScore: number; // 0-100
  autoFixSuggestions: AutoFixSuggestion[];
  safeToApply: boolean;
  requiresReview: boolean;
}

export interface ConceptImpact {
  conceptId: string;
  conceptName: string;
  impactType: 'direct' | 'transitive';
  severity: 'low' | 'medium' | 'high';
  description: string;
  hopsFromSource: number;
}

export interface BrokenConnection {
  sourceId: string;
  sourceName: string;
  targetId: string;
  targetName: string;
  connectionType: DependencyType;
  severity: 'warning' | 'error';
  autoFixAvailable: boolean;
}

export interface LearningPathDisruption {
  pathId: string;
  pathName: string;
  affectedSteps: number;
  totalSteps: number;
  severity: 'minor' | 'moderate' | 'severe';
  description: string;
}

export interface AutoFixSuggestion {
  id: string;
  description: string;
  fixType: 'relink' | 'merge' | 'split' | 'reassign-parent' | 'add-bridge-concept';
  affectedConcepts: string[];
  confidenceScore: number;
  estimatedEffort: 'trivial' | 'easy' | 'moderate';
}

// ============================================================================
// 8. AI JSON Edit Guardian
// ============================================================================

export type ValidationSeverity = 'info' | 'warning' | 'error' | 'critical';
export type GuardianAction = 'approve' | 'warn' | 'block' | 'suggest-fix';

export interface JsonEditValidation {
  editId: string;
  timestamp: string;
  editor: string;
  conceptId: string;
  conceptName: string;
  fieldPath: string;
  originalValue: unknown;
  proposedValue: unknown;
  aiAnalysis: AIEditAnalysis;
  validationResults: EditValidationResult[];
  overallAction: GuardianAction;
  requiresApproval: boolean;
}

export interface AIEditAnalysis {
  isValid: boolean;
  confidence: number; // 0-100
  reasoning: string;
  risks: EditRisk[];
  suggestions: EditSuggestion[];
  schemaCompliance: boolean;
  semanticConsistency: boolean;
  factualAccuracy: number; // 0-100
}

export interface EditRisk {
  type: 'schema-violation' | 'semantic-inconsistency' | 'factual-concern' | 'connection-break' | 'data-loss';
  severity: ValidationSeverity;
  description: string;
  affectedField: string;
}

export interface EditSuggestion {
  description: string;
  suggestedValue: unknown;
  reasoning: string;
  confidence: number;
}

export interface EditValidationResult {
  rule: string;
  passed: boolean;
  severity: ValidationSeverity;
  message: string;
  autoFixAvailable: boolean;
  fixedValue?: unknown;
}

export interface GuardianConfig {
  enabled: boolean;
  strictMode: boolean; // block on any warning
  autoApproveThreshold: number; // confidence above which to auto-approve
  requireApprovalFor: string[]; // field paths that always need approval
  bypassForRoles: string[]; // roles that can bypass guardian
}

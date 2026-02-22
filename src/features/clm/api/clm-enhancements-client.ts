/**
 * CLM Enhanced API Client
 * API endpoints for CLM enhancement features:
 * - Generation Health Monitor
 * - Comparative Analysis Auditor
 * - Smart Regeneration Recommender
 * - Learner Feedback Integration
 * - A/B Testing
 * - Cost Optimization
 * - Dependency Impact Analysis
 * - AI JSON Edit Guardian
 */

import { apiClient } from '../../../shared/api/client';
import type {
  GenerationHealthReport,
  VersionComparison,
  RegenerationRecommendation,
  LearnerFeedbackReport,
  ABTest,
  ABTestResults,
  CostReport,
  CostOptimization,
  DependencyGraph,
  ImpactAnalysis,
  JsonEditValidation,
  GuardianConfig,
} from '../types/enhancements';

const BASE_PATH = '/curator';

// ============================================================================
// 1. Generation Health Monitor
// ============================================================================

export const healthMonitorApi = {
  /** Get health report for a specific generation */
  async getHealthReport(subject: string): Promise<GenerationHealthReport> {
    return apiClient.get(`${BASE_PATH}/health/generation/${encodeURIComponent(subject)}`);
  },

  /** Get health reports for all recent generations */
  async getRecentHealthReports(limit: number = 10): Promise<{ reports: GenerationHealthReport[]; total: number }> {
    return apiClient.get(`${BASE_PATH}/health/generation?limit=${limit}`);
  },

  /** Get aggregate health score across all subjects */
  async getAggregateHealth(): Promise<{
    overallScore: number;
    subjectScores: Array<{ subject: string; score: number; status: string }>;
    alertCount: number;
  }> {
    return apiClient.get(`${BASE_PATH}/health/aggregate`);
  },
};

// ============================================================================
// 2. Comparative Analysis Auditor
// ============================================================================

export const comparativeApi = {
  /** Compare current content against a specific prior version */
  async compareVersions(
    subject: string,
    currentVersionId: string,
    previousVersionId: string
  ): Promise<VersionComparison> {
    return apiClient.post(`${BASE_PATH}/compare`, {
      subject,
      currentVersionId,
      previousVersionId,
    });
  },

  /** Compare current content against the most recent previous version */
  async compareLatestVersions(subject: string): Promise<VersionComparison> {
    return apiClient.get(`${BASE_PATH}/compare/${encodeURIComponent(subject)}/latest`);
  },

  /** Get comparison history for a subject */
  async getComparisonHistory(
    subject: string,
    limit: number = 10
  ): Promise<{ comparisons: VersionComparison[]; total: number }> {
    return apiClient.get(`${BASE_PATH}/compare/${encodeURIComponent(subject)}/history?limit=${limit}`);
  },
};

// ============================================================================
// 3. Smart Regeneration Recommender
// ============================================================================

export const regenerationApi = {
  /** Get AI-powered regeneration recommendation */
  async getRecommendation(subject: string): Promise<RegenerationRecommendation> {
    return apiClient.get(`${BASE_PATH}/regeneration/${encodeURIComponent(subject)}/recommend`);
  },

  /** Execute a regeneration strategy */
  async executeStrategy(
    subject: string,
    strategy: string,
    domains?: string[]
  ): Promise<{ jobId: string; estimatedTimeMinutes: number }> {
    return apiClient.post(`${BASE_PATH}/regeneration/${encodeURIComponent(subject)}/execute`, {
      strategy,
      domains,
    });
  },

  /** Get regeneration status */
  async getRegenerationStatus(jobId: string): Promise<{
    status: string;
    progress: number;
    message: string;
  }> {
    return apiClient.get(`${BASE_PATH}/regeneration/status/${jobId}`);
  },
};

// ============================================================================
// 4. Learner Feedback Integration
// ============================================================================

export const learnerFeedbackApi = {
  /** Get learner performance report for a subject */
  async getFeedbackReport(subject: string): Promise<LearnerFeedbackReport> {
    return apiClient.get(`${BASE_PATH}/feedback/${encodeURIComponent(subject)}`);
  },

  /** Get heatmap data for a subject */
  async getHeatmapData(subject: string): Promise<LearnerFeedbackReport['heatmapData']> {
    return apiClient.get(`${BASE_PATH}/feedback/${encodeURIComponent(subject)}/heatmap`);
  },

  /** Generate AI clarification suggestions for struggling concepts */
  async generateClarifications(
    subject: string,
    conceptIds: string[]
  ): Promise<LearnerFeedbackReport['clarificationSuggestions']> {
    return apiClient.post(`${BASE_PATH}/feedback/${encodeURIComponent(subject)}/clarify`, {
      conceptIds,
    });
  },
};

// ============================================================================
// 5. Automated A/B Testing
// ============================================================================

export const abTestingApi = {
  /** Create a new A/B test */
  async createTest(test: Omit<ABTest, 'testId' | 'status' | 'createdAt' | 'results' | 'currentSampleSize'>): Promise<ABTest> {
    return apiClient.post(`${BASE_PATH}/ab-tests`, test);
  },

  /** List all A/B tests */
  async listTests(status?: string): Promise<{ tests: ABTest[]; total: number }> {
    const params = status ? `?status=${status}` : '';
    return apiClient.get(`${BASE_PATH}/ab-tests${params}`);
  },

  /** Get test details and results */
  async getTest(testId: string): Promise<ABTest> {
    return apiClient.get(`${BASE_PATH}/ab-tests/${testId}`);
  },

  /** Start or resume a test */
  async startTest(testId: string): Promise<ABTest> {
    return apiClient.post(`${BASE_PATH}/ab-tests/${testId}/start`, {});
  },

  /** Pause a running test */
  async pauseTest(testId: string): Promise<ABTest> {
    return apiClient.post(`${BASE_PATH}/ab-tests/${testId}/pause`, {});
  },

  /** Complete a test and get final results */
  async completeTest(testId: string): Promise<ABTestResults> {
    return apiClient.post(`${BASE_PATH}/ab-tests/${testId}/complete`, {});
  },

  /** Cancel a test */
  async cancelTest(testId: string): Promise<void> {
    return apiClient.post(`${BASE_PATH}/ab-tests/${testId}/cancel`, {});
  },
};

// ============================================================================
// 6. Cost Optimization Analyzer
// ============================================================================

export const costApi = {
  /** Get cost report for a period */
  async getCostReport(startDate: string, endDate: string): Promise<CostReport> {
    return apiClient.get(`${BASE_PATH}/costs?startDate=${startDate}&endDate=${endDate}`);
  },

  /** Get cost optimizations */
  async getOptimizations(): Promise<{ optimizations: CostOptimization[]; totalPotentialSavings: number }> {
    return apiClient.get(`${BASE_PATH}/costs/optimizations`);
  },

  /** Get cost per learner metrics */
  async getCostPerLearner(subject?: string): Promise<{
    overall: number;
    bySubject: Array<{ subject: string; costPerLearner: number; learnerCount: number }>;
  }> {
    const params = subject ? `?subject=${encodeURIComponent(subject)}` : '';
    return apiClient.get(`${BASE_PATH}/costs/per-learner${params}`);
  },

  /** Set cost alert thresholds */
  async setAlertThresholds(thresholds: Record<string, number>): Promise<void> {
    return apiClient.post(`${BASE_PATH}/costs/alerts/thresholds`, thresholds);
  },
};

// ============================================================================
// 7. Dependency Impact Analyzer
// ============================================================================

export const dependencyApi = {
  /** Get dependency graph for a subject */
  async getDependencyGraph(subject: string): Promise<DependencyGraph> {
    return apiClient.get(`${BASE_PATH}/dependencies/${encodeURIComponent(subject)}`);
  },

  /** Analyze impact of changing a concept */
  async analyzeImpact(
    conceptId: string,
    changeType: 'modify' | 'delete' | 'restructure'
  ): Promise<ImpactAnalysis> {
    return apiClient.post(`${BASE_PATH}/dependencies/impact`, {
      conceptId,
      changeType,
    });
  },

  /** Check safety before applying changes */
  async safetyCheck(
    conceptIds: string[],
    changeType: 'modify' | 'delete' | 'restructure'
  ): Promise<{
    safe: boolean;
    issues: Array<{ conceptId: string; issue: string; severity: string }>;
  }> {
    return apiClient.post(`${BASE_PATH}/dependencies/safety-check`, {
      conceptIds,
      changeType,
    });
  },

  /** Apply auto-fix for broken connections */
  async applyAutoFix(fixId: string): Promise<{
    success: boolean;
    fixedConnections: number;
    details: string;
  }> {
    return apiClient.post(`${BASE_PATH}/dependencies/auto-fix/${fixId}`, {});
  },
};

// ============================================================================
// 8. AI JSON Edit Guardian
// ============================================================================

export const guardianApi = {
  /** Validate a JSON edit before saving */
  async validateEdit(
    conceptId: string,
    fieldPath: string,
    originalValue: unknown,
    proposedValue: unknown
  ): Promise<JsonEditValidation> {
    return apiClient.post(`${BASE_PATH}/guardian/validate`, {
      conceptId,
      fieldPath,
      originalValue,
      proposedValue,
    });
  },

  /** Get guardian configuration */
  async getConfig(): Promise<GuardianConfig> {
    return apiClient.get(`${BASE_PATH}/guardian/config`);
  },

  /** Update guardian configuration */
  async updateConfig(config: Partial<GuardianConfig>): Promise<GuardianConfig> {
    return apiClient.post(`${BASE_PATH}/guardian/config`, config);
  },

  /** Get validation history for recent edits */
  async getValidationHistory(limit: number = 20): Promise<{
    validations: JsonEditValidation[];
    total: number;
  }> {
    return apiClient.get(`${BASE_PATH}/guardian/history?limit=${limit}`);
  },

  /** Override guardian decision (with reason) */
  async overrideDecision(
    editId: string,
    overrideReason: string
  ): Promise<{ success: boolean }> {
    return apiClient.post(`${BASE_PATH}/guardian/override`, {
      editId,
      overrideReason,
    });
  },
};

/**
 * CLM Curator Routes
 * API endpoints for the Content Lifecycle Management curator dashboard
 */

import { Router, Request, Response } from 'express';
import { logger } from '../../../shared/utils/logger.js';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import {
  listAuditsBySubject,
  getAuditJob,
  getFindingsForAudit,
  updateFindingStatus,
  listPendingFindings,
} from '../data/audit-repository.js';
import {
  getConceptVersionHistory,

  rollbackConcept,
} from '../services/version-control.js';
import {
  getChangesInRange,
  getChangeAnalytics,
  getRecentChanges,
} from '../services/audit-trail.js';
import type {
  AuditType,
  AuditStatus,
  Severity,
  FindingStatus,
} from '../types/index.js';

export const curatorRouter = Router();

const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION || 'us-east-1' });

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get user ID from request (from auth middleware)
 */
function getUserId(req: Request): string {
  return (req as any).user?.id || (req as any).user?.sub || 'unknown';
}

/**
 * Check if user has curator role.
 * Reads 'custom:role' from the JWT payload attached by authMiddleware.
 */
function isCurator(req: Request): boolean {
  const user = (req as any).user;
  if (!user) return false;
  const role: string | undefined = user.role || user['custom:role'];
  return role === 'curator' || role === 'admin';
}

/**
 * Check if user has expert role
 */
function isExpert(req: Request): boolean {
  const user = (req as any).user;
  if (!user) return false;
  const role: string | undefined = user.role || user['custom:role'];
  return role === 'admin';
}

// ============================================================================
// Audit Management Routes
// ============================================================================

/**
 * GET /api/curator/audits
 * List audits with filtering and pagination
 */
curatorRouter.get('/audits', async (req: Request, res: Response) => {
  try {
    if (!isCurator(req)) {
      res.status(403).json({ error: 'Curator role required' });
      return;
    }

    const {
      subject,
      status,
      limit = '50',
      page = '1',
    } = req.query;

    // Fetch audits by subject (return empty list if no subject - allows UI to load)
    if (!subject || typeof subject !== 'string') {
      res.json({
        audits: [],
        total: 0,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
      });
      return;
    }

    const audits = await listAuditsBySubject(subject, parseInt(limit as string));

    // Filter by status if provided
    let filteredAudits = audits;
    if (status && typeof status === 'string') {
      filteredAudits = audits.filter(audit => audit.status === status);
    }

    // Simple pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedAudits = filteredAudits.slice(startIndex, startIndex + limitNum);

    res.json({
      audits: paginatedAudits,
      total: filteredAudits.length,
      page: pageNum,
      limit: limitNum,
    });
  } catch (error) {
    logger.error('[Curator] List audits error:', error);
    res.status(500).json({ error: 'Failed to list audits' });
  }
});

/**
 * GET /api/curator/audits/:auditId
 * Get audit details with findings
 */
curatorRouter.get('/audits/:auditId', async (req: Request, res: Response) => {
  try {
    if (!isCurator(req)) {
      res.status(403).json({ error: 'Curator role required' });
      return;
    }

    const { auditId } = req.params;

    // Get audit metadata
    const audit = await getAuditJob(auditId);
    if (!audit) {
      res.status(404).json({ error: 'Audit not found' });
      return;
    }

    // Get findings
    const findings = await getFindingsForAudit(auditId);

    res.json({
      audit,
      findings,
    });
  } catch (error) {
    logger.error('[Curator] Get audit error:', error);
    res.status(500).json({ error: 'Failed to get audit' });
  }
});

/**
 * POST /api/curator/audits/trigger
 * Trigger on-demand audit
 */
curatorRouter.post('/audits/trigger', async (req: Request, res: Response) => {
  try {
    if (!isCurator(req)) {
      res.status(403).json({ error: 'Curator role required' });
      return;
    }

    const {
      subject,
      auditTypes,
      priority = 'medium',
      conceptIds,
      examObjectives,
    } = req.body;

    if (!subject || !auditTypes || !Array.isArray(auditTypes)) {
      res.status(400).json({ error: 'Subject and auditTypes required' });
      return;
    }

    const curatorId = getUserId(req);

    // Invoke orchestrator Lambda
    const payload = {
      action: 'trigger',
      config: {
        subject,
        auditTypes,
        priority,
        triggeredBy: 'curator',
        curatorId,
        scope: {
          conceptIds,
          examObjectives,
        },
      },
    };

    const command = new InvokeCommand({
      FunctionName: process.env.CLM_ORCHESTRATOR_FUNCTION || 'clm-orchestrator',
      InvocationType: 'RequestResponse',
      Payload: JSON.stringify(payload),
    });

    const response = await lambdaClient.send(command);
    const result = JSON.parse(new TextDecoder().decode(response.Payload));

    if (result.statusCode === 200) {
      const body = JSON.parse(result.body);
      res.json(body);
    } else {
      res.status(result.statusCode).json(JSON.parse(result.body));
    }
  } catch (error) {
    logger.error('[Curator] Trigger audit error:', error);
    // Handle missing Lambda function gracefully (common in dev environments)
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('Function not found') || errorMessage.includes('ResourceNotFoundException')) {
      res.status(503).json({ 
        error: 'CLM orchestrator not available',
        message: 'The CLM orchestrator Lambda is not deployed. Deploy the CLM infrastructure or run audits against production.',
      });
      return;
    }
    res.status(500).json({ error: 'Failed to trigger audit' });
  }
});

// ============================================================================
// Finding Management Routes
// ============================================================================

/**
 * POST /api/curator/findings/approve
 * Approve one or more findings
 */
curatorRouter.post('/findings/approve', async (req: Request, res: Response) => {
  try {
    if (!isCurator(req)) {
      res.status(403).json({ error: 'Curator role required' });
      return;
    }

    const { findingIds, auditId, notes } = req.body;

    if (!findingIds || !Array.isArray(findingIds) || !auditId) {
      res.status(400).json({ error: 'findingIds and auditId required' });
      return;
    }

    const curatorId = getUserId(req);
    const approved: string[] = [];
    const failed: Array<{ findingId: string; error: string }> = [];

    // Approve each finding
    for (const findingId of findingIds) {
      try {
        await updateFindingStatus(auditId, findingId, 'approved', curatorId);
        approved.push(findingId);
      } catch (error) {
        failed.push({
          findingId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    res.json({
      approved,
      failed,
    });
  } catch (error) {
    logger.error('[Curator] Approve findings error:', error);
    res.status(500).json({ error: 'Failed to approve findings' });
  }
});

/**
 * POST /api/curator/findings/reject
 * Reject one or more findings
 */
curatorRouter.post('/findings/reject', async (req: Request, res: Response) => {
  try {
    if (!isCurator(req)) {
      res.status(403).json({ error: 'Curator role required' });
      return;
    }

    const { findingIds, auditId, reason } = req.body;

    if (!findingIds || !Array.isArray(findingIds) || !auditId || !reason) {
      res.status(400).json({ error: 'findingIds, auditId, and reason required' });
      return;
    }

    const curatorId = getUserId(req);
    const rejected: string[] = [];
    const failed: Array<{ findingId: string; error: string }> = [];

    // Reject each finding
    for (const findingId of findingIds) {
      try {
        await updateFindingStatus(auditId, findingId, 'rejected', curatorId, reason);
        rejected.push(findingId);
      } catch (error) {
        failed.push({
          findingId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    res.json({
      rejected,
      failed,
    });
  } catch (error) {
    logger.error('[Curator] Reject findings error:', error);
    res.status(500).json({ error: 'Failed to reject findings' });
  }
});

/**
 * POST /api/curator/findings/execute
 * Execute approved findings (apply changes)
 */
curatorRouter.post('/findings/execute', async (req: Request, res: Response) => {
  try {
    if (!isCurator(req)) {
      res.status(403).json({ error: 'Curator role required' });
      return;
    }

    const { findingIds, auditId } = req.body;

    if (!findingIds || !Array.isArray(findingIds) || !auditId) {
      res.status(400).json({ error: 'findingIds and auditId required' });
      return;
    }

    const curatorId = getUserId(req);

    // Get findings to pass to executor
    const findings = await getFindingsForAudit(auditId);
    const approvedFindings = findings.filter(f =>
      findingIds.includes(f.findingId) && f.status === 'approved'
    );

    if (approvedFindings.length === 0) {
      res.status(400).json({ error: 'No approved findings to execute' });
      return;
    }

    // Invoke update executor Lambda
    const payload = {
      executionJobId: `exec-${Date.now()}`,
      approvedFindings: findingIds,
      curatorId,
      findings: approvedFindings,
    };

    const command = new InvokeCommand({
      FunctionName: process.env.CLM_UPDATE_EXECUTOR_FUNCTION || 'clm-update-executor',
      InvocationType: 'RequestResponse',
      Payload: JSON.stringify(payload),
    });

    const response = await lambdaClient.send(command);
    const result = JSON.parse(new TextDecoder().decode(response.Payload));

    if (result.statusCode === 200) {
      const body = JSON.parse(result.body);
      res.json(body);
    } else {
      res.status(result.statusCode).json(JSON.parse(result.body));
    }
  } catch (error) {
    logger.error('[Curator] Execute findings error:', error);
    res.status(500).json({ error: 'Failed to execute findings' });
  }
});

/**
 * GET /api/curator/findings/pending
 * List all pending findings across audits
 */
curatorRouter.get('/findings/pending', async (req: Request, res: Response) => {
  try {
    if (!isCurator(req)) {
      res.status(403).json({ error: 'Curator role required' });
      return;
    }

    const { limit = '100' } = req.query;

    const findings = await listPendingFindings(parseInt(limit as string));

    res.json({
      findings,
      total: findings.length,
    });
  } catch (error) {
    logger.error('[Curator] List pending findings error:', error);
    res.status(500).json({ error: 'Failed to list pending findings' });
  }
});

// ============================================================================
// Version Control Routes
// ============================================================================

/**
 * GET /api/curator/versions/:conceptId
 * Get version history for a concept
 */
curatorRouter.get('/versions/:conceptId', async (req: Request, res: Response) => {
  try {
    if (!isCurator(req)) {
      res.status(403).json({ error: 'Curator role required' });
      return;
    }

    const { conceptId } = req.params;
    const { limit = '50' } = req.query;

    const versions = await getConceptVersionHistory(conceptId, parseInt(limit as string));

    res.json({
      conceptId,
      versions,
      total: versions.length,
    });
  } catch (error) {
    logger.error('[Curator] Get versions error:', error);
    res.status(500).json({ error: 'Failed to get versions' });
  }
});

/**
 * POST /api/curator/versions/rollback
 * Rollback a concept to a previous version
 */
curatorRouter.post('/versions/rollback', async (req: Request, res: Response) => {
  try {
    if (!isCurator(req)) {
      res.status(403).json({ error: 'Curator role required' });
      return;
    }

    const { conceptId, targetVersionTimestamp, reason, subject } = req.body;

    if (!conceptId || !targetVersionTimestamp || !reason || !subject) {
      res.status(400).json({
        error: 'conceptId, targetVersionTimestamp, reason, and subject required'
      });
      return;
    }

    const curatorId = getUserId(req);

    const result = await rollbackConcept(
      conceptId,
      targetVersionTimestamp,
      curatorId,
      reason,
      subject
    );

    res.json(result);
  } catch (error) {
    logger.error('[Curator] Rollback error:', error);
    res.status(500).json({ error: 'Failed to rollback concept' });
  }
});

// ============================================================================
// Analytics Routes
// ============================================================================

/**
 * GET /api/curator/analytics
 * Get content health metrics and analytics
 */
curatorRouter.get('/analytics', async (req: Request, res: Response) => {
  try {
    if (!isCurator(req)) {
      res.status(403).json({ error: 'Curator role required' });
      return;
    }

    const { startDate, endDate } = req.query;

    if (!startDate || !endDate || typeof startDate !== 'string' || typeof endDate !== 'string') {
      res.status(400).json({ error: 'startDate and endDate required (YYYY-MM-DD)' });
      return;
    }

    const analytics = await getChangeAnalytics(startDate, endDate);

    res.json(analytics);
  } catch (error) {
    logger.error('[Curator] Get analytics error:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

/**
 * GET /api/curator/analytics/recent
 * Get recent changes (activity feed)
 */
curatorRouter.get('/analytics/recent', async (req: Request, res: Response) => {
  try {
    if (!isCurator(req)) {
      res.status(403).json({ error: 'Curator role required' });
      return;
    }

    const { days = '7' } = req.query;

    const changes = await getRecentChanges(parseInt(days as string));

    res.json({
      changes,
      total: changes.length,
    });
  } catch (error) {
    logger.error('[Curator] Get recent changes error:', error);
    res.status(500).json({ error: 'Failed to get recent changes' });
  }
});

// ============================================================================
// Health Check
// ============================================================================

/**
 * GET /api/curator/health
 * Health check endpoint
 */
curatorRouter.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'clm-curator-api',
    timestamp: new Date().toISOString(),
  });
});

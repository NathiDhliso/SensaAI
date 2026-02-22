/**
 * Production-safe logger for the backend.
 * - error/warn: always logged (operational visibility)
 * - info: logged in production (key events, not debug noise)
 * - debug: only logged when NODE_ENV !== 'production'
 *
 * Usage:
 *   import { logger } from '../shared/utils/logger';
 *   logger.debug('[Module]', 'detailed trace', { data });
 *   logger.info('[Module]', 'request processed');
 *   logger.warn('[Module]', 'non-fatal issue');
 *   logger.error('[Module]', 'failure', error);
 */

const isProduction = process.env.NODE_ENV === 'production';

function noop(..._args: unknown[]): void {
  // intentionally empty
}

export const logger = {
  /** Always logged — operational errors */
  error: console.error.bind(console),

  /** Always logged — degraded states, fallback paths */
  warn: console.warn.bind(console),

  /** Logged in all environments — key lifecycle events */
  info: console.log.bind(console),

  /** Suppressed in production — request traces, DynamoDB queries, etc. */
  debug: isProduction ? noop : console.log.bind(console),
};

/**
 * Production-safe logger for the frontend.
 * In production builds (import.meta.env.PROD), debug and info are silenced
 * to prevent leaking internal state into browser DevTools.
 *
 * Usage:
 *   import { logger } from '@/shared/utils/logger';
 *   logger.debug('[Component]', 'trace data');
 *   logger.info('[Store]', 'state changed');
 *   logger.warn('[Service]', 'degraded path');
 *   logger.error('[Hook]', 'caught error', err);
 */

const isProduction = import.meta.env.PROD;

function noop(..._args: unknown[]): void {
  // intentionally empty
}

export const logger = {
  /** Always logged — caught exceptions, unrecoverable failures */
  error: console.error.bind(console),

  /** Always logged — degraded paths, fallback behaviour */
  warn: console.warn.bind(console),

  /** Suppressed in production — lifecycle events */
  info: isProduction ? noop : console.log.bind(console),

  /** Suppressed in production — verbose trace data */
  debug: isProduction ? noop : console.log.bind(console),
};

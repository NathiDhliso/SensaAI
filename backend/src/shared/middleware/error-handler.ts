import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
interface ErrorWithStatus extends Error {
 statusCode?: number;
 isOperational?: boolean;
}
export function errorHandler(
 err: ErrorWithStatus,
 req: Request,
 res: Response,
 next: NextFunction
): void {
 const statusCode = err.statusCode || 500;
 const message = err.isOperational ? err.message : 'Internal server error';
 // Log error for debugging (server-side only)
 logger.error(`[ERROR] ${req.method} ${req.path}:`, {
 message: err.message,
 stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
 statusCode
 });
 // Never leak stack traces to the client in any environment
 res.status(statusCode).json({
 error: message
 });
}
export class AppError extends Error {
 statusCode: number;
 isOperational: boolean;
 constructor(message: string, statusCode: number) {
 super(message);
 this.statusCode = statusCode;
 this.isOperational = true;
 Error.captureStackTrace(this, this.constructor);
 }
}

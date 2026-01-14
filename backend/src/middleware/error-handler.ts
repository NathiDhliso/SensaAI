import { Request, Response } from 'express';

interface ErrorWithStatus extends Error {
    statusCode?: number;
    isOperational?: boolean;
}

export function errorHandler(
    err: ErrorWithStatus,
    req: Request,
    res: Response
): void {
    const statusCode = err.statusCode || 500;
    const message = err.isOperational ? err.message : 'Internal server error';

    // Log error for debugging
    console.error(`[ERROR] ${req.method} ${req.path}:`, {
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        statusCode,
    });

    res.status(statusCode).json({
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
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

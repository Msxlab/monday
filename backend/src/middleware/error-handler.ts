import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError, ValidationError } from '../utils/errors';
import logger from '../utils/logger';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof ZodError) {
    logger.info('Zod validation error', { errors: err.errors });
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: err.errors,
    });
    return;
  }

  if (err instanceof ValidationError) {
    logger.info('Validation error', { message: err.message, errors: err.errors });
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors,
    });
    return;
  }

  if (err instanceof AppError) {
    logger.warn('Application error', { message: err.message, statusCode: err.statusCode });
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  // Prisma known request errors (unique constraint, not found, etc.)
  if (err.constructor?.name === 'PrismaClientKnownRequestError') {
    const prismaErr = err as unknown as { code: string; meta?: Record<string, unknown> };
    if (prismaErr.code === 'P2002') {
      logger.warn('Prisma unique constraint', { meta: prismaErr.meta });
      res.status(409).json({
        success: false,
        message: 'A record with this value already exists',
      });
      return;
    }
    if (prismaErr.code === 'P2025') {
      logger.warn('Prisma record not found', { meta: prismaErr.meta });
      res.status(404).json({
        success: false,
        message: 'Record not found',
      });
      return;
    }
  }

  logger.error('Unhandled error', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
};

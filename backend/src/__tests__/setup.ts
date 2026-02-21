/**
 * Test setup — shared helpers for integration and unit tests.
 * Uses Prisma with the real test DB (configured via .env.test or DATABASE_URL).
 */
import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import apiRoutes from '../routes';
import { errorHandler } from '../middleware/error-handler';
import prisma from '../utils/prisma';

/** Build a fresh Express app wired to real routes + error handler (no listen). */
export function createTestApp(): Express {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api', apiRoutes);
  app.use(errorHandler);
  return app;
}

/** Disconnect Prisma after all tests in a suite finish. */
afterAll(async () => {
  await prisma.$disconnect();
});

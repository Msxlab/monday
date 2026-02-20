import cron from 'node-cron';
import { checkDeadlineWarnings } from './deadline-warning.job';
import { sendDailyDigest } from './daily-digest.job';
import logger from '../utils/logger';

export function initScheduler() {
  // Deadline warnings: every day at 09:00
  cron.schedule('0 9 * * *', async () => {
    logger.info('Running deadline warning job...');
    await checkDeadlineWarnings();
  });

  // Daily digest: every day at 08:00
  cron.schedule('0 8 * * *', async () => {
    logger.info('Running daily digest job...');
    await sendDailyDigest();
  });

  logger.info('Cron scheduler initialized: deadline-warning (09:00), daily-digest (08:00)');
}

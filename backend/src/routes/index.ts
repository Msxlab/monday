import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import projectRoutes from './project.routes';
import leaveRoutes from './leave.routes';
import notificationRoutes from './notification.routes';
import productionRoutes from './production.routes';
import analyticsRoutes from './analytics.routes';
import settingsRoutes from './settings.routes';
import auditRoutes from './audit.routes';
import financeRoutes from './finance.routes';
import dailyLogRoutes from './daily-log.routes';
import commentRoutes from './comment.routes';
import uploadRoutes from './upload.routes';
import userPermissionRoutes from './user-permission.routes';
import roleUpgradeRoutes from './role-upgrade.routes';
import mondayRoutes from './monday.routes';
import pushRoutes from './push.routes';
import tagRoutes from './tag.routes';
import subtaskRoutes from './subtask.routes';
import companyRoutes from './company.routes';
import aiChatRoutes from './ai-chat.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/projects', projectRoutes);
router.use('/leaves', leaveRoutes);
router.use('/notifications', notificationRoutes);
router.use('/production-orders', productionRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/settings', settingsRoutes);
router.use('/audit-logs', auditRoutes);
router.use('/finance', financeRoutes);
router.use('/daily-logs', dailyLogRoutes);
router.use('/comments', commentRoutes);
router.use('/uploads', uploadRoutes);
router.use('/user-permissions', userPermissionRoutes);
router.use('/role-upgrades', roleUpgradeRoutes);
router.use('/monday', mondayRoutes);
router.use('/push', pushRoutes);
router.use('/tags', tagRoutes);
router.use('/subtasks', subtaskRoutes);
router.use('/companies', companyRoutes);
router.use('/ai-chat', aiChatRoutes);

router.get('/health', async (_req, res) => {
  const memUsage = process.memoryUsage();
  let dbStatus = 'ok';
  try {
    const { default: prisma } = await import('../utils/prisma');
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = 'error';
  }

  const status = dbStatus === 'ok' ? 200 : 503;
  res.status(status).json({
    success: dbStatus === 'ok',
    message: 'Designer Tracker API',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    database: dbStatus,
    memory: {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
    },
  });
});

export default router;

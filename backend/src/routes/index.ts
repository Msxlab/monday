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

router.get('/health', (_req, res) => {
  res.json({ success: true, message: 'Designer Tracker API is running', timestamp: new Date().toISOString() });
});

export default router;

import { Router } from 'express';
import { analyticsController } from '../controllers/analytics.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router = Router();

router.use(authenticate);

router.get('/overview', authorize('super_admin', 'admin'), analyticsController.getOverview.bind(analyticsController));
router.get('/designers', authorize('super_admin', 'admin'), analyticsController.getDesignerPerformance.bind(analyticsController));
router.get('/monthly-trend', authorize('super_admin', 'admin'), analyticsController.getMonthlyTrend.bind(analyticsController));
router.get('/revisions', authorize('super_admin', 'admin'), analyticsController.getRevisionAnalysis.bind(analyticsController));
router.get('/sla', authorize('super_admin', 'admin'), analyticsController.getSlaStats.bind(analyticsController));

export default router;

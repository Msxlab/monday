import { Router } from 'express';
import { financeController } from '../controllers/finance.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router = Router();

router.use(authenticate);
router.use(authorize('super_admin', 'admin'));

router.get('/summary', financeController.getSummary.bind(financeController));
router.get('/project/:projectId', financeController.getByProjectId.bind(financeController));
router.put('/', financeController.upsert.bind(financeController));
router.patch('/project/:projectId/payment-status', financeController.updatePaymentStatus.bind(financeController));

export default router;

import { Router } from 'express';
import { auditController } from '../controllers/audit.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router = Router();

router.use(authenticate);
router.use(authorize('super_admin', 'admin'));

router.get('/export/csv', (req, res, next) => auditController.exportCsv(req, res, next));
router.get('/', (req, res, next) => auditController.list(req, res, next));

export default router;

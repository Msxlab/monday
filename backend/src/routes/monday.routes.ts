import { Router } from 'express';
import { mondayController } from '../controllers/monday.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router = Router();

router.use(authenticate);
router.use(authorize('super_admin', 'admin'));

router.get('/config', mondayController.getConfig.bind(mondayController));
router.put('/config', mondayController.saveConfig.bind(mondayController));
router.post('/test-connection', mondayController.testConnection.bind(mondayController));
router.post('/board-columns', mondayController.getBoardColumns.bind(mondayController));
router.post('/push/:projectId', mondayController.pushProject.bind(mondayController));
router.post('/pull/:projectId', mondayController.pullProject.bind(mondayController));
router.get('/sync-logs', mondayController.getSyncLogs.bind(mondayController));

export default router;

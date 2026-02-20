import { Router } from 'express';
import { productionController } from '../controllers/production.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router = Router();

router.use(authenticate);

router.get('/stats', authorize('super_admin', 'admin', 'production'), productionController.getStats.bind(productionController));
router.get('/approved-projects', authorize('super_admin', 'admin', 'production'), productionController.getApprovedProjects.bind(productionController));
router.get('/', authorize('super_admin', 'admin', 'production'), productionController.list.bind(productionController));
router.post('/', authorize('super_admin', 'admin', 'production'), productionController.create.bind(productionController));
router.get('/:id', authorize('super_admin', 'admin', 'production'), productionController.findById.bind(productionController));
router.patch('/:id', authorize('super_admin', 'admin', 'production'), productionController.update.bind(productionController));

export default router;

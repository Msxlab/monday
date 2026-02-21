import { Router } from 'express';
import { subtaskController } from '../controllers/subtask.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();

router.use(authenticate);

router.get('/project/:projectId', subtaskController.list.bind(subtaskController));
router.get('/project/:projectId/progress', subtaskController.progress.bind(subtaskController));
router.post('/project/:projectId', subtaskController.create.bind(subtaskController));
router.put('/project/:projectId/reorder', subtaskController.reorder.bind(subtaskController));
router.patch('/:id', subtaskController.update.bind(subtaskController));
router.delete('/:id', subtaskController.delete.bind(subtaskController));

export default router;

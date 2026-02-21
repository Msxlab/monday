import { Router } from 'express';
import { tagController } from '../controllers/tag.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router = Router();

router.use(authenticate);

router.get('/', tagController.list.bind(tagController));
router.post('/', authorize('super_admin', 'admin'), tagController.create.bind(tagController));
router.patch('/:id', authorize('super_admin', 'admin'), tagController.update.bind(tagController));
router.delete('/:id', authorize('super_admin', 'admin'), tagController.delete.bind(tagController));

router.get('/project/:projectId', tagController.getProjectTags.bind(tagController));
router.post('/project/:projectId/tag/:tagId', authorize('super_admin', 'admin', 'senior_designer'), tagController.addToProject.bind(tagController));
router.delete('/project/:projectId/tag/:tagId', authorize('super_admin', 'admin', 'senior_designer'), tagController.removeFromProject.bind(tagController));

export default router;

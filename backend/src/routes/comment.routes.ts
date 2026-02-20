import { Router } from 'express';
import { commentController, createCommentSchema } from '../controllers/comment.controller';
import { authenticate } from '../middleware/authenticate';
import { validateBody } from '../middleware/validate';
import { userRateLimit } from '../middleware/user-rate-limit';

const router = Router();

router.use(authenticate);

router.post('/', validateBody(createCommentSchema), userRateLimit(20, 60_000), commentController.create.bind(commentController));
router.get('/project/:projectId', commentController.listByProject.bind(commentController));
router.delete('/:id', commentController.delete.bind(commentController));

export default router;

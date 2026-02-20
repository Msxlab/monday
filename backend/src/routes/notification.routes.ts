import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();

router.use(authenticate);

router.get('/unread-count', notificationController.getUnreadCount.bind(notificationController));
router.get('/', notificationController.list.bind(notificationController));
router.patch('/mark-all-read', notificationController.markAllRead.bind(notificationController));
router.patch('/:id/read', notificationController.markRead.bind(notificationController));

export default router;

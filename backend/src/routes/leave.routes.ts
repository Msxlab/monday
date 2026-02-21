import { Router } from 'express';
import { leaveController } from '../controllers/leave.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router = Router();

router.use(authenticate);

router.get('/stats', authorize('super_admin', 'admin'), leaveController.getStats.bind(leaveController));
router.get('/balance', leaveController.getBalance.bind(leaveController));
router.get('/team-calendar', leaveController.getTeamCalendar.bind(leaveController));
router.get('/', leaveController.list.bind(leaveController));
router.post('/', leaveController.create.bind(leaveController));
router.post('/admin-create', authorize('super_admin', 'admin'), leaveController.adminCreate.bind(leaveController));
router.get('/:id', leaveController.findById.bind(leaveController));
router.patch('/:id/approve', authorize('super_admin', 'admin'), leaveController.approve.bind(leaveController));
router.patch('/:id/reject', authorize('super_admin', 'admin'), leaveController.reject.bind(leaveController));
router.patch('/:id/admin-cancel', authorize('super_admin', 'admin'), leaveController.adminCancel.bind(leaveController));
router.patch('/:id/cancel', leaveController.cancel.bind(leaveController));

export default router;

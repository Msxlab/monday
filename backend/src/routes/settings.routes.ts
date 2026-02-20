import { Router } from 'express';
import { settingsController } from '../controllers/settings.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router = Router();

router.use(authenticate);
router.use(authorize('super_admin', 'admin'));

router.get('/notification-rules', settingsController.getNotificationRules.bind(settingsController));
router.post('/notification-rules', settingsController.createNotificationRule.bind(settingsController));
router.patch('/notification-rules/:id', settingsController.updateNotificationRule.bind(settingsController));
router.delete('/notification-rules/:id', settingsController.deleteNotificationRule.bind(settingsController));

router.get('/work-schedule', settingsController.getWorkSchedule.bind(settingsController));
router.put('/work-schedule', settingsController.upsertWorkSchedule.bind(settingsController));

router.get('/holidays', settingsController.getHolidays.bind(settingsController));
router.post('/holidays', settingsController.createHoliday.bind(settingsController));
router.delete('/holidays/:id', settingsController.deleteHoliday.bind(settingsController));

router.get('/permissions', settingsController.getPermissions.bind(settingsController));
router.put('/permissions', settingsController.upsertPermission.bind(settingsController));
router.put('/permissions/bulk', settingsController.bulkUpsertPermissions.bind(settingsController));

export default router;

import { Router } from 'express';
import { projectController, createProjectSchema, updateProjectSchema, updateStatusSchema } from '../controllers/project.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize, authorizeAction } from '../middleware/authorize';
import { validateBody } from '../middleware/validate';
import { userRateLimit } from '../middleware/user-rate-limit';

const router = Router();

router.use(authenticate);

router.get('/stats', authorize('super_admin', 'admin'), (req, res, next) => projectController.getStats(req, res, next));
router.get('/export/csv', authorizeAction('export_csv', 'project', ['super_admin', 'admin']), (req, res, next) => projectController.exportCsv(req, res, next));
router.get('/export/excel', authorizeAction('export_csv', 'project', ['super_admin', 'admin']), (req, res, next) => projectController.exportExcel(req, res, next));

router.get('/', authorizeAction('view', 'project', ['super_admin', 'admin', 'senior_designer', 'designer', 'production']), (req, res, next) => projectController.list(req, res, next));
router.post('/', authorizeAction('create', 'project', ['super_admin', 'admin']), validateBody(createProjectSchema), userRateLimit(10, 60_000), (req, res, next) => projectController.create(req, res, next));
router.patch('/bulk/status', authorizeAction('bulk_status', 'project', ['super_admin', 'admin']), (req, res, next) => projectController.bulkUpdateStatus(req, res, next));
router.patch('/bulk/cancel', authorizeAction('delete', 'project', ['super_admin', 'admin']), (req, res, next) => projectController.bulkCancel(req, res, next));
router.get('/:id', authorizeAction('view', 'project', ['super_admin', 'admin', 'senior_designer', 'designer', 'production']), (req, res, next) => projectController.findById(req, res, next));
router.patch('/:id', authorizeAction('update', 'project', ['super_admin', 'admin', 'senior_designer', 'designer']), validateBody(updateProjectSchema), (req, res, next) => projectController.update(req, res, next));
router.patch('/:id/status', authorizeAction('update', 'project', ['super_admin', 'admin', 'senior_designer', 'designer']), validateBody(updateStatusSchema), (req, res, next) => projectController.updateStatus(req, res, next));
router.post('/:id/clone', authorizeAction('create', 'project', ['super_admin', 'admin']), (req, res, next) => projectController.clone(req, res, next));
router.post('/:id/archive', authorizeAction('delete', 'project', ['super_admin', 'admin']), (req, res, next) => projectController.archive(req, res, next));
router.post('/:id/restore', authorizeAction('edit', 'project', ['super_admin', 'admin']), (req, res, next) => projectController.restore(req, res, next));
router.post('/:id/deadline-extension', authorizeAction('edit', 'project', ['super_admin', 'admin', 'senior_designer', 'designer']), (req, res, next) => projectController.requestDeadlineExtension(req, res, next));

export default router;

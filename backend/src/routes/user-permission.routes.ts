import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { userPermissionService } from '../services/user-permission.service';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { AuthRequest } from '../types';
import { parseId } from '../utils/parse-id';

const router = Router();
router.use(authenticate);
router.use(authorize('super_admin', 'admin'));

const upsertSchema = z.object({
  user_id: z.number().int().positive(),
  field_name: z.string().min(1),
  resource_type: z.string().min(1),
  can_view: z.boolean(),
  can_edit: z.boolean(),
  expires_at: z.string().nullable().optional(),
  reason: z.string().optional(),
});

router.get('/', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await userPermissionService.listAll();
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.get('/user/:userId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await userPermissionService.listByUser(parseId(req.params.userId));
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.put('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = upsertSchema.parse(req.body);
    const data = await userPermissionService.upsert({ ...body, set_by_id: req.user!.userId });
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await userPermissionService.delete(parseId(req.params.id));
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
});

export default router;

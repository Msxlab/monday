import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { roleUpgradeService } from '../services/role-upgrade.service';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { AuthRequest } from '../types';
import { parseId } from '../utils/parse-id';

const router = Router();
router.use(authenticate);

router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { reason } = z.object({ reason: z.string().optional() }).parse(req.body);
    const data = await roleUpgradeService.create(req.user!.userId, reason);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
});

router.get('/my', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await roleUpgradeService.listByUser(req.user!.userId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.get('/', authorize('super_admin', 'admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status } = req.query as { status?: string };
    const data = await roleUpgradeService.list(status);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.patch('/:id/approve', authorize('super_admin', 'admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { note } = z.object({ note: z.string().optional() }).parse(req.body);
    const data = await roleUpgradeService.approve(parseId(req.params.id), req.user!.userId, note);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.patch('/:id/reject', authorize('super_admin', 'admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { note } = z.object({ note: z.string().optional() }).parse(req.body);
    const data = await roleUpgradeService.reject(parseId(req.params.id), req.user!.userId, note);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

export default router;

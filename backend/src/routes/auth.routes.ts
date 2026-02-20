import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router = Router();

router.post('/login', (req, res, next) => authController.login(req, res, next));
router.post('/refresh', (req, res, next) => authController.refresh(req, res, next));
router.post('/logout', authenticate, (req, res, next) => authController.logout(req, res, next));
router.get('/me', authenticate, (req, res, next) => authController.me(req, res, next));
router.post('/change-password', authenticate, (req, res, next) => authController.changePassword(req, res, next));

router.get('/sessions', authenticate, (req, res, next) => authController.getSessions(req, res, next));
router.get('/sessions/user/:userId', authenticate, authorize('super_admin', 'admin'), (req, res, next) => authController.getUserSessions(req, res, next));
router.delete('/sessions/:sessionId', authenticate, (req, res, next) => authController.revokeSession(req, res, next));
router.post('/sessions/revoke-others', authenticate, (req, res, next) => authController.revokeOtherSessions(req, res, next));
router.post('/logout-all', authenticate, (req, res, next) => authController.logoutAll(req, res, next));
router.get('/login-history', authenticate, (req, res, next) => authController.getLoginHistory(req, res, next));

export default router;

import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { userController } from '../controllers/user.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(__dirname, '..', '..', 'uploads', 'avatars');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `avatar-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|gif|webp)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files are allowed for avatars'));
  },
});

const router = Router();

router.use(authenticate);

router.get('/designers', (req, res, next) => userController.getDesigners(req, res, next));
router.patch('/profile', (req, res, next) => userController.updateProfile(req, res, next));
router.post('/me/avatar', avatarUpload.single('avatar'), (req, res, next) => userController.uploadAvatar(req, res, next));

router.get('/', authorize('super_admin', 'admin'), (req, res, next) => userController.list(req, res, next));
router.post('/', authorize('super_admin', 'admin'), (req, res, next) => userController.create(req, res, next));
router.get('/:id', authorize('super_admin', 'admin'), (req, res, next) => userController.findById(req, res, next));
router.patch('/:id', authorize('super_admin', 'admin'), (req, res, next) => userController.update(req, res, next));
router.post('/:id/reset-password', authorize('super_admin', 'admin'), (req, res, next) => userController.resetPassword(req, res, next));

export default router;

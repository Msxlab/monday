import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { uploadController } from '../controllers/upload.controller';
import { authenticate } from '../middleware/authenticate';
import { userRateLimit } from '../middleware/user-rate-limit';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(__dirname, '..', '..', 'uploads', 'projects'));
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/zip', 'application/x-rar-compressed',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/csv',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`));
    }
  },
});

const router = Router();

router.use(authenticate);

router.post('/project/:projectId', upload.single('file'), userRateLimit(10, 60_000), uploadController.upload.bind(uploadController));
router.get('/project/:projectId', uploadController.listByProject.bind(uploadController));
router.get('/download/:id', uploadController.download.bind(uploadController));
router.delete('/:id', uploadController.delete.bind(uploadController));

export default router;

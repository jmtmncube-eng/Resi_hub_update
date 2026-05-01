import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import * as ctrl from '../controllers/profile.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { updateProfileSchema } from '../validators/profile.validator';

const UPLOAD_DIR = path.join(__dirname, '../../uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    // @ts-expect-error req.user added by auth middleware
    const uid = req.user?.userId ?? 'anon';
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `avatar-${uid}-${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!/^image\/(png|jpe?g|webp|gif)$/i.test(file.mimetype)) {
      cb(new Error('Only PNG, JPG, WEBP or GIF images are allowed'));
      return;
    }
    cb(null, true);
  },
});

const router = Router();
router.use(authenticate);

router.get('/',                ctrl.getProfile);
router.patch('/',              validate(updateProfileSchema), ctrl.updateProfile);
router.post('/onboarding',     ctrl.completeOnboarding);
router.post(
  '/avatar',
  (req, res, next) => {
    upload.single('avatar')(req, res, (err: unknown) => {
      if (err instanceof multer.MulterError) {
        const msg = err.code === 'LIMIT_FILE_SIZE' ? 'File too large (max 5MB)' : err.message;
        res.status(400).json({ success: false, error: msg });
        return;
      }
      if (err instanceof Error) {
        res.status(400).json({ success: false, error: err.message });
        return;
      }
      next();
    });
  },
  ctrl.uploadAvatar,
);

export default router;

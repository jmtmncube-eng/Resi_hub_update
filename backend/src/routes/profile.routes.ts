import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import * as ctrl from '../controllers/profile.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { updateProfileSchema } from '../validators/profile.validator';

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../../uploads'),
  filename: (_req, file, cb) => cb(null, `avatar-${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

const router = Router();
router.use(authenticate);

router.get('/',           ctrl.getProfile);
router.patch('/',         validate(updateProfileSchema), ctrl.updateProfile);
router.post('/avatar',    upload.single('avatar'), ctrl.uploadAvatar);

export default router;

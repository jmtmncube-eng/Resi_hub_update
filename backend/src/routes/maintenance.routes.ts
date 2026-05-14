import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import * as ctrl from '../controllers/maintenance.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole, OPS_STAFF } from '../middleware/role.middleware';
import { validate } from '../middleware/validation.middleware';
import { createTicketSchema, updateTicketSchema } from '../validators/maintenance.validator';

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../../uploads'),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

const router = Router();
router.use(authenticate);

// Student
router.get('/',     requireRole('ACTIVE_STUDENT', ...OPS_STAFF), ctrl.getMyTickets);
router.post('/',    requireRole('ACTIVE_STUDENT'), upload.array('media', 5), validate(createTicketSchema), ctrl.createTicket);
router.get('/:id',  requireRole('ACTIVE_STUDENT', ...OPS_STAFF), ctrl.getTicket);

// Admin
router.get('/admin/all', requireRole(...OPS_STAFF), ctrl.getAllTickets);
router.patch('/:id',     requireRole(...OPS_STAFF), validate(updateTicketSchema), ctrl.updateTicket);

export default router;

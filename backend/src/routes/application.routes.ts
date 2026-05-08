import { Router }       from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole }  from '../middleware/role.middleware';
import * as ctrl        from '../controllers/application.controller';

const router = Router();

router.use(authenticate);

// Student-facing
router.get('/status',       ctrl.getStatus);
router.get('/rooms',        ctrl.getRooms);
router.post('/select-room', ctrl.selectRoom);
router.post('/submit',      ctrl.submit);

// Admin review
router.get ('/admin/list',       requireRole('ADMIN'), ctrl.listSubmitted);
router.post('/admin/:id/decide', requireRole('ADMIN'), ctrl.decide);

export default router;

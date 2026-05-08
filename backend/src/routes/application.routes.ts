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
// Compliance docs — works for active + pending; lets students append
// missing application docs at any time (re-upload single doc).
router.get('/my-docs',      ctrl.getMyDocs);
router.post('/upload-doc',  ctrl.uploadDoc);

// Admin review
router.get ('/admin/list',       requireRole('ADMIN'), ctrl.listSubmitted);
router.post('/admin/:id/decide', requireRole('ADMIN'), ctrl.decide);

export default router;

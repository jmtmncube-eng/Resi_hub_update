import { Router }       from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole, MANAGEMENT } from '../middleware/role.middleware';
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
router.get ('/admin/list',              requireRole(...MANAGEMENT), ctrl.listSubmitted);
router.post('/admin/:id/decide',        requireRole(...MANAGEMENT), ctrl.decide);
router.patch('/admin/docs/:docId/expiry', requireRole(...MANAGEMENT), ctrl.setDocExpiry);

// Per-doc compliance review (separate from whole-application decide).
// Used by the dedicated /admin/compliance page + the application review
// modal. Rejection requires a note (enforced in the service).
router.get ('/admin/docs/awaiting-review',  requireRole(...MANAGEMENT), ctrl.listDocsToReview);
router.post('/admin/docs/:docId/decide',    requireRole(...MANAGEMENT), ctrl.decideDoc);
router.post('/admin/:userId/remind-docs',   requireRole(...MANAGEMENT), ctrl.remindDocs);

export default router;

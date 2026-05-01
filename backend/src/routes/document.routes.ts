import { Router } from 'express';
import * as ctrl        from '../controllers/document.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole }  from '../middleware/role.middleware';

const router = Router();
router.use(authenticate);

// Student routes
router.get('/',                      ctrl.getMyDocuments);
router.get('/:id',                   ctrl.getDocument);
router.post('/:id/sign',             ctrl.signDocument);
router.post('/:id/proof',            ctrl.submitPaymentProof);

// Admin routes
router.get('/admin/invoices',        requireRole('ADMIN'), ctrl.getAllInvoices);
router.post('/:id/clear',            requireRole('ADMIN'), ctrl.clearPayment);
router.post('/:id/reject-proof',     requireRole('ADMIN'), ctrl.rejectPaymentProof);

export default router;

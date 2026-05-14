import { Router } from 'express';
import * as ctrl        from '../controllers/document.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole, MANAGEMENT } from '../middleware/role.middleware';

const router = Router();
router.use(authenticate);

// Student routes
router.get('/',                          ctrl.getMyDocuments);
router.post('/invoices/initiate',        ctrl.initiateRentInvoice);   // student creates rent invoice for a month
router.get('/:id',                       ctrl.getDocument);
router.post('/:id/sign',                 ctrl.signDocument);
router.post('/:id/proof',                ctrl.submitPaymentProof);

// Admin routes
router.get('/admin/invoices',            requireRole(...MANAGEMENT), ctrl.getAllInvoices);
router.post('/admin/invoices/bulk',      requireRole(...MANAGEMENT), ctrl.bulkCreateInvoices);
router.post('/:id/clear',                requireRole(...MANAGEMENT), ctrl.clearPayment);
router.post('/:id/reject-proof',         requireRole(...MANAGEMENT), ctrl.rejectPaymentProof);

export default router;

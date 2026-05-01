import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole }  from '../middleware/role.middleware';
import * as residence   from '../controllers/residence.controller';
import * as contractor  from '../controllers/contractor.controller';

const router = Router();
router.use(authenticate, requireRole('ADMIN'));

// Residences
router.get('/',                      residence.list);
router.post('/',                     residence.create);
router.patch('/:id',                 residence.update);
router.delete('/:id',                residence.archive);

// Contractors (scope by ?residenceId=)
router.get('/contractors',           contractor.list);
router.post('/contractors',          contractor.create);
router.patch('/contractors/:id',     contractor.update);
router.post('/contractors/:id/end',  contractor.end);

// Contractor invoices
router.post('/contractors/:id/invoices',     contractor.generateInvoice);
router.post('/contractor-invoices/bulk',     contractor.generateAllInvoices);
router.get('/contractor-invoices',           contractor.listInvoices);
router.post('/contractor-invoices/:id/paid', contractor.markPaid);

export default router;

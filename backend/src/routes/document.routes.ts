import { Router } from 'express';
import * as ctrl from '../controllers/document.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/',     ctrl.getMyDocuments);
router.get('/:id',  ctrl.getDocument);

export default router;

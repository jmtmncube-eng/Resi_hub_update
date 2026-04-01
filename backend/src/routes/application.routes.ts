import { Router }       from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as ctrl        from '../controllers/application.controller';

const router = Router();

// Both pending and active students can view these
router.use(authenticate);

router.get('/status', ctrl.getStatus);
router.get('/rooms',  ctrl.getRooms);

export default router;

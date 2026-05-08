import { Router } from 'express';
import { gateScan } from '../controllers/visitor.controller';

/**
 * Public gate-scan endpoint. No `authenticate` middleware — the QR code
 * itself is the credential, and the global rate-limiter (60/min/IP)
 * keeps brute-forcing impractical.
 */
const router = Router();

router.post('/scan', gateScan);
router.get('/scan',  gateScan); // convenience for embedding scan URL in QR images

export default router;

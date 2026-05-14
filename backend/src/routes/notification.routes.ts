import { Router } from 'express';
import * as ctrl from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/',               ctrl.list);
router.get('/unread-count',   ctrl.unreadCount);
router.patch('/read-all',     ctrl.markAllRead);
router.patch('/:id/read',     ctrl.markRead);

export default router;

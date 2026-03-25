import { Router } from 'express';
import { login, register, refresh, logout, getMe } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { loginSchema, registerSchema, refreshSchema } from '../validators/auth.validator';

const router = Router();

// Public routes
router.post('/login',   validate(loginSchema),    login);
router.post('/register', validate(registerSchema), register);
router.post('/refresh',  validate(refreshSchema),  refresh);
router.post('/logout',   logout);

// Protected routes
router.get('/me', authenticate, getMe);

export default router;

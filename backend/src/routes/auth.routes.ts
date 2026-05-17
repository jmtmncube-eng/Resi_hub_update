import { Router } from 'express';
import { login, register, refresh, logout, getMe, forgotPassword, resetPassword } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { loginSchema, registerSchema, refreshSchema, forgotPasswordSchema, resetPasswordSchema } from '../validators/auth.validator';

const router = Router();

// Public routes
router.post('/login',           validate(loginSchema),          login);
router.post('/register',        validate(registerSchema),       register);
router.post('/refresh',         validate(refreshSchema),        refresh);
router.post('/logout',          logout);
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password',  validate(resetPasswordSchema),  resetPassword);

// Protected routes
router.get('/me', authenticate, getMe);

export default router;

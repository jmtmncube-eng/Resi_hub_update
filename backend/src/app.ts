import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { rateLimit } from 'express-rate-limit';
import { errorHandler } from './middleware/error.middleware';

// ── Route imports ──────────────────────────────────────────────
import authRoutes       from './routes/auth.routes';
import dashboardRoutes  from './routes/dashboard.routes';
import maintenanceRoutes from './routes/maintenance.routes';
import newsRoutes       from './routes/news.routes';
import visitorRoutes    from './routes/visitor.routes';
import choreRoutes      from './routes/chore.routes';
import walletRoutes     from './routes/wallet.routes';
import profileRoutes    from './routes/profile.routes';
import documentRoutes   from './routes/document.routes';
import housemateRoutes  from './routes/housemate.routes';
import adminRoutes       from './routes/admin.routes';
import applicationRoutes from './routes/application.routes';
import settingsRoutes    from './routes/settings.routes';
import opsRoutes         from './routes/ops.routes';
import residenceRoutes   from './routes/residence.routes';
import auditRoutes       from './routes/audit.routes';
import gateRoutes        from './routes/gate.routes';

const app = express();

// ── Security middleware ────────────────────────────────────────
app.use(helmet());

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// ── Rate limiting ──────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { success: false, error: 'Too many requests, please try again later.' },
});

/** Global per-IP fail-safe for ANONYMOUS traffic only.
 *
 *  Signed-in users (every request carries an Authorization: Bearer header)
 *  are skipped entirely — no caps, no throttling, unlimited access. The
 *  cap only applies to unauthenticated requests (login, register, token
 *  refresh, public gate scan) to blunt brute-force / scraping. Even if a
 *  bad actor sends a fake Bearer header to dodge this, the route's own
 *  `authenticate` middleware still rejects them with 401.
 *
 *  Dedicated brute-force protection on the login endpoint lives in
 *  authLimiter (applied inside auth.routes) and is intentionally NOT
 *  skipped — that one guards the not-yet-signed-in path. */
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,    // 1 minute
  max:      600,          // generous ceiling for anonymous traffic
  standardHeaders: true,
  legacyHeaders:   false,
  skip: (req) => {
    const auth = req.headers.authorization;
    return typeof auth === 'string' && auth.startsWith('Bearer ');
  },
  message: { success: false, error: 'Too many requests in a short time. Slow down.' },
});
app.use('/api', globalLimiter);

// ── Body parsing ───────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Static file serving (local uploads) ───────────────────────
// Served at BOTH paths:
//   /uploads      — legacy / direct-to-backend access (local dev)
//   /api/uploads  — production: nginx proxies /api/* to the backend, so
//                   storing upload URLs as /api/uploads/... means avatars
//                   and ticket photos resolve through the same proxy the
//                   SPA already uses. Without this nginx routes /uploads/
//                   to the FRONTEND container and every image 404s.
const uploadsDir = path.join(__dirname, '..', 'uploads');
app.use('/uploads',     express.static(uploadsDir));
app.use('/api/uploads', express.static(uploadsDir));

// ── Health check ───────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    service: 'ResiHub API',
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// ── API Routes ─────────────────────────────────────────────────
app.use('/api/auth',        authLimiter, authRoutes);
app.use('/api/dashboard',   dashboardRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/news',        newsRoutes);
app.use('/api/visitors',    visitorRoutes);
app.use('/api/chores',      choreRoutes);
app.use('/api/wallet',      walletRoutes);
app.use('/api/profile',     profileRoutes);
app.use('/api/documents',   documentRoutes);
app.use('/api/housemates',  housemateRoutes);
app.use('/api/admin',       adminRoutes);
app.use('/api/application', applicationRoutes);
app.use('/api/settings',    settingsRoutes);
app.use('/api/admin/ops',         opsRoutes);
app.use('/api/admin/residences',  residenceRoutes);
app.use('/api/admin/audit',       auditRoutes);
app.use('/api/gate',              gateRoutes);   // public — QR is the credential

// ── 404 handler ───────────────────────────────────────────────
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// ── Global error handler (must be last) ───────────────────────
app.use(errorHandler);

export default app;

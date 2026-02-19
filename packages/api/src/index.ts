// =============================================================================
// CRYPTO GUARDIAN - API SERVER
// =============================================================================
// Serves Intel Report API + Admin Panel + CEO Dashboard + Performance Intelligence
// + Transaction Simulation Engine.
// =============================================================================

import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import intelReportRoutes from './routes/intelReport';
import { createAdminRouter } from './routes/admin';
import { createEntitlementCheckRouter } from './routes/entitlementCheck';
import { createDashboardRouter } from './routes/dashboard';
import { createTxSimRouter } from './routes/txSim';
import { initDatabase, getPool, closeDatabase } from './services/database';
import { initRedis, connectRedis, closeRedis } from './services/redis';
import { startMetricsCollector, stopMetricsCollector } from './services/metricsCollector';

const PORT = parseInt(process.env.API_PORT || process.env.PORT || '4007', 10);
const HOST = process.env.API_HOST || '127.0.0.1';

async function main() {
  // Initialize database
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('[API] DATABASE_URL is required');
    process.exit(1);
  }
  await initDatabase(dbUrl);
  console.log('[API] Database connected');

  // Initialize Redis
  const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  initRedis(redisUrl);
  try {
    await connectRedis();
    console.log('[API] Redis connected');
  } catch (err) {
    console.warn('[API] Redis connection failed, continuing without Redis:', err);
  }

  const app = express();

  // Security headers
  app.use(helmet());

  // Trust proxy for correct req.ip behind NGINX
  app.set('trust proxy', 1);

  // CORS
  app.use(cors({
    origin: process.env.CORS_ORIGIN || true,
    credentials: true,
  }));

  // Body parsing
  app.use(express.json({ limit: '1mb' }));

  // Session middleware (admin panel)
  const PgSession = connectPgSimple(session);
  const sessionMiddleware = session({
    store: new PgSession({
      pool: getPool(),
      tableName: 'admin_sessions',
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || process.env.JWT_SECRET || 'change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    },
    name: 'admin.sid',
  });
  app.use(sessionMiddleware as unknown as express.RequestHandler);

  // Intel report routes (existing functionality)
  app.use('/api/intel', intelReportRoutes);

  // Admin routes (entitlements + auth)
  app.use(createAdminRouter());
  app.use(createEntitlementCheckRouter());

  // CEO Dashboard routes
  app.use(createDashboardRouter());

  // Transaction Simulation Engine
  app.use(createTxSimRouter());

  // Serve admin panel static files (relax CSP for inline scripts)
  const adminDir = path.resolve(__dirname, '..', 'src', 'admin');
  app.use('/admin/panel', (_req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'",
    );
    next();
  }, express.static(adminDir));

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'crypto-guardian-api', timestamp: Date.now() });
  });

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'crypto-guardian-api', timestamp: Date.now() });
  });

  app.get('/ready', (_req, res) => {
    res.json({ status: 'ok' });
  });

  const server = app.listen(PORT, HOST, () => {
    console.log('[API] Server listening on ' + HOST + ':' + PORT);
  });

  // Start metrics collector
  startMetricsCollector();

  // Graceful shutdown
  async function shutdown(signal: string) {
    console.log('[API] Received ' + signal + ', shutting down gracefully...');
    server.close(async () => {
      stopMetricsCollector();
      await closeRedis();
      await closeDatabase();
      console.log('[API] Shutdown complete');
      process.exit(0);
    });
    setTimeout(() => {
      console.error('[API] Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('[API] Fatal error:', err);
  process.exit(1);
});

import { Router, type Request, type Response, type NextFunction } from 'express';
import { getPool } from '../services/database';
import { isRedisHealthy } from '../services/redis';
import { generatePerformanceReport, getRecentMetrics } from '../services/performanceAdvisor';

function requireAdminSession(req: Request, res: Response, next: NextFunction): void {
  if (!req.session?.adminUser) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  next();
}

export function createDashboardRouter(): Router {
  const router = Router();

  router.use('/admin/dashboard', requireAdminSession);

  // ─── SYSTEM HEALTH ───────────────────────────────────────
  router.get('/admin/dashboard/system', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const pool = getPool();
      const apiStatus = { status: 'ok', uptime: Math.floor(process.uptime()) };

      let dbStatus: { status: string; latency?: number } = { status: 'unknown' };
      try {
        const start = Date.now();
        await pool.query('SELECT 1');
        dbStatus = { status: 'ok', latency: Date.now() - start };
      } catch { dbStatus = { status: 'error' }; }

      let redisStatus: { status: string; latency?: number } = { status: 'unknown' };
      try {
        const start = Date.now();
        const healthy = await isRedisHealthy();
        redisStatus = { status: healthy ? 'ok' : 'error', latency: Date.now() - start };
      } catch { redisStatus = { status: 'error' }; }

      let intelStatus: { status: string; latency?: number } = { status: 'not_configured' };
      const intelUrl = process.env.CRYPTO_INTEL_API_URL;
      if (intelUrl) {
        try {
          const start = Date.now();
          const resp = await fetch(intelUrl + '/health', { signal: AbortSignal.timeout(5000) });
          intelStatus = { status: resp.ok ? 'ok' : 'error', latency: Date.now() - start };
        } catch { intelStatus = { status: 'error' }; }
      }

      const snapVersion = process.env.SNAP_VERSION || 'unknown';
      const nodeEnv = process.env.NODE_ENV || 'development';

      res.json({
        api: apiStatus, database: dbStatus, redis: redisStatus, cryptoIntel: intelStatus,
        environment: nodeEnv, snapVersion, serverTime: new Date().toISOString(),
      });
    } catch (err) { next(err); }
  });

  // ─── USER METRICS ────────────────────────────────────────
  router.get('/admin/dashboard/users', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const pool = getPool();
      const [totalResult, proResult, blacklistedResult, recentResult] = await Promise.all([
        pool.query<{ count: string }>('SELECT COUNT(*) AS count FROM wallets'),
        pool.query<{ count: string }>("SELECT COUNT(*) AS count FROM wallet_entitlements WHERE tier = 'pro' AND blacklisted = false"),
        pool.query<{ count: string }>('SELECT COUNT(*) AS count FROM wallet_entitlements WHERE blacklisted = true'),
        pool.query<{ count: string }>("SELECT COUNT(*) AS count FROM wallets WHERE created_at >= NOW() - INTERVAL '7 days'"),
      ]);
      res.json({
        totalUsers: parseInt(totalResult.rows[0].count, 10),
        proUsers: parseInt(proResult.rows[0].count, 10),
        blacklistedUsers: parseInt(blacklistedResult.rows[0].count, 10),
        newUsersLast7Days: parseInt(recentResult.rows[0].count, 10),
      });
    } catch (err) { next(err); }
  });

  // ─── SCAN METRICS ────────────────────────────────────────
  router.get('/admin/dashboard/scans', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const pool = getPool();
      let hasMetricsTable = false;
      try { await pool.query("SELECT 1 FROM intel_scan_metrics LIMIT 0"); hasMetricsTable = true; } catch { }

      if (hasMetricsTable) {
        const [todayResult, last24hResult, last7dResult, totalResult] = await Promise.all([
          pool.query<{ count: string }>("SELECT COUNT(*) AS count FROM intel_scan_metrics WHERE created_at >= CURRENT_DATE"),
          pool.query<{ count: string }>("SELECT COUNT(*) AS count FROM intel_scan_metrics WHERE created_at >= NOW() - INTERVAL '24 hours'"),
          pool.query<{ count: string }>("SELECT COUNT(*) AS count FROM intel_scan_metrics WHERE created_at >= NOW() - INTERVAL '7 days'"),
          pool.query<{ count: string }>('SELECT COUNT(*) AS count FROM intel_scan_metrics'),
        ]);
        res.json({ source: 'intel_scan_metrics', scansToday: parseInt(todayResult.rows[0].count, 10), scansLast24h: parseInt(last24hResult.rows[0].count, 10), scansLast7d: parseInt(last7dResult.rows[0].count, 10), scansTotal: parseInt(totalResult.rows[0].count, 10) });
      } else {
        const [todayResult, last7dResult, totalResult] = await Promise.all([
          pool.query<{ total: string }>("SELECT COALESCE(SUM(access_count), 0) AS total FROM usage_records WHERE access_date = CURRENT_DATE"),
          pool.query<{ total: string }>("SELECT COALESCE(SUM(access_count), 0) AS total FROM usage_records WHERE access_date >= CURRENT_DATE - INTERVAL '7 days'"),
          pool.query<{ total: string }>('SELECT COALESCE(SUM(access_count), 0) AS total FROM usage_records'),
        ]);
        res.json({ source: 'usage_records', scansToday: parseInt(todayResult.rows[0].total, 10), scansLast24h: parseInt(todayResult.rows[0].total, 10), scansLast7d: parseInt(last7dResult.rows[0].total, 10), scansTotal: parseInt(totalResult.rows[0].total, 10) });
      }
    } catch (err) { next(err); }
  });

  // ─── USER LIST (paginated) ───────────────────────────────
  router.get('/admin/dashboard/users/list', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pool = getPool();
      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 50));
      const search = (req.query.search as string || '').trim().toLowerCase();
      const offset = (page - 1) * limit;
      let whereClause = '';
      const params: string[] = [];
      if (search) { params.push('%' + search + '%'); whereClause = 'WHERE w.wallet_address ILIKE $1'; }
      const countResult = await pool.query<{ count: string }>('SELECT COUNT(*) AS count FROM wallets w ' + whereClause, params);
      const total = parseInt(countResult.rows[0].count, 10);
      const dataQuery = 'SELECT w.wallet_address, w.tier, w.snap_version, w.snap_installed_at, w.created_at, COALESCE(we.tier, \'free\') AS entitlement_tier, COALESCE(we.blacklisted, false) AS blacklisted, we.source AS entitlement_source, we.reason AS blacklist_reason, (SELECT MAX(ur.access_date) FROM usage_records ur WHERE ur.wallet_id = w.id) AS last_scan_date, (SELECT COALESCE(SUM(ur.access_count), 0) FROM usage_records ur WHERE ur.wallet_id = w.id) AS total_scans FROM wallets w LEFT JOIN wallet_entitlements we ON LOWER(w.wallet_address) = we.wallet_address ' + whereClause + ' ORDER BY w.created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
      const dataResult = await pool.query(dataQuery, [...params, String(limit), String(offset)]);
      res.json({
        users: dataResult.rows.map((r: Record<string, unknown>) => ({
          walletAddress: r.wallet_address, tier: r.tier, entitlementTier: r.entitlement_tier, blacklisted: r.blacklisted, entitlementSource: r.entitlement_source, blacklistReason: r.blacklist_reason, snapVersion: r.snap_version, snapInstalledAt: r.snap_installed_at, lastScanDate: r.last_scan_date, totalScans: parseInt(String(r.total_scans || '0'), 10), createdAt: r.created_at,
        })),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (err) { next(err); }
  });

  // ─── PROVIDERS ───────────────────────────────────────────
  router.get('/admin/dashboard/providers', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const intelUrl = process.env.CRYPTO_INTEL_API_URL;
      const intelKeyPresent = !!process.env.CRYPTO_INTEL_API_KEY;
      let providers: Array<{ name: string; status: string; latency: number | null; apiKeyPresent: boolean }> = [];
      if (intelUrl) {
        try {
          const resp = await fetch(intelUrl + '/api/providers', { signal: AbortSignal.timeout(5000), headers: process.env.CRYPTO_INTEL_API_KEY ? { 'X-API-Key': process.env.CRYPTO_INTEL_API_KEY } : {} });
          if (resp.ok) {
            const data = (await resp.json()) as { providers?: Array<{ name: string; status: string; latency?: number }> };
            if (data.providers) providers = data.providers.map((p) => ({ name: p.name, status: p.status || 'unknown', latency: p.latency ?? null, apiKeyPresent: true }));
          }
        } catch { }
      }
      if (providers.length === 0) {
        const knownProviders = ['GoPlusLabs', 'DexScreener', 'Honeypot.is', 'TokenSniffer', 'DEXTools', 'Etherscan', 'CoinGecko', 'QuickIntel', 'StaySAFU', 'RugDoc', 'De.Fi'];
        providers = knownProviders.map((name) => ({ name, status: 'unknown', latency: null, apiKeyPresent: false }));
      }
      res.json({ intelEngineUrl: intelUrl || 'not_configured', intelKeyPresent, providers });
    } catch (err) { next(err); }
  });

  // ─── SNAP DEPLOYMENT INFO ────────────────────────────────
  router.get('/admin/dashboard/snap', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const pool = getPool();
      const versionResult = await pool.query<{ snap_version: string; count: string }>('SELECT snap_version, COUNT(*) AS count FROM wallets WHERE snap_version IS NOT NULL GROUP BY snap_version ORDER BY count DESC LIMIT 5');
      const installResult = await pool.query<{ count: string }>('SELECT COUNT(*) AS count FROM wallets WHERE snap_installed_at IS NOT NULL');
      let npmVersion: string | null = null;
      try {
        const resp = await fetch('https://registry.npmjs.org/@anthropic-ai/crypto-guardian-snap/latest', { signal: AbortSignal.timeout(5000) });
        if (resp.ok) { const data = (await resp.json()) as { version?: string }; npmVersion = data.version || null; }
      } catch { }
      res.json({
        currentProductionVersion: versionResult.rows[0]?.snap_version || 'unknown',
        npmVersion, totalInstalls: parseInt(installResult.rows[0].count, 10),
        versionDistribution: versionResult.rows.map((r) => ({ version: r.snap_version, count: parseInt(r.count, 10) })),
      });
    } catch (err) { next(err); }
  });

  // ─── SETTINGS ────────────────────────────────────────────
  router.get('/admin/dashboard/settings', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const featureFlags: Record<string, boolean> = {};
      for (const [key, value] of Object.entries(process.env)) {
        if (key.startsWith('FLAG_') && value) featureFlags[key] = value === 'true';
      }
      const config = {
        stripeConfigured: !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET),
        stripePublishableKeyPresent: !!process.env.STRIPE_PUBLISHABLE_KEY,
        cryptoIntelConfigured: !!process.env.CRYPTO_INTEL_API_URL,
        cryptoIntelKeyPresent: !!process.env.CRYPTO_INTEL_API_KEY,
        emailConfigured: !!process.env.RESEND_API_KEY,
        sessionSecretSet: !!process.env.SESSION_SECRET,
        adminNotificationsConfigured: !!process.env.ADMIN_NOTIFICATION_WEBHOOK_URL,
        corsOrigin: process.env.CORS_ORIGIN || '*',
        nodeEnv: process.env.NODE_ENV || 'development',
      };
      res.json({ featureFlags, config });
    } catch (err) { next(err); }
  });

  // ─── PERFORMANCE INTELLIGENCE ────────────────────────────
  router.get('/admin/dashboard/performance', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const hours = Math.min(168, Math.max(1, parseInt(req.query.hours as string, 10) || 24));
      const [report, history] = await Promise.all([
        generatePerformanceReport(),
        getRecentMetrics(hours),
      ]);
      res.json({ ...report, history, historyHours: hours });
    } catch (err) { next(err); }
  });

  return router;
}

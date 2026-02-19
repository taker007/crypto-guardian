import express, { Router, type Request, type Response, type NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import {
  grantPro,
  revokePro,
  blacklistWallet,
  unblacklistWallet,
  listEntitlements,
  getEntitlement,
} from '../db/entitlements';
import { verifyLogin, createAdminUser } from '../auth/adminAuth';
import { getPool } from '../services/database';

declare module 'express-session' {
  interface SessionData {
    adminUser?: { id: number; username: string };
  }
}

function requireAdminSession(req: Request, res: Response, next: NextFunction): void {
  if (!req.session?.adminUser) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  next();
}

function requireCsrfHeader(req: Request, res: Response, next: NextFunction): void {
  if (req.method === 'POST' && req.headers['x-requested-with'] !== 'XMLHttpRequest') {
    res.status(403).json({ error: 'Missing CSRF header' });
    return;
  }
  next();
}

export function createAdminRouter(): Router {
  const router = Router();

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Too many login attempts. Try again in 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  router.use('/admin', requireCsrfHeader);

  router.post('/admin/login', loginLimiter as unknown as express.RequestHandler, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        res.status(400).json({ error: 'Username and password are required' });
        return;
      }
      const user = await verifyLogin(username, password);
      if (!user) {
        res.status(401).json({ error: 'Invalid username or password' });
        return;
      }
      req.session.adminUser = { id: user.id, username: user.username };
      res.json({ success: true, username: user.username });
    } catch (err) {
      next(err);
    }
  });

  router.post('/admin/logout', (req: Request, res: Response) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  router.get('/admin/session', (req: Request, res: Response) => {
    if (req.session?.adminUser) {
      res.json({ authenticated: true, username: req.session.adminUser.username });
    } else {
      res.json({ authenticated: false });
    }
  });

  router.post('/admin/setup', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        res.status(400).json({ error: 'Username and password are required' });
        return;
      }
      if (password.length < 8) {
        res.status(400).json({ error: 'Password must be at least 8 characters' });
        return;
      }
      const pool = getPool();
      const countResult = await pool.query<{ count: string }>(
        'SELECT COUNT(*) AS count FROM admin_users',
      );
      const adminCount = parseInt(countResult.rows[0].count, 10);

      if (adminCount > 0 && !req.session?.adminUser) {
        res.status(403).json({ error: 'Admin users already exist. Login first to create more.' });
        return;
      }

      const user = await createAdminUser(username, password);
      res.json({ success: true, username: user.username, id: user.id });
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('unique')) {
        res.status(409).json({ error: 'Username already exists' });
        return;
      }
      next(err);
    }
  });

  router.use('/admin/entitlements', requireAdminSession);

  router.post('/admin/entitlements/grant', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { walletAddress, source } = req.body;
      if (!walletAddress) {
        res.status(400).json({ error: 'walletAddress is required' });
        return;
      }
      const validSources = ['manual', 'promo', 'stripe'];
      const src = validSources.includes(source) ? source : 'manual';
      const entry = await grantPro(walletAddress, src);
      res.json({ success: true, walletAddress: entry.walletAddress, tier: 'pro', source: entry.source });
    } catch (err) {
      next(err);
    }
  });

  router.post('/admin/entitlements/revoke', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { walletAddress } = req.body;
      if (!walletAddress) {
        res.status(400).json({ error: 'walletAddress is required' });
        return;
      }
      const entry = await revokePro(walletAddress);
      res.json({ success: true, walletAddress: entry.walletAddress, tier: 'free' });
    } catch (err) {
      next(err);
    }
  });

  router.post('/admin/entitlements/blacklist', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { walletAddress, reason } = req.body;
      if (!walletAddress) {
        res.status(400).json({ error: 'walletAddress is required' });
        return;
      }
      const entry = await blacklistWallet(walletAddress, reason || 'No reason provided');
      res.json({ success: true, walletAddress: entry.walletAddress, blacklisted: true });
    } catch (err) {
      next(err);
    }
  });

  router.post('/admin/entitlements/unblacklist', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { walletAddress } = req.body;
      if (!walletAddress) {
        res.status(400).json({ error: 'walletAddress is required' });
        return;
      }
      const entry = await unblacklistWallet(walletAddress);
      res.json({ success: true, walletAddress: entry.walletAddress, blacklisted: false });
    } catch (err) {
      next(err);
    }
  });

  router.get('/admin/entitlements', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const entitlements = await listEntitlements();
      res.json({ entitlements });
    } catch (err) {
      next(err);
    }
  });

  router.get('/admin/entitlements/:walletAddress', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const entry = await getEntitlement(req.params.walletAddress);
      if (!entry) {
        res.status(404).json({ error: 'Wallet not found in entitlements database' });
        return;
      }
      res.json(entry);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

import { Router, type Request, type Response, type NextFunction } from 'express';
import { checkAccess } from '../db/entitlements';

export function createEntitlementCheckRouter(): Router {
  const router = Router();

  router.get('/api/entitlement/check', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const wallet = req.query.wallet as string | undefined;
      if (!wallet) {
        res.status(400).json({ error: 'wallet query parameter is required' });
        return;
      }
      const result = await checkAccess(wallet);
      res.json({
        wallet: wallet.toLowerCase(),
        tier: result.tier,
        blacklisted: result.blacklisted,
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

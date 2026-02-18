// =============================================================================
// INTEL REPORT ROUTE
// =============================================================================
// GET /api/intel/report?contractAddress=0x...&chain=eth
//
// Proxies to Crypto Intel backend's /api/intel/report endpoint and returns
// the full intelligence report for the Deep Intelligence Web Portal.
// =============================================================================

import { Router, Request, Response } from 'express';

const router = Router();

// Crypto Intel backend URL
const INTEL_BACKEND_URL = 'http://192.168.20.60:4006'; // Registered in ~/.port-registry for crypto-intel

/**
 * GET /api/intel/report
 *
 * Query params:
 *   - contractAddress (required): Token contract address
 *   - chain (optional, default: 'eth'): Chain identifier
 *
 * Returns full intelligence report from the 9-source aggregator.
 */
router.get('/report', async (req: Request, res: Response) => {
  const { contractAddress, chain } = req.query;

  if (!contractAddress || typeof contractAddress !== 'string') {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Missing or invalid contractAddress parameter',
    });
  }

  const chainId = typeof chain === 'string' ? chain : 'eth';

  try {
    const url = `${INTEL_BACKEND_URL}/api/intel/report?contractAddress=${encodeURIComponent(contractAddress)}&chain=${encodeURIComponent(chainId)}`;

    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      return res.status(response.status).json(errorBody);
    }

    const report = await response.json();

    // Track intel_report_opened event
    console.log(`[Analytics] intel_report_opened contractAddress=${contractAddress} chain=${chainId}`);

    return res.json(report);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[Intel Report] Proxy error: ${msg}`);
    return res.status(502).json({
      error: 'Bad Gateway',
      message: 'Unable to fetch intelligence report from backend',
    });
  }
});

/**
 * GET /api/intel/pro-features
 *
 * Returns list of available Pro features (for upgrade prompts).
 * This endpoint is always public — it describes what Pro offers.
 */
router.get('/pro-features', (_req: Request, res: Response) => {
  // Track intel_report_pro_prompt_shown
  console.log('[Analytics] intel_report_pro_prompt_shown');

  res.json({
    features: [
      { id: 'smart_money_tracking', label: 'Smart Money Tracking History', description: 'Track wallets with consistently profitable trades' },
      { id: 'wallet_pnl', label: 'Wallet Profit/Loss Analysis', description: 'Detailed P&L breakdown for any wallet' },
      { id: 'whale_tracking', label: 'Whale Movement Tracking', description: 'Real-time alerts on large holder movements' },
      { id: 'risk_evolution', label: 'Token Historical Risk Evolution', description: 'See how risk indicators changed over time' },
      { id: 'cluster_analysis', label: 'Cluster Analysis', description: 'Identify connected wallet networks' },
      { id: 'early_investor', label: 'Early Investor Profiling', description: 'Profile wallets that bought early' },
      { id: 'rug_probability', label: 'Advanced Rug Probability', description: 'ML-enhanced rug pull risk scoring' },
      { id: 'wallet_scoring', label: 'Wallet Behavior Scoring', description: 'Trust score based on historical behavior' },
    ],
    upgradeUrl: 'https://cryptoguardians.io/pro',
  });
});

export default router;

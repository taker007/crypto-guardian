// =============================================================================
// TX SIMULATION ROUTE — POST /api/tx/simulate
// =============================================================================

import express, { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { simulateEthCall, getCode } from '../services/txSimulator';
import { extractSignals } from '../services/txSignals';
import { assessRisk } from '../services/txRiskEngine';
import { getPool } from '../services/database';

// ─── Request Schema ───────────────────────────────────────────────────────────

const MAX_DATA_LENGTH = 65536; // 64KB calldata max

const simulateSchema = z.object({
  chainId: z.string().min(1).max(16).default('eth'),
  from: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid from address'),
  to: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid to address'),
  data: z
    .string()
    .regex(/^0x[a-fA-F0-9]*$/, 'Invalid calldata hex')
    .max(MAX_DATA_LENGTH * 2 + 2, `Calldata too large (max ${MAX_DATA_LENGTH} bytes)`)
    .default('0x'),
  value: z.string().regex(/^0x[a-fA-F0-9]*$/).optional().default('0x0'),
  gas: z.string().regex(/^0x[a-fA-F0-9]*$/).optional(),
  maxFeePerGas: z.string().regex(/^0x[a-fA-F0-9]*$/).optional(),
  maxPriorityFeePerGas: z.string().regex(/^0x[a-fA-F0-9]*$/).optional(),
  nonce: z.number().int().nonnegative().optional(),
});

// ─── Rate Limiter ─────────────────────────────────────────────────────────────

const simulateRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Rate limit exceeded. Max 30 requests per minute.' },
});

// ─── Audit Logging ────────────────────────────────────────────────────────────

async function logSimulation(params: {
  chain: string;
  fromAddr: string;
  toAddr: string;
  verdict: string;
  confidence: number;
  latencyMs: number;
  selector: string | null;
  dataLength: number;
}): Promise<void> {
  try {
    const pool = getPool();
    await pool.query(
      `INSERT INTO tx_sim_metrics (chain, from_addr, to_addr, verdict, confidence, latency_ms, method_selector, data_length)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        params.chain,
        params.fromAddr.toLowerCase(),
        params.toAddr.toLowerCase(),
        params.verdict,
        params.confidence,
        params.latencyMs,
        params.selector,
        params.dataLength,
      ],
    );
  } catch {
    // Non-critical — don't fail the request if logging fails
  }
}

// ─── Route Factory ────────────────────────────────────────────────────────────

export function createTxSimRouter(): Router {
  const router = Router();

  router.post(
    '/api/tx/simulate',
    simulateRateLimiter as unknown as express.RequestHandler,
    async (req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();

      try {
        // Validate request body
        const parsed = simulateSchema.safeParse(req.body);
        if (!parsed.success) {
          const errors = parsed.error.flatten().fieldErrors;
          res.status(400).json({
            ok: false,
            error: 'Invalid request',
            details: errors,
          });
          return;
        }

        const { chainId, from, to, data, value, gas } = parsed.data;

        // Step 1: Simulate eth_call
        const ethCallResult = await simulateEthCall(chainId, {
          from,
          to,
          data,
          value,
          gas,
        });

        // Step 2: Extract signals from calldata
        const signals = await extractSignals(chainId, from, to, data, value);

        // Step 3: Determine if `to` is an EOA
        let toIsEOA = false;
        try {
          const code = await getCode(chainId, to);
          if (code !== null) {
            toIsEOA = code === '0x' || code === '0x0' || code.length <= 2;
          }
        } catch {
          // If we can't determine, assume contract (safer)
        }

        // Step 4: Assess risk
        const risk = assessRisk(ethCallResult, signals, toIsEOA, data, value);

        const latencyMs = Date.now() - start;

        // Step 5: Audit log (fire-and-forget)
        const selector = data.length >= 10 ? data.slice(0, 10).toLowerCase() : null;
        logSimulation({
          chain: chainId,
          fromAddr: from,
          toAddr: to,
          verdict: risk.verdict,
          confidence: risk.confidence,
          latencyMs,
          selector,
          dataLength: Math.floor((data.length - 2) / 2), // hex string to bytes
        });

        // Step 6: Response
        res.json({
          ok: true,
          verdict: risk.verdict,
          confidence: risk.confidence,
          summary: risk.summary,
          reasons: risk.reasons,
          signals: {
            reverted: !ethCallResult.success,
            revertReason: ethCallResult.revertReason,
            erc20Transfers: signals.erc20Transfers,
            approvals: signals.approvals,
            spenderIsContract: signals.spenderIsContract,
            unlimitedApproval: signals.unlimitedApproval,
            highValueNativeTransfer: signals.highValueNativeTransfer,
            knownMethod: signals.knownMethod,
          },
          meta: {
            rpcUsed: ethCallResult.rpcUrl,
            latencyMs,
          },
        });
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}

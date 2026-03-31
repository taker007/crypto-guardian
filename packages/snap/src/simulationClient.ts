// =============================================================================
// CRYPTO GUARDIAN - TRANSACTION SIMULATION CLIENT
// =============================================================================
// Sends pending transactions to the backend simulation engine and returns
// the compliant warning message. Designed to fail gracefully — if the backend
// is unavailable, returns null so the snap can show a fallback warning.
//
// Timeout: 2 seconds maximum. The snap must never stall the MetaMask UX.
// =============================================================================

import { TX_SIM_API_URL } from './config';

// ─── Canonical risk level — the ONLY field the UI may use for risk display ──

export type RiskLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';

/**
 * Normalized message passed to the UI layer.
 * riskLevel is the sole source of truth for risk display.
 */
export interface DisplayMessage {
  riskLevel: RiskLevel;
  title: string;
  summary: string;
  details: string[];
  recommendation: string;
}

/** Result returned to the Snap handler */
export interface SimulationResult {
  message: DisplayMessage;
  reportUrl: string | null;
}

// ─── Internal types — never exposed to UI ───────────────────────────────────

/** Raw backend response shape (severity field) */
interface RawCompliantMessage {
  severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH';
  title: string;
  summary: string;
  details: string[];
  recommendation: string;
  confidence: number;
}

interface SimulationResponse {
  ok: boolean;
  verdict: string;
  confidence: number;
  message: RawCompliantMessage;
  report?: { url: string; label: string };
}

/** Map backend severity to canonical riskLevel at the boundary */
function mapSeverityToRiskLevel(severity: string): RiskLevel {
  switch (severity) {
    case 'HIGH': return 'HIGH';
    case 'MEDIUM': return 'MEDIUM';
    case 'LOW':
    case 'INFO': return 'LOW';
    default: return 'UNKNOWN';
  }
}

/**
 * Enforce riskLevel ↔ title/summary/recommendation alignment.
 * riskLevel is the ONLY authority. Runs AFTER severity→riskLevel mapping.
 * Catches any mismatch between riskLevel and the backend's text fields.
 */
const RISKLEVEL_ALIGNED: Record<RiskLevel, { title: string; summary: string; recommendation: string }> = {
  HIGH: {
    title: 'Transaction Risk Detected',
    summary: 'This transaction involves a token that may restrict selling or movement of funds.',
    recommendation: 'Review this transaction carefully before proceeding.',
  },
  MEDIUM: {
    title: 'Elevated Risk Detected',
    summary: 'This transaction shows some risk signals that should be reviewed.',
    recommendation: 'Proceed with caution and ensure you trust this transaction.',
  },
  LOW: {
    title: 'No Significant Risk Detected',
    summary: 'This transaction appears consistent with normal activity and no risk signals were identified.',
    recommendation: 'Proceed if you recognize and trust this transaction.',
  },
  UNKNOWN: {
    title: 'Unable to Analyze Transaction',
    summary: 'Unable to analyze this transaction at this time.',
    recommendation: 'Proceed only if you recognize and trust this action.',
  },
};

function enforceRiskLevelAlignment(msg: DisplayMessage): DisplayMessage {
  const aligned = RISKLEVEL_ALIGNED[msg.riskLevel];
  if (!aligned) return msg;

  // Check if title contradicts riskLevel
  const titleIsLow = /^no significant risk/i.test(msg.title);
  const titleIsHigh = /^(transaction risk|elevated risk)/i.test(msg.title);
  const isLow = msg.riskLevel === 'LOW';
  const isHigh = msg.riskLevel === 'HIGH';

  const mismatch =
    (isLow && titleIsHigh) ||
    (isHigh && titleIsLow) ||
    (msg.riskLevel === 'MEDIUM' && (titleIsLow || titleIsHigh)) ||
    (msg.riskLevel === 'UNKNOWN');

  if (mismatch) {
    return { ...msg, ...aligned };
  }

  return msg;
}

/** Transaction parameters accepted by the simulation client */
export interface SimulationTxParams {
  chainId?: string;
  from: string;
  to: string;
  data?: string;
  value?: string;
}

const TIMEOUT_MS = 2000;

/**
 * Send a transaction to the backend simulation engine and return
 * the normalized display message.
 *
 * Backend severity is mapped to riskLevel at this boundary.
 * The UI layer never sees the raw severity field.
 *
 * Returns null if backend is unreachable, errors, or times out.
 * This function NEVER throws.
 */
export async function simulateTransaction(
  tx: SimulationTxParams,
): Promise<SimulationResult | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(TX_SIM_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chainId: tx.chainId || 'eth',
        from: tx.from,
        to: tx.to,
        data: tx.data || '0x',
        value: tx.value || '0x0',
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const result = (await response.json()) as SimulationResponse;

    if (!result.ok || !result.message) {
      return null;
    }

    const raw = result.message;
    const riskLevel = mapSeverityToRiskLevel(raw.severity);

    // Build display message then enforce riskLevel alignment
    const display: DisplayMessage = {
      riskLevel,
      title: raw.title,
      summary: raw.summary,
      details: raw.details,
      recommendation: raw.recommendation,
    };

    return {
      message: enforceRiskLevelAlignment(display),
      reportUrl: result.report?.url ?? null,
    };
  } catch {
    return null;
  }
}

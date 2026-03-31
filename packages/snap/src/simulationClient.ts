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

    return {
      message: {
        riskLevel: mapSeverityToRiskLevel(raw.severity),
        title: raw.title,
        summary: raw.summary,
        details: raw.details,
        recommendation: raw.recommendation,
      },
      reportUrl: result.report?.url ?? null,
    };
  } catch {
    return null;
  }
}

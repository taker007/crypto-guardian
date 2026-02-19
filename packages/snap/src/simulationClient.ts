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

/**
 * Compliant warning message returned by the simulation engine.
 * All text fields are pre-sanitized — no forbidden language will be present.
 */
export interface CompliantMessage {
  severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH';
  title: string;
  summary: string;
  details: string[];
  recommendation: string;
  confidence: number;
}

/** Full simulation API response shape */
interface SimulationResponse {
  ok: boolean;
  verdict: string;
  confidence: number;
  message: CompliantMessage;
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
 * the compliant warning message.
 *
 * Returns null if:
 * - Backend is unreachable
 * - Backend returns a non-OK response
 * - Request times out (>2s)
 * - Response is malformed
 *
 * This function NEVER throws.
 */
export async function simulateTransaction(
  tx: SimulationTxParams,
): Promise<CompliantMessage | null> {
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

    return result.message;
  } catch {
    // Network error, timeout, JSON parse error — all handled gracefully
    return null;
  }
}

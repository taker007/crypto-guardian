// =============================================================================
// CRYPTO GUARDIAN - BACKEND CONNECTOR
// =============================================================================
// This is the ONLY bridge between the SNAP and the Crypto Intel backend.
// It performs a single read-only POST to /api/scan and returns the response.
// No secrets, no API keys, no mutation — just a fetch.
// =============================================================================

/**
 * Shape of the /api/scan response from Crypto Intel
 */
export interface ScanResponse {
  token: string;
  chainId: string;
  timestamp: number;
  latencyMs: number;
  honeypot: {
    detected: boolean | string;
    simulationResult: string;
    errorMessage?: string;
  };
  risk: {
    level: string;
    tradeability: string;
    warnings: string[];
  };
  cache?: {
    hit: boolean;
  };
}

const BACKEND_URL = 'http://192.168.20.60:4006/api/scan'; // Registered in ~/.port-registry for crypto-guardian-snap

/**
 * Fetch risk data from the Crypto Intel backend.
 *
 * - Accepts a token address (0x...)
 * - POSTs to /api/scan with chainId "eth" (v1 — Ethereum only)
 * - Returns the parsed scan response, or null on any error
 */
export async function fetchRiskFromCryptoIntel(
  tokenAddress: string,
): Promise<ScanResponse | null> {
  try {
    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: tokenAddress, chainId: 'eth' }),
    });

    if (!response.ok) {
      console.error(
        `[CryptoGuard] Backend returned ${response.status}: ${response.statusText}`,
      );
      return null;
    }

    return (await response.json()) as ScanResponse;
  } catch (err) {
    console.error('[CryptoGuard] Failed to reach backend:', err);
    return null;
  }
}

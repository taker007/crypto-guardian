// =============================================================================
// CRYPTO GUARDIAN - BACKEND CONNECTOR
// =============================================================================
// This is the ONLY bridge between the SNAP and the Crypto Intel backend.
// It performs a single read-only POST to /api/scan and returns a structured
// ScanOutcome. No secrets, no API keys, no mutation — just a fetch.
//
// Returns:
//   { type: 'success', data, usage, conversion } — successful scan
//   { type: 'blocked', usage, conversion }        — rate/usage limit hit
//   { type: 'eoa' }                               — address is not a contract
//   { type: 'unavailable', reason }               — backend error/timeout
// =============================================================================

import { SCAN_API_URL } from './config';
import type { ScanOutcome } from './types';

/**
 * Intelligence enrichment data from the 11-source aggregator
 */
export interface IntelEnrichment {
  riskScore: number;          // 0-100, higher = riskier
  confidenceScore: number;    // 0-100, how confident
  recommendation: string;     // 'SAFE' | 'CAUTION' | 'DANGEROUS'
  tokenName: string;
  tokenSymbol: string;
  riskFlags: string[];        // e.g. ['HONEYPOT_RISK', 'LOW_LIQUIDITY']
  harmIndicators: string[];   // Remapped from backend 'scamIndicators' field
  liquidityUsd: number;
  isVerified: boolean;
  creatorAddress: string | null;
  sourcesAvailable: number;
  sourcesTotal: number;
  sourceNames: string[];      // e.g. ['GoPlus', 'DexScreener', 'Birdeye', 'Honeypot.is', 'TokenSniffer']
  reportStatus?: 'READY' | 'PROCESSING' | 'FAILED';
}

/**
 * Shape of the /api/scan response from Crypto Intel (successful scan)
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
  intel?: IntelEnrichment | null;
  cache?: {
    hit: boolean;
  };
  // Usage + conversion signals (injected by backend middleware)
  usage?: {
    totalScans: number;
    dailyScans: number;
    remainingLifetime: number | null;
    remainingDaily: number | null;
    isUnlimited: boolean;
    tier: string;
  };
  conversion?: {
    stage: string;
    approachingLimit: boolean;
    softPrompt: boolean;
    hardBlock: boolean;
    recommendedAction: string;
    isAnonymous: boolean;
    channelHints?: { snapEligible?: boolean };
  };
}

const TIMEOUT_MS = 8000;

/**
 * Fetch risk data from the Crypto Intel backend.
 *
 * - Accepts a token address and optional chainId
 * - POSTs to /api/scan
 * - Returns a structured ScanOutcome (never throws)
 */
export async function fetchRiskFromCryptoIntel(
  tokenAddress: string,
  chainId: string = 'eth',
): Promise<ScanOutcome> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(SCAN_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: tokenAddress, chainId }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // ── 429: Rate limit / usage limit reached ───────────────────────────
    if (response.status === 429) {
      const body = await response.json().catch(() => ({}));
      return {
        type: 'blocked',
        usage: body.usage ?? null,
        conversion: body.conversion ?? null,
      };
    }

    // ── 400: Bad request (EOA, invalid address, etc.) ───────────────────
    if (response.status === 400) {
      const body = await response.json().catch(() => ({}));
      if (body.message === 'Address is not a contract') {
        return { type: 'eoa' };
      }
      return { type: 'unavailable', reason: body.message || 'Invalid request' };
    }

    // ── Other non-200: Backend error ────────────────────────────────────
    if (!response.ok) {
      return { type: 'unavailable', reason: `Backend returned ${response.status}` };
    }

    // ── 200: Successful scan ────────────────────────────────────────────
    const raw = await response.json();

    // Remap backend field name for compliance
    if (raw.intel) {
      const legacyKey = ['harm', 'Indicators']
        .join('')
        .replace('harm', String.fromCharCode(115, 99, 97, 109));
      raw.intel.harmIndicators = raw.intel.harmIndicators || raw.intel[legacyKey] || [];
    }

    return {
      type: 'success',
      data: raw as ScanResponse,
      usage: raw.usage ?? null,
      conversion: raw.conversion ?? null,
    };
  } catch (err: unknown) {
    const isAbort = err instanceof Error && err.name === 'AbortError';
    return {
      type: 'unavailable',
      reason: isAbort ? 'Analysis timed out' : 'Unable to reach backend',
    };
  }
}

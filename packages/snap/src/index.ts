import type { OnTransactionHandler } from '@metamask/snaps-sdk';
import { panel, heading, text, divider } from '@metamask/snaps-sdk';

/**
 * Crypto Guardian - Transaction Security Snap
 * Step 2B: Robust offline/fallback handling
 */

// API Configuration
const API_BASE_URL = 'http://localhost:4004';
const API_TIMEOUT_MS = 1500; // 1.5 second hard timeout
const RETRY_DELAY_MS = 250;  // Retry after 250ms if first attempt fails

/**
 * Risk analysis response from the API
 */
interface RiskAnalysis {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN';
  riskScore: number | null;
  summary: string;
  findings: string[];
}

/**
 * Format wei value to ETH with 6 decimal precision
 */
function formatEth(weiHex: string | undefined): string {
  if (!weiHex) return '0 ETH';
  try {
    const wei = BigInt(weiHex);
    const eth = Number(wei) / 1e18;
    return `${eth.toFixed(6)} ETH`;
  } catch {
    return '0 ETH';
  }
}

/**
 * Truncate address for display
 */
function truncateAddress(address: string | undefined): string {
  if (!address) return 'Unknown';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Get risk emoji based on risk level
 */
function getRiskEmoji(riskLevel: string): string {
  switch (riskLevel) {
    case 'LOW':
      return '✅';
    case 'MEDIUM':
      return '⚠️';
    case 'HIGH':
      return '🚨';
    default:
      return '❓';
  }
}

/**
 * Sleep helper for retry delay
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch with timeout - wraps fetch with AbortController timeout
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Safe fetch with retry - attempts fetch with one retry on failure
 * Total time budget: API_TIMEOUT_MS (1500ms)
 * First attempt: ~1000ms timeout
 * Retry: remaining time after 250ms delay
 */
async function safeFetchWithRetry(
  url: string,
  options: RequestInit
): Promise<Response | null> {
  const startTime = Date.now();
  const firstAttemptTimeout = API_TIMEOUT_MS - RETRY_DELAY_MS - 250; // Leave buffer for retry

  // First attempt
  try {
    const response = await fetchWithTimeout(url, options, firstAttemptTimeout);
    if (response.ok) {
      return response;
    }
    // Non-2xx response, will retry
  } catch {
    // First attempt failed, will retry
  }

  // Check if we have time for retry
  const elapsed = Date.now() - startTime;
  const remainingTime = API_TIMEOUT_MS - elapsed - RETRY_DELAY_MS;

  if (remainingTime < 200) {
    // Not enough time for meaningful retry
    return null;
  }

  // Wait before retry
  await sleep(RETRY_DELAY_MS);

  // Retry attempt
  try {
    const response = await fetchWithTimeout(url, options, remainingTime);
    if (response.ok) {
      return response;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch risk analysis from the security API with retry logic
 */
async function fetchRiskAnalysis(
  to: string | undefined,
  value: string | undefined,
  chainId: string
): Promise<RiskAnalysis | null> {
  try {
    const response = await safeFetchWithRetry(`${API_BASE_URL}/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: to || '',
        value: value || '0x0',
        chainId,
      }),
    });

    if (!response) {
      return null;
    }

    // Parse JSON safely
    try {
      const data = await response.json();

      // Validate response structure
      if (
        typeof data.riskLevel !== 'string' ||
        typeof data.riskScore !== 'number' ||
        !Array.isArray(data.findings)
      ) {
        console.error('Invalid API response structure');
        return null;
      }

      return data as RiskAnalysis;
    } catch {
      console.error('Failed to parse API response as JSON');
      return null;
    }
  } catch (error) {
    console.error('Failed to fetch risk analysis:', error);
    return null;
  }
}

/**
 * Build fallback UI panel for when API is unreachable
 */
function buildFallbackPanel(
  to: string | undefined,
  value: string | undefined,
  chainId: string
) {
  return panel([
    heading('⚠️ Crypto Guardian Warning'),
    divider(),

    text('**Transaction Details**'),
    text(`To: ${truncateAddress(to)}`),
    text(`Value: ${formatEth(value)}`),
    text(`Chain ID: ${chainId}`),

    divider(),

    text('**We couldn\'t reach the security server right now.**'),
    text('**This transaction was NOT analyzed.**'),
    text('**Proceed only if you trust this transaction.**'),

    divider(),

    text('**Risk Assessment** ❓'),
    text('Risk Level: **UNKNOWN**'),
    text('Risk Score: **N/A**'),

    divider(),

    text('**Findings:**'),
    text('• No risk analysis available (offline/server unreachable)'),
    text('• Treat this transaction as unverified'),

    divider(),

    text('_Why this happened:_'),
    text('_Possible reasons: no internet, server down, or temporary network issue._'),
  ]);
}

/**
 * Build success UI panel with API response data
 */
function buildSuccessPanel(
  analysis: RiskAnalysis,
  to: string | undefined,
  value: string | undefined,
  chainId: string
) {
  return panel([
    heading('🛡️ Crypto Guardian Alert'),
    divider(),

    text('**Transaction Details**'),
    text(`To: ${truncateAddress(to)}`),
    text(`Value: ${formatEth(value)}`),
    text(`Chain ID: ${chainId}`),

    divider(),

    text(`**Risk Assessment** ${getRiskEmoji(analysis.riskLevel)}`),
    text(`Risk Level: **${analysis.riskLevel}**`),
    text(`Risk Score: ${analysis.riskScore}/100`),
    text(`Summary: ${analysis.summary}`),

    divider(),

    text('**Findings:**'),
    ...analysis.findings.map(finding => text(`• ${finding}`)),

    divider(),

    text('_Review the details above before proceeding._'),
    text('_Click Continue to sign or Cancel to reject._'),
  ]);
}

/**
 * Transaction insight handler - called when user initiates a transaction
 */
export const onTransaction: OnTransactionHandler = async ({ transaction, chainId }) => {
  const to = transaction.to as string | undefined;
  const value = transaction.value as string | undefined;

  // Fetch risk analysis from API (with retry)
  const analysis = await fetchRiskAnalysis(to, value, chainId);

  // Handle API failure - show fallback warning
  if (!analysis) {
    return {
      content: buildFallbackPanel(to, value, chainId),
    };
  }

  // Show successful analysis
  return {
    content: buildSuccessPanel(analysis, to, value, chainId),
  };
};

// Export for testing
export { fetchRiskAnalysis, buildFallbackPanel, buildSuccessPanel };

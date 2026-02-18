// =============================================================================
// CRYPTO GUARDIAN - INTEL OBSERVATION MAPPER
// =============================================================================
// Converts risk flags + aggregator data into user-readable observation strings.
// Uses the dual-mode copy pattern (formal/plain) from copy.ts.
// =============================================================================

import { COPY_MODE } from './copy';
import type { IntelEnrichment } from './backend';

export interface ObservationResult {
  observations: string[];
  riskSummary: string;
  confidenceExplanation: string;
  intelReportUrl: string | null;
}

const FLAG_MAP: Record<string, { formal: string; plain: string }> = {
  'HONEYPOT_RISK':            { formal: 'Honeypot risk detected in contract',           plain: 'This token may trap your funds' },
  'HIGH_TAX':                 { formal: 'Abnormally high transaction tax detected',      plain: 'Very high fees when buying/selling' },
  'PROXY_CONTRACT':           { formal: 'Contract uses upgradeable proxy pattern',       plain: 'Contract code can be changed by owner' },
  'UNVERIFIED_SOURCE':        { formal: 'Contract source code is not verified',          plain: "Contract code is hidden — can't be reviewed" },
  'OWNERSHIP_NOT_RENOUNCED':  { formal: 'Contract ownership not renounced',              plain: 'Someone still controls this contract' },
  'LOW_LIQUIDITY':            { formal: 'Low liquidity pool depth',                      plain: 'Very little money backing this token' },
  'VERY_LOW_LIQUIDITY':       { formal: 'Critically low liquidity',                      plain: 'Almost no money backing this token' },
  'MINT_AUTHORITY_PRESENT':   { formal: 'Mint authority retained — supply can increase',  plain: 'Owner can create more tokens anytime' },
  'FREEZE_AUTHORITY_PRESENT': { formal: 'Freeze authority present — accounts can be frozen', plain: 'Owner can freeze your tokens' },
  'HIGH_HOLDER_CONCENTRATION': { formal: 'Top holders control large supply percentage',  plain: 'A few wallets hold most of the supply' },
  'EXTREME_HOLDER_CONCENTRATION': { formal: 'Extreme holder concentration detected',     plain: 'A tiny number of wallets control most tokens' },
  'CREATOR_IS_NEW_WALLET':   { formal: 'Creator wallet has no prior history',            plain: 'Created by a brand-new wallet' },
  'LP_NOT_LOCKED':           { formal: 'Liquidity pool is not locked',                   plain: 'Liquidity can be pulled at any time' },
  'RUGCHECK_HIGH_RISK':      { formal: 'RugCheck: High rugpull risk score',              plain: 'High risk of being a rug pull' },
  'VERY_FEW_HOLDERS':        { formal: 'Token has very few holders',                     plain: 'Almost nobody holds this token' },
  'TOKEN_2022':              { formal: 'Token uses Token-2022 program extensions',        plain: 'Token uses newer program with extra features' },
};

// Source name mapping for display
const SOURCE_NAMES: Record<string, string> = {
  goplus: 'GoPlus',
  dexscreener: 'DexScreener',
  blockExplorer: 'BlockExplorer',
  coingecko: 'CoinGecko',
  helius: 'Helius',
  solscan: 'Solscan',
  debank: 'Debank',
  birdeye: 'Birdeye',
  rugcheck: 'RugCheck',
};

const INTEL_REPORT_BASE = 'https://cryptoguardians.io/intel';

/**
 * Generate a human-readable risk summary based on recommendation and risk score.
 */
function buildRiskSummary(intel: IntelEnrichment): string {
  const flagCount = intel.riskFlags.length + intel.scamIndicators.length;

  if (intel.recommendation === 'DANGEROUS' || intel.riskScore >= 70) {
    return COPY_MODE === 'formal'
      ? `This token exhibits multiple high-risk indicators including ${flagCount > 0 ? `${flagCount} risk flags` : 'elevated risk patterns'}. Exercise extreme caution.`
      : `This token shows multiple warning signs${flagCount > 0 ? ` including ${flagCount} risk indicators` : ''}. Be very careful.`;
  }

  if (intel.recommendation === 'CAUTION' || intel.riskScore >= 30) {
    return COPY_MODE === 'formal'
      ? `This token has moderate risk indicators${flagCount > 0 ? ` (${flagCount} flags detected)` : ''}. Review carefully before interacting.`
      : `This token has some risk indicators${flagCount > 0 ? ` (${flagCount} found)` : ''}. Review carefully before interacting.`;
  }

  return COPY_MODE === 'formal'
    ? 'No major risk indicators detected based on available intelligence sources.'
    : 'No major risk indicators detected based on available intelligence sources.';
}

/**
 * Generate a confidence explanation string.
 */
function buildConfidenceExplanation(intel: IntelEnrichment): string {
  const pct = intel.confidenceScore;
  const srcCount = intel.sourcesAvailable;

  return COPY_MODE === 'formal'
    ? `Confidence: ${pct}% based on analysis from ${srcCount} intelligence source${srcCount !== 1 ? 's' : ''}.`
    : `Confidence: ${pct}% based on ${srcCount} intelligence source${srcCount !== 1 ? 's' : ''}.`;
}

/**
 * Build the full intelligence report URL for this token.
 */
export function buildIntelReportUrl(contractAddress: string, chain: string = 'eth'): string {
  return `${INTEL_REPORT_BASE}/${contractAddress}?chain=${chain}`;
}

/**
 * Convert intel enrichment data into user-readable observation strings.
 * Unknown flags are silently skipped. Observation count is capped to avoid
 * overwhelming the MetaMask dialog.
 */
export function mapIntelToObservations(intel: IntelEnrichment): ObservationResult {
  const observations: string[] = [];

  // 1. Token identity (if known)
  if (intel.tokenName && intel.tokenSymbol) {
    const line = COPY_MODE === 'formal'
      ? `Token identified: ${intel.tokenName} (${intel.tokenSymbol})`
      : `Token: ${intel.tokenName} (${intel.tokenSymbol})`;
    observations.push(line);
  }

  // 2. Contract verification status
  if (intel.isVerified) {
    observations.push(
      COPY_MODE === 'formal'
        ? 'Contract source: Verified on block explorer'
        : 'Contract code: Publicly verified',
    );
  }

  // 3. Liquidity snapshot
  if (intel.liquidityUsd > 0) {
    const formatted = intel.liquidityUsd >= 1_000_000
      ? `$${(intel.liquidityUsd / 1_000_000).toFixed(1)}M`
      : intel.liquidityUsd >= 1_000
        ? `$${(intel.liquidityUsd / 1_000).toFixed(0)}K`
        : `$${intel.liquidityUsd.toFixed(0)}`;
    observations.push(
      COPY_MODE === 'formal'
        ? `Liquidity pool depth: ${formatted}`
        : `Liquidity: ${formatted}`,
    );
  }

  // 4. Risk flag observations (max 5, most important first)
  for (const flag of intel.riskFlags.slice(0, 5)) {
    const mapping = FLAG_MAP[flag];
    if (mapping) {
      observations.push(mapping[COPY_MODE]);
    }
  }

  // 5. Scam indicators (max 3, always alarming)
  for (const indicator of intel.scamIndicators.slice(0, 3)) {
    const mapping = FLAG_MAP[indicator];
    if (mapping) {
      observations.push(mapping[COPY_MODE]);
    }
  }

  return {
    observations,
    riskSummary: buildRiskSummary(intel),
    confidenceExplanation: buildConfidenceExplanation(intel),
    intelReportUrl: null, // URL is built per-token at render time
  };
}

/**
 * Get the display names for sources used in analysis.
 */
export function getSourceNames(sourceKeys: string[]): string[] {
  return sourceKeys
    .map((key) => SOURCE_NAMES[key] || key)
    .filter(Boolean);
}

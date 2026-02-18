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
  'CREATOR_IS_NEW_WALLET':   { formal: 'Creator wallet has no prior history',            plain: 'Created by a brand-new wallet' },
  'LP_NOT_LOCKED':           { formal: 'Liquidity pool is not locked',                   plain: 'Liquidity can be pulled at any time' },
  'RUGCHECK_HIGH_RISK':      { formal: 'RugCheck: High rugpull risk score',              plain: 'High risk of being a rug pull' },
};

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

  return { observations };
}

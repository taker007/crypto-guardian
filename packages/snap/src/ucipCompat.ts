// =============================================================================
// UCIP COMPATIBILITY LAYER — Snap v1.2 preparation (dark launch)
// =============================================================================
// Bridges legacy `usage.tier` (returned from /api/scan) with UCIP-native
// `entitlement.tier` (returned from /api/v2/customers/me/entitlement).
//
// Callers use `resolveTierWithFallback(...)` which:
//   1. If the flag is OFF (default) → returns the legacy tier unchanged (Snap
//      behavior byte-for-byte identical to v1.1.3).
//   2. If the flag is PRIMARY/LEGACY_REMOVED → attempts UCIP fetch first, falls
//      back to legacy on any failure.
//
// This file has ONE job: preserve legacy behavior under OFF and provide a
// clean opt-in path for later Sprints. It NEVER throws.
// =============================================================================

import type { UsageSignals } from './types';
import { ucipFetchEntitlement, type UcipRequestContext, type UcipTier } from './ucipClient';

export interface TierResolutionInput {
  legacyUsage: Pick<UsageSignals, 'tier'>;
  ucipContext?: UcipRequestContext;
}

export interface TierResolution {
  tier: UcipTier;
  source: 'legacy' | 'ucip';
}

/**
 * Preferred tier resolver. Under OFF (production default) returns the legacy
 * tier verbatim — no async network call, no behavior change. When ctx is
 * omitted, behaves as if the flag is OFF (safe default for callers that don't
 * have a token available).
 */
export async function resolveTierWithFallback(
  input: TierResolutionInput,
): Promise<TierResolution> {
  if (!input.ucipContext) {
    return { tier: input.legacyUsage.tier, source: 'legacy' };
  }
  const ucip = await ucipFetchEntitlement(input.ucipContext);
  if (ucip) return { tier: ucip.tier, source: 'ucip' };
  return { tier: input.legacyUsage.tier, source: 'legacy' };
}

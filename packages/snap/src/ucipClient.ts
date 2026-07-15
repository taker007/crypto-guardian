// =============================================================================
// UCIP CLIENT — Snap v1.2 preparation (dark launch)
// =============================================================================
// Reads the UCIP-canonical entitlement from /api/v2/customers/me/entitlement.
//
// Contract: NEVER throws. Returns `null` on any failure (flag off, network
// error, non-2xx response, JSON parse error, malformed body). Every caller
// must have a legacy fallback path — this file exposes no side-effect that
// could alter Snap behavior when the flag is off.
//
// The Snap is a READ-ONLY consumer of identity — it does not authenticate
// customers directly, it consumes an entitlement tier that the backend
// resolved. That means the Snap's role during dual-write is trivially safe:
// the UCIP path and the legacy path resolve to the same tier when SHADOW /
// DUAL_WRITE are in effect. The Snap can safely opt into the UCIP path once
// the server flips to PRIMARY.
// =============================================================================

import { API_BASE_URL } from './config';
import { isUcipReadEnabled } from './ucipFeatureFlags';

export type UcipTier = 'FREE' | 'PRO' | 'ELITE';

export interface UcipEntitlement {
  tier: UcipTier;
  source: 'admin_override' | 'stripe_subscription' | 'trial' | 'default';
  expiresAt: string | null;
  stripeSubscriptionId: string | null;
}

export interface UcipRequestContext {
  /**
   * Injection point for the MetaMask Snap `snap` global. Tests pass a mock.
   */
  snapApi: {
    request: (args: { method: string; params?: unknown }) => Promise<unknown>;
  };
  /**
   * Bearer token for the current authenticated session. Snap gets this from
   * its own state (populated by the deep-link handshake). If unavailable,
   * pass an empty string — the UCIP call will fail closed and return null.
   */
  token: string;
  /**
   * Optional override for base URL (test-only). Defaults to config.API_BASE_URL.
   */
  apiBase?: string;
}

const REQUEST_TIMEOUT_MS = 8000;

/**
 * Attempt to fetch UCIP-canonical entitlement. Returns null on ANY failure.
 * Never throws. Never triggers a network call when the flag is off.
 */
export async function ucipFetchEntitlement(
  ctx: UcipRequestContext,
): Promise<UcipEntitlement | null> {
  if (!(await isUcipReadEnabled(ctx.snapApi))) return null;
  if (!ctx.token) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const url = `${ctx.apiBase ?? API_BASE_URL}/api/v2/customers/me/entitlement`;
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${ctx.token}`,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { data?: UcipEntitlement } | null;
    const data = body?.data;
    if (!data || typeof data.tier !== 'string') return null;
    // Normalize: only allow known tier strings; anything else = null (fail closed)
    if (data.tier !== 'FREE' && data.tier !== 'PRO' && data.tier !== 'ELITE') return null;
    return {
      tier: data.tier,
      source: data.source,
      expiresAt: data.expiresAt ?? null,
      stripeSubscriptionId: data.stripeSubscriptionId ?? null,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

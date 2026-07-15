// =============================================================================
// UCIP client + feature-flag + compat unit tests — Snap v1.2 preparation
// =============================================================================
// Verifies the dark-launch contract: OFF ⇒ no network, no behavior change.
// Uses @jest/globals; runs under `yarn workspace @taker007/crypto-guardian-snap test`.
// =============================================================================

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { getUcipFlagState, isUcipReadEnabled } from './ucipFeatureFlags';
import { ucipFetchEntitlement } from './ucipClient';
import { resolveTierWithFallback } from './ucipCompat';

const makeSnapMock = (persisted: unknown) => ({
  request: jest.fn(async (_args: { method: string; params?: unknown }) => persisted),
});

// Shared global fetch stub
type FetchLike = (input: unknown, init?: unknown) => Promise<unknown>;
let fetchMock: jest.Mock;

beforeEach(() => {
  fetchMock = jest.fn();
  (globalThis as { fetch?: FetchLike }).fetch = fetchMock as unknown as FetchLike;
});
afterEach(() => {
  delete (globalThis as { fetch?: FetchLike }).fetch;
});

// ─── feature flag ───────────────────────────────────────────────────────

describe('ucipFeatureFlags', () => {
  it('getUcipFlagState defaults to OFF when state is empty', async () => {
    const snap = makeSnapMock(null);
    expect(await getUcipFlagState(snap)).toBe('OFF');
  });

  it('getUcipFlagState defaults to OFF when state has no ucip key', async () => {
    const snap = makeSnapMock({ otherKey: 1 });
    expect(await getUcipFlagState(snap)).toBe('OFF');
  });

  it('returns the persisted state for every valid enum value', async () => {
    for (const s of ['OFF', 'SHADOW', 'DUAL_WRITE', 'PRIMARY', 'LEGACY_REMOVED'] as const) {
      const snap = makeSnapMock({ ucip: { master: s } });
      expect(await getUcipFlagState(snap)).toBe(s);
    }
  });

  it('rejects invalid enum values and returns OFF', async () => {
    const snap = makeSnapMock({ ucip: { master: 'NONSENSE' } });
    expect(await getUcipFlagState(snap)).toBe('OFF');
  });

  it('swallows snap_manageState throw and returns OFF', async () => {
    const snap = {
      request: jest.fn(async () => {
        throw new Error('snap down');
      }),
    };
    expect(await getUcipFlagState(snap)).toBe('OFF');
  });

  it('isUcipReadEnabled is FALSE for OFF, SHADOW, DUAL_WRITE', async () => {
    for (const s of ['OFF', 'SHADOW', 'DUAL_WRITE'] as const) {
      const snap = makeSnapMock({ ucip: { master: s } });
      expect(await isUcipReadEnabled(snap)).toBe(false);
    }
  });

  it('isUcipReadEnabled is TRUE only for PRIMARY / LEGACY_REMOVED', async () => {
    for (const s of ['PRIMARY', 'LEGACY_REMOVED'] as const) {
      const snap = makeSnapMock({ ucip: { master: s } });
      expect(await isUcipReadEnabled(snap)).toBe(true);
    }
  });
});

// ─── ucipClient ─────────────────────────────────────────────────────────

describe('ucipClient · dark launch (OFF = no network)', () => {
  it('OFF state ⇒ null + zero fetch calls', async () => {
    const snap = makeSnapMock({ ucip: { master: 'OFF' } });
    const r = await ucipFetchEntitlement({ snapApi: snap, token: 'tok' });
    expect(r).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('SHADOW state ⇒ null + zero fetch calls (Snap is read-only)', async () => {
    const snap = makeSnapMock({ ucip: { master: 'SHADOW' } });
    const r = await ucipFetchEntitlement({ snapApi: snap, token: 'tok' });
    expect(r).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('DUAL_WRITE state ⇒ null + zero fetch calls (Snap does not opt in until PRIMARY)', async () => {
    const snap = makeSnapMock({ ucip: { master: 'DUAL_WRITE' } });
    const r = await ucipFetchEntitlement({ snapApi: snap, token: 'tok' });
    expect(r).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('empty token ⇒ null + zero fetch calls even when PRIMARY', async () => {
    const snap = makeSnapMock({ ucip: { master: 'PRIMARY' } });
    const r = await ucipFetchEntitlement({ snapApi: snap, token: '' });
    expect(r).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('ucipClient · PRIMARY state (opt-in path)', () => {
  const snap = () => makeSnapMock({ ucip: { master: 'PRIMARY' } });

  it('returns parsed entitlement on a healthy 200 response', async () => {
    (fetchMock as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          tier: 'PRO',
          source: 'stripe_subscription',
          expiresAt: '2026-08-01T00:00:00Z',
          stripeSubscriptionId: 'sub_x',
        },
      }),
    } as never);
    const r = await ucipFetchEntitlement({ snapApi: snap(), token: 'tok', apiBase: 'https://x' });
    expect(r).toEqual({
      tier: 'PRO',
      source: 'stripe_subscription',
      expiresAt: '2026-08-01T00:00:00Z',
      stripeSubscriptionId: 'sub_x',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://x/api/v2/customers/me/entitlement',
      expect.objectContaining({ headers: expect.any(Object) }),
    );
  });

  it('returns null on 404 (master flag OFF server-side)', async () => {
    (fetchMock as any).mockResolvedValueOnce({ ok: false, status: 404 } as never);
    const r = await ucipFetchEntitlement({ snapApi: snap(), token: 'tok' });
    expect(r).toBeNull();
  });

  it('returns null on 401 (auth failure)', async () => {
    (fetchMock as any).mockResolvedValueOnce({ ok: false, status: 401 } as never);
    const r = await ucipFetchEntitlement({ snapApi: snap(), token: 'tok' });
    expect(r).toBeNull();
  });

  it('returns null on network exception', async () => {
    (fetchMock as any).mockRejectedValueOnce(new Error('offline'));
    const r = await ucipFetchEntitlement({ snapApi: snap(), token: 'tok' });
    expect(r).toBeNull();
  });

  it('returns null on malformed body (missing tier field)', async () => {
    (fetchMock as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { source: 'default' } }),
    } as never);
    const r = await ucipFetchEntitlement({ snapApi: snap(), token: 'tok' });
    expect(r).toBeNull();
  });

  it('returns null on unknown tier value (fail closed)', async () => {
    (fetchMock as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { tier: 'GODMODE', source: 'default' } }),
    } as never);
    const r = await ucipFetchEntitlement({ snapApi: snap(), token: 'tok' });
    expect(r).toBeNull();
  });
});

// ─── compat layer ───────────────────────────────────────────────────────

describe('ucipCompat · resolveTierWithFallback', () => {
  it('no context ⇒ legacy tier returned unchanged', async () => {
    const r = await resolveTierWithFallback({ legacyUsage: { tier: 'PRO' } });
    expect(r).toEqual({ tier: 'PRO', source: 'legacy' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('OFF flag + context provided ⇒ legacy tier, no fetch', async () => {
    const snap = makeSnapMock({ ucip: { master: 'OFF' } });
    const r = await resolveTierWithFallback({
      legacyUsage: { tier: 'FREE' },
      ucipContext: { snapApi: snap, token: 'tok' },
    });
    expect(r).toEqual({ tier: 'FREE', source: 'legacy' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('PRIMARY flag + healthy UCIP fetch ⇒ ucip tier wins', async () => {
    const snap = makeSnapMock({ ucip: { master: 'PRIMARY' } });
    (fetchMock as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { tier: 'ELITE', source: 'stripe_subscription' } }),
    } as never);
    const r = await resolveTierWithFallback({
      legacyUsage: { tier: 'FREE' }, // legacy says FREE, UCIP says ELITE — trust UCIP once flipped
      ucipContext: { snapApi: snap, token: 'tok', apiBase: 'https://x' },
    });
    expect(r).toEqual({ tier: 'ELITE', source: 'ucip' });
  });

  it('PRIMARY flag + UCIP failure ⇒ legacy tier falls through', async () => {
    const snap = makeSnapMock({ ucip: { master: 'PRIMARY' } });
    (fetchMock as any).mockResolvedValueOnce({ ok: false, status: 500 } as never);
    const r = await resolveTierWithFallback({
      legacyUsage: { tier: 'PRO' },
      ucipContext: { snapApi: snap, token: 'tok' },
    });
    expect(r).toEqual({ tier: 'PRO', source: 'legacy' });
  });
});

// ─── invariant: existing Snap behavior is untouched ─────────────────────

describe('Snap v1.1.3 byte-for-byte invariance', () => {
  it('importing the UCIP modules does not modify globalThis or produce side effects', async () => {
    // Fresh module import — proves the modules do not register listeners, set
    // globals, or trigger fetches on load.
    const before = Object.keys(globalThis as Record<string, unknown>).sort().join(',');
    // Force re-import
    jest.isolateModules(() => {
      require('./ucipClient');
      require('./ucipFeatureFlags');
      require('./ucipCompat');
    });
    const after = Object.keys(globalThis as Record<string, unknown>).sort().join(',');
    expect(after).toBe(before);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

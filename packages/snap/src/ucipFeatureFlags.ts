// =============================================================================
// UCIP FEATURE FLAGS — Snap v1.2 preparation (dark launch)
// =============================================================================
// Mirrors the 5-state model from snap-platform's featureFlags.ts so operators
// can reason about the Snap the same way they reason about backend flags.
//
// State meanings (identical to server):
//   OFF            — capability entirely disabled; legacy behavior only
//   SHADOW         — capability writes to UCIP but reads from legacy (server-side only concept)
//   DUAL_WRITE     — capability writes to BOTH; reads from legacy
//   PRIMARY        — capability writes/reads UCIP only
//   LEGACY_REMOVED — legacy code paths deleted
//
// The Snap ONLY reads (never writes identity), so it distinguishes between:
//   OFF/SHADOW/DUAL_WRITE → read legacy `/api/scan` response
//   PRIMARY/LEGACY_REMOVED → read `/api/v2/*` and fall back to legacy on any error
//
// Storage: `snap_manageState({ operation: 'get' })` under the `ucip` key.
// Defaults to OFF. Runtime override via snap_manageState set.
// =============================================================================

export type UcipFlagState = 'OFF' | 'SHADOW' | 'DUAL_WRITE' | 'PRIMARY' | 'LEGACY_REMOVED';

const VALID_STATES: readonly UcipFlagState[] = [
  'OFF',
  'SHADOW',
  'DUAL_WRITE',
  'PRIMARY',
  'LEGACY_REMOVED',
] as const;

/**
 * Read the current UCIP flag state from Snap persistent storage. Returns OFF
 * on any failure (missing key, JSON parse error, invalid enum). Never throws.
 *
 * `snapApi` is an injection point matching the shape of the MetaMask Snap
 * `snap` global; tests pass a mock. In production callers pass `snap` itself.
 */
export async function getUcipFlagState(
  snapApi: { request: (args: { method: string; params?: unknown }) => Promise<unknown> },
): Promise<UcipFlagState> {
  try {
    const state = (await snapApi.request({
      method: 'snap_manageState',
      params: { operation: 'get' },
    })) as { ucip?: { master?: string } } | null | undefined;
    const raw = state?.ucip?.master;
    if (typeof raw !== 'string') return 'OFF';
    if ((VALID_STATES as readonly string[]).includes(raw)) return raw as UcipFlagState;
    return 'OFF';
  } catch {
    return 'OFF';
  }
}

/**
 * True iff the Snap should ATTEMPT to read from /api/v2/*. Callers are expected
 * to fall back to legacy on any failure — this is a request, not a mandate.
 */
export async function isUcipReadEnabled(
  snapApi: { request: (args: { method: string; params?: unknown }) => Promise<unknown> },
): Promise<boolean> {
  const s = await getUcipFlagState(snapApi);
  return s === 'PRIMARY' || s === 'LEGACY_REMOVED';
}

// =============================================================================
// CRYPTO GUARDIAN - ENVIRONMENT CONFIGURATION
// =============================================================================
// Routes API calls to the production backend. The Snap only ever ships
// pointing at HTTPS on cryptoguardians.io — no non-production endpoints
// (per MetaMask Snap Directory submission requirement, commit a5a8850
// from 2026-03-05).
//
// For local dev iteration, set SNAP_BACKEND_OVERRIDE in your shell
// before `yarn start`. The override MUST be an HTTPS URL unless you're
// in an explicit Node test environment (snaps-jest mock server).
// =============================================================================

const PROD_BACKEND = 'https://cryptoguardians.io';

function resolveBackend(): string {
  // process.env.SNAP_BACKEND_OVERRIDE is inlined at build time by mm-snap.
  // In production builds it's undefined → returns PROD_BACKEND.
  const override = process.env.SNAP_BACKEND_OVERRIDE;
  if (!override) return PROD_BACKEND;
  if (override.startsWith('https://')) return override;
  // Permit a single explicit non-HTTPS escape hatch for the test runner
  // (snaps-jest spins up its own loopback mock server). Refuse anything else.
  if (process.env.NODE_ENV === 'test') return override;
  return PROD_BACKEND;
}

export const API_BASE_URL = resolveBackend();
export const SCAN_API_URL = `${API_BASE_URL}/api/scan`;
export const TX_SIM_API_URL = `${API_BASE_URL}/api/tx/simulate`;

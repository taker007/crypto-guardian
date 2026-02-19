// =============================================================================
// CRYPTO GUARDIAN - ENVIRONMENT CONFIGURATION
// =============================================================================
// Routes API calls to the correct backend based on build environment.
// In production builds, process.env.NODE_ENV is inlined as "production"
// by the mm-snap bundler, so the URL resolves at build time.
// =============================================================================

export const API_BASE_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://cryptoguardians.io'
    : 'http://192.168.20.60:4006';

export const SCAN_API_URL = `${API_BASE_URL}/api/scan`;
export const TX_SIM_API_URL = `${API_BASE_URL}/api/tx/simulate`;

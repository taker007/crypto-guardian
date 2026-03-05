// =============================================================================
// CRYPTO GUARDIAN - ENVIRONMENT CONFIGURATION
// =============================================================================
// All API calls route to the production cloud backend.
//
// IMPORTANT: MetaMask Snaps must NEVER reference localhost or private IPs.
// The mm-snap bundler inlines these values at build time. Any non-HTTPS
// URL will cause rejection during Snap Directory review.
// =============================================================================

const PRODUCTION_API = 'https://cryptoguardians.io';

/**
 * Runtime guard: reject localhost / private-IP URLs.
 * This prevents accidental development URLs from reaching production builds.
 */
function validateApiUrl(url: string): string {
  const forbidden = /localhost|127\.0\.0\.1|0\.0\.0\.0|192\.168\.|10\.\d|172\.(1[6-9]|2\d|3[01])\./i;
  if (forbidden.test(url)) {
    console.error('[CryptoGuard] Blocked non-production API URL');
    return PRODUCTION_API;
  }
  if (!url.startsWith('https://')) {
    console.error('[CryptoGuard] Blocked non-HTTPS API URL');
    return PRODUCTION_API;
  }
  return url;
}

export const API_BASE_URL = validateApiUrl(PRODUCTION_API);
export const SCAN_API_URL = `${API_BASE_URL}/api/scan`;
export const TX_SIM_API_URL = `${API_BASE_URL}/api/tx/simulate`;

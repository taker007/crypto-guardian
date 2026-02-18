// =============================================================================
// CRYPTO GUARDIAN - DEEP INTELLIGENCE REPORT PAGE
// =============================================================================
// Public page: /intel/<contractAddress>?chain=<chain>
//
// Shows full intelligence report from the 9-source aggregator.
// Pro features section shown to all users with upgrade prompt.
//
// This is a standalone page that fetches from the Intel Report API.
// =============================================================================

const API_BASE = 'http://localhost:4008'; // Registered in ~/.port-registry for crypto-guardian/api

interface IntelReport {
  contractAddress: string;
  chain: string;
  timestamp: number;
  riskScore: number;
  riskLevel: string;
  confidenceScore: number;
  recommendation: string;
  tokenName: string;
  tokenSymbol: string;
  isVerified: boolean;
  sourcesUsed: string[];
  sourcesAvailable: number;
  sourcesTotal: number;
  riskFlags: string[];
  scamIndicators: string[];
  liquidityUsd: number;
  priceUsd: number;
  marketCap: number;
  volume24h: number;
  tokenAgeDays: number;
  creatorAddress: string | null;
  isProxy: boolean;
  isMalicious: boolean;
  isHoneypot: boolean;
  analysisTimeMs: number;
}

interface ProFeature {
  id: string;
  label: string;
  description: string;
}

// Extract contract address and chain from URL
function getParamsFromUrl(): { contractAddress: string; chain: string } {
  const path = window.location.pathname;
  const match = path.match(/\/intel\/([a-zA-Z0-9]+)/);
  const params = new URLSearchParams(window.location.search);

  return {
    contractAddress: match?.[1] || '',
    chain: params.get('chain') || 'eth',
  };
}

// Format USD values
function formatUsd(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
}

// Get risk level color
function getRiskColor(recommendation: string): string {
  switch (recommendation) {
    case 'DANGEROUS': return '#dc3545';
    case 'CAUTION': return '#ffc107';
    case 'SAFE': return '#28a745';
    default: return '#6c757d';
  }
}

// Track conversion events
function trackEvent(eventName: string, data: Record<string, string> = {}): void {
  console.log(`[Analytics] ${eventName}`, data);
  // Future: send to analytics backend
}

// Fetch intel report from API
async function fetchReport(contractAddress: string, chain: string): Promise<IntelReport | null> {
  try {
    const url = `${API_BASE}/api/intel/report?contractAddress=${encodeURIComponent(contractAddress)}&chain=${encodeURIComponent(chain)}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

// Fetch pro features
async function fetchProFeatures(): Promise<ProFeature[]> {
  try {
    const response = await fetch(`${API_BASE}/api/intel/pro-features`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.features || [];
  } catch {
    return [];
  }
}

// Render the full page
async function renderPage(): Promise<void> {
  const { contractAddress, chain } = getParamsFromUrl();
  const container = document.getElementById('app');
  if (!container) return;

  if (!contractAddress) {
    container.innerHTML = '<div class="error"><h2>Missing contract address</h2><p>Usage: /intel/&lt;contractAddress&gt;?chain=eth</p></div>';
    return;
  }

  container.innerHTML = '<div class="loading"><p>Analyzing token...</p></div>';
  trackEvent('intel_report_opened', { contractAddress, chain });

  const [report, proFeatures] = await Promise.all([
    fetchReport(contractAddress, chain),
    fetchProFeatures(),
  ]);

  if (!report) {
    container.innerHTML = '<div class="error"><h2>Analysis failed</h2><p>Unable to fetch intelligence for this token. Please try again later.</p></div>';
    return;
  }

  const riskColor = getRiskColor(report.recommendation);

  container.innerHTML = `
    <div class="report">
      <header>
        <h1>Crypto Guardian Intelligence Report</h1>
        <p class="subtitle">${report.tokenName ? `${report.tokenName} (${report.tokenSymbol})` : report.contractAddress}</p>
        <p class="meta">Chain: ${report.chain.toUpperCase()} | Analyzed in ${report.analysisTimeMs}ms | ${new Date(report.timestamp).toLocaleString()}</p>
      </header>

      <section class="risk-overview">
        <div class="risk-score" style="border-color: ${riskColor}">
          <span class="score-value">${report.riskScore}</span>
          <span class="score-label">Risk Score</span>
        </div>
        <div class="risk-details">
          <div class="detail-row">
            <span class="label">Recommendation</span>
            <span class="value" style="color: ${riskColor}; font-weight: bold;">${report.recommendation}</span>
          </div>
          <div class="detail-row">
            <span class="label">Confidence</span>
            <span class="value">${report.confidenceScore}% (${report.sourcesAvailable}/${report.sourcesTotal} sources)</span>
          </div>
          <div class="detail-row">
            <span class="label">Sources Used</span>
            <span class="value">${report.sourcesUsed.join(', ')}</span>
          </div>
        </div>
      </section>

      <section class="market-data">
        <h2>Market Data</h2>
        <div class="grid">
          <div class="card"><span class="card-label">Price</span><span class="card-value">${formatUsd(report.priceUsd)}</span></div>
          <div class="card"><span class="card-label">Market Cap</span><span class="card-value">${formatUsd(report.marketCap)}</span></div>
          <div class="card"><span class="card-label">Liquidity</span><span class="card-value">${formatUsd(report.liquidityUsd)}</span></div>
          <div class="card"><span class="card-label">24h Volume</span><span class="card-value">${formatUsd(report.volume24h)}</span></div>
          <div class="card"><span class="card-label">Token Age</span><span class="card-value">${report.tokenAgeDays} days</span></div>
          <div class="card"><span class="card-label">Verified</span><span class="card-value">${report.isVerified ? 'Yes' : 'No'}</span></div>
        </div>
      </section>

      <section class="contract-info">
        <h2>Contract Analysis</h2>
        <div class="detail-row"><span class="label">Contract</span><span class="value mono">${report.contractAddress}</span></div>
        ${report.creatorAddress ? `<div class="detail-row"><span class="label">Creator</span><span class="value mono">${report.creatorAddress}</span></div>` : ''}
        <div class="detail-row"><span class="label">Proxy Contract</span><span class="value">${report.isProxy ? 'Yes' : 'No'}</span></div>
        <div class="detail-row"><span class="label">Honeypot Detected</span><span class="value">${report.isHoneypot ? 'YES' : 'No'}</span></div>
        <div class="detail-row"><span class="label">Malicious</span><span class="value">${report.isMalicious ? 'YES' : 'No'}</span></div>
      </section>

      ${report.riskFlags.length > 0 ? `
      <section class="risk-flags">
        <h2>Risk Flags (${report.riskFlags.length})</h2>
        <ul>${report.riskFlags.map(f => `<li class="flag-item">${f}</li>`).join('')}</ul>
      </section>` : ''}

      ${report.scamIndicators.length > 0 ? `
      <section class="scam-indicators">
        <h2>Scam Indicators (${report.scamIndicators.length})</h2>
        <ul>${report.scamIndicators.map(f => `<li class="flag-item scam">${f}</li>`).join('')}</ul>
      </section>` : ''}

      <section class="pro-section">
        <h2>Advanced Intelligence (Pro)</h2>
        <p class="pro-description">Unlock deeper analysis with Crypto Guardian Pro:</p>
        <div class="pro-features">
          ${proFeatures.map(f => `
            <div class="pro-feature">
              <span class="pro-feature-label">${f.label}</span>
              <span class="pro-feature-desc">${f.description}</span>
            </div>
          `).join('')}
        </div>
        <a href="https://cryptoguardians.io/pro" class="pro-cta" onclick="trackProClick()">
          Upgrade to Pro
        </a>
      </section>

      <footer>
        <p>Crypto Guardian provides risk signals to inform your decisions. This report is informational only and does not constitute financial advice.</p>
      </footer>
    </div>
  `;
}

// Global function for Pro CTA click tracking
(window as any).trackProClick = () => {
  trackEvent('intel_report_pro_upgrade_clicked');
};

// Initialize page
renderPage();

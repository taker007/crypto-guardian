import { mapIntelToObservations, buildIntelReportUrl } from '../src/intelMapper';
import type { IntelEnrichment } from '../src/backend';

// COPY_MODE is 'plain' in copy.ts — tests run against plain mode by default.
// Formal-mode tests use jest.mock to override.

function makeIntel(overrides: Partial<IntelEnrichment> = {}): IntelEnrichment {
  return {
    riskScore: 50,
    confidenceScore: 75,
    recommendation: 'CAUTION',
    tokenName: '',
    tokenSymbol: '',
    riskFlags: [],
    scamIndicators: [],
    liquidityUsd: 0,
    isVerified: false,
    creatorAddress: null,
    sourcesAvailable: 5,
    sourcesTotal: 9,
    sourceNames: ['goplus', 'dexscreener', 'blockExplorer', 'coingecko', 'birdeye'],
    reportStatus: 'READY',
    ...overrides,
  };
}

describe('mapIntelToObservations', () => {
  // 1. Empty intel — no flags, no name, no liquidity
  it('returns empty observations for intel with no flags, no name, no liquidity', () => {
    const result = mapIntelToObservations(makeIntel());
    expect(result.observations).toEqual([]);
  });

  // 2. Token name/symbol
  it('includes token name and symbol when present', () => {
    const result = mapIntelToObservations(
      makeIntel({ tokenName: 'Wrapped Ether', tokenSymbol: 'WETH' }),
    );
    expect(result.observations).toContain('Token: Wrapped Ether (WETH)');
  });

  // 3. Verified contract
  it('includes verified line when isVerified is true', () => {
    const result = mapIntelToObservations(makeIntel({ isVerified: true }));
    expect(result.observations).toContain('Contract code: Publicly verified');
  });

  // 4. Liquidity formatting — thousands
  it('formats liquidity as $K for thousands', () => {
    const result = mapIntelToObservations(makeIntel({ liquidityUsd: 45_000 }));
    expect(result.observations).toContain('Liquidity: $45K');
  });

  // 5. Liquidity formatting — millions
  it('formats liquidity as $M for millions', () => {
    const result = mapIntelToObservations(makeIntel({ liquidityUsd: 2_500_000 }));
    expect(result.observations).toContain('Liquidity: $2.5M');
  });

  // 6. Liquidity formatting — small amounts (under 1K)
  it('formats liquidity as raw dollars for small amounts', () => {
    const result = mapIntelToObservations(makeIntel({ liquidityUsd: 500 }));
    expect(result.observations).toContain('Liquidity: $500');
  });

  // 7. HONEYPOT_RISK flag in plain mode
  it('maps HONEYPOT_RISK flag to plain observation text', () => {
    const result = mapIntelToObservations(
      makeIntel({ riskFlags: ['HONEYPOT_RISK'] }),
    );
    expect(result.observations).toContain('This token may trap your funds');
  });

  // 8. Caps risk flag observations at 5
  it('caps risk flag observations at 5', () => {
    const result = mapIntelToObservations(
      makeIntel({
        riskFlags: [
          'HONEYPOT_RISK',
          'HIGH_TAX',
          'PROXY_CONTRACT',
          'UNVERIFIED_SOURCE',
          'OWNERSHIP_NOT_RENOUNCED',
          'LOW_LIQUIDITY',
          'LP_NOT_LOCKED',
        ],
      }),
    );
    // Should include first 5 mapped flags, not the 6th or 7th
    const flagObservations = result.observations; // no name/verified/liquidity lines
    expect(flagObservations).toContain('This token may trap your funds');       // HONEYPOT_RISK
    expect(flagObservations).toContain('Very high fees when buying/selling');    // HIGH_TAX
    expect(flagObservations).toContain('Contract code can be changed by owner'); // PROXY_CONTRACT
    expect(flagObservations).toContain("Contract code is hidden — can't be reviewed"); // UNVERIFIED_SOURCE
    expect(flagObservations).toContain('Someone still controls this contract'); // OWNERSHIP_NOT_RENOUNCED
    expect(flagObservations).not.toContain('Very little money backing this token'); // LOW_LIQUIDITY — 6th, should be cut
    expect(flagObservations).not.toContain('Liquidity can be pulled at any time');  // LP_NOT_LOCKED — 7th, should be cut
  });

  // 9. Caps scam indicator observations at 3
  it('caps scam indicator observations at 3', () => {
    const result = mapIntelToObservations(
      makeIntel({
        scamIndicators: [
          'HONEYPOT_RISK',
          'HIGH_TAX',
          'PROXY_CONTRACT',
          'LOW_LIQUIDITY',
        ],
      }),
    );
    // Only first 3 scam indicators should be mapped
    expect(result.observations).toContain('This token may trap your funds');
    expect(result.observations).toContain('Very high fees when buying/selling');
    expect(result.observations).toContain('Contract code can be changed by owner');
    expect(result.observations).not.toContain('Very little money backing this token');
  });

  // 10. Skips unknown/unmapped flags without error
  it('skips unknown flags without error', () => {
    const result = mapIntelToObservations(
      makeIntel({ riskFlags: ['TOTALLY_UNKNOWN_FLAG', 'HONEYPOT_RISK'] }),
    );
    expect(result.observations).toHaveLength(1);
    expect(result.observations).toContain('This token may trap your funds');
  });

  // 11. Multiple flag observations in order
  it('includes multiple flag observations in order', () => {
    const result = mapIntelToObservations(
      makeIntel({ riskFlags: ['LOW_LIQUIDITY', 'LP_NOT_LOCKED'] }),
    );
    expect(result.observations[0]).toBe('Very little money backing this token');
    expect(result.observations[1]).toBe('Liquidity can be pulled at any time');
  });

  // 12. Does not duplicate flags that appear in both riskFlags and scamIndicators
  it('includes flags from both riskFlags and scamIndicators sections', () => {
    const result = mapIntelToObservations(
      makeIntel({
        riskFlags: ['HONEYPOT_RISK'],
        scamIndicators: ['HIGH_TAX'],
      }),
    );
    // Both should appear
    expect(result.observations).toContain('This token may trap your funds');
    expect(result.observations).toContain('Very high fees when buying/selling');
    expect(result.observations).toHaveLength(2);
  });

  // 13. Returns riskSummary for DANGEROUS recommendation
  it('returns appropriate risk summary for DANGEROUS recommendation', () => {
    const result = mapIntelToObservations(
      makeIntel({ recommendation: 'DANGEROUS', riskScore: 85, riskFlags: ['HONEYPOT_RISK', 'LOW_LIQUIDITY'] }),
    );
    expect(result.riskSummary).toContain('warning signs');
    expect(result.riskSummary).toContain('2 risk indicators');
  });

  // 14. Returns riskSummary for CAUTION recommendation
  it('returns appropriate risk summary for CAUTION recommendation', () => {
    const result = mapIntelToObservations(
      makeIntel({ recommendation: 'CAUTION', riskScore: 45, riskFlags: ['LOW_LIQUIDITY'] }),
    );
    expect(result.riskSummary).toContain('some risk indicators');
  });

  // 15. Returns riskSummary for SAFE recommendation
  it('returns appropriate risk summary for SAFE recommendation', () => {
    const result = mapIntelToObservations(
      makeIntel({ recommendation: 'SAFE', riskScore: 10, riskFlags: [] }),
    );
    expect(result.riskSummary).toContain('No major risk indicators');
  });

  // 16. Returns confidenceExplanation
  it('returns confidence explanation with source count', () => {
    const result = mapIntelToObservations(
      makeIntel({ confidenceScore: 87, sourcesAvailable: 7 }),
    );
    expect(result.confidenceExplanation).toBe('Confidence: 87% based on 7 intelligence sources.');
  });

  // 17. Singular source in confidence explanation
  it('uses singular form for 1 source', () => {
    const result = mapIntelToObservations(
      makeIntel({ confidenceScore: 30, sourcesAvailable: 1 }),
    );
    expect(result.confidenceExplanation).toBe('Confidence: 30% based on 1 intelligence source.');
  });
});

describe('buildIntelReportUrl', () => {
  it('builds correct URL with default chain', () => {
    const url = buildIntelReportUrl('0xABC123');
    expect(url).toBe('https://cryptoguardians.io/intel/0xABC123?chain=eth');
  });

  it('builds correct URL with specified chain', () => {
    const url = buildIntelReportUrl('0xDEF456', 'sol');
    expect(url).toBe('https://cryptoguardians.io/intel/0xDEF456?chain=sol');
  });
});

// Formal mode tests — override COPY_MODE
describe('mapIntelToObservations (formal mode)', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('maps HONEYPOT_RISK flag to formal observation text', async () => {
    jest.doMock('../src/copy', () => ({
      COPY_MODE: 'formal',
    }));
    const { mapIntelToObservations: mapFormal } = await import('../src/intelMapper');
    const result = mapFormal(makeIntel({ riskFlags: ['HONEYPOT_RISK'] }));
    expect(result.observations).toContain('Honeypot risk detected in contract');
  });

  it('uses formal token identity line', async () => {
    jest.doMock('../src/copy', () => ({
      COPY_MODE: 'formal',
    }));
    const { mapIntelToObservations: mapFormal } = await import('../src/intelMapper');
    const result = mapFormal(
      makeIntel({ tokenName: 'Wrapped Ether', tokenSymbol: 'WETH' }),
    );
    expect(result.observations).toContain('Token identified: Wrapped Ether (WETH)');
  });

  it('uses formal liquidity line', async () => {
    jest.doMock('../src/copy', () => ({
      COPY_MODE: 'formal',
    }));
    const { mapIntelToObservations: mapFormal } = await import('../src/intelMapper');
    const result = mapFormal(makeIntel({ liquidityUsd: 45_000 }));
    expect(result.observations).toContain('Liquidity pool depth: $45K');
  });
});

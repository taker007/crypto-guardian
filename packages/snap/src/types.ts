// =============================================================================
// CRYPTO GUARDIAN - TYPE DEFINITIONS
// =============================================================================

/**
 * Risk level types returned by the analysis
 */
export type RiskLevel = 'LOW' | 'HIGH' | 'CRITICAL';

/**
 * Tradeability status types
 */
export type Tradeability = 'VERIFIED' | 'UNVERIFIED' | 'BLOCKED_BY_CONTRACT';

/**
 * Token analysis result structure
 */
export interface TokenAnalysis {
  riskLevel: RiskLevel;
  tradeability: Tradeability;
  // Paid tier fields (optional)
  reason?: string;
  meaning?: string;
  observations?: string[];
  warnings?: string[];
  // Intelligence-enriched fields (optional, from aggregator)
  tokenName?: string;
  tokenSymbol?: string;
  confidencePercent?: number;    // 0-100
  sourcesUsed?: number;
  sourceNames?: string[];        // e.g. ['GoPlus', 'DexScreener', 'Birdeye']
  intelObservations?: string[];  // Real observations from risk flags
  recommendation?: string;       // 'SAFE' | 'CAUTION' | 'DANGEROUS'
  riskSummary?: string;          // Human-readable risk summary
  confidenceExplanation?: string; // e.g. "Confidence: 87% based on 7 sources"
  intelReportUrl?: string;       // Link to full intel report
}

// =============================================================================
// USAGE & CONVERSION SIGNALS (from /api/scan response)
// =============================================================================

/**
 * Usage signals — always present in /api/scan response
 */
export interface UsageSignals {
  totalScans: number;
  dailyScans: number;
  remainingLifetime: number | null;
  remainingDaily: number | null;
  isUnlimited: boolean;
  tier: 'FREE' | 'PRO' | 'ELITE';
}

/**
 * Conversion signals — guide when/how to show upgrade prompts
 */
export interface ConversionSignals {
  stage: 'EARLY' | 'MID' | 'LATE' | 'BLOCKED';
  approachingLimit: boolean;
  softPrompt: boolean;
  hardBlock: boolean;
  recommendedAction: 'NONE' | 'SIGNUP' | 'UPGRADE';
  isAnonymous: boolean;
  channelHints?: {
    snapEligible?: boolean;
  };
}

// =============================================================================
// SCAN OUTCOME — structured result from backend connector
// =============================================================================

/** Successful scan with data */
export interface ScanSuccess {
  type: 'success';
  data: import('./backend').ScanResponse;
  usage: UsageSignals | null;
  conversion: ConversionSignals | null;
}

/** Scan blocked by rate limit / usage limit */
export interface ScanBlocked {
  type: 'blocked';
  usage: UsageSignals | null;
  conversion: ConversionSignals | null;
}

/** Address is not a contract (EOA) */
export interface ScanEoa {
  type: 'eoa';
}

/** Backend unavailable or other error */
export interface ScanUnavailable {
  type: 'unavailable';
  reason?: string;
}

/**
 * Union type for all possible scan outcomes.
 * The Snap uses this to determine which UI state to render.
 */
export type ScanOutcome = ScanSuccess | ScanBlocked | ScanEoa | ScanUnavailable;

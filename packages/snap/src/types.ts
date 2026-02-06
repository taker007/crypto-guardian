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
}

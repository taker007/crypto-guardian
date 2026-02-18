import type { OnRpcRequestHandler } from '@metamask/snaps-sdk';
import { Box, Text, Bold, Divider, Heading, Row } from '@metamask/snaps-sdk/jsx';

import type { RiskLevel, Tradeability, TokenAnalysis } from './types';
import { getCopy, getDynamicCopy, COPY_MODE } from './copy';
import { fetchRiskFromCryptoIntel } from './backend';
import type { ScanResponse } from './backend';
import { mapIntelToObservations } from './intelMapper';

// =============================================================================
// CRYPTO GUARDIAN SNAP - UI IMPLEMENTATION
// =============================================================================
// This SNAP provides risk signals for Ethereum tokens.
// It is advisory only and does NOT block transactions.
// Ethereum Mainnet only (v1).
//
// COPY MODE: Toggle between 'formal' and 'plain' in copy.ts
// Current mode: See COPY_MODE export in copy.ts
// =============================================================================

/**
 * Get display label for risk level
 */
function getRiskLevelLabel(level: RiskLevel): string {
  switch (level) {
    case 'LOW':
      return 'LOW';
    case 'HIGH':
      return 'HIGH';
    case 'CRITICAL':
      return 'CRITICAL';
    default:
      return 'UNKNOWN';
  }
}

/**
 * Get display label for tradeability based on copy mode
 */
function getTradeabilityLabel(tradeability: Tradeability): string {
  const dynamicCopy = getDynamicCopy();
  return dynamicCopy.tradeabilityLabels[tradeability];
}

/**
 * Map a backend risk level string to the SNAP RiskLevel type.
 * The backend may return "MEDIUM" which has no SNAP equivalent — fall back to HIGH.
 */
function mapRiskLevel(level: string): RiskLevel {
  switch (level) {
    case 'LOW':
      return 'LOW';
    case 'CRITICAL':
      return 'CRITICAL';
    default:
      return 'HIGH';
  }
}

/**
 * Map a backend tradeability string to the SNAP Tradeability type.
 * Unknown values fall back to UNVERIFIED (safest default).
 */
function mapTradeability(tradeability: string): Tradeability {
  switch (tradeability) {
    case 'VERIFIED':
      return 'VERIFIED';
    case 'BLOCKED_BY_CONTRACT':
      return 'BLOCKED_BY_CONTRACT';
    default:
      return 'UNVERIFIED';
  }
}

/** Fallback analysis returned when the backend is unreachable */
const FALLBACK_ANALYSIS: TokenAnalysis = {
  riskLevel: 'HIGH',
  tradeability: 'UNVERIFIED',
  warnings: ['Unable to verify this token at the moment.'],
};

/**
 * Convert a Crypto Intel ScanResponse into a SNAP TokenAnalysis.
 * Returns FALLBACK_ANALYSIS if the scan result is null.
 */
function mapScanToAnalysis(scan: ScanResponse | null): TokenAnalysis {
  if (!scan) {
    return FALLBACK_ANALYSIS;
  }

  const base: TokenAnalysis = {
    riskLevel: mapRiskLevel(scan.risk.level),
    tradeability: mapTradeability(scan.risk.tradeability),
    warnings: scan.risk.warnings,
  };

  // Enrich with intelligence data if available
  if (scan.intel) {
    const { observations } = mapIntelToObservations(scan.intel);
    base.tokenName = scan.intel.tokenName;
    base.tokenSymbol = scan.intel.tokenSymbol;
    base.confidencePercent = scan.intel.confidenceScore;
    base.sourcesUsed = scan.intel.sourcesAvailable;
    base.intelObservations = observations;
    base.recommendation = scan.intel.recommendation;
  }

  return base;
}

/**
 * Render the Free Tier warning screen
 * Shows: Risk level, tradeability, advisory text, upgrade prompt
 */
function renderFreeTierWarning(analysis: TokenAnalysis) {
  const c = getCopy();

  return (
    <Box>
      <Heading>{c.warningHeadline}</Heading>
      <Divider />

      <Row label={c.labelRiskLevel}>
        <Text><Bold>{getRiskLevelLabel(analysis.riskLevel)}</Bold></Text>
      </Row>

      <Row label={c.labelTradeability}>
        <Text><Bold>{getTradeabilityLabel(analysis.tradeability)}</Bold></Text>
      </Row>

      {analysis.confidencePercent !== undefined && (
        <Row label={c.labelConfidence}>
          <Text><Bold>{analysis.confidencePercent}%</Bold></Text>
        </Row>
      )}

      {analysis.sourcesUsed !== undefined && (
        <Row label={c.labelSources}>
          <Text><Bold>{analysis.sourcesUsed} checked</Bold></Text>
        </Row>
      )}

      <Divider />

      <Text>
        {c.disclaimerAnalysis}
      </Text>

      <Divider />

      <Text>
        {c.upgradePrompt}
      </Text>

      <Divider />

      <Text>
        {c.footer}
      </Text>
    </Box>
  );
}

/**
 * Render the Paid Tier analysis screen
 * Shows: All free tier info plus detailed explanations
 */
function renderPaidTierAnalysis(analysis: TokenAnalysis) {
  const c = getCopy();

  return (
    <Box>
      <Heading>{c.warningHeadline}</Heading>
      <Divider />

      <Row label={c.labelRiskLevel}>
        <Text><Bold>{getRiskLevelLabel(analysis.riskLevel)}</Bold></Text>
      </Row>

      <Row label={c.labelTradeability}>
        <Text><Bold>{getTradeabilityLabel(analysis.tradeability)}</Bold></Text>
      </Row>

      {analysis.confidencePercent !== undefined && (
        <Row label={c.labelConfidence}>
          <Text><Bold>{analysis.confidencePercent}%</Bold></Text>
        </Row>
      )}

      {analysis.sourcesUsed !== undefined && (
        <Row label={c.labelSources}>
          <Text><Bold>{analysis.sourcesUsed} checked</Bold></Text>
        </Row>
      )}

      <Divider />

      {analysis.reason && (
        <Box>
          <Text><Bold>{c.sectionWhyFlagged}</Bold></Text>
          <Text>{analysis.reason}</Text>
        </Box>
      )}

      {analysis.meaning && (
        <Box>
          <Text><Bold>{c.sectionWhatMeans}</Bold></Text>
          <Text>{analysis.meaning}</Text>
        </Box>
      )}

      {analysis.observations && analysis.observations.length > 0 && (
        <Box>
          <Text><Bold>{c.sectionObservations}</Bold></Text>
          {analysis.observations.map((obs, _index) => (
            <Text key={`obs-${obs.substring(0, 10)}`}>• {obs}</Text>
          ))}
        </Box>
      )}

      {analysis.intelObservations && analysis.intelObservations.length > 0 && (
        <Box>
          <Text><Bold>{c.sectionIntelObservations}</Bold></Text>
          {analysis.intelObservations.map((obs, _index) => (
            <Text key={`intel-${obs.substring(0, 10)}`}>• {obs}</Text>
          ))}
        </Box>
      )}

      <Divider />

      <Text>
        {c.disclaimerAnalysis}
      </Text>

      <Divider />

      <Text>
        {c.footer}
      </Text>
    </Box>
  );
}

/**
 * Render the Risk Acknowledgement screen
 * Shown only for HIGH or CRITICAL risk when user clicks "Proceed anyway"
 */
function renderRiskAcknowledgement() {
  const c = getCopy();

  return (
    <Box>
      <Heading>{c.acknowledgementHeadline}</Heading>
      <Divider />

      <Text>
        {c.acknowledgementBody1}
      </Text>

      <Text>
        {c.acknowledgementBody2}
      </Text>

      <Divider />

      <Text>
        {c.footer}
      </Text>
    </Box>
  );
}

/**
 * Get mock analysis data for UI testing
 * Uses copy system for reason/meaning/observations text
 * TODO: Replace with actual Crypto Intel backend call in future version
 */
function getMockAnalysis(tradeability: Tradeability): TokenAnalysis {
  const dynamicCopy = getDynamicCopy();

  const riskLevels: Record<Tradeability, RiskLevel> = {
    'VERIFIED': 'LOW',
    'UNVERIFIED': 'HIGH',
    'BLOCKED_BY_CONTRACT': 'CRITICAL',
  };

  return {
    riskLevel: riskLevels[tradeability],
    tradeability,
    reason: dynamicCopy.reasons[tradeability],
    meaning: dynamicCopy.meanings[tradeability],
    observations: dynamicCopy.observations[tradeability],
  };
}

/**
 * Handle incoming JSON-RPC requests from dApps
 *
 * Available methods:
 * - showWarning: Display free tier warning screen
 * - showAnalysis: Display paid tier analysis screen
 * - showAcknowledgement: Display risk acknowledgement screen
 * - analyzeToken: Analyze a token via Crypto Intel backend
 * - getCopyMode: Returns current copy mode ('formal' or 'plain')
 */
export const onRpcRequest: OnRpcRequestHandler = async ({
  origin,
  request,
}) => {
  switch (request.method) {

    // Show free tier warning screen (for testing)
    case 'showWarning': {
      const params = request.params as { tradeability?: Tradeability } | undefined;
      const tradeability = params?.tradeability || 'BLOCKED_BY_CONTRACT';
      const analysis = getMockAnalysis(tradeability);

      return snap.request({
        method: 'snap_dialog',
        params: {
          type: 'confirmation',
          content: renderFreeTierWarning(analysis),
        },
      });
    }

    // Show paid tier analysis screen (for testing)
    case 'showAnalysis': {
      const params = request.params as { tradeability?: Tradeability } | undefined;
      const tradeability = params?.tradeability || 'BLOCKED_BY_CONTRACT';
      const analysis = getMockAnalysis(tradeability);

      return snap.request({
        method: 'snap_dialog',
        params: {
          type: 'confirmation',
          content: renderPaidTierAnalysis(analysis),
        },
      });
    }

    // Show risk acknowledgement screen (for testing)
    case 'showAcknowledgement': {
      return snap.request({
        method: 'snap_dialog',
        params: {
          type: 'confirmation',
          content: renderRiskAcknowledgement(),
        },
      });
    }

    // Analyze a token address via Crypto Intel backend
    case 'analyzeToken': {
      const params = request.params as { tokenAddress?: string; chainId?: string } | undefined;

      if (!params?.tokenAddress) {
        throw new Error('Token address is required');
      }

      const scan = await fetchRiskFromCryptoIntel(params.tokenAddress);
      const analysis = mapScanToAnalysis(scan);

      return snap.request({
        method: 'snap_dialog',
        params: {
          type: 'confirmation',
          content: renderFreeTierWarning(analysis),
        },
      });
    }

    // Return current copy mode (for debugging/testing)
    case 'getCopyMode': {
      return { mode: COPY_MODE };
    }

    default:
      throw new Error(`Method not found: ${request.method}`);
  }
};

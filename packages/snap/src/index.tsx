import type { OnRpcRequestHandler, OnTransactionHandler } from '@metamask/snaps-sdk';
import { Box, Text, Bold, Divider, Heading, Row, Link } from '@metamask/snaps-sdk/jsx';

import type { RiskLevel, Tradeability, TokenAnalysis, ConversionSignals } from './types';
import { getCopy, getDynamicCopy, COPY_MODE } from './copy';
import { fetchRiskFromCryptoIntel } from './backend';
import type { ScanResponse } from './backend';
import { mapIntelToObservations, buildIntelReportUrl } from './intelMapper';
import { simulateTransaction } from './simulationClient';
import type { DisplayMessage } from './simulationClient';
import { renderTxWarning, renderFallbackWarning } from './warningDialog';

// =============================================================================
// CRYPTO GUARDIAN SNAP v1.1.3 - UI IMPLEMENTATION
// =============================================================================
// This SNAP provides risk signals for Ethereum tokens AND transaction warnings.
// It is advisory only and does NOT block transactions.
//
// v1.1.3 changes:
// - Consumes usage + conversion signals from /api/scan
// - Hard block (429) → dedicated blocked/paywall UI
// - EOA (400) → dedicated guidance UI
// - Prompt suppression — upgrade hints only when contextually appropriate
// - Anonymous vs authenticated CTA distinction
// - snapEligible awareness
// =============================================================================

const API_BASE = 'https://cryptoguardians.io';

// ── Prompt frequency suppression ────────────────────────────────────────────
// Track last shown conversion stage to avoid repeating same prompt.
// This is session-scoped (resets when Snap restarts, which is fine).
let lastShownConversionStage: string | null = null;

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
    const { observations, riskSummary, confidenceExplanation } = mapIntelToObservations(scan.intel);
    base.tokenName = scan.intel.tokenName;
    base.tokenSymbol = scan.intel.tokenSymbol;
    base.confidencePercent = scan.intel.confidenceScore;
    base.sourcesUsed = scan.intel.sourcesAvailable;
    base.sourceNames = scan.intel.sourceNames;
    base.intelObservations = observations;
    base.recommendation = scan.intel.recommendation;
    base.riskSummary = riskSummary;
    base.confidenceExplanation = confidenceExplanation;
    base.intelReportUrl = buildIntelReportUrl(scan.token, scan.chainId);
  }

  return base;
}

// =============================================================================
// BLOCKED STATE — shown when user has exhausted free scans
// =============================================================================

function renderBlockedState(conversion: ConversionSignals | null) {
  const c = getCopy();
  const isAnon = conversion?.isAnonymous ?? true;

  return (
    <Box>
      <Heading>{c.blockedHeadline}</Heading>
      <Divider />

      <Text>{c.blockedBody}</Text>

      <Divider />

      <Text>
        <Bold>{isAnon ? c.blockedCtaAnonymous : c.blockedCtaAuthenticated}</Bold>
      </Text>

      {isAnon && (
        <Text>
          <Link href={`${API_BASE}/auth/signup?source=snap`}>
            Continue with Email
          </Link>
        </Text>
      )}

      {!isAnon && (
        <Text>
          <Link href={`${API_BASE}/pricing?source=snap`}>
            Upgrade to Pro
          </Link>
        </Text>
      )}

      <Divider />

      <Text>{c.footer}</Text>
    </Box>
  );
}

// =============================================================================
// EOA STATE — shown when address is a wallet, not a token contract
// =============================================================================

function renderEoaState() {
  const c = getCopy();

  return (
    <Box>
      <Heading>{c.eoaHeadline}</Heading>
      <Divider />

      <Text>{c.eoaBody}</Text>

      <Divider />

      <Text>• {c.eoaGuidance1}</Text>
      <Text>• {c.eoaGuidance2}</Text>

      <Divider />

      <Text>{c.footer}</Text>
    </Box>
  );
}

// =============================================================================
// UNAVAILABLE STATE — shown when backend is unreachable or timed out
// =============================================================================

function renderUnavailableState(reason?: string) {
  const c = getCopy();

  return (
    <Box>
      <Heading>Analysis Unavailable</Heading>
      <Divider />

      <Text>
        {reason === 'Analysis timed out'
          ? 'The analysis took too long to complete. This does not indicate a problem with the token.'
          : 'We could not complete the analysis at this time. This does not indicate a problem with the token.'}
      </Text>

      <Divider />

      <Text><Bold>Proceed with caution if you choose to continue.</Bold></Text>

      <Text>
        <Link href={`${API_BASE}/intel`}>
          Try scanning on cryptoguardians.io
        </Link>
      </Text>

      <Divider />

      <Text>{c.footer}</Text>
    </Box>
  );
}

// =============================================================================
// ANALYSIS RESULT — conversion-aware rendering
// =============================================================================

/**
 * Determine whether an upgrade/conversion hint should be shown.
 * Rules:
 * - EARLY stage: never show
 * - MID/LATE: show subtle hint, but only once per stage per session
 * - BLOCKED: handled separately (renderBlockedState)
 * - snapEligible must be true for Snap-specific prompts
 * - Never repeat the same stage prompt
 */
function shouldShowConversionHint(conversion: ConversionSignals | null): boolean {
  if (!conversion) return false;
  if (conversion.hardBlock) return false; // Handled by blocked state
  if (conversion.stage === 'EARLY') return false;

  // Only show if snap is eligible for prompts
  if (conversion.channelHints?.snapEligible === false) return false;

  // Suppress repeated same-stage prompts
  if (lastShownConversionStage === conversion.stage) return false;

  // MID with softPrompt, or LATE with approachingLimit
  if (conversion.stage === 'MID' && conversion.softPrompt) {
    lastShownConversionStage = conversion.stage;
    return true;
  }
  if (conversion.stage === 'LATE' && conversion.approachingLimit) {
    lastShownConversionStage = conversion.stage;
    return true;
  }

  return false;
}

/**
 * Render the analysis screen with conversion awareness.
 * Shows: Risk level, tradeability, intel, contextual upgrade hint.
 */
function renderAnalysis(analysis: TokenAnalysis, conversion: ConversionSignals | null) {
  const c = getCopy();
  const showHint = shouldShowConversionHint(conversion);

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

      {analysis.riskSummary && (
        <Box>
          <Divider />
          <Text><Bold>{c.sectionRiskSummary}</Bold></Text>
          <Text>{analysis.riskSummary}</Text>
        </Box>
      )}

      {analysis.confidenceExplanation && (
        <Text>{analysis.confidenceExplanation}</Text>
      )}

      {analysis.sourceNames && analysis.sourceNames.length > 0 && (
        <Text>{c.labelSourcesUsed}: {analysis.sourceNames.join(', ')}</Text>
      )}

      {analysis.intelObservations && analysis.intelObservations.length > 0 && (
        <Box>
          <Divider />
          <Text><Bold>{c.sectionIntelObservations}</Bold></Text>
          {analysis.intelObservations.map((obs, _index) => (
            <Text key={`intel-${obs.substring(0, 10)}`}>• {obs}</Text>
          ))}
        </Box>
      )}

      <Divider />

      {analysis.intelReportUrl && (
        <Text>
          <Link href={analysis.intelReportUrl}>{c.linkIntelReport}</Link>
        </Text>
      )}

      <Text>
        {c.disclaimerAnalysis}
      </Text>

      {showHint && (
        <Box>
          <Divider />
          <Text>{c.conversionHint}</Text>
        </Box>
      )}

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

// =============================================================================
// RPC REQUEST HANDLER
// =============================================================================

/**
 * Handle incoming JSON-RPC requests from dApps
 *
 * Available methods:
 * - showWarning: Display analysis screen (for testing)
 * - showAnalysis: Display analysis screen with observations (for testing)
 * - showAcknowledgement: Display risk acknowledgement screen
 * - analyzeToken: Analyze a token via Crypto Intel backend
 * - simulateTransaction: Manually simulate a transaction and show warning dialog
 * - getCopyMode: Returns current copy mode ('formal' or 'plain')
 */
export const onRpcRequest: OnRpcRequestHandler = async ({
  origin,
  request,
}) => {
  switch (request.method) {

    // Show analysis screen (for testing)
    case 'showWarning': {
      const params = request.params as { tradeability?: Tradeability } | undefined;
      const tradeability = params?.tradeability || 'BLOCKED_BY_CONTRACT';
      const analysis = getMockAnalysis(tradeability);

      return snap.request({
        method: 'snap_dialog',
        params: {
          type: 'confirmation',
          content: renderAnalysis(analysis, null),
        },
      });
    }

    // Show analysis screen with observations (for testing)
    case 'showAnalysis': {
      const params = request.params as { tradeability?: Tradeability } | undefined;
      const tradeability = params?.tradeability || 'BLOCKED_BY_CONTRACT';
      const analysis = getMockAnalysis(tradeability);

      return snap.request({
        method: 'snap_dialog',
        params: {
          type: 'confirmation',
          content: renderAnalysis(analysis, null),
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

      const outcome = await fetchRiskFromCryptoIntel(
        params.tokenAddress,
        params.chainId || 'eth',
      );

      // Route to appropriate UI based on outcome
      let content;
      switch (outcome.type) {
        case 'blocked':
          content = renderBlockedState(outcome.conversion);
          break;
        case 'eoa':
          content = renderEoaState();
          break;
        case 'unavailable':
          content = renderUnavailableState(outcome.reason);
          break;
        case 'success':
        default: {
          const analysis = mapScanToAnalysis(outcome.data);
          content = renderAnalysis(analysis, outcome.conversion);
          break;
        }
      }

      return snap.request({
        method: 'snap_dialog',
        params: {
          type: 'confirmation',
          content,
        },
      });
    }

    // Manually simulate a transaction and show confirmation dialog
    case 'simulateTransaction': {
      const params = request.params as {
        from?: string;
        to?: string;
        data?: string;
        value?: string;
        chainId?: string;
      } | undefined;

      if (!params?.from || !params?.to) {
        throw new Error('Both "from" and "to" addresses are required');
      }

      const simResult = await simulateTransaction({
        from: params.from,
        to: params.to,
        data: params.data,
        value: params.value,
        chainId: params.chainId,
      });

      const content = simResult
        ? renderTxWarning(simResult.message, simResult.reportUrl)
        : renderFallbackWarning();

      return snap.request({
        method: 'snap_dialog',
        params: {
          type: 'confirmation',
          content,
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

// =============================================================================
// TRANSACTION INSIGHTS — onTransaction Handler
// =============================================================================
// This handler fires automatically when the user initiates any transaction in
// MetaMask. It sends the transaction to the simulation backend and returns
// compliant warning content that MetaMask displays in the confirmation screen.
//
// COMPLIANCE:
// - NEVER blocks the transaction — returns insights content only
// - NEVER modifies the transaction
// - Degrades gracefully if backend is unavailable (shows fallback)
// - All warning text is pre-sanitized by the backend compliant engine
// - Uses severity: 'critical' only for HIGH severity warnings
// =============================================================================

export const onTransaction: OnTransactionHandler = async ({
  transaction,
  chainId,
}) => {
  // Extract transaction fields (MetaMask provides hex-encoded strings)
  const from = (transaction.from as string) || '';
  const to = (transaction.to as string) || '';
  const data = (transaction.data as string) || '0x';
  const value = (transaction.value as string) || '0x0';

  // Skip simulation for contract creation (no 'to' address)
  if (!to) {
    return {
      content: renderFallbackWarning(),
    };
  }

  // Parse chainId — MetaMask sends format like "eip155:1"
  let chain = 'eth';
  if (chainId) {
    const parts = chainId.split(':');
    const numericId = parts.length > 1 ? parts[1] : parts[0];
    if (numericId === '1' || numericId === undefined) {
      chain = 'eth';
    }
  }

  // Call simulation backend (2s timeout, never throws)
  const result = await simulateTransaction({
    chainId: chain,
    from,
    to,
    data,
    value,
  });

  // Backend unavailable — show fallback
  if (!result) {
    return {
      content: renderFallbackWarning(),
    };
  }

  const { message, reportUrl } = result;

  // HIGH riskLevel — use MetaMask's critical warning overlay
  if (message.riskLevel === 'HIGH') {
    return {
      content: renderTxWarning(message, reportUrl),
      severity: 'critical',
    };
  }

  // MEDIUM, LOW, UNKNOWN — show insights panel (no blocking overlay)
  return {
    content: renderTxWarning(message, reportUrl),
  };
};

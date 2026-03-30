// =============================================================================
// CRYPTO GUARDIAN - TRANSACTION INSIGHT DIALOG
// =============================================================================
// Renders transaction analysis using MetaMask Snaps JSX components.
// All displayed text comes from the backend's compliant warning engine.
//
// UX RULES:
// - No confidence percentages
// - No severity labels for low-risk transactions
// - No "safe", "guaranteed", "risk-free"
// - Plain English only
// - Deep link always shown when available
// =============================================================================

import { Box, Text, Bold, Divider, Heading, Row, Link } from '@metamask/snaps-sdk/jsx';
import type { CompliantMessage } from './simulationClient';

/**
 * Render the transaction insight content.
 *
 * Layout varies by severity:
 *
 * LOW RISK (INFO/LOW):
 *   Title → Token context → Details → Recommendation → Deep link → Footer
 *
 * HIGH RISK (MEDIUM/HIGH):
 *   Title → Severity → Token context → Details → Recommendation → Deep link → Footer
 */
export function renderTxWarning(message: CompliantMessage, reportUrl: string | null) {
  const isLowRisk = message.severity === 'INFO' || message.severity === 'LOW';

  // Use "No Significant Risk Detected" for low-risk to avoid any confusion
  const displayTitle = isLowRisk
    ? 'No Significant Risk Detected'
    : message.title;

  return (
    <Box>
      <Heading>{displayTitle}</Heading>
      <Divider />

      {/* Only show severity for elevated risk */}
      {!isLowRisk && (
        <Row label="Risk Level">
          <Text><Bold>{message.severity === 'HIGH' ? '\u{1F534} High' : '\u{1F7E1} Elevated'}</Bold></Text>
        </Row>
      )}

      {/* Summary */}
      <Text>{isLowRisk
        ? 'This transaction appears consistent with normal activity.'
        : message.summary}</Text>

      <Divider />

      {/* Detail bullets (max 2) */}
      {message.details.map((detail) => (
        <Text key={`d-${detail.substring(0, 12)}`}>{'\u2022'} {detail}</Text>
      ))}

      <Divider />

      {/* Recommendation */}
      <Text><Bold>
        {isLowRisk
          ? 'Proceed if you recognize and trust this transaction.'
          : message.recommendation}
      </Bold></Text>

      {/* Deep link */}
      {reportUrl && (
        <>
          <Divider />
          <Link href={reportUrl}>
            View Full Analysis \u2192
          </Link>
        </>
      )}

      <Divider />

      <Text>
        CryptoGuardian provides risk signals to help inform your decisions.
        You are always in control of your wallet.
      </Text>
    </Box>
  );
}

/**
 * Render the fallback warning when the backend is unavailable.
 */
export function renderFallbackWarning() {
  return (
    <Box>
      <Heading>Transaction Review</Heading>
      <Divider />

      <Row label="Status">
        <Text><Bold>Analysis unavailable</Bold></Text>
      </Row>

      <Divider />

      <Text>
        CryptoGuardian could not analyze this transaction at this time.
        This does not indicate a problem with the transaction.
      </Text>

      <Divider />

      <Text>
        CryptoGuardian provides risk signals to help inform your decisions.
        You are always in control of your wallet.
      </Text>
    </Box>
  );
}

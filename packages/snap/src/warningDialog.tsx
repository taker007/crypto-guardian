// =============================================================================
// CRYPTO GUARDIAN - COMPLIANT WARNING DIALOG
// =============================================================================
// Renders transaction simulation warnings using MetaMask Snaps JSX components.
// All displayed text comes from the backend's compliant warning engine, which
// pre-sanitizes language to meet MetaMask compliance requirements.
//
// COMPLIANCE: This component NEVER blocks transactions. It provides information
// to help the user make an informed decision. The user always retains full
// control via MetaMask's native Confirm/Reject buttons.
// =============================================================================

import { Box, Text, Bold, Divider, Heading, Row } from '@metamask/snaps-sdk/jsx';
import type { CompliantMessage } from './simulationClient';

/**
 * Map severity to a display label with visual indicator.
 * Uses Unicode indicators since MetaMask Snaps JSX does not support colors.
 */
function getSeverityLabel(severity: CompliantMessage['severity']): string {
  switch (severity) {
    case 'HIGH':
      return '\u{1F534} HIGH';
    case 'MEDIUM':
      return '\u{1F7E1} MEDIUM';
    case 'LOW':
      return '\u{1F535} LOW';
    default:
      return '\u{2139}\u{FE0F} INFO';
  }
}

/**
 * Render the compliant transaction warning content.
 *
 * Used by the onTransaction handler to display insights in the MetaMask
 * transaction confirmation screen. Layout:
 *
 * 1. Title (from compliant engine)
 * 2. Severity + Confidence row
 * 3. Summary text
 * 4. Detail bullets (max 4)
 * 5. Recommendation
 * 6. Disclaimer footer
 */
export function renderTxWarning(message: CompliantMessage) {
  return (
    <Box>
      <Heading>{message.title}</Heading>
      <Divider />

      <Row label="Severity">
        <Text><Bold>{getSeverityLabel(message.severity)}</Bold></Text>
      </Row>

      <Row label="Confidence">
        <Text><Bold>{`${message.confidence}%`}</Bold></Text>
      </Row>

      <Divider />

      <Text>{message.summary}</Text>

      <Divider />

      {message.details.map((detail) => (
        <Text key={`d-${detail.substring(0, 12)}`}>{'\u2022'} {detail}</Text>
      ))}

      <Divider />

      <Text><Bold>Recommendation:</Bold></Text>
      <Text>{message.recommendation}</Text>

      <Divider />

      <Text>
        Crypto Guardian provides risk signals to help inform your decisions.
        You are always in control of your wallet.
      </Text>
    </Box>
  );
}

/**
 * Render the fallback warning when the backend is unavailable.
 *
 * Shown when:
 * - Backend times out (>2s)
 * - Backend returns an error
 * - Network is unreachable
 *
 * This warning is intentionally minimal and non-alarmist.
 */
export function renderFallbackWarning() {
  return (
    <Box>
      <Heading>Transaction Review</Heading>
      <Divider />

      <Row label="Status">
        <Text><Bold>Simulation unavailable</Bold></Text>
      </Row>

      <Divider />

      <Text>
        Crypto Guardian could not analyze this transaction at this time.
        This does not indicate a problem with the transaction.
      </Text>

      <Text>
        The analysis service may be temporarily unavailable.
        Proceed with caution and verify transaction details independently.
      </Text>

      <Divider />

      <Text>
        Crypto Guardian provides risk signals to help inform your decisions.
        You are always in control of your wallet.
      </Text>
    </Box>
  );
}

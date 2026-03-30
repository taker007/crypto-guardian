// =============================================================================
// CRYPTO GUARDIANS - TRANSACTION INSIGHT DIALOG (v1.1.2)
// =============================================================================
// Renders transaction analysis using MetaMask Snaps JSX components.
//
// UX RULES:
// - No confidence percentages — never displayed
// - No severity labels for low-risk transactions
// - No "safe", "guaranteed", "risk-free"
// - Plain English only
// - Deep link always shown when available
// =============================================================================

import { Box, Text, Bold, Divider, Heading, Link } from '@metamask/snaps-sdk/jsx';
import type { CompliantMessage } from './simulationClient';

/**
 * Extract token identity from the details array.
 * Backend sends details like: "Token: USD Coin (USDC) — no known token risk detected"
 * Returns formatted "Token Involved: USD Coin (USDC)" or null.
 */
function extractTokenLine(details: string[]): string | null {
  const tokenDetail = details.find((d) => d.startsWith('Token:') || d.startsWith('Token Involved:'));
  if (!tokenDetail) return null;
  const match = tokenDetail.match(/^Token(?:\s+Involved)?:\s*(.+?\([A-Z0-9]+\))/);
  if (match) return `Token Involved: ${match[1]}`;
  return null;
}

/**
 * Normalize detail bullets: replace "contract" references with "token" for clarity.
 */
function normalizeDetail(detail: string): string {
  return detail
    .replace(/\bThe contract\b/gi, 'This token')
    .replace(/\bthe contract\b/gi, 'this token');
}

/**
 * Render the transaction insight content.
 *
 * LOW RISK (INFO/LOW):
 *   Title → Body → Token → Detail → Recommendation → Deep link → Footer
 *
 * HIGH RISK (MEDIUM/HIGH):
 *   Title → High Risk label → Body → Token → Details → Recommendation → Deep link → Footer
 */
export function renderTxWarning(message: CompliantMessage, reportUrl: string | null) {
  const isLowRisk = message.severity === 'INFO' || message.severity === 'LOW';
  const tokenLine = extractTokenLine(message.details);

  if (isLowRisk) {
    return (
      <Box>
        <Heading>No Significant Risk Detected</Heading>
        <Divider />

        <Text>This transaction appears consistent with normal activity.</Text>

        <Divider />

        {tokenLine && (
          <Text>{'\u2022'} {tokenLine}</Text>
        )}
        <Text>{'\u2022'} No indicators of restricted trading or hidden fees</Text>

        <Divider />

        <Text><Bold>Proceed if you recognize and trust this transaction.</Bold></Text>

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
          CryptoGuardians provides risk signals to help inform your decisions.
          You are always in control of your wallet.
        </Text>
      </Box>
    );
  }

  // HIGH / MEDIUM risk
  return (
    <Box>
      <Heading>{message.title}</Heading>
      <Divider />

      <Text><Bold>{'\u{1F534}'} High Risk</Bold></Text>

      <Text>This transaction involves a token that may restrict selling or movement of funds.</Text>

      <Divider />

      {tokenLine && (
        <Text>{'\u2022'} {tokenLine}</Text>
      )}
      {message.details
        .filter((d) => !d.startsWith('Token:') && !d.startsWith('Token Involved:'))
        .slice(0, 2)
        .map((detail) => (
          <Text key={`d-${detail.substring(0, 12)}`}>{'\u2022'} {normalizeDetail(detail)}</Text>
        ))}

      <Divider />

      <Text><Bold>{message.recommendation}</Bold></Text>

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
        CryptoGuardians provides risk signals to help inform your decisions.
        You are always in control of your wallet.
      </Text>
    </Box>
  );
}

/**
 * Render the fallback when backend is unavailable.
 */
export function renderFallbackWarning() {
  return (
    <Box>
      <Heading>Transaction Review</Heading>
      <Divider />

      <Text><Bold>Analysis unavailable</Bold></Text>

      <Divider />

      <Text>
        CryptoGuardians could not analyze this transaction at this time.
        This does not indicate a problem with the transaction.
      </Text>

      <Divider />

      <Text>
        CryptoGuardians provides risk signals to help inform your decisions.
        You are always in control of your wallet.
      </Text>
    </Box>
  );
}

// =============================================================================
// CRYPTO GUARDIANS - TRANSACTION INSIGHT DIALOG (v1.1.2)
// =============================================================================
// Renders transaction analysis using MetaMask Snaps JSX components.
//
// SNAP JSX RULES:
// - NO React fragments (<>...</>) — not supported by Snaps runtime
// - NO conditional JSX ({cond && <X/>}) — use array building instead
// - Only Box, Text, Bold, Divider, Heading, Row, Link are available
// - All children must be explicit Snap components
// =============================================================================

import { Box, Text, Bold, Divider, Heading, Link } from '@metamask/snaps-sdk/jsx';
import type { CompliantMessage } from './simulationClient';
import type { SnapComponent } from '@metamask/snaps-sdk/jsx';

/**
 * Extract token identity from the details array.
 */
function extractTokenLine(details: string[]): string | null {
  const tokenDetail = details.find((d) => d.startsWith('Token:') || d.startsWith('Token Involved:'));
  if (!tokenDetail) return null;
  const match = tokenDetail.match(/^Token(?:\s+Involved)?:\s*(.+?\([A-Z0-9]+\))/);
  if (match) return `Token Involved: ${match[1]}`;
  return null;
}

/**
 * Normalize detail bullets: replace "contract" references with "token".
 */
function normalizeDetail(detail: string): string {
  return detail
    .replace(/\bThe contract\b/gi, 'This token')
    .replace(/\bthe contract\b/gi, 'this token');
}

/**
 * Render the transaction insight content.
 * Uses array-based construction to avoid JSX fragments.
 */
export function renderTxWarning(message: CompliantMessage, reportUrl: string | null) {
  const isLowRisk = message.severity === 'INFO' || message.severity === 'LOW';
  const tokenLine = extractTokenLine(message.details);

  // Build content array — no fragments, no conditional JSX
  const children: SnapComponent[] = [];

  if (isLowRisk) {
    children.push(<Heading>No Significant Risk Detected</Heading>);
    children.push(<Divider />);
    children.push(<Text>This transaction appears consistent with normal activity.</Text>);
    children.push(<Divider />);

    if (tokenLine) {
      children.push(<Text>{'\u2022'} {tokenLine}</Text>);
    }
    children.push(<Text>{'\u2022'} No indicators of restricted trading or hidden fees</Text>);

    children.push(<Divider />);
    children.push(<Text><Bold>Proceed if you recognize and trust this transaction.</Bold></Text>);

    if (reportUrl) {
      children.push(<Divider />);
      children.push(
        <Link href={reportUrl}>
          View Full Analysis \u2192
        </Link>,
      );
    }

    children.push(<Divider />);
    children.push(
      <Text>
        CryptoGuardians provides risk signals to help inform your decisions.
        You are always in control of your wallet.
      </Text>,
    );
  } else {
    // HIGH / MEDIUM risk
    children.push(<Heading>{message.title}</Heading>);
    children.push(<Divider />);
    children.push(<Text><Bold>{'\u{1F534}'} High Risk</Bold></Text>);
    children.push(<Text>This transaction involves a token that may restrict selling or movement of funds.</Text>);
    children.push(<Divider />);

    if (tokenLine) {
      children.push(<Text>{'\u2022'} {tokenLine}</Text>);
    }

    const nonTokenDetails = message.details
      .filter((d) => !d.startsWith('Token:') && !d.startsWith('Token Involved:'))
      .slice(0, 2);

    for (const detail of nonTokenDetails) {
      children.push(<Text>{'\u2022'} {normalizeDetail(detail)}</Text>);
    }

    children.push(<Divider />);
    children.push(<Text><Bold>{message.recommendation}</Bold></Text>);

    if (reportUrl) {
      children.push(<Divider />);
      children.push(
        <Link href={reportUrl}>
          View Full Analysis \u2192
        </Link>,
      );
    }

    children.push(<Divider />);
    children.push(
      <Text>
        CryptoGuardians provides risk signals to help inform your decisions.
        You are always in control of your wallet.
      </Text>,
    );
  }

  return <Box>{children}</Box>;
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

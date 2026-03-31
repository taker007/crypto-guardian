// =============================================================================
// CRYPTO GUARDIANS - TRANSACTION INSIGHT DIALOG (v1.1.2)
// =============================================================================
// PURE DISPLAY LAYER — renders backend data exactly as received.
// NO risk computation, NO inference, NO defaults, NO overrides.
// Uses ONLY Snap SDK function-based UI: panel(), heading(), text(), divider()
// =============================================================================

import { panel, heading, text, divider } from '@metamask/snaps-sdk';
import type { Component } from '@metamask/snaps-sdk';
import type { CompliantMessage } from './simulationClient';

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
 * Pure passthrough of backend CompliantMessage — UI makes zero risk decisions.
 */
export function renderTxWarning(message: CompliantMessage, reportUrl: string | null) {
  const severity = message.severity;
  const tokenLine = extractTokenLine(message.details);

  // If backend didn't provide severity, show generic fallback
  if (!severity) {
    return panel([
      heading('Unable to Analyze Transaction'),
      divider(),
      text('Unable to analyze this transaction at this time.'),
      divider(),
      text('**Proceed only if you recognize and trust this action.**'),
      divider(),
      text('CryptoGuardians provides risk signals to help inform your decisions. You are always in control of your wallet.'),
    ]);
  }

  const content: Component[] = [];

  // Title: always from backend
  content.push(heading(message.title));
  content.push(divider());

  // Risk indicator: only shown for HIGH, directly from backend severity
  if (severity === 'HIGH') {
    content.push(text('**🔴 High Risk**'));
  } else if (severity === 'MEDIUM') {
    content.push(text('**⚠ Elevated**'));
  }
  // INFO and LOW: no risk indicator shown

  // Summary: always from backend
  content.push(text(message.summary));
  content.push(divider());

  // Token line + detail bullets: from backend details array
  if (tokenLine) {
    content.push(text(`• ${tokenLine}`));
  }

  const nonTokenDetails = message.details
    .filter((d) => !d.startsWith('Token:') && !d.startsWith('Token Involved:'))
    .slice(0, 2);

  for (const detail of nonTokenDetails) {
    content.push(text(`• ${normalizeDetail(detail)}`));
  }

  content.push(divider());

  // Recommendation: always from backend
  content.push(text(`**${message.recommendation}**`));

  // Deep link
  if (reportUrl) {
    content.push(divider());
    content.push(text(`[View Full Analysis →](${reportUrl})`));
  }

  content.push(divider());
  content.push(text('CryptoGuardians provides risk signals to help inform your decisions. You are always in control of your wallet.'));

  return panel(content);
}

/**
 * Render the fallback when backend is unavailable.
 */
export function renderFallbackWarning() {
  return panel([
    heading('Transaction Review'),
    divider(),
    text('**Analysis unavailable**'),
    divider(),
    text('CryptoGuardians could not analyze this transaction at this time. This does not indicate a problem with the transaction.'),
    divider(),
    text('**Proceed only if you recognize and trust this action.**'),
    divider(),
    text('CryptoGuardians provides risk signals to help inform your decisions. You are always in control of your wallet.'),
  ]);
}

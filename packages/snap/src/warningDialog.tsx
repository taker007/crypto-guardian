// =============================================================================
// CRYPTO GUARDIANS - TRANSACTION INSIGHT DIALOG (v1.1.2)
// =============================================================================
// Uses ONLY Snap SDK function-based UI: panel(), heading(), text(), divider()
// NO JSX, NO fragments, NO React-style rendering.
// Bold via markdown (**text**), links via markdown [label](url).
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
 * Uses array-based construction with panel() — zero JSX.
 */
export function renderTxWarning(message: CompliantMessage, reportUrl: string | null) {
  const isLowRisk = message.severity === 'INFO' || message.severity === 'LOW';
  const tokenLine = extractTokenLine(message.details);

  const content: Component[] = [];

  if (isLowRisk) {
    content.push(heading('No Significant Risk Detected'));
    content.push(divider());
    content.push(text('This transaction appears consistent with normal activity.'));
    content.push(divider());

    if (tokenLine) {
      content.push(text(`• ${tokenLine}`));
    }
    content.push(text('• No indicators of restricted trading or hidden fees'));

    content.push(divider());
    content.push(text('**Proceed if you recognize and trust this transaction.**'));
  } else {
    // HIGH / MEDIUM risk
    content.push(heading(message.title));
    content.push(divider());
    content.push(text('**🔴 High Risk**'));
    content.push(text('This transaction involves a token that may restrict selling or movement of funds.'));
    content.push(divider());

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
    content.push(text(`**${message.recommendation}**`));
  }

  // Deep link (Snap SDK text supports markdown links)
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
    text('CryptoGuardians provides risk signals to help inform your decisions. You are always in control of your wallet.'),
  ]);
}

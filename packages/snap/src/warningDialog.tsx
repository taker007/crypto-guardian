// =============================================================================
// CRYPTO GUARDIANS - TRANSACTION INSIGHT DIALOG (v1.1.2)
// =============================================================================
// PURE DISPLAY LAYER — renders backend data exactly as received.
// Uses ONLY message.riskLevel as the single source of truth.
// NO severity, NO score, NO confidence, NO derived risk variables.
// =============================================================================

import { panel, heading, text, divider } from '@metamask/snaps-sdk';
import type { Component } from '@metamask/snaps-sdk';
import type { DisplayMessage } from './simulationClient';

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
 * All UI decisions driven solely by message.riskLevel.
 */
export function renderTxWarning(message: DisplayMessage, reportUrl: string | null) {
  const riskLevel = message.riskLevel;
  const tokenLine = extractTokenLine(message.details);

  // Missing risk level → generic fallback (no risk claim)
  if (!riskLevel || riskLevel === 'UNKNOWN') {
    return panel([
      heading('Limited Data Available'),
      divider(),
      text('We could not gather enough reliable information to fully assess this transaction.'),
      divider(),
      text('**Use extra caution before proceeding.**'),
      divider(),
      text('CryptoGuardians provides risk signals to help inform your decisions. You are always in control of your wallet.'),
    ]);
  }

  const content: Component[] = [];

  // Title: always from backend
  content.push(heading(message.title));
  content.push(divider());

  // Risk indicator: driven ONLY by riskLevel
  if (riskLevel === 'HIGH') {
    content.push(text('**🔴 High Risk**'));
  } else if (riskLevel === 'MEDIUM') {
    content.push(text('**⚠ Elevated**'));
  }
  // LOW: no risk indicator

  // Summary: always from backend
  content.push(text(message.summary));
  content.push(divider());

  // Token line + detail bullets: from backend
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
    heading('Limited Data Available'),
    divider(),
    text('We could not gather enough reliable information to fully assess this transaction.'),
    divider(),
    text('**Use extra caution before proceeding.**'),
    divider(),
    text('CryptoGuardians provides risk signals to help inform your decisions. You are always in control of your wallet.'),
  ]);
}

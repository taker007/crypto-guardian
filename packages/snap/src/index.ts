import type { OnTransactionHandler } from '@metamask/snaps-sdk';
import { panel, heading, text, divider } from '@metamask/snaps-sdk';

/**
 * Crypto Guardian - Transaction Security Snap
 *
 * This snap intercepts Ethereum transactions and displays a security
 * analysis popup before the user signs. MVP Step 1: Prove interception works.
 */

/**
 * Format wei value to ETH with 6 decimal precision
 */
function formatEth(weiHex: string | undefined): string {
  if (!weiHex) return '0 ETH';
  const wei = BigInt(weiHex);
  const eth = Number(wei) / 1e18;
  return `${eth.toFixed(6)} ETH`;
}

/**
 * Truncate address for display
 */
function truncateAddress(address: string | undefined): string {
  if (!address) return 'Unknown';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Mock risk analysis - placeholder for future external API integration
 * Returns mock risk assessment data
 */
function analyzeTransaction(transaction: Record<string, unknown>): {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN';
  riskScore: number;
  warnings: string[];
} {
  const warnings: string[] = [];
  let riskScore = 0;

  // Check if sending to a contract (has data field)
  if (transaction.data && transaction.data !== '0x') {
    warnings.push('Transaction includes contract interaction');
    riskScore += 20;
  }

  // Check for high value transactions (mock threshold: > 0.1 ETH)
  if (transaction.value) {
    const valueWei = BigInt(transaction.value as string);
    const ethValue = Number(valueWei) / 1e18;
    if (ethValue > 1) {
      warnings.push(`High value transfer: ${ethValue.toFixed(4)} ETH`);
      riskScore += 30;
    } else if (ethValue > 0.1) {
      warnings.push(`Moderate value transfer: ${ethValue.toFixed(4)} ETH`);
      riskScore += 10;
    }
  }

  // Check for unlimited gas (potential gas drain)
  if (transaction.gas) {
    const gasLimit = parseInt(transaction.gas as string, 16);
    if (gasLimit > 500000) {
      warnings.push('High gas limit detected');
      riskScore += 15;
    }
  }

  // Mock: Add placeholder warning for demo
  if (warnings.length === 0) {
    warnings.push('Standard transaction - no immediate concerns detected');
  }

  // Determine risk level
  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN' = 'UNKNOWN';
  if (riskScore < 20) {
    riskLevel = 'LOW';
  } else if (riskScore < 50) {
    riskLevel = 'MEDIUM';
  } else {
    riskLevel = 'HIGH';
  }

  return { riskLevel, riskScore, warnings };
}

/**
 * Get risk emoji based on risk level
 */
function getRiskEmoji(riskLevel: string): string {
  switch (riskLevel) {
    case 'LOW':
      return '✅';
    case 'MEDIUM':
      return '⚠️';
    case 'HIGH':
      return '🚨';
    default:
      return '❓';
  }
}

/**
 * Transaction insight handler - called when user initiates a transaction
 */
export const onTransaction: OnTransactionHandler = async ({ transaction, chainId }) => {
  // Perform mock risk analysis
  const analysis = analyzeTransaction(transaction);

  // Build the insight content
  const insightContent = panel([
    heading('🛡️ Crypto Guardian Alert'),
    divider(),

    text('**Transaction Details**'),
    text(`To: ${truncateAddress(transaction.to as string)}`),
    text(`Value: ${formatEth(transaction.value as string)}`),
    text(`Chain ID: ${chainId}`),

    divider(),

    text(`**Risk Assessment** ${getRiskEmoji(analysis.riskLevel)}`),
    text(`Risk Level: **${analysis.riskLevel}**`),
    text(`Risk Score: ${analysis.riskScore}/100`),

    divider(),

    text('**Findings:**'),
    ...analysis.warnings.map(warning => text(`• ${warning}`)),

    divider(),

    text('_Review the details above before proceeding._'),
    text('_Click Continue to sign or Cancel to reject._'),
  ]);

  // Return insights to be displayed in the transaction confirmation
  return {
    content: insightContent,
  };
};

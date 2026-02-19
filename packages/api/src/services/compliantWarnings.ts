// =============================================================================
// COMPLIANT WARNING ENGINE — MetaMask-Compliant Risk Language
// =============================================================================
// Converts low-level simulation signals into calm, professional, non-absolute
// warning language. Every message preserves user agency and avoids certainty
// claims for unverified outcomes.
//
// Compliance rules:
// - Never claim certainty: no "will", "guaranteed", "definitely"
// - Use risk-based language: "may", "could", "increases risk"
// - Always explain the "why" in plain English
// - Preserve user agency: recommend/warn, never command
// - Calm, professional, educational tone
// =============================================================================

import type { Verdict } from './txRiskEngine';

// ─── Phase 1: Message Model ─────────────────────────────────────────────────

export type Severity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH';

export interface CompliantMessage {
  severity: Severity;
  title: string;
  summary: string;
  details: string[];
  recommendation: string;
  confidence: number;
}

export type EvidenceTag =
  | 'UNLIMITED_APPROVAL'
  | 'LIMITED_APPROVAL'
  | 'PERMIT_SIGNATURE'
  | 'HIGH_VALUE_NATIVE_TRANSFER'
  | 'UNKNOWN_METHOD'
  | 'EOA_TRANSFER'
  | 'MULTICALL'
  | 'REVERT'
  | 'KNOWN_BAD_ADDRESS'
  | 'KNOWN_BAD_CONTRACT';

export interface WarningInput {
  verdict: Verdict;
  confidence: number;
  signals: {
    unlimitedApproval: boolean;
    approvals: Array<{ spender: string; amount: string }>;
    spenderIsContract: boolean | null;
    knownMethod: string | null;
    highValueNativeTransfer: boolean;
    reverted: boolean;
    revertReason: string | null;
    isPermit: boolean;
    isMulticall: boolean;
  };
  evidence?: {
    tags: EvidenceTag[];
    sources: string[];
  };
}

// ─── Phase 3: Phrase Sanitizer ───────────────────────────────────────────────

// Ordered: specific multi-word phrases first, then single-word replacements
const FORBIDDEN_REPLACEMENTS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\bfunds will be stolen\b/gi, replacement: 'funds could be moved' },
  { pattern: /\byou will lose\b/gi, replacement: 'you could lose' },
  { pattern: /\bwill\b(?!\s+not\b)/gi, replacement: 'may' },
  { pattern: /\bguaranteed?\b/gi, replacement: 'likely' },
  { pattern: /\bdefinitely\b/gi, replacement: 'may' },
  { pattern: /\bscam\b/gi, replacement: 'high-risk' },
  { pattern: /\bmalicious\b/gi, replacement: 'potentially harmful' },
  { pattern: /\bdrain\b/gi, replacement: 'move' },
];

export function sanitizeLanguage(text: string): string {
  let result = text;
  for (const { pattern, replacement } of FORBIDDEN_REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

export function containsForbiddenLanguage(text: string): boolean {
  const forbidden = [
    /\bwill\s+(?!not\b)/i,
    /\bguarantee/i,
    /\bdefinitely\b/i,
    /\bscam\b/i,
    /\bmalicious\b/i,
    /\byou will lose\b/i,
    /\bfunds will be stolen\b/i,
  ];
  return forbidden.some((rx) => rx.test(text));
}

// ─── Phase 4: Severity Mapping ───────────────────────────────────────────────

function mapVerdictToSeverity(verdict: Verdict, confidence: number): Severity {
  if (verdict === 'SAFE') return 'INFO';
  if (verdict === 'WARNING') return confidence >= 60 ? 'MEDIUM' : 'LOW';
  return 'HIGH'; // DANGER
}

// ─── Phase 2: Template Library ───────────────────────────────────────────────

function buildUnlimitedApprovalMessage(input: WarningInput): CompliantMessage {
  const spender = input.signals.approvals[0]?.spender ?? 'unknown';
  const details: string[] = [
    'Unlimited approvals can be convenient, but they could increase risk if a contract is compromised.',
  ];

  if (input.signals.spenderIsContract === true) {
    details.push('The spender appears to be a smart contract.');
  } else if (input.signals.spenderIsContract === false) {
    details.push('The spender appears to be an externally owned account (not a contract), which is uncommon for legitimate approvals.');
  }

  details.push(`Spender address: ${spender}`);

  return {
    severity: 'HIGH',
    title: 'Unlimited approval request',
    summary: 'This transaction requests permission that may allow token movement beyond what is required.',
    details: details.slice(0, 4),
    recommendation: 'Proceed only if you trust this app and understand why unlimited approval is needed.',
    confidence: input.confidence,
  };
}

function buildLimitedApprovalMessage(input: WarningInput): CompliantMessage {
  const spender = input.signals.approvals[0]?.spender ?? 'unknown';
  const amount = input.signals.approvals[0]?.amount ?? 'unknown';

  return {
    severity: mapVerdictToSeverity(input.verdict, input.confidence),
    title: 'Token approval request',
    summary: 'This transaction requests permission to allow a specified amount of tokens to be moved by another address.',
    details: [
      `Amount: ${amount} tokens`,
      `Spender: ${spender}`,
      'Limited approvals are generally safer than unlimited ones, but you should still verify the spender.',
    ],
    recommendation: 'Verify you trust the receiving contract before approving.',
    confidence: input.confidence,
  };
}

function buildPermitMessage(input: WarningInput): CompliantMessage {
  const severity: Severity = input.confidence >= 70 ? 'HIGH' : 'MEDIUM';

  return {
    severity,
    title: 'Signature-based approval',
    summary: 'This transaction includes a signature approval that could grant token access without an on-chain approval step.',
    details: [
      'Permit signatures allow a third party to move tokens using your signature.',
      'This is a common pattern in DeFi, but it can be misused if the signature is obtained deceptively.',
      'No on-chain transaction is needed to execute this approval once signed.',
    ],
    recommendation: 'Only proceed if you initiated this action from a trusted app.',
    confidence: input.confidence,
  };
}

function buildHighValueTransferMessage(input: WarningInput): CompliantMessage {
  return {
    severity: 'MEDIUM',
    title: 'Large transfer detected',
    summary: 'This transaction could transfer a significant amount of the network\'s native asset.',
    details: [
      'Large transfers carry higher consequences if sent to an incorrect address.',
      'Native asset transfers are irreversible once confirmed.',
    ],
    recommendation: 'Confirm the destination address and amount before proceeding.',
    confidence: input.confidence,
  };
}

function buildUnknownMethodMessage(input: WarningInput): CompliantMessage {
  const severity: Severity = input.confidence >= 50 ? 'MEDIUM' : 'LOW';

  return {
    severity,
    title: 'Unrecognized contract call',
    summary: 'This transaction calls a contract method that could not be identified.',
    details: [
      'The function being called does not match any commonly known method signatures.',
      'This could be a custom or less common contract interaction.',
    ],
    recommendation: 'If you do not recognize this action, consider reviewing details in the portal before proceeding.',
    confidence: input.confidence,
  };
}

function buildRevertMessage(input: WarningInput): CompliantMessage {
  const details: string[] = [
    'The simulation indicates this transaction may not succeed.',
  ];
  if (input.signals.revertReason) {
    details.push(`Reason: ${sanitizeLanguage(input.signals.revertReason)}`);
  }
  details.push('If you proceed, the transaction may fail and could still cost gas fees.');

  return {
    severity: input.confidence >= 80 ? 'LOW' : 'INFO',
    title: 'Transaction may not succeed',
    summary: 'Simulation indicates this transaction may fail or revert.',
    details: details.slice(0, 4),
    recommendation: 'If you proceed, be aware it may fail and still cost gas.',
    confidence: input.confidence,
  };
}

function buildMulticallMessage(input: WarningInput): CompliantMessage {
  return {
    severity: 'MEDIUM',
    title: 'Batched transaction detected',
    summary: 'This transaction bundles multiple operations together, which can make it harder to verify each action individually.',
    details: [
      'Multicall transactions execute several steps in a single transaction.',
      'This is a common pattern in DeFi routers, but increases complexity.',
      'Each bundled operation may have different risk characteristics.',
    ],
    recommendation: 'Verify you understand all the operations this transaction performs before proceeding.',
    confidence: input.confidence,
  };
}

function buildEoaTransferMessage(input: WarningInput): CompliantMessage {
  return {
    severity: 'LOW',
    title: 'Direct transfer detected',
    summary: 'This transaction sends the network\'s native asset directly to another address.',
    details: [
      'This is a standard transfer to an externally owned account.',
      'Once confirmed, this transfer is irreversible.',
    ],
    recommendation: 'Double-check the recipient address before confirming.',
    confidence: input.confidence,
  };
}

function buildKnownBadAddressMessage(input: WarningInput): CompliantMessage {
  const sources = input.evidence?.sources ?? [];
  const details: string[] = [
    'This address has been flagged by one or more security sources.',
  ];
  if (sources.length > 0) {
    details.push(`Reported by: ${sources.slice(0, 2).join(', ')}`);
  }
  details.push('Addresses on security lists are commonly associated with reported incidents.');

  return {
    severity: 'HIGH',
    title: 'High-risk address flagged',
    summary: 'This address is flagged by one or more security sources as being associated with reported incidents.',
    details: details.slice(0, 4),
    recommendation: 'Consider avoiding this transaction unless you can verify the legitimacy independently.',
    confidence: input.confidence,
  };
}

function buildSafeMessage(input: WarningInput): CompliantMessage {
  const method = input.signals.knownMethod;
  const details: string[] = [
    'No revert detected in simulation.',
    'No high-risk approval patterns identified.',
  ];
  if (method) {
    details.push(`Recognized method: ${method}`);
  }

  return {
    severity: 'INFO',
    title: 'No elevated risk detected',
    summary: 'This transaction does not exhibit patterns commonly associated with elevated risk.',
    details: details.slice(0, 4),
    recommendation: 'As always, verify the transaction details match your intent before confirming.',
    confidence: input.confidence,
  };
}

// ─── Phase 2 (continued): Main Builder ───────────────────────────────────────

function detectTags(input: WarningInput): EvidenceTag[] {
  const tags: EvidenceTag[] = [];
  if (input.signals.unlimitedApproval) tags.push('UNLIMITED_APPROVAL');
  else if (input.signals.approvals.length > 0) tags.push('LIMITED_APPROVAL');
  if (input.signals.isPermit) tags.push('PERMIT_SIGNATURE');
  if (input.signals.highValueNativeTransfer) tags.push('HIGH_VALUE_NATIVE_TRANSFER');
  if (input.signals.reverted) tags.push('REVERT');
  if (input.signals.isMulticall) tags.push('MULTICALL');
  if (!input.signals.knownMethod && !input.signals.reverted && input.signals.approvals.length === 0 && !input.signals.isMulticall && !input.signals.isPermit) tags.push('UNKNOWN_METHOD');
  if (input.evidence?.tags.includes('KNOWN_BAD_ADDRESS')) tags.push('KNOWN_BAD_ADDRESS');
  if (input.evidence?.tags.includes('KNOWN_BAD_CONTRACT')) tags.push('KNOWN_BAD_CONTRACT');
  return tags;
}

function selectTemplate(tags: EvidenceTag[], input: WarningInput): CompliantMessage {
  // Priority order: known-bad > unlimited approval > permit > revert > high-value > multicall > unknown method > limited approval > EOA transfer > safe
  if (tags.includes('KNOWN_BAD_ADDRESS') || tags.includes('KNOWN_BAD_CONTRACT')) {
    return buildKnownBadAddressMessage(input);
  }
  if (tags.includes('UNLIMITED_APPROVAL')) {
    return buildUnlimitedApprovalMessage(input);
  }
  if (tags.includes('PERMIT_SIGNATURE')) {
    return buildPermitMessage(input);
  }
  if (tags.includes('REVERT')) {
    return buildRevertMessage(input);
  }
  if (tags.includes('HIGH_VALUE_NATIVE_TRANSFER')) {
    return buildHighValueTransferMessage(input);
  }
  if (tags.includes('MULTICALL')) {
    return buildMulticallMessage(input);
  }
  if (tags.includes('UNKNOWN_METHOD')) {
    return buildUnknownMethodMessage(input);
  }
  if (tags.includes('LIMITED_APPROVAL')) {
    return buildLimitedApprovalMessage(input);
  }
  // Fallback for EOA transfers with value (no specific tag but verdict is WARNING)
  if (input.verdict === 'WARNING') {
    return buildEoaTransferMessage(input);
  }
  return buildSafeMessage(input);
}

// ─── Phase 4: Formatting Constraints ─────────────────────────────────────────

function enforceConstraints(msg: CompliantMessage): CompliantMessage {
  return {
    severity: msg.severity,
    title: msg.title.slice(0, 40),
    summary: msg.summary.slice(0, 200),
    details: msg.details.slice(0, 4),
    recommendation: msg.recommendation,
    confidence: Math.max(0, Math.min(100, msg.confidence)),
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function buildCompliantWarning(input: WarningInput): CompliantMessage {
  const tags = detectTags(input);
  const raw = selectTemplate(tags, input);
  const constrained = enforceConstraints(raw);

  // Final sanitization pass on all text fields
  return {
    ...constrained,
    title: sanitizeLanguage(constrained.title),
    summary: sanitizeLanguage(constrained.summary),
    details: constrained.details.map(sanitizeLanguage),
    recommendation: sanitizeLanguage(constrained.recommendation),
  };
}

// ─── Phase 5 (Documentation): Language Reference ─────────────────────────────

/**
 * ALLOWED PHRASES:
 * - "may", "could", "might"
 * - "increases risk", "commonly associated with"
 * - "appears to be", "indicates"
 * - "flagged by", "reported by", "listed by"
 * - "consider", "verify", "review", "confirm"
 *
 * DO-NOT-SAY LIST (automatically sanitized):
 * - "will" (except "will not") -> replaced with "may"
 * - "guaranteed" / "guarantee" -> replaced with "likely"
 * - "definitely" -> replaced with "may"
 * - "scam" -> replaced with "high-risk"
 * - "malicious" -> replaced with "potentially harmful"
 * - "drain" -> replaced with "move"
 * - "you will lose" -> replaced with "you could lose"
 * - "funds will be stolen" -> replaced with "funds could be moved"
 */

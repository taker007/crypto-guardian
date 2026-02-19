// =============================================================================
// TX RISK ENGINE — Explainable Risk Scoring
// =============================================================================
// Production-ready v1 rule set. No ML. Every verdict is traceable to a rule.
// =============================================================================

import type { TxSignals } from './txSignals';
import type { EthCallResult } from './txSimulator';

export type Verdict = 'SAFE' | 'WARNING' | 'DANGER';

export interface RiskAssessment {
  verdict: Verdict;
  confidence: number;
  summary: string;
  reasons: string[];
}

interface RuleResult {
  verdict: Verdict;
  confidence: number;
  reason: string;
}

// ─── Individual Rules ─────────────────────────────────────────────────────────

function ruleRevert(ethCallResult: EthCallResult): RuleResult | null {
  if (!ethCallResult.success) {
    const reason = ethCallResult.revertReason || 'Transaction reverted';
    const isDangerous =
      /TRANSFER_FROM_FAILED|insufficient allowance|insufficient balance|execution reverted/i.test(reason);

    return {
      verdict: isDangerous ? 'DANGER' : 'WARNING',
      confidence: isDangerous ? 85 : 70,
      reason: `Transaction would revert: ${reason}`,
    };
  }
  return null;
}

function ruleUnlimitedApproval(signals: TxSignals): RuleResult | null {
  if (signals.unlimitedApproval && signals.approvals.length > 0) {
    if (signals.spenderIsContract === true) {
      return {
        verdict: 'DANGER',
        confidence: 90,
        reason: `Unlimited token approval to contract ${signals.approvals[0].spender}. This grants the contract full access to spend your tokens.`,
      };
    }
    if (signals.spenderIsContract === false) {
      return {
        verdict: 'DANGER',
        confidence: 95,
        reason: `Unlimited token approval to an EOA (${signals.approvals[0].spender}). Externally owned accounts with unlimited approval is highly suspicious.`,
      };
    }
    return {
      verdict: 'DANGER',
      confidence: 85,
      reason: `Unlimited token approval detected for spender ${signals.approvals[0].spender}.`,
    };
  }
  return null;
}

function ruleLimitedApproval(signals: TxSignals): RuleResult | null {
  if (!signals.unlimitedApproval && signals.approvals.length > 0) {
    return {
      verdict: 'WARNING',
      confidence: 50,
      reason: `Token approval for ${signals.approvals[0].amount} tokens to spender ${signals.approvals[0].spender}. Verify you trust this contract.`,
    };
  }
  return null;
}

function rulePermit(signals: TxSignals): RuleResult | null {
  if (signals.isPermit) {
    return {
      verdict: 'WARNING',
      confidence: 75,
      reason: 'Signature-based approval (permit) detected. This allows a third party to spend tokens using your signature without an on-chain approve transaction.',
    };
  }
  return null;
}

function ruleHighValueTransfer(signals: TxSignals): RuleResult | null {
  if (signals.highValueNativeTransfer) {
    return {
      verdict: 'WARNING',
      confidence: 60,
      reason: 'High-value native ETH transfer detected (>0.25 ETH). Double-check the recipient address.',
    };
  }
  return null;
}

function ruleUnknownMethod(signals: TxSignals, toIsEOA: boolean, data: string): RuleResult | null {
  if (!signals.knownMethod && data.length > 10 && !toIsEOA) {
    return {
      verdict: 'WARNING',
      confidence: 40,
      reason: `Unknown contract method called (selector: ${data.slice(0, 10)}). Cannot verify the intent of this transaction.`,
    };
  }
  return null;
}

function ruleDirectEOATransfer(_signals: TxSignals, toIsEOA: boolean, value: string | undefined): RuleResult | null {
  if (toIsEOA && value && value !== '0x0' && value !== '0x00' && value !== '0x') {
    return {
      verdict: 'WARNING',
      confidence: 30,
      reason: 'Direct ETH transfer to an externally owned account. Verify the recipient.',
    };
  }
  return null;
}

function ruleMulticall(signals: TxSignals): RuleResult | null {
  if (signals.isMulticall) {
    return {
      verdict: 'WARNING',
      confidence: 55,
      reason: 'Multicall/batch execution detected. This bundles multiple operations in one transaction, making it harder to verify each action.',
    };
  }
  return null;
}

// ─── Scoring Engine ───────────────────────────────────────────────────────────

export function assessRisk(
  ethCallResult: EthCallResult,
  signals: TxSignals,
  toIsEOA: boolean,
  data: string,
  value?: string,
): RiskAssessment {
  const results: RuleResult[] = [];

  const r1 = ruleRevert(ethCallResult);
  if (r1) results.push(r1);

  const r2 = ruleUnlimitedApproval(signals);
  if (r2) results.push(r2);

  const r3 = ruleLimitedApproval(signals);
  if (r3) results.push(r3);

  const r4 = rulePermit(signals);
  if (r4) results.push(r4);

  const r5 = ruleHighValueTransfer(signals);
  if (r5) results.push(r5);

  const r6 = ruleUnknownMethod(signals, toIsEOA, data);
  if (r6) results.push(r6);

  const r7 = ruleDirectEOATransfer(signals, toIsEOA, value);
  if (r7) results.push(r7);

  const r8 = ruleMulticall(signals);
  if (r8) results.push(r8);

  // No flags triggered
  if (results.length === 0) {
    return {
      verdict: 'SAFE',
      confidence: 70,
      summary: 'No suspicious patterns detected in this transaction.',
      reasons: ['No revert detected', 'No dangerous approval patterns', 'Known or benign method'],
    };
  }

  // Pick the highest-severity verdict
  const hasDanger = results.some((r) => r.verdict === 'DANGER');
  const hasWarning = results.some((r) => r.verdict === 'WARNING');
  const verdict: Verdict = hasDanger ? 'DANGER' : hasWarning ? 'WARNING' : 'SAFE';

  // Confidence = max confidence among matching severity results
  const relevantResults = results.filter((r) => r.verdict === verdict);
  const confidence = Math.max(...relevantResults.map((r) => r.confidence));

  // Summary: top reason
  const topResult = relevantResults.sort((a, b) => b.confidence - a.confidence)[0];

  return {
    verdict,
    confidence,
    summary: topResult.reason,
    reasons: results.map((r) => r.reason),
  };
}

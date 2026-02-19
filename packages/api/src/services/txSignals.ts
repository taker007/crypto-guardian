// =============================================================================
// TX SIGNALS — Calldata Decoding & Signal Extraction
// =============================================================================
// Detects known function selectors, parses approval intents, and classifies
// transaction patterns without requiring full ABIs.
// =============================================================================

import { getCode } from './txSimulator';

// ─── Known Function Selectors ─────────────────────────────────────────────────

export const KNOWN_SELECTORS: Record<string, string> = {
  '0x095ea7b3': 'approve(address,uint256)',
  '0xa9059cbb': 'transfer(address,uint256)',
  '0x23b872dd': 'transferFrom(address,address,uint256)',
  '0xd505accf': 'permit(address,address,uint256,uint256,uint8,bytes32,bytes32)',
  '0x2b67b570': 'permit(address,uint256,uint256,uint8,bytes32,bytes32)', // DAI-style
  '0xac9650d8': 'multicall(bytes[])',
  '0x5ae401dc': 'multicall(uint256,bytes[])', // Uniswap V3 Router
  '0x1f0464d1': 'multicall(bytes32,bytes[])', // Uniswap Universal Router
  '0x3593564c': 'execute(bytes,bytes[],uint256)', // Universal Router execute
  '0x2a2d80d1': 'permit(address,((address,uint160,uint48,uint48)[],address,uint256),bytes)', // Permit2 batch
  '0x30f28b7a': 'permit(((address,uint160,uint48,uint48),address,uint256),bytes)', // Permit2 single
  '0x36c78516': 'transferFrom(address,address,uint160,address)', // Permit2 transferFrom
  '0x0d58b1db': 'allowance(address,address,address)', // Permit2 allowance
  '0x87517c45': 'approve(address,(address,uint160,uint48)[],uint256)', // Permit2 approve
};

const MAX_UINT256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
const HIGH_APPROVAL_THRESHOLD = BigInt(2) ** BigInt(255);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApprovalSignal {
  token: string;
  owner: string;
  spender: string;
  amount: string;
}

export interface TransferSignal {
  token: string;
  from: string;
  to: string;
  amount: string;
}

export interface TxSignals {
  knownMethod: string | null;
  approvals: ApprovalSignal[];
  erc20Transfers: TransferSignal[];
  unlimitedApproval: boolean;
  spenderIsContract: boolean | null;
  isPermit: boolean;
  isMulticall: boolean;
  highValueNativeTransfer: boolean;
}

// ─── Extraction ───────────────────────────────────────────────────────────────

export function getSelector(data: string): string | null {
  if (!data || data.length < 10) return null;
  return data.slice(0, 10).toLowerCase();
}

export function identifyMethod(data: string): string | null {
  const selector = getSelector(data);
  if (!selector) return null;
  return KNOWN_SELECTORS[selector] || null;
}

export function parseApproval(
  data: string,
  tokenAddress: string,
  fromAddress: string,
): ApprovalSignal | null {
  const selector = getSelector(data);
  if (selector !== '0x095ea7b3') return null;

  // approve(address spender, uint256 amount)
  // selector (4 bytes) + spender (32 bytes) + amount (32 bytes) = 68 bytes = 136 hex chars + '0x'
  if (data.length < 138) return null;

  const spender = '0x' + data.slice(34, 74).toLowerCase();
  const amountHex = data.slice(74, 138);
  const amount = BigInt('0x' + amountHex);

  return {
    token: tokenAddress.toLowerCase(),
    owner: fromAddress.toLowerCase(),
    spender,
    amount: amount.toString(),
  };
}

export function isUnlimitedApproval(amountStr: string): boolean {
  try {
    const amount = BigInt(amountStr);
    return amount >= HIGH_APPROVAL_THRESHOLD || amount === MAX_UINT256;
  } catch {
    return false;
  }
}

export function parseTransfer(
  data: string,
  tokenAddress: string,
  fromAddress: string,
): TransferSignal | null {
  const selector = getSelector(data);

  if (selector === '0xa9059cbb' && data.length >= 138) {
    // transfer(address to, uint256 amount)
    const to = '0x' + data.slice(34, 74).toLowerCase();
    const amountHex = data.slice(74, 138);
    const amount = BigInt('0x' + amountHex);
    return {
      token: tokenAddress.toLowerCase(),
      from: fromAddress.toLowerCase(),
      to,
      amount: amount.toString(),
    };
  }

  if (selector === '0x23b872dd' && data.length >= 202) {
    // transferFrom(address from, address to, uint256 amount)
    const from = '0x' + data.slice(34, 74).toLowerCase();
    const to = '0x' + data.slice(98, 138).toLowerCase();
    const amountHex = data.slice(138, 202);
    const amount = BigInt('0x' + amountHex);
    return {
      token: tokenAddress.toLowerCase(),
      from,
      to,
      amount: amount.toString(),
    };
  }

  return null;
}

function isPermitSelector(selector: string | null): boolean {
  if (!selector) return false;
  return [
    '0xd505accf', '0x2b67b570', '0x2a2d80d1', '0x30f28b7a', '0x87517c45',
  ].includes(selector);
}

function isMulticallSelector(selector: string | null): boolean {
  if (!selector) return false;
  return [
    '0xac9650d8', '0x5ae401dc', '0x1f0464d1', '0x3593564c',
  ].includes(selector);
}

function isHighValueNative(valueHex: string | undefined, thresholdEth: number = 0.25): boolean {
  if (!valueHex || valueHex === '0x0' || valueHex === '0x00' || valueHex === '0x') return false;
  try {
    const wei = BigInt(valueHex);
    const thresholdWei = BigInt(Math.floor(thresholdEth * 1e18));
    return wei >= thresholdWei;
  } catch {
    return false;
  }
}

// ─── Main Extraction ──────────────────────────────────────────────────────────

export async function extractSignals(
  chainId: string,
  from: string,
  to: string,
  data: string,
  value?: string,
): Promise<TxSignals> {
  const selector = getSelector(data);
  const knownMethod = identifyMethod(data);
  const approvals: ApprovalSignal[] = [];
  const erc20Transfers: TransferSignal[] = [];
  let unlimitedApproval = false;
  let spenderIsContract: boolean | null = null;

  // Parse approval
  const approval = parseApproval(data, to, from);
  if (approval) {
    approvals.push(approval);
    unlimitedApproval = isUnlimitedApproval(approval.amount);

    // Check if spender is a contract
    try {
      const code = await getCode(chainId, approval.spender);
      if (code !== null) {
        spenderIsContract = code !== '0x' && code !== '0x0' && code.length > 2;
      }
    } catch {
      spenderIsContract = null;
    }
  }

  // Parse transfer
  const transfer = parseTransfer(data, to, from);
  if (transfer) {
    erc20Transfers.push(transfer);
  }

  return {
    knownMethod,
    approvals,
    erc20Transfers,
    unlimitedApproval,
    spenderIsContract,
    isPermit: isPermitSelector(selector),
    isMulticall: isMulticallSelector(selector),
    highValueNativeTransfer: isHighValueNative(value),
  };
}

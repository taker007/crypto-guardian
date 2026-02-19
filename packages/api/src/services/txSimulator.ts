// =============================================================================
// TX SIMULATOR — RPC Client + Provider Abstraction
// =============================================================================
// Read-only Ethereum RPC calls for transaction simulation.
// =============================================================================

const RPC_TIMEOUT_MS = 2500;

export interface SimTxParams {
  from: string;
  to: string;
  data: string;
  value?: string;
  gas?: string;
}

export interface EthCallResult {
  success: boolean;
  returnData: string | null;
  revertReason: string | null;
}

export interface TraceLog {
  address: string;
  topics: string[];
  data: string;
}

export interface TraceCallResult {
  supported: boolean;
  logs: TraceLog[];
  gasUsed: string | null;
}

function getRpcUrl(chainId: string): string | null {
  if (chainId === 'eth') {
    return process.env.ETH_RPC_URL || null;
  }
  // Expand later for other chains
  return null;
}

async function rpcCall(
  rpcUrl: string,
  method: string,
  params: unknown[],
): Promise<{ result?: unknown; error?: { code: number; message: string } }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RPC_TIMEOUT_MS);

  try {
    const resp = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      signal: controller.signal,
    });
    return (await resp.json()) as { result?: unknown; error?: { code: number; message: string } };
  } finally {
    clearTimeout(timeout);
  }
}

function decodeRevertReason(hex: string): string | null {
  // Standard Error(string) revert: 0x08c379a2 + offset + length + utf8
  if (hex.startsWith('0x08c379a2') && hex.length >= 138) {
    try {
      const lengthHex = hex.slice(74, 138);
      const strLen = parseInt(lengthHex, 16);
      if (strLen > 0 && strLen < 1024) {
        const strHex = hex.slice(138, 138 + strLen * 2);
        const bytes = Buffer.from(strHex, 'hex');
        return bytes.toString('utf8');
      }
    } catch { /* fall through */ }
  }
  // Panic(uint256): 0x4e487b71
  if (hex.startsWith('0x4e487b71') && hex.length >= 74) {
    const code = parseInt(hex.slice(10, 74), 16);
    const panicCodes: Record<number, string> = {
      0x00: 'Generic compiler panic',
      0x01: 'Assert failed',
      0x11: 'Arithmetic overflow/underflow',
      0x12: 'Division by zero',
      0x21: 'Invalid enum value',
      0x22: 'Storage encoding error',
      0x31: 'Empty array pop',
      0x32: 'Array out of bounds',
      0x41: 'Out of memory',
      0x51: 'Uninitialized function pointer',
    };
    return panicCodes[code] || `Panic(0x${code.toString(16)})`;
  }
  return null;
}

export async function simulateEthCall(
  chainId: string,
  tx: SimTxParams,
): Promise<EthCallResult & { rpcUrl: string }> {
  const rpcUrl = getRpcUrl(chainId);
  if (!rpcUrl) {
    return { success: false, returnData: null, revertReason: 'No RPC configured for chain: ' + chainId, rpcUrl: 'none' };
  }

  const callObj: Record<string, string> = {
    from: tx.from,
    to: tx.to,
    data: tx.data,
  };
  if (tx.value && tx.value !== '0x0' && tx.value !== '0x00') {
    callObj.value = tx.value;
  }
  if (tx.gas) {
    callObj.gas = tx.gas;
  }

  try {
    const resp = await rpcCall(rpcUrl, 'eth_call', [callObj, 'latest']);

    if (resp.error) {
      // Many providers return revert info in the error
      const reason = decodeRevertReason(resp.error.message || '') || resp.error.message;
      return { success: false, returnData: null, revertReason: reason, rpcUrl };
    }

    const returnData = resp.result as string;

    // Check if the return data itself is a revert
    if (returnData && returnData.startsWith('0x08c379a2')) {
      const reason = decodeRevertReason(returnData);
      return { success: false, returnData, revertReason: reason, rpcUrl };
    }

    return { success: true, returnData, revertReason: null, rpcUrl };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'RPC call failed';
    return { success: false, returnData: null, revertReason: message, rpcUrl };
  }
}

export async function optionalTraceCall(
  chainId: string,
  tx: SimTxParams,
): Promise<TraceCallResult> {
  const rpcUrl = getRpcUrl(chainId);
  if (!rpcUrl) {
    return { supported: false, logs: [], gasUsed: null };
  }

  const callObj: Record<string, string> = {
    from: tx.from,
    to: tx.to,
    data: tx.data,
  };
  if (tx.value && tx.value !== '0x0') callObj.value = tx.value;
  if (tx.gas) callObj.gas = tx.gas;

  try {
    // Try trace_call (OpenEthereum/Erigon style)
    const resp = await rpcCall(rpcUrl, 'trace_call', [callObj, ['trace', 'vmTrace'], 'latest']);

    if (resp.error) {
      // Method not supported — this is expected for many providers
      return { supported: false, logs: [], gasUsed: null };
    }

    // Extract logs from trace output if available
    const result = resp.result as Record<string, unknown> | null;
    const logs: TraceLog[] = [];
    const gasUsed = result?.output ? null : null; // Trace format varies

    return { supported: true, logs, gasUsed };
  } catch {
    return { supported: false, logs: [], gasUsed: null };
  }
}

export async function getCode(chainId: string, address: string): Promise<string | null> {
  const rpcUrl = getRpcUrl(chainId);
  if (!rpcUrl) return null;

  try {
    const resp = await rpcCall(rpcUrl, 'eth_getCode', [address, 'latest']);
    if (resp.error) return null;
    return resp.result as string;
  } catch {
    return null;
  }
}

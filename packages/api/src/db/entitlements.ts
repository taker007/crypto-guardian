import { getPool } from '../services/database';

function normalize(walletAddress: string): string {
  return walletAddress.toLowerCase();
}

export interface WalletEntitlement {
  walletAddress: string;
  tier: string;
  source: string;
  blacklisted: boolean;
  reason: string | null;
  createdAt: string;
  updatedAt: string;
}

interface RawRow {
  wallet_address: string;
  tier: string;
  source: string;
  blacklisted: boolean;
  reason: string | null;
  created_at: string | Date;
  updated_at: string | Date;
}

function toISOString(val: string | Date): string {
  if (val instanceof Date) return val.toISOString();
  return new Date(val).toISOString();
}

function rowToEntitlement(row: RawRow): WalletEntitlement {
  return {
    walletAddress: row.wallet_address,
    tier: row.tier,
    source: row.source,
    blacklisted: row.blacklisted,
    reason: row.reason,
    createdAt: toISOString(row.created_at),
    updatedAt: toISOString(row.updated_at),
  };
}

export async function getEntitlement(walletAddress: string): Promise<WalletEntitlement | null> {
  const pool = getPool();
  const result = await pool.query<RawRow>(
    'SELECT * FROM wallet_entitlements WHERE wallet_address = $1',
    [normalize(walletAddress)],
  );
  return result.rows[0] ? rowToEntitlement(result.rows[0]) : null;
}

export async function grantPro(
  walletAddress: string,
  source: string = 'manual',
): Promise<WalletEntitlement> {
  const addr = normalize(walletAddress);
  const pool = getPool();
  await pool.query(
    `INSERT INTO wallet_entitlements (wallet_address, tier, source, updated_at)
     VALUES ($1, 'pro', $2, NOW())
     ON CONFLICT (wallet_address) DO UPDATE SET
       tier = 'pro',
       source = EXCLUDED.source,
       updated_at = NOW()`,
    [addr, source],
  );
  return (await getEntitlement(addr))!;
}

export async function revokePro(walletAddress: string): Promise<WalletEntitlement> {
  const addr = normalize(walletAddress);
  const pool = getPool();
  await pool.query(
    `INSERT INTO wallet_entitlements (wallet_address, tier, updated_at)
     VALUES ($1, 'free', NOW())
     ON CONFLICT (wallet_address) DO UPDATE SET
       tier = 'free',
       updated_at = NOW()`,
    [addr],
  );
  return (await getEntitlement(addr))!;
}

export async function blacklistWallet(
  walletAddress: string,
  reason: string,
): Promise<WalletEntitlement> {
  const addr = normalize(walletAddress);
  const pool = getPool();
  await pool.query(
    `INSERT INTO wallet_entitlements (wallet_address, blacklisted, reason, updated_at)
     VALUES ($1, true, $2, NOW())
     ON CONFLICT (wallet_address) DO UPDATE SET
       blacklisted = true,
       reason = EXCLUDED.reason,
       updated_at = NOW()`,
    [addr, reason],
  );
  return (await getEntitlement(addr))!;
}

export async function unblacklistWallet(walletAddress: string): Promise<WalletEntitlement> {
  const addr = normalize(walletAddress);
  const pool = getPool();
  await pool.query(
    `INSERT INTO wallet_entitlements (wallet_address, blacklisted, reason, updated_at)
     VALUES ($1, false, NULL, NOW())
     ON CONFLICT (wallet_address) DO UPDATE SET
       blacklisted = false,
       reason = NULL,
       updated_at = NOW()`,
    [addr],
  );
  return (await getEntitlement(addr))!;
}

export async function listEntitlements(): Promise<WalletEntitlement[]> {
  const pool = getPool();
  const result = await pool.query<RawRow>(
    'SELECT * FROM wallet_entitlements ORDER BY updated_at DESC',
  );
  return result.rows.map(rowToEntitlement);
}

export interface AccessCheckResult {
  tier: 'free' | 'pro' | 'blocked';
  blacklisted: boolean;
  source: string;
}

export async function checkAccess(walletAddress: string): Promise<AccessCheckResult> {
  const entry = await getEntitlement(walletAddress);
  if (!entry) {
    return { tier: 'free', blacklisted: false, source: 'none' };
  }
  if (entry.blacklisted) {
    return { tier: 'blocked', blacklisted: true, source: entry.source };
  }
  if (entry.tier === 'pro') {
    return { tier: 'pro', blacklisted: false, source: entry.source };
  }
  return { tier: 'free', blacklisted: false, source: entry.source };
}

import bcrypt from 'bcryptjs';
import { getPool } from '../services/database';

const SALT_ROUNDS = 12;

export interface AdminUser {
  id: number;
  username: string;
  createdAt: string;
}

function toISOString(val: string | Date): string {
  if (val instanceof Date) return val.toISOString();
  return new Date(val).toISOString();
}

export async function createAdminUser(username: string, password: string): Promise<AdminUser> {
  const pool = getPool();
  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  const result = await pool.query<{ id: number; username: string; created_at: string | Date }>(
    `INSERT INTO admin_users (username, password_hash)
     VALUES ($1, $2)
     RETURNING id, username, created_at`,
    [username.toLowerCase(), hash],
  );
  const row = result.rows[0];
  return { id: row.id, username: row.username, createdAt: toISOString(row.created_at) };
}

export async function verifyLogin(
  username: string,
  password: string,
): Promise<AdminUser | null> {
  const pool = getPool();
  const result = await pool.query<{
    id: number;
    username: string;
    password_hash: string;
    created_at: string | Date;
  }>('SELECT id, username, password_hash, created_at FROM admin_users WHERE username = $1', [
    username.toLowerCase(),
  ]);
  const row = result.rows[0];
  if (!row) return null;
  const valid = await bcrypt.compare(password, row.password_hash);
  if (!valid) return null;
  return { id: row.id, username: row.username, createdAt: toISOString(row.created_at) };
}

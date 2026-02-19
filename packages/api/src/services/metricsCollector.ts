import { collectMetrics, storeMetrics } from './performanceAdvisor';
import { getPool } from './database';

let collectorInterval: ReturnType<typeof setInterval> | null = null;
let tableReady = false;

const COLLECT_INTERVAL_MS = 60_000;

async function ensureTable(): Promise<boolean> {
  if (tableReady) return true;
  try {
    const pool = getPool();
    await pool.query(
      'CREATE TABLE IF NOT EXISTS system_metrics (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, cpu_percent REAL NOT NULL, memory_percent REAL NOT NULL, disk_percent REAL NOT NULL, api_latency_ms INTEGER, active_connections INTEGER, redis_memory_mb REAL, db_latency_ms INTEGER, created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW())'
    );
    await pool.query('CREATE INDEX IF NOT EXISTS sm_created_idx ON system_metrics (created_at)');
    tableReady = true;
    return true;
  } catch (err) {
    console.error('[metrics-collector] Failed to create system_metrics table:', err);
    return false;
  }
}

async function collectAndStore(): Promise<void> {
  try {
    const ready = await ensureTable();
    if (!ready) return;
    const metrics = await collectMetrics();
    await storeMetrics(metrics);
  } catch (err) {
    console.error('[metrics-collector] Collection error:', err);
  }
}

async function pruneOldMetrics(): Promise<void> {
  try {
    const pool = getPool();
    await pool.query("DELETE FROM system_metrics WHERE created_at < NOW() - INTERVAL '30 days'");
  } catch { /* non-critical */ }
}

export function startMetricsCollector(): void {
  if (collectorInterval) return;
  console.log('[API] Metrics collector started (interval: 60s)');
  collectAndStore();
  collectorInterval = setInterval(collectAndStore, COLLECT_INTERVAL_MS);
  setInterval(pruneOldMetrics, 60 * 60 * 1000);
}

export function stopMetricsCollector(): void {
  if (collectorInterval) {
    clearInterval(collectorInterval);
    collectorInterval = null;
    console.log('[API] Metrics collector stopped');
  }
}

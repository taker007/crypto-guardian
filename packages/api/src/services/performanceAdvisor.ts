import os from 'os';
import { execSync } from 'child_process';
import { getPool } from './database';
import { getRedis, isRedisHealthy } from './redis';

export interface SystemMetrics {
  cpuPercent: number;
  memoryPercent: number;
  diskPercent: number;
  apiLatencyMs: number | null;
  activeConnections: number | null;
  redisMemoryMb: number | null;
  dbLatencyMs: number | null;
}

export type Severity = 'critical' | 'warning' | 'info';

export interface Recommendation {
  id: string;
  severity: Severity;
  title: string;
  description: string;
  metric: string;
  currentValue: number;
  threshold: number;
}

export interface CapacityForecast {
  metric: string;
  currentValue: number;
  growthRatePerDay: number;
  daysUntilThreshold: number | null;
  message: string;
}

export interface PerformanceReport {
  current: SystemMetrics;
  recommendations: Recommendation[];
  forecasts: CapacityForecast[];
  collectedAt: string;
}

export async function collectMetrics(): Promise<SystemMetrics> {
  const [cpuPercent, memoryPercent, diskPercent, dbLatencyMs, redisMemoryMb] =
    await Promise.all([
      getCpuPercent(),
      getMemoryPercent(),
      getDiskPercent(),
      getDbLatency(),
      getRedisMemoryMb(),
    ]);

  return {
    cpuPercent,
    memoryPercent,
    diskPercent,
    apiLatencyMs: null,
    activeConnections: null,
    redisMemoryMb,
    dbLatencyMs,
  };
}

function getCpuPercent(): number {
  const loadAvg = os.loadavg()[0];
  const cpuCount = os.cpus().length;
  return Math.min(100, Math.round((loadAvg / cpuCount) * 100 * 10) / 10);
}

function getMemoryPercent(): number {
  const total = os.totalmem();
  const free = os.freemem();
  return Math.round(((total - free) / total) * 100 * 10) / 10;
}

function getDiskPercent(): number {
  try {
    const output = execSync("df / --output=pcent | tail -1", {
      timeout: 5000,
      encoding: 'utf8',
    });
    const match = output.trim().match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  } catch {
    return 0;
  }
}

async function getDbLatency(): Promise<number | null> {
  try {
    const pool = getPool();
    const start = Date.now();
    await pool.query('SELECT 1');
    return Date.now() - start;
  } catch {
    return null;
  }
}

async function getRedisMemoryMb(): Promise<number | null> {
  try {
    const healthy = await isRedisHealthy();
    if (!healthy) return null;
    const redis = getRedis();
    const info = await redis.info('memory');
    const match = info.match(/used_memory:(\d+)/);
    if (match) {
      return Math.round((parseInt(match[1], 10) / 1024 / 1024) * 100) / 100;
    }
    return null;
  } catch {
    return null;
  }
}

export async function storeMetrics(metrics: SystemMetrics): Promise<void> {
  const pool = getPool();
  await pool.query(
    'INSERT INTO system_metrics (cpu_percent, memory_percent, disk_percent, api_latency_ms, active_connections, redis_memory_mb, db_latency_ms) VALUES ($1, $2, $3, $4, $5, $6, $7)',
    [metrics.cpuPercent, metrics.memoryPercent, metrics.diskPercent, metrics.apiLatencyMs, metrics.activeConnections, metrics.redisMemoryMb, metrics.dbLatencyMs],
  );
}

export async function getRecentMetrics(hours: number = 24): Promise<Array<{
  cpuPercent: number;
  memoryPercent: number;
  diskPercent: number;
  apiLatencyMs: number | null;
  redisMemoryMb: number | null;
  dbLatencyMs: number | null;
  createdAt: string;
}>> {
  const pool = getPool();
  const result = await pool.query(
    "SELECT cpu_percent, memory_percent, disk_percent, api_latency_ms, redis_memory_mb, db_latency_ms, created_at FROM system_metrics WHERE created_at >= NOW() - INTERVAL '1 hour' * $1 ORDER BY created_at ASC",
    [hours],
  );
  return result.rows.map((r: Record<string, unknown>) => ({
    cpuPercent: Number(r.cpu_percent),
    memoryPercent: Number(r.memory_percent),
    diskPercent: Number(r.disk_percent),
    apiLatencyMs: r.api_latency_ms != null ? Number(r.api_latency_ms) : null,
    redisMemoryMb: r.redis_memory_mb != null ? Number(r.redis_memory_mb) : null,
    dbLatencyMs: r.db_latency_ms != null ? Number(r.db_latency_ms) : null,
    createdAt: String(r.created_at),
  }));
}

export function analyzeMetrics(metrics: SystemMetrics): Recommendation[] {
  const recs: Recommendation[] = [];

  if (metrics.cpuPercent >= 90) {
    recs.push({ id: 'cpu-critical', severity: 'critical', title: 'CPU usage critically high', description: 'CPU is at ' + metrics.cpuPercent + '%. Consider upgrading server resources or optimizing compute-heavy operations.', metric: 'cpu', currentValue: metrics.cpuPercent, threshold: 90 });
  } else if (metrics.cpuPercent >= 70) {
    recs.push({ id: 'cpu-warning', severity: 'warning', title: 'CPU usage elevated', description: 'CPU is at ' + metrics.cpuPercent + '%. Monitor closely and plan for capacity increase if trend continues.', metric: 'cpu', currentValue: metrics.cpuPercent, threshold: 70 });
  }

  if (metrics.memoryPercent >= 90) {
    recs.push({ id: 'memory-critical', severity: 'critical', title: 'Memory usage critically high', description: 'Memory is at ' + metrics.memoryPercent + '%. Risk of OOM. Increase server RAM or investigate memory leaks.', metric: 'memory', currentValue: metrics.memoryPercent, threshold: 90 });
  } else if (metrics.memoryPercent >= 75) {
    recs.push({ id: 'memory-warning', severity: 'warning', title: 'Memory usage elevated', description: 'Memory is at ' + metrics.memoryPercent + '%. Plan for capacity increase.', metric: 'memory', currentValue: metrics.memoryPercent, threshold: 75 });
  }

  if (metrics.diskPercent >= 90) {
    recs.push({ id: 'disk-critical', severity: 'critical', title: 'Disk space critically low', description: 'Disk is at ' + metrics.diskPercent + '% full. Clean up logs, old backups, or expand storage immediately.', metric: 'disk', currentValue: metrics.diskPercent, threshold: 90 });
  } else if (metrics.diskPercent >= 75) {
    recs.push({ id: 'disk-warning', severity: 'warning', title: 'Disk space getting low', description: 'Disk is at ' + metrics.diskPercent + '% full. Plan for cleanup or expansion.', metric: 'disk', currentValue: metrics.diskPercent, threshold: 75 });
  }

  if (metrics.dbLatencyMs != null) {
    if (metrics.dbLatencyMs >= 100) {
      recs.push({ id: 'db-latency-critical', severity: 'critical', title: 'Database latency very high', description: 'Database latency is ' + metrics.dbLatencyMs + 'ms. Check for slow queries, connection exhaustion, or resource contention.', metric: 'db_latency', currentValue: metrics.dbLatencyMs, threshold: 100 });
    } else if (metrics.dbLatencyMs >= 50) {
      recs.push({ id: 'db-latency-warning', severity: 'warning', title: 'Database latency elevated', description: 'Database latency is ' + metrics.dbLatencyMs + 'ms. Monitor for degradation trend.', metric: 'db_latency', currentValue: metrics.dbLatencyMs, threshold: 50 });
    }
  } else {
    recs.push({ id: 'db-unreachable', severity: 'critical', title: 'Database unreachable', description: 'Cannot measure database latency. Database may be down.', metric: 'db_latency', currentValue: -1, threshold: 0 });
  }

  if (metrics.redisMemoryMb != null && metrics.redisMemoryMb >= 256) {
    recs.push({ id: 'redis-memory-warning', severity: 'warning', title: 'Redis memory usage high', description: 'Redis is using ' + metrics.redisMemoryMb + 'MB. Review cache policies and TTL settings.', metric: 'redis_memory', currentValue: metrics.redisMemoryMb, threshold: 256 });
  }

  if (recs.length === 0) {
    recs.push({ id: 'all-healthy', severity: 'info', title: 'All systems healthy', description: 'All performance metrics are within normal ranges. No action needed.', metric: 'overall', currentValue: 0, threshold: 0 });
  }

  return recs;
}

export async function forecastCapacity(): Promise<CapacityForecast[]> {
  const forecasts: CapacityForecast[] = [];
  try {
    const pool = getPool();
    const recentResult = await pool.query<{ avg_cpu: string; avg_mem: string; avg_disk: string }>(
      "SELECT AVG(cpu_percent) AS avg_cpu, AVG(memory_percent) AS avg_mem, AVG(disk_percent) AS avg_disk FROM system_metrics WHERE created_at >= NOW() - INTERVAL '1 hour'",
    );
    const olderResult = await pool.query<{ avg_cpu: string; avg_mem: string; avg_disk: string }>(
      "SELECT AVG(cpu_percent) AS avg_cpu, AVG(memory_percent) AS avg_mem, AVG(disk_percent) AS avg_disk FROM system_metrics WHERE created_at >= NOW() - INTERVAL '7 days' AND created_at < NOW() - INTERVAL '6 days'",
    );
    const recent = recentResult.rows[0];
    const older = olderResult.rows[0];

    if (recent && older && older.avg_cpu != null && recent.avg_cpu != null) {
      const metrics = [
        { name: 'CPU', current: parseFloat(recent.avg_cpu), old: parseFloat(older.avg_cpu), threshold: 90 },
        { name: 'Memory', current: parseFloat(recent.avg_mem), old: parseFloat(older.avg_mem), threshold: 90 },
        { name: 'Disk', current: parseFloat(recent.avg_disk), old: parseFloat(older.avg_disk), threshold: 90 },
      ];
      for (const m of metrics) {
        if (isNaN(m.current) || isNaN(m.old)) continue;
        const growthPerDay = (m.current - m.old) / 7;
        const remaining = m.threshold - m.current;
        const daysUntil = growthPerDay > 0 ? Math.round(remaining / growthPerDay) : null;
        forecasts.push({
          metric: m.name, currentValue: Math.round(m.current * 10) / 10, growthRatePerDay: Math.round(growthPerDay * 100) / 100, daysUntilThreshold: daysUntil,
          message: daysUntil != null && daysUntil <= 30 ? 'At current growth rate, ' + m.name + ' will reach ' + m.threshold + '% within ' + daysUntil + ' days. Upgrade recommended.'
            : daysUntil != null && daysUntil <= 90 ? m.name + ' projected to reach ' + m.threshold + '% in ~' + daysUntil + ' days. Plan ahead.'
            : m.name + ' usage is stable. No immediate capacity concern.',
        });
      }
    } else {
      forecasts.push({ metric: 'Overall', currentValue: 0, growthRatePerDay: 0, daysUntilThreshold: null, message: 'Not enough historical data for forecasting. Metrics need at least 7 days of collection.' });
    }
  } catch {
    forecasts.push({ metric: 'Overall', currentValue: 0, growthRatePerDay: 0, daysUntilThreshold: null, message: 'Unable to compute capacity forecast. Ensure system_metrics table exists.' });
  }
  return forecasts;
}

export async function generatePerformanceReport(): Promise<PerformanceReport> {
  const current = await collectMetrics();
  const recommendations = analyzeMetrics(current);
  const forecasts = await forecastCapacity();
  return { current, recommendations, forecasts, collectedAt: new Date().toISOString() };
}

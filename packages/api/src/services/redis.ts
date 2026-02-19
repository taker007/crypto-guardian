import Redis from 'ioredis';

let redis: Redis | null = null;

export function initRedis(url: string): void {
  redis = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 3 });
}

export async function connectRedis(): Promise<void> {
  if (redis) await redis.connect();
}

export function getRedis(): Redis {
  if (!redis) throw new Error('Redis not initialized');
  return redis;
}

export async function isRedisHealthy(): Promise<boolean> {
  try {
    if (!redis) return false;
    const result = await redis.ping();
    return result === 'PONG';
  } catch {
    return false;
  }
}

export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}

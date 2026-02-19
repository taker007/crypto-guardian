CREATE TABLE IF NOT EXISTS system_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cpu_percent REAL NOT NULL,
  memory_percent REAL NOT NULL,
  disk_percent REAL NOT NULL,
  api_latency_ms INTEGER,
  active_connections INTEGER,
  redis_memory_mb REAL,
  db_latency_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sm_created_idx ON system_metrics (created_at);

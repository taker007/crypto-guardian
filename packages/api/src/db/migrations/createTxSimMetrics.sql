CREATE TABLE IF NOT EXISTS tx_sim_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chain VARCHAR(16) NOT NULL DEFAULT 'eth',
  from_addr VARCHAR(42) NOT NULL,
  to_addr VARCHAR(42) NOT NULL,
  verdict VARCHAR(16) NOT NULL,
  confidence INTEGER NOT NULL,
  latency_ms INTEGER NOT NULL,
  method_selector VARCHAR(10),
  data_length INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS txsm_created_idx ON tx_sim_metrics (created_at);
CREATE INDEX IF NOT EXISTS txsm_verdict_idx ON tx_sim_metrics (verdict);

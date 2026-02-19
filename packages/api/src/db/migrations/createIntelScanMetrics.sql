CREATE TABLE IF NOT EXISTS intel_scan_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address VARCHAR(42),
  contract_address VARCHAR(42),
  chain VARCHAR(16) DEFAULT 'eth',
  scan_type VARCHAR(32) DEFAULT 'report',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ism_created_idx ON intel_scan_metrics (created_at);
CREATE INDEX IF NOT EXISTS ism_wallet_idx ON intel_scan_metrics (wallet_address);

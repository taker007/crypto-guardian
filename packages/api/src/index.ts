// =============================================================================
// CRYPTO GUARDIAN - INTEL REPORT API
// =============================================================================
// Lightweight API server that proxies intelligence report requests to the
// Crypto Intel backend. Serves the Deep Intelligence Web Portal.
// =============================================================================

import express from 'express';
import cors from 'cors';
import intelReportRoutes from './routes/intelReport';

const app = express();
const PORT = parseInt(process.env.PORT || '4008', 10); // Registered in ~/.port-registry for crypto-guardian/api

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/intel', intelReportRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'crypto-guardian-api', timestamp: Date.now() });
});

// Aliases for nginx proxy rewrite
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'crypto-guardian-api', timestamp: Date.now() });
});

app.get('/ready', (_req, res) => {
  res.json({ status: 'ok' });
});

export function startServer(port: number = PORT): void {
  app.listen(port, () => {
    console.log(`[Intel API] Server listening on port ${port}`);
  });
}

// Auto-start when run directly
if (require.main === module) {
  startServer();
}

export { app };

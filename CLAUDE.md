# Crypto Guardian SNAP — Project Configuration

## Project Overview

**Name:** Crypto Guardian
**Type:** MetaMask SNAP
**Version:** 1.0.0
**Scope:** Ethereum Mainnet only (v1)
**Backend:** Crypto Intel at `http://127.0.0.1:4006` (connected via `backend.ts`)

## Project Structure

```
crypto-guardian/
├── packages/
│   ├── snap/          # The SNAP code
│   │   ├── src/
│   │   │   ├── index.tsx    # Main SNAP logic
│   │   │   ├── backend.ts   # Backend connector (Crypto Intel)
│   │   │   ├── types.ts     # Type definitions
│   │   │   └── copy.ts      # Dual-mode copy system
│   │   ├── snap.manifest.json
│   │   └── package.json
│   └── site/          # Test dApp for development
├── package.json       # Root workspace
└── yarn.lock
```

## Quick Commands

```bash
# Install dependencies
npx yarn install

# Build the SNAP
npx yarn workspace @anthropic/crypto-guardian-snap build

# Start development mode (auto-rebuild)
npx yarn workspace @anthropic/crypto-guardian-snap start

# Run tests
npx yarn workspace @anthropic/crypto-guardian-snap test

# Start the test site
npx yarn workspace site start
```

## Current Status

- [x] Fresh SNAP project created
- [x] Crypto Guardian branding applied
- [x] UI screens implemented (mock data for preview, live data for analyzeToken)
- [x] Backend integration (Crypto Intel on port 4006)
- [x] Reviewer test buttons (safe / honeypot / unverifiable)
- [ ] Billing/subscription
- [ ] Multi-chain support

## Constraints

- Ethereum only (v1)
- Advisory only — does NOT block transactions
- No private key access
- No transaction signing
- No funds (mainnet or testnet) required to test
- All analysis is pre-transaction and informational

## Related Documentation

- UX Design: `/home/tjones/crypto-intel/docs/design/CRYPTO_GUARDIAN_SNAP_UX.md`
- Compliance: `/home/tjones/crypto-intel/docs/compliance/`
- Backend: `/home/tjones/crypto-intel/`

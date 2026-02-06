# Crypto Guardian SNAP — Project Configuration

## Project Overview

**Name:** Crypto Guardian
**Type:** MetaMask SNAP
**Version:** 1.0.0
**Scope:** Ethereum Mainnet only (v1)
**Backend:** Crypto Intel (not yet connected)

## Project Structure

```
crypto-guardian/
├── packages/
│   ├── snap/          # The SNAP code
│   │   ├── src/
│   │   │   └── index.tsx    # Main SNAP logic
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
- [x] UI screens implemented (mock data)
- [ ] Backend integration (Crypto Intel)
- [ ] Billing/subscription
- [ ] Multi-chain support

## Constraints

- Ethereum only (v1)
- Advisory only — does NOT block transactions
- No private key access
- No transaction signing
- UI-only implementation currently

## Related Documentation

- UX Design: `/home/tjones/crypto-intel/docs/design/CRYPTO_GUARDIAN_SNAP_UX.md`
- Compliance: `/home/tjones/crypto-intel/docs/compliance/`
- Backend: `/home/tjones/crypto-intel/`

# Crypto Guardian - MetaMask Snap

## Overview
MetaMask Snap for transaction security analysis. Intercepts Ethereum transactions and shows security alerts via the CryptoGuardians cloud API.

## Commands
```bash
npm install     # Install dependencies
npm run build   # Build the snap
npm test        # Run tests
npm run lint    # Check code style
```

## Key Files
- `packages/snap/src/index.ts` - Main transaction handler
- `packages/snap/snap.manifest.json` - Snap permissions
- `packages/snap/snap.config.ts` - Build configuration
- `packages/snap/test/index.test.ts` - Tests

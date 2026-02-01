# Crypto Guardian - Project Instructions

## Overview
MetaMask Snap for transaction security analysis. Intercepts Ethereum transactions and shows security alerts.

## Port Assignments
- **Dev Server**: Port 5004 (registered in ~/.port-registry)

## Commands
```bash
# Development
yarn start      # Start dev server on port 5004
yarn build      # Build the snap
yarn test       # Run tests

# Linting
yarn lint       # Check code style
yarn lint:fix   # Fix code style issues
```

## Key Files
- `packages/snap/src/index.ts` - Main transaction handler
- `packages/snap/snap.manifest.json` - Snap permissions
- `packages/snap/snap.config.ts` - Build configuration

## Testing Locally
1. Install MetaMask Flask (not regular MetaMask)
2. Run `yarn start`
3. In Flask: Settings → Snaps → Connect → `local:http://localhost:5004`
4. Initiate any transaction to see the popup

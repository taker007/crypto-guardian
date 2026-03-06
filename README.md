# CryptoGuardians MetaMask Snap

**Transaction Security Analysis for MetaMask**

CryptoGuardians Snap intercepts Ethereum transactions before signing and displays a security analysis popup, helping users make informed decisions about their transactions.

This Snap does not rely on any local or private network services.

## Architecture

```
MetaMask Snap
     |
     v
Crypto-Intel Cloud API (https://api.cryptoguardians.io)
     |
     v
Multi-chain Threat Intelligence Engine
```

The Snap communicates exclusively with the CryptoGuardians cloud API over HTTPS. All risk analysis is performed server-side using a multi-source blockchain intelligence engine.

## Features

- **Transaction Interception**: Analyzes every transaction before you sign
- **Risk Assessment**: Provides risk level (LOW/MEDIUM/HIGH) with numerical score
- **Real-time Analysis**: Calls cloud security API for up-to-date risk assessment
- **Security Alerts**: Clear popup with transaction details and warnings
- **Offline Safe**: Shows explicit warning when security API is unreachable

## How It Works

When a transaction is initiated in MetaMask:

1. MetaMask calls the Snap's `onTransaction` handler
2. The Snap sends transaction metadata to the CryptoGuardians cloud API
3. The API returns a risk assessment (risk level, score, findings)
4. The Snap displays the results in a security alert popup
5. User can **Continue** (sign) or **Cancel** (reject) the transaction

If the API is unreachable (timeout, network error), the Snap displays an explicit fallback warning with risk level **UNKNOWN**, ensuring the user is never given a false sense of security.

### Timeout and Retry Logic

- **Hard timeout**: 1.5 seconds total
- **Retry**: 1 automatic retry after 250ms delay
- **Failure handling**: Network errors, non-2xx responses, invalid JSON, and timeouts all trigger the fallback warning

## External Services

CryptoGuardians Snap communicates with:

**https://api.cryptoguardians.io**

Purpose: Transaction risk analysis using multi-chain threat intelligence.

Data transmitted:
- Transaction metadata (recipient address, value, chain ID)
- Contract addresses for security verification
- Network identifier (chain ID)

**No private keys or wallet secrets are transmitted.**

The Snap only sends transaction metadata that is already visible to any transaction insight Snap via the `endowment:transaction-insight` permission.

## Permissions

| Permission | Purpose |
|------------|---------|
| `endowment:transaction-insight` | Access transaction data before signing |
| `endowment:network-access` | Call external security API |
| `snap_dialog` | Display security alert popup |

## Building

```bash
# Install dependencies
npm install

# Build the Snap
npm run build

# Run tests
npm test

# Lint
npm run lint
```

### Prerequisites

- Node.js 18+
- npm

## Project Structure

```
crypto-guardian/
├── packages/
│   └── snap/
│       ├── src/
│       │   └── index.ts            # Main Snap entry point
│       ├── test/
│       │   └── index.test.ts       # Snap tests
│       ├── images/
│       │   └── icon.svg            # Snap icon
│       ├── snap.manifest.json      # Snap permissions and metadata
│       ├── snap.config.ts          # Build configuration
│       ├── package.json
│       ├── tsconfig.json
│       ├── jest.config.js
│       └── .eslintrc.js
├── package.json                    # Root workspace config
├── LICENSE
└── README.md
```

## License

MIT License - See [LICENSE](LICENSE) for details.

---

Built for the MetaMask Snaps ecosystem.

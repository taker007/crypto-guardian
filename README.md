# Crypto Guardian

Crypto Guardian is a MetaMask SNAP that provides advisory risk signals for Ethereum tokens. It displays informational dialogs via `snap_dialog` to help users make informed decisions before interacting with a token.

**Advisory only — does not block transactions.**

## Permissions

| Permission | Purpose |
|-----------|---------|
| `snap_dialog` | Display informational dialogs to the user |
| `endowment:rpc` (dapps: true) | Receive JSON-RPC calls from dApps |
| `endowment:transaction-insight` | Access transaction data before signing |
| `endowment:network-access` | Call external security API |

No private key access. No transaction signing. No account management.

## External Services

Crypto Guardian communicates with:

**https://cryptoguardians.io/api**

Purpose: Token risk analysis and transaction simulation using multi-chain threat intelligence.

Data transmitted:
- Token addresses for security verification
- Transaction metadata (from, to, data, value, chainId) for simulation
- Network identifier (chain ID)

**No private keys or wallet secrets are transmitted.**

## Installation

Install the SNAP directly in MetaMask Flask from the published manifest URL. No external website or test interface is required.

The SNAP does not rely on any external website or test interface for installation or review.

## RPC Methods

| Method | Description |
|--------|-------------|
| `analyzeToken` | Scans a token address and displays a risk summary dialog |
| `showWarning` | Displays a pre-built risk warning dialog |
| `showAnalysis` | Displays a detailed analysis dialog |
| `showAcknowledgement` | Displays an advisory acknowledgement dialog |
| `simulateTransaction` | Simulates a transaction and displays risk assessment |

All dialogs use the `confirmation` type and are dismissible by the user.

## How It Works

### Transaction Insight (`onTransaction`)

When a transaction is initiated in MetaMask:

1. MetaMask calls the Snap's `onTransaction` handler
2. The Snap simulates the transaction via the CryptoGuardians API
3. The API returns a risk assessment (severity, confidence, details)
4. The Snap displays the results in a transaction insight panel
5. User can **Continue** (sign) or **Cancel** (reject) the transaction

### Token Analysis (`onRpcRequest`)

DApps can invoke Crypto Guardian via JSON-RPC to:

1. Analyze a token address for risk indicators
2. Display warning/analysis/acknowledgement dialogs
3. Simulate transactions with risk assessment

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

- Node.js 18.6+
- npm or yarn

## Project Structure

```
crypto-guardian/
├── packages/
│   └── snap/
│       ├── src/
│       │   └── index.ts            # Main Snap entry point
│       ├── test/
│       │   └── index.test.ts       # Snap tests
│       ├── assets/
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

## Testing

Unit tests are included. Run `npm test` to execute them using [`@metamask/snaps-jest`](https://github.com/MetaMask/snaps/tree/main/packages/snaps-jest).

## License

(MIT-0 OR Apache-2.0) — See [LICENSE](LICENSE) for details.

---

Built for the MetaMask Snaps ecosystem.

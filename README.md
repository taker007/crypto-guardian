# 🛡️ Crypto Guardian

**MetaMask Snap for Transaction Security Analysis**

Crypto Guardian intercepts Ethereum transactions before signing and displays a security analysis popup, helping users make informed decisions about their transactions.

## Features

- 🔍 **Transaction Interception**: Analyzes every transaction before you sign
- ⚠️ **Risk Assessment**: Provides risk level (LOW/MEDIUM/HIGH) with score
- 📊 **Smart Analysis**: Detects contract interactions, high-value transfers, unusual gas limits
- 🛡️ **Security Alerts**: Clear popup with transaction details and warnings

## Quick Start

### Prerequisites

- Node.js 18+
- Yarn (v3.x)
- MetaMask Flask (for Snap development)

### Installation

```bash
# Clone the repository
git clone https://github.com/cryptoguardian/snap.git
cd crypto-guardian

# Install dependencies
yarn install

# Build the Snap
yarn build
```

### Local Development

1. **Start the Snap server**:
   ```bash
   yarn start
   ```
   This starts the development server on port 5004.

2. **Install MetaMask Flask**:
   - Download from [MetaMask Flask](https://metamask.io/flask/)
   - This is required for Snap development (regular MetaMask won't work)

3. **Connect the Snap**:
   - Open MetaMask Flask
   - Go to Settings → Snaps
   - Click "Connect a Snap"
   - Enter: `local:http://localhost:5004`

4. **Test a transaction**:
   - Go to any dApp or send ETH to another address
   - When confirming the transaction, you'll see the "🛡️ Crypto Guardian Alert" popup

## Testing

```bash
# Run tests
yarn test

# Run tests with coverage
yarn test --coverage
```

## Project Structure

```
crypto-guardian/
├── packages/
│   └── snap/
│       ├── src/
│       │   └── index.ts          # Main Snap entry point
│       ├── test/
│       │   └── index.test.ts     # Snap tests
│       ├── snap.manifest.json    # Snap permissions & metadata
│       ├── snap.config.ts        # Build configuration
│       └── package.json
├── package.json                  # Root workspace config
└── README.md
```

## How It Works

When a transaction is initiated:

1. MetaMask calls the `onTransaction` handler
2. Crypto Guardian analyzes the transaction:
   - Checks if it's a contract interaction
   - Evaluates the transfer amount
   - Examines gas limits
3. A risk score (0-100) is calculated
4. The user sees a popup with:
   - Transaction details (To, Value, Chain)
   - Risk level and score
   - Specific warnings/findings
5. User can **Continue** or **Cancel**

## MVP Roadmap

- [x] **Step 1**: Transaction interception with popup (current)
- [ ] **Step 2**: Integration with external security APIs
- [ ] **Step 3**: Address reputation checking
- [ ] **Step 4**: Contract verification (verified on Etherscan)
- [ ] **Step 5**: Historical transaction analysis

## Permissions

This Snap requires:

| Permission | Purpose |
|------------|---------|
| `endowment:transaction-insight` | Access transaction data before signing |
| `snap_dialog` | Display security alert popup |

## Building for Production

```bash
# Clean build
yarn build:clean

# The distributable files are in packages/snap/dist/
```

## Publishing to npm

```bash
cd packages/snap
npm publish --access public
```

## License

MIT License - See [LICENSE](LICENSE) for details.

---

**Built for the MetaMask Snaps ecosystem** 🦊

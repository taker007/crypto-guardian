# Crypto Guardian SNAP

**Risk signals for Ethereum tokens — advisory only.**

Crypto Guardian is a MetaMask SNAP that provides risk analysis for Ethereum tokens before you interact with them. It gives you information to make informed decisions, but does NOT block any transactions.

## What Does This SNAP Do?

When you're about to interact with a token, Crypto Guardian can:

1. **Show risk level** — LOW, HIGH, or CRITICAL
2. **Show tradeability status** — Whether the token can be sold
3. **Explain why** (paid tier) — Detailed analysis of on-chain behavior

## Important Notes

- **Advisory only** — This SNAP provides information, it does NOT control your wallet
- **Ethereum only** — Version 1 supports Ethereum Mainnet only
- **No private keys** — This SNAP cannot access or sign transactions

## For Developers

### Quick Start

```bash
# Install dependencies
npx yarn install

# Build the SNAP
npx yarn workspace @anthropic/crypto-guardian-snap build

# Start development mode (auto-rebuild on changes)
npx yarn workspace @anthropic/crypto-guardian-snap start

# Start the test site
npx yarn workspace site start
```

### Testing

```bash
npx yarn workspace @anthropic/crypto-guardian-snap test
```

### Project Structure

```
crypto-guardian/
├── packages/
│   ├── snap/           # The SNAP code
│   │   ├── src/
│   │   │   └── index.tsx    # Main SNAP logic
│   │   ├── snap.manifest.json
│   │   └── package.json
│   └── site/           # Test website for development
├── package.json        # Root workspace
└── yarn.lock
```

## Available RPC Methods

The SNAP responds to these methods:

| Method | Description |
|--------|-------------|
| `showWarning` | Display free tier warning screen |
| `showAnalysis` | Display paid tier analysis screen |
| `showAcknowledgement` | Display risk acknowledgement screen |
| `analyzeToken` | Analyze a token address |

## Version

- **Current**: 1.0.0
- **Status**: UI implementation complete, backend integration pending

## License

MIT-0 OR Apache-2.0

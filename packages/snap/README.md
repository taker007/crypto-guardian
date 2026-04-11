# CryptoGuardians Snap — User Guide

## What is CryptoGuardians Snap?

CryptoGuardians Snap provides real-time transaction risk insights inside MetaMask.

When you initiate a transaction, the Snap analyzes the token or contract and presents a clear risk assessment before you confirm.

The Snap is designed to help you better understand potential risks — it does not block or modify transactions.

---

## How It Works

1. Start a transaction in MetaMask
2. CryptoGuardians Snap automatically analyzes the token or contract
3. A risk summary is displayed before you confirm the transaction
4. Review the insights and decide how to proceed

---

## What You'll See

The Snap presents results in plain English to make risk easier to understand.

### Risk Levels

* **Low Risk**
  No major issues detected based on available data

* **Medium Risk**
  Some risk indicators detected — caution is recommended

* **High Risk**
  Significant risk signals detected — proceed carefully

* **Critical Risk**
  Multiple severe risk indicators detected — high likelihood of malicious or unsafe behavior

---

## Transaction Insights

Depending on the network and available data, the Snap may include:

* Trading behavior (buy/sell capability)
* Liquidity conditions
* Contract risk indicators
* Known risk signals from blockchain data

For supported networks, transaction simulation may be used to test real trading behavior.

---

## Important Notes

* The Snap provides **advisory insights only**
* It **does not block transactions**
* Results are based on available blockchain and market data
* Data may be incomplete or change over time
* Some networks may not support full transaction simulation

If analysis cannot be completed, the Snap will clearly indicate that the result is unavailable.

---

## Wallet vs Token Addresses

If a wallet address is detected instead of a token contract:

* The Snap will notify you that the address is not a token contract
* No risk analysis will be shown
* You can proceed or verify the correct contract address

---

## Scan Limits and Access

CryptoGuardians includes usage limits for free users.

* Free users receive a limited number of scans
* When limits are reached, the Snap will prompt you to continue with an account or upgrade
* Paid plans provide expanded access and deeper analysis

---

## Viewing Full Analysis

For more detailed insights, you can open the full report in the CryptoGuardians web app.

This includes deeper analysis across multiple risk categories and supporting data.

---

## Privacy and Data Usage

* The Snap does not store personal user data
* Transaction data is processed temporarily to generate insights
* No private keys or wallet control is accessed

---

## Permissions

| Permission | Purpose |
|-----------|---------|
| `snap_dialog` | Display informational dialogs to the user |
| `endowment:rpc` (dapps: true) | Receive JSON-RPC calls from dApps |
| `endowment:transaction-insight` | Intercept pending transactions for analysis |
| `endowment:network-access` | Reach backend analysis API |

No private key access. No transaction signing. No account management.

---

## RPC Methods

| Method | Description |
|--------|-------------|
| `analyzeToken` | Scans a token address and displays a risk summary dialog |
| `simulateTransaction` | Simulates a transaction and displays risk warnings |
| `showWarning` | Displays a pre-built risk warning dialog (testing) |
| `showAnalysis` | Displays a detailed analysis dialog (testing) |
| `showAcknowledgement` | Displays an advisory acknowledgement dialog (testing) |
| `getCopyMode` | Returns current copy mode — formal or plain (testing) |

---

## Testing

Unit tests are included. Run `yarn test` in the snap package directory to execute them using [`@metamask/snaps-jest`](https://github.com/MetaMask/snaps/tree/main/packages/snaps-jest).

---

## Need Help?

If you need more information or want deeper analysis, visit:

https://cryptoguardians.io

---

## Disclaimer

CryptoGuardians provides informational insights only and does not guarantee outcomes.

Users should always perform their own research and exercise caution when interacting with blockchain transactions.

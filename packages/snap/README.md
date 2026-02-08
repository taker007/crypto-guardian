# Crypto Guardian

Crypto Guardian is a MetaMask SNAP that provides advisory risk signals for Ethereum tokens. It displays informational dialogs via `snap_dialog` to help users make informed decisions before interacting with a token.

**Advisory only — does not block transactions.**

## Permissions

| Permission | Purpose |
|-----------|---------|
| `snap_dialog` | Display informational dialogs to the user |
| `endowment:rpc` (dapps: true) | Receive JSON-RPC calls from dApps |

No private key access. No transaction signing. No account management.

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

All dialogs use the `confirmation` type and are dismissible by the user.

## Testing

Unit tests are included. Run `yarn test` in this directory to execute them using [`@metamask/snaps-jest`](https://github.com/MetaMask/snaps/tree/main/packages/snaps-jest).

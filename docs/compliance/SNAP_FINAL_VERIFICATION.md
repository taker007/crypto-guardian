# Crypto Guardian SNAP — Final Verification Report

**Date:** 2026-02-07
**Auditor:** Automated compliance audit
**SNAP Version:** 1.0.0
**Scope:** Read-only pre-submission verification

---

## 1. Build Status

**Status: PASS**

The SNAP compiles without errors. One cosmetic warning (missing icon) does not affect functionality or security.

```
Command: npx yarn workspace @anthropic/crypto-guardian-snap build
Result:  Snap bundle evaluated successfully. Compiled 211 files in 3777ms with 1 warning.
Warning: No icon found in the Snap manifest (cosmetic only).
```

---

## 2. Permissions Are Minimal

**Status: PASS**

The manifest declares exactly two permissions. Neither grants access to private keys, transaction signing, chain state, or account management.

```
File: packages/snap/snap.manifest.json (lines 19-25)

"initialPermissions": {
  "snap_dialog": {},
  "endowment:rpc": {
    "dapps": true,
    "snaps": false
  }
}
```

| Permission | Purpose | Risk |
|-----------|---------|------|
| `snap_dialog` | Display UI dialogs to the user | None — user can dismiss |
| `endowment:rpc` (dapps: true) | Receive JSON-RPC calls from dApps | None — read-only inbound |

**Absent permissions (confirmed not requested):**
- `endowment:transaction-insight` — not present
- `endowment:ethereum-provider` — not present
- `snap_manageAccounts` — not present
- `snap_getBip44Entropy` — not present
- `endowment:network-access` — not present as a declared permission (fetch is handled by the SNAP runtime)

---

## 3. No Transaction Signing/Sending APIs

**Status: PASS**

Zero matches for any transaction-related wallet methods across the entire SNAP source tree.

```
Command: grep -rE 'eth_sendTransaction|eth_signTransaction|eth_sign|personal_sign|
         eth_signTypedData|signTransaction|sendTransaction' packages/snap/src/
Result:  No matches found

Command: grep -rE 'eth_estimateGas|eth_getBalance|eth_gasPrice|wallet_watchAsset|
         wallet_addEthereumChain' packages/snap/src/
Result:  No matches found
```

**SNAP source files audited (complete list):**
- `packages/snap/src/index.tsx` — main logic
- `packages/snap/src/backend.ts` — backend connector
- `packages/snap/src/types.ts` — type definitions
- `packages/snap/src/copy.ts` — UI text
- `packages/snap/src/index.test.tsx` — tests

---

## 4. Backend URL Is Local-Only

**Status: PASS**

The SNAP source contains exactly one URL. It points to localhost.

```
Command: grep -rn 'https\?://' packages/snap/src/
Result:  packages/snap/src/backend.ts:32:
         const BACKEND_URL = 'http://127.0.0.1:4006/api/scan';

No other URLs found in SNAP source.
```

No production, staging, or external service URLs exist in the SNAP codebase.

---

## 5. SNAP Never Blocks Transactions

**Status: PASS**

The SNAP does not implement `onTransaction` and does not request the `endowment:transaction-insight` permission. It cannot intercept, modify, delay, or block any transaction.

```
Command: grep -rE 'onTransaction|transaction-insight|endowment:transaction'
         packages/snap/**/*.{ts,tsx,json}
Result:  No matches found
```

The manifest description explicitly states: *"Advisory only — does not block transactions."*

All four `snap_dialog` calls use type `confirmation`, which presents Cancel/Proceed buttons. The user's choice has no effect on any pending transaction — the dialog is purely informational.

```
File: packages/snap/src/index.tsx
Line 275:  type: 'confirmation'
Line 290:  type: 'confirmation'
Line 301:  type: 'confirmation'
Line 321:  type: 'confirmation'
```

---

## 6. Dialogs Are Informational and Dismissible

**Status: PASS**

All dialogs use the `confirmation` type, which includes a Cancel button. No `alert` or `prompt` types are used.

**Dialog inventory:**

| RPC Method | Dialog Type | Content | Dismissible |
|-----------|-------------|---------|-------------|
| `showWarning` | confirmation | Free tier risk summary | Yes (Cancel) |
| `showAnalysis` | confirmation | Paid tier detailed analysis | Yes (Cancel) |
| `showAcknowledgement` | confirmation | Advisory acknowledgement | Yes (Go back) |
| `analyzeToken` | confirmation | Live risk scan result | Yes (Cancel) |

**UI copy audit — no guarantees or accusations:**

| Pattern Searched | Matches | Assessment |
|-----------------|---------|------------|
| "safe" (as assertion) | 0 | PASS — never claims a token is safe |
| "guarantee" | 2 | PASS — both are disclaimers: "does not guarantee outcomes" |
| "scam" | 1 | PASS — hedged: "sometimes a sign of a scam token" |
| "dangerous" | 0 | PASS |
| "fraud" / "malicious" | 0 | PASS |

Footer text (plain mode): *"Crypto Guardian shares what we find to help you decide. You're always in control of your wallet."*

---

## 7. No Secrets or API Keys in SNAP Source

**Status: PASS**

```
Command: grep -riE 'api[_-]?key|secret|password|bearer|authorization|
         private[_-]?key|mnemonic|seed' packages/snap/src/
Result:  1 match — a comment stating "No secrets, no API keys" (backend.ts:6)
```

**Additional checks:**
- No `.env` files in the SNAP package
- Site `.env.production.dist` contains only an empty `SNAP_ORIGIN=` placeholder
- No hardcoded tokens, credentials, or authentication headers in any source file
- The backend connector (`backend.ts`) sends only `Content-Type: application/json` — no auth headers

---

## 8. Documentation Matches Implementation

**Status: PASS**

| Document | Location | Matches Implementation |
|----------|----------|----------------------|
| CLAUDE.md | `/home/tjones/crypto-guardian/CLAUDE.md` | Yes — lists backend.ts, types.ts, copy.ts; states port 4006; marks backend integration complete |
| README.md | `/home/tjones/crypto-guardian/README.md` | Yes — describes advisory-only role, lists RPC methods, states no private key access |
| UX Design | `/home/tjones/crypto-intel/docs/design/CRYPTO_GUARDIAN_SNAP_UX.md` | Yes — screen layouts match render functions in index.tsx |
| Compliance | `/home/tjones/crypto-intel/docs/compliance/` | Yes — directory contains security disclosure and validation summary |

**CLAUDE.md status checklist verification:**

| Claim | Evidence |
|-------|---------|
| "Backend integration (Crypto Intel on port 4006)" | `backend.ts` line 32: `http://127.0.0.1:4006/api/scan` |
| "Reviewer test buttons (safe / honeypot / unverifiable)" | `index.tsx` (site): three cards titled "Test: Known Safe Token", "Test: Risky / Honeypot Token", "Test: Unverifiable Token" |
| "No funds (mainnet or testnet) required to test" | No transaction APIs in codebase (Item 3); test site notice confirms this |
| "Advisory only — does NOT block transactions" | No onTransaction handler (Item 5); manifest description matches |

---

## 9. Testing Does Not Require ETH or Testnet Funds

**Status: PASS**

**Evidence chain:**

1. **No transaction methods in SNAP source** (Item 3) — the SNAP never creates, signs, or submits transactions.

2. **No gas or balance APIs** — `eth_estimateGas`, `eth_getBalance`, `eth_gasPrice` are absent from the codebase.

3. **Test site uses `wallet_invokeSnap` only** — every test button calls `wallet_invokeSnap` which invokes the SNAP's JSON-RPC handler. This is a MetaMask internal method that does not touch the blockchain.

4. **Test site explicitly states no funds required:**
   ```
   File: packages/site/src/pages/index.tsx (lines 492-495)
   "No funds required. All test buttons invoke the SNAP via wallet_invokeSnap.
    No transactions are signed, no gas is estimated, and no ETH (mainnet or
    Sepolia) is needed."
   ```

5. **CLAUDE.md confirms:** *"No funds (mainnet or testnet) required to test"* (line 64)

6. **Each reviewer test button description states:** *"No funds or signing required."*

---

## Summary

| # | Check | Result |
|---|-------|--------|
| 1 | Build status | **PASS** |
| 2 | Minimal permissions | **PASS** |
| 3 | No transaction signing/sending APIs | **PASS** |
| 4 | Backend URL is local-only | **PASS** |
| 5 | SNAP never blocks transactions | **PASS** |
| 6 | Dialogs are informational and dismissible | **PASS** |
| 7 | No secrets or API keys | **PASS** |
| 8 | Documentation matches implementation | **PASS** |
| 9 | No ETH or testnet funds required | **PASS** |

**Overall: 9/9 PASS**

**No Sepolia ETH required for SNAP validation.**

---

*Report generated 2026-02-07. Read-only audit — no code modifications made.*

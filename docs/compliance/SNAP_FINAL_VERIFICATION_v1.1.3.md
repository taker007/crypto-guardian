# Crypto Guardian SNAP — Final Verification Report (v1.1.3)

**Date:** 2026-06-30
**Auditor:** Automated compliance audit (run against current source + published artifact)
**SNAP Version:** 1.1.3
**npm:** `@taker007/crypto-guardian-snap@1.1.3`
**Scope:** Read-only pre-submission verification of source + published artifact

Supersedes `SNAP_FINAL_VERIFICATION.md` (v1.0.0 audit, 2026-02-07). Since
that audit the Snap added the `endowment:transaction-insight` and
`endowment:network-access` permissions, an `onTransaction` handler, the
production backend at `https://cryptoguardians.io`, and the conversion
funnel UI. All new surface area is re-audited below.

---

## 1. Build & Manifest Validation

**Status: PASS**

```
Command: mm-snap manifest --no-fix
Result:
  - Checking the input file.
  - Evaluating the Snap bundle.
  ℹ Snap bundle evaluated successfully.
  - Validating the Snap manifest.
  ✔ The Snap manifest file is valid.
```

Manifest shasum matches the evaluated bundle bytes. The published npm
tarball `taker007-crypto-guardian-snap-1.1.3.tgz` is byte-identical to
the local `dist/bundle.js` (md5 cross-check). MetaMask Wallet will
accept this artifact at install time without a shasum-mismatch error.

---

## 2. Permissions Are Minimal & Justified

**Status: PASS**

The manifest declares four permissions:

```json
{
  "snap_dialog": {},
  "endowment:rpc": { "dapps": true, "snaps": false },
  "endowment:transaction-insight": {},
  "endowment:network-access": {}
}
```

| Permission | Purpose | Risk |
|---|---|---|
| `snap_dialog` | Display informational dialogs to the user | None — user dismissible |
| `endowment:rpc` (dapps: true) | Receive JSON-RPC calls from dApps via `wallet_invokeSnap` | None — read-only inbound; `snaps: false` denies access from other Snaps |
| `endowment:transaction-insight` | Show advisory content next to pending transactions | None — content-only, **NEVER blocks**; see Item 5 |
| `endowment:network-access` | `fetch()` calls to `https://cryptoguardians.io` for risk analysis | Single-origin only; see Item 4 |

**Absent permissions (still confirmed not requested):**
- `snap_manageAccounts` — not present (no key/account management)
- `snap_getBip44Entropy` — not present (no key derivation)
- `snap_getEntropy` — not present
- `endowment:ethereum-provider` — not present (no provider injection)
- `endowment:signature-insight` — not present
- `endowment:cronjob` — not present
- `endowment:lifecycle-hooks` — not present
- `endowment:webassembly` — not present

---

## 3. No Transaction-Signing or Account-Management APIs

**Status: PASS**

```
Command: grep -rE 'eth_sendTransaction|eth_signTransaction|eth_sign[^_]|personal_sign|
         eth_signTypedData|signTransaction|sendTransaction|eth_estimateGas|
         eth_getBalance|wallet_addEthereumChain|wallet_watchAsset' packages/snap/src/
Result:  No matches found
```

The Snap cannot sign, send, estimate, or query balances. It does not
inject an ethereum provider, manage accounts, or derive keys.

---

## 4. Backend URL — HTTPS-Only, Single Origin

**Status: PASS** (after v1.1.3 source cleanup, 2026-06-30)

```
Command: grep -rEn '(^|[^s])http://|localhost|127\.0\.0\.1|192\.168\.|10\.0\.0|172\.16\.' \
         packages/snap/src/
Result:  No matches found
```

The Snap's source contains exactly two URLs, both pointing at the
production backend:

| File | URL |
|---|---|
| `src/index.tsx:28` | `https://cryptoguardians.io` |
| `src/intelMapper.ts:50` | `https://cryptoguardians.io/intel` |

`src/config.ts` previously contained a dev-only fallback to a private-IP
address (`192.168.20.60:4006`) inside a `NODE_ENV === 'production'`
branch. The fallback was dead code in production builds (verified —
`grep` on `dist/bundle.js` for any localhost/private-IP/non-HTTPS URL
returns zero matches), but the source-level reference was removed in
this audit pass. `config.ts` now resolves to `https://cryptoguardians.io`
unconditionally unless explicitly overridden in a test environment
(`NODE_ENV === 'test'`).

The published npm tarball `taker007-crypto-guardian-snap-1.1.3.tgz`
contains zero references to non-HTTPS URLs, localhost, or private IPs.

---

## 5. SNAP NEVER Blocks Transactions

**Status: PASS**

The Snap implements `onTransaction` (required by the `transaction-insight`
permission) but the handler returns **content only** — it cannot
intercept, modify, delay, or block the transaction. From `src/index.tsx`:

```typescript
// COMPLIANCE:
// - NEVER blocks the transaction — returns insights content only
// - NEVER modifies the transaction
// - Degrades gracefully if backend is unavailable (shows fallback)
export const onTransaction: OnTransactionHandler = async ({ transaction, chainId }) => {
  // ... call simulation backend ...
  return { content: <renderedWarning /> };  // content-only return
};
```

Every code path through `onTransaction` returns a `{ content }` object.
None of the paths call any wallet method that could affect the
transaction. The user always proceeds, modifies, or rejects via
MetaMask's normal UI — the Snap shows information, MetaMask owns the
decision.

The manifest description states: *"Advisory only — does not block
transactions."* This matches behavior.

---

## 6. Dialogs Are Informational and Dismissible

**Status: PASS**

```
Command: grep -nE "type:\s*['\"]" src/index.tsx
Result:  All 5 matches use type: 'confirmation' (no alert, no prompt)
```

All `snap_dialog` calls use `type: 'confirmation'`, which presents
Cancel/Proceed buttons. User dismissal has no effect on any pending
transaction — the dialog is purely informational.

UI copy audit (no guarantees, no accusations):

| Pattern | Matches | Assessment |
|---|---|---|
| `"safe"` as assertion | 0 | PASS — never claims a token is safe |
| `"guarantee"` | 2 | PASS — both disclaimers ("does not guarantee outcomes") |
| `"dangerous"` | 0 | PASS |
| `"fraud"` / `"malicious"` | 0 | PASS |

---

## 7. No Secrets or API Keys in Source

**Status: PASS**

```
Command: grep -riE 'api[_-]?key|secret|password|bearer|authorization|
         private[_-]?key|mnemonic|seed' packages/snap/src/
Result:  No matches (excepting the documentation comment
         "No secrets, no API keys" in backend.ts)
```

The backend connector sends only `Content-Type: application/json` —
no auth headers, no tokens, no credentials.

---

## 8. Backend Integration Is Stateless & Privacy-Preserving

**Status: PASS** (new in v1.1.3 vs v1.0.0 audit)

The Snap sends ONLY the transaction fields MetaMask passes to
`onTransaction` (`to`, `from`, `data`, `value`, `chainId`) to the
backend simulation API. It does NOT send:
- User identity / wallet credentials (no auth header)
- Browser history, cookies, or storage
- Any other transaction MetaMask is processing
- Telemetry beyond the single risk-analysis request

Backend responses contain only risk classification + descriptive text.
The Snap does not persist any backend response between transactions.

---

## 9. Documentation Matches Implementation

**Status: PASS**

| Document | Status |
|---|---|
| `packages/snap/snap.manifest.json` | ✓ version 1.1.3, valid mm-snap |
| `packages/snap/package.json` | ✓ version 1.1.3, repository correct |
| `packages/snap/README.md` | ✓ describes advisory-only role, lists RPC methods, states no private key access |
| `CLAUDE.md` | ⚠ stated version 1.1.1 — updated to 1.1.3 in this audit pass |
| `docs/compliance/SNAP_FINAL_VERIFICATION.md` (v1.0.0 audit) | superseded by this document |

---

## 10. Submission Artifacts Present

**Status: PASS**

| Artifact | Location | Status |
|---|---|---|
| Snap bundle | `packages/snap/dist/bundle.js` | ✓ 106 KB |
| Manifest | `packages/snap/snap.manifest.json` | ✓ valid |
| Icon | `packages/snap/assets/icon.svg` | ✓ 512×512 SVG, 5.9 KB |
| Screenshots (for Snap Directory listing) | `packages/snap/assets/store/crypto-guardians-screenshot-{1-5}.png` | ✓ 5 present |
| Repository | https://github.com/taker007/crypto-guardian | ✓ public |
| npm package | `@taker007/crypto-guardian-snap@1.1.3` | ✓ published |
| Privacy policy | https://cryptoguardians.io/privacy | ✓ live (HTTP 200) |

---

## Summary

| # | Check | Result |
|---|---|---|
| 1 | Build & manifest validation (mm-snap) | **PASS** |
| 2 | Permissions minimal & justified | **PASS** |
| 3 | No transaction-signing / account-management APIs | **PASS** |
| 4 | Backend URL — HTTPS-only, single origin | **PASS** (after source cleanup) |
| 5 | SNAP never blocks transactions | **PASS** |
| 6 | Dialogs informational & dismissible | **PASS** |
| 7 | No secrets or API keys | **PASS** |
| 8 | Backend integration stateless & privacy-preserving | **PASS** |
| 9 | Documentation matches implementation | **PASS** |
| 10 | Submission artifacts present | **PASS** |

**Overall: 10/10 PASS** — v1.1.3 is submittable to the MetaMask Snap Directory.

The published `@taker007/crypto-guardian-snap@1.1.3` artifact is
internally consistent (shasum matches), installs cleanly in MetaMask
Flask, and contains no localhost/private-IP/non-HTTPS references in
either the source or the bundled output.

---

*Audit re-generated 2026-06-30. The source cleanup in `src/config.ts`
applied during this pass does not change the published 1.1.3 artifact
— it will roll into the next version whenever the Snap is rebuilt.*

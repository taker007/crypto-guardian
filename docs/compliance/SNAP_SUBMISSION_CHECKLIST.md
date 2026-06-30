# Crypto Guardian Snap v1.1.3 — Submission Checklist

Status as of 2026-06-30. Run `docs/compliance/SNAP_FINAL_VERIFICATION_v1.1.3.md`
for the underlying 10-point audit.

---

## ✅ Done (no further action needed)

| Item | Value |
|---|---|
| Snap published to npm | `@taker007/crypto-guardian-snap@1.1.3` |
| Manifest valid (mm-snap verified) | ✓ |
| Bundle shasum matches manifest | ✓ |
| Bundle contains zero localhost/private-IP/non-HTTPS references | ✓ |
| Source cleaned of dev-only private-IP fallback | ✓ (post-1.1.3 commit) |
| Permissions minimal: 4 standard ones, no key/account management | ✓ |
| `onTransaction` handler does NOT block transactions | ✓ |
| Backend integration: stateless, no auth, no telemetry | ✓ |
| Privacy policy live | https://cryptoguardians.io/privacy |
| Icon present (512×512 SVG) | `packages/snap/assets/icon.svg` |
| 5 screenshots ready for listing | `packages/snap/assets/store/crypto-guardians-screenshot-{1-5}.png` |
| Public repo with source | https://github.com/taker007/crypto-guardian |
| README user-facing | `packages/snap/README.md` |

---

## ⏳ Your action items

### 1. Submit to MetaMask Snap Directory

MetaMask's directory submission process (as of 2026):

**Option A — Form-based submission** (recommended for first-time listings)
- Go to https://metamask.io/snaps → "Submit a Snap" form
- Fill in:
  - Snap NPM ID: `@taker007/crypto-guardian-snap`
  - Version: `1.1.3`
  - Repository: `https://github.com/taker007/crypto-guardian`
  - Description: copy from `snap.manifest.json` description field
  - Icon: upload `packages/snap/assets/icon.svg`
  - Screenshots: upload the 5 from `packages/snap/assets/store/`
  - Privacy policy URL: `https://cryptoguardians.io/privacy`
  - Maintainer email: `support@cryptoguardians.io`
  - Category: Security (or whichever fits — the form will offer choices)

**Option B — Direct registry PR** (if directory form is unavailable)
- Fork https://github.com/MetaMask/snaps-registry
- Add an entry to `src/registry.json`:
  ```json
  "npm:@taker007/crypto-guardian-snap": {
    "id": "npm:@taker007/crypto-guardian-snap",
    "metadata": {
      "name": "Crypto Guardian",
      "author": { "name": "HAJ Solutions Inc", "website": "https://cryptoguardians.io" },
      "website": "https://cryptoguardians.io",
      "summary": "Risk signals for Ethereum tokens and transaction warnings. Advisory only.",
      "description": "Crypto Guardian provides risk signals for Ethereum tokens and transaction warnings. Advisory only — does not block transactions.",
      "category": "interoperability",
      "support": { "contact": "support@cryptoguardians.io" },
      "sourceCode": "https://github.com/taker007/crypto-guardian"
    },
    "versions": {
      "1.1.3": {
        "checksum": "req98+ogNp8cAsZ651fRh57YTO1XnfrI9QV6NPvTSfw="
      }
    }
  }
  ```
- Open PR. MetaMask team reviews + merges (typical turnaround: 1-3 weeks for crypto-security Snaps).

### 2. (Optional but recommended) Test fresh install in MetaMask Flask

Before submission, install the **npm-published version** in MetaMask Flask
(MetaMask's developer build) to confirm the user-facing experience:

1. Install MetaMask Flask: https://metamask.io/flask/
2. Open https://snaps.metamask.io and search for crypto-guardian, OR
   install directly: `await window.ethereum.request({ method: 'wallet_requestSnaps', params: { 'npm:@taker007/crypto-guardian-snap': { version: '1.1.3' } } })`
3. Verify:
   - Install completes without warning (other than the standard "unofficial Snap" warning, which goes away after directory approval)
   - Permissions dialog shows the 4 declared permissions, nothing extra
   - Initiating a small transaction triggers the `onTransaction` insight box with your risk content
   - Closing the insight doesn't cancel or modify the transaction

---

## What's NOT in this submission

| Item | Why omitted |
|---|---|
| Third-party security audit | Not required for permissionless Snaps (no key access, no account management). Optional for trust signaling. |
| Public bug bounty | Not required. Consider adding once user volume grows. |
| Multi-chain support | v1.1.3 is Ethereum mainnet only by scope. Future versions can add chains via manifest update. |
| Snap update notification system | Not a directory requirement. |

---

*If MetaMask review surfaces issues, the most likely categories are
copy/UX feedback (low-friction to address) or requests for tighter
permission justifications (the descriptions in `snap.manifest.json`
already address this). Substantive blockers — transaction blocking,
key access, private-IP refs — were all explicitly checked and ruled
out by the 10-point audit.*

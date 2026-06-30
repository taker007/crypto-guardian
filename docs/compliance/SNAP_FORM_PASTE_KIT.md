# MetaMask Snaps Allowlist Form — Paste Kit

Open the form at https://go.metamask.io/snaps-directory-request and walk
through fields one at a time. For each Typeform card below, the headline
in this doc matches what the form will ask. Copy from the **code block**
underneath into the form input.

Fields marked `[FILL IN]` need a value only you can provide.

---

## 1 · Snap name (must match `proposedName` in manifest)

```
Crypto Guardian
```

*Constraint reminder from MetaMask docs: cannot contain the words
"MetaMask," "Snap," "Meta," or "Mask." This name is compliant.*

---

## 2 · Snap builder name

```
HAJ Solutions Inc
```

## 2b · Snap builder URL

```
https://cryptoguardians.io
```

---

## 3 · Snap website URL

```
https://cryptoguardians.io
```

*This is your primary product site. Users can install the Snap and
read about its features from here.*

---

## 4 · Snap short description (1–2 sentences)

```
Crypto Guardian shows real-time risk insights for Ethereum tokens and contracts directly in MetaMask. Advisory only — never blocks, never modifies, never signs transactions.
```

*~210 chars. The "is a MetaMask Snap" phrasing the docs warn against is
deliberately avoided.*

---

## 5 · Snap long description

Paste the entire block below. Line breaks, lists, and URLs are allowed.
No HTML.

```
Crypto Guardian helps you check Ethereum tokens and contracts for hidden risks before you confirm a transaction. It runs entirely inside MetaMask as an advisory layer — it never controls your wallet, signs anything, or blocks transactions. You always make the final decision.

What it does

• Surfaces real-time risk insights next to any pending Ethereum transaction
• Analyzes the token contract you're interacting with against multi-source threat intelligence
• Highlights common attack patterns: sell restrictions, owner-modifiable balances, unlocked liquidity, concentrated holders, and unverified contracts
• Returns a clear risk level (LOW / MEDIUM / HIGH) plus the specific signals that drove the assessment
• Offers a manual scan path via dApp integration — any site can request a scan using wallet_invokeSnap

How to use it

1. Install Crypto Guardian from the MetaMask Snaps Directory
2. Use MetaMask normally — initiate any Ethereum token transaction
3. Crypto Guardian automatically appears in the transaction confirmation screen with a risk summary
4. Review the insights and decide whether to proceed, modify, or cancel — you remain in full control

Permissions explained

Crypto Guardian declares exactly four permissions, all minimal and clearly justified:

• snap_dialog — show informational risk dialogs that you can dismiss at any time
• endowment:rpc (dapps:true, snaps:false) — receive scan requests from dApps via wallet_invokeSnap
• endowment:transaction-insight — display advisory content next to your pending transactions (never blocks them)
• endowment:network-access — call the analysis API at https://cryptoguardians.io to fetch risk data

Crypto Guardian does NOT request: snap_manageAccounts, snap_getBip44Entropy, snap_getEntropy, endowment:ethereum-provider, or any other key-management or transaction-signing permission. It cannot sign, send, or modify transactions, and it has no access to your private keys, seed phrase, or account balances beyond what the public chain already exposes.

Privacy

Each scan sends only the transaction fields MetaMask passes to the Snap (to, from, data, value, chainId) to the analysis backend. No identifiers, no telemetry, no auth headers. Full privacy policy: https://cryptoguardians.io/privacy

Important disclaimer

Risk insights are informational only. They are based on publicly available blockchain data and third-party intelligence providers. Crypto Guardian does not guarantee safety, eliminate risk, or provide financial advice. Always do your own research before transacting.
```

---

## 6a · GitHub repository URL

```
https://github.com/taker007/crypto-guardian
```

## 6b · npm package URL

```
https://www.npmjs.com/package/@taker007/crypto-guardian-snap
```

---

## 7 · Snap version number to be allowlisted

```
1.1.3
```

*Verified internally consistent: `snap.manifest.json`, `package.json`,
and the published npm tarball all agree on 1.1.3. Shasum matches per
mm-snap validation.*

---

## 8 · Snap auditor + audit report

```
N/A — Crypto Guardian does not use any key-management API method requiring an audit (no snap_getBip32Entropy, snap_getBip32PublicKey, snap_getBip44Entropy, snap_getEntropy, or snap_manageAccounts).
```

*If the form has a separate URL field, leave it blank.*

---

## 9 · Customer support details

Pick the field labels MetaMask shows and paste the matching value. The
escalation contact is kept confidential within MetaMask; the rest are
made public on the listing.

### Public support items (at least one required, more = better)

**Public support email:**
```
support@cryptoguardians.io
```

**Public support page URL:**
```
https://cryptoguardians.io/support
```

**GitHub issues URL:**
```
https://github.com/taker007/crypto-guardian/issues
```

### Escalation contact (confidential — only MetaMask sees it)

**Escalation email:** `[FILL IN — your direct ops/maintainer email, not the public support@. MetaMask uses this only for severity-1 issues.]`

---

## 10 · Images / screenshots

Upload the 5 PNGs from:

```
/home/tjones/crypto-guardian/packages/snap/assets/store/
  crypto-guardians-screenshot-1.png
  crypto-guardians-screenshot-2.png
  crypto-guardians-screenshot-3.png
  crypto-guardians-screenshot-4.png
  crypto-guardians-screenshot-5.png
```

*Note: these screenshots are from February 2026 (Snap v1.0 era). They
demonstrate the core advisory flow but don't show the v1.1.3
`onTransaction` confirmation panel that the new permissions enable.
The form lets you re-upload later via the Update form
(https://go.metamask.io/snaps-directory-update-request) — so you can
ship now with these and refresh post-approval if the review surfaces
that as feedback.*

---

## 11 · Demo video

`[FILL IN — see the "What you'll need to make" section below if you
haven't recorded one yet.]`

**What MetaMask expects:** a 60–120 second walkthrough showing:
1. Installing Crypto Guardian (in Flask, before allowlisting — show the install dialog with the 4 permissions)
2. Initiating an Ethereum transaction (e.g. a small ERC-20 transfer)
3. The `onTransaction` insight panel appearing with risk content
4. Dismissing or proceeding — emphasize that the Snap does NOT block

**Recommended tools:** OBS / Loom / QuickTime screen-record + macOS or
Windows Game Bar audio. Upload to YouTube as "unlisted" or use a
shareable Loom link.

---

## After you submit

| What | When |
|---|---|
| Confirmation email | Within minutes (Typeform → Consensys queue) |
| First reviewer touch | Typically 5–10 business days |
| Approval decision | 1–4 weeks total (depends on review queue + any clarifications) |
| Public on snaps.metamask.io | Within 24 hours of allowlist merge |

If MetaMask asks for clarifications, the most common asks for snaps
like Crypto Guardian are:
1. Clearer permission justifications — already covered in the long
   description above
2. A refreshed screenshot showing the `onTransaction` panel — see note
   under field 10
3. A demo video — see field 11

---

## What's reserved for follow-up (don't submit with these unset)

- **Demo video** — field 11. Single biggest blocker if missing.
- **Escalation email** — field 9 confidential contact. Required.

Everything else above is final paste-ready text.

# 🛡️ Crypto Guardian

**MetaMask Snap for Transaction Security Analysis**

Crypto Guardian intercepts Ethereum transactions before signing and displays a security analysis popup, helping users make informed decisions about their transactions.

## Features

- 🔍 **Transaction Interception**: Analyzes every transaction before you sign
- ⚠️ **Risk Assessment**: Provides risk level (LOW/MEDIUM/HIGH) with score
- 📊 **API-Powered Analysis**: Calls security API for real-time risk assessment
- 🛡️ **Security Alerts**: Clear popup with transaction details and warnings
- 🔌 **Offline Safe**: Shows explicit warning when security server is unreachable

## Quick Start

### Prerequisites

- Node.js 18+
- npm or Yarn
- MetaMask Flask (for Snap development)

### Installation

```bash
# Clone the repository
git clone https://github.com/cryptoguardian/snap.git
cd crypto-guardian

# Install dependencies
npm install

# Build the Snap
npm run build
```

### Running All Services

```bash
# Terminal 1 - API Server (port 4004)
cd packages/api
source venv/bin/activate
python server.py

# Terminal 2 - Snap Server (port 5004)
npm run start

# Terminal 3 - Test dApp (port 3007)
cd packages/snap/test-dapp
python3 -m http.server 3007 --bind 0.0.0.0
```

### Local Development

1. **Start all three servers** (see above)

2. **SSH tunnel** (if accessing remotely):
   ```bash
   ssh -L 4004:localhost:4004 -L 5004:localhost:5004 -L 3007:localhost:3007 user@server
   ```

3. **Open test dApp**: `http://localhost:3007`

4. **Connect & Install**:
   - Connect MetaMask Flask wallet
   - Install the Crypto Guardian snap
   - Send a test transaction

## Offline / Server Unreachable Behavior

Crypto Guardian is designed to **never be silent**. If the security API cannot be reached, users see an explicit warning:

### When API is Available
- Shows: **🛡️ Crypto Guardian Alert**
- Risk Level: HIGH/MEDIUM/LOW (from API)
- Risk Score: 0-100 (from API)
- Findings list from security analysis

### When API is Unreachable
- Shows: **⚠️ Crypto Guardian Warning**
- Clear message: "We couldn't reach the security server right now."
- Statement: "This transaction was NOT analyzed."
- Warning: "Proceed only if you trust this transaction."
- Risk Level: **UNKNOWN**
- Risk Score: **N/A**
- Findings:
  - "No risk analysis available (offline/server unreachable)"
  - "Treat this transaction as unverified"

### Timeout & Retry Logic
- **Hard timeout**: 1.5 seconds total
- **Retry**: 1 automatic retry after 250ms delay
- **Failure cases handled**:
  - Network unreachable / DNS failure
  - API server down
  - Non-2xx HTTP response
  - Invalid JSON response
  - Timeout exceeded

**Important**: The snap will NEVER show a false "LOW" or "SAFE" rating on failure. Failures are always explicitly shown as UNKNOWN.

## Free vs Pro Scan Limits

Crypto Guardian uses a server-side entitlement system to manage scan access.

### Entitlement States

| Status | Scans | Duration | Notes |
|--------|-------|----------|-------|
| **FREE** | 5/day | Unlimited | Default for new wallets |
| **PRO_TRIAL** | Unlimited | 7 days | No credit card required |
| **PRO_PAID** | Unlimited | Forever | Paid subscription |
| **BLOCKED** | 0 | - | Abuse prevention |

### Rate Limits (FREE users)

- **Daily limit**: 5 scans per rolling 24 hours
- **Burst protection**: 1 scan every 10 seconds

### API Responses

**Scan allowed:**
```json
{
  "status": "OK",
  "entitlement": "FREE",
  "remaining_scans": 4,
  "riskLevel": "HIGH",
  "riskScore": 87
}
```

**Limit reached:**
```json
{
  "status": "LIMIT_REACHED",
  "entitlement": "FREE",
  "message": "Free scan limit reached (5/day). Upgrade to Pro for unlimited protection."
}
```

**Blocked:**
```json
{
  "status": "BLOCKED",
  "message": "This wallet is temporarily restricted due to abuse."
}
```

### Admin Endpoints (Testing)

```bash
# Get wallet info
curl http://localhost:4004/admin/wallet/0xYOUR_WALLET

# Set entitlement (FREE, PRO_TRIAL, PRO_PAID, BLOCKED)
curl -X POST http://localhost:4004/admin/wallet/0xWALLET/entitlement \
  -H "Content-Type: application/json" \
  -d '{"status": "PRO_TRIAL"}'

# Reset wallet (back to FREE, 0 scans)
curl -X POST http://localhost:4004/admin/wallet/0xWALLET/reset
```

## Starting a Pro Trial

Users can activate a 7-day Pro trial with unlimited scans. The process uses wallet signature verification to prove ownership.

### Trial Activation Flow

1. **Connect Wallet**: User connects MetaMask to the trial page
2. **Get Challenge**: Server generates a unique challenge string
3. **Sign Message**: User signs the challenge with their wallet
4. **Verify & Activate**: Server verifies signature and activates trial

### Using the Trial Page

1. Open `http://localhost:4004/trial.html` in your browser
2. Click "Connect Wallet" and approve in MetaMask
3. Click "Start 7-Day Pro Trial"
4. Sign the verification message in MetaMask
5. Trial activates immediately

### Trial API Endpoints

**Check trial eligibility:**
```bash
curl -X POST http://localhost:4004/api/trial-status \
  -H "Content-Type: application/json" \
  -d '{"wallet": "0xYOUR_WALLET"}'
```

Response:
```json
{
  "wallet": "0x...",
  "entitlement": "FREE",
  "trial_used": false,
  "can_start_trial": true
}
```

**Get signature challenge:**
```bash
curl -X POST http://localhost:4004/api/challenge \
  -H "Content-Type: application/json" \
  -d '{"wallet": "0xYOUR_WALLET"}'
```

Response:
```json
{
  "challenge": "abc123...",
  "message": "Crypto Guardian Trial Activation\n\nChallenge: abc123...",
  "expires_in": 300
}
```

**Start trial (requires valid signature):**
```bash
curl -X POST http://localhost:4004/api/start-trial \
  -H "Content-Type: application/json" \
  -d '{"wallet": "0x...", "challenge": "abc123...", "signature": "0x..."}'
```

### Trial Rules

| Scenario | Behavior |
|----------|----------|
| New wallet | Can start trial |
| Trial active | Shows days remaining |
| Trial expired | Cannot restart (one per wallet) |
| Already PRO_PAID | No trial needed |
| BLOCKED wallet | Cannot start trial |

### Trial Testing Checklist

1. FREE wallet → hit limit → start trial → becomes PRO_TRIAL
2. PRO_TRIAL → unlimited scans, no rate limits
3. Trial expires → auto-reverts to FREE
4. Repeat trial attempt → denied with message
5. BLOCKED wallet → cannot start trial

## Upgrading to Pro (Payments)

Users can upgrade to PRO_PAID using Stripe Checkout for unlimited permanent access.

### Pricing

| Plan | Price | Billing |
|------|-------|---------|
| Monthly | $9/month | Recurring subscription |
| Annual | $90/year | One-time payment |

### Stripe Setup

1. **Create Stripe account** at https://dashboard.stripe.com

2. **Create products** in Stripe Dashboard:
   - Product: "Crypto Guardian Pro Monthly" → Price: $9/month (recurring)
   - Product: "Crypto Guardian Pro Annual" → Price: $90 (one-time)

3. **Get your keys** from Stripe Dashboard → Developers → API Keys

4. **Set environment variables**:
```bash
export STRIPE_SECRET_KEY="sk_test_..."
export STRIPE_WEBHOOK_SECRET="whsec_..."
export STRIPE_PRICE_MONTHLY="price_..."
export STRIPE_PRICE_ANNUAL="price_..."
```

5. **Configure webhook** in Stripe Dashboard:
   - Endpoint URL: `https://your-domain.com/api/webhook/stripe`
   - Events to listen: `checkout.session.completed`

### Payment Flow

1. **User selects plan** on trial page
2. **Signs message** to verify wallet ownership
3. **Redirected to Stripe Checkout** (hosted by Stripe)
4. **Completes payment** with credit card
5. **Stripe sends webhook** to server
6. **Server upgrades wallet** to PRO_PAID

### Payment API Endpoints

**Create checkout session:**
```bash
curl -X POST http://localhost:4004/api/create-checkout-session \
  -H "Content-Type: application/json" \
  -d '{
    "wallet": "0xYOUR_WALLET",
    "plan": "monthly",
    "challenge": "...",
    "signature": "0x..."
  }'
```

Response:
```json
{
  "checkout_url": "https://checkout.stripe.com/...",
  "session_id": "cs_..."
}
```

**Get pricing info:**
```bash
curl http://localhost:4004/api/pricing
```

### Security

- All payments processed by Stripe (PCI compliant)
- Server only trusts Stripe webhooks, never client
- Webhook signatures verified using STRIPE_WEBHOOK_SECRET
- Wallet ownership verified via signature before checkout
- Duplicate webhooks handled idempotently

### Payment Testing Checklist

1. Monthly upgrade → PRO_PAID, subscription active
2. Annual upgrade → PRO_PAID, one-time payment
3. Trial user converts → PRO_PAID immediately
4. Invalid webhook signature → rejected
5. Duplicate webhook → handled idempotently (no duplicate upgrades)

### Testing with Stripe CLI

For local development, use Stripe CLI to forward webhooks:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:4004/api/webhook/stripe

# Copy the webhook secret and set it:
export STRIPE_WEBHOOK_SECRET="whsec_..."
```

Test cards for Stripe test mode:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`

## Testing

```bash
# Run snap tests
npm test

# Run API entitlement tests
cd packages/api
python test_entitlements.py
```

### Manual Testing Checklist

1. **API Running** → Should show "HIGH" risk, score 87/100
2. **Stop API Server** → Should show fallback warning with UNKNOWN
3. **Restart API Server** → Should show "HIGH" again

### Entitlement Testing Checklist

1. **New wallet** → FREE, 5 remaining scans
2. **5 scans used** → LIMIT_REACHED on 6th scan
3. **Set PRO_TRIAL** → Unlimited scans
4. **Trial expires** → Reverts to FREE

## Project Structure

```
crypto-guardian/
├── packages/
│   ├── api/
│   │   ├── server.py           # Security scan API (Flask)
│   │   ├── entitlements.py     # Entitlement & rate limiting
│   │   ├── entitlements.json   # Wallet data storage
│   │   ├── test_entitlements.py # Entitlement tests
│   │   ├── requirements.txt
│   │   ├── static/
│   │   │   ├── trial.html          # Pro trial activation page
│   │   │   └── payment-success.html # Payment success page
│   │   └── venv/
│   └── snap/
│       ├── src/
│       │   └── index.ts        # Main Snap entry point
│       ├── test/
│       │   └── index.test.ts   # Snap tests
│       ├── test-dapp/
│       │   └── index.html      # Browser test interface
│       ├── snap.manifest.json  # Snap permissions & metadata
│       ├── snap.config.ts      # Build configuration
│       └── package.json
├── package.json                # Root workspace config
└── README.md
```

## How It Works

When a transaction is initiated:

1. MetaMask calls the `onTransaction` handler
2. Crypto Guardian calls the security API with transaction data
3. If API responds within 1.5 seconds:
   - Shows risk level, score, and findings from API
4. If API fails/times out:
   - Shows explicit fallback warning
   - Risk Level: UNKNOWN, Score: N/A
   - User is warned transaction was NOT analyzed
5. User can **Continue** or **Cancel**

## MVP Roadmap

- [x] **Step 1**: Transaction interception with popup
- [x] **Step 2A**: External API integration (fake API)
- [x] **Step 2B**: Offline/fallback handling
- [x] **Step 6**: Entitlement + rate limiting
- [x] **Step 7A**: Pro Trial activation with wallet signature
- [x] **Step 7B**: Stripe payment integration
- [ ] **Step 3**: Real security API integration
- [ ] **Step 4**: Address reputation checking
- [ ] **Step 5**: Contract verification

## Permissions

This Snap requires:

| Permission | Purpose |
|------------|---------|
| `endowment:transaction-insight` | Access transaction data before signing |
| `endowment:network-access` | Call external security API |
| `snap_dialog` | Display security alert popup |

## Port Assignments

| Service | Port | Description |
|---------|------|-------------|
| API Server | 4004 | Security scan API |
| Snap Server | 5004 | MetaMask Snap dev server |
| Test dApp | 3007 | Browser test interface |

## Building for Production

```bash
# Clean build
npm run build:clean

# The distributable files are in packages/snap/dist/
```

## License

MIT License - See [LICENSE](LICENSE) for details.

---

**Built for the MetaMask Snaps ecosystem** 🦊

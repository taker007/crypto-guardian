#!/usr/bin/env python3
"""
Crypto Guardian - Security Scan API
Step 7B: Stripe Integration for Pro Paid

Endpoints:
- POST /scan - Security scan with entitlement checking
- POST /api/challenge - Get challenge for wallet signature
- POST /api/start-trial - Start 7-day Pro trial (requires signature)
- POST /api/create-checkout-session - Create Stripe checkout session
- POST /api/webhook/stripe - Handle Stripe webhooks
- GET /health - Health check

Port: 4004
"""

import os
import secrets
import time
import stripe
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from eth_account.messages import encode_defunct
from web3 import Web3

from entitlements import entitlement_manager, EntitlementStatus, TRIAL_DURATION_DAYS

# Stripe configuration
STRIPE_SECRET_KEY = os.environ.get('STRIPE_SECRET_KEY', '')
STRIPE_WEBHOOK_SECRET = os.environ.get('STRIPE_WEBHOOK_SECRET', '')
STRIPE_SUCCESS_URL = os.environ.get('STRIPE_SUCCESS_URL', 'http://localhost:4004/payment-success.html')
STRIPE_CANCEL_URL = os.environ.get('STRIPE_CANCEL_URL', 'http://localhost:4004/trial.html')

# Price IDs (set these after creating products in Stripe dashboard)
STRIPE_PRICE_MONTHLY = os.environ.get('STRIPE_PRICE_MONTHLY', '')
STRIPE_PRICE_ANNUAL = os.environ.get('STRIPE_PRICE_ANNUAL', '')

# Initialize Stripe
stripe.api_key = STRIPE_SECRET_KEY

# Pricing (for display, actual prices in Stripe)
PRICING = {
    'monthly': {'amount': 900, 'currency': 'usd', 'display': '$9/month'},
    'annual': {'amount': 9000, 'currency': 'usd', 'display': '$90/year'}
}

app = Flask(__name__, static_folder='static')
CORS(app)

# Challenge storage (in production, use Redis with TTL)
# Format: { challenge: { wallet: str, created_at: float } }
pending_challenges: dict = {}
CHALLENGE_EXPIRY_SECONDS = 300  # 5 minutes


def get_risk_analysis():
    """Demo risk analysis (hardcoded response)."""
    return {
        "riskLevel": "HIGH",
        "riskScore": 87,
        "summary": "Demo warning: suspicious transaction",
        "findings": [
            "Unusual gas usage",
            "Contract interaction detected"
        ]
    }


def cleanup_expired_challenges():
    """Remove expired challenges."""
    now = time.time()
    expired = [c for c, data in pending_challenges.items()
               if now - data['created_at'] > CHALLENGE_EXPIRY_SECONDS]
    for c in expired:
        del pending_challenges[c]


def verify_signature(wallet: str, challenge: str, signature: str) -> bool:
    """Verify that the signature was created by the wallet."""
    try:
        # Create the message that was signed
        message = encode_defunct(text=f"Crypto Guardian Trial Activation\n\nChallenge: {challenge}")

        # Recover the address from signature
        w3 = Web3()
        recovered_address = w3.eth.account.recover_message(message, signature=signature)

        # Compare addresses (case-insensitive)
        return recovered_address.lower() == wallet.lower()
    except Exception as e:
        print(f"[VERIFY] Signature verification failed: {e}")
        return False


# ============== Scan Endpoint ==============

@app.route('/scan', methods=['POST'])
def scan_transaction():
    """Security scan endpoint with entitlement checking."""
    data = request.get_json() or {}
    wallet_address = data.get('wallet') or data.get('from') or data.get('to') or 'unknown'

    if wallet_address in ('unknown', ''):
        wallet_address = '0xDEMO000000000000000000000000000000000000'

    print(f"[SCAN] Wallet: {wallet_address[:10]}...")

    permission = entitlement_manager.check_scan_permission(wallet_address)

    if not permission['allowed']:
        print(f"[SCAN] Denied: {permission['status']}")
        # Add trial_url for LIMIT_REACHED
        if permission['status'] == 'LIMIT_REACHED':
            permission['trial_url'] = '/trial.html'
        return jsonify(permission), 429 if permission['status'] == 'RATE_LIMITED' else 403

    entitlement_manager.record_scan(wallet_address)
    risk = get_risk_analysis()

    response = {
        "status": "OK",
        "entitlement": permission['entitlement'],
        "remaining_scans": permission.get('remaining_scans'),
        **risk
    }

    if 'trial_days_remaining' in permission:
        response['trial_days_remaining'] = permission['trial_days_remaining']

    print(f"[SCAN] OK: {permission['entitlement']}")
    return jsonify(response)


# ============== Trial Activation Endpoints ==============

@app.route('/api/challenge', methods=['POST'])
def get_challenge():
    """
    Generate a challenge for wallet signature verification.

    Request: { "wallet": "0x..." }
    Response: { "challenge": "random-string" }
    """
    cleanup_expired_challenges()

    data = request.get_json() or {}
    wallet = data.get('wallet', '').lower()

    if not wallet or not wallet.startswith('0x') or len(wallet) != 42:
        return jsonify({"error": "Invalid wallet address"}), 400

    # Generate random challenge
    challenge = secrets.token_hex(16)

    # Store challenge with wallet
    pending_challenges[challenge] = {
        'wallet': wallet,
        'created_at': time.time()
    }

    print(f"[CHALLENGE] Generated for {wallet[:10]}...")
    return jsonify({
        "challenge": challenge,
        "message": f"Crypto Guardian Trial Activation\n\nChallenge: {challenge}",
        "expires_in": CHALLENGE_EXPIRY_SECONDS
    })


@app.route('/api/start-trial', methods=['POST'])
def start_trial():
    """
    Start a 7-day Pro trial after verifying wallet ownership.

    Request: {
        "wallet": "0x...",
        "challenge": "...",
        "signature": "0x..."
    }

    Response (success): {
        "status": "TRIAL_STARTED",
        "entitlement": "PRO_TRIAL",
        "trial_expires_at": timestamp
    }
    """
    cleanup_expired_challenges()

    data = request.get_json() or {}
    wallet = data.get('wallet', '').lower()
    challenge = data.get('challenge', '')
    signature = data.get('signature', '')

    # Validate inputs
    if not wallet or not wallet.startswith('0x'):
        return jsonify({"error": "Invalid wallet address"}), 400

    if not challenge or not signature:
        return jsonify({"error": "Challenge and signature required"}), 400

    # Verify challenge exists and matches wallet
    if challenge not in pending_challenges:
        return jsonify({"error": "Invalid or expired challenge"}), 400

    challenge_data = pending_challenges[challenge]
    if challenge_data['wallet'] != wallet:
        return jsonify({"error": "Challenge does not match wallet"}), 400

    # Verify signature
    if not verify_signature(wallet, challenge, signature):
        return jsonify({"error": "Invalid signature"}), 401

    # Remove used challenge
    del pending_challenges[challenge]

    # Start the trial
    result = entitlement_manager.start_trial(wallet)

    print(f"[TRIAL] {wallet[:10]}... -> {result['status']}")

    if result['success']:
        return jsonify(result)
    else:
        return jsonify(result), 400 if result['status'] != 'BLOCKED' else 403


@app.route('/api/trial-status', methods=['POST'])
def trial_status():
    """Check trial eligibility for a wallet."""
    data = request.get_json() or {}
    wallet = data.get('wallet', '').lower()

    if not wallet:
        return jsonify({"error": "Wallet required"}), 400

    info = entitlement_manager.get_wallet_info(wallet)

    response = {
        "wallet": wallet,
        "entitlement": info['entitlement_status'],
        "trial_used": info.get('trial_used', False),
        "can_start_trial": (
            info['entitlement_status'] == 'FREE' and
            not info.get('trial_used', False)
        )
    }

    if info['entitlement_status'] == 'PRO_TRIAL' and info.get('trial_start_timestamp'):
        trial_end = info['trial_start_timestamp'] + (TRIAL_DURATION_DAYS * 24 * 60 * 60)
        response['trial_expires_at'] = trial_end
        response['trial_days_remaining'] = max(0, int((trial_end - time.time()) / (24 * 60 * 60)))

    return jsonify(response)


# ============== Stripe Payment Endpoints ==============

@app.route('/api/create-checkout-session', methods=['POST'])
def create_checkout_session():
    """
    Create a Stripe Checkout session for Pro upgrade.

    Request: {
        "wallet": "0x...",
        "plan": "monthly" | "annual",
        "challenge": "...",
        "signature": "0x..."
    }

    Response: {
        "checkout_url": "https://checkout.stripe.com/..."
    }
    """
    # Check Stripe configuration
    if not STRIPE_SECRET_KEY:
        return jsonify({"error": "Stripe not configured"}), 503

    data = request.get_json() or {}
    wallet = data.get('wallet', '').lower()
    plan = data.get('plan', '').lower()
    challenge = data.get('challenge', '')
    signature = data.get('signature', '')

    # Validate inputs
    if not wallet or not wallet.startswith('0x') or len(wallet) != 42:
        return jsonify({"error": "Invalid wallet address"}), 400

    if plan not in ('monthly', 'annual'):
        return jsonify({"error": "Invalid plan. Use 'monthly' or 'annual'"}), 400

    if not challenge or not signature:
        return jsonify({"error": "Challenge and signature required for verification"}), 400

    # Verify challenge exists and matches wallet
    if challenge not in pending_challenges:
        return jsonify({"error": "Invalid or expired challenge"}), 400

    challenge_data = pending_challenges[challenge]
    if challenge_data['wallet'] != wallet:
        return jsonify({"error": "Challenge does not match wallet"}), 400

    # Verify signature
    if not verify_signature(wallet, challenge, signature):
        return jsonify({"error": "Invalid signature"}), 401

    # Remove used challenge
    del pending_challenges[challenge]

    # Check if wallet is blocked
    info = entitlement_manager.get_wallet_info(wallet)
    if info['entitlement_status'] == EntitlementStatus.BLOCKED.value:
        return jsonify({"error": "This wallet is blocked and cannot upgrade"}), 403

    # Already PRO_PAID
    if info['entitlement_status'] == EntitlementStatus.PRO_PAID.value:
        return jsonify({
            "error": "Already Pro",
            "message": "This wallet already has Pro access."
        }), 400

    # Get price ID
    price_id = STRIPE_PRICE_MONTHLY if plan == 'monthly' else STRIPE_PRICE_ANNUAL
    if not price_id:
        return jsonify({"error": f"Price ID not configured for {plan} plan"}), 503

    try:
        # Create Stripe Checkout Session
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price': price_id,
                'quantity': 1,
            }],
            mode='subscription' if plan == 'monthly' else 'payment',
            success_url=STRIPE_SUCCESS_URL + '?session_id={CHECKOUT_SESSION_ID}',
            cancel_url=STRIPE_CANCEL_URL,
            metadata={
                'wallet_address': wallet,
                'plan': plan
            },
            client_reference_id=wallet
        )

        print(f"[STRIPE] Checkout session created for {wallet[:10]}... plan={plan}")
        return jsonify({
            "checkout_url": session.url,
            "session_id": session.id
        })

    except stripe.error.StripeError as e:
        print(f"[STRIPE] Error creating session: {e}")
        return jsonify({"error": "Payment service error"}), 503


@app.route('/api/webhook/stripe', methods=['POST'])
def stripe_webhook():
    """
    Handle Stripe webhook events.
    Verifies webhook signature and processes checkout.session.completed events.
    """
    payload = request.get_data(as_text=True)
    sig_header = request.headers.get('Stripe-Signature', '')

    # Verify webhook signature
    if STRIPE_WEBHOOK_SECRET:
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, STRIPE_WEBHOOK_SECRET
            )
        except ValueError:
            print("[WEBHOOK] Invalid payload")
            return jsonify({"error": "Invalid payload"}), 400
        except stripe.error.SignatureVerificationError:
            print("[WEBHOOK] Invalid signature")
            return jsonify({"error": "Invalid signature"}), 401
    else:
        # No webhook secret configured - parse without verification (dev only)
        import json
        try:
            event = json.loads(payload)
            print("[WEBHOOK] WARNING: No webhook secret configured, skipping signature verification")
        except json.JSONDecodeError:
            return jsonify({"error": "Invalid JSON"}), 400

    # Handle the event
    event_type = event.get('type', '')
    print(f"[WEBHOOK] Received event: {event_type}")

    if event_type == 'checkout.session.completed':
        session = event['data']['object']
        return handle_checkout_completed(session)

    # Acknowledge other events
    return jsonify({"received": True})


def handle_checkout_completed(session):
    """Process a completed checkout session."""
    session_id = session.get('id', '')
    metadata = session.get('metadata', {})
    wallet = metadata.get('wallet_address', '').lower()
    plan = metadata.get('plan', '')
    customer_id = session.get('customer', '')
    subscription_id = session.get('subscription')

    if not wallet:
        print(f"[WEBHOOK] No wallet in session metadata: {session_id}")
        return jsonify({"error": "No wallet in metadata"}), 400

    # Check for duplicate processing (idempotency)
    if entitlement_manager.is_session_processed(session_id):
        print(f"[WEBHOOK] Session already processed: {session_id}")
        return jsonify({"status": "already_processed"})

    # Upgrade the wallet
    result = entitlement_manager.upgrade_to_paid(
        wallet_address=wallet,
        stripe_customer_id=customer_id,
        stripe_session_id=session_id,
        plan=plan,
        stripe_subscription_id=subscription_id
    )

    if result['success']:
        print(f"[WEBHOOK] Upgraded {wallet[:10]}... to PRO_PAID ({plan})")
        return jsonify({"status": "upgraded", "wallet": wallet})
    else:
        print(f"[WEBHOOK] Failed to upgrade {wallet[:10]}...: {result['message']}")
        return jsonify({"error": result['message']}), 400


@app.route('/api/pricing', methods=['GET'])
def get_pricing():
    """Return pricing information."""
    return jsonify({
        "monthly": PRICING['monthly'],
        "annual": PRICING['annual'],
        "stripe_configured": bool(STRIPE_SECRET_KEY and STRIPE_PRICE_MONTHLY and STRIPE_PRICE_ANNUAL)
    })


# ============== Static Files ==============

@app.route('/trial.html')
def trial_page():
    """Serve the trial activation page."""
    return send_from_directory('static', 'trial.html')


@app.route('/payment-success.html')
def payment_success_page():
    """Serve the payment success page."""
    return send_from_directory('static', 'payment-success.html')


# ============== Health & Admin ==============

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "ok", "service": "crypto-guardian-api"})


@app.route('/admin/wallet/<wallet_address>', methods=['GET'])
def get_wallet_info(wallet_address):
    info = entitlement_manager.get_wallet_info(wallet_address)
    return jsonify(info)


@app.route('/admin/wallet/<wallet_address>/entitlement', methods=['POST'])
def set_wallet_entitlement(wallet_address):
    data = request.get_json() or {}
    status_str = data.get('status', '').upper()
    try:
        status = EntitlementStatus(status_str)
    except ValueError:
        return jsonify({"error": f"Invalid status"}), 400
    record = entitlement_manager.set_entitlement(wallet_address, status)
    return jsonify({"message": f"Set to {status.value}", "wallet": record.to_dict()})


@app.route('/admin/wallet/<wallet_address>/reset', methods=['POST'])
def reset_wallet(wallet_address):
    entitlement_manager.reset_wallet(wallet_address)
    return jsonify({"message": f"Wallet reset"})


if __name__ == '__main__':
    print("=" * 60)
    print("🛡️  Crypto Guardian - Security Scan API")
    print("=" * 60)
    print("Endpoints:")
    print("  POST /scan                      - Security scan")
    print("  POST /api/challenge             - Get signature challenge")
    print("  POST /api/start-trial           - Start Pro trial")
    print("  POST /api/trial-status          - Check trial eligibility")
    print("  POST /api/create-checkout-session - Create Stripe checkout")
    print("  POST /api/webhook/stripe        - Stripe webhook")
    print("  GET  /api/pricing               - Get pricing info")
    print("  GET  /trial.html                - Trial activation page")
    print("  GET  /health                    - Health check")
    print("=" * 60)
    print("Stripe Configuration:")
    print(f"  Secret Key: {'✓ Set' if STRIPE_SECRET_KEY else '✗ Not set'}")
    print(f"  Webhook Secret: {'✓ Set' if STRIPE_WEBHOOK_SECRET else '✗ Not set'}")
    print(f"  Monthly Price ID: {'✓ Set' if STRIPE_PRICE_MONTHLY else '✗ Not set'}")
    print(f"  Annual Price ID: {'✓ Set' if STRIPE_PRICE_ANNUAL else '✗ Not set'}")
    print("=" * 60)
    app.run(host='0.0.0.0', port=4004, debug=True)

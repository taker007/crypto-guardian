#!/usr/bin/env python3
"""
Crypto Guardian - Step 7B Stripe Integration Tests
Comprehensive test suite for payment functionality.
"""

import json
import requests
import time
import sys

API_BASE = "http://127.0.0.1:4004"

# Test counters
passed = 0
failed = 0
tests_run = []

# Properly formatted wallet addresses (42 chars: 0x + 40 hex)
WALLET_1 = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa0001"
WALLET_2 = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa0002"
WALLET_3 = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa0003"
WALLET_4 = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa0004"
WALLET_5 = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa0005"
WALLET_6 = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa0006"
WALLET_7 = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa0007"

def test(name, condition, details=""):
    global passed, failed
    if condition:
        passed += 1
        print(f"  ✓ {name}")
        tests_run.append((name, True, details))
    else:
        failed += 1
        print(f"  ✗ {name}")
        if details:
            print(f"    Details: {details}")
        tests_run.append((name, False, details))

def reset_wallet(wallet):
    """Reset a wallet to default state."""
    requests.post(f"{API_BASE}/admin/wallet/{wallet}/reset")

def set_entitlement(wallet, status):
    """Set wallet entitlement."""
    return requests.post(
        f"{API_BASE}/admin/wallet/{wallet}/entitlement",
        json={"status": status}
    ).json()

def get_wallet(wallet):
    """Get wallet info."""
    return requests.get(f"{API_BASE}/admin/wallet/{wallet}").json()

def get_challenge(wallet):
    """Get a signature challenge."""
    return requests.post(
        f"{API_BASE}/api/challenge",
        json={"wallet": wallet}
    ).json()

def simulate_webhook(session_id, wallet, plan, customer_id="cus_test", subscription_id=None):
    """Simulate a Stripe webhook for checkout.session.completed."""
    payload = {
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "id": session_id,
                "metadata": {
                    "wallet_address": wallet,
                    "plan": plan
                },
                "customer": customer_id,
                "subscription": subscription_id
            }
        }
    }
    return requests.post(
        f"{API_BASE}/api/webhook/stripe",
        json=payload
    )

print("=" * 60)
print("🛡️  Crypto Guardian - Step 7B Stripe Integration Tests")
print("=" * 60)

# ============== Test 1: Pricing Endpoint ==============
print("\n📋 Test 1: Pricing Endpoint")
resp = requests.get(f"{API_BASE}/api/pricing")
data = resp.json()
test("Returns 200 OK", resp.status_code == 200)
test("Has monthly pricing", "monthly" in data and data["monthly"]["amount"] == 900)
test("Has annual pricing", "annual" in data and data["annual"]["amount"] == 9000)
test("Shows stripe_configured status", "stripe_configured" in data)
test("Stripe not configured (expected)", data.get("stripe_configured") == False)

# ============== Test 2: Create Checkout - Stripe Not Configured ==============
print("\n📋 Test 2: Create Checkout (Stripe Not Configured)")
# Note: Stripe config check happens first, before input validation
resp = requests.post(
    f"{API_BASE}/api/create-checkout-session",
    json={"wallet": WALLET_1, "plan": "monthly", "challenge": "x", "signature": "0x"}
)
test("Returns 503 when Stripe not configured", resp.status_code == 503)
test("Error message correct", resp.json().get("error") == "Stripe not configured")

# ============== Test 3: Webhook - FREE to PRO_PAID ==============
print("\n📋 Test 3: Webhook - FREE to PRO_PAID")
reset_wallet(WALLET_1)

info = get_wallet(WALLET_1)
test("Wallet starts as FREE", info["entitlement_status"] == "FREE")

resp = simulate_webhook("cs_free_to_paid_001", WALLET_1, "monthly")
test("Webhook returns 200", resp.status_code == 200)
test("Status is upgraded", resp.json().get("status") == "upgraded")

info = get_wallet(WALLET_1)
test("Wallet is now PRO_PAID", info["entitlement_status"] == "PRO_PAID")
test("Stripe customer ID stored", info["stripe_customer_id"] == "cus_test")
test("Stripe session ID stored", info["stripe_session_id"] == "cs_free_to_paid_001")
test("Plan stored as monthly", info["paid_plan"] == "monthly")
test("paid_at timestamp set", info["paid_at"] is not None)

# ============== Test 4: Webhook - PRO_TRIAL to PRO_PAID ==============
print("\n📋 Test 4: Webhook - PRO_TRIAL to PRO_PAID")
reset_wallet(WALLET_2)
set_entitlement(WALLET_2, "PRO_TRIAL")

info = get_wallet(WALLET_2)
test("Wallet starts as PRO_TRIAL", info["entitlement_status"] == "PRO_TRIAL")

resp = simulate_webhook("cs_trial_to_paid_001", WALLET_2, "annual", "cus_trial")
test("Webhook returns 200", resp.status_code == 200)
test("Status is upgraded", resp.json().get("status") == "upgraded")

info = get_wallet(WALLET_2)
test("Wallet is now PRO_PAID", info["entitlement_status"] == "PRO_PAID")
test("Plan stored as annual", info["paid_plan"] == "annual")

# ============== Test 5: Webhook - Idempotency (Duplicate Webhook) ==============
print("\n📋 Test 5: Webhook - Idempotency (Duplicate)")
# Send the same webhook again
resp = simulate_webhook("cs_trial_to_paid_001", WALLET_2, "annual", "cus_trial")
test("Duplicate webhook returns 200", resp.status_code == 200)
test("Status is already_processed", resp.json().get("status") == "already_processed")

# Verify no double-processing
info = get_wallet(WALLET_2)
test("Still PRO_PAID (not corrupted)", info["entitlement_status"] == "PRO_PAID")

# ============== Test 6: Webhook - BLOCKED Cannot Upgrade ==============
print("\n📋 Test 6: Webhook - BLOCKED Cannot Upgrade")
reset_wallet(WALLET_3)
set_entitlement(WALLET_3, "BLOCKED")

info = get_wallet(WALLET_3)
test("Wallet is BLOCKED", info["entitlement_status"] == "BLOCKED")

resp = simulate_webhook("cs_blocked_attempt", WALLET_3, "monthly")
test("Webhook returns 400", resp.status_code == 400)
test("Error mentions blocked", "blocked" in resp.json().get("error", "").lower())

info = get_wallet(WALLET_3)
test("Wallet still BLOCKED", info["entitlement_status"] == "BLOCKED")

# ============== Test 7: Webhook - Already PRO_PAID (Different Session) ==============
print("\n📋 Test 7: Webhook - Already PRO_PAID (Different Session)")
reset_wallet(WALLET_4)

# First upgrade
resp = simulate_webhook("cs_first_payment", WALLET_4, "monthly", "cus_first")
test("First payment succeeds", resp.json().get("status") == "upgraded")

# Different session (not a duplicate, but wallet already paid)
resp = simulate_webhook("cs_second_payment", WALLET_4, "annual", "cus_second")
test("Second payment also succeeds (upgrade)", resp.status_code == 200)

info = get_wallet(WALLET_4)
test("Session ID updated to latest", info["stripe_session_id"] == "cs_second_payment")
test("Plan updated to annual", info["paid_plan"] == "annual")

# ============== Test 8: Webhook - Missing Wallet in Metadata ==============
print("\n📋 Test 8: Webhook - Missing Wallet in Metadata")
payload = {
    "type": "checkout.session.completed",
    "data": {
        "object": {
            "id": "cs_no_wallet",
            "metadata": {"plan": "monthly"},  # No wallet_address
            "customer": "cus_test"
        }
    }
}
resp = requests.post(f"{API_BASE}/api/webhook/stripe", json=payload)
test("Returns 400 for missing wallet", resp.status_code == 400)
test("Error mentions wallet/metadata", "wallet" in resp.json().get("error", "").lower() or "metadata" in resp.json().get("error", "").lower())

# ============== Test 9: Webhook - Other Event Types ==============
print("\n📋 Test 9: Webhook - Other Event Types")
payload = {"type": "customer.created", "data": {"object": {}}}
resp = requests.post(f"{API_BASE}/api/webhook/stripe", json=payload)
test("Other events return 200", resp.status_code == 200)
test("Acknowledges receipt", resp.json().get("received") == True)

# ============== Test 10: Scan Returns Correct Entitlement ==============
print("\n📋 Test 10: Scan Returns Correct Entitlement After Upgrade")
reset_wallet(WALLET_5)

# Scan as FREE
resp = requests.post(f"{API_BASE}/scan", json={"wallet": WALLET_5})
test("FREE scan works", resp.status_code == 200)
test("Shows FREE entitlement", resp.json().get("entitlement") == "FREE")
test("Has remaining_scans", resp.json().get("remaining_scans") is not None)

# Upgrade via webhook
simulate_webhook("cs_scan_test", WALLET_5, "monthly")

# Scan as PRO_PAID
resp = requests.post(f"{API_BASE}/scan", json={"wallet": WALLET_5})
test("PRO_PAID scan works", resp.status_code == 200)
test("Shows PRO_PAID entitlement", resp.json().get("entitlement") == "PRO_PAID")
test("remaining_scans is null (unlimited)", resp.json().get("remaining_scans") is None)

# ============== Test 11: Trial Status API ==============
print("\n📋 Test 11: Trial Status API")
reset_wallet(WALLET_6)

resp = requests.post(f"{API_BASE}/api/trial-status", json={"wallet": WALLET_6})
data = resp.json()
test("Returns wallet info", data.get("wallet") == WALLET_6.lower())
test("Shows FREE entitlement", data.get("entitlement") == "FREE")
test("can_start_trial is true", data.get("can_start_trial") == True)

# Start trial
set_entitlement(WALLET_6, "PRO_TRIAL")
resp = requests.post(f"{API_BASE}/api/trial-status", json={"wallet": WALLET_6})
data = resp.json()
test("Shows PRO_TRIAL", data.get("entitlement") == "PRO_TRIAL")
test("Has trial_days_remaining", "trial_days_remaining" in data)

# Upgrade to PRO_PAID
simulate_webhook("cs_trial_status_test", WALLET_6, "annual")
resp = requests.post(f"{API_BASE}/api/trial-status", json={"wallet": WALLET_6})
data = resp.json()
test("Shows PRO_PAID after upgrade", data.get("entitlement") == "PRO_PAID")

# ============== Test 12: Challenge System Still Works ==============
print("\n📋 Test 12: Challenge System Integration")
reset_wallet(WALLET_7)

resp = requests.post(f"{API_BASE}/api/challenge", json={"wallet": WALLET_7})
test("Challenge endpoint works", resp.status_code == 200, f"Status: {resp.status_code}, Body: {resp.text[:100]}")
data = resp.json()
test("Returns challenge", "challenge" in data)
test("Returns message", "message" in data)
test("Returns expires_in", data.get("expires_in") == 300)

# ============== Test 13: Webhook Invalid JSON ==============
print("\n📋 Test 13: Webhook - Invalid Payloads")
resp = requests.post(
    f"{API_BASE}/api/webhook/stripe",
    data="not json",
    headers={"Content-Type": "application/json"}
)
test("Rejects invalid JSON", resp.status_code == 400)

# ============== Test 14: Subscription ID Stored ==============
print("\n📋 Test 14: Subscription ID Storage")
reset_wallet(WALLET_1)
resp = simulate_webhook("cs_with_sub", WALLET_1, "monthly", "cus_sub", "sub_123456")
test("Webhook with subscription succeeds", resp.status_code == 200)

info = get_wallet(WALLET_1)
test("Subscription ID stored", info["stripe_subscription_id"] == "sub_123456")

# ============== Summary ==============
print("\n" + "=" * 60)
print(f"📊 Test Results: {passed} passed, {failed} failed")
print("=" * 60)

if failed > 0:
    print("\n❌ Failed tests:")
    for name, result, details in tests_run:
        if not result:
            print(f"  - {name}")
            if details:
                print(f"    {details}")
    sys.exit(1)
else:
    print("\n✅ All tests passed!")
    sys.exit(0)

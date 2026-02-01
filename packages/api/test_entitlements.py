#!/usr/bin/env python3
"""
Crypto Guardian - Entitlement System Tests
Step 6: Test rate limiting and entitlements

Run with: python test_entitlements.py
"""

import os
import time
import unittest
import tempfile
from entitlements import (
    EntitlementManager,
    EntitlementStatus,
    DAILY_SCAN_LIMIT_FREE,
    BURST_COOLDOWN_SECONDS,
    TRIAL_DURATION_DAYS
)


class TestEntitlements(unittest.TestCase):
    """Test entitlement and rate limiting logic."""

    def setUp(self):
        """Create a fresh entitlement manager with temp file."""
        self.temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.json')
        self.temp_file.close()
        self.manager = EntitlementManager(data_file=self.temp_file.name)

    def tearDown(self):
        """Clean up temp file."""
        try:
            os.unlink(self.temp_file.name)
        except:
            pass

    def test_new_wallet_is_free(self):
        """New wallets should default to FREE status."""
        wallet = "0xTEST0001"
        record = self.manager.get_wallet(wallet)

        self.assertEqual(record.entitlement_status, EntitlementStatus.FREE.value)
        self.assertEqual(record.scans_today_count, 0)

    def test_free_user_gets_5_scans(self):
        """FREE users should be allowed 5 scans."""
        wallet = "0xTEST0002"

        for i in range(DAILY_SCAN_LIMIT_FREE):
            # Reset burst timer by setting last_scan_timestamp in the past
            record = self.manager.get_wallet(wallet)
            record.last_scan_timestamp = time.time() - BURST_COOLDOWN_SECONDS - 1

            permission = self.manager.check_scan_permission(wallet)
            self.assertTrue(permission['allowed'], f"Scan {i+1} should be allowed")
            self.assertEqual(permission['status'], 'OK')
            self.assertEqual(permission['remaining_scans'], DAILY_SCAN_LIMIT_FREE - i)
            self.manager.record_scan(wallet)

    def test_free_user_hits_limit(self):
        """6th scan for FREE user should be denied."""
        wallet = "0xTEST0003"

        # Use up all 5 scans
        for i in range(DAILY_SCAN_LIMIT_FREE):
            self.manager.record_scan(wallet)

        # Reset burst timer so we test daily limit, not burst limit
        record = self.manager.get_wallet(wallet)
        record.last_scan_timestamp = time.time() - BURST_COOLDOWN_SECONDS - 1

        # 6th scan should be denied
        permission = self.manager.check_scan_permission(wallet)
        self.assertFalse(permission['allowed'])
        self.assertEqual(permission['status'], 'LIMIT_REACHED')
        self.assertIn('Free scan limit reached', permission['message'])

    def test_burst_protection(self):
        """Rapid scans should be rate limited."""
        wallet = "0xTEST0004"

        # First scan OK
        permission = self.manager.check_scan_permission(wallet)
        self.assertTrue(permission['allowed'])
        self.manager.record_scan(wallet)

        # Immediate second scan should be rate limited
        permission = self.manager.check_scan_permission(wallet)
        self.assertFalse(permission['allowed'])
        self.assertEqual(permission['status'], 'RATE_LIMITED')
        self.assertIn('wait', permission['message'].lower())

    def test_pro_trial_unlimited(self):
        """PRO_TRIAL users should have unlimited scans."""
        wallet = "0xTEST0005"

        # Upgrade to PRO_TRIAL
        self.manager.set_entitlement(wallet, EntitlementStatus.PRO_TRIAL)

        # Should allow many scans
        for i in range(10):
            permission = self.manager.check_scan_permission(wallet)
            self.assertTrue(permission['allowed'])
            self.assertEqual(permission['entitlement'], EntitlementStatus.PRO_TRIAL.value)
            self.assertIsNone(permission.get('remaining_scans'))
            self.manager.record_scan(wallet)

    def test_pro_paid_unlimited(self):
        """PRO_PAID users should have unlimited scans."""
        wallet = "0xTEST0006"

        # Upgrade to PRO_PAID
        self.manager.set_entitlement(wallet, EntitlementStatus.PRO_PAID)

        # Should allow many scans
        for i in range(10):
            permission = self.manager.check_scan_permission(wallet)
            self.assertTrue(permission['allowed'])
            self.assertEqual(permission['entitlement'], EntitlementStatus.PRO_PAID.value)
            self.manager.record_scan(wallet)

    def test_blocked_user_denied(self):
        """BLOCKED users should be denied."""
        wallet = "0xTEST0007"

        # Block the wallet
        self.manager.set_entitlement(wallet, EntitlementStatus.BLOCKED)

        permission = self.manager.check_scan_permission(wallet)
        self.assertFalse(permission['allowed'])
        self.assertEqual(permission['status'], 'BLOCKED')
        self.assertIn('restricted', permission['message'].lower())

    def test_trial_sets_timestamp(self):
        """Upgrading to PRO_TRIAL should set trial_start_timestamp."""
        wallet = "0xTEST0008"

        before = time.time()
        self.manager.set_entitlement(wallet, EntitlementStatus.PRO_TRIAL)
        after = time.time()

        record = self.manager.get_wallet(wallet)
        self.assertIsNotNone(record.trial_start_timestamp)
        self.assertGreaterEqual(record.trial_start_timestamp, before)
        self.assertLessEqual(record.trial_start_timestamp, after)

    def test_wallet_reset(self):
        """Reset should return wallet to default state."""
        wallet = "0xTEST0009"

        # Use some scans
        self.manager.record_scan(wallet)
        self.manager.record_scan(wallet)

        # Reset
        self.manager.reset_wallet(wallet)

        # Should be fresh
        record = self.manager.get_wallet(wallet)
        self.assertEqual(record.entitlement_status, EntitlementStatus.FREE.value)
        self.assertEqual(record.scans_today_count, 0)

    def test_wallet_addresses_normalized(self):
        """Wallet addresses should be case-insensitive."""
        wallet_lower = "0xtest0010"
        wallet_upper = "0xTEST0010"

        # Record scan with lowercase
        self.manager.record_scan(wallet_lower)

        # Check with uppercase should see the same record
        record = self.manager.get_wallet(wallet_upper)
        self.assertEqual(record.scans_today_count, 1)

    def test_remaining_scans_accurate(self):
        """remaining_scans should accurately reflect usage."""
        wallet = "0xTEST0011"

        # Initial: 5 remaining
        permission = self.manager.check_scan_permission(wallet)
        self.assertEqual(permission['remaining_scans'], 5)

        # After 1 scan: 4 remaining
        self.manager.record_scan(wallet)
        # Reset burst timer
        record = self.manager.get_wallet(wallet)
        record.last_scan_timestamp = time.time() - BURST_COOLDOWN_SECONDS - 1
        permission = self.manager.check_scan_permission(wallet)
        self.assertEqual(permission['remaining_scans'], 4)

        # After 3 more: 1 remaining
        self.manager.record_scan(wallet)
        self.manager.record_scan(wallet)
        self.manager.record_scan(wallet)
        # Reset burst timer
        record = self.manager.get_wallet(wallet)
        record.last_scan_timestamp = time.time() - BURST_COOLDOWN_SECONDS - 1
        permission = self.manager.check_scan_permission(wallet)
        self.assertEqual(permission['remaining_scans'], 1)


class TestTrialExpiration(unittest.TestCase):
    """Test trial expiration logic (requires time manipulation)."""

    def setUp(self):
        self.temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.json')
        self.temp_file.close()
        self.manager = EntitlementManager(data_file=self.temp_file.name)

    def tearDown(self):
        try:
            os.unlink(self.temp_file.name)
        except:
            pass

    def test_trial_expiration_reverts_to_free(self):
        """Expired trial should revert to FREE."""
        wallet = "0xTEST0012"

        # Set up trial with expired timestamp (8 days ago)
        self.manager.set_entitlement(wallet, EntitlementStatus.PRO_TRIAL)
        record = self.manager.get_wallet(wallet)

        # Manually set trial start to 8 days ago
        record.trial_start_timestamp = time.time() - (8 * 24 * 60 * 60)
        self.manager._save_data()

        # Check permission should trigger expiration check
        permission = self.manager.check_scan_permission(wallet)

        # Should now be FREE
        self.assertEqual(permission['entitlement'], EntitlementStatus.FREE.value)

        # Record should be updated
        record = self.manager.get_wallet(wallet)
        self.assertEqual(record.entitlement_status, EntitlementStatus.FREE.value)
        self.assertIsNone(record.trial_start_timestamp)


if __name__ == '__main__':
    print("=" * 60)
    print("🧪 Crypto Guardian - Entitlement System Tests")
    print("=" * 60)
    unittest.main(verbosity=2)

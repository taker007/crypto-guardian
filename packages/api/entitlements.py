"""
Crypto Guardian - Entitlement & Rate Limiting System
Step 6: Server-side entitlement management

Entitlement States:
- FREE: Limited to 5 scans per 24 hours
- PRO_TRIAL: Unlimited scans for 7 days
- PRO_PAID: Unlimited scans
- BLOCKED: Access denied
"""

import json
import os
import time
from enum import Enum
from typing import Optional, Dict, Any
from dataclasses import dataclass, asdict

# Constants
DAILY_SCAN_LIMIT_FREE = 5
BURST_COOLDOWN_SECONDS = 10
TRIAL_DURATION_DAYS = 7
DATA_FILE = os.path.join(os.path.dirname(__file__), 'entitlements.json')


class EntitlementStatus(str, Enum):
    FREE = "FREE"
    PRO_TRIAL = "PRO_TRIAL"
    PRO_PAID = "PRO_PAID"
    BLOCKED = "BLOCKED"


@dataclass
class WalletRecord:
    wallet_address: str
    entitlement_status: str = EntitlementStatus.FREE.value
    trial_start_timestamp: Optional[float] = None
    trial_used: bool = False  # Track if trial was already used (one per wallet)
    scans_today_count: int = 0
    last_scan_timestamp: float = 0.0
    scan_window_start: float = 0.0
    created_at: float = 0.0
    # Stripe fields
    stripe_customer_id: Optional[str] = None
    stripe_subscription_id: Optional[str] = None
    stripe_session_id: Optional[str] = None
    paid_plan: Optional[str] = None  # "monthly" or "annual"
    paid_at: Optional[float] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'WalletRecord':
        # Handle missing trial_used field for backward compatibility
        if 'trial_used' not in data:
            data['trial_used'] = data.get('trial_start_timestamp') is not None
        return cls(**data)


class EntitlementManager:
    """Manages wallet entitlements and rate limiting."""

    def __init__(self, data_file: str = DATA_FILE):
        self.data_file = data_file
        self.wallets: Dict[str, WalletRecord] = {}
        self._load_data()

    def _load_data(self) -> None:
        """Load entitlement data from file."""
        if os.path.exists(self.data_file):
            try:
                with open(self.data_file, 'r') as f:
                    data = json.load(f)
                    self.wallets = {
                        addr: WalletRecord.from_dict(record)
                        for addr, record in data.get('wallets', {}).items()
                    }
            except (json.JSONDecodeError, KeyError):
                self.wallets = {}
        else:
            self.wallets = {}

    def _save_data(self) -> None:
        """Save entitlement data to file."""
        data = {'wallets': {addr: record.to_dict() for addr, record in self.wallets.items()}}
        with open(self.data_file, 'w') as f:
            json.dump(data, f, indent=2)

    def get_wallet(self, wallet_address: str) -> WalletRecord:
        """Get or create a wallet record."""
        wallet_address = wallet_address.lower()
        if wallet_address not in self.wallets:
            now = time.time()
            self.wallets[wallet_address] = WalletRecord(
                wallet_address=wallet_address,
                entitlement_status=EntitlementStatus.FREE.value,
                created_at=now,
                scan_window_start=now
            )
            self._save_data()
        return self.wallets[wallet_address]

    def _check_trial_expiration(self, record: WalletRecord) -> WalletRecord:
        """Check if trial has expired and revert to FREE if so."""
        if record.entitlement_status == EntitlementStatus.PRO_TRIAL.value:
            if record.trial_start_timestamp:
                trial_end = record.trial_start_timestamp + (TRIAL_DURATION_DAYS * 24 * 60 * 60)
                if time.time() > trial_end:
                    record.entitlement_status = EntitlementStatus.FREE.value
                    record.trial_start_timestamp = None
                    self._save_data()
        return record

    def _reset_daily_counter_if_needed(self, record: WalletRecord) -> WalletRecord:
        """Reset daily scan counter if 24 hours have passed."""
        now = time.time()
        window_duration = 24 * 60 * 60
        if now - record.scan_window_start >= window_duration:
            record.scans_today_count = 0
            record.scan_window_start = now
        return record

    def check_scan_permission(self, wallet_address: str) -> Dict[str, Any]:
        """Check if a wallet is allowed to perform a scan."""
        wallet_address = wallet_address.lower()
        record = self.get_wallet(wallet_address)
        record = self._check_trial_expiration(record)
        record = self._reset_daily_counter_if_needed(record)
        now = time.time()

        # BLOCKED
        if record.entitlement_status == EntitlementStatus.BLOCKED.value:
            return {
                "allowed": False,
                "status": "BLOCKED",
                "entitlement": EntitlementStatus.BLOCKED.value,
                "message": "This wallet is temporarily restricted due to abuse."
            }

        # PRO_PAID
        if record.entitlement_status == EntitlementStatus.PRO_PAID.value:
            return {
                "allowed": True,
                "status": "OK",
                "entitlement": EntitlementStatus.PRO_PAID.value,
                "remaining_scans": None
            }

        # PRO_TRIAL
        if record.entitlement_status == EntitlementStatus.PRO_TRIAL.value:
            trial_end = record.trial_start_timestamp + (TRIAL_DURATION_DAYS * 24 * 60 * 60)
            days_remaining = max(0, int((trial_end - now) / (24 * 60 * 60)))
            return {
                "allowed": True,
                "status": "OK",
                "entitlement": EntitlementStatus.PRO_TRIAL.value,
                "remaining_scans": None,
                "trial_days_remaining": days_remaining
            }

        # FREE - burst protection
        time_since_last = now - record.last_scan_timestamp
        if time_since_last < BURST_COOLDOWN_SECONDS:
            wait_time = int(BURST_COOLDOWN_SECONDS - time_since_last)
            return {
                "allowed": False,
                "status": "RATE_LIMITED",
                "entitlement": EntitlementStatus.FREE.value,
                "message": f"Please wait {wait_time} seconds between scans.",
                "retry_after": wait_time
            }

        # FREE - daily limit
        if record.scans_today_count >= DAILY_SCAN_LIMIT_FREE:
            return {
                "allowed": False,
                "status": "LIMIT_REACHED",
                "entitlement": EntitlementStatus.FREE.value,
                "message": f"Free scan limit reached ({DAILY_SCAN_LIMIT_FREE}/day). Upgrade to Pro for unlimited protection.",
                "scans_used": record.scans_today_count
            }

        # Allowed
        remaining = DAILY_SCAN_LIMIT_FREE - record.scans_today_count
        return {
            "allowed": True,
            "status": "OK",
            "entitlement": EntitlementStatus.FREE.value,
            "remaining_scans": remaining
        }

    def record_scan(self, wallet_address: str) -> None:
        """Record that a scan was performed."""
        wallet_address = wallet_address.lower()
        record = self.get_wallet(wallet_address)
        record.scans_today_count += 1
        record.last_scan_timestamp = time.time()
        self._save_data()

    def set_entitlement(self, wallet_address: str, status: EntitlementStatus) -> WalletRecord:
        """Set a wallet's entitlement status."""
        wallet_address = wallet_address.lower()
        record = self.get_wallet(wallet_address)
        record.entitlement_status = status.value
        if status == EntitlementStatus.PRO_TRIAL:
            record.trial_start_timestamp = time.time()
        else:
            record.trial_start_timestamp = None
        self._save_data()
        return record

    def get_wallet_info(self, wallet_address: str) -> Dict[str, Any]:
        """Get full wallet info."""
        wallet_address = wallet_address.lower()
        record = self.get_wallet(wallet_address)
        record = self._check_trial_expiration(record)
        record = self._reset_daily_counter_if_needed(record)
        info = record.to_dict()
        if record.entitlement_status == EntitlementStatus.FREE.value:
            info['remaining_scans'] = DAILY_SCAN_LIMIT_FREE - record.scans_today_count
        return info

    def reset_wallet(self, wallet_address: str) -> None:
        """Reset a wallet to default state."""
        wallet_address = wallet_address.lower()
        if wallet_address in self.wallets:
            del self.wallets[wallet_address]
            self._save_data()

    def start_trial(self, wallet_address: str) -> Dict[str, Any]:
        """
        Start a 7-day Pro trial for a wallet.
        Returns status and trial info.
        """
        wallet_address = wallet_address.lower()
        record = self.get_wallet(wallet_address)
        record = self._check_trial_expiration(record)
        now = time.time()

        # BLOCKED cannot start trial
        if record.entitlement_status == EntitlementStatus.BLOCKED.value:
            return {
                "success": False,
                "status": "BLOCKED",
                "message": "This wallet is blocked and cannot start a trial."
            }

        # Already PRO_PAID
        if record.entitlement_status == EntitlementStatus.PRO_PAID.value:
            return {
                "success": False,
                "status": "ALREADY_PRO",
                "entitlement": EntitlementStatus.PRO_PAID.value,
                "message": "This wallet already has Pro access."
            }

        # Already in active trial
        if record.entitlement_status == EntitlementStatus.PRO_TRIAL.value:
            trial_end = record.trial_start_timestamp + (TRIAL_DURATION_DAYS * 24 * 60 * 60)
            return {
                "success": False,
                "status": "TRIAL_ACTIVE",
                "entitlement": EntitlementStatus.PRO_TRIAL.value,
                "trial_expires_at": trial_end,
                "message": "Trial is already active."
            }

        # Already used trial (expired)
        if record.trial_used:
            return {
                "success": False,
                "status": "TRIAL_ALREADY_USED",
                "entitlement": record.entitlement_status,
                "message": "This wallet has already used its free trial. Upgrade to Pro for unlimited access."
            }

        # Start the trial
        record.entitlement_status = EntitlementStatus.PRO_TRIAL.value
        record.trial_start_timestamp = now
        record.trial_used = True
        self._save_data()

        trial_end = now + (TRIAL_DURATION_DAYS * 24 * 60 * 60)
        return {
            "success": True,
            "status": "TRIAL_STARTED",
            "entitlement": EntitlementStatus.PRO_TRIAL.value,
            "trial_expires_at": trial_end,
            "trial_days": TRIAL_DURATION_DAYS,
            "message": f"Pro trial activated! You have {TRIAL_DURATION_DAYS} days of unlimited scans."
        }

    def upgrade_to_paid(
        self,
        wallet_address: str,
        stripe_customer_id: str,
        stripe_session_id: str,
        plan: str,
        stripe_subscription_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Upgrade a wallet to PRO_PAID after successful Stripe payment.
        This should only be called from webhook handler.
        """
        wallet_address = wallet_address.lower()
        record = self.get_wallet(wallet_address)

        # BLOCKED cannot upgrade
        if record.entitlement_status == EntitlementStatus.BLOCKED.value:
            return {
                "success": False,
                "status": "BLOCKED",
                "message": "This wallet is blocked and cannot upgrade."
            }

        # Already PRO_PAID - idempotent, just update Stripe info
        if record.entitlement_status == EntitlementStatus.PRO_PAID.value:
            # Check if same session (duplicate webhook)
            if record.stripe_session_id == stripe_session_id:
                return {
                    "success": True,
                    "status": "ALREADY_PROCESSED",
                    "entitlement": EntitlementStatus.PRO_PAID.value,
                    "message": "Payment already processed."
                }

        # Upgrade to PRO_PAID
        now = time.time()
        record.entitlement_status = EntitlementStatus.PRO_PAID.value
        record.stripe_customer_id = stripe_customer_id
        record.stripe_session_id = stripe_session_id
        record.stripe_subscription_id = stripe_subscription_id
        record.paid_plan = plan
        record.paid_at = now
        self._save_data()

        return {
            "success": True,
            "status": "UPGRADED",
            "entitlement": EntitlementStatus.PRO_PAID.value,
            "plan": plan,
            "message": f"Upgraded to Pro ({plan})! Unlimited scans activated."
        }

    def is_session_processed(self, stripe_session_id: str) -> bool:
        """Check if a Stripe session has already been processed (idempotency)."""
        for record in self.wallets.values():
            if record.stripe_session_id == stripe_session_id:
                return True
        return False


# Global instance
entitlement_manager = EntitlementManager()

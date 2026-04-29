"""DPDPA-compliant START/STOP consent flow.

Source: PRD §2.1 STEP 1-2, §2.4 (error states), tech spec §9.

State machine:

    NEVER_CONTACTED ──(any msg)──▶ AWAITING_CONSENT
                           │
                           ├─(START)──▶ CONSENTED
                           └─(STOP)───▶ (row deleted, back to NEVER_CONTACTED)
    CONSENTED        ──(STOP)─▶ (row + bills deleted, back to NEVER_CONTACTED)
    CONSENTED        ──(START)▶ CONSENTED (idempotent)

Consumers call ``check_consent`` for the current state and
``handle_start_command`` / ``handle_stop_command`` for the transitions.

Templates include Kannada strings straight from the PRD layout so the
webhook can send them verbatim.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from enum import Enum
from typing import Any, Callable, Optional

from backend.db import supabase_client

logger = logging.getLogger(__name__)

# Ephemeral in-process fallback when Supabase is unavailable.
# This keeps START/STOP and consent gating usable for local demos.
_LOCAL_CONSENT: dict[str, ConsentState] = {}


class ConsentState(str, Enum):
    NEVER_CONTACTED = "never_contacted"
    AWAITING_CONSENT = "awaiting_consent"
    CONSENTED = "consented"


@dataclass(frozen=True)
class ConsentResponse:
    """What the webhook should send back to the user."""

    state: ConsentState
    message: str
    # True when downstream processing (Gemini call, analysis, etc.) should
    # proceed. Only true for CONSENTED users who did not just send STOP.
    allow_processing: bool


# =============================================================================
# User-facing templates — PRD §2.1 STEP 1-2 + §2.4. Kannada included verbatim.
# =============================================================================

FIRST_CONTACT_TEMPLATE = (
    "🔌 VidyutMitra — MESCOM Bill Advisor\n\n"
    "Welcome! I help you understand your MESCOM electricity bill, find "
    "savings, and check government subsidy eligibility.\n\n"
    "🔒 Privacy Notice / ಗೌಪ್ಯತೆ ಸೂಚನೆ:\n"
    "• I extract data from your bill photo (units, charges, sanctioned load)\n"
    "• I store ONLY extracted text data — your bill image is NEVER saved\n"
    "• Your data is linked to your phone number\n"
    "• Send STOP at any time to permanently delete all your data\n\n"
    "ನಿಮ್ಮ ಬಿಲ್ ಫೋಟೋದಿಂದ ಮಾಹಿತಿ ಮಾತ್ರ ತೆಗೆಯಲಾಗುತ್ತದೆ. "
    "ಚಿತ್ರವನ್ನು ಉಳಿಸಲಾಗುವುದಿಲ್ಲ. "
    "STOP ಕಳುಹಿಸಿ ಎಲ್ಲಾ ಡೇಟಾ ಅಳಿಸಲು.\n\n"
    "Reply START to continue / STOP to opt out."
)

START_ACK_TEMPLATE = (
    "✅ Thank you! You're all set.\n\n"
    "📸 Send a photo of your MESCOM electricity bill (from April 2025 or "
    "later) and I'll analyze it for you.\n\n"
    "ನಿಮ್ಮ MESCOM ವಿದ್ಯುತ್ ಬಿಲ್ ಫೋಟೋ ಕಳುಹಿಸಿ."
)

ALREADY_CONSENTED_TEMPLATE = (
    "You're already set up — send a MESCOM bill photo anytime.\n\n"
    "📸 ನಿಮ್ಮ MESCOM ವಿದ್ಯುತ್ ಬಿಲ್ ಫೋಟೋ ಕಳುಹಿಸಿ."
)

STOP_CONSENTED_TEMPLATE = (
    "✅ All your data has been permanently deleted ({bill_count} bill "
    "record{s} removed). Send any message to start fresh.\n\n"
    "ನಿಮ್ಮ ಎಲ್ಲಾ ಡೇಟಾವನ್ನು ಶಾಶ್ವತವಾಗಿ ಅಳಿಸಲಾಗಿದೆ."
)

STOP_NEVER_CONSENTED_TEMPLATE = (
    "Understood — no data was ever processed. Feel free to return anytime.\n\n"
    "ಯಾವುದೇ ಡೇಟಾ ಸಂಸ್ಕರಿಸಲಾಗಿಲ್ಲ. ನೀವು ಯಾವಾಗ ಬೇಕಾದರೂ ಹಿಂತಿರುಗಬಹುದು."
)

UNCONSENTED_MEDIA_TEMPLATE = (
    "I need your consent before analyzing bills. Please reply START to "
    "accept the privacy terms, or STOP to opt out.\n\n"
    "ದಯವಿಟ್ಟು START ಕಳುಹಿಸಿ."
)

# =============================================================================
# State reads
# =============================================================================


def check_consent(
    phone_number: str,
    *,
    client: Optional[Any] = None,
) -> ConsentState:
    """Return the current consent state without mutating anything."""
    try:
        c = client or supabase_client.init_client()
        existing = (
            c.table("users")
            .select("consent_given")
            .eq("phone_number", phone_number)
            .limit(1)
            .execute()
        )
        if not existing.data:
            return ConsentState.NEVER_CONTACTED
        if existing.data[0].get("consent_given"):
            return ConsentState.CONSENTED
        return ConsentState.AWAITING_CONSENT
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "check_consent falling back to in-memory state for %s: %s",
            phone_number,
            exc,
        )
        return _LOCAL_CONSENT.get(phone_number, ConsentState.NEVER_CONTACTED)


# =============================================================================
# Transitions
# =============================================================================


def handle_start_command(
    phone_number: str,
    *,
    client: Optional[Any] = None,
) -> ConsentResponse:
    """User sent START — transition to CONSENTED, return the ack template.

    Idempotent: calling START on an already-consented user returns the
    friendlier ``ALREADY_CONSENTED_TEMPLATE`` without a redundant DB write.
    """
    current = check_consent(phone_number, client=client)
    if current is ConsentState.CONSENTED:
        return ConsentResponse(
            state=ConsentState.CONSENTED,
            message=ALREADY_CONSENTED_TEMPLATE,
            allow_processing=True,
        )

    try:
        c = client or supabase_client.init_client()
        supabase_client.set_consent(phone_number, True, client=c)
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "handle_start_command using in-memory fallback for %s: %s",
            phone_number,
            exc,
        )
        _LOCAL_CONSENT[phone_number] = ConsentState.CONSENTED

    return ConsentResponse(
        state=ConsentState.CONSENTED,
        message=START_ACK_TEMPLATE,
        allow_processing=True,
    )


def handle_stop_command(
    phone_number: str,
    *,
    client: Optional[Any] = None,
) -> ConsentResponse:
    """User sent STOP — hard-delete the user + cascade bills.

    Two message variants per PRD §2.4:
    - Consented user: confirmation with bill count removed.
    - Never-consented user: "no data was ever processed" (still deletes any
      placeholder ``users`` row from the AWAITING_CONSENT state).

    Also nukes the in-memory follow-up cache so SOLAR/CLIFF replies after
    STOP can't leak a previously-analysed bill.
    """
    # Late import — consent package loads before output package.
    from backend.output import last_bill_cache
    last_bill_cache.clear_bill(phone_number)

    prior_state = check_consent(phone_number, client=client)
    existed = False
    bill_count = 0
    try:
        c = client or supabase_client.init_client()
        existed, bill_count = supabase_client.delete_user_cascade(
            phone_number, client=c
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "handle_stop_command using in-memory fallback for %s: %s",
            phone_number,
            exc,
        )

    _LOCAL_CONSENT.pop(phone_number, None)

    if prior_state is ConsentState.CONSENTED and existed:
        message = STOP_CONSENTED_TEMPLATE.format(
            bill_count=bill_count,
            s="" if bill_count == 1 else "s",
        )
    else:
        message = STOP_NEVER_CONSENTED_TEMPLATE

    return ConsentResponse(
        state=ConsentState.NEVER_CONTACTED,
        message=message,
        allow_processing=False,
    )


def first_contact_response(
    phone_number: str,
    *,
    client: Optional[Any] = None,
) -> ConsentResponse:
    """Handle any message from an unconsented user.

    Ensures the placeholder user row exists so follow-up STOP can delete it.
    Never processes media — the image is not fetched from Twilio.
    """
    try:
        c = client or supabase_client.init_client()
        supabase_client.get_or_create_user(phone_number, client=c)
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "first_contact_response using in-memory fallback for %s: %s",
            phone_number,
            exc,
        )
        _LOCAL_CONSENT[phone_number] = ConsentState.AWAITING_CONSENT

    return ConsentResponse(
        state=ConsentState.AWAITING_CONSENT,
        message=FIRST_CONTACT_TEMPLATE,
        allow_processing=False,
    )


def unconsented_media_response() -> ConsentResponse:
    """Tighter prompt for users who sent media without consenting yet."""
    return ConsentResponse(
        state=ConsentState.AWAITING_CONSENT,
        message=UNCONSENTED_MEDIA_TEMPLATE,
        allow_processing=False,
    )

"""VidyutMitra Flask entry point.

Session 5 surface:
- ``GET /health`` — liveness.
- ``POST /whatsapp`` — Twilio webhook. Consented media kicks off the
  extraction → analysis → response → dispatch pipeline in a daemon thread
  and returns a TwiML ack immediately (tech spec §11.1: the main response
  is sent via out-of-band Twilio REST calls because processing takes
  ~10 seconds and the webhook must respond within 15).

Startup validates every required env var from CLAUDE.md §9 — abort early
with a readable error rather than let a missing key blow up mid-request.
"""
from __future__ import annotations

import logging
import os
import sys
import threading
from dataclasses import asdict
from datetime import datetime, timezone
from typing import Optional

from flask import Flask, jsonify, request

from flask import abort, send_from_directory

from backend.admin_api import admin_bp
from backend.analysis.models import ExtractionStatus
from backend.consent.consent_manager import (
    ConsentState,
    check_consent,
    first_contact_response,
    get_language_preference,
    handle_language_toggle,
    handle_start_command,
    handle_stop_command,
    set_language_preference,
    unconsented_media_response,
)
from backend.output import last_bill_cache
from backend.output.kannada_tts import MEDIA_TMP_DIR
from backend.output.response_composer import (
    compose_cliff_followup,
    compose_fixed_followup,
    compose_followup_limit_reached_response,
    compose_no_recent_bill_response,
    compose_solar_followup,
    compose_subsidy_followup,
)

FOLLOWUP_KEYWORDS = frozenset({"SOLAR", "FIXED", "SUBSIDY", "CLIFF"})
FOLLOWUP_LIMIT = 2

logger = logging.getLogger(__name__)

APP_VERSION = "0.5.0"

# CLAUDE.md §9 — required at startup for the webhook boot. ADMIN_PASSWORD,
# AWS*, GOOGLE_APPLICATION_CREDENTIALS, PUBLIC_BASE_URL are only needed by
# session-specific routes / deployment.
REQUIRED_ENV_VARS = (
    "GEMINI_API_KEY",
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN",
    "TWILIO_WHATSAPP_NUMBER",
    "SUPABASE_URL",
    "SUPABASE_KEY",
)


def _load_dotenv_if_available() -> None:
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        pass


def _validate_env(strict: bool = True) -> list[str]:
    missing = [k for k in REQUIRED_ENV_VARS if not os.environ.get(k)]
    if missing and strict:
        sys.stderr.write(
            "ERROR: missing required environment variables: "
            + ", ".join(missing)
            + "\nCopy .env.example -> .env and fill them in before starting the server.\n"
        )
        sys.exit(1)
    return missing


# =============================================================================
# Async bill processor — the actual pipeline
# =============================================================================


def process_bill_and_dispatch(
    from_number: str,
    media_url: str,
    message_body: str = "",
    *,
    supabase_client_override=None,
    twilio_client_override=None,
) -> str:
    """Fetch → extract → analyze → compose → dispatch → persist.

    Synchronous. Called from a daemon thread in the webhook path so the
    webhook itself can return TwiML within Twilio's 15-second budget.

    Returns the dispatched message text (handy for tests + logging). Never
    re-raises — every exception is caught, logged, and results in the
    generic "try again in a minute" response being sent to the user.
    """
    # Late imports keep test setup lightweight and allow monkeypatching.
    from backend.extraction.gemini_client import GeminiError
    from backend.extraction.pipeline import run_extraction
    from backend.extraction.twilio_media import TwilioMediaError, fetch_twilio_media
    from backend.analysis.orchestrator import analyze_bill
    from backend.output import response_composer, twilio_dispatcher
    from backend.output.language_detector import detect_language
    from backend.output.response_composer import split_for_whatsapp
    from backend.db import supabase_client

    # Language preference: prefer persisted, fall back to detection from
    # the message body, default to English. Persist a freshly-detected
    # value so subsequent bills don't re-detect.
    language = get_language_preference(from_number)
    if language is None and message_body:
        language = detect_language(message_body)
        set_language_preference(from_number, language)
    if language is None:
        language = "en"

    def _send(msg: str) -> str:
        """Dispatch, splitting at section boundaries if the WhatsApp 1600-
        char cap would be exceeded. Each chunk ships with the dispatcher's
        1-sec rate-limit sleep between calls.
        """
        for chunk in split_for_whatsapp(msg):
            twilio_dispatcher.send_text(
                from_number, chunk, client=twilio_client_override
            )
        return msg

    try:
        image_bytes = fetch_twilio_media(media_url)
    except TwilioMediaError as e:
        logger.error("twilio media fetch failed: %s", e)
        return _send(response_composer.compose_gemini_error_response())

    try:
        result = run_extraction(image_bytes, phone_number=from_number)
    except GeminiError as e:
        logger.error("extraction raised GeminiError outside pipeline: %s", e)
        return _send(response_composer.compose_gemini_error_response())
    except Exception:  # noqa: BLE001 — last-resort: never let the user get nothing
        logger.exception("unexpected extraction error")
        return _send(response_composer.compose_gemini_error_response())

    # Status-specific replies.
    if result.status == ExtractionStatus.PRE_APRIL_2025:
        return _send(response_composer.compose_pre_april_2025_response())
    if result.status == ExtractionStatus.NOT_MESCOM:
        return _send(response_composer.compose_bad_photo_response())
    if result.status == ExtractionStatus.FAILED:
        return _send(response_composer.compose_bad_photo_response())

    # OK path — analyse + compose.
    try:
        analysis = analyze_bill(result.extraction)
        message = response_composer.compose_for_result(analysis, language=language)
    except Exception:  # noqa: BLE001
        logger.exception("analysis/composition error")
        return _send(response_composer.compose_gemini_error_response())

    # Dispatch FIRST. Only after the user has their answer do we touch the DB.
    dispatched = _send(message)

    # Populate the follow-up cache so SOLAR / FIXED / SUBSIDY / CLIFF replies
    # have something to work with for the next 30 minutes (PRD §2.3).
    try:
        last_bill_cache.set_last_bill(
            phone_number=from_number,
            analysis=analysis,
            extraction=result.extraction,
            follow_up_count=0,
        )
    except Exception:  # noqa: BLE001 — cache is best-effort
        logger.exception("last_bill_cache.set_last_bill failed")

    # Kannada voice note (Session 6). Best-effort: a TTS or dispatch failure
    # logs and moves on — the text response already landed.
    try:
        _dispatch_voice_note(from_number, result.extraction, analysis)
    except Exception:  # noqa: BLE001
        logger.exception("voice-note dispatch failed")

    # Infographic (Session 6). Same best-effort posture.
    try:
        _dispatch_infographic(from_number, result.extraction, analysis)
    except Exception:  # noqa: BLE001
        logger.exception("infographic dispatch failed")

    # Persist. DB failure must not block the user-facing response — log and move on.
    try:
        c = supabase_client_override or supabase_client.init_client()
        user = supabase_client.get_or_create_user(from_number, client=c)
        supabase_client.write_bill(
            user_id=user["id"],
            extraction=result.extraction,
            analysis=analysis.to_jsonable(),
            client=c,
        )
    except Exception:  # noqa: BLE001 — DB failure is logged, not user-visible
        logger.exception("supabase write_bill failed")

    return dispatched


# =============================================================================
# Flask app
# =============================================================================


MEDIA_TTL_SECONDS = 300
MEDIA_SWEEP_INTERVAL_SECONDS = 60


def _start_media_sweeper() -> None:
    """Daemon thread: deletes files in MEDIA_TMP_DIR older than MEDIA_TTL_SECONDS.

    Twilio's CDN fetches media URLs asynchronously after ``messages.create``
    returns, so the dispatcher cannot unlink immediately without racing the
    fetch (manifests as 404s in our /media route → media drops in WhatsApp).
    Files live for ~5 min, then this sweeper reaps them.
    """
    import time as _time

    def _sweep():
        while True:
            try:
                cutoff = _time.time() - MEDIA_TTL_SECONDS
                for p in MEDIA_TMP_DIR.iterdir():
                    try:
                        if p.is_file() and p.stat().st_mtime < cutoff:
                            p.unlink()
                    except OSError:
                        pass
            except Exception:  # noqa: BLE001 — sweeper must never die
                logger.exception("media sweeper iteration failed")
            _time.sleep(MEDIA_SWEEP_INTERVAL_SECONDS)

    threading.Thread(target=_sweep, daemon=True, name="media-sweeper").start()


def create_app(*, validate_env: bool = True) -> Flask:
    _load_dotenv_if_available()
    if validate_env:
        _validate_env(strict=True)

    app = Flask(__name__)
    app.register_blueprint(admin_bp)
    _start_media_sweeper()

    @app.get("/health")
    def health():
        return jsonify(
            status="ok",
            timestamp=datetime.now(timezone.utc).isoformat(),
            version=APP_VERSION,
            missing_env=_validate_env(strict=False),
        )

    @app.get("/media/<path:filename>")
    def serve_media(filename: str):
        """Serve TTS audio + infographic PNG for Twilio to fetch.

        Path-traversal guard: ``send_from_directory`` refuses ``..`` by
        default. We also reject anything that isn't a plain filename.
        """
        if "/" in filename or "\\" in filename or ".." in filename:
            abort(404)
        return send_from_directory(MEDIA_TMP_DIR, filename)

    @app.post("/whatsapp")
    def whatsapp():
        from_number = (request.form.get("From") or "").strip()
        body = (request.form.get("Body") or "").strip()
        try:
            num_media = int(request.form.get("NumMedia", "0"))
        except ValueError:
            num_media = 0
        media_url = request.form.get("MediaUrl0") if num_media > 0 else None
        if media_url:
            logger.info("incoming media_url=%s configured_sid=%s", media_url, os.environ.get("TWILIO_ACCOUNT_SID", "")[:10])

        if not from_number:
            return _twiml("Missing sender.", status=400)

        command = body.upper()

        # STOP intercepted BEFORE consent check (PRD §2.4 — works for never-
        # consented users).
        if command == "STOP":
            resp = handle_stop_command(from_number)
            return _twiml(resp.message)

        # LANG / LANGUAGE — toggles persisted preference. Comes AFTER STOP
        # (so STOP still wins on a "STOP LANG" race) but BEFORE the consent
        # gate so an awaiting-consent user can flip the language too.
        if command in ("LANG", "LANGUAGE"):
            resp = handle_language_toggle(from_number)
            return _twiml(resp.message)

        if command == "START":
            resp = handle_start_command(from_number)
            return _twiml(resp.message)

        # Consent gate.
        state = check_consent(from_number)
        if state is not ConsentState.CONSENTED:
            if num_media > 0:
                resp = unconsented_media_response()
            else:
                resp = first_contact_response(from_number, body)
            return _twiml(resp.message)

        # --- Consented user ----------------------------------------------------
        # Feedback flow
        is_feedback = False
        feedback_text = None
        audio_url = None

        if command.startswith("FEEDBACK"):
            is_feedback = True
            feedback_text = body[8:].strip() or None
            if num_media > 0 and media_url:
                audio_url = media_url
        elif num_media > 0 and request.form.get("MediaContentType0", "").startswith("audio/"):
            is_feedback = True
            audio_url = media_url
            feedback_text = body if body else None

        if is_feedback:
            if not feedback_text and not audio_url:
                return _twiml("Please provide your feedback after the word FEEDBACK, or send a voice note with FEEDBACK.")
            try:
                from backend.db import supabase_client
                logger.info(f"Writing feedback for {from_number}")
                supabase_client.write_feedback(
                    phone_number=from_number,
                    feedback_text=feedback_text,
                    audio_url=audio_url,
                )
                return _twiml("Thank you for your feedback! 🙏")
            except Exception:
                logger.exception("supabase write_feedback failed")
                return _twiml("Sorry, we couldn't save your feedback right now. Please try again later.")
        if num_media > 0 and media_url:
            # Kick off processing in a daemon thread. The webhook must return
            # within ~15s (Twilio) and processing takes ~10s; we'd just barely
            # make it sync, but the spec mandates out-of-band dispatch so the
            # full response (text + Session-6 voice + infographic) can exceed
            # the webhook window.
            thread = threading.Thread(
                target=_process_bill_with_error_isolation,
                args=(from_number, media_url, body),
                daemon=True,
            )
            thread.start()

            return _twiml(
                "⏳ Analyzing your bill...\n"
                "ನಿಮ್ಮ ಬಿಲ್ ವಿಶ್ಲೇಷಿಸಲಾಗುತ್ತಿದೆ..."
            )

        # Follow-up keywords (PRD §2.3). Intercepted before the generic
        # "send a photo" prompt. Two-turn limit is hard — judges will stress-
        # test loops, so we cap at FOLLOWUP_LIMIT and then require a fresh bill.
        if command in FOLLOWUP_KEYWORDS:
            return _twiml(_handle_followup(from_number, command))

        # Consented user sent some other text — prompt for a photo.
        return _twiml(
            "📸 Send a photo of your MESCOM electricity bill and I'll "
            "analyze it for you."
        )

    return app


def _dispatch_voice_note(from_number, extraction, analysis) -> None:
    """Compose Kannada summary → synthesize → dispatch.

    Cleanup is deferred to the periodic sweeper (``_start_media_sweeper``)
    because Twilio's CDN fetches the media asynchronously some seconds
    after ``messages.create`` returns. Unlinking immediately would race
    the fetch and Twilio would 404.
    """
    from backend.output import kannada_tts, response_composer, twilio_dispatcher

    text = response_composer.compose_kannada_voice_summary(extraction, analysis)
    audio_path = kannada_tts.synthesize_to_temp_file(text)
    twilio_dispatcher.send_voice_note(from_number, audio_path, cleanup=False)


def _dispatch_infographic(from_number, extraction, analysis) -> None:
    """Generate personalised PNG → dispatch. Cleanup deferred to sweeper."""
    from backend.output import infographic, twilio_dispatcher

    image_path = infographic.render_to_temp_file(extraction, analysis)
    twilio_dispatcher.send_image(from_number, image_path, cleanup=False)


def _handle_followup(phone_number: str, keyword: str) -> str:
    """Produce the response text for a SOLAR/FIXED/SUBSIDY/CLIFF reply.

    Does NOT go through the daemon-thread flow — follow-ups are pure
    function calls on already-computed analysis, so we can return them
    inline in the webhook response within milliseconds.
    """
    cached = last_bill_cache.get_last_bill(phone_number)
    if cached is None:
        return compose_no_recent_bill_response()

    if cached["follow_up_count"] >= FOLLOWUP_LIMIT:
        return compose_followup_limit_reached_response()

    composer_map = {
        "SOLAR": compose_solar_followup,
        "FIXED": compose_fixed_followup,
        "SUBSIDY": compose_subsidy_followup,
        "CLIFF": compose_cliff_followup,
    }
    composer = composer_map[keyword]
    text = composer(cached["extraction"], cached["analysis"])
    last_bill_cache.increment_follow_up(phone_number)
    return text


def _process_bill_with_error_isolation(
    from_number: str, media_url: str, message_body: str = ""
) -> None:
    """Thread target — catches anything ``process_bill_and_dispatch`` missed
    so a stray exception never kills the worker thread silently.
    """
    try:
        process_bill_and_dispatch(from_number, media_url, message_body)
    except Exception:  # noqa: BLE001
        logger.exception(
            "process_bill_and_dispatch thread crashed for %s", from_number
        )


# =============================================================================
# Helpers
# =============================================================================


def _twiml(body: str, status: int = 200) -> tuple[str, int, dict]:
    """Minimal TwiML response — Twilio wants XML back on webhook hits."""
    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        "<Response>"
        f"<Message><Body>{_xml_escape(body)}</Body></Message>"
        "</Response>"
    )
    return xml, status, {"Content-Type": "application/xml; charset=utf-8"}


def _xml_escape(s: str) -> str:
    return (
        s.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    port = int(os.environ.get("PORT", "5001"))
    debug = os.environ.get("FLASK_ENV", "development") == "development"
    create_app(validate_env=True).run(host="0.0.0.0", port=port, debug=debug)

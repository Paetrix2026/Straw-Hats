"""Per-bill infographic — Pillow-drawn PNG summary card.

Session 6 priority 2. ``render_infographic(extraction, analysis)`` returns
PNG bytes; ``render_to_temp_file`` writes them to ``MEDIA_TMP_DIR`` so the
Twilio dispatcher can hand the public URL to WhatsApp.

Layout choice: draw from scratch rather than overlaying a template image.
Three reasons:
1. Shipping a template PNG into the repo is a binary-asset headache.
2. Draw-from-scratch renders identical for every persona layout — no missed
   anchor-point bugs.
3. We only need 5-7 values on screen; a templated background adds no pitch
   value beyond what a clean Pillow-drawn card already gives.

Layout variants per ``chosen_template``:
- ``non_gj`` — Total bill, units, FCT alert if fires, solar payback headline.
- ``gj`` (enrolled, under 200) — Subsidy received (prominent), units vs
  entitlement, cliff warning if close.
- ``gj`` (over 200) — "Subsidy LOST this month" red banner, full bill owed,
  reduction prescription.
"""
from __future__ import annotations

import io
import logging
import uuid
from pathlib import Path
from typing import Any

from backend.analysis.models import BillExtraction
from backend.analysis.orchestrator import AnalysisResult
from backend.output.kannada_tts import MEDIA_TMP_DIR

logger = logging.getLogger(__name__)


# Card dimensions — WhatsApp renders squarer images nicely on mobile.
WIDTH = 1080
HEIGHT = 1350

# Colour palette (hex → RGB tuples). Uses MESCOM brand green + neutral
# grays; red reserved for cliff-crossed states.
BRAND_GREEN = (14, 113, 82)
BRAND_GREEN_DARK = (7, 64, 46)
TEXT_DARK = (28, 32, 40)
TEXT_MUTED = (102, 112, 133)
CARD_BG = (247, 249, 252)
RED = (199, 32, 46)
YELLOW = (236, 184, 23)
WHITE = (255, 255, 255)


def render_infographic(
    extraction: BillExtraction,
    analysis: AnalysisResult,
) -> bytes:
    """Draw the summary card and return PNG bytes.

    Safe to call in tests — Pillow is pure Python + pre-built wheels, no
    network.
    """
    from PIL import Image, ImageDraw, ImageFont

    img = Image.new("RGB", (WIDTH, HEIGHT), CARD_BG)
    draw = ImageDraw.Draw(img)

    # Fonts — fall back through a short list in case any one isn't on the
    # host. DejaVu ships with Pillow's manylinux wheels; arial.ttf is a
    # Windows fallback.
    title_font = _load_font(size=64, weight="bold")
    header_font = _load_font(size=40, weight="bold")
    body_font = _load_font(size=32)
    big_font = _load_font(size=84, weight="bold")
    small_font = _load_font(size=24)

    # --- Header bar ---
    draw.rectangle([0, 0, WIDTH, 140], fill=BRAND_GREEN)
    draw.text((60, 38), "VidyutMitra", fill=WHITE, font=title_font)
    draw.text((60, 98), "MESCOM Bill Report", fill=WHITE, font=small_font)

    # --- Body ---
    y = 200
    units = extraction.units_consumed or 0
    is_gj = bool(extraction.is_gruha_jyothi_beneficiary)
    crossed_cliff = is_gj and units > 200

    if is_gj and not crossed_cliff:
        y = _draw_gj_under_card(draw, y, extraction, analysis,
                                big_font, header_font, body_font, small_font)
    elif crossed_cliff:
        y = _draw_gj_cliff_card(draw, y, extraction, analysis,
                                big_font, header_font, body_font, small_font)
    else:
        y = _draw_non_gj_card(draw, y, extraction, analysis,
                              big_font, header_font, body_font, small_font)

    # --- Footer strip ---
    draw.rectangle([0, HEIGHT - 90, WIDTH, HEIGHT], fill=BRAND_GREEN_DARK)
    draw.text(
        (60, HEIGHT - 64),
        "KERC Tariff Order 2025 · CEA Database v21.0 · MNRE PM Surya Ghar",
        fill=WHITE, font=small_font,
    )

    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return buf.getvalue()


def render_to_temp_file(
    extraction: BillExtraction,
    analysis: AnalysisResult,
) -> str:
    """Render and write to a unique path in ``MEDIA_TMP_DIR``. Returns path."""
    png_bytes = render_infographic(extraction, analysis)
    filename = f"card_{uuid.uuid4().hex[:12]}.png"
    filepath = MEDIA_TMP_DIR / filename
    filepath.write_bytes(png_bytes)
    return str(filepath)


# =============================================================================
# Card layouts
# =============================================================================


def _draw_non_gj_card(
    draw: Any, y: int,
    extraction: BillExtraction,
    analysis: AnalysisResult,
    big_font: Any, header_font: Any, body_font: Any, small_font: Any,
) -> int:
    roi = analysis.solar_roi
    fct = analysis.fct

    draw.text((60, y), "Total Bill", fill=TEXT_MUTED, font=body_font)
    draw.text((60, y + 40),
              f"Rs. {analysis.net_bill_amount:,.0f}",
              fill=TEXT_DARK, font=big_font)
    y += 160
    draw.text((60, y),
              f"{extraction.units_consumed} units used  ·  "
              f"{extraction.sanctioned_load_kw:.0f} kW sanctioned",
              fill=TEXT_MUTED, font=body_font)
    y += 80

    # Fixed Charge Trap callout (or green check).
    if fct.fires:
        _rounded_panel(draw, y, h=170, fill=(252, 243, 236), border=YELLOW)
        draw.text((90, y + 20), "⚠  Fixed Charge Alert",
                  fill=TEXT_DARK, font=header_font)
        draw.text(
            (90, y + 80),
            f"Rs. {fct.excess_monthly_cost:.0f}/month extra  ·  "
            f"Rs. {fct.excess_annual_cost:,.0f}/year",
            fill=TEXT_DARK, font=body_font,
        )
    else:
        _rounded_panel(draw, y, h=170, fill=(234, 249, 242), border=BRAND_GREEN)
        draw.text((90, y + 20), "✓  Sanctioned load appropriate",
                  fill=TEXT_DARK, font=header_font)
    y += 200

    # Solar ROI — the headline.
    _rounded_panel(draw, y, h=360, fill=BRAND_GREEN, border=None)
    draw.text((90, y + 20), "☀  Rooftop Solar ROI",
              fill=WHITE, font=header_font)
    draw.text(
        (90, y + 90),
        f"{roi.system_kw} kW system",
        fill=WHITE, font=body_font,
    )
    draw.text(
        (90, y + 140),
        f"Net cost: Rs. {roi.net_cost:,.0f}",
        fill=WHITE, font=body_font,
    )
    draw.text(
        (90, y + 190),
        f"Payback: {roi.payback_years} years",
        fill=WHITE, font=body_font,
    )
    draw.text(
        (90, y + 240),
        f"25-yr savings: ~Rs. {roi.lifetime_net_savings_flat / 1_00_000:.1f} lakh",
        fill=WHITE, font=body_font,
    )
    draw.text(
        (90, y + 290),
        f"CO2 avoided: {roi.co2_offset_tonnes_per_year:.2f} tonnes/year",
        fill=WHITE, font=body_font,
    )
    y += 400
    return y


def _draw_gj_under_card(
    draw: Any, y: int,
    extraction: BillExtraction,
    analysis: AnalysisResult,
    big_font: Any, header_font: Any, body_font: Any, small_font: Any,
) -> int:
    gj = analysis.gj_visibility
    subsidy = gj.monthly_subsidy_received if gj else 0.0

    draw.text((60, y), "Gruha Jyothi paid on your behalf",
              fill=TEXT_MUTED, font=body_font)
    draw.text((60, y + 40),
              f"Rs. {subsidy:,.0f}",
              fill=BRAND_GREEN, font=big_font)
    y += 160

    draw.text((60, y),
              f"You paid: Rs. {analysis.net_bill_amount:,.0f}",
              fill=TEXT_DARK, font=header_font)
    y += 70
    draw.text((60, y),
              f"{extraction.units_consumed} of {gj.entitlement_units:.0f} "
              f"entitled units used",
              fill=TEXT_MUTED, font=body_font)
    y += 80

    # Cliff warning if close to 200.
    units = extraction.units_consumed or 0
    util_of_200 = (units / 200.0) * 100
    if util_of_200 >= 80:
        _rounded_panel(draw, y, h=200, fill=(253, 246, 232), border=YELLOW)
        draw.text((90, y + 20), "⚠  Approaching 200-unit cliff",
                  fill=TEXT_DARK, font=header_font)
        draw.text(
            (90, y + 80),
            f"{units}/200 units ({util_of_200:.0f}%)",
            fill=TEXT_DARK, font=body_font,
        )
        draw.text(
            (90, y + 130),
            "Crossing 200 loses the entire subsidy this month",
            fill=TEXT_DARK, font=body_font,
        )
        y += 230
    else:
        _rounded_panel(draw, y, h=170, fill=(234, 249, 242), border=BRAND_GREEN)
        draw.text((90, y + 20), "✓  Safely below the 200-unit cap",
                  fill=TEXT_DARK, font=header_font)
        draw.text(
            (90, y + 80),
            f"{units}/200 units ({util_of_200:.0f}%)",
            fill=TEXT_DARK, font=body_font,
        )
        y += 200

    # Total subsidy received since enrollment.
    if gj and gj.estimated_total_subsidy_received:
        draw.text(
            (60, y),
            f"Total subsidy since enrollment: ~Rs. "
            f"{gj.estimated_total_subsidy_received:,.0f}",
            fill=TEXT_DARK, font=body_font,
        )
        y += 60

    return y


def _draw_gj_cliff_card(
    draw: Any, y: int,
    extraction: BillExtraction,
    analysis: AnalysisResult,
    big_font: Any, header_font: Any, body_font: Any, small_font: Any,
) -> int:
    units = extraction.units_consumed or 0

    # Red banner: subsidy lost.
    _rounded_panel(draw, y, h=220, fill=RED, border=None)
    draw.text((90, y + 20), "🚨  Subsidy LOST this month",
              fill=WHITE, font=header_font)
    draw.text(
        (90, y + 90),
        f"You used {units} units — crossed the 200-unit cap.",
        fill=WHITE, font=body_font,
    )
    draw.text(
        (90, y + 140),
        f"Full bill payable: Rs. {analysis.net_bill_amount:,.0f}",
        fill=WHITE, font=body_font,
    )
    y += 260

    # Recovery path.
    _rounded_panel(draw, y, h=220, fill=CARD_BG, border=BRAND_GREEN)
    draw.text((90, y + 20), "Path back to Rs. 0 next month:",
              fill=TEXT_DARK, font=header_font)
    draw.text(
        (90, y + 90),
        "• Stay under 200 units — next month resets",
        fill=TEXT_DARK, font=body_font,
    )
    draw.text(
        (90, y + 140),
        "• AC thermostat 24 °C, shorter geyser runs",
        fill=TEXT_DARK, font=body_font,
    )
    y += 250

    return y


# =============================================================================
# Helpers
# =============================================================================


def _rounded_panel(draw: Any, y: int, h: int, fill: tuple, border) -> None:
    """Draw a rounded-rect panel across the body width at y."""
    from PIL import ImageDraw  # noqa: F401 — Pillow handles rounded rects natively
    x0, x1 = 60, WIDTH - 60
    draw.rounded_rectangle(
        [x0, y, x1, y + h], radius=20, fill=fill,
        outline=border, width=4 if border else 0,
    )


_FONT_CACHE: dict[tuple, Any] = {}


def _load_font(size: int, weight: str = "regular") -> Any:
    """Load a TrueType font, falling back through platform-typical paths."""
    from PIL import ImageFont

    key = (size, weight)
    if key in _FONT_CACHE:
        return _FONT_CACHE[key]

    candidates = [
        # DejaVu ships with Pillow wheels on most platforms.
        "DejaVuSans-Bold.ttf" if weight == "bold" else "DejaVuSans.ttf",
        # Windows fallback.
        "arialbd.ttf" if weight == "bold" else "arial.ttf",
        # macOS fallback.
        "Helvetica.ttf",
    ]
    for name in candidates:
        try:
            font = ImageFont.truetype(name, size)
            _FONT_CACHE[key] = font
            return font
        except (OSError, IOError):
            continue

    # Last-resort: Pillow's built-in bitmap font (small, but always available).
    font = ImageFont.load_default()
    _FONT_CACHE[key] = font
    return font

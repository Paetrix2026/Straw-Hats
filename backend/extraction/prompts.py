"""Gemini extraction prompts — source: tech_spec_v1_1 §4.2 and §4.4.

Both prompts are versioned here rather than inlined in the client so that
Session 2+ can iterate on prompt wording without touching call-site code.
"""
from __future__ import annotations


EXTRACTION_PROMPT = """You are an expert at reading Indian electricity bills. Analyze this image of a MESCOM (Mangalore Electricity Supply Company) electricity bill.

Extract the following fields and return ONLY a valid JSON object. No markdown, no explanation, no preamble.

IDENTIFICATION:
- is_mescom_bill (boolean): Is this a MESCOM electricity bill? Set false if different utility, non-bill document, or unreadable.
- extraction_confidence (float 0.0-1.0): Your self-reported confidence.
- consumer_name (string): Consumer name as printed.
- rr_number (string): RR Number / Account Number / Consumer Number.
- tariff_category (string): Tariff code (e.g., "LT-1", "2LT1", "LT-2(a)"). Normalize "2LT1" to "LT-1".

BILLING PERIOD:
- billing_period_start (string): Period start in YYYY-MM-DD.
- billing_period_end (string): Period end in YYYY-MM-DD. Dates on bills may be in DD/MM/YYYY format - convert to ISO.
- billing_period_days (integer): Number of days in billing period.

CONSUMPTION AND LOAD:
- sanctioned_load_kw (float): Sanctioned load in kW. Bills may say "2.99KW+0HP" etc. - extract the kW value.
- previous_reading (integer): Previous meter reading.
- current_reading (integer): Current meter reading.
- units_consumed (integer): Units consumed in this period.

PRE-SUBSIDY BILL COMPONENTS (Sub-Total-1 on the bill):
- energy_charges (float): Energy/consumption charges in Rs.
- fixed_charges (float): Fixed charges in Rs.
- pg_surcharge (float): P&G surcharge in Rs. Set 0.0 if not present.
- electricity_tax (float): Electricity tax / tax @ 9% in Rs.
- fppca (float): FPPCA (Fuel and Power Purchase Cost Adjustment) in Rs. Set 0.0 if not present.
- other_charges (float): Sum of any other line items (arrears, adjustments) in Rs.
- subtotal_1_before_subsidy (float): Total of all pre-subsidy charges. On GJ bills this is Sub-Total-1.

GRUHA JYOTHI (CRITICAL):
MESCOM bills with Gruha Jyothi show the bill TWICE - once as pre-subsidy (Sub-Total-1) and once as subsidy amount (Sub-Total-2). Net bill = Sub-Total-1 - Sub-Total-2.

- is_gruha_jyothi_beneficiary (boolean): True if the bill has a "Gruha Jyothi Subsidy" / "GJ" section with a Sub-Total-2.
- gjs_registration_date (string): GJS Reg Date in YYYY-MM-DD, or null.
- historical_avg_baseline (float): "Average (FY XX-XX)" field showing historical consumption baseline, or null.
- entitlement_units (float): "Entitlement Unit" field - the subsidized unit allowance, or null.
- units_eligible_for_subsidy (float): Units covered by subsidy this month, or null.
- units_chargeable (float): Units the consumer actually pays for (0 if fully covered), or null.
- gruha_jyothi_subsidy_amount (float): Sub-Total-2 amount in Rs., or null.

NET BILL:
- net_bill_amount (float): What the consumer actually pays. For non-GJ = Sub-Total-1. For GJ = Sub-Total-1 - Sub-Total-2 (usually 0).
- due_date (string): Due date in YYYY-MM-DD. Convert from DD/MM/YYYY if needed.
- arrears (float): Arrears in Rs., 0.0 if none.

RULES:
1. If a field is not visible or unreadable, set it to null. Do not guess.
2. Amounts are in Indian Rupees. Do not include currency symbols in numeric fields.
3. Dates may be in DD/MM/YYYY format on the bill - always convert to ISO YYYY-MM-DD.
4. Bills contain Kannada text; extract numeric values regardless of language.
5. If not a MESCOM bill, set is_mescom_bill to false and other fields to null.
6. For GJ bills: the number after "Bill for Consumed Units" / "Sub-Total-1" is pre-subsidy. The number after "Gruha Jyothi Subsidy" / "Sub-Total-2" is the subsidy. "Current Bill Amt" or "Net Bill Amt" is what the consumer pays.
7. CRITICAL OCR HINTS: Be extremely careful with similar digits (like 5 vs 8, 1 vs 7, 0 vs 6) often found in low-quality bill photos. Double-check the math (e.g. `current_reading - previous_reading == units_consumed`) to verify your extraction is correct.

Return ONLY the JSON object."""


RETRY_PROMPT_TEMPLATE = """Your previous extraction of this MESCOM electricity bill had these issues:
{issues_list}

Please re-examine the bill image carefully, paying special attention to the fields listed above.
Return the complete JSON object again with corrected values.

If a field is genuinely unreadable, set it to null - do not guess.

Return ONLY the JSON object."""


def build_retry_prompt(issues: list[str]) -> str:
    """Compose the retry prompt from a validator issues list."""
    issues_list = "\n".join(f"- {i}" for i in issues) if issues else "- (unspecified)"
    return RETRY_PROMPT_TEMPLATE.format(issues_list=issues_list)

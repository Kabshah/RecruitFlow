"""
timezone_rules.py — Maps a job location string (country / city)
to the correct IANA timezone and office-hours window for interview scheduling.

Rules (from CLAUDE.md §2 and user requirement):
  - Slots are Mon–Fri only.
  - Slots must fall AFTER lunch (default: 14:00–17:00 local office time).
  - Lunch window: 13:00–14:00 (configurable per locale below).
  - Slot duration: 60 min, buffer between slots: 15 min (from CalendarManager).

If a location cannot be matched, the DEFAULT_TIMEZONE env-var is used with
standard 9-17 window but slots still restricted to post-lunch.
"""

from __future__ import annotations

import re

# ---------------------------------------------------------------------------
# Location rules: each entry maps a regex pattern (matched case-insensitively
# against the job location string) to timezone + office window.
# ---------------------------------------------------------------------------

LOCATION_RULES: list[dict] = [
    # ── Pakistan ────────────────────────────────────────────────────────────
    {
        "pattern": r"\bpakistan\b|\bkarachi\b|\blahore\b|\bislamabad\b|\brawalpindi\b|\bfaisalabad\b|\bpeshawar\b|\bquetta\b|\bmultan\b|\bpk\b",
        "timezone": "Asia/Karachi",
        "work_start": 9,
        "work_end": 17,
        "lunch_start": 13,
        "lunch_end": 14,
    },
    # ── India ───────────────────────────────────────────────────────────────
    {
        "pattern": r"\bindia\b|\bmumbai\b|\bdelhi\b|\bnew delhi\b|\bbangalore\b|\bchennai\b|\bhyderabad\b|\bpune\b|\bkolkata\b|\bin\b",
        "timezone": "Asia/Kolkata",
        "work_start": 9,
        "work_end": 17,
        "lunch_start": 13,
        "lunch_end": 14,
    },
    # ── United Arab Emirates ────────────────────────────────────────────────
    {
        "pattern": r"\buae\b|\bdubai\b|\babu dhabi\b|\bsharjah\b|\bajman\b|\bunited arab emirates\b",
        "timezone": "Asia/Dubai",
        "work_start": 9,
        "work_end": 17,
        "lunch_start": 13,
        "lunch_end": 14,
    },
    # ── Saudi Arabia ────────────────────────────────────────────────────────
    {
        "pattern": r"\bsaudi\b|\briyadh\b|\bjeddah\b|\bmecca\b|\bmedina\b|\bksa\b",
        "timezone": "Asia/Riyadh",
        "work_start": 8,
        "work_end": 16,
        "lunch_start": 12,
        "lunch_end": 13,
    },
    # ── United Kingdom ──────────────────────────────────────────────────────
    {
        "pattern": r"\bunited kingdom\b|\buk\b|\blondon\b|\bmanchester\b|\bbirmingham\b|\bleeds\b|\bglasgow\b|\bedinburgh\b|\bbristol\b",
        "timezone": "Europe/London",
        "work_start": 9,
        "work_end": 17,
        "lunch_start": 12,
        "lunch_end": 13,
    },
    # ── Germany ─────────────────────────────────────────────────────────────
    {
        "pattern": r"\bgermany\b|\bberlin\b|\bmunich\b|\bhamburg\b|\bfrankfurt\b|\bde\b",
        "timezone": "Europe/Berlin",
        "work_start": 9,
        "work_end": 17,
        "lunch_start": 12,
        "lunch_end": 13,
    },
    # ── France ──────────────────────────────────────────────────────────────
    {
        "pattern": r"\bfrance\b|\bparis\b|\blyon\b|\bmarseille\b|\bfr\b",
        "timezone": "Europe/Paris",
        "work_start": 9,
        "work_end": 18,
        "lunch_start": 12,
        "lunch_end": 14,  # French lunch is 2 hrs
    },
    # ── USA – East Coast ────────────────────────────────────────────────────
    {
        "pattern": r"\bnew york\b|\bnyc\b|\bboston\b|\bwashington\b|\batlanta\b|\bmiami\b|\bcharlotte\b|\bphiladelphia\b|\best\b",
        "timezone": "America/New_York",
        "work_start": 9,
        "work_end": 17,
        "lunch_start": 12,
        "lunch_end": 13,
    },
    # ── USA – Central ───────────────────────────────────────────────────────
    {
        "pattern": r"\bchicago\b|\bdallas\b|\bhouston\b|\baustin\b|\bsan antonio\b|\bcst\b",
        "timezone": "America/Chicago",
        "work_start": 9,
        "work_end": 17,
        "lunch_start": 12,
        "lunch_end": 13,
    },
    # ── USA – West Coast ────────────────────────────────────────────────────
    {
        "pattern": r"\bsan francisco\b|\blos angeles\b|\bseattle\b|\bportland\b|\blas vegas\b|\bla\b|\bsf\b|\bpst\b",
        "timezone": "America/Los_Angeles",
        "work_start": 9,
        "work_end": 17,
        "lunch_start": 12,
        "lunch_end": 13,
    },
    # ── Canada ──────────────────────────────────────────────────────────────
    {
        "pattern": r"\bcanada\b|\btoronto\b|\bvancouver\b|\bmontreal\b|\bcalgary\b|\bottawa\b|\bca\b",
        "timezone": "America/Toronto",
        "work_start": 9,
        "work_end": 17,
        "lunch_start": 12,
        "lunch_end": 13,
    },
    # ── Australia (default in CLAUDE.md) ────────────────────────────────────
    {
        "pattern": r"\baustralia\b|\bsydney\b|\bmelbourne\b|\bbrisbane\b|\bperth\b|\badelaide\b|\bau\b|\bnsw\b|\bvic\b|\bqld\b",
        "timezone": "Australia/Sydney",
        "work_start": 9,
        "work_end": 17,
        "lunch_start": 12,
        "lunch_end": 13,
    },
    # ── Singapore ───────────────────────────────────────────────────────────
    {
        "pattern": r"\bsingapore\b|\bsg\b",
        "timezone": "Asia/Singapore",
        "work_start": 9,
        "work_end": 18,
        "lunch_start": 12,
        "lunch_end": 13,
    },
    # ── Malaysia ────────────────────────────────────────────────────────────
    {
        "pattern": r"\bmalaysia\b|\bkuala lumpur\b|\bkl\b|\bmy\b",
        "timezone": "Asia/Kuala_Lumpur",
        "work_start": 9,
        "work_end": 17,
        "lunch_start": 13,
        "lunch_end": 14,
    },
    # ── Remote (fall through to default) ─────────────────────────────────────
    {
        "pattern": r"\bremote\b|\bwfh\b|\bwork from home\b|\banywhere\b|\bglobal\b",
        "timezone": None,   # signals: use DEFAULT_TIMEZONE
        "work_start": 9,
        "work_end": 17,
        "lunch_start": 12,
        "lunch_end": 13,
    },
]

# ---------------------------------------------------------------------------
# Fallback / default
# ---------------------------------------------------------------------------

DEFAULT_OFFICE_HOURS = {
    "work_start": 9,
    "work_end": 17,
    "lunch_start": 12,
    "lunch_end": 13,
}


def resolve_location(location: str | None, fallback_tz: str = "Australia/Sydney") -> dict:
    """
    Given a job location string (e.g. "Karachi, Pakistan" or "Remote / Sydney, AU"),
    returns a dict with:
        timezone    : str   — IANA timezone name (e.g. "Asia/Karachi")
        work_start  : int   — hour (24-hr) office opens
        work_end    : int   — hour (24-hr) office closes
        lunch_start : int   — hour lunch begins (slots before this are ok if work_start <= slot < lunch_start)
        lunch_end   : int   — hour lunch ends   (post-lunch slots start here)

    The function tries each rule in order; first match wins.
    If nothing matches (or location is None/empty), falls back to `fallback_tz`
    with DEFAULT_OFFICE_HOURS.
    """
    if not location:
        return {"timezone": fallback_tz, **DEFAULT_OFFICE_HOURS}

    loc_lower = location.lower()

    for rule in LOCATION_RULES:
        if re.search(rule["pattern"], loc_lower):
            tz = rule["timezone"] or fallback_tz
            return {
                "timezone": tz,
                "work_start": rule["work_start"],
                "work_end": rule["work_end"],
                "lunch_start": rule["lunch_start"],
                "lunch_end": rule["lunch_end"],
            }

    # Nothing matched → fall back
    return {"timezone": fallback_tz, **DEFAULT_OFFICE_HOURS}

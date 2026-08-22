"""
Patient data service layer.
Fetches scoped data from Supabase and transforms it for the Passport response.
Falls back to mock data when Supabase is unavailable (for demo/dev).
"""
import os
import logging
from datetime import datetime

logger = logging.getLogger("curatrack.patient_data")

# Try to initialize Supabase client
_supabase = None
try:
    from supabase import create_client
    SUPABASE_URL = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    if SUPABASE_URL and SUPABASE_KEY:
        _supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        logger.info("Supabase client initialized")
    else:
        logger.warning("Supabase credentials not configured, using mock data")
except Exception as e:
    logger.warning("Supabase init failed (%s), using mock data", e)


# ─── Mock data for demo/dev ────────────────────────────────────────────
MOCK_DATA = {
    "diagnoses": [
        {"name": "Essential Hypertension", "date": "2026-03-15", "status": "Active"},
        {"name": "Type 2 Diabetes Mellitus", "date": "2026-02-10", "status": "Active"},
        {"name": "Seasonal Allergic Rhinitis", "date": "2026-01-22", "status": "Resolved"},
        {"name": "Acute Bronchitis", "date": "2025-12-05", "status": "Resolved"},
    ],
    "medications": [
        {"name": "Lisinopril", "dose": "10mg", "frequency": "Once daily", "active": True},
        {"name": "Metformin", "dose": "500mg", "frequency": "Twice daily", "active": True},
        {"name": "Cetirizine", "dose": "10mg", "frequency": "As needed", "active": True},
        {"name": "Amoxicillin", "dose": "500mg", "frequency": "Three times daily", "active": False},
    ],
    "allergies": [
        {"allergen": "Penicillin", "severity": "Severe", "reaction": "Anaphylaxis"},
        {"allergen": "Shellfish", "severity": "Moderate", "reaction": "Hives, Swelling"},
    ],
    "vitals": {
        "heart_rate": {"value": 72, "unit": "bpm", "timestamp": "2026-04-18T04:30:00Z"},
        "blood_pressure": {"systolic": 128, "diastolic": 82, "unit": "mmHg", "timestamp": "2026-04-18T04:30:00Z"},
        "spo2": {"value": 97, "unit": "%", "timestamp": "2026-04-18T04:30:00Z"},
        "temperature": {"value": 98.4, "unit": "°F", "timestamp": "2026-04-18T04:30:00Z"},
        "blood_glucose": {"value": 110, "unit": "mg/dL", "timestamp": "2026-04-18T04:30:00Z"},
    },
    "insurance": {
        "provider": "Blue Cross Blue Shield",
        "plan": "Gold PPO",
        "status": "Active",
        "member_id": "BCBS-2026-48291",
        "valid_until": "2026-12-31",
    },
}


def _get_mock_diagnoses() -> list[dict]:
    return MOCK_DATA["diagnoses"][:3]  # last 3


def _get_mock_medications() -> list[dict]:
    return [m for m in MOCK_DATA["medications"] if m.get("active", False)]


def _get_mock_allergies() -> list[dict]:
    return MOCK_DATA["allergies"]


def _get_mock_vitals() -> dict | None:
    return MOCK_DATA["vitals"]


def _get_mock_insurance() -> dict | None:
    return MOCK_DATA["insurance"]


# ─── Supabase fetchers ─────────────────────────────────────────────────

def _fetch_diagnoses_from_supabase(patient_id: str) -> list[dict]:
    try:
        result = _supabase.table("diagnoses") \
            .select("*") \
            .eq("patient_id", patient_id) \
            .order("date", desc=True) \
            .limit(3) \
            .execute()
        return result.data or []
    except Exception as e:
        logger.error("Failed to fetch diagnoses: %s", e)
        return []


def _fetch_medications_from_supabase(patient_id: str) -> list[dict]:
    try:
        result = _supabase.table("medications") \
            .select("*") \
            .eq("patient_id", patient_id) \
            .eq("active", True) \
            .execute()
        return result.data or []
    except Exception as e:
        logger.error("Failed to fetch medications: %s", e)
        return []


def _fetch_allergies_from_supabase(patient_id: str) -> list[dict]:
    try:
        result = _supabase.table("allergies") \
            .select("*") \
            .eq("patient_id", patient_id) \
            .execute()
        return result.data or []
    except Exception as e:
        logger.error("Failed to fetch allergies: %s", e)
        return []


def _fetch_vitals_from_supabase(patient_id: str) -> dict | None:
    try:
        result = _supabase.table("vitals") \
            .select("*") \
            .eq("patient_id", patient_id) \
            .order("timestamp", desc=True) \
            .limit(1) \
            .execute()
        return result.data[0] if result.data else None
    except Exception as e:
        logger.error("Failed to fetch vitals: %s", e)
        return None


def _fetch_insurance_from_supabase(patient_id: str) -> dict | None:
    try:
        result = _supabase.table("insurance") \
            .select("*") \
            .eq("patient_id", patient_id) \
            .limit(1) \
            .execute()
        return result.data[0] if result.data else None
    except Exception as e:
        logger.error("Failed to fetch insurance: %s", e)
        return None


# ─── Public API ─────────────────────────────────────────────────────────

def get_scoped_patient_data(patient_id: str, patient_name: str, scope: list[str]) -> dict:
    """
    Fetch ONLY the fields present in scope.
    Returns a shaped response dict — never raw DB rows.
    """
    use_mock = _supabase is None

    response: dict = {
        "patient_name": patient_name or "",
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "version": "v1",
    }

    if "diagnoses" in scope:
        if use_mock:
            raw = _get_mock_diagnoses()
        else:
            raw = _fetch_diagnoses_from_supabase(patient_id)
        response["last_3_diagnoses"] = raw if raw else []

    if "medications" in scope:
        if use_mock:
            raw = _get_mock_medications()
        else:
            raw = _fetch_medications_from_supabase(patient_id)
        response["active_medications"] = raw if raw else []

    if "allergies" in scope:
        if use_mock:
            raw = _get_mock_allergies()
        else:
            raw = _fetch_allergies_from_supabase(patient_id)
        response["allergies"] = raw if raw else []

    if "vitals" in scope:
        if use_mock:
            raw = _get_mock_vitals()
        else:
            raw = _fetch_vitals_from_supabase(patient_id)
        response["last_lab_values"] = raw if raw else None

    if "insurance" in scope:
        if use_mock:
            raw = _get_mock_insurance()
        else:
            raw = _fetch_insurance_from_supabase(patient_id)
        response["insurance_status"] = raw if raw else None

    return response

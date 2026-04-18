"""
Save service — persists verified medical data to Supabase.
Falls back to local JSON file when Supabase is unavailable (dev mode).
"""
import os
import json
import logging
from datetime import datetime

logger = logging.getLogger("curatrack.save")

# Try Supabase client
_supabase = None
try:
    from supabase import create_client
    SUPABASE_URL = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    if SUPABASE_URL and SUPABASE_KEY:
        _supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        logger.info("Save service: Supabase client initialized")
    else:
        logger.warning("Save service: Supabase credentials not set, using local fallback")
except Exception as e:
    logger.warning("Save service: Supabase init failed (%s), using local fallback", e)


def save_confirmed_data(
    patient_id: str,
    medications: list[dict],
    lab_results: list[dict],
    doctor_notes: dict,
) -> dict:
    """
    Save verified/confirmed ingestion data.
    Returns summary of what was saved.
    """
    timestamp = datetime.utcnow().isoformat() + "Z"

    if _supabase:
        return _save_to_supabase(patient_id, medications, lab_results, doctor_notes, timestamp)
    else:
        return _save_to_local(patient_id, medications, lab_results, doctor_notes, timestamp)


def _save_to_supabase(
    patient_id: str,
    medications: list[dict],
    lab_results: list[dict],
    doctor_notes: dict,
    timestamp: str,
) -> dict:
    """Persist to Supabase tables."""
    saved = {"medications": 0, "lab_results": 0, "doctor_notes": 0}

    # Save medications
    if medications:
        rows = []
        for med in medications:
            rows.append({
                "patient_id": patient_id,
                "name": med.get("name", ""),
                "dosage": med.get("dosage", ""),
                "frequency": med.get("frequency", ""),
                "time": med.get("time", ""),
                "reason": med.get("reason", ""),
                "source": "ocr_ingestion",
                "created_at": timestamp,
                "active": True,
            })
        try:
            _supabase.table("medications").insert(rows).execute()
            saved["medications"] = len(rows)
        except Exception as e:
            logger.error("Failed to save medications: %s", e)

    # Save lab results
    if lab_results:
        rows = []
        for lab in lab_results:
            rows.append({
                "patient_id": patient_id,
                "test": lab.get("test", ""),
                "value": lab.get("value", ""),
                "unit": lab.get("unit", ""),
                "status": lab.get("status", "unknown"),
                "source": "ocr_ingestion",
                "created_at": timestamp,
            })
        try:
            _supabase.table("lab_results").insert(rows).execute()
            saved["lab_results"] = len(rows)
        except Exception as e:
            logger.error("Failed to save lab results: %s", e)

    # Save doctor notes
    if doctor_notes and doctor_notes.get("summary"):
        try:
            _supabase.table("doctor_notes").insert({
                "patient_id": patient_id,
                "summary": doctor_notes.get("summary", ""),
                "source": "ocr_ingestion",
                "created_at": timestamp,
            }).execute()
            saved["doctor_notes"] = 1
        except Exception as e:
            logger.error("Failed to save doctor notes: %s", e)

    logger.info("Saved to Supabase: %s", saved)
    return saved


def _save_to_local(
    patient_id: str,
    medications: list[dict],
    lab_results: list[dict],
    doctor_notes: dict,
    timestamp: str,
) -> dict:
    """Dev fallback: save to local JSON file."""
    record = {
        "patient_id": patient_id,
        "saved_at": timestamp,
        "medications": medications,
        "lab_results": lab_results,
        "doctor_notes": doctor_notes,
    }

    os.makedirs("data", exist_ok=True)
    filepath = f"data/ingestion_{patient_id}_{timestamp.replace(':', '-')}.json"

    with open(filepath, "w") as f:
        json.dump(record, f, indent=2)

    saved = {
        "medications": len(medications),
        "lab_results": len(lab_results),
        "doctor_notes": 1 if doctor_notes.get("summary") else 0,
    }

    logger.info("Saved to local file %s: %s", filepath, saved)
    return saved

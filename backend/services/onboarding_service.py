"""
Onboarding service layer — persists patient, doctor, and admin onboarding profiles.
Handles verification status tracking and one-time onboarding completion.
"""
import os
import json
import logging
from datetime import datetime

logger = logging.getLogger("curatrack.onboarding")

_supabase = None
try:
    from supabase import create_client
    SUPABASE_URL = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    if SUPABASE_URL and SUPABASE_KEY:
        _supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        logger.info("Onboarding service: Supabase client initialized")
    else:
        logger.warning("Onboarding service: Supabase credentials not set, using local fallback")
except Exception as e:
    logger.warning("Onboarding service: Supabase init failed (%s), using local fallback", e)

# In-memory storage for dev mode / local fallback
_local_onboarding_db = {
    "patients": {},
    "doctors": {},
    "admins": {},
    "verifications": {}
}


def save_patient_onboarding(user_id: str, payload: dict) -> dict:
    """Save patient onboarding data and set profile_completed = True."""
    timestamp = datetime.utcnow().isoformat() + "Z"
    record = {
        "user_id": user_id,
        "personal_info": payload.get("personal_info", {}),
        "medical_info": payload.get("medical_info", {}),
        "insurance_info": payload.get("insurance_info", {}),
        "emergency_contact": payload.get("emergency_contact", {}),
        "government_schemes": payload.get("government_schemes", {}),
        "profile_completed": True,
        "updated_at": timestamp
    }

    if _supabase:
        try:
            _supabase.table("profiles").upsert({
                "id": user_id,
                "name": payload.get("personal_info", {}).get("name", ""),
                "role": "patient",
                "gender": payload.get("personal_info", {}).get("gender", ""),
                "blood_group": payload.get("medical_info", {}).get("blood_group", ""),
                "profile_completed": True,
            }).execute()

            _supabase.table("patient_profile").upsert({
                "patient_id": user_id,
                "address": payload.get("personal_info", {}).get("address", ""),
                "emergency_contact": payload.get("emergency_contact", {}),
                "income_band": payload.get("government_schemes", {}).get("annual_income_range", ""),
                "occupation": payload.get("government_schemes", {}).get("occupation", ""),
                "state": payload.get("government_schemes", {}).get("state", ""),
                "updated_at": timestamp
            }).execute()
        except Exception as e:
            logger.error("Failed to save patient onboarding to Supabase: %s", e)

    _local_onboarding_db["patients"][user_id] = record
    return {"success": True, "profile_completed": True, "message": "Patient onboarding completed successfully."}


def save_doctor_onboarding(user_id: str, payload: dict) -> dict:
    """Save doctor onboarding data and set verification_status = 'pending' and profile_completed = True."""
    timestamp = datetime.utcnow().isoformat() + "Z"
    record = {
        "user_id": user_id,
        "personal_details": payload.get("personal_details", {}),
        "professional_details": payload.get("professional_details", {}),
        "verification_documents": payload.get("verification_documents", {}),
        "verification_status": "pending",
        "profile_completed": True,
        "updated_at": timestamp
    }

    if _supabase:
        try:
            _supabase.table("profiles").upsert({
                "id": user_id,
                "name": payload.get("personal_details", {}).get("name", ""),
                "role": "doctor",
                "profile_completed": True,
            }).execute()

            _supabase.table("doctor_profile").upsert({
                "doctor_id": user_id,
                "reg_number": payload.get("professional_details", {}).get("reg_number", ""),
                "qualification": payload.get("professional_details", {}).get("qualification", ""),
                "specialization": payload.get("professional_details", {}).get("specialization", ""),
                "experience_years": payload.get("professional_details", {}).get("experience_years", 0),
                "hospital_name": payload.get("professional_details", {}).get("hospital_name", ""),
                "department": payload.get("professional_details", {}).get("department", ""),
                "updated_at": timestamp
            }).execute()

            _supabase.table("verification_status").upsert({
                "doctor_id": user_id,
                "status": "pending",
                "updated_at": timestamp
            }).execute()
        except Exception as e:
            logger.error("Failed to save doctor onboarding to Supabase: %s", e)

    _local_onboarding_db["doctors"][user_id] = record
    _local_onboarding_db["verifications"][user_id] = "pending"
    return {"success": True, "profile_completed": True, "verification_status": "pending", "message": "Doctor verification request submitted."}


def save_admin_onboarding(user_id: str, payload: dict) -> dict:
    """Save admin profile details and set profile_completed = True."""
    timestamp = datetime.utcnow().isoformat() + "Z"
    record = {
        "user_id": user_id,
        "name": payload.get("name", ""),
        "email": payload.get("email", ""),
        "department": payload.get("department", ""),
        "organization": payload.get("organization", ""),
        "role": payload.get("role", "Administrator"),
        "emergency_contact": payload.get("emergency_contact", ""),
        "profile_completed": True,
        "updated_at": timestamp
    }

    if _supabase:
        try:
            _supabase.table("profiles").upsert({
                "id": user_id,
                "name": payload.get("name", ""),
                "role": "admin",
                "profile_completed": True,
            }).execute()

            _supabase.table("admin_profile").upsert({
                "admin_id": user_id,
                "name": payload.get("name", ""),
                "email": payload.get("email", ""),
                "department": payload.get("department", ""),
                "organization": payload.get("organization", ""),
                "role": payload.get("role", "Administrator"),
                "updated_at": timestamp
            }).execute()
        except Exception as e:
            logger.error("Failed to save admin onboarding to Supabase: %s", e)

    _local_onboarding_db["admins"][user_id] = record
    return {"success": True, "profile_completed": True, "message": "Admin onboarding completed successfully."}


def get_user_onboarding_status(user_id: str) -> dict:
    """Check if user has completed onboarding and fetch verification status if doctor."""
    if _supabase:
        try:
            res = _supabase.table("profiles").select("role, profile_completed").eq("id", user_id).single().execute()
            if res.data:
                profile_completed = bool(res.data.get("profile_completed", False))
                role = res.data.get("role", "patient")
                ver_status = "verified"
                if role == "doctor":
                    ver_res = _supabase.table("verification_status").select("status").eq("doctor_id", user_id).single().execute()
                    ver_status = ver_res.data.get("status", "pending") if ver_res.data else "pending"
                return {"profile_completed": profile_completed, "role": role, "verification_status": ver_status}
        except Exception as e:
            logger.warning("Error fetching onboarding status from Supabase: %s", e)

    # Local fallback
    patient = _local_onboarding_db["patients"].get(user_id)
    if patient:
        return {"profile_completed": True, "role": "patient", "verification_status": "verified"}

    doctor = _local_onboarding_db["doctors"].get(user_id)
    if doctor:
        status = _local_onboarding_db["verifications"].get(user_id, "pending")
        return {"profile_completed": True, "role": "doctor", "verification_status": status}

    admin = _local_onboarding_db["admins"].get(user_id)
    if admin:
        return {"profile_completed": True, "role": "admin", "verification_status": "verified"}

    return {"profile_completed": False, "role": "patient", "verification_status": "pending"}


def get_all_pending_doctors() -> list[dict]:
    """Admin function: List doctors awaiting credential verification."""
    doctors_list = []
    for doc_id, doc in _local_onboarding_db["doctors"].items():
        status = _local_onboarding_db["verifications"].get(doc_id, "pending")
        doctors_list.append({
            "doctor_id": doc_id,
            "personal_details": doc.get("personal_details", {}),
            "professional_details": doc.get("professional_details", {}),
            "verification_documents": doc.get("verification_documents", {}),
            "verification_status": status
        })
    return doctors_list


def update_doctor_verification_status(doctor_id: str, status: str, admin_id: str = "admin-1") -> dict:
    """Admin function: Approve ('verified') or Reject ('rejected') doctor registration."""
    timestamp = datetime.utcnow().isoformat() + "Z"
    _local_onboarding_db["verifications"][doctor_id] = status

    if _supabase:
        try:
            _supabase.table("verification_status").upsert({
                "doctor_id": doctor_id,
                "status": status,
                "verified_at": timestamp,
                "verified_by": admin_id
            }).execute()
        except Exception as e:
            logger.error("Failed to update doctor verification in Supabase: %s", e)

    return {"success": True, "doctor_id": doctor_id, "verification_status": status}

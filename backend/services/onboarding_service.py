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
    # pyrefly: ignore [missing-import]
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
                "age": payload.get("personal_info", {}).get("age", None) or payload.get("personal_info", {}).get("dob", ""),
                "blood_group": payload.get("medical_info", {}).get("blood_group", ""),
                "allergies": payload.get("medical_info", {}).get("allergies", ""),
                "chronic_diseases": payload.get("medical_info", {}).get("chronic_diseases", ""),
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


def save_fhw_onboarding(user_id: str, payload: dict) -> dict:
    """Save Frontline Health Worker (ASHA/ANM) profile details."""
    timestamp = datetime.utcnow().isoformat() + "Z"
    record = {
        "user_id": user_id,
        "name": payload.get("name", ""),
        "worker_type": payload.get("worker_type", "ASHA"),  # ASHA, ANM, MPW
        "asha_id": payload.get("asha_id", f"ASHA-{user_id[:6]}"),
        "village_name": payload.get("village_name", ""),
        "sub_centre": payload.get("sub_centre", ""),
        "parent_phc": payload.get("parent_phc", ""),
        "contact_phone": payload.get("contact_phone", ""),
        "profile_completed": True,
        "updated_at": timestamp
    }

    if _supabase:
        try:
            _supabase.table("profiles").upsert({
                "id": user_id,
                "name": payload.get("name", ""),
                "role": "fhw",
                "profile_completed": True,
            }).execute()

            _supabase.table("fhw_profile").upsert({
                "fhw_id": user_id,
                "name": payload.get("name", ""),
                "worker_type": payload.get("worker_type", "ASHA"),
                "asha_id": payload.get("asha_id", f"ASHA-{user_id[:6]}"),
                "village_name": payload.get("village_name", ""),
                "sub_centre": payload.get("sub_centre", ""),
                "parent_phc": payload.get("parent_phc", ""),
                "contact_phone": payload.get("contact_phone", ""),
                "updated_at": timestamp
            }).execute()
        except Exception as e:
            logger.error("Failed to save FHW onboarding to Supabase: %s", e)

    _local_onboarding_db.setdefault("fhw", {})[user_id] = record
    return {"success": True, "profile_completed": True, "message": "FHW onboarding completed successfully."}


def save_facility_manager_onboarding(user_id: str, payload: dict) -> dict:
    """Save Facility Manager / Pharmacist operations profile details."""
    timestamp = datetime.utcnow().isoformat() + "Z"
    record = {
        "user_id": user_id,
        "name": payload.get("name", ""),
        "role_title": payload.get("role_title", "Facility Manager"),
        "facility_name": payload.get("facility_name", ""),
        "facility_type": payload.get("facility_type", "CHC"),  # PHC, CHC, Sub-District Hospital, DH
        "district": payload.get("district", ""),
        "block": payload.get("block", ""),
        "license_number": payload.get("license_number", ""),
        "contact_phone": payload.get("contact_phone", ""),
        "profile_completed": True,
        "updated_at": timestamp
    }

    if _supabase:
        try:
            _supabase.table("profiles").upsert({
                "id": user_id,
                "name": payload.get("name", ""),
                "role": "facility_manager",
                "profile_completed": True,
            }).execute()

            _supabase.table("facility_manager_profile").upsert({
                "manager_id": user_id,
                "name": payload.get("name", ""),
                "facility_name": payload.get("facility_name", ""),
                "facility_type": payload.get("facility_type", "CHC"),
                "district": payload.get("district", ""),
                "updated_at": timestamp
            }).execute()
        except Exception as e:
            logger.error("Failed to save facility manager onboarding to Supabase: %s", e)

    _local_onboarding_db.setdefault("facility_managers", {})[user_id] = record
    return {"success": True, "profile_completed": True, "message": "Facility operations onboarding completed successfully."}


def get_user_onboarding_status(user_id: str) -> dict:
    """Check if user has completed onboarding and fetch verification status if doctor."""
    if _supabase:
        try:
            res = _supabase.table("profiles").select("role, profile_completed").eq("id", user_id).execute()
            if res.data and len(res.data) > 0:
                user_prof = res.data[0]
                profile_completed = bool(user_prof.get("profile_completed", False))
                role = user_prof.get("role", "patient")
                ver_status = "verified"
                if role == "doctor":
                    ver_res = _supabase.table("verification_status").select("status").eq("doctor_id", user_id).execute()
                    if ver_res.data and len(ver_res.data) > 0:
                        ver_status = ver_res.data[0].get("status", "pending")
                    else:
                        ver_status = _local_onboarding_db["verifications"].get(user_id, "pending")
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

    fhw = _local_onboarding_db.get("fhw", {}).get(user_id)
    if fhw:
        return {"profile_completed": True, "role": "fhw", "verification_status": "verified"}

    fm = _local_onboarding_db.get("facility_managers", {}).get(user_id)
    if fm:
        return {"profile_completed": True, "role": "facility_manager", "verification_status": "verified"}

    # Default fallback check if in local verifications
    local_ver = _local_onboarding_db["verifications"].get(user_id)
    if local_ver:
        return {"profile_completed": True, "role": "doctor", "verification_status": local_ver}

    return {"profile_completed": False, "role": "patient", "verification_status": "pending"}


def get_all_pending_doctors() -> list[dict]:
    """Admin function: List doctors awaiting credential verification."""
    doctors_list = []
    seen_ids = set()

    # Pre-seeded doctors with rich profile for admin review
    default_doctors = [
        {
            "doctor_id": "00000000-0000-4000-a000-000000000003",
            "personal_details": {
                "name": "Dr. David Ross",
                "email": "doctor@curatrack.com",
                "phone": "+91 98220 11234"
            },
            "professional_details": {
                "reg_number": "MED-00471-TX",
                "qualification": "MBBS, MD General Medicine",
                "specialization": "General Medicine / Physician",
                "hospital_name": "Nandurbar District Civil Hospital",
                "department": "OPD & Critical Care",
                "experience_years": 12
            },
            "verification_documents": {
                "medical_council_reg": "MCI-TX-44091",
                "degree_certificate": "MBBS-MD-MUHS-2012.pdf",
                "experience_letter": "Exp_CivilHospital_7yr.pdf"
            },
            "verification_status": _local_onboarding_db.get("verifications", {}).get("00000000-0000-4000-a000-000000000003", "verified")
        },
        {
            "doctor_id": "doc-mo-102",
            "personal_details": {
                "name": "Dr. Ananya Sharma",
                "email": "ananya.sharma@curatrack.gov.in",
                "phone": "+91 98224 88710"
            },
            "professional_details": {
                "reg_number": "MCI-MH-88124",
                "qualification": "MBBS, DGO (Obstetrics & Gynaecology)",
                "specialization": "Maternal & Child Health",
                "hospital_name": "PHC Nandurbar Rural",
                "department": "Maternal ANC & Delivery",
                "experience_years": 6
            },
            "verification_documents": {
                "medical_council_reg": "MCI-MH-88124",
                "degree_certificate": "MBBS-DGO-2018.pdf"
            },
            "verification_status": _local_onboarding_db.get("verifications", {}).get("doc-mo-102", "verified")
        },
        {
            "doctor_id": "doc-app-205",
            "personal_details": {
                "name": "Dr. Vikram Deshmukh",
                "email": "dr.deshmukh@curatrack.com",
                "phone": "+91 94231 66720"
            },
            "professional_details": {
                "reg_number": "MMC-2021-0941",
                "qualification": "MBBS, MD Pediatrics",
                "specialization": "Pediatric Critical Care",
                "hospital_name": "Shahada Community Health Centre",
                "department": "Pediatrics & SNCU",
                "experience_years": 4
            },
            "verification_documents": {
                "medical_council_reg": "MMC-2021-0941",
                "degree_certificate": "MD_Pediatrics_Cert.pdf",
                "id_proof": "Aadhaar_Doc_Verified.pdf"
            },
            "verification_status": _local_onboarding_db.get("verifications", {}).get("doc-app-205", "pending")
        },
        {
            "doctor_id": "doc-app-309",
            "personal_details": {
                "name": "Dr. Rajesh Patil",
                "email": "dr.rajesh.patil@hospital.org",
                "phone": "+91 91580 44102"
            },
            "professional_details": {
                "reg_number": "MMC-2023-1184",
                "qualification": "MBBS",
                "specialization": "General Practitioner",
                "hospital_name": "Taloda Rural Hospital",
                "department": "Emergency & OPD",
                "experience_years": 2
            },
            "verification_documents": {
                "medical_council_reg": "MMC-2023-1184",
                "degree_certificate": "MBBS_Graduation_Degree.pdf"
            },
            "verification_status": _local_onboarding_db.get("verifications", {}).get("doc-app-309", "pending")
        }
    ]

    for d in default_doctors:
        seen_ids.add(d["doctor_id"])
        ver = _local_onboarding_db.get("verifications", {}).get(d["doctor_id"])
        if ver:
            d["verification_status"] = ver
        doctors_list.append(d)

    if _supabase:
        try:
            profiles_res = _supabase.table("profiles").select("id, name, email").eq("role", "doctor").execute()
            ver_res = _supabase.table("verification_status").select("*").execute()
            ver_map = {item["doctor_id"]: item.get("status", "pending") for item in (ver_res.data or [])}

            doc_profiles_res = _supabase.table("doctor_profile").select("*").execute()
            doc_prof_map = {item["doctor_id"]: item for item in (doc_profiles_res.data or [])}

            for p in (profiles_res.data or []):
                doc_id = p["id"]
                if doc_id not in seen_ids:
                    seen_ids.add(doc_id)
                    dp = doc_prof_map.get(doc_id, {})
                    status = ver_map.get(doc_id, _local_onboarding_db.get("verifications", {}).get(doc_id, "pending"))
                    doctors_list.append({
                        "doctor_id": doc_id,
                        "personal_details": {
                            "name": p.get("name") or "Dr. Practitioner",
                            "email": p.get("email") or "doctor@hospital.org",
                            "phone": "+91 98000 00000"
                        },
                        "professional_details": {
                            "reg_number": dp.get("reg_number") or "MED-00471-TX",
                            "qualification": dp.get("qualification") or "MBBS, MD General Medicine",
                            "specialization": dp.get("specialization") or "General Medicine",
                            "hospital_name": dp.get("hospital_name") or "Metropolitan Health System",
                            "department": dp.get("department") or "OPD",
                            "experience_years": dp.get("experience_years") or 5
                        },
                        "verification_documents": {
                            "medical_council_reg": dp.get("reg_number") or "MED-00471-TX",
                            "degree_certificate": "MBBS_Degree.pdf"
                        },
                        "verification_status": status
                    })
        except Exception as e:
            logger.warning("Error fetching doctors from Supabase: %s", e)

    for doc_id, doc in _local_onboarding_db["doctors"].items():
        if doc_id not in seen_ids:
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
    _local_onboarding_db.setdefault("verifications", {})[doctor_id] = status

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


def get_all_asha_workers() -> list[dict]:
    """Admin function: List ASHA workers and their verification status."""
    asha_list = []
    seen_ids = set()

    # Pre-seeded official ASHA workers for district
    default_ashas = [
        {
            "asha_id": "ASHA-402",
            "user_id": "00000000-0000-4000-a000-000000000006",
            "name": "Sunita Tai (ASHA)",
            "email": "asha@curatrack.com",
            "phone": "+91 98221 44019",
            "village_name": "Borvihir Pada",
            "block": "Nandurbar Taluk",
            "sub_centre": "Borvihir Sub-Centre",
            "parent_phc": "PHC Nandurbar Rural",
            "experience_years": 8,
            "beneficiaries_count": 48,
            "pending_followups": 3,
            "completed_activities": 124,
            "status": "active",
            "verification_status": _local_onboarding_db.get("asha_verifications", {}).get("00000000-0000-4000-a000-000000000006", "verified"),
            "documents": [
                {"name": "Govt ASHA Certification Badge", "type": "pdf", "status": "VERIFIED"},
                {"name": "Aadhaar Identity Proof", "type": "pdf", "status": "VERIFIED"},
                {"name": "Gram Panchayat Allocation Letter", "type": "pdf", "status": "VERIFIED"}
            ],
            "registration_date": "2024-01-15"
        },
        {
            "asha_id": "ASHA-104",
            "user_id": "fhw-ash-104",
            "name": "Rani Vasave",
            "email": "rani.vasave@asha.curatrack.gov.in",
            "phone": "+91 94032 55671",
            "village_name": "Dongargaon Pada",
            "block": "Nandurbar Taluk",
            "sub_centre": "Dongargaon Sub-Centre",
            "parent_phc": "PHC Nandurbar Rural",
            "experience_years": 4,
            "beneficiaries_count": 36,
            "pending_followups": 1,
            "completed_activities": 88,
            "status": "active",
            "verification_status": _local_onboarding_db.get("asha_verifications", {}).get("fhw-ash-104", "verified"),
            "documents": [
                {"name": "NHM ASHA Enrolment Letter", "type": "pdf", "status": "VERIFIED"},
                {"name": "Aadhaar Card", "type": "pdf", "status": "VERIFIED"}
            ],
            "registration_date": "2024-06-10"
        },
        {
            "asha_id": "ASHA-208",
            "user_id": "fhw-ash-208",
            "name": "Kavita Gavit",
            "email": "kavita.gavit@asha.curatrack.gov.in",
            "phone": "+91 97654 33120",
            "village_name": "Dhanora Pada",
            "block": "Shahada Taluk",
            "sub_centre": "Dhanora SC",
            "parent_phc": "Shahada Rural PHC",
            "experience_years": 2,
            "beneficiaries_count": 29,
            "pending_followups": 4,
            "completed_activities": 42,
            "status": "active",
            "verification_status": _local_onboarding_db.get("asha_verifications", {}).get("fhw-ash-208", "pending"),
            "documents": [
                {"name": "NHM Trainee Certificate", "type": "pdf", "status": "PENDING_REVIEW"},
                {"name": "Secondary School Leaving Certificate", "type": "pdf", "status": "PENDING_REVIEW"},
                {"name": "ASHA Induction Training Module 6 & 7", "type": "pdf", "status": "PENDING_REVIEW"}
            ],
            "registration_date": "2026-08-12"
        },
        {
            "asha_id": "ASHA-312",
            "user_id": "fhw-ash-312",
            "name": "Rekha Valvi",
            "email": "rekha.valvi@asha.curatrack.gov.in",
            "phone": "+91 91580 99841",
            "village_name": "Ranipur",
            "block": "Taloda Taluk",
            "sub_centre": "Ranipur Sub-Centre",
            "parent_phc": "Taloda CHC",
            "experience_years": 1,
            "beneficiaries_count": 22,
            "pending_followups": 2,
            "completed_activities": 18,
            "status": "under_review",
            "verification_status": _local_onboarding_db.get("asha_verifications", {}).get("fhw-ash-312", "under_review"),
            "documents": [
                {"name": "District Health Society Appointment Letter", "type": "pdf", "status": "PENDING_REVIEW"},
                {"name": "Voter ID Card", "type": "pdf", "status": "VERIFIED"}
            ],
            "registration_date": "2026-08-18"
        },
        {
            "asha_id": "ASHA-409",
            "user_id": "fhw-ash-409",
            "name": "Lata Padvi",
            "email": "lata.padvi@asha.curatrack.gov.in",
            "phone": "+91 98229 11094",
            "village_name": "Toranmal",
            "block": "Shahada Taluk",
            "sub_centre": "Toranmal SC",
            "parent_phc": "Shahada Rural PHC",
            "experience_years": 5,
            "beneficiaries_count": 51,
            "pending_followups": 5,
            "completed_activities": 96,
            "status": "active",
            "verification_status": _local_onboarding_db.get("asha_verifications", {}).get("fhw-ash-409", "verified"),
            "documents": [
                {"name": "Senior ASHA Certificate", "type": "pdf", "status": "VERIFIED"}
            ],
            "registration_date": "2023-11-04"
        }
    ]

    for a in default_ashas:
        seen_ids.add(a["user_id"])
        # Update with runtime verification status if modified
        ver = _local_onboarding_db.get("asha_verifications", {}).get(a["user_id"])
        if ver:
            a["verification_status"] = ver
        asha_list.append(a)

    if _supabase:
        try:
            fhw_res = _supabase.table("fhw_profile").select("*").execute()
            profiles_res = _supabase.table("profiles").select("id, name, email").eq("role", "fhw").execute()
            prof_map = {p["id"]: p for p in (profiles_res.data or [])}

            for f in (fhw_res.data or []):
                uid = f.get("fhw_id")
                if uid and uid not in seen_ids:
                    seen_ids.add(uid)
                    p = prof_map.get(uid, {})
                    ver_status = _local_onboarding_db.get("asha_verifications", {}).get(uid, "verified")
                    asha_list.append({
                        "asha_id": f.get("asha_id") or f"ASHA-{uid[:6]}",
                        "user_id": uid,
                        "name": f.get("name") or p.get("name") or "ASHA Worker",
                        "email": p.get("email") or "asha@curatrack.gov.in",
                        "phone": f.get("contact_phone") or "+91 98000 00000",
                        "village_name": f.get("village_name") or "Nandurbar Block",
                        "block": "Nandurbar Taluk",
                        "sub_centre": f.get("sub_centre") or "Sub-Centre",
                        "parent_phc": f.get("parent_phc") or "PHC",
                        "experience_years": 3,
                        "beneficiaries_count": 30,
                        "pending_followups": 2,
                        "completed_activities": 45,
                        "status": "active",
                        "verification_status": ver_status,
                        "documents": [
                            {"name": "Govt ASHA Certification Badge", "type": "pdf", "status": "VERIFIED"}
                        ],
                        "registration_date": datetime.utcnow().strftime("%Y-%m-%d")
                    })
        except Exception as e:
            logger.warning("Error fetching ASHA workers from Supabase: %s", e)

    return asha_list


def update_asha_verification_status(asha_id: str, status: str, admin_id: str = "admin-1", notes: str = "") -> dict:
    """Admin function: Verify, Reject, or Request Correction for ASHA registration."""
    timestamp = datetime.utcnow().isoformat() + "Z"
    _local_onboarding_db.setdefault("asha_verifications", {})[asha_id] = status

    if _supabase:
        try:
            _supabase.table("verification_status").upsert({
                "doctor_id": asha_id,  # reused verification_status table with worker id
                "status": status,
                "verified_at": timestamp,
                "verified_by": admin_id
            }).execute()
        except Exception as e:
            logger.error("Failed to update ASHA verification in Supabase: %s", e)

    return {
        "success": True,
        "asha_id": asha_id,
        "verification_status": status,
        "notes": notes,
        "timestamp": timestamp
    }


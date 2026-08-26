import os
import json
import time
import random
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from services.supabase_client import get_supabase_client

logger = logging.getLogger("curatrack.referrals")
router = APIRouter()

# ─── Request Models ────────────────────────────────────────────────────────

class ReferralCreateRequest(BaseModel):
    patient_id: str = "p-101"
    patient_name: str
    patient_age: int
    patient_gender: str
    referring_doctor_name: Optional[str] = "Dr. Ananya Sharma (MO)"
    referring_role: Optional[str] = "doctor"  # "fhw" | "doctor" | "facility_manager" | "admin"
    referring_facility_type: str = "Primary Health Centre (PHC)"
    referring_facility_name: str
    destination_role: Optional[str] = "doctor"  # "doctor" | "specialist"
    destination_doctor_id: Optional[str] = None
    destination_doctor_name: Optional[str] = None
    destination_facility_type: str = "District Hospital"
    destination_facility_name: str
    specialty: str
    urgency: str = "URGENT"  # "EMERGENCY" | "URGENT" | "ROUTINE"
    clinical_reason: str
    provisional_diagnosis: str
    vitals_summary: Optional[str] = "BP 130/84, HR 78, SpO2 98%"
    abha_id: Optional[str] = None
    created_by_role: Optional[str] = "doctor"  # "doctor" | "fhw" | "facility_manager" | "admin"


class ReferralStatusUpdateRequest(BaseModel):
    status: str  # "CREATED", "ACCEPTED", "IN_TRANSIT", "ARRIVED", "CONSULTED", "COMPLETED", "REJECTED", "OVERDUE_ESCALATED"
    notes: Optional[str] = None
    updated_by: Optional[str] = "Receiving Officer"
    actor_role: Optional[str] = "doctor"
    doctor_id: Optional[str] = None
    doctor_name: Optional[str] = None


# ─── Default Registered Patient Registry ────────────────────────────────────
_DEFAULT_PATIENTS = [
    {
        "id": "p-101",
        "name": "Rameshwar Patel",
        "age": 54,
        "gender": "Male",
        "abha_id": "91-4402-8812-9901",
        "blood_group": "O+",
        "category": "NCD Chronic (Cardiovascular)",
        "risk_level": "HIGH",
        "village_name": "Nandurbar Block A",
        "contact_phone": "+91 98221 44521",
        "vitals_summary": "BP: 148/92 mmHg, HR: 86 bpm, SpO2: 96%",
        "medical_history": "Known hypertensive (5 yrs), exertional chest discomfort",
        "assigned_asha": "Sunita Tai (ASHA)",
        "primary_facility": "PHC Nandurbar Rural"
    },
    {
        "id": "p-204",
        "name": "Sunita Devi",
        "age": 27,
        "gender": "Female",
        "abha_id": "91-1029-4471-3382",
        "blood_group": "B+",
        "category": "Maternal ANC (High-Risk)",
        "risk_level": "HIGH",
        "village_name": "Borvihir Pada",
        "contact_phone": "+91 98224 77102",
        "vitals_summary": "BP: 160/105 mmHg, Urine Albumin: 2+, FHR: 142 bpm",
        "medical_history": "Gravida 2 Para 1, Gestational Age 34 weeks, severe preeclampsia signs",
        "assigned_asha": "Sunita Tai (ASHA)",
        "primary_facility": "Sub-Centre Borvihir"
    },
    {
        "id": "p-309",
        "name": "Bhikaji Shinde",
        "age": 62,
        "gender": "Male",
        "abha_id": "91-7782-9012-4411",
        "blood_group": "A+",
        "category": "Communicable (TB / Pulmonary)",
        "risk_level": "HIGH",
        "village_name": "Dongargaon Pada",
        "contact_phone": "+91 98226 33901",
        "vitals_summary": "BP: 110/72 mmHg, Temp: 38.4°C, SpO2: 93%",
        "medical_history": "Productive cough > 4 weeks, intermittent hemoptysis, weight loss",
        "assigned_asha": "Rekha ANM",
        "primary_facility": "CHC Shahada Block"
    },
    {
        "id": "p-405",
        "name": "Aarav Gaikwad",
        "age": 8,
        "gender": "Male",
        "abha_id": "91-2281-5544-7711",
        "blood_group": "O-",
        "category": "Pediatric & Child Health",
        "risk_level": "MODERATE",
        "village_name": "Dhanora Pada",
        "contact_phone": "+91 98229 11488",
        "vitals_summary": "HR: 104 bpm, Temp: 39.1°C, SpO2: 97%",
        "medical_history": "Recurrent high febrile spikes, dehydration, suspected acute enteric fever",
        "assigned_asha": "Sunita Tai (ASHA)",
        "primary_facility": "Sub-Centre Dhanora"
    },
    {
        "id": "p-512",
        "name": "Meera Patil",
        "age": 42,
        "gender": "Female",
        "abha_id": "91-8833-2190-6644",
        "blood_group": "AB+",
        "category": "NCD Chronic (Diabetes & Renal)",
        "risk_level": "MODERATE",
        "village_name": "Shahada Block",
        "contact_phone": "+91 98228 99312",
        "vitals_summary": "BP: 138/88 mmHg, Fasting Glucose: 210 mg/dL, HbA1c: 9.2%",
        "medical_history": "Type-2 Diabetes Mellitus with early diabetic nephropathy signs",
        "assigned_asha": "Sunita Tai (ASHA)",
        "primary_facility": "PHC Nandurbar Rural"
    },
    {
        "id": "p-620",
        "name": "Kavita Bai",
        "age": 34,
        "gender": "Female",
        "abha_id": "91-9944-3321-1155",
        "blood_group": "B+",
        "category": "General Preventive Health",
        "risk_level": "LOW",
        "village_name": "Borvihir Pada",
        "contact_phone": "+91 98225 11988",
        "vitals_summary": "BP: 118/76 mmHg, HR: 74 bpm, SpO2: 99%",
        "medical_history": "Routine post-natal health monitoring and nutritional counseling",
        "assigned_asha": "Sunita Tai (ASHA)",
        "primary_facility": "Sub-Centre Borvihir"
    }
]

# ─── Default Verified Doctor Directory ──────────────────────────────────────
_DEFAULT_DOCTORS = [
    {
        "id": "doc-david-ross",
        "name": "Dr. David Ross",
        "role": "doctor",
        "tier": "Primary Health Centre (PHC)",
        "specialty": "General Medicine & Internal Care",
        "facility_name": "PHC Nandurbar Rural",
        "facility_type": "Primary Health Centre (PHC)",
        "department": "General Medicine OPD",
        "experience": "12 yrs",
        "qualification": "MBBS, MD (Internal Medicine)",
        "opd_status": "AVAILABLE",
        "phone": "+91 98210 11001",
        "email": "doctor@curatrack.in"
    },
    {
        "id": "doc-ananya-sharma",
        "name": "Dr. Ananya Sharma (MO)",
        "role": "doctor",
        "tier": "Primary Health Centre (PHC)",
        "specialty": "Medical Officer & Family Practice",
        "facility_name": "PHC Nandurbar Rural",
        "facility_type": "Primary Health Centre (PHC)",
        "department": "Primary Clinical Care",
        "experience": "8 yrs",
        "qualification": "MBBS (Family Medicine)",
        "opd_status": "AVAILABLE",
        "phone": "+91 98210 22002",
        "email": "dr.ananya@curatrack.in"
    },
    {
        "id": "doc-pradeep-roy",
        "name": "Dr. Pradeep Roy (MO)",
        "role": "doctor",
        "tier": "Community Health Centre (CHC)",
        "specialty": "Emergency & Community Medicine",
        "facility_name": "CHC Shahada Block",
        "facility_type": "Community Health Centre (CHC)",
        "department": "Emergency & Clinical Triage",
        "experience": "14 yrs",
        "qualification": "MBBS, MD (Emergency Medicine)",
        "opd_status": "AVAILABLE",
        "phone": "+91 98210 33003",
        "email": "dr.roy@curatrack.in"
    },
    {
        "id": "doc-vk-deshmukh",
        "name": "Dr. V. K. Deshmukh",
        "role": "doctor",
        "tier": "District Hospital",
        "specialty": "Cardiology & Intensive Coronary Care",
        "facility_name": "Nandurbar District Civil Hospital",
        "facility_type": "District Hospital",
        "department": "Department of Cardiology",
        "experience": "20 yrs",
        "qualification": "MBBS, MD, DM (Cardiology)",
        "opd_status": "AVAILABLE",
        "phone": "+91 98210 44004",
        "email": "dr.deshmukh@curatrack.in"
    },
    {
        "id": "doc-sarah-jenkins",
        "name": "Dr. Sarah Jenkins",
        "role": "doctor",
        "tier": "District Hospital",
        "specialty": "Neurology & Brain Health Specialist",
        "facility_name": "Nandurbar District Civil Hospital",
        "facility_type": "District Hospital",
        "department": "Department of Neurology",
        "experience": "16 yrs",
        "qualification": "MBBS, MD, DM (Neurology)",
        "opd_status": "AVAILABLE",
        "phone": "+91 98210 55005",
        "email": "dr.jenkins@curatrack.in"
    },
    {
        "id": "doc-priya-nair",
        "name": "Dr. Priya Nair",
        "role": "doctor",
        "tier": "District Hospital",
        "specialty": "Obstetrics & High-Risk Pregnancy",
        "facility_name": "Nandurbar District Civil Hospital",
        "facility_type": "District Hospital",
        "department": "Maternal & OBGYN Centre",
        "experience": "13 yrs",
        "qualification": "MBBS, MS (Obstetrics & Gynaecology)",
        "opd_status": "AVAILABLE",
        "phone": "+91 98210 66006",
        "email": "dr.priya@curatrack.in"
    },
    {
        "id": "doc-michael-chang",
        "name": "Dr. Michael Chang",
        "role": "doctor",
        "tier": "District Hospital",
        "specialty": "Pediatrics & Neonatal Care",
        "facility_name": "Nandurbar District Civil Hospital",
        "facility_type": "District Hospital",
        "department": "Pediatrics & NICU",
        "experience": "11 yrs",
        "qualification": "MBBS, MD (Pediatrics)",
        "opd_status": "AVAILABLE",
        "phone": "+91 98210 77007",
        "email": "dr.chang@curatrack.in"
    },
    {
        "id": "doc-elena-rostova",
        "name": "Dr. Elena Rostova",
        "role": "doctor",
        "tier": "Medical College & Tertiary Hospital",
        "specialty": "Pulmonology & Respiratory Medicine",
        "facility_name": "Dhule Government Medical College & Hospital",
        "facility_type": "Medical College & Tertiary Hospital",
        "department": "Pulmonary & Infectious Diseases",
        "experience": "15 yrs",
        "qualification": "MBBS, MD (Pulmonary Medicine)",
        "opd_status": "AVAILABLE",
        "phone": "+91 98210 88008",
        "email": "dr.elena@curatrack.in"
    }
]


# ─── Fallback Seed Data & Durable Storage ─────────────────────────────────────
REFERRALS_DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
REFERRALS_STORAGE_FILE = os.path.join(REFERRALS_DATA_DIR, "referrals_storage.json")

_FALLBACK_REFERRALS = [
    {
        "id": "REF-8841",
        "referral_token": "REF-8841",
        "patient_id": "p-101",
        "patient_name": "Rameshwar Patel",
        "patient_age": 54,
        "patient_gender": "Male",
        "abha_id": "91-4402-8812-9901",
        "referring_doctor_name": "Dr. Ananya Sharma (MO)",
        "referring_role": "doctor",
        "referring_facility_type": "Primary Health Centre (PHC)",
        "referring_facility_name": "PHC Nandurbar Rural",
        "destination_doctor_id": "doc-vk-deshmukh",
        "destination_doctor_name": "Dr. V. K. Deshmukh",
        "destination_role": "doctor",
        "destination_facility_type": "District Hospital",
        "destination_facility_name": "Nandurbar District Civil Hospital",
        "specialty": "Cardiology",
        "urgency": "URGENT",
        "clinical_reason": "Persistent retrosternal discomfort on exertion with borderline ST depression on 12-lead ECG.",
        "provisional_diagnosis": "Suspected Unstable Angina / Ischemic Heart Disease",
        "vitals_summary": "BP: 148/92 mmHg, HR: 86 bpm, SpO2: 96%, Fasting Glucose: 164 mg/dL",
        "status": "ACCEPTED",
        "created_at": "2026-08-21T09:30:00Z",
        "timeline": [
            {"status": "CREATED", "timestamp": "2026-08-21T09:30:00Z", "actor": "Dr. Ananya Sharma (PHC Nandurbar)", "notes": "Referral created after primary ECG evaluation."},
            {"status": "ACCEPTED", "timestamp": "2026-08-21T11:15:00Z", "actor": "Dr. V. K. Deshmukh (Civil Hospital)", "notes": "Referral accepted. Cardiology OPD slot reserved."}
        ]
    },
    {
        "id": "REF-7204",
        "referral_token": "REF-7204",
        "patient_id": "p-204",
        "patient_name": "Sunita Devi",
        "patient_age": 27,
        "patient_gender": "Female",
        "abha_id": "91-1029-4471-3382",
        "referring_doctor_name": "Sunita Tai (ASHA)",
        "referring_role": "fhw",
        "referring_facility_type": "Ayushman Arogya Mandir (Sub-Centre)",
        "referring_facility_name": "Sub-Centre Borvihir",
        "destination_doctor_id": "doc-priya-nair",
        "destination_doctor_name": "Dr. Priya Nair",
        "destination_role": "doctor",
        "destination_facility_type": "Community Health Centre (CHC)",
        "destination_facility_name": "CHC Shahada Block",
        "specialty": "Obstetrics & Gynecology",
        "urgency": "EMERGENCY",
        "clinical_reason": "High-Risk Pregnancy (34 weeks) with severe gestational hypertension (160/105 mmHg) and pedal edema.",
        "provisional_diagnosis": "Severe Preeclampsia / High Risk ANC",
        "vitals_summary": "BP: 160/105 mmHg, Urine Albumin: 2+, FHR: 142 bpm",
        "status": "IN_TRANSIT",
        "created_at": "2026-08-23T06:45:00Z",
        "timeline": [
            {"status": "CREATED", "timestamp": "2026-08-23T06:45:00Z", "actor": "Sunita Tai (ASHA)", "notes": "Danger signs detected during ANC-3 visit. Escalated to Medical Officer."},
            {"status": "ACCEPTED", "timestamp": "2026-08-23T07:05:00Z", "actor": "Dr. Priya Nair (CHC Shahada)", "notes": "Emergency bed allocated in Maternity Ward."},
            {"status": "IN_TRANSIT", "timestamp": "2026-08-23T07:30:00Z", "actor": "108 Ambulance Dispatch #MH-18-402", "notes": "Patient picked up with ASHA escort."}
        ]
    },
    {
        "id": "REF-5190",
        "referral_token": "REF-5190",
        "patient_id": "p-309",
        "patient_name": "Bhikaji Shinde",
        "patient_age": 62,
        "patient_gender": "Male",
        "abha_id": "91-7782-9012-4411",
        "referring_doctor_name": "Dr. Pradeep Roy (MO)",
        "referring_role": "doctor",
        "referring_facility_type": "Community Health Centre (CHC)",
        "referring_facility_name": "CHC Shahada Block",
        "destination_doctor_id": "doc-elena-rostova",
        "destination_doctor_name": "Dr. Elena Rostova",
        "destination_role": "doctor",
        "destination_facility_type": "Medical College & Tertiary Hospital",
        "destination_facility_name": "Dhule Government Medical College & Hospital",
        "specialty": "Pulmonology & Infectious Diseases",
        "urgency": "URGENT",
        "clinical_reason": "Chronic productive cough > 4 weeks with hemoptysis and unresolving consolidative opacities on chest X-ray.",
        "provisional_diagnosis": "Multi-Drug Resistant Tuberculosis (MDR-TB) Evaluation",
        "vitals_summary": "BP: 110/72 mmHg, Temp: 38.4°C, SpO2: 93%",
        "status": "CREATED",
        "created_at": "2026-08-24T14:10:00Z",
        "timeline": [
            {"status": "CREATED", "timestamp": "2026-08-24T14:10:00Z", "actor": "Dr. Pradeep Roy (CHC Shahada)", "notes": "Referred for CBNAAT GeneXpert and Pulmonology review."}
        ]
    },
    {
        "id": "REF-4001",
        "referral_token": "REF-4001",
        "patient_id": "p-101",
        "patient_name": "Ramesh Chandra",
        "patient_age": 45,
        "patient_gender": "Male",
        "abha_id": "91-3321-7788-9900",
        "referring_doctor_name": "Dr. Ananya Sharma (MO)",
        "referring_role": "doctor",
        "referring_facility_type": "Primary Health Centre (PHC)",
        "referring_facility_name": "PHC Nandurbar Rural",
        "destination_doctor_id": "doc-david-ross",
        "destination_doctor_name": "Dr. David Ross",
        "destination_role": "doctor",
        "destination_facility_type": "District Hospital",
        "destination_facility_name": "Nandurbar District Civil Hospital",
        "specialty": "General Medicine",
        "urgency": "ROUTINE",
        "clinical_reason": "Post-discharge evaluation and hypertension checkup completed.",
        "provisional_diagnosis": "Controlled Hypertension",
        "vitals_summary": "BP: 120/80 mmHg, HR: 72 bpm, SpO2: 99%",
        "status": "COMPLETED",
        "created_at": "2026-08-15T10:00:00Z",
        "timeline": [
            {"status": "CREATED", "timestamp": "2026-08-15T10:00:00Z", "actor": "Dr. Ananya Sharma", "notes": "Referral created."},
            {"status": "COMPLETED", "timestamp": "2026-08-18T14:00:00Z", "actor": "Dr. David Ross", "notes": "Consultation and lab tests completed."}
        ]
    }
]


def _load_stored_referrals() -> list[dict]:
    """Loads all referrals from persistent disk storage, initializing with seed data if not yet created."""
    os.makedirs(REFERRALS_DATA_DIR, exist_ok=True)
    if os.path.exists(REFERRALS_STORAGE_FILE):
        try:
            with open(REFERRALS_STORAGE_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list) and len(data) > 0:
                    return data
        except Exception as e:
            logger.error(f"Error reading referrals storage file: {e}")

    # Initialize with default seed referrals
    _save_stored_referrals(_FALLBACK_REFERRALS)
    return list(_FALLBACK_REFERRALS)


def _save_stored_referrals(referrals: list[dict]):
    """Saves referrals atomically to disk to ensure permanence across sessions and server restarts."""
    os.makedirs(REFERRALS_DATA_DIR, exist_ok=True)
    try:
        tmp_file = REFERRALS_STORAGE_FILE + ".tmp"
        with open(tmp_file, "w", encoding="utf-8") as f:
            json.dump(referrals, f, indent=2, ensure_ascii=False)
        if os.path.exists(REFERRALS_STORAGE_FILE):
            os.replace(tmp_file, REFERRALS_STORAGE_FILE)
        else:
            os.rename(tmp_file, REFERRALS_STORAGE_FILE)
    except Exception as e:
        logger.error(f"Error persisting referrals storage file: {e}")


def _auto_check_and_escalate_overdue(referrals: list) -> list:
    """
    Automated Referral SLA Escalation:
    If urgency == 'EMERGENCY' and status == 'CREATED' and elapsed time > 2 hours,
    transition to 'OVERDUE_ESCALATED'.
    """
    now = datetime.now(timezone.utc)
    updated = []
    sb = get_supabase_client()

    for ref in referrals:
        if ref.get("urgency") == "EMERGENCY" and ref.get("status") == "CREATED":
            created_str = ref.get("created_at")
            if created_str:
                try:
                    # Clean ISO format
                    dt_str = created_str.replace("Z", "+00:00")
                    created_dt = datetime.fromisoformat(dt_str)
                    if created_dt.tzinfo is None:
                        created_dt = created_dt.replace(tzinfo=timezone.utc)
                    
                    elapsed = now - created_dt
                    if elapsed > timedelta(hours=2):
                        escalated_time = now.isoformat()
                        ref["status"] = "OVERDUE_ESCALATED"
                        ref["escalated_at"] = escalated_time
                        ref["escalation_reason"] = f"Emergency referral unaccepted after {int(elapsed.total_seconds() // 3600)}h {int((elapsed.total_seconds() % 3600) // 60)}m (Exceeded 2-hour SLA threshold)"
                        
                        timeline = ref.get("timeline") or []
                        timeline.append({
                            "status": "OVERDUE_ESCALATED",
                            "timestamp": escalated_time,
                            "actor": "System SLA Monitor",
                            "notes": ref["escalation_reason"]
                        })
                        ref["timeline"] = timeline

                        if sb:
                            try:
                                sb.table("referrals").update({
                                    "status": "OVERDUE_ESCALATED",
                                    "escalated_at": escalated_time,
                                    "escalation_reason": ref["escalation_reason"],
                                    "timeline": timeline,
                                    "updated_at": escalated_time
                                }).eq("id", ref["id"]).execute()
                            except Exception as ex:
                                logger.error(f"Failed to update escalation in Supabase for {ref['id']}: {ex}")
                except Exception as parse_err:
                    logger.warning(f"Date parse error in SLA monitor: {parse_err}")

        updated.append(ref)
    return updated


# ─── Endpoints ─────────────────────────────────────────────────────────────

@router.get("/referrals")
def get_referrals(
    status: Optional[str] = Query(None),
    urgency: Optional[str] = Query(None),
    facility_name: Optional[str] = Query(None),
    patient_id: Optional[str] = Query(None),
    specialty: Optional[str] = Query(None),
    referring_role: Optional[str] = Query(None),
    doctor_id: Optional[str] = Query(None),
    doctor_name: Optional[str] = Query(None)
):
    """
    Fetch referrals with doctor privacy enforcement:
    When a doctor queries the pipeline, they ONLY receive:
    1. Incoming referrals specifically addressed to them (destination_doctor_id == doctor_id).
    2. Outgoing referrals created/referred by them (referring_doctor_id == doctor_id).
    Referrals addressed to other doctors are strictly withheld for patient confidentiality.
    """
    sb = get_supabase_client()
    referrals_data = []

    if sb:
        try:
            query = sb.table("referrals").select("*")
            if status:
                query = query.eq("status", status)
            if urgency:
                query = query.eq("urgency", urgency)
            if patient_id:
                query = query.eq("patient_id", patient_id)
            if specialty:
                query = query.ilike("specialty", f"%{specialty}%")
            
            res = query.order("created_at", desc=True).execute()
            if res.data and len(res.data) > 0:
                referrals_data = res.data
            else:
                referrals_data = _load_stored_referrals()
        except Exception as e:
            logger.warning(f"Supabase query failed ({e}), loading from permanent storage.")
            referrals_data = _load_stored_referrals()
    else:
        referrals_data = _load_stored_referrals()

    # Run automated SLA check on active emergency referrals
    referrals_data = _auto_check_and_escalate_overdue(referrals_data)

    # Doctor Privacy Filtering: Doctor only sees referrals assigned to them or created by them
    if doctor_id or doctor_name:
        def _is_doctor_authorized(r):
            dest_id = r.get("destination_doctor_id")
            dest_name = (r.get("destination_doctor_name") or "").lower()
            ref_id = r.get("referring_doctor_id")
            ref_name = (r.get("referring_doctor_name") or "").lower()

            if doctor_id and (dest_id == doctor_id or ref_id == doctor_id):
                return True

            if doctor_name:
                doc_clean = doctor_name.lower().replace("dr.", "").replace("dr ", "").strip()
                if doc_clean:
                    if doc_clean in dest_name or dest_name in doc_clean or doc_clean in ref_name or ref_name in doc_clean:
                        return True
            return False

        referrals_data = [r for r in referrals_data if _is_doctor_authorized(r)]

    if status and status != "ALL":
        referrals_data = [r for r in referrals_data if r.get("status") == status]
    elif not status:
        # Default active pipeline excludes COMPLETED records
        referrals_data = [r for r in referrals_data if r.get("status") != "COMPLETED"]

    if facility_name:
        term = facility_name.lower()
        referrals_data = [
            r for r in referrals_data
            if term in r.get("referring_facility_name", "").lower()
            or term in r.get("destination_facility_name", "").lower()
        ]

    if referring_role:
        referrals_data = [r for r in referrals_data if r.get("referring_role") == referring_role]

    # Calculate SLA and statistics summary
    total = len(referrals_data)
    emergency_count = sum(1 for r in referrals_data if r.get("urgency") == "EMERGENCY")
    active_in_transit = sum(1 for r in referrals_data if r.get("status") == "IN_TRANSIT")
    overdue_escalated = sum(1 for r in referrals_data if r.get("status") == "OVERDUE_ESCALATED")
    completed = sum(1 for r in referrals_data if r.get("status") == "COMPLETED")

    return {
        "count": total,
        "referrals": referrals_data,
        "metrics": {
            "total_referrals": total,
            "emergency_referrals": emergency_count,
            "in_transit": active_in_transit,
            "overdue_escalated": overdue_escalated,
            "completed": completed,
            "sla_compliance_rate": f"{round(((total - overdue_escalated) / max(total, 1)) * 100, 1)}%"
        }
    }


@router.get("/referrals/patients")
def get_referral_patients(search: Optional[str] = Query(None), category: Optional[str] = Query(None)):
    """
    Get registered patients/beneficiaries available for clinical referral creation.
    """
    sb = get_supabase_client()
    patients_map = {p["id"]: dict(p) for p in _DEFAULT_PATIENTS}

    if sb:
        try:
            res = sb.table("profiles").select("*").neq("role", "doctor").neq("role", "facility_manager").execute()
            if res.data and len(res.data) > 0:
                for idx, p in enumerate(res.data):
                    p_id = p.get("id") or f"supa-pat-{idx}"
                    name = (p.get("name") or "").strip() or (p.get("email", "").split("@")[0] if p.get("email") else f"Patient {idx+1}")
                    patients_map[p_id] = {
                        "id": p_id,
                        "name": name,
                        "age": p.get("age") or (25 + (idx * 7) % 45),
                        "gender": p.get("gender") or ("Female" if idx % 2 == 0 else "Male"),
                        "abha_id": p.get("abha_id") or f"91-{4500 + idx}-8819-{str(p_id)[:4]}",
                        "blood_group": p.get("blood_group") or "O+",
                        "category": p.get("category") or ("Maternal ANC" if idx % 2 == 0 else "NCD Chronic"),
                        "risk_level": p.get("risk_level") or ("HIGH" if idx % 3 == 0 else "MODERATE"),
                        "village_name": p.get("village_name") or "Borvihir Pada",
                        "contact_phone": p.get("phone") or f"+91 9822{idx} 1000{idx}",
                        "vitals_summary": p.get("vitals_summary") or "BP: 128/82 mmHg, HR: 76 bpm, SpO2: 98%",
                        "medical_history": p.get("medical_history") or "Follow-up evaluation requested",
                        "assigned_asha": "Sunita Tai (ASHA)",
                        "primary_facility": "PHC Nandurbar Rural"
                    }
        except Exception as e:
            logger.warning(f"Could not load profiles from Supabase: {e}")

    patients = list(patients_map.values())

    # Filter by search
    if search:
        s = search.lower()
        patients = [
            p for p in patients
            if s in p.get("name", "").lower()
            or s in p.get("abha_id", "").lower()
            or s in p.get("village_name", "").lower()
            or s in p.get("category", "").lower()
        ]

    if category and category != "ALL":
        patients = [p for p in patients if category.lower() in p.get("category", "").lower()]

    return {
        "count": len(patients),
        "patients": patients
    }


@router.get("/referrals/doctors")
def get_referral_doctors(
    role: Optional[str] = Query(None),
    facility_type: Optional[str] = Query(None),
    specialty: Optional[str] = Query(None)
):
    """
    Get directory of verified doctors & specialists for role-based referral dispatch.
    """
    sb = get_supabase_client()
    doctors_map = {d["id"]: dict(d) for d in _DEFAULT_DOCTORS}

    if sb:
        try:
            res = sb.table("profiles").select("*").eq("role", "doctor").execute()
            if res.data and len(res.data) > 0:
                for idx, d in enumerate(res.data):
                    d_id = d.get("id") or f"supa-doc-{idx}"
                    doctors_map[d_id] = {
                        "id": d_id,
                        "name": d.get("name") or "Medical Officer",
                        "role": "doctor",
                        "tier": d.get("facility_type") or "Primary Health Centre (PHC)",
                        "specialty": d.get("specialty") or "General Medicine",
                        "facility_name": d.get("facility_name") or "PHC Nandurbar Rural",
                        "facility_type": d.get("facility_type") or "Primary Health Centre (PHC)",
                        "department": d.get("department") or "Clinical OPD",
                        "experience": d.get("experience") or "10 yrs",
                        "qualification": d.get("qualification") or "MBBS, MD",
                        "opd_status": "AVAILABLE",
                        "phone": d.get("phone") or "+91 98210 00000",
                        "email": d.get("email") or "doctor@curatrack.in"
                    }
        except Exception as e:
            logger.warning(f"Could not load doctors from Supabase: {e}")

    doctors = list(doctors_map.values())

    if facility_type and facility_type != "ALL":
        doctors = [d for d in doctors if facility_type.lower() in d.get("facility_type", "").lower()]

    if specialty and specialty != "ALL":
        doctors = [d for d in doctors if specialty.lower() in d.get("specialty", "").lower()]

    return {
        "count": len(doctors),
        "doctors": doctors
    }


@router.get("/referrals/{referral_id}")
def get_referral_by_id(
    referral_id: str,
    doctor_id: Optional[str] = Query(None),
    doctor_name: Optional[str] = Query(None)
):
    """
    Fetch single referral by ID or referral_token with doctor confidentiality enforcement.
    """
    sb = get_supabase_client()
    target_ref = None
    if sb:
        try:
            res = sb.table("referrals").select("*").or_(f"id.eq.{referral_id},referral_token.eq.{referral_id}").maybe_single().execute()
            if res and res.data:
                target_ref = res.data
        except Exception as e:
            logger.warning(f"Supabase lookup warning for {referral_id}: {e}")

    if not target_ref:
        stored = _load_stored_referrals()
        for r in stored:
            if r["id"] == referral_id or r.get("referral_token") == referral_id:
                target_ref = r
                break

    if not target_ref:
        raise HTTPException(status_code=404, detail=f"Referral {referral_id} not found.")

    # Doctor Privacy Check: If doctor_id or doctor_name provided, verify doctor is recipient or creator
    if doctor_id or doctor_name:
        dest_id = target_ref.get("destination_doctor_id")
        dest_name = (target_ref.get("destination_doctor_name") or "").lower()
        ref_id = target_ref.get("referring_doctor_id")
        ref_name = (target_ref.get("referring_doctor_name") or "").lower()

        is_generic_dest = not dest_id and (not dest_name or "receiving" in dest_name or "medical officer" in dest_name or "assigned" in dest_name)
        if not is_generic_dest:
            authorized = False
            if doctor_id and (dest_id == doctor_id or ref_id == doctor_id):
                authorized = True
            elif doctor_name:
                doc_clean = doctor_name.lower().replace("dr.", "").replace("dr ", "").strip()
                if doc_clean and (doc_clean in dest_name or dest_name in doc_clean or doc_clean in ref_name or ref_name in doc_clean):
                    authorized = True

            if not authorized:
                raise HTTPException(
                    status_code=403,
                    detail=f"Access Denied: Only the assigned destination doctor ({target_ref.get('destination_doctor_name') or 'Assigned Doctor'}) is authorized to view this patient's clinical details."
                )

    return target_ref


@router.post("/referrals/create")
def create_referral(req: ReferralCreateRequest):
    """
    Create a new inter-facility referral pass and persist to Supabase & disk with RBAC enforcement:
    - Patients cannot create clinical referrals (403 Forbidden).
    - ASHA frontline health workers ('fhw', 'asha') can ONLY refer patients upwards to Medical Officers / Doctors.
    - Doctors ('doctor') can refer patients to peer Doctors / Specialists across secondary/tertiary facilities.
    """
    caller_role = (req.created_by_role or req.referring_role or "doctor").lower()
    dest_role = (req.destination_role or "doctor").lower()

    # RBAC Rule 1: Patients cannot create referrals
    if caller_role == "patient":
        raise HTTPException(
            status_code=403,
            detail="Patients are not authorized to generate clinical referrals. Referrals must be initiated by Medical Officers or ASHA/ANM workers."
        )

    # RBAC Rule 2: ASHA workers can ONLY refer to Doctors / Medical Officers
    if caller_role in ["fhw", "asha"]:
        if dest_role not in ["doctor", "specialist", "medical_officer"]:
            raise HTTPException(
                status_code=400,
                detail="Role Hierarchy Violation: ASHA frontline workers can only refer patients upwards to Medical Officers / Doctors."
            )

    # RBAC Rule 3: Doctors can refer to Doctors/Specialists
    if caller_role == "doctor":
        if dest_role not in ["doctor", "specialist", "medical_officer"]:
            raise HTTPException(
                status_code=400,
                detail="Role Hierarchy Violation: Doctors can only refer patients to peer Doctors or Specialists."
            )

    token_num = random.randint(1000, 9999)
    referral_id = f"REF-{token_num}"
    now_iso = datetime.now(timezone.utc).isoformat()

    referring_actor_name = req.referring_doctor_name or ("Sunita Tai (ASHA)" if caller_role in ["fhw", "asha"] else "Dr. Ananya Sharma (MO)")
    destination_doc_name = req.destination_doctor_name or "Receiving Medical Officer"

    new_record = {
        "id": referral_id,
        "referral_token": referral_id,
        "patient_id": req.patient_id,
        "patient_name": req.patient_name,
        "patient_age": req.patient_age,
        "patient_gender": req.patient_gender,
        "abha_id": req.abha_id or f"91-{random.randint(1000,9999)}-{random.randint(1000,9999)}-{random.randint(1000,9999)}",
        "referring_doctor_name": referring_actor_name,
        "referring_role": caller_role,
        "referring_facility_type": req.referring_facility_type,
        "referring_facility_name": req.referring_facility_name,
        "destination_doctor_id": req.destination_doctor_id,
        "destination_doctor_name": destination_doc_name,
        "destination_role": dest_role,
        "destination_facility_type": req.destination_facility_type,
        "destination_facility_name": req.destination_facility_name,
        "specialty": req.specialty,
        "urgency": req.urgency,
        "clinical_reason": req.clinical_reason,
        "provisional_diagnosis": req.provisional_diagnosis,
        "vitals_summary": req.vitals_summary,
        "status": "CREATED",
        "created_at": now_iso,
        "updated_at": now_iso,
        "timeline": [
            {
                "status": "CREATED",
                "timestamp": now_iso,
                "actor": f"{referring_actor_name} ({caller_role.upper()})",
                "notes": f"Referral created for {req.patient_name} -> Transferred to {destination_doc_name} at {req.destination_facility_name}. Urgency: {req.urgency}."
            }
        ]
    }

    # 1. Persist permanently to durable disk storage
    stored = _load_stored_referrals()
    stored = [r for r in stored if r.get("id") != referral_id]
    stored.insert(0, new_record)
    _save_stored_referrals(stored)

    # 2. Attempt Supabase Table Insert
    sb = get_supabase_client()
    if sb:
        try:
            sb.table("referrals").insert(new_record).execute()
            logger.info(f"Referral {referral_id} persisted to Supabase successfully.")
        except Exception as e:
            logger.info(f"Referral {referral_id} saved to permanent disk storage (Supabase table not active): {e}")

    return {
        "status": "success",
        "success": True,
        "message": f"Referral {referral_id} created successfully and queued for {destination_doc_name} ({req.destination_facility_name}).",
        "referral": new_record
    }


@router.patch("/referrals/{referral_id}/status")
@router.post("/referrals/{referral_id}/status")
def update_referral_status(referral_id: str, req: ReferralStatusUpdateRequest):
    """
    Update referral lifecycle state across CREATED -> ACCEPTED -> IN_TRANSIT -> ARRIVED -> CONSULTED -> COMPLETED.
    Enforces that ONLY the assigned destination doctor can accept, consult, or complete the referral.
    """
    if req.actor_role and req.actor_role.lower() == "patient":
        raise HTTPException(
            status_code=403,
            detail="Patients cannot advance or modify inter-facility referral clinical lifecycle states."
        )

    valid_statuses = ["CREATED", "ACCEPTED", "IN_TRANSIT", "ARRIVED", "CONSULTED", "COMPLETED", "REJECTED", "OVERDUE_ESCALATED"]
    if req.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of {valid_statuses}")

    sb = get_supabase_client()
    now_iso = datetime.now(timezone.utc).isoformat()
    
    stored = _load_stored_referrals()
    existing = None
    existing_idx = -1
    for idx, r in enumerate(stored):
        if r.get("id") == referral_id or r.get("referral_token") == referral_id:
            existing = r
            existing_idx = idx
            break

    if sb:
        try:
            res = sb.table("referrals").select("*").or_(f"id.eq.{referral_id},referral_token.eq.{referral_id}").maybe_single().execute()
            if res and res.data:
                existing = res.data
        except Exception as ex:
            logger.info(f"Supabase referral lookup: {ex}")

    if not existing:
        raise HTTPException(status_code=404, detail=f"Referral {referral_id} not found.")

    # Doctor RBAC Rule: Only the assigned destination doctor can accept or consult on incoming referrals
    if req.actor_role and req.actor_role.lower() == "doctor":
        dest_id = existing.get("destination_doctor_id")
        dest_name = existing.get("destination_doctor_name") or ""
        is_generic_dest = not dest_id and (not dest_name or "receiving" in dest_name.lower() or "medical officer" in dest_name.lower() or "assigned" in dest_name.lower())

        if req.status in ["ACCEPTED", "CONSULTED", "COMPLETED"]:
            if not is_generic_dest:
                is_authorized = False
                if req.doctor_id and dest_id and req.doctor_id == dest_id:
                    is_authorized = True
                elif req.doctor_name and dest_name:
                    req_clean = req.doctor_name.lower().replace("dr.", "").replace("dr ", "").strip()
                    dest_clean = dest_name.lower().replace("dr.", "").replace("dr ", "").strip()
                    if req_clean and dest_clean and (req_clean in dest_clean or dest_clean in req_clean):
                        is_authorized = True

                if not is_authorized:
                    raise HTTPException(
                        status_code=403,
                        detail=f"Access Denied: Only the assigned destination doctor ({dest_name or 'Assigned Doctor'}) can accept and manage this patient referral."
                    )

    timeline = existing.get("timeline") or []
    timeline.append({
        "status": req.status,
        "timestamp": now_iso,
        "actor": req.updated_by or req.doctor_name or "Health Officer",
        "notes": req.notes or f"Status transitioned to {req.status}."
    })

    update_payload = {
        "status": req.status,
        "timeline": timeline,
        "updated_at": now_iso
    }

    if req.status == "ACCEPTED":
        update_payload["accepted_at"] = now_iso
    elif req.status == "IN_TRANSIT":
        update_payload["in_transit_at"] = now_iso
    elif req.status == "ARRIVED":
        update_payload["arrived_at"] = now_iso
    elif req.status == "CONSULTED":
        update_payload["consulted_at"] = now_iso
    elif req.status == "COMPLETED":
        update_payload["completed_at"] = now_iso
    elif req.status == "REJECTED":
        update_payload["rejected_at"] = now_iso
        update_payload["rejection_reason"] = req.notes or "Rejected by destination facility"
    elif req.status == "OVERDUE_ESCALATED":
        update_payload["escalated_at"] = now_iso
        update_payload["escalation_reason"] = req.notes or "Escalated due to SLA breach"

    existing.update(update_payload)

    # Persist updated referral to disk storage
    if existing_idx >= 0:
        stored[existing_idx] = existing
    else:
        stored.insert(0, existing)
    _save_stored_referrals(stored)

    # Attempt Supabase update
    if sb:
        try:
            sb.table("referrals").update(update_payload).or_(f"id.eq.{referral_id},referral_token.eq.{referral_id}").execute()
        except Exception as e:
            logger.info(f"Supabase update: {e}")

    return {
        "status": "success",
        "message": f"Referral {referral_id} successfully updated to {req.status}.",
        "referral": existing
    }


@router.post("/referrals/check-escalations")
def trigger_escalation_check():
    """
    Manually or systematically trigger an automated SLA scan.
    """
    sb = get_supabase_client()
    items = []
    if sb:
        try:
            res = sb.table("referrals").select("*").eq("status", "CREATED").eq("urgency", "EMERGENCY").execute()
            items = res.data if res.data else []
        except Exception as e:
            logger.error(f"Escalation query failed: {e}")
            items = [r for r in _FALLBACK_REFERRALS if r.get("status") == "CREATED" and r.get("urgency") == "EMERGENCY"]
    else:
        items = [r for r in _FALLBACK_REFERRALS if r.get("status") == "CREATED" and r.get("urgency") == "EMERGENCY"]

    escalated = _auto_check_and_escalate_overdue(items)
    overdue_count = sum(1 for r in escalated if r.get("status") == "OVERDUE_ESCALATED")

    return {
        "status": "success",
        "scanned": len(items),
        "escalated_count": overdue_count,
        "message": f"SLA check completed. {overdue_count} emergency referrals flagged as OVERDUE_ESCALATED."
    }

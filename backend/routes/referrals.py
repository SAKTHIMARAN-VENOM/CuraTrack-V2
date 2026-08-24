from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import List, Optional
import time
import random

router = APIRouter()

class ReferralCreateRequest(BaseModel):
    patient_id: str = "p-101"
    patient_name: str
    patient_age: int
    patient_gender: str
    referring_doctor_name: str
    referring_facility_type: str = "Primary Health Centre (PHC)"
    referring_facility_name: str
    destination_facility_type: str = "District Hospital"
    destination_facility_name: str
    specialty: str
    urgency: str = "URGENT"  # "EMERGENCY" | "URGENT" | "ROUTINE"
    clinical_reason: str
    provisional_diagnosis: str
    vitals_summary: Optional[str] = "BP 130/84, HR 78, SpO2 98%"
    abha_id: Optional[str] = None


class ReferralStatusUpdateRequest(BaseModel):
    status: str  # "CREATED", "ACCEPTED", "IN_TRANSIT", "SCHEDULED", "CONSULTED", "COMPLETED"
    notes: Optional[str] = None
    updated_by: Optional[str] = "Receiving Officer"


# Initial in-memory mock repository of public health referrals
_referrals_db = [
    {
        "id": "REF-8841",
        "patient_id": "p-101",
        "patient_name": "Rameshwar Patel",
        "patient_age": 54,
        "patient_gender": "Male",
        "abha_id": "91-4402-8812-9901",
        "referring_doctor_name": "Dr. Ananya Sharma (MO)",
        "referring_facility_type": "Primary Health Centre (PHC)",
        "referring_facility_name": "PHC Nandurbar Rural",
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
            {"status": "ACCEPTED", "timestamp": "2026-08-21T11:15:00Z", "actor": "Dr. V. K. Deshmukh (Civil Hospital)", "notes": "Referral accepted. Cardiology OPD slot reserved for Aug 24."}
        ]
    },
    {
        "id": "REF-7204",
        "patient_id": "p-204",
        "patient_name": "Sunita Devi",
        "patient_age": 27,
        "patient_gender": "Female",
        "abha_id": "91-1029-4471-3382",
        "referring_doctor_name": "Rekha ANM & ASHA Sunita",
        "referring_facility_type": "Ayushman Arogya Mandir (Sub-Centre)",
        "referring_facility_name": "Sub-Centre Borvihir",
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
            {"status": "CREATED", "timestamp": "2026-08-23T06:45:00Z", "actor": "Rekha ANM", "notes": "Danger signs detected during ANC-3 visit."},
            {"status": "ACCEPTED", "timestamp": "2026-08-23T07:05:00Z", "actor": "CHC On-Duty Medical Officer", "notes": "Emergency bed allocated in Maternity Ward."},
            {"status": "IN_TRANSIT", "timestamp": "2026-08-23T07:30:00Z", "actor": "108 Ambulance Dispatch #MH-18-402", "notes": "Patient picked up with ASHA escort."}
        ]
    },
    {
        "id": "REF-5190",
        "patient_id": "p-309",
        "patient_name": "Bhikaji Shinde",
        "patient_age": 62,
        "patient_gender": "Male",
        "abha_id": "91-7782-9012-4411",
        "referring_doctor_name": "Dr. Pradeep Roy (MO)",
        "referring_facility_type": "Community Health Centre (CHC)",
        "referring_facility_name": "CHC Shahada Block",
        "destination_facility_type": "District Hospital",
        "destination_facility_name": "Dhule Government Medical College",
        "specialty": "Pulmonology & Infectious Diseases",
        "urgency": "URGENT",
        "clinical_reason": "Chronic productive cough > 4 weeks with hemoptysis and unresolving consolidative opacities on chest X-ray.",
        "provisional_diagnosis": "Multi-Drug Resistant Tuberculosis (MDR-TB) Evaluation",
        "vitals_summary": "BP: 110/72 mmHg, Temp: 38.4°C, SpO2: 93%",
        "status": "COMPLETED",
        "created_at": "2026-08-14T10:00:00Z",
        "timeline": [
            {"status": "CREATED", "timestamp": "2026-08-14T10:00:00Z", "actor": "Dr. Pradeep Roy", "notes": "Sputum CB-NAAT sent to District DMC."},
            {"status": "ACCEPTED", "timestamp": "2026-08-14T14:20:00Z", "actor": "DMC Dhule", "notes": "Sample received and registered for LPA testing."},
            {"status": "CONSULTED", "timestamp": "2026-08-17T11:00:00Z", "actor": "Dr. K. G. Joshi (Chest Specialist)", "notes": "Started on BPaLM all-oral regimen."},
            {"status": "COMPLETED", "timestamp": "2026-08-19T16:00:00Z", "actor": "Nikshay Portal Sync", "notes": "Nikshay ID linked. First line medication kit dispatched to PHC."}
        ]
    }
]


@router.get("/referrals")
def list_referrals(
    status: Optional[str] = Query(None, description="Filter by status"),
    patient_id: Optional[str] = Query(None, description="Filter by patient ID"),
    urgency: Optional[str] = Query(None, description="Filter by urgency")
):
    """List all active or past referrals across the healthcare hierarchy."""
    results = _referrals_db
    if status and status.upper() in ["COMPLETED", "HISTORY"]:
        results = [r for r in results if r["status"].upper() == "COMPLETED"]
    elif status and status.upper() not in ["ALL", "ACTIVE"]:
        results = [r for r in results if r["status"].upper() == status.upper()]
    else:
        # For ALL or ACTIVE or default: show active pipeline and exclude completed history
        results = [r for r in results if r["status"].upper() != "COMPLETED"]

    if patient_id:
        results = [r for r in results if r["patient_id"] == patient_id]
    if urgency and urgency != "ALL":
        results = [r for r in results if r["urgency"].upper() == urgency.upper()]

    return {
        "count": len(results),
        "referrals": results
    }


@router.get("/referrals/{referral_id}")
def get_referral(referral_id: str):
    """Get complete clinical and timeline detail for a referral."""
    for ref in _referrals_db:
        if ref["id"] == referral_id:
            return ref
    raise HTTPException(status_code=404, detail="Referral ID not found")


@router.post("/referrals/create")
def create_referral(req: ReferralCreateRequest):
    """Creates a new digital referral token linking patient from SC/PHC to CHC/District Hospital."""
    new_id = f"REF-{random.randint(1000, 9999)}"
    now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    new_referral = {
        "id": new_id,
        "patient_id": req.patient_id,
        "patient_name": req.patient_name,
        "patient_age": req.patient_age,
        "patient_gender": req.patient_gender,
        "abha_id": req.abha_id or f"91-{random.randint(1000,9999)}-{random.randint(1000,9999)}-{random.randint(1000,9999)}",
        "referring_doctor_name": req.referring_doctor_name,
        "referring_facility_type": req.referring_facility_type,
        "referring_facility_name": req.referring_facility_name,
        "destination_facility_type": req.destination_facility_type,
        "destination_facility_name": req.destination_facility_name,
        "specialty": req.specialty,
        "urgency": req.urgency,
        "clinical_reason": req.clinical_reason,
        "provisional_diagnosis": req.provisional_diagnosis,
        "vitals_summary": req.vitals_summary,
        "status": "CREATED",
        "created_at": now_iso,
        "timeline": [
            {
                "status": "CREATED",
                "timestamp": now_iso,
                "actor": req.referring_doctor_name,
                "notes": f"Referral generated from {req.referring_facility_name} to {req.destination_facility_name}."
            }
        ]
    }

    _referrals_db.insert(0, new_referral)

    return {
        "success": True,
        "message": f"Referral {new_id} generated successfully.",
        "referral": new_referral
    }


@router.post("/referrals/{referral_id}/status")
def update_referral_status(referral_id: str, req: ReferralStatusUpdateRequest):
    """Updates referral pipeline lifecycle status (CREATED -> ACCEPTED -> IN_TRANSIT -> CONSULTED -> COMPLETED)."""
    now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    for ref in _referrals_db:
        if ref["id"] == referral_id:
            ref["status"] = req.status
            ref["timeline"].append({
                "status": req.status,
                "timestamp": now_iso,
                "actor": req.updated_by or "Medical Officer",
                "notes": req.notes or f"Status updated to {req.status}."
            })
            return {
                "success": True,
                "message": f"Referral {referral_id} status updated to {req.status}.",
                "referral": ref
            }

    raise HTTPException(status_code=404, detail="Referral ID not found")

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import List, Optional
import time
import random

router = APIRouter()

class BeneficiaryRegisterRequest(BaseModel):
    name: str
    age: int
    gender: str
    category: str = "Maternal ANC"  # "Maternal ANC", "Child Immunization", "NCD Chronic", "TB / Communicable"
    risk_level: str = "HIGH"  # "HIGH", "MODERATE", "LOW"
    village_name: str
    contact_phone: Optional[str] = None
    guardian_name: Optional[str] = None
    next_due_date: str
    next_due_service: str
    notes: Optional[str] = None


class AssistedConsultRequest(BaseModel):
    beneficiary_id: str
    beneficiary_name: str
    asha_name: str = "Sunita Tai (ASHA #402)"
    village_name: str = "Nandurbar Block A"
    specialist_type: str = "General Physician / Medical Officer"
    chief_complaint: str
    systolic_bp: Optional[float] = 130
    diastolic_bp: Optional[float] = 84
    spo2: Optional[float] = 98
    heart_rate: Optional[float] = 76
    random_glucose: Optional[float] = 142
    notes: Optional[str] = None


# Initial catchment data for Frontline Health Worker / ASHA
_beneficiaries_db = [
    {
        "id": "BEN-101",
        "name": "Kavita Bai",
        "age": 23,
        "gender": "Female",
        "category": "Maternal ANC",
        "risk_level": "HIGH",
        "village_name": "Borvihir Pada",
        "contact_phone": "+91 98221 44019",
        "guardian_name": "Suresh Bai (Husband)",
        "gravida_para": "G2 P1",
        "gestational_weeks": 32,
        "next_due_date": "2026-08-25",
        "next_due_service": "ANC-3 Checkup & Iron-Folic Acid (IFA) Refill",
        "risk_factors": ["Severe Anemia (Hb 7.8 g/dL)", "Previous Low Birth Weight delivery"],
        "status": "OVERDUE",
        "assigned_asha": "Sunita Tai (ASHA #402)"
    },
    {
        "id": "BEN-102",
        "name": "Master Aarav Gavit",
        "age": 1,
        "gender": "Male",
        "category": "Child Immunization",
        "risk_level": "MODERATE",
        "village_name": "Dongargaon",
        "contact_phone": "+91 94032 11982",
        "guardian_name": "Meena Gavit (Mother)",
        "next_due_date": "2026-08-24",
        "next_due_service": "MR-1 (Measles-Rubella) & Vitamin A (Dose 1)",
        "risk_factors": ["Moderate Acute Malnutrition (MAM)"],
        "status": "DUE_SOON",
        "assigned_asha": "Sunita Tai (ASHA #402)"
    },
    {
        "id": "BEN-103",
        "name": "Tukaram Patil",
        "age": 58,
        "gender": "Male",
        "category": "NCD Chronic",
        "risk_level": "HIGH",
        "village_name": "Borvihir Pada",
        "contact_phone": "+91 97654 88310",
        "guardian_name": "Self",
        "next_due_date": "2026-08-22",
        "next_due_service": "Monthly BP & Blood Sugar Screening + Amlodipine 5mg Refill",
        "risk_factors": ["Hypertension (Last BP: 168/102 mmHg)", "Irregular medication compliance"],
        "status": "OVERDUE",
        "assigned_asha": "Sunita Tai (ASHA #402)"
    },
    {
        "id": "BEN-104",
        "name": "Lalita Vasave",
        "age": 34,
        "gender": "Female",
        "category": "TB / Communicable",
        "risk_level": "HIGH",
        "village_name": "Dhanora",
        "contact_phone": "+91 91580 33412",
        "guardian_name": "Dinesh Vasave (Husband)",
        "next_due_date": "2026-08-26",
        "next_due_service": "DOTS 4-FDC Medication Refill & Monthly Weight Monitoring",
        "risk_factors": ["Active Pulmonary TB (Month 2 of intensive phase)"],
        "status": "DUE_SOON",
        "assigned_asha": "Sunita Tai (ASHA #402)"
    }
]


@router.get("/fhw/beneficiaries")
def list_beneficiaries(
    category: Optional[str] = Query(None, description="Filter by category"),
    risk_level: Optional[str] = Query(None, description="Filter by risk level"),
    status: Optional[str] = Query(None, description="Filter by status (OVERDUE / DUE_SOON)")
):
    """Returns rural beneficiaries under the ASHA / ANM catchment area."""
    results = _beneficiaries_db
    if category and category != "ALL":
        results = [b for b in results if b["category"].upper() == category.upper()]
    if risk_level and risk_level != "ALL":
        results = [b for b in results if b["risk_level"].upper() == risk_level.upper()]
    if status and status != "ALL":
        results = [b for b in results if b.get("status", "").upper() == status.upper()]

    return {
        "count": len(results),
        "high_risk_count": len([b for b in _beneficiaries_db if b["risk_level"] == "HIGH"]),
        "overdue_count": len([b for b in _beneficiaries_db if b.get("status") == "OVERDUE"]),
        "beneficiaries": results
    }


@router.get("/fhw/followups")
def get_followup_alerts():
    """Returns categorized follow-up lists for daily field visits by ASHA workers."""
    overdue = [b for b in _beneficiaries_db if b.get("status") == "OVERDUE"]
    due_soon = [b for b in _beneficiaries_db if b.get("status") == "DUE_SOON"]

    return {
        "overdue_tasks": overdue,
        "upcoming_tasks": due_soon,
        "summary": {
            "total_assigned": len(_beneficiaries_db),
            "urgent_home_visits_needed": len(overdue),
            "maternal_anc_active": len([b for b in _beneficiaries_db if b["category"] == "Maternal ANC"]),
            "child_immunization_active": len([b for b in _beneficiaries_db if b["category"] == "Child Immunization"]),
            "ncd_chronic_active": len([b for b in _beneficiaries_db if b["category"] == "NCD Chronic"])
        }
    }


@router.post("/fhw/register-beneficiary")
def register_beneficiary(req: BeneficiaryRegisterRequest):
    """Enrolls a rural villager into the ASHA catchment record."""
    new_id = f"BEN-{random.randint(105, 999)}"
    new_item = {
        "id": new_id,
        "name": req.name,
        "age": req.age,
        "gender": req.gender,
        "category": req.category,
        "risk_level": req.risk_level,
        "village_name": req.village_name,
        "contact_phone": req.contact_phone or "Not provided",
        "guardian_name": req.guardian_name or "N/A",
        "next_due_date": req.next_due_date,
        "next_due_service": req.next_due_service,
        "risk_factors": [req.notes] if req.notes else ["Standard primary care follow-up"],
        "status": "DUE_SOON",
        "assigned_asha": "Sunita Tai (ASHA #402)"
    }
    _beneficiaries_db.insert(0, new_item)
    return {
        "success": True,
        "message": f"Beneficiary {req.name} successfully registered with ID {new_id}.",
        "beneficiary": new_item
    }


@router.post("/fhw/assisted-consult")
def initiate_assisted_consult(req: AssistedConsultRequest):
    """
    Creates an Assisted Teleconsultation room linking ASHA tablet directly
    to an on-duty Specialist / MO at the CHC or District Hospital.
    """
    room_id = f"fhw-teleconsult-{random.randint(1000, 9999)}"
    now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    return {
        "success": True,
        "session_id": f"SESS-{random.randint(10000, 99999)}",
        "room_id": room_id,
        "call_url": f"/call/{room_id}",
        "beneficiary_id": req.beneficiary_id,
        "beneficiary_name": req.beneficiary_name,
        "asha_name": req.asha_name,
        "specialist_assigned": req.specialist_type,
        "created_at": now_iso,
        "vitals_snapshot": {
            "bp": f"{int(req.systolic_bp) if req.systolic_bp is not None else 120}/{int(req.diastolic_bp) if req.diastolic_bp is not None else 80} mmHg",
            "spo2": f"{int(req.spo2) if req.spo2 is not None else 98}%",
            "heart_rate": f"{int(req.heart_rate) if req.heart_rate is not None else 76} bpm",
            "glucose": f"{int(req.random_glucose) if req.random_glucose is not None else 120} mg/dL"
        },
        "chief_complaint": req.chief_complaint,
        "status": "CONNECTING"
    }

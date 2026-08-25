import time
import random
import logging
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from services.supabase_client import get_supabase_client

logger = logging.getLogger("curatrack.fhw")
router = APIRouter()

# ─── Request Models ────────────────────────────────────────────────────────

class BeneficiaryRegisterRequest(BaseModel):
    patient_id: Optional[str] = None
    name: str
    age: int
    gender: str
    category: str = "Maternal ANC"  # "Maternal ANC", "Child Immunization", "NCD Chronic", "TB / Communicable"
    risk_level: str = "HIGH"  # "HIGH", "MODERATE", "LOW"
    village_name: str
    contact_phone: Optional[str] = None
    guardian_name: Optional[str] = None
    gravida_para: Optional[str] = None
    gestational_weeks: Optional[int] = None
    next_due_date: str
    next_due_service: str
    risk_factors: Optional[List[str]] = []
    assigned_asha: Optional[str] = "Sunita Tai (ASHA #402)"
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


class FollowupTaskCreateRequest(BaseModel):
    beneficiary_id: Optional[str] = None
    patient_id: Optional[str] = None
    patient_name: str
    assigned_fhw_id: str = "fhw-1"
    assigned_asha_name: Optional[str] = "Sunita Tai (ASHA #402)"
    assigned_by_doctor_id: Optional[str] = None
    assigned_by_doctor_name: Optional[str] = "Dr. David Ross (Civil Hospital)"
    referral_id: Optional[str] = None
    task_type: str = "Post-Op Check"  # 'Post-Op Check', 'Medication Adherence', 'IFA & Nutrition Check', 'ANC Danger Signs Check', 'BP & Glucose Check', 'TB DOTS Verification', 'Child Immunization Check'
    instructions: str
    priority: str = "MEDIUM"  # 'HIGH', 'MEDIUM', 'ROUTINE'
    due_date: str


class FollowupTaskCompleteRequest(BaseModel):
    outcome: str  # 'STABLE', 'IMPROVED', 'DANGER_SIGNS_DETECTED', 'REFERRED', 'MEDICATION_VERIFIED'
    notes: str
    vitals_recorded: Optional[dict] = None
    completed_by: Optional[str] = "Sunita Tai (ASHA #402)"


# ─── Fallback Seed Data ───────────────────────────────────────────────────
_FALLBACK_BENEFICIARIES = [
    {
        "id": "BEN-101",
        "patient_id": "p-204",
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
        "patient_id": "p-302",
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
        "patient_id": "p-101",
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
        "patient_id": "p-405",
        "name": "Lalita Vasave",
        "age": 34,
        "gender": "Female",
        "category": "TB / Communicable",
        "risk_level": "HIGH",
        "village_name": "Dhanora",
        "contact_phone": "+91 91580 33412",
        "guardian_name": "Dinesh Vasave (Husband)",
        "next_due_date": "2026-08-26",
        "next_due_service": "DOTS Sputum Follow-up (Month 2) + Nutritional Basket Delivery",
        "risk_factors": ["Weight Loss > 5kg in 2 months", "Close contact with active pulmonary TB"],
        "status": "DUE_SOON",
        "assigned_asha": "Sunita Tai (ASHA #402)"
    }
]

_FALLBACK_FOLLOWUPS = [
    {
        "id": "TSK-101",
        "beneficiary_id": "BEN-101",
        "patient_id": "p-204",
        "patient_name": "Kavita Bai",
        "assigned_fhw_id": "fhw-1",
        "assigned_asha_name": "Sunita Tai (ASHA #402)",
        "assigned_by_doctor_name": "Dr. David Ross (Civil Hospital)",
        "task_type": "ANC Danger Signs Check",
        "instructions": "Visit home and check pedal edema and BP cuff reading. Verify IFA tablet intake twice daily.",
        "priority": "HIGH",
        "due_date": "2026-08-26",
        "status": "PENDING"
    },
    {
        "id": "TSK-102",
        "beneficiary_id": "BEN-103",
        "patient_id": "p-101",
        "patient_name": "Tukaram Patil",
        "assigned_fhw_id": "fhw-1",
        "assigned_asha_name": "Sunita Tai (ASHA #402)",
        "assigned_by_doctor_name": "Dr. Ananya Sharma (PHC MO)",
        "task_type": "Medication Adherence",
        "instructions": "Verify that patient is taking Amlodipine 5mg each morning. Measure resting BP.",
        "priority": "MEDIUM",
        "due_date": "2026-08-27",
        "status": "PENDING"
    }
]


# ─── Endpoints: Beneficiary Catchment ──────────────────────────────────────

@router.get("/fhw/beneficiaries")
def get_beneficiaries(
    category: Optional[str] = Query(None),
    risk_level: Optional[str] = Query(None),
    village_name: Optional[str] = Query(None),
    status: Optional[str] = Query(None)
):
    """
    Fetch frontline worker catchment population from Supabase with multi-factor risk categorization.
    """
    sb = get_supabase_client()
    data = []

    if sb:
        try:
            query = sb.table("beneficiaries").select("*")
            if category:
                query = query.eq("category", category)
            if risk_level:
                query = query.eq("risk_level", risk_level)
            if status:
                query = query.eq("status", status)
            
            res = query.order("created_at", desc=True).execute()
            data = res.data if res.data is not None else []
        except Exception as e:
            logger.error(f"Failed to query beneficiaries from Supabase: {e}")
            data = _FALLBACK_BENEFICIARIES
    else:
        data = _FALLBACK_BENEFICIARIES

    if village_name:
        data = [b for b in data if village_name.lower() in b.get("village_name", "").lower()]

    total = len(data)
    high_risk_count = sum(1 for b in data if b.get("risk_level") == "HIGH")
    overdue_count = sum(1 for b in data if b.get("status") == "OVERDUE")
    due_soon_count = sum(1 for b in data if b.get("status") == "DUE_SOON")

    return {
        "beneficiaries": data,
        "metrics": {
            "total_catchment": total,
            "high_risk": high_risk_count,
            "overdue": overdue_count,
            "due_soon": due_soon_count,
            "coverage_rate": f"{round(((total - overdue_count) / max(total, 1)) * 100, 1)}%"
        }
    }


@router.post("/fhw/register-beneficiary")
def register_beneficiary(req: BeneficiaryRegisterRequest):
    """
    Register a new catchment beneficiary in Supabase with category and risk flags.
    """
    num = random.randint(100, 999)
    ben_id = f"BEN-{num}"
    now_iso = datetime.now(timezone.utc).isoformat()

    new_beneficiary = {
        "id": ben_id,
        "patient_id": req.patient_id or f"p-{random.randint(500, 999)}",
        "name": req.name,
        "age": req.age,
        "gender": req.gender,
        "category": req.category,
        "risk_level": req.risk_level,
        "village_name": req.village_name,
        "contact_phone": req.contact_phone,
        "guardian_name": req.guardian_name,
        "gravida_para": req.gravida_para,
        "gestational_weeks": req.gestational_weeks,
        "next_due_date": req.next_due_date,
        "next_due_service": req.next_due_service,
        "risk_factors": req.risk_factors or [],
        "status": "DUE_SOON",
        "assigned_asha": req.assigned_asha or "Sunita Tai (ASHA #402)",
        "notes": req.notes,
        "active": True,
        "created_at": now_iso,
        "updated_at": now_iso
    }

    sb = get_supabase_client()
    if sb:
        try:
            sb.table("beneficiaries").insert(new_beneficiary).execute()
            logger.info(f"Beneficiary {ben_id} registered in Supabase.")
        except Exception as e:
            logger.error(f"Failed to insert beneficiary into Supabase: {e}")
            _FALLBACK_BENEFICIARIES.insert(0, new_beneficiary)
    else:
        _FALLBACK_BENEFICIARIES.insert(0, new_beneficiary)

    return {
        "status": "success",
        "message": f"Beneficiary {req.name} ({ben_id}) successfully enrolled in ASHA Catchment Registry.",
        "beneficiary": new_beneficiary
    }


# ─── Endpoints: ASHA Follow-up Tasks (Closed-Loop Workflow) ───────────────

@router.get("/fhw/followups")
def get_followups(
    assigned_fhw_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    patient_id: Optional[str] = Query(None)
):
    """
    Fetch active follow-up tasks assigned to ASHA frontline workers.
    """
    sb = get_supabase_client()
    data = []

    if sb:
        try:
            query = sb.table("fhw_followups").select("*")
            if assigned_fhw_id:
                query = query.eq("assigned_fhw_id", assigned_fhw_id)
            if status:
                query = query.eq("status", status)
            if patient_id:
                query = query.eq("patient_id", patient_id)
            
            res = query.order("created_at", desc=True).execute()
            data = res.data if res.data is not None else []
        except Exception as e:
            logger.error(f"Failed to query fhw_followups: {e}")
            data = _FALLBACK_FOLLOWUPS
    else:
        data = _FALLBACK_FOLLOWUPS

    return {
        "tasks": data,
        "pending_count": sum(1 for t in data if t.get("status") == "PENDING"),
        "completed_count": sum(1 for t in data if t.get("status") == "COMPLETED")
    }


@router.post("/fhw/followups/create")
def create_followup_task(req: FollowupTaskCreateRequest):
    """
    Dispatched by Doctor upon patient discharge or by ASHA supervisor.
    """
    task_num = random.randint(100, 999)
    task_id = f"TSK-{task_num}"
    now_iso = datetime.now(timezone.utc).isoformat()

    new_task = {
        "id": task_id,
        "beneficiary_id": req.beneficiary_id,
        "patient_id": req.patient_id,
        "patient_name": req.patient_name,
        "assigned_fhw_id": req.assigned_fhw_id,
        "assigned_asha_name": req.assigned_asha_name,
        "assigned_by_doctor_id": req.assigned_by_doctor_id,
        "assigned_by_doctor_name": req.assigned_by_doctor_name,
        "referral_id": req.referral_id,
        "task_type": req.task_type,
        "instructions": req.instructions,
        "priority": req.priority,
        "due_date": req.due_date,
        "status": "PENDING",
        "created_at": now_iso,
        "updated_at": now_iso
    }

    sb = get_supabase_client()
    if sb:
        try:
            sb.table("fhw_followups").insert(new_task).execute()
            logger.info(f"Follow-up task {task_id} saved to Supabase.")
        except Exception as e:
            logger.error(f"Failed to insert fhw_followup: {e}")
            _FALLBACK_FOLLOWUPS.insert(0, new_task)
    else:
        _FALLBACK_FOLLOWUPS.insert(0, new_task)

    return {
        "status": "success",
        "message": f"Follow-up task {task_id} assigned to {req.assigned_asha_name}.",
        "task": new_task
    }


@router.patch("/fhw/followups/{task_id}/complete")
@router.post("/fhw/followups/{task_id}/complete")
def complete_followup_task(task_id: str, req: FollowupTaskCompleteRequest):
    """
    ASHA worker records home visit outcome and marks task as completed.
    """
    sb = get_supabase_client()
    now_iso = datetime.now(timezone.utc).isoformat()

    update_payload = {
        "status": "COMPLETED",
        "outcome": req.outcome,
        "notes": req.notes,
        "completed_at": now_iso,
        "updated_at": now_iso
    }

    if sb:
        try:
            res = sb.table("fhw_followups").update(update_payload).eq("id", task_id).execute()
            if res.data:
                return {
                    "status": "success",
                    "message": f"Follow-up task {task_id} successfully marked as completed.",
                    "task": res.data[0]
                }
        except Exception as e:
            logger.error(f"Failed to update fhw_followup in Supabase: {e}")

    for t in _FALLBACK_FOLLOWUPS:
        if t["id"] == task_id:
            t.update(update_payload)
            return {
                "status": "success",
                "message": f"Follow-up task {task_id} completed.",
                "task": t
            }

    raise HTTPException(status_code=404, detail=f"Task {task_id} not found.")


# ─── Endpoints: Assisted Teleconsultation Handshake ────────────────────────

@router.post("/fhw/assisted-consult")
def initiate_assisted_consult(req: AssistedConsultRequest):
    """
    Creates an assisted teleconsultation session room linked to patient & doctor queue.
    """
    room_token = random.randint(1000, 9999)
    room_id = f"tele-assisted-{room_token}"
    now_iso = datetime.now(timezone.utc).isoformat()

    consult_record = {
        "room_id": room_id,
        "client_id": req.beneficiary_id,
        "beneficiary_name": req.beneficiary_name,
        "consult_type": "assisted_asha",
        "asha_name": req.asha_name,
        "village_name": req.village_name,
        "chief_complaint": req.chief_complaint,
        "vitals": {
            "bp": f"{int(req.systolic_bp or 120)}/{int(req.diastolic_bp or 80)}",
            "spo2": req.spo2,
            "hr": req.heart_rate,
            "glucose": req.random_glucose
        },
        "status": "ringing",
        "scheduled_time": now_iso,
        "created_at": now_iso
    }

    sb = get_supabase_client()
    if sb:
        try:
            # Insert into appointments table so Doctor OPD queue detects incoming call via Realtime
            sb.table("appointments").insert({
                "room_id": room_id,
                "client_id": req.beneficiary_id,
                "doctor_id": "doc-default",
                "scheduled_time": now_iso,
                "status": "ringing",
                "priority": "PRIORITY",
                "reason": f"ASHA-Assisted: {req.chief_complaint}"
            }).execute()
        except Exception as e:
            logger.warning(f"Could not insert appointment into Supabase: {e}")

    return {
        "status": "initiated",
        "room_id": room_id,
        "call_url": f"/call/{room_id}",
        "message": f"Assisted teleconsultation created with {req.specialist_type}. Ringing available Medical Officer."
    }

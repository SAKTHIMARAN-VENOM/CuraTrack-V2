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
    created_by_role: Optional[str] = "doctor"  # "doctor" | "fhw" | "facility_manager"


class ReferralStatusUpdateRequest(BaseModel):
    status: str  # "CREATED", "ACCEPTED", "IN_TRANSIT", "ARRIVED", "CONSULTED", "COMPLETED", "REJECTED", "OVERDUE_ESCALATED"
    notes: Optional[str] = None
    updated_by: Optional[str] = "Receiving Officer"
    actor_role: Optional[str] = "doctor"


# ─── Fallback Seed Data (Used only if Supabase table is unreachable) ────────
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
        "referral_token": "REF-5190",
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
        "referring_facility_type": "Primary Health Centre (PHC)",
        "referring_facility_name": "PHC Nandurbar Rural",
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
            {"status": "COMPLETED", "timestamp": "2026-08-18T14:00:00Z", "actor": "Dr. V. K. Deshmukh", "notes": "Consultation and lab tests completed."}
        ]
    }
]


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
    specialty: Optional[str] = Query(None)
):
    """
    Fetch referrals from Supabase with filters and automated SLA escalation detection.
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
            referrals_data = res.data if res.data is not None else []
        except Exception as e:
            logger.error(f"Failed to fetch referrals from Supabase: {e}")
            referrals_data = _FALLBACK_REFERRALS
    else:
        referrals_data = _FALLBACK_REFERRALS

    # Run automated SLA check on active emergency referrals
    referrals_data = _auto_check_and_escalate_overdue(referrals_data)

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


@router.get("/referrals/{referral_id}")
def get_referral_by_id(referral_id: str):
    """
    Fetch single referral by ID or referral_token.
    """
    sb = get_supabase_client()
    if sb:
        try:
            res = sb.table("referrals").select("*").or_(f"id.eq.{referral_id},referral_token.eq.{referral_id}").maybe_single().execute()
            if res and res.data:
                return res.data
        except Exception as e:
            logger.error(f"Supabase lookup error for {referral_id}: {e}")

    for r in _FALLBACK_REFERRALS:
        if r["id"] == referral_id or r.get("referral_token") == referral_id:
            return r

    raise HTTPException(status_code=404, detail=f"Referral {referral_id} not found.")


@router.post("/referrals/create")
def create_referral(req: ReferralCreateRequest):
    """
    Create a new inter-facility referral pass and persist to Supabase.
    Role-restricted: Patients cannot create clinical referrals.
    """
    if req.created_by_role and req.created_by_role.lower() == "patient":
        raise HTTPException(
            status_code=403,
            detail="Patients are not authorized to generate clinical referrals. Referrals must be initiated by Medical Officers, ASHA/ANM workers, or facility managers."
        )

    token_num = random.randint(1000, 9999)
    referral_id = f"REF-{token_num}"
    now_iso = datetime.now(timezone.utc).isoformat()

    new_record = {
        "id": referral_id,
        "referral_token": referral_id,
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
        "updated_at": now_iso,
        "timeline": [
            {
                "status": "CREATED",
                "timestamp": now_iso,
                "actor": req.referring_doctor_name,
                "notes": f"Referral generated from {req.referring_facility_name} to {req.destination_facility_name}. Urgency: {req.urgency}."
            }
        ]
    }

    sb = get_supabase_client()
    if sb:
        try:
            sb.table("referrals").insert(new_record).execute()
            logger.info(f"Referral {referral_id} persisted to Supabase successfully.")
        except Exception as e:
            logger.error(f"Failed to insert referral into Supabase: {e}")
            _FALLBACK_REFERRALS.insert(0, new_record)
    else:
        _FALLBACK_REFERRALS.insert(0, new_record)

    return {
        "status": "success",
        "success": True,
        "message": f"Referral {referral_id} created successfully and queued for destination facility.",
        "referral": new_record
    }


@router.patch("/referrals/{referral_id}/status")
@router.post("/referrals/{referral_id}/status")
def update_referral_status(referral_id: str, req: ReferralStatusUpdateRequest):
    """
    Update referral lifecycle state across CREATED -> ACCEPTED -> IN_TRANSIT -> ARRIVED -> CONSULTED -> COMPLETED.
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
    
    existing = None
    if sb:
        try:
            res = sb.table("referrals").select("*").or_(f"id.eq.{referral_id},referral_token.eq.{referral_id}").maybe_single().execute()
            if res and res.data:
                existing = res.data
        except Exception as ex:
            logger.error(f"Error fetching referral {referral_id} for update: {ex}")

    if not existing:
        for r in _FALLBACK_REFERRALS:
            if r["id"] == referral_id or r.get("referral_token") == referral_id:
                existing = r
                break

    if not existing:
        raise HTTPException(status_code=404, detail=f"Referral {referral_id} not found.")

    timeline = existing.get("timeline") or []
    timeline.append({
        "status": req.status,
        "timestamp": now_iso,
        "actor": req.updated_by or "Health Officer",
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

    if sb:
        try:
            sb.table("referrals").update(update_payload).or_(f"id.eq.{referral_id},referral_token.eq.{referral_id}").execute()
        except Exception as e:
            logger.error(f"Failed to update referral in Supabase: {e}")

    existing.update(update_payload)

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

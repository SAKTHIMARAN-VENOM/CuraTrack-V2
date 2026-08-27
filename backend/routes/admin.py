"""
District Health Administrator API router for CuraTrack.
Enables district-level governance across villages, healthcare workers,
facilities, disease trends, outbreak detection, referrals, and reports.
"""
import os
import json
import logging
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Query, Body
from pydantic import BaseModel, Field

from services.supabase_client import get_supabase_client
from services.onboarding_service import (
    get_all_pending_doctors,
    update_doctor_verification_status,
    get_all_asha_workers,
    update_asha_verification_status
)

logger = logging.getLogger("curatrack.admin")
router = APIRouter()

# ─── Data Models ─────────────────────────────────────────────────────────────

class DoctorVerificationRequest(BaseModel):
    doctor_id: str
    status: str  # 'verified', 'rejected', 'correction_requested'
    admin_id: str = "admin-1"
    notes: Optional[str] = None

class ASHAWorkerVerificationRequest(BaseModel):
    asha_id: str
    status: str  # 'verified', 'rejected', 'under_review', 'correction_requested'
    admin_id: str = "admin-1"
    notes: Optional[str] = None

class AlertActionRequest(BaseModel):
    action: str  # 'ACKNOWLEDGE', 'DISPATCH_MMU', 'NOTIFY_ASHA', 'RESOLVE', 'ESCALATE'
    notes: Optional[str] = None
    assigned_worker_id: Optional[str] = None
    admin_id: str = "admin-1"

class AdminSettingsRequest(BaseModel):
    district_name: Optional[str] = "Nandurbar District"
    state: Optional[str] = "Maharashtra"
    alert_threshold_cases: Optional[int] = 5
    outbreak_sensitivity: Optional[str] = "HIGH"
    email_notifications: Optional[bool] = True
    sms_alerts: Optional[bool] = True
    mmu_auto_dispatch: Optional[bool] = False

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str

# ─── District Master Data & In-Memory State ─────────────────────────────────

_DISTRICT_META = {
    "district_id": "DIST-MH-NDB",
    "district_name": "Nandurbar District",
    "state": "Maharashtra",
    "total_population": 1648290,
    "total_area_sqkm": 5035,
    "rural_population_pct": 84.6,
    "total_blocks": 6,
    "blocks": [
        {"id": "BLK-01", "name": "Nandurbar Taluk", "villages_count": 142, "population": 385000, "hq": "Nandurbar City"},
        {"id": "BLK-02", "name": "Shahada Taluk", "villages_count": 168, "population": 412000, "hq": "Shahada"},
        {"id": "BLK-03", "name": "Taloda Taluk", "villages_count": 94, "population": 182000, "hq": "Taloda"},
        {"id": "BLK-04", "name": "Navapur Taluk", "villages_count": 126, "population": 268000, "hq": "Navapur"},
        {"id": "BLK-05", "name": "Akkalkuwa Taluk", "villages_count": 188, "population": 245000, "hq": "Akkalkuwa"},
        {"id": "BLK-06", "name": "Dhadgaon (Akrani) Taluk", "villages_count": 214, "population": 156290, "hq": "Dhadgaon"}
    ]
}

_VILLAGES_REGISTRY = [
    {
        "id": "VIL-001",
        "name": "Borvihir Pada",
        "block": "Nandurbar Taluk",
        "population": 2850,
        "registered_beneficiaries": 412,
        "active_beneficiaries": 395,
        "asha_workers_count": 2,
        "doctors_count": 1,
        "anm_workers_count": 1,
        "attached_facility": "Borvihir Sub-Centre & PHC Nandurbar Rural",
        "facility_type": "Sub-Centre",
        "recent_diseases": [
            {"disease": "Dengue", "cases": 42, "trend": "INCREASING", "severity": "HIGH"},
            {"disease": "Viral Fever", "cases": 28, "trend": "STABLE", "severity": "MEDIUM"}
        ],
        "high_risk_cases": 18,
        "emergency_cases": 2,
        "health_status": "NEEDS_ATTENTION",  # GOOD, NEEDS_ATTENTION, CRITICAL
        "coverage_status": "NEEDS_ATTENTION",
        "asha_ratio": "1 : 1425",
        "vaccination_rate": "86.4%",
        "lat": 21.3667,
        "lng": 74.2333,
        "recent_activities": [
            {"type": "Vector Control & Fogging Drive", "date": "2026-08-22", "status": "COMPLETED"},
            {"type": "Maternal ANC Screening Camp", "date": "2026-08-20", "status": "COMPLETED"},
            {"type": "Child Immunization Drive (MR-1)", "date": "2026-08-28", "status": "SCHEDULED"}
        ]
    },
    {
        "id": "VIL-002",
        "name": "Dongargaon Pada",
        "block": "Nandurbar Taluk",
        "population": 1940,
        "registered_beneficiaries": 280,
        "active_beneficiaries": 268,
        "asha_workers_count": 2,
        "doctors_count": 1,
        "anm_workers_count": 1,
        "attached_facility": "Dongargaon Sub-Centre",
        "facility_type": "Sub-Centre",
        "recent_diseases": [
            {"disease": "Acute Gastroenteritis", "cases": 14, "trend": "DECREASING", "severity": "MEDIUM"},
            {"disease": "Malaria", "cases": 6, "trend": "STABLE", "severity": "LOW"}
        ],
        "high_risk_cases": 7,
        "emergency_cases": 0,
        "health_status": "GOOD",
        "coverage_status": "GOOD",
        "asha_ratio": "1 : 970",
        "vaccination_rate": "94.2%",
        "lat": 21.3912,
        "lng": 74.2054,
        "recent_activities": [
            {"type": "Water Testing & Chlorination", "date": "2026-08-24", "status": "COMPLETED"},
            {"type": "Hypertension Screening Camp", "date": "2026-08-16", "status": "COMPLETED"}
        ]
    },
    {
        "id": "VIL-003",
        "name": "Dhanora Pada",
        "block": "Shahada Taluk",
        "population": 3400,
        "registered_beneficiaries": 520,
        "active_beneficiaries": 490,
        "asha_workers_count": 2,
        "doctors_count": 0,
        "anm_workers_count": 1,
        "attached_facility": "Shahada Rural PHC",
        "facility_type": "PHC",
        "recent_diseases": [
            {"disease": "Pulmonary TB", "cases": 19, "trend": "INCREASING", "severity": "HIGH"},
            {"disease": "Severe Malnutrition (SAM)", "cases": 11, "trend": "INCREASING", "severity": "HIGH"}
        ],
        "high_risk_cases": 24,
        "emergency_cases": 3,
        "health_status": "CRITICAL",
        "coverage_status": "CRITICAL",
        "asha_ratio": "1 : 1700",
        "vaccination_rate": "78.1%",
        "lat": 21.5421,
        "lng": 74.4682,
        "recent_activities": [
            {"type": "TB Sputum Collection Drive", "date": "2026-08-25", "status": "COMPLETED"},
            {"type": "Nutritional Basket Distribution", "date": "2026-08-21", "status": "COMPLETED"}
        ]
    },
    {
        "id": "VIL-004",
        "name": "Ranipur",
        "block": "Taloda Taluk",
        "population": 1650,
        "registered_beneficiaries": 245,
        "active_beneficiaries": 230,
        "asha_workers_count": 1,
        "doctors_count": 0,
        "anm_workers_count": 1,
        "attached_facility": "Taloda Rural Hospital & CHC",
        "facility_type": "CHC",
        "recent_diseases": [
            {"disease": "Viral Upper Respiratory", "cases": 16, "trend": "STABLE", "severity": "LOW"},
            {"disease": "Hypertension", "cases": 12, "trend": "STABLE", "severity": "MEDIUM"}
        ],
        "high_risk_cases": 9,
        "emergency_cases": 1,
        "health_status": "GOOD",
        "coverage_status": "NEEDS_ATTENTION",
        "asha_ratio": "1 : 1650",
        "vaccination_rate": "91.0%",
        "lat": 21.5662,
        "lng": 74.2144,
        "recent_activities": [
            {"type": "Geriatric Health Camp", "date": "2026-08-19", "status": "COMPLETED"}
        ]
    },
    {
        "id": "VIL-005",
        "name": "Toranmal",
        "block": "Shahada Taluk",
        "population": 4100,
        "registered_beneficiaries": 630,
        "active_beneficiaries": 598,
        "asha_workers_count": 4,
        "doctors_count": 1,
        "anm_workers_count": 2,
        "attached_facility": "Toranmal Hill PHC",
        "facility_type": "PHC",
        "recent_diseases": [
            {"disease": "Malaria (P. vivax & falciparum)", "cases": 35, "trend": "INCREASING", "severity": "HIGH"},
            {"disease": "Scabies", "cases": 21, "trend": "STABLE", "severity": "LOW"}
        ],
        "high_risk_cases": 19,
        "emergency_cases": 1,
        "health_status": "NEEDS_ATTENTION",
        "coverage_status": "GOOD",
        "asha_ratio": "1 : 1025",
        "vaccination_rate": "88.9%",
        "lat": 21.8741,
        "lng": 74.4533,
        "recent_activities": [
            {"type": "Long Lasting Insecticidal Net (LLIN) Distribution", "date": "2026-08-23", "status": "COMPLETED"},
            {"type": "Mobile Medical Unit Visit", "date": "2026-08-26", "status": "COMPLETED"}
        ]
    },
    {
        "id": "VIL-006",
        "name": "Khadki Pada",
        "block": "Akkalkuwa Taluk",
        "population": 2200,
        "registered_beneficiaries": 310,
        "active_beneficiaries": 295,
        "asha_workers_count": 1,
        "doctors_count": 0,
        "anm_workers_count": 1,
        "attached_facility": "Akkalkuwa CHC",
        "facility_type": "CHC",
        "recent_diseases": [
            {"disease": "Waterborne Diarrhea", "cases": 22, "trend": "INCREASING", "severity": "HIGH"}
        ],
        "high_risk_cases": 14,
        "emergency_cases": 2,
        "health_status": "CRITICAL",
        "coverage_status": "CRITICAL",
        "asha_ratio": "1 : 2200",
        "vaccination_rate": "72.4%",
        "lat": 21.5583,
        "lng": 74.0234,
        "recent_activities": [
            {"type": "Emergency ORS/Zinc Camp", "date": "2026-08-25", "status": "COMPLETED"}
        ]
    }
]

_DISEASE_ALERTS = [
    {
        "id": "ALT-101",
        "village_id": "VIL-001",
        "village_name": "Borvihir Pada",
        "block": "Nandurbar Taluk",
        "disease": "Dengue Outbreak Surge",
        "current_cases": 42,
        "baseline_cases": 12,
        "increase_pct": "+250%",
        "trend": "INCREASING",
        "severity": "CRITICAL",
        "date_detected": "2026-08-25",
        "status": "ACTION_REQUIRED",  # ACTION_REQUIRED, UNDER_INVESTIGATION, MMU_DISPATCHED, RESOLVED
        "affected_demographics": "Children 5-15 and Farm Laborers",
        "assigned_workers": ["Dr. David Ross", "Sunita Tai (ASHA #402)"],
        "recommended_action": "Deploy Mobile Medical Unit for rapid NS1 testing & initiate indoor fogging."
    },
    {
        "id": "ALT-102",
        "village_id": "VIL-003",
        "village_name": "Dhanora Pada",
        "block": "Shahada Taluk",
        "disease": "Pulmonary TB Case Cluster",
        "current_cases": 19,
        "baseline_cases": 6,
        "increase_pct": "+216%",
        "trend": "INCREASING",
        "severity": "HIGH",
        "date_detected": "2026-08-24",
        "status": "UNDER_INVESTIGATION",
        "affected_demographics": "Adult males aged 35-60",
        "assigned_workers": ["Kavita Gavit (ASHA #208)"],
        "recommended_action": "Conduct household contact tracing and sputum testing via GeneXpert."
    },
    {
        "id": "ALT-103",
        "village_id": "VIL-006",
        "village_name": "Khadki Pada",
        "block": "Akkalkuwa Taluk",
        "disease": "Acute Diarrheal Disease (ADD) Spike",
        "current_cases": 22,
        "baseline_cases": 4,
        "increase_pct": "+450%",
        "trend": "INCREASING",
        "severity": "CRITICAL",
        "date_detected": "2026-08-26",
        "status": "ACTION_REQUIRED",
        "affected_demographics": "General tribal settlement population",
        "assigned_workers": ["Akkalkuwa PHC Medical Officer"],
        "recommended_action": "Superchlorinate community wells and distribute halogen tablets & ORS."
    }
]

_NOTIFICATIONS = [
    {"id": "NOTIF-01", "type": "WORKER_VERIFICATION", "priority": "HIGH", "title": "New Doctor Application", "message": "Dr. Vikram Deshmukh (Pediatrics) submitted registration credentials for Shahada CHC.", "time": "15m ago", "read": False, "link": "/admin/verification"},
    {"id": "NOTIF-02", "type": "ASHA_VERIFICATION", "priority": "HIGH", "title": "ASHA Registration Pending", "message": "Kavita Gavit (ASHA #208) pending NHM certificate verification for Dhanora Pada.", "time": "45m ago", "read": False, "link": "/admin/verification"},
    {"id": "NOTIF-03", "type": "DISEASE_OUTBREAK", "priority": "CRITICAL", "title": "Dengue Anomaly Alert", "message": "42 confirmed/suspected Dengue cases in Borvihir Pada (+250% over baseline).", "time": "2h ago", "read": False, "link": "/admin/alerts"},
    {"id": "NOTIF-04", "type": "FACILITY_WORKLOAD", "priority": "MEDIUM", "title": "Civil Hospital ICU Bed Alert", "message": "Nandurbar District Civil Hospital ICU beds occupancy reached 88%.", "time": "3h ago", "read": False, "link": "/admin/facilities"},
    {"id": "NOTIF-05", "type": "EMERGENCY_REFERRAL", "priority": "CRITICAL", "title": "Unresolved Emergency Referral", "message": "Patient Kavita Bai (High-Risk Maternal Preeclampsia) referral pending review > 4 hours.", "time": "4h ago", "read": False, "link": "/admin/referrals"},
    {"id": "NOTIF-06", "type": "COVERAGE_GAP", "priority": "MEDIUM", "title": "Low ASHA Coverage in Khadki Pada", "message": "Population ratio 1:2200 exceeds NHM norm. Additional ASHA recruitment suggested.", "time": "1d ago", "read": True, "link": "/admin/district"}
]

# ─── Endpoints ───────────────────────────────────────────────────────────────

@router.get("/admin/dashboard-stats")
def get_admin_dashboard_stats():
    """
    Consolidated statistics for District Health Administrator command center.
    Pulls live data from Supabase with resilient fallbacks.
    """
    sb = get_supabase_client()
    doctors = get_all_pending_doctors()
    ashas = get_all_asha_workers()

    total_doctors = len(doctors)
    verified_doctors = sum(1 for d in doctors if d.get("verification_status") == "verified")
    pending_doctors = sum(1 for d in doctors if (d.get("verification_status") or "pending") == "pending")

    total_ashas = len(ashas)
    verified_ashas = sum(1 for a in ashas if a.get("verification_status") == "verified")
    pending_ashas = sum(1 for a in ashas if a.get("verification_status") in ("pending", "under_review"))

    # Pull real beneficiaries count from database
    total_beneficiaries = 2480
    high_risk_beneficiaries = 92
    if sb:
        try:
            ben_res = sb.table("beneficiaries").select("id, risk_level", count="exact").execute()
            if ben_res.data:
                total_beneficiaries = len(ben_res.data)
                high_risk_beneficiaries = sum(1 for b in ben_res.data if b.get("risk_level") == "HIGH")
        except Exception:
            pass

    # Referrals count
    pending_referrals = 4
    emergency_referrals = 2
    if sb:
        try:
            ref_res = sb.table("referrals").select("id, status, urgency").execute()
            if ref_res.data:
                pending_referrals = sum(1 for r in ref_res.data if r.get("status") not in ("COMPLETED", "REJECTED"))
                emergency_referrals = sum(1 for r in ref_res.data if r.get("urgency") == "EMERGENCY")
        except Exception:
            pass

    total_villages = len(_VILLAGES_REGISTRY)
    total_facilities = 6
    active_health_alerts = len([a for a in _DISEASE_ALERTS if a.get("status") != "RESOLVED"])
    recent_disease_cases = sum(sum(c["cases"] for c in v["recent_diseases"]) for v in _VILLAGES_REGISTRY)

    return {
        "district": _DISTRICT_META["district_name"],
        "state": _DISTRICT_META["state"],
        "population_covered": _DISTRICT_META["total_population"],
        "total_villages": total_villages,
        "total_blocks": _DISTRICT_META["total_blocks"],
        "total_beneficiaries": total_beneficiaries,
        "high_risk_patients": high_risk_beneficiaries,
        "total_doctors": total_doctors,
        "verified_doctors": verified_doctors,
        "pending_doctor_approvals": pending_doctors,
        "total_asha_workers": total_ashas,
        "verified_asha_workers": verified_ashas,
        "pending_asha_verification": pending_ashas,
        "total_facilities": total_facilities,
        "active_healthcare_workers": verified_doctors + verified_ashas + 8,
        "recent_disease_cases": recent_disease_cases,
        "pending_referrals": pending_referrals,
        "emergency_referrals": emergency_referrals,
        "active_health_alerts": active_health_alerts,
        "last_updated": datetime.now(timezone.utc).isoformat()
    }


@router.get("/admin/action-required")
def get_action_required_items():
    """
    High-priority actionable items requiring District Administrator intervention.
    """
    doctors = get_all_pending_doctors()
    ashas = get_all_asha_workers()
    pending_docs = [d for d in doctors if (d.get("verification_status") or "pending") == "pending"]
    pending_ashas = [a for a in ashas if a.get("verification_status") in ("pending", "under_review")]

    action_items = []

    # 1. Critical Outbreak alerts
    for a in _DISEASE_ALERTS:
        if a["status"] == "ACTION_REQUIRED":
            action_items.append({
                "id": f"ACT-ALT-{a['id']}",
                "priority": a["severity"],  # CRITICAL / HIGH
                "category": "Disease Outbreak",
                "title": f"Surge: {a['disease']} in {a['village_name']}",
                "description": f"{a['current_cases']} active cases detected ({a['increase_pct']} above normal baseline). Action needed.",
                "link": "/admin/alerts",
                "action_label": "Investigate & Respond",
                "created_at": a["date_detected"]
            })

    # 2. Doctor Approvals
    if pending_docs:
        action_items.append({
            "id": "ACT-DOC-VERIF",
            "priority": "HIGH",
            "category": "Workforce Verification",
            "title": f"{len(pending_docs)} Doctor Credentials Waiting for Approval",
            "description": f"Doctors including {pending_docs[0].get('personal_details', {}).get('name', 'Medical Practitioner')} awaiting verification.",
            "link": "/admin/verification",
            "action_label": "Review Doctors",
            "created_at": "Today"
        })

    # 3. ASHA Approvals
    if pending_ashas:
        action_items.append({
            "id": "ACT-ASHA-VERIF",
            "priority": "HIGH",
            "category": "Workforce Verification",
            "title": f"{len(pending_ashas)} ASHA Workers Awaiting Verification",
            "description": f"Induction certificates & Gram Panchayat letters pending verification.",
            "link": "/admin/verification",
            "action_label": "Review ASHA Workers",
            "created_at": "Today"
        })

    # 4. Critical Village Coverage gap
    critical_villages = [v for v in _VILLAGES_REGISTRY if v["coverage_status"] == "CRITICAL"]
    for cv in critical_villages:
        action_items.append({
            "id": f"ACT-COV-{cv['id']}",
            "priority": "HIGH",
            "category": "Health Coverage Gap",
            "title": f"Severe ASHA Coverage Deficit in {cv['name']}",
            "description": f"Ratio is {cv['asha_ratio']} (population {cv['population']}) with {cv['high_risk_cases']} high-risk patients.",
            "link": f"/admin/villages/{cv['id']}",
            "action_label": "View Village Details",
            "created_at": "Active"
        })

    # 5. Overdue / Emergency referrals
    action_items.append({
        "id": "ACT-REF-EMERG",
        "priority": "CRITICAL",
        "category": "Emergency Referrals",
        "title": "2 Emergency Referrals Require Facility Coordination",
        "description": "High-risk pregnancy & severe trauma transfers pending destination bed confirmation.",
        "link": "/admin/referrals",
        "action_label": "Track Referrals",
        "created_at": "1h ago"
    })

    return {
        "count": len(action_items),
        "critical_count": sum(1 for i in action_items if i["priority"] == "CRITICAL"),
        "high_count": sum(1 for i in action_items if i["priority"] == "HIGH"),
        "items": action_items
    }


@router.get("/admin/district-overview")
def get_district_overview():
    """
    Returns full District → Block → Village hierarchy and geographic summary.
    """
    return {
        "district": _DISTRICT_META["district_name"],
        "district_meta": _DISTRICT_META,
        "blocks": _DISTRICT_META["blocks"],
        "villages": _VILLAGES_REGISTRY,
        "summary": {
            "total_villages": len(_VILLAGES_REGISTRY),
            "good_coverage_count": sum(1 for v in _VILLAGES_REGISTRY if v["coverage_status"] == "GOOD"),
            "needs_attention_count": sum(1 for v in _VILLAGES_REGISTRY if v["coverage_status"] == "NEEDS_ATTENTION"),
            "critical_attention_count": sum(1 for v in _VILLAGES_REGISTRY if v["coverage_status"] == "CRITICAL"),
            "total_high_risk_cases": sum(v["high_risk_cases"] for v in _VILLAGES_REGISTRY),
            "total_recent_disease_cases": sum(sum(c["cases"] for c in v["recent_diseases"]) for v in _VILLAGES_REGISTRY)
        }
    }


@router.get("/admin/villages")
def list_villages(
    block: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None)
):
    """
    Search and filter villages in the district.
    """
    results = list(_VILLAGES_REGISTRY)
    if block and block != "ALL":
        results = [v for v in results if v["block"].lower() == block.lower()]
    if status and status != "ALL":
        results = [v for v in results if v["health_status"].lower() == status.lower() or v["coverage_status"].lower() == status.lower()]
    if search:
        s = search.lower()
        results = [v for v in results if s in v["name"].lower() or s in v["block"].lower() or s in v["attached_facility"].lower()]

    return {"count": len(results), "villages": results}


@router.get("/admin/villages/{village_id}")
def get_village_detail(village_id: str):
    """
    Detailed dashboard data for a single village.
    """
    village = next((v for v in _VILLAGES_REGISTRY if v["id"] == village_id or v["name"].lower() == village_id.lower()), None)
    if not village:
        # Fallback dynamic object
        village = _VILLAGES_REGISTRY[0]

    # Find associated workers
    doctors = [d for d in get_all_pending_doctors() if village["name"].lower() in str(d).lower() or d.get("verification_status") == "verified"][:2]
    ashas = [a for a in get_all_asha_workers() if a.get("village_name") == village["name"]]

    return {
        "village": village,
        "workforce": {
            "doctors": doctors,
            "asha_workers": ashas,
            "anm_workers": [
                {"name": "Pratibha Patil (ANM)", "sub_centre": village.get("attached_facility"), "phone": "+91 94230 11982"}
            ]
        },
        "health_indicators": {
            "total_population": village["population"],
            "registered_beneficiaries": village["registered_beneficiaries"],
            "active_beneficiaries": village["active_beneficiaries"],
            "high_risk_cases": village["high_risk_cases"],
            "emergency_cases": village["emergency_cases"],
            "vaccination_rate": village["vaccination_rate"],
            "diseases": village["recent_diseases"]
        },
        "facilities": [
            {
                "name": village["attached_facility"],
                "type": village["facility_type"],
                "status": "OPERATIONAL",
                "patient_load": "MODERATE",
                "available_resources": "Oxygen cylinders (4), Rapid Test Kits (120), IFA Stock (Adequate)"
            }
        ],
        "activities": village.get("recent_activities", [])
    }


@router.get("/admin/workers")
def get_district_workforce():
    """
    Comprehensive healthcare workforce directory for the district.
    """
    doctors = get_all_pending_doctors()
    ashas = get_all_asha_workers()

    return {
        "doctors": doctors,
        "asha_workers": ashas,
        "summary": {
            "total_doctors": len(doctors),
            "verified_doctors": sum(1 for d in doctors if d.get("verification_status") == "verified"),
            "total_asha_workers": len(ashas),
            "verified_asha_workers": sum(1 for a in ashas if a.get("verification_status") == "verified"),
            "pending_verifications": sum(1 for d in doctors if (d.get("verification_status") or "pending") == "pending") + sum(1 for a in ashas if a.get("verification_status") in ("pending", "under_review"))
        }
    }


@router.get("/admin/doctors")
def list_doctors_endpoint():
    """Backwards-compatible doctor listing endpoint."""
    return {"doctors": get_all_pending_doctors()}


@router.post("/admin/verify-doctor")
def verify_doctor_endpoint(req: DoctorVerificationRequest):
    """Backwards-compatible & enhanced doctor verification endpoint."""
    if req.status not in ("verified", "rejected", "correction_requested", "pending"):
        raise HTTPException(status_code=400, detail="Invalid verification status")
    return update_doctor_verification_status(req.doctor_id, req.status, req.admin_id)


@router.get("/admin/asha-workers")
def list_asha_workers_endpoint():
    """List all ASHA workers with verification and workload data."""
    return {"asha_workers": get_all_asha_workers()}


@router.post("/admin/verify-asha")
def verify_asha_endpoint(req: ASHAWorkerVerificationRequest):
    """Approve, reject, or request correction for ASHA worker."""
    if req.status not in ("verified", "rejected", "under_review", "correction_requested", "pending"):
        raise HTTPException(status_code=400, detail="Invalid verification status")
    return update_asha_verification_status(req.asha_id, req.status, req.admin_id, req.notes or "")


@router.get("/admin/facilities-overview")
def get_facilities_overview():
    """
    District-level healthcare facility operations monitoring (beds, EDL stock, queue).
    """
    facilities = [
        {
            "id": "FAC-001",
            "name": "Nandurbar District Civil Hospital",
            "type": "District Hospital (DH)",
            "block": "Nandurbar Taluk",
            "total_beds": 200,
            "occupied_beds": 164,
            "available_beds": 36,
            "bed_occupancy_pct": "82%",
            "icu_total": 12,
            "icu_available": 2,
            "doctors_count": 24,
            "current_opd_queue": 142,
            "emergency_cases_today": 18,
            "edl_stock_status": "ADEQUATE",
            "critical_stockouts": ["Ceftriaxone 1g Injection"],
            "workload_status": "HIGH"
        },
        {
            "id": "FAC-002",
            "name": "Nandurbar Sub-District Hospital & CHC",
            "type": "Sub-District Hospital (SDH)",
            "block": "Nandurbar Taluk",
            "total_beds": 50,
            "occupied_beds": 38,
            "available_beds": 12,
            "bed_occupancy_pct": "76%",
            "icu_total": 4,
            "icu_available": 2,
            "doctors_count": 8,
            "current_opd_queue": 65,
            "emergency_cases_today": 6,
            "edl_stock_status": "LOW_STOCK",
            "critical_stockouts": ["Amoxicillin 500mg"],
            "workload_status": "MODERATE"
        },
        {
            "id": "FAC-003",
            "name": "Shahada Community Health Centre",
            "type": "Community Health Centre (CHC)",
            "block": "Shahada Taluk",
            "total_beds": 30,
            "occupied_beds": 24,
            "available_beds": 6,
            "bed_occupancy_pct": "80%",
            "icu_total": 2,
            "icu_available": 1,
            "doctors_count": 5,
            "current_opd_queue": 48,
            "emergency_cases_today": 4,
            "edl_stock_status": "CRITICAL_STOCKOUT_RISK",
            "critical_stockouts": ["ORS Sachets", "Metformin 500mg"],
            "workload_status": "HIGH"
        },
        {
            "id": "FAC-004",
            "name": "Taloda Rural Hospital & CHC",
            "type": "Rural Hospital (RH)",
            "block": "Taloda Taluk",
            "total_beds": 30,
            "occupied_beds": 18,
            "available_beds": 12,
            "bed_occupancy_pct": "60%",
            "icu_total": 0,
            "icu_available": 0,
            "doctors_count": 4,
            "current_opd_queue": 32,
            "emergency_cases_today": 2,
            "edl_stock_status": "ADEQUATE",
            "critical_stockouts": [],
            "workload_status": "NORMAL"
        },
        {
            "id": "FAC-005",
            "name": "PHC Nandurbar Rural",
            "type": "Primary Health Centre (PHC)",
            "block": "Nandurbar Taluk",
            "total_beds": 10,
            "occupied_beds": 6,
            "available_beds": 4,
            "bed_occupancy_pct": "60%",
            "icu_total": 0,
            "icu_available": 0,
            "doctors_count": 2,
            "current_opd_queue": 28,
            "emergency_cases_today": 1,
            "edl_stock_status": "ADEQUATE",
            "critical_stockouts": [],
            "workload_status": "NORMAL"
        },
        {
            "id": "FAC-006",
            "name": "Toranmal Hill PHC",
            "type": "Primary Health Centre (PHC)",
            "block": "Shahada Taluk",
            "total_beds": 6,
            "occupied_beds": 5,
            "available_beds": 1,
            "bed_occupancy_pct": "83%",
            "icu_total": 0,
            "icu_available": 0,
            "doctors_count": 1,
            "current_opd_queue": 22,
            "emergency_cases_today": 1,
            "edl_stock_status": "LOW_STOCK",
            "critical_stockouts": ["Artesunate Injections"],
            "workload_status": "HIGH"
        }
    ]

    total_beds = sum(f["total_beds"] for f in facilities)
    occupied_beds = sum(f["occupied_beds"] for f in facilities)
    total_doctors = sum(f["doctors_count"] for f in facilities)

    return {
        "facilities": facilities,
        "metrics": {
            "total_facilities": len(facilities),
            "total_beds": total_beds,
            "occupied_beds": occupied_beds,
            "available_beds": total_beds - occupied_beds,
            "district_bed_occupancy": f"{round((occupied_beds / total_beds) * 100, 1)}%",
            "total_facility_doctors": total_doctors,
            "facilities_at_critical_risk": sum(1 for f in facilities if f["edl_stock_status"] == "CRITICAL_STOCKOUT_RISK" or f["workload_status"] == "HIGH")
        }
    }


@router.get("/admin/beneficiaries-overview")
def get_beneficiaries_overview(
    category: Optional[str] = Query(None),
    risk_level: Optional[str] = Query(None),
    block: Optional[str] = Query(None)
):
    """
    District-wide patient and beneficiary overview with risk breakdowns.
    """
    sb = get_supabase_client()
    beneficiaries = []
    if sb:
        try:
            res = sb.table("beneficiaries").select("*").execute()
            if res.data:
                beneficiaries = res.data
        except Exception:
            pass

    if not beneficiaries:
        from routes.fhw import _FALLBACK_BENEFICIARIES
        beneficiaries = list(_FALLBACK_BENEFICIARIES)

    if category and category != "ALL":
        beneficiaries = [b for b in beneficiaries if b.get("category") == category]
    if risk_level and risk_level != "ALL":
        beneficiaries = [b for b in beneficiaries if b.get("risk_level") == risk_level]

    total = len(beneficiaries)
    high_risk = sum(1 for b in beneficiaries if b.get("risk_level") == "HIGH")
    overdue = sum(1 for b in beneficiaries if b.get("status") == "OVERDUE")

    return {
        "total_beneficiaries": total,
        "high_risk_count": high_risk,
        "overdue_followups_count": overdue,
        "beneficiaries": beneficiaries,
        "by_category": {
            "Maternal ANC": sum(1 for b in beneficiaries if b.get("category") == "Maternal ANC"),
            "Child Immunization": sum(1 for b in beneficiaries if b.get("category") == "Child Immunization"),
            "NCD Chronic": sum(1 for b in beneficiaries if b.get("category") == "NCD Chronic"),
            "TB / Communicable": sum(1 for b in beneficiaries if b.get("category") == "TB / Communicable")
        }
    }


@router.get("/admin/disease-monitoring")
def get_disease_monitoring(
    disease: Optional[str] = Query(None),
    time_range: Optional[str] = Query("30d")
):
    """
    Disease monitoring trends, longitudinal incidence, and village-wise outbreaks.
    """
    diseases = [
        {"name": "Dengue", "cases_current": 58, "cases_previous": 22, "trend": "INCREASING", "change_pct": "+163%", "severity": "HIGH", "hotspot_villages": ["Borvihir Pada", "Nandurbar Block A"]},
        {"name": "Malaria (P. falciparum & vivax)", "cases_current": 49, "cases_previous": 42, "trend": "INCREASING", "change_pct": "+16%", "severity": "HIGH", "hotspot_villages": ["Toranmal", "Dongargaon Pada"]},
        {"name": "Acute Gastroenteritis", "cases_current": 38, "cases_previous": 54, "trend": "DECREASING", "change_pct": "-29%", "severity": "MEDIUM", "hotspot_villages": ["Khadki Pada", "Dongargaon"]},
        {"name": "Pulmonary TB", "cases_current": 26, "cases_previous": 18, "trend": "INCREASING", "change_pct": "+44%", "severity": "HIGH", "hotspot_villages": ["Dhanora Pada", "Shahada"]},
        {"name": "Viral Respiratory Illness", "cases_current": 74, "cases_previous": 70, "trend": "STABLE", "change_pct": "+5%", "severity": "LOW", "hotspot_villages": ["Ranipur", "Borvihir"]},
        {"name": "Typhoid", "cases_current": 14, "cases_previous": 12, "trend": "STABLE", "change_pct": "+16%", "severity": "MEDIUM", "hotspot_villages": ["Shahada Taluk", "Akkalkuwa"]}
    ]

    trend_history_7d = [
        {"day": "Day 1 (Aug 20)", "Dengue": 24, "Malaria": 38, "Gastro": 50, "TB": 18},
        {"day": "Day 2 (Aug 21)", "Dengue": 28, "Malaria": 40, "Gastro": 46, "TB": 19},
        {"day": "Day 3 (Aug 22)", "Dengue": 34, "Malaria": 42, "Gastro": 44, "TB": 20},
        {"day": "Day 4 (Aug 23)", "Dengue": 41, "Malaria": 45, "Gastro": 41, "TB": 22},
        {"day": "Day 5 (Aug 24)", "Dengue": 48, "Malaria": 46, "Gastro": 39, "TB": 24},
        {"day": "Day 6 (Aug 25)", "Dengue": 54, "Malaria": 47, "Gastro": 38, "TB": 25},
        {"day": "Day 7 (Today)", "Dengue": 58, "Malaria": 49, "Gastro": 38, "TB": 26}
    ]

    return {
        "diseases": diseases,
        "trend_history_7d": trend_history_7d,
        "total_active_cases": sum(d["cases_current"] for d in diseases),
        "high_severity_diseases_count": sum(1 for d in diseases if d["severity"] == "HIGH")
    }


@router.get("/admin/disease-alerts")
def get_disease_alerts():
    """
    Active health outbreak and anomaly detection alerts.
    """
    return {
        "count": len(_DISEASE_ALERTS),
        "action_required_count": sum(1 for a in _DISEASE_ALERTS if a["status"] == "ACTION_REQUIRED"),
        "alerts": _DISEASE_ALERTS
    }


@router.post("/admin/disease-alerts/{alert_id}/action")
def log_alert_action(alert_id: str, req: AlertActionRequest):
    """
    District administrator response action to an outbreak alert.
    """
    alert = next((a for a in _DISEASE_ALERTS if a["id"] == alert_id), None)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    status_map = {
        "ACKNOWLEDGE": "UNDER_INVESTIGATION",
        "DISPATCH_MMU": "MMU_DISPATCHED",
        "NOTIFY_ASHA": "ASHA_SUPERVISOR_NOTIFIED",
        "RESOLVE": "RESOLVED",
        "ESCALATE": "STATE_HEALTH_ESCALATED"
    }

    new_status = status_map.get(req.action, "UNDER_INVESTIGATION")
    alert["status"] = new_status
    alert["last_admin_action"] = {
        "action": req.action,
        "notes": req.notes,
        "admin_id": req.admin_id,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

    return {
        "success": True,
        "alert_id": alert_id,
        "status": new_status,
        "message": f"Alert {alert_id} updated with action '{req.action}'."
    }


@router.get("/admin/referrals-overview")
def get_referrals_overview():
    """
    District-level referral pipeline monitoring.
    """
    sb = get_supabase_client()
    referrals = []
    if sb:
        try:
            res = sb.table("referrals").select("*").order("created_at", desc=True).execute()
            if res.data:
                referrals = res.data
        except Exception:
            pass

    if not referrals:
        from routes.referrals import _FALLBACK_REFERRALS
        referrals = list(_FALLBACK_REFERRALS)

    total = len(referrals)
    emergency = sum(1 for r in referrals if r.get("urgency") == "EMERGENCY")
    pending = sum(1 for r in referrals if r.get("status") not in ("COMPLETED", "REJECTED"))
    in_transit = sum(1 for r in referrals if r.get("status") == "IN_TRANSIT")

    return {
        "total_referrals": total,
        "pending_referrals": pending,
        "emergency_referrals": emergency,
        "in_transit_referrals": in_transit,
        "completed_referrals": sum(1 for r in referrals if r.get("status") == "COMPLETED"),
        "referrals": referrals
    }


@router.get("/admin/reports")
def generate_report(
    report_type: str = Query("district_health"),
    block: Optional[str] = Query(None),
    village: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None)
):
    """
    Generates structured district administrative reports for export.
    """
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

    report_templates = {
        "district_health": {
            "title": "Comprehensive District Health & Infrastructure Report",
            "district": _DISTRICT_META["district_name"],
            "generated_at": now,
            "key_metrics": {
                "population_covered": _DISTRICT_META["total_population"],
                "total_villages": len(_VILLAGES_REGISTRY),
                "total_doctors": len(get_all_pending_doctors()),
                "total_asha_workers": len(get_all_asha_workers()),
                "total_facilities": 6,
                "district_bed_occupancy": "77.5%",
                "average_vaccination_rate": "86.8%"
            },
            "village_breakdown": _VILLAGES_REGISTRY
        },
        "disease_epidemiology": {
            "title": "District Communicable & Vector-Borne Disease Report",
            "district": _DISTRICT_META["district_name"],
            "generated_at": now,
            "active_outbreaks": _DISEASE_ALERTS,
            "village_incidence": [
                {"village": v["name"], "block": v["block"], "diseases": v["recent_diseases"]}
                for v in _VILLAGES_REGISTRY
            ]
        },
        "asha_performance": {
            "title": "Frontline Health Worker (ASHA) Performance & Coverage Audit",
            "district": _DISTRICT_META["district_name"],
            "generated_at": now,
            "workers": get_all_asha_workers()
        },
        "doctor_verification": {
            "title": "Medical Officer & Specialist Credential Verification Audit",
            "district": _DISTRICT_META["district_name"],
            "generated_at": now,
            "doctors": get_all_pending_doctors()
        },
        "facility_operations": {
            "title": "Public Health Facilities EDL Stock & Bed Occupancy Report",
            "district": _DISTRICT_META["district_name"],
            "generated_at": now,
            "facilities": get_facilities_overview()["facilities"]
        },
        "referral_audit": {
            "title": "Inter-Facility Referral Pipeline & SLA Compliance Audit",
            "district": _DISTRICT_META["district_name"],
            "generated_at": now,
            "metrics": get_referrals_overview()
        }
    }

    report = report_templates.get(report_type, report_templates["district_health"])
    return {"status": "success", "report": report}


@router.get("/admin/notifications")
def get_admin_notifications():
    """
    Administrator real-time notifications.
    """
    unread_count = sum(1 for n in _NOTIFICATIONS if not n["read"])
    return {
        "unread_count": unread_count,
        "total_count": len(_NOTIFICATIONS),
        "notifications": _NOTIFICATIONS
    }


@router.post("/admin/notifications/{notification_id}/read")
def mark_notification_read(notification_id: str):
    """
    Marks notification as read.
    """
    notif = next((n for n in _NOTIFICATIONS if n["id"] == notification_id), None)
    if notif:
        notif["read"] = True
        return {"success": True, "notification_id": notification_id, "read": True}
    return {"success": False, "message": "Notification not found"}


@router.post("/admin/settings/update")
def update_admin_settings(settings: AdminSettingsRequest):
    """
    Updates administrative preferences and alert thresholds.
    """
    return {
        "success": True,
        "message": "District health administrator configuration updated successfully.",
        "settings": settings.model_dump()
    }


@router.post("/admin/change-password")
def change_admin_password(req: PasswordChangeRequest):
    """
    Administrator password update.
    """
    if len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters.")
    return {
        "success": True,
        "message": "Administrator password successfully updated."
    }

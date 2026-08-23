"""
Public Health Facility Operations API.
Powers Facility Manager, Pharmacist, and Doctor dashboards for:
- Essential Drug List (EDL) inventory & stockout early warning
- Diagnostic laboratory test ordering & result coordination
- OPD patient queue load & inpatient bed occupancy metrics
"""
import logging
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

logger = logging.getLogger("curatrack.facility")
router = APIRouter()

# ─── Mock in-memory database for Public Health Facility operations ─────────
_facility_stats = {
    "facility_name": "Nandurbar Sub-District Hospital & CHC",
    "facility_type": "Community Health Centre (CHC)",
    "district": "Nandurbar",
    "state": "Maharashtra",
    "opd_today": {
        "total_registered": 142,
        "consulted": 98,
        "waiting": 44,
        "average_wait_minutes": 22
    },
    "beds": {
        "total": 50,
        "occupied": 38,
        "available": 12,
        "maternal_ward_available": 4,
        "icu_available": 2
    },
    "doctors_on_duty": 6,
    "active_inbound_referrals": 8,
    "active_outbound_referrals": 3
}

_essential_medicines_db = [
    {
        "id": "MED-001",
        "name": "Iron & Folic Acid (IFA) Tablets (100mg)",
        "category": "Maternal & Child Health",
        "stock_units": 4500,
        "monthly_consumption": 3200,
        "days_of_supply": 42,
        "status": "ADEQUATE",
        "unit": "tablets",
        "storage_location": "Main Store - Rack A2"
    },
    {
        "id": "MED-002",
        "name": "Metformin 500mg Tablets",
        "category": "NCD / Diabetes",
        "stock_units": 850,
        "monthly_consumption": 2400,
        "days_of_supply": 10,
        "status": "LOW_STOCK",
        "unit": "tablets",
        "storage_location": "Dispensary - Shelf B1"
    },
    {
        "id": "MED-003",
        "name": "Amoxicillin 500mg Capsules",
        "category": "Antibiotics",
        "stock_units": 2100,
        "monthly_consumption": 1800,
        "days_of_supply": 35,
        "status": "ADEQUATE",
        "unit": "capsules",
        "storage_location": "Main Store - Rack C3"
    },
    {
        "id": "MED-004",
        "name": "Oral Rehydration Salts (ORS) Sachets",
        "category": "Child Health / Diarrhea",
        "stock_units": 120,
        "monthly_consumption": 1500,
        "days_of_supply": 2,
        "status": "CRITICAL_STOCKOUT_RISK",
        "unit": "sachets",
        "storage_location": "Emergency Room & Dispensary"
    },
    {
        "id": "MED-005",
        "name": "Human Recombinant Insulin (NPH 100 IU/ml)",
        "category": "NCD / Emergency",
        "stock_units": 45,
        "monthly_consumption": 60,
        "days_of_supply": 22,
        "status": "ADEQUATE",
        "unit": "vials",
        "storage_location": "Cold Chain Refrigerator (2-8°C)"
    },
    {
        "id": "MED-006",
        "name": "Paracetamol 500mg Tablets",
        "category": "General / Analgesic",
        "stock_units": 6800,
        "monthly_consumption": 4000,
        "days_of_supply": 51,
        "status": "ADEQUATE",
        "unit": "tablets",
        "storage_location": "Main Store - Rack A1"
    }
]

_diagnostic_tests_db = [
    {
        "id": "DIAG-101",
        "patient_id": "P-4012",
        "patient_name": "Kavita Bai",
        "test_name": "Complete Blood Count (CBC) + Hemoglobin",
        "category": "Hematology",
        "priority": "HIGH",
        "ordered_by": "Dr. David Ross",
        "facility_level": "CHC Lab",
        "ordered_at": "2026-08-23T08:30:00Z",
        "status": "COMPLETED",
        "result_summary": "Hb: 8.4 g/dL (Moderate Microcytic Anemia)",
        "critical_alert": True
    },
    {
        "id": "DIAG-102",
        "patient_id": "P-4019",
        "patient_name": "Ganesh Shinde",
        "test_name": "Sputum AFB Smear Microscopy (Day 1)",
        "category": "Microbiology / TB",
        "priority": "URGENT",
        "ordered_by": "Dr. Primary Care MO",
        "facility_level": "Designated Microscopy Centre (DMC)",
        "ordered_at": "2026-08-23T09:15:00Z",
        "status": "SAMPLE_COLLECTED",
        "result_summary": None,
        "critical_alert": False
    },
    {
        "id": "DIAG-103",
        "patient_id": "P-4025",
        "patient_name": "Savita Patil",
        "test_name": "Obstetric Ultrasound (2nd Trimester Anomaly Scan)",
        "category": "Radiology",
        "priority": "ROUTINE",
        "ordered_by": "Dr. David Ross",
        "facility_level": "District Hospital Tele-Radiology",
        "ordered_at": "2026-08-23T10:00:00Z",
        "status": "SCHEDULED",
        "result_summary": None,
        "critical_alert": False
    }
]


class DiagnosticOrderRequest(BaseModel):
    patient_id: str
    patient_name: str
    test_name: str
    category: str = "General"
    priority: str = "ROUTINE"
    ordered_by: str = "On-Duty Medical Officer"
    clinical_indication: str = ""


class StockUpdateRequest(BaseModel):
    medicine_id: str
    units_added: int
    batch_number: Optional[str] = None
    supplier_name: Optional[str] = "District Medical Store Depot (DMSD)"


@router.get("/facility/stats")
def get_facility_stats():
    """Returns real-time facility load, OPD queue length, and bed occupancy."""
    return _facility_stats


@router.get("/facility/medicines")
def list_essential_medicines(
    category: Optional[str] = Query(None, description="Filter by medicine category"),
    status: Optional[str] = Query(None, description="Filter by stock status")
):
    """Returns Essential Drug List (EDL) inventory levels and stockout alerts."""
    results = _essential_medicines_db
    if category and category != "ALL":
        results = [m for m in results if m["category"].upper() == category.upper()]
    if status and status != "ALL":
        results = [m for m in results if m["status"].upper() == status.upper()]

    critical_count = len([m for m in _essential_medicines_db if m["status"] in ("LOW_STOCK", "CRITICAL_STOCKOUT_RISK")])

    return {
        "count": len(results),
        "critical_alerts_count": critical_count,
        "medicines": results
    }


@router.get("/facility/diagnostics")
def list_diagnostic_orders(
    status: Optional[str] = Query(None, description="Filter by test status"),
    priority: Optional[str] = Query(None, description="Filter by test priority")
):
    """Returns diagnostic lab queue and sample tracking status."""
    results = _diagnostic_tests_db
    if status and status != "ALL":
        results = [d for d in results if d["status"].upper() == status.upper()]
    if priority and priority != "ALL":
        results = [d for d in results if d["priority"].upper() == priority.upper()]

    return {
        "count": len(results),
        "active_orders": len([d for d in _diagnostic_tests_db if d["status"] != "COMPLETED"]),
        "diagnostics": results
    }


@router.post("/facility/diagnostics/order")
def create_diagnostic_order(order: DiagnosticOrderRequest):
    """Allows doctors and clinical officers to order laboratory tests."""
    diag_id = f"DIAG-{len(_diagnostic_tests_db) + 101}"
    now_iso = datetime.utcnow().isoformat() + "Z"
    new_order = {
        "id": diag_id,
        "patient_id": order.patient_id,
        "patient_name": order.patient_name,
        "test_name": order.test_name,
        "category": order.category,
        "priority": order.priority,
        "ordered_by": order.ordered_by,
        "facility_level": "PHC/CHC Lab",
        "ordered_at": now_iso,
        "status": "ORDERED",
        "clinical_indication": order.clinical_indication,
        "result_summary": None,
        "critical_alert": False
    }
    _diagnostic_tests_db.insert(0, new_order)
    return {"success": True, "diagnostic_order": new_order}


@router.post("/facility/medicines/update-stock")
def update_medicine_stock(update: StockUpdateRequest):
    """Allows pharmacists and store in-charges to record fresh medicine receipts."""
    med = next((m for m in _essential_medicines_db if m["id"] == update.medicine_id), None)
    if not med:
        raise HTTPException(status_code=404, detail="Medicine not found in EDL inventory")

    med["stock_units"] += update.units_added
    # Recalculate days of supply
    daily_rate = max(1, med["monthly_consumption"] // 30)
    med["days_of_supply"] = med["stock_units"] // daily_rate
    if med["days_of_supply"] > 20:
        med["status"] = "ADEQUATE"
    elif med["days_of_supply"] > 7:
        med["status"] = "LOW_STOCK"
    else:
        med["status"] = "CRITICAL_STOCKOUT_RISK"

    return {"success": True, "updated_medicine": med}

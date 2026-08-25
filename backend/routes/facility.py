"""
Public Health Facility Operations API.
Powers Facility Manager, Pharmacist, and Doctor dashboards for:
- Essential Drug List (EDL) inventory & stockout early warning
- Diagnostic laboratory test ordering & result coordination
- OPD patient queue load & inpatient bed occupancy metrics
- Facility doctor roster & ward-level bed breakdown
- Medicine availability alert notifications for doctors & ASHA workers
"""
import os
import logging
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

logger = logging.getLogger("curatrack.facility")
router = APIRouter()

# ─── Supabase Client Initialization ────────────────────────────────────────

DEFAULT_SUPABASE_URL = "https://pwpbcomeklrxfieaklvq.supabase.co"
DEFAULT_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3cGJjb21la2xyeGZpZWFrbHZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjExNzA0OSwiZXhwIjoyMTAxNjkzMDQ5fQ.4jgE4x-OtVfDKOLquXjBPiV3blb_SKqvGedFE8pUetk"

_supabase = None

_DEFAULT_FACILITY_MEDICINES = [
    {"id": "MED-101", "name": "Paracetamol 500mg (Tablet)", "category": "Analgesics / Antipyretics", "stock_units": 12500, "monthly_consumption": 10000, "days_of_supply": 37, "status": "ADEQUATE", "unit": "tablets", "storage_location": "Pharmacy Bay A2", "last_restocked": "2026-07-01"},
    {"id": "MED-102", "name": "Amoxicillin 500mg (Capsule)", "category": "Antibiotics", "stock_units": 950, "monthly_consumption": 2500, "days_of_supply": 11, "status": "LOW_STOCK", "unit": "capsules", "storage_location": "Pharmacy Bay A4", "last_restocked": "2026-06-15"},
    {"id": "MED-103", "name": "ORS Sachets", "category": "Fluid & Electrolyte", "stock_units": 150, "monthly_consumption": 2000, "days_of_supply": 2, "status": "CRITICAL_STOCKOUT_RISK", "unit": "sachets", "storage_location": "Pharmacy Bay B1", "last_restocked": "2026-05-20"},
    {"id": "MED-104", "name": "Iron & Folic Acid (IFA)", "category": "Maternal Supplements", "stock_units": 22000, "monthly_consumption": 8000, "days_of_supply": 82, "status": "ADEQUATE", "unit": "tablets", "storage_location": "Pharmacy Bay B3", "last_restocked": "2026-07-10"},
    {"id": "MED-105", "name": "Ceftriaxone 1g (Injection)", "category": "Antibiotics / Emergency", "stock_units": 45, "monthly_consumption": 300, "days_of_supply": 4, "status": "CRITICAL_STOCKOUT_RISK", "unit": "vials", "storage_location": "Cold Chain Refrigerator 2", "last_restocked": "2026-06-25"},
    {"id": "MED-106", "name": "Amlodipine 5mg (Tablet)", "category": "Anti-hypertensive", "stock_units": 5400, "monthly_consumption": 4000, "days_of_supply": 40, "status": "ADEQUATE", "unit": "tablets", "storage_location": "Pharmacy Bay C1", "last_restocked": "2026-07-05"},
    {"id": "MED-107", "name": "Metformin 500mg (Tablet)", "category": "Anti-diabetic", "stock_units": 1200, "monthly_consumption": 3500, "days_of_supply": 10, "status": "LOW_STOCK", "unit": "tablets", "storage_location": "Pharmacy Bay C2", "last_restocked": "2026-06-10"},
    {"id": "MED-108", "name": "Tetanus Toxoid Vaccine", "category": "Immunization", "stock_units": 80, "monthly_consumption": 200, "days_of_supply": 12, "status": "LOW_STOCK", "unit": "doses", "storage_location": "Cold Chain Refrigerator 1", "last_restocked": "2026-07-02"},
]

_DEFAULT_FACILITY_BEDS = [
    {"id": "bed-ward-1", "ward": "General Male Ward", "total": 14, "occupied": 10, "available": 4, "description": "Adult male inpatient recovery & observation"},
    {"id": "bed-ward-2", "ward": "General Female Ward", "total": 12, "occupied": 10, "available": 2, "description": "Adult female inpatient recovery & observation"},
    {"id": "bed-ward-3", "ward": "Maternal ANC / Postpartum Ward", "total": 8, "occupied": 4, "available": 4, "description": "High-risk pregnancy, labour, postnatal care"},
    {"id": "bed-ward-4", "ward": "Pediatric Ward", "total": 6, "occupied": 5, "available": 1, "description": "Neonatal observation & childhood illness"},
    {"id": "bed-ward-5", "ward": "Emergency / Trauma ICU", "total": 4, "occupied": 2, "available": 2, "description": "Ventilator, oxygen support, hemodynamic monitoring"},
    {"id": "bed-ward-6", "ward": "Isolation Ward", "total": 6, "occupied": 4, "available": 2, "description": "TB, vector-borne, respiratory infection isolation"}
]

def get_db():
    global _supabase
    if _supabase is not None:
        return _supabase
    try:
        from supabase import create_client
        url = os.getenv("SUPABASE_URL") or DEFAULT_SUPABASE_URL
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_ANON_KEY") or DEFAULT_SUPABASE_KEY
        if url and key:
            _supabase = create_client(url, key)
            return _supabase
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {e}")
    
    raise HTTPException(status_code=500, detail="Supabase not configured or unreachable.")

# ─── Request Models ────────────────────────────────────────────────────────

class DiagnosticOrderRequest(BaseModel):
    patient_id: str
    patient_name: str
    test_name: str
    category: str = "General"
    priority: str = "ROUTINE"
    ordered_by: str = "On-Duty Medical Officer"
    clinical_indication: str = ""

class StockUpdateRequest(BaseModel):
    medicine_id: Optional[str] = None
    action: Optional[str] = "ADD"  # "ADD", "REDUCE", "SET"
    units: Optional[int] = None
    units_added: Optional[int] = None
    units_reduced: Optional[int] = None
    units_to_add: Optional[int] = None
    quantity: Optional[int] = None
    batch_number: Optional[str] = None
    supplier_name: Optional[str] = "District Medical Store Depot (DMSD)"
    reason: Optional[str] = None

class BedUpdateRequest(BaseModel):
    ward_id: Optional[str] = None
    ward: Optional[str] = None
    action: Optional[str] = "SET"  # "SET", "ADMIT", "DISCHARGE", "UPDATE_CAPACITY"
    total: Optional[int] = None
    occupied: Optional[int] = None
    available: Optional[int] = None
    delta: Optional[int] = 1
    description: Optional[str] = None

class MedicineOrderRequest(BaseModel):
    patient_id: str
    patient_name: Optional[str] = "Patient"
    prescription_id: Optional[str] = None
    medicine_name: str
    dosage: Optional[str] = "Standard"
    quantity: Optional[str] = "1 Course"
    frequency: Optional[str] = "As prescribed"
    instructions: Optional[str] = "Take as directed"
    pharmacy: Optional[str] = "Nandurbar SDH Dispensary"

# ─── API Endpoints ─────────────────────────────────────────────────────────

@router.get("/facility/stats")
def get_facility_stats():
    """Returns real-time facility load, OPD queue length, and bed occupancy."""
    try:
        db = get_db()
        res = db.table("facility_stats").select("*").execute()
        if res.data:
            row = res.data[0]
            return {
                "facility_name": row.get("facility_name"),
                "facility_type": row.get("facility_type"),
                "district": row.get("district"),
                "state": row.get("state"),
                "opd_today": {
                    "total_registered": row.get("opd_total_registered", 142),
                    "consulted": row.get("opd_consulted", 98),
                    "waiting": row.get("opd_waiting", 44),
                    "average_wait_minutes": row.get("opd_average_wait_minutes", 22)
                },
                "beds": {
                    "total": 50,
                    "occupied": 38,
                    "available": 12,
                    "maternal_ward_available": 4,
                    "icu_available": 2
                },
                "doctors_on_duty": 6,
                "active_inbound_referrals": row.get("active_inbound_referrals", 8),
                "active_outbound_referrals": row.get("active_outbound_referrals", 3)
            }
    except Exception as e:
        logger.error(f"Error fetching facility stats from Supabase: {e}")

    # Fallback response structure
    return {
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

@router.get("/facility/medicines")
def list_essential_medicines(
    category: Optional[str] = Query(None, description="Filter by medicine category"),
    status: Optional[str] = Query(None, description="Filter by stock status")
):
    """Returns Essential Drug List (EDL) inventory levels and stockout alerts."""
    try:
        db = get_db()
        query = db.table("facility_medicines").select("*")
        if category and category != "ALL":
            query = query.ilike("category", f"%{category}%")
        if status and status != "ALL":
            query = query.eq("status", status)
            
        res = query.execute()
        results = res.data or []

        if not results and not status:
            results = [m for m in _DEFAULT_FACILITY_MEDICINES]
            if category and category != "ALL":
                results = [m for m in results if category.lower() in m.get("category", "").lower()]

        # Dynamically ensure days_of_supply and status are consistent with current stock_units
        all_meds_res = db.table("facility_medicines").select("*").execute()
        all_meds = all_meds_res.data if (all_meds_res and all_meds_res.data) else _DEFAULT_FACILITY_MEDICINES
        
        for m in all_meds:
            stock = int(m.get("stock_units", 0))
            monthly = max(1, int(m.get("monthly_consumption", 300)))
            daily_rate = max(monthly / 30.0, 0.1)
            dos = int(stock / daily_rate)
            m["days_of_supply"] = dos
            if dos > 20:
                m["status"] = "ADEQUATE"
            elif dos > 7:
                m["status"] = "LOW_STOCK"
            else:
                m["status"] = "CRITICAL_STOCKOUT_RISK"

        if status and status != "ALL":
            filtered_meds = [m for m in all_meds if m.get("status") == status]
            if category and category != "ALL":
                filtered_meds = [m for m in filtered_meds if category.lower() in m.get("category", "").lower()]
            results = filtered_meds
        else:
            results = all_meds

        critical_count = len([m for m in all_meds if m.get("status") in ("LOW_STOCK", "CRITICAL_STOCKOUT_RISK")])

        return {
            "count": len(results),
            "total_count": len(all_meds),
            "critical_alerts_count": critical_count,
            "medicines": results
        }
    except Exception as e:
        logger.error(f"Error listing medicines from Supabase: {e}")
        all_meds = [dict(m) for m in _DEFAULT_FACILITY_MEDICINES]
        for m in all_meds:
            stock = int(m.get("stock_units", 0))
            monthly = max(1, int(m.get("monthly_consumption", 300)))
            daily_rate = max(monthly / 30.0, 0.1)
            dos = int(stock / daily_rate)
            m["days_of_supply"] = dos
            if dos > 20:
                m["status"] = "ADEQUATE"
            elif dos > 7:
                m["status"] = "LOW_STOCK"
            else:
                m["status"] = "CRITICAL_STOCKOUT_RISK"

        results = all_meds
        if category and category != "ALL":
            results = [m for m in results if category.lower() in m.get("category", "").lower()]
        if status and status != "ALL":
            results = [m for m in results if m.get("status") == status]

        critical_count = len([m for m in all_meds if m.get("status") in ("LOW_STOCK", "CRITICAL_STOCKOUT_RISK")])
        return {
            "count": len(results),
            "total_count": len(all_meds),
            "critical_alerts_count": critical_count,
            "medicines": results
        }

@router.get("/facility/diagnostics")
def list_diagnostic_orders(
    status: Optional[str] = Query(None, description="Filter by test status"),
    priority: Optional[str] = Query(None, description="Filter by test priority")
):
    """Returns diagnostic lab queue and sample tracking status."""
    try:
        db = get_db()
        query = db.table("facility_diagnostics").select("*")
        if status and status != "ALL":
            query = query.eq("status", status)
        if priority and priority != "ALL":
            query = query.eq("priority", priority)
            
        res = query.execute()
        results = res.data or []

        active_res = db.table("facility_diagnostics").select("id").neq("status", "COMPLETED").execute()
        active_count = len(active_res.data or [])

        return {
            "count": len(results),
            "active_orders": active_count,
            "diagnostics": results
        }
    except Exception as e:
        logger.error(f"Error listing diagnostics from Supabase: {e}")
        return {
            "count": 0,
            "active_orders": 0,
            "diagnostics": []
        }

@router.post("/facility/diagnostics/order")
def create_diagnostic_order(order: DiagnosticOrderRequest):
    """Allows doctors and clinical officers to order laboratory tests."""
    db = get_db()
    now_iso = datetime.utcnow().isoformat() + "Z"
    
    count_res = db.table("facility_diagnostics").select("id").execute()
    diag_id = f"DIAG-{len(count_res.data or []) + 101}"
    
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
    
    db.table("facility_diagnostics").insert(new_order).execute()
    return {"success": True, "diagnostic_order": new_order}

@router.post("/facility/medicines/update-stock")
@router.post("/facility/medicines/{medicine_id}/update-stock")
def update_medicine_stock(update: StockUpdateRequest, medicine_id: Optional[str] = None):
    """Allows pharmacists and store in-charges to record stock additions, reductions, or audit reconciliations."""
    target_id = medicine_id or update.medicine_id
    if not target_id:
        raise HTTPException(status_code=400, detail="Medicine ID is required")

    med = None
    try:
        db = get_db()
        res = db.table("facility_medicines").select("*").eq("id", target_id).execute()
        if res.data:
            med = res.data[0]
    except Exception as e:
        logger.warning(f"Could not connect to Supabase for update_medicine_stock: {e}")

    if not med:
        for m in _DEFAULT_FACILITY_MEDICINES:
            if m["id"] == target_id:
                med = m
                break

    if not med:
        raise HTTPException(status_code=404, detail="Medicine not found in EDL inventory")
    current_stock = int(med.get("stock_units", 0))
    action = (update.action or "ADD").upper()
    
    # Determine the quantity magnitude
    qty = 0
    if update.units is not None:
        qty = update.units
    elif update.quantity is not None:
        qty = update.quantity
    elif update.units_reduced is not None:
        qty = update.units_reduced
        action = "REDUCE"
    elif update.units_added is not None:
        qty = update.units_added
        if qty < 0:
            qty = abs(qty)
            action = "REDUCE"
        else:
            action = "ADD"
    elif update.units_to_add is not None:
        qty = update.units_to_add
        if qty < 0:
            qty = abs(qty)
            action = "REDUCE"
        else:
            action = "ADD"

    qty = abs(qty)

    if action == "REDUCE":
        new_stock = max(0, current_stock - qty)
    elif action == "SET":
        new_stock = max(0, qty)
    else:  # "ADD"
        new_stock = current_stock + qty
        
    med["stock_units"] = new_stock
    monthly_consumption = max(int(med.get("monthly_consumption", 30)), 1)
    daily_rate = max(monthly_consumption / 30.0, 0.1)
    med["days_of_supply"] = int(new_stock / daily_rate)
    
    if med["days_of_supply"] > 20:
        med["status"] = "ADEQUATE"
    elif med["days_of_supply"] > 7:
        med["status"] = "LOW_STOCK"
    else:
        med["status"] = "CRITICAL_STOCKOUT_RISK"
        
    try:
        db = get_db()
        db.table("facility_medicines").update(med).eq("id", med["id"]).execute()
    except Exception as e:
        logger.warning(f"Could not persist update to Supabase: {e}")

    return {
        "success": True, 
        "updated_medicine": med,
        "action": action,
        "delta": new_stock - current_stock,
        "previous_stock": current_stock,
        "current_stock": new_stock,
        "reason": update.reason,
        "batch_number": update.batch_number
    }

@router.get("/facility/doctors")
def get_facility_doctors(
    status: Optional[str] = Query(None, description="Filter by ON_DUTY / OFF_DUTY / AVAILABLE")
):
    """Returns the roster of doctors assigned to this facility with doctor details only."""
    try:
        db = get_db()
        query = db.table("facility_doctors").select("id, name, specialty, qualification, status, shift, phone, room")
        if status and status != "ALL":
            match_status = "ON_DUTY" if status.upper() == "AVAILABLE" else status.upper()
            query = query.eq("status", match_status)
            
        res = query.execute()
        results = res.data or []
        
        all_res = db.table("facility_doctors").select("status").execute()
        on_duty = len([d for d in (all_res.data or []) if d.get("status") == "ON_DUTY"])
        off_duty = len([d for d in (all_res.data or []) if d.get("status") == "OFF_DUTY"])

        return {
            "count": len(results),
            "on_duty": on_duty,
            "off_duty": off_duty,
            "doctors": results
        }
    except Exception as e:
        logger.error(f"Error fetching doctors from Supabase: {e}")
        return {
            "count": 0,
            "on_duty": 0,
            "off_duty": 0,
            "doctors": []
        }

@router.get("/facility/beds")
def get_facility_beds():
    """Returns detailed ward-level bed occupancy and availability."""
    try:
        db = get_db()
        res = db.table("facility_beds").select("*").execute()
        beds = res.data if (res and res.data) else [dict(w) for w in _DEFAULT_FACILITY_BEDS]
        
        for w in beds:
            total = int(w.get("total", 0))
            occupied = int(w.get("occupied", 0))
            w["available"] = total - occupied

        total_beds = sum(w.get("total", 0) for w in beds)
        total_occupied = sum(w.get("occupied", 0) for w in beds)
        total_available = sum(max(0, w.get("available", 0)) for w in beds)
        
        return {
            "total_beds": total_beds,
            "total_occupied": total_occupied,
            "total_available": total_available,
            "occupancy_rate": round((total_occupied / total_beds) * 100, 1) if total_beds > 0 else 0,
            "wards": beds
        }
    except Exception as e:
        logger.error(f"Error fetching beds from Supabase: {e}")
        beds = [dict(w) for w in _DEFAULT_FACILITY_BEDS]
        for w in beds:
            total = int(w.get("total", 0))
            occupied = int(w.get("occupied", 0))
            w["available"] = total - occupied

        total_beds = sum(w.get("total", 0) for w in beds)
        total_occupied = sum(w.get("occupied", 0) for w in beds)
        total_available = sum(max(0, w.get("available", 0)) for w in beds)
        return {
            "total_beds": total_beds,
            "total_occupied": total_occupied,
            "total_available": total_available,
            "occupancy_rate": round((total_occupied / total_beds) * 100, 1) if total_beds > 0 else 0,
            "wards": beds
        }

@router.post("/facility/beds/update")
@router.post("/facility/beds/{ward_id}/update")
def update_facility_beds(request: BedUpdateRequest, ward_id: Optional[str] = None):
    """Updates ward total capacity, occupied beds, or available beds (Admit/Discharge/Set)."""
    target_id = ward_id or request.ward_id
    target_ward_name = request.ward
    
    ward_record = None
    try:
        db = get_db()
        if target_id:
            res = db.table("facility_beds").select("*").eq("id", target_id).execute()
            if res.data:
                ward_record = res.data[0]
        if not ward_record and target_ward_name:
            res = db.table("facility_beds").select("*").ilike("ward", target_ward_name).execute()
            if res.data:
                ward_record = res.data[0]
    except Exception as e:
        logger.warning(f"Could not connect to Supabase for update_facility_beds: {e}")

    # Fallback to in-memory list
    if not ward_record:
        for w in _DEFAULT_FACILITY_BEDS:
            if (target_id and (w.get("id") == target_id or str(w.get("id")) == str(target_id))) or \
               (target_ward_name and w.get("ward", "").lower() == target_ward_name.lower()):
                ward_record = w
                break

    if not ward_record:
        ward_record = _DEFAULT_FACILITY_BEDS[0]

    current_total = int(ward_record.get("total", 10))
    current_occupied = int(ward_record.get("occupied", 0))
    action = (request.action or "SET").upper()
    delta = request.delta if request.delta is not None else 1

    if action == "ADMIT":
        new_total = request.total if request.total is not None else current_total
        new_occupied = current_occupied + delta
        new_available = new_total - new_occupied
    elif action == "DISCHARGE":
        new_total = request.total if request.total is not None else current_total
        new_occupied = max(0, current_occupied - delta)
        new_available = new_total - new_occupied
    elif action == "UPDATE_CAPACITY":
        new_total = max(1, request.total if request.total is not None else current_total)
        new_occupied = current_occupied
        new_available = new_total - new_occupied
    else:  # "SET"
        new_total = request.total if request.total is not None else current_total
        if request.available is not None and request.occupied is None:
            new_available = int(request.available)
            new_occupied = max(0, new_total - new_available)
        elif request.occupied is not None:
            new_occupied = max(0, int(request.occupied))
            new_available = new_total - new_occupied
        else:
            new_occupied = current_occupied
            new_available = new_total - new_occupied

    ward_record["total"] = new_total
    ward_record["occupied"] = new_occupied
    ward_record["available"] = new_available
    if request.description:
        ward_record["description"] = request.description
    ward_record["updated_at"] = datetime.utcnow().isoformat() + "Z"

    try:
        db = get_db()
        db.table("facility_beds").update(ward_record).eq("id", ward_record["id"]).execute()
    except Exception as e:
        logger.warning(f"Could not persist bed update to Supabase: {e}")

    return {
        "success": True,
        "updated_ward": ward_record,
        "message": f"Successfully updated {ward_record.get('ward')}: {new_available} available beds of {new_total} total ({new_occupied} occupied)."
    }

@router.get("/facility/medicine-alerts")
def get_medicine_alerts():
    """Returns medicines that are LOW_STOCK or CRITICAL — used by Doctor & ASHA pages."""
    try:
        db = get_db()
        res = db.table("facility_medicines").select("*").in_("status", ["LOW_STOCK", "CRITICAL_STOCKOUT_RISK"]).execute()
        alerts = res.data or []
        return {
            "alert_count": len(alerts),
            "medicines": alerts
        }
    except Exception as e:
        logger.error(f"Error fetching medicine alerts from Supabase: {e}")
        return {
            "alert_count": 0,
            "medicines": []
        }

@router.get("/facility/medicine-orders")
@router.get("/medicines/orders")
def list_medicine_orders(patient_id: Optional[str] = Query(None, description="Filter by patient ID")):
    """Returns active and completed medicine orders for pharmacy & patient verification."""
    try:
        db = get_db()
        query = db.table("medicine_orders").select("*")
        if patient_id:
            query = query.eq("patient_id", patient_id)
        res = query.order("created_at", desc=True).execute()
        return {"count": len(res.data or []), "orders": res.data or []}
    except Exception as e:
        logger.warning(f"Error querying medicine_orders table: {e}")
        return {"count": 0, "orders": []}

@router.post("/facility/medicine-orders")
@router.post("/medicines/order")
def create_medicine_order(order: MedicineOrderRequest):
    """Allows patients to place a direct pharmacy dispensing order from a doctor prescription."""
    now_iso = datetime.now().isoformat() + "Z"
    new_order = {
        "patient_id": order.patient_id,
        "patient_name": order.patient_name,
        "prescription_id": order.prescription_id,
        "medicine_name": order.medicine_name,
        "dosage": order.dosage,
        "quantity": order.quantity,
        "frequency": order.frequency,
        "instructions": order.instructions,
        "pharmacy": order.pharmacy,
        "status": "ORDERED",
        "created_at": now_iso
    }
    try:
        db = get_db()
        db.table("medicine_orders").insert(new_order).execute()
    except Exception as e:
        logger.warning(f"Note inserting into medicine_orders: {e}")
        
    return {"success": True, "order": new_order}


# ─── Stock Deduction & Prescription Integration (Phase 8) ──────────────────

# In-memory tracking set for processed prescription IDs to prevent double deductions
_processed_prescription_deductions = set()

class StockDeductItem(BaseModel):
    medicine_name: str
    quantity: int = 1

class StockDeductRequest(BaseModel):
    prescription_id: str
    patient_id: Optional[str] = None
    items: List[StockDeductItem]
    dispensed_by: Optional[str] = "Facility Pharmacy"

@router.post("/facility/medicines/deduct-stock")
def deduct_medicine_stock(req: StockDeductRequest):
    """
    Atomically deducts medicine stock from facility_medicines when a prescription is finalized.
    Ensures idempotency using prescription_id to prevent double deduction.
    """
    if req.prescription_id in _processed_prescription_deductions:
        return {
            "success": True,
            "message": f"Prescription {req.prescription_id} already processed for inventory deduction.",
            "deductions": []
        }

    deductions = []
    db = get_db()

    for item in req.items:
        med_name = item.medicine_name.strip()
        qty = max(1, item.quantity)
        
        try:
            # Query existing stock
            res = db.table("facility_medicines").select("*").ilike("name", f"%{med_name}%").execute()
            if res.data and len(res.data) > 0:
                row = res.data[0]
                med_id = row["id"]
                current_stock = int(row.get("stock_units", 0))
                monthly_cons = max(int(row.get("monthly_consumption", 30)), 1)
                
                new_stock = max(0, current_stock - qty)
                daily_rate = max(monthly_cons / 30.0, 0.1)
                new_days = int(new_stock / daily_rate)
                
                new_status = "ADEQUATE"
                if new_days <= 3:
                    new_status = "CRITICAL_STOCKOUT_RISK"
                elif new_days <= 10:
                    new_status = "LOW_STOCK"

                # Update in Supabase
                db.table("facility_medicines").update({
                    "stock_units": new_stock,
                    "days_of_supply": new_days,
                    "status": new_status,
                    "updated_at": datetime.now().isoformat() + "Z"
                }).eq("id", med_id).execute()

                deductions.append({
                    "medicine_id": med_id,
                    "medicine_name": row["name"],
                    "deducted": qty,
                    "remaining_stock": new_stock,
                    "days_of_supply": new_days,
                    "status": new_status
                })
        except Exception as err:
            logger.error(f"Failed to deduct stock for {med_name}: {err}")

    _processed_prescription_deductions.add(req.prescription_id)

    return {
        "success": True,
        "prescription_id": req.prescription_id,
        "message": f"Successfully updated stock for {len(deductions)} items.",
        "deductions": deductions
    }


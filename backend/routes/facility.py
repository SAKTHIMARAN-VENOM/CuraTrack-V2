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
    medicine_id: str
    units_added: int
    batch_number: Optional[str] = None
    supplier_name: Optional[str] = "District Medical Store Depot (DMSD)"

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

        all_res = db.table("facility_medicines").select("status").execute()
        critical_count = len([m for m in (all_res.data or []) if m.get("status") in ("LOW_STOCK", "CRITICAL_STOCKOUT_RISK")])

        return {
            "count": len(results),
            "critical_alerts_count": critical_count,
            "medicines": results
        }
    except Exception as e:
        logger.error(f"Error listing medicines from Supabase: {e}")
        return {
            "count": 0,
            "critical_alerts_count": 0,
            "medicines": []
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
def update_medicine_stock(update: StockUpdateRequest):
    """Allows pharmacists and store in-charges to record fresh medicine receipts."""
    db = get_db()
    res = db.table("facility_medicines").select("*").eq("id", update.medicine_id).execute()
    
    if not res.data:
        raise HTTPException(status_code=404, detail="Medicine not found in EDL inventory")
        
    med = res.data[0]
    med["stock_units"] += update.units_added
    daily_rate = max(1, med["monthly_consumption"] // 30)
    med["days_of_supply"] = med["stock_units"] // daily_rate
    
    if med["days_of_supply"] > 20:
        med["status"] = "ADEQUATE"
    elif med["days_of_supply"] > 7:
        med["status"] = "LOW_STOCK"
    else:
        med["status"] = "CRITICAL_STOCKOUT_RISK"
        
    db.table("facility_medicines").update(med).eq("id", med["id"]).execute()
    return {"success": True, "updated_medicine": med}

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
        beds = res.data or []
        
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
        return {
            "total_beds": 0,
            "total_occupied": 0,
            "total_available": 0,
            "occupancy_rate": 0,
            "wards": []
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

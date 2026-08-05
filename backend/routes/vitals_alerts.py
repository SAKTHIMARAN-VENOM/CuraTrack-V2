import time
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()

# In-memory store for active alerts
_active_alerts: dict = {}


class VitalsCheckRequest(BaseModel):
    patient_id: str
    heart_rate: Optional[float] = None
    spo2: Optional[float] = None
    systolic_bp: Optional[float] = None
    diastolic_bp: Optional[float] = None
    temperature: Optional[float] = None


def _check_vitals(req: VitalsCheckRequest) -> List[dict]:
    alerts = []

    if req.spo2 is not None:
        if req.spo2 < 90:
            alerts.append({"type": "spo2", "severity": "EMERGENCY", "message": "Dangerously low oxygen — call emergency services", "value": req.spo2})
        elif req.spo2 < 94:
            alerts.append({"type": "spo2", "severity": "CRITICAL", "message": "Low oxygen saturation — seek medical attention immediately", "value": req.spo2})

    if req.heart_rate is not None:
        if req.heart_rate > 120:
            alerts.append({"type": "heart_rate", "severity": "CRITICAL", "message": "Significantly elevated heart rate — possible tachycardia", "value": req.heart_rate})
        elif req.heart_rate > 100:
            alerts.append({"type": "heart_rate", "severity": "WARNING", "message": "Elevated heart rate detected", "value": req.heart_rate})
        elif req.heart_rate < 50:
            alerts.append({"type": "heart_rate", "severity": "CRITICAL", "message": "Low heart rate — possible bradycardia", "value": req.heart_rate})

    if req.systolic_bp is not None:
        if req.systolic_bp > 180:
            alerts.append({"type": "blood_pressure", "severity": "CRITICAL", "message": "Hypertensive crisis range — seek immediate care", "value": req.systolic_bp})
        elif req.systolic_bp > 140:
            alerts.append({"type": "blood_pressure", "severity": "WARNING", "message": "Elevated blood pressure", "value": req.systolic_bp})

    if req.temperature is not None:
        if req.temperature > 39.5:
            alerts.append({"type": "temperature", "severity": "CRITICAL", "message": "High fever — medical attention advised", "value": req.temperature})
        elif req.temperature > 38.5:
            alerts.append({"type": "temperature", "severity": "WARNING", "message": "Fever detected", "value": req.temperature})

    # Sort: EMERGENCY first, then CRITICAL, then WARNING
    severity_order = {"EMERGENCY": 0, "CRITICAL": 1, "WARNING": 2}
    alerts.sort(key=lambda a: severity_order.get(a["severity"], 3))

    return alerts


def _get_seasonal_alerts() -> List[dict]:
    """Existing seasonal check merged into response."""
    month = int(time.strftime("%m"))
    if month in [6, 7, 8, 9]:  # Monsoon
        return [{"type": "seasonal", "severity": "INFO", "message": "Monsoon season: elevated risk of dengue and leptospirosis in your area."}]
    if month in [12, 1, 2]:
        return [{"type": "seasonal", "severity": "INFO", "message": "Winter season: higher risk of respiratory infections. Stay warm."}]
    return []


@router.post("/alerts/vitals-check")
def vitals_check(req: VitalsCheckRequest):
    vitals_alerts = _check_vitals(req)
    seasonal_alerts = _get_seasonal_alerts()

    all_alerts = vitals_alerts + seasonal_alerts

    _active_alerts[req.patient_id] = {
        "alerts": all_alerts,
        "checked_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }

    return {
        "patient_id": req.patient_id,
        "alerts": all_alerts,
        "alert_count": len(all_alerts),
        "has_critical": any(a["severity"] in ("EMERGENCY", "CRITICAL") for a in all_alerts),
    }

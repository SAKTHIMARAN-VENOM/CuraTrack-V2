import time
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

# In-memory store for SDOH scores (replace with Supabase in production)
_sdoh_scores: dict = {}


class SDOHRequest(BaseModel):
    patient_id: str
    income_band: int       # 0-3
    food_security: int     # 0-3
    hospital_distance: int # 0-3
    employment: int        # 0-2
    health_literacy: int   # 0-3


def _calculate_score(req: SDOHRequest) -> int:
    return req.income_band + req.food_security + req.hospital_distance + req.employment + req.health_literacy


def _get_risk_level(score: int) -> tuple:
    if score <= 3:
        return "LOW", "green"
    if score <= 7:
        return "MODERATE", "amber"
    return "HIGH", "red"


def _get_recommendations(score: int, req: SDOHRequest) -> list:
    recs = []
    risk_level, _ = _get_risk_level(score)

    if risk_level == "HIGH" and req.hospital_distance >= 3:
        recs.append("Patient may benefit from teleconsultation priority booking")
    if risk_level == "HIGH" and req.food_security >= 2:
        recs.append("Screen for PM POSHAN or local anganwadi support")
    if risk_level == "HIGH" and req.health_literacy >= 2:
        recs.append("Provide audio/visual prescription instructions")
    if risk_level == "MODERATE":
        recs.append("Flag for social worker follow-up within 30 days")
    if not recs:
        recs.append("Continue routine health monitoring and preventive care")
    return recs


@router.post("/sdoh/calculate")
def calculate_sdoh(req: SDOHRequest):
    score = _calculate_score(req)
    risk_level, risk_color = _get_risk_level(score)
    recommendations = _get_recommendations(score, req)

    breakdown = {
        "income_band": req.income_band,
        "food_security": req.food_security,
        "hospital_distance": req.hospital_distance,
        "employment": req.employment,
        "health_literacy": req.health_literacy,
    }

    record = {
        "patient_id": req.patient_id,
        "score": score,
        "risk_level": risk_level,
        "risk_color": risk_color,
        "responses": breakdown,
        "recommendations": recommendations,
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }

    _sdoh_scores[req.patient_id] = record

    return {
        "score": score,
        "risk_level": risk_level,
        "risk_color": risk_color,
        "breakdown": breakdown,
        "recommendations": recommendations,
    }


@router.get("/sdoh/{patient_id}")
def get_sdoh(patient_id: str):
    record = _sdoh_scores.get(patient_id)
    if not record:
        raise HTTPException(status_code=404, detail="No SDOH score found for this patient.")
    return record

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.eligibility import check_coverage_logic, EligibilityRequest, EligibilityResponse
from typing import List

router = APIRouter()

@router.post("/insurance/eligibility", response_model=EligibilityResponse)
def check_eligibility(request: EligibilityRequest):
    """
    Check FHIR-based coverage eligibility for a specific service.
    """
    try:
        response = check_coverage_logic(request)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# TEMPORARY MOCKS - To be replaced with real AI/DB integration 
# ==========================================

class Scheme(BaseModel):
    id: str
    name: str
    type: str # "government" | "insurance"
    reason: str
    amount: str
    match_percentage: int

@router.post("/patient/{patient_id}/insurance-schemes")
def recommend_schemes(patient_id: str):
    """
    Returns AI recommended schemes based on user clinical profile.
    """
    return {
        "availableSchemes": [
            {
                "id": "ins_optima_secure",
                "name": "Optima Secure Comprehensive Cover",
                "type": "insurance",
                "reason": "Matches your age group and active lifestyle with 2X instant restore coverage and 0 co-pay for network consultations.",
                "amount": "Up to ₹10,00,000",
                "match_percentage": 94
            },
            {
                "id": "ins_star_health",
                "name": "Star Cardiac & Vital Care Shield",
                "type": "insurance",
                "reason": "Specialized cover for cardiovascular, hypertension, and annual health checkups with cashless claims at 14,000+ empanelled hospitals.",
                "amount": "Up to ₹7,50,000",
                "match_percentage": 89
            },
            {
                "id": "ins_max_bupa",
                "name": "Health Companion Super Top-up",
                "type": "insurance",
                "reason": "Covers high deductibles for surgeries and specialized inpatient procedures with zero waiting period for pre-existing conditions after 24 months.",
                "amount": "Up to ₹15,00,000",
                "match_percentage": 82
            }
        ]
    }

import random

class ClaimRequest(BaseModel):
    schemeName: str
    recommendationReason: str
    amount: Optional[int] = None
    schemeId: Optional[str] = None

@router.post("/patient/{patient_id}/claims")
def submit_claim(patient_id: str, request: ClaimRequest):
    """
    Submit a claim / application request for a recommended scheme or government benefit.
    """
    claim_num = random.randint(10000, 99999)
    claim_id = f"CLM-{claim_num}"
    return {
        "status": "success",
        "message": f"Claim for '{request.schemeName}' initiated successfully! Tracking ID: {claim_id}",
        "claimId": claim_id,
        "amount": request.amount or 50000
    }

@router.post("/patient/{patient_id}/insurance")
def fetch_insurance(patient_id: str):
    """
    [TEMPORARY MOCK] Fetch FHIR Coverage data for patient.
    """
    return {
        "insuranceId": "INS-123",
        "status": "active",
        "provider": "Mock Health Insurance Corp"
    }

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

class ClaimRequest(BaseModel):
    schemeName: str
    recommendationReason: str

@router.post("/patient/{patient_id}/claims")
def submit_claim(patient_id: str, request: ClaimRequest):
    """
    [TEMPORARY MOCK] Submit a claim request for a recommended scheme.
    """
    return {
        "status": "success",
        "message": f"Claim for {request.schemeName} initiated successfully.",
        "claimId": "CLM-99992"
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

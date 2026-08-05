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
        "availableSchemes": []
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

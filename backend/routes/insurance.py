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
    [TEMPORARY MOCK] Returns AI recommended schemes.
    Replace later with Ollama/LLaMA 3 invocation and DB queries.
    """
    return {
        "availableSchemes": [
            {
                "id": "sch_gov_1",
                "name": "Senior Care Plus",
                "type": "government",
                "reason": "Based on your recent cardiology records, you qualify for an additional 15% co-payment waiver.",
                "amount": "15% Co-pay Waiver",
                "match_percentage": 95
            },
            {
                "id": "sch_gov_2",
                "name": "National Health Scheme",
                "type": "government",
                "reason": "Comprehensive coverage for primary healthcare including outpatient consultations.",
                "amount": "$0 Premium",
                "match_percentage": 90
            },
            {
                "id": "sch_ins_1",
                "name": "Corporate Blue Shield",
                "type": "insurance",
                "reason": "Employer-sponsored plan matches your surgical requirement.",
                "amount": "Up to $50,000",
                "match_percentage": 85
            },
             {
                "id": "sch_gov_3",
                "name": "Chronic Med Subsidy",
                "type": "government",
                "reason": "Subsidized medication costs for long-term conditions.",
                "amount": "80% Off Pharmacy",
                "match_percentage": 70
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

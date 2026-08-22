from fastapi import APIRouter, HTTPException
from services.government_schemes import (
    evaluate_government_schemes,
    GovSchemeRequest,
    GovSchemeResponse,
)

router = APIRouter()

@router.post("/government-schemes/eligibility", response_model=GovSchemeResponse)
def check_gov_eligibility(request: GovSchemeRequest):
    """
    Evaluate patient profile against government healthcare scheme rules.
    Returns sorted list of eligible schemes with coverage details and reasons.
    """
    try:
        return evaluate_government_schemes(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

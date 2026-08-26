from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from services.government_schemes import (
    evaluate_government_schemes,
    get_empanelled_facilities,
    verify_hospital_empanelment,
    get_filter_metadata,
    check_datagov_api_health,
    GovSchemeRequest,
    GovSchemeResponse,
    HospitalSearchResponse,
    HospitalVerifyRequest,
    HospitalVerifyResponse,
)

router = APIRouter()

@router.get("/government-schemes/api-status")
def get_gov_api_status():
    """
    Checks and returns live connectivity status of the Data.gov.in / OGD API key
    and the status of the CGHS Empaneled Hospitals dataset.
    """
    try:
        return check_datagov_api_health()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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

@router.post("/patient/{patient_id}/government-schemes")
@router.get("/patient/{patient_id}/government-schemes")
def get_patient_gov_schemes(patient_id: str):
    """
    Evaluate and return eligible government schemes for a patient profile.
    Compatible with frontend and mobile dashboards.
    """
    try:
        req = GovSchemeRequest(patientId=patient_id)
        result = evaluate_government_schemes(req)
        schemes_list = [s.model_dump() for s in result.eligibleSchemes]
        return {
            "schemes": schemes_list,
            "eligibleSchemes": schemes_list,
            "availableSchemes": schemes_list,
            "message": result.message
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/government-schemes/hospitals", response_model=HospitalSearchResponse)
def list_empanelled_hospitals(
    q: Optional[str] = Query(None, description="Search keyword for hospital name, city, test, or specialty"),
    state: Optional[str] = Query(None, description="Filter by state name"),
    district: Optional[str] = Query(None, description="Filter by district name"),
    facility_type: Optional[str] = Query(None, description="Filter by HOSPITAL, DIAGNOSTIC_CENTRE, etc."),
    scheme: Optional[str] = Query(None, description="Filter by specific government scheme"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    """
    Search and discover empanelled hospitals & diagnostic centres under Government Schemes
    powered by Open Government Data (data.gov.in / OGD API) and the National Ayushman Registry.
    """
    try:
        return get_empanelled_facilities(
            query=q,
            state=state,
            district=district,
            facility_type=facility_type,
            scheme=scheme,
            limit=limit,
            offset=offset
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/government-schemes/verify-hospital", response_model=HospitalVerifyResponse)
def check_hospital_empanelment(request: HospitalVerifyRequest):
    """
    Instantly verifies whether a specific hospital or diagnostic laboratory is empanelled under
    Government Schemes (Ayushman Bharat PM-JAY, CGHS, State Health Schemes).
    Returns cashless treatment eligibility, covered diagnostic tests, and required documents.
    """
    try:
        return verify_hospital_empanelment(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/government-schemes/filters")
def get_schemes_and_locations():
    """
    Returns available States, Districts, Schemes, and Facility Types for frontend filters.
    """
    try:
        return get_filter_metadata()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

"""
Onboarding API endpoints for Patient, Doctor, and Admin.
"""
from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
from services.onboarding_service import (
    save_patient_onboarding,
    save_doctor_onboarding,
    save_admin_onboarding,
    get_user_onboarding_status,
    get_all_pending_doctors,
    update_doctor_verification_status
)

router = APIRouter()


class PatientOnboardingRequest(BaseModel):
    user_id: str
    personal_info: dict = {}
    medical_info: dict = {}
    insurance_info: dict = {}
    emergency_contact: dict = {}
    government_schemes: dict = {}


class DoctorOnboardingRequest(BaseModel):
    user_id: str
    personal_details: dict = {}
    professional_details: dict = {}
    verification_documents: dict = {}


class AdminOnboardingRequest(BaseModel):
    user_id: str
    name: str
    email: str
    department: str = ""
    organization: str = ""
    role: str = "Administrator"
    emergency_contact: str = ""


class FHWOnboardingRequest(BaseModel):
    user_id: str
    name: str
    worker_type: str = "ASHA"  # ASHA, ANM, MPW
    asha_id: str = ""
    village_name: str
    sub_centre: str = ""
    parent_phc: str = ""
    contact_phone: str = ""


class FacilityManagerOnboardingRequest(BaseModel):
    user_id: str
    name: str
    role_title: str = "Facility Manager"
    facility_name: str
    facility_type: str = "CHC"
    district: str
    block: str = ""
    license_number: str = ""
    contact_phone: str = ""


class DoctorVerificationAction(BaseModel):
    doctor_id: str
    status: str  # 'verified' or 'rejected'
    admin_id: str = "admin-1"


@router.post("/onboarding/patient")
def handle_patient_onboarding(body: PatientOnboardingRequest):
    if not body.user_id:
        raise HTTPException(status_code=400, detail="User ID is required")
    return save_patient_onboarding(body.user_id, body.model_dump())


@router.post("/onboarding/doctor")
def handle_doctor_onboarding(body: DoctorOnboardingRequest):
    if not body.user_id:
        raise HTTPException(status_code=400, detail="User ID is required")
    return save_doctor_onboarding(body.user_id, body.model_dump())


@router.post("/onboarding/admin")
def handle_admin_onboarding(body: AdminOnboardingRequest):
    if not body.user_id:
        raise HTTPException(status_code=400, detail="User ID is required")
    return save_admin_onboarding(body.user_id, body.model_dump())


@router.post("/onboarding/fhw")
def handle_fhw_onboarding(body: FHWOnboardingRequest):
    if not body.user_id:
        raise HTTPException(status_code=400, detail="User ID is required")
    from services.onboarding_service import save_fhw_onboarding
    return save_fhw_onboarding(body.user_id, body.model_dump())


@router.post("/onboarding/facility")
def handle_facility_onboarding(body: FacilityManagerOnboardingRequest):
    if not body.user_id:
        raise HTTPException(status_code=400, detail="User ID is required")
    from services.onboarding_service import save_facility_manager_onboarding
    return save_facility_manager_onboarding(body.user_id, body.model_dump())


@router.get("/onboarding/status/{user_id}")
def check_onboarding_status(user_id: str):
    return get_user_onboarding_status(user_id)


@router.get("/admin/doctors")
def list_doctors_for_verification():
    return {"doctors": get_all_pending_doctors()}


@router.post("/admin/verify-doctor")
def verify_doctor(action: DoctorVerificationAction):
    if action.status not in ("verified", "rejected"):
        raise HTTPException(status_code=400, detail="Invalid status value. Must be 'verified' or 'rejected'.")
    return update_doctor_verification_status(action.doctor_id, action.status, action.admin_id)

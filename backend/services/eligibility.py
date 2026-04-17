from pydantic import BaseModel
from typing import Optional

class EligibilityRequest(BaseModel):
    patientId: str
    insuranceId: str
    service: str  # consultation | lab_test | surgery

class EligibilityDetails(BaseModel):
    insurancePays: str
    youPay: str

class EligibilityResponse(BaseModel):
    resourceType: str = "CoverageEligibilityResponse"
    status: str
    outcome: str
    eligible: bool
    coverageLevel: str  # full | partial | none
    service: str
    message: str
    suggestion: Optional[str] = None
    details: Optional[EligibilityDetails] = None

# Mock database of valid insurance IDs and their specific status
VALID_INSURANCES = {
    "INS-123": {"status": "active", "plan": "premium"},
    "INS-456": {"status": "active", "plan": "standard"},
    "INS-789": {"status": "inactive", "plan": "basic"}
}

def check_coverage_logic(request: EligibilityRequest) -> EligibilityResponse:
    # 1. Validate insuranceId
    insurance_data = VALID_INSURANCES.get(request.insuranceId)
    
    if not insurance_data:
        return EligibilityResponse(
            status="error",
            outcome="complete",
            eligible=False,
            coverageLevel="none",
            service=request.service,
            message="Invalid or missing Insurance ID. Please verify your details.",
            suggestion="Use an AI-recommended government or alternative scheme."
        )
        
    if insurance_data["status"] != "active":
        return EligibilityResponse(
            status="inactive",
            outcome="complete",
            eligible=False,
            coverageLevel="none",
            service=request.service,
            message="Your insurance policy is currently inactive.",
            suggestion="Renew your policy or explore alternative schemes."
        )

    # 2. Check service coverage based on rules
    service = request.service.lower()
    
    if service == "consultation":
        return EligibilityResponse(
            status="active",
            outcome="complete",
            eligible=True,
            coverageLevel="full",
            service=request.service,
            message="Consultation is fully covered under your plan.",
            suggestion=None,
            details=EligibilityDetails(insurancePays="500", youPay="0")
        )
        
    elif service == "lab_test":
        return EligibilityResponse(
            status="active",
            outcome="complete",
            eligible=True,
            coverageLevel="partial",
            service=request.service,
            message="Lab test is partially covered. Co-pay may apply.",
            suggestion="You can use an AI-recommended scheme to cover the remaining costs.",
            details=EligibilityDetails(insurancePays="1,200", youPay="800")
        )
        
    elif service == "surgery":
        # Example rule: Standard plan doesn't cover surgeries completely
        if insurance_data["plan"] == "premium":
             return EligibilityResponse(
                status="active",
                outcome="complete",
                eligible=True,
                coverageLevel="partial",
                service=request.service,
                message="Surgery is partially covered under premium plan. Deductibles apply.",
                suggestion="Use corporate or specialized schemes for further reductions.",
                details=EligibilityDetails(insurancePays="15,000", youPay="5,000")
             )
        else:
            return EligibilityResponse(
                status="active",
                outcome="complete",
                eligible=False,
                coverageLevel="none",
                service=request.service,
                message="Surgery is not covered under your current plan.",
                suggestion="Explore comprehensive health schemes to cover surgical procedures."
            )
            
    else:
        # Default fallback
        return EligibilityResponse(
            status="active",
            outcome="complete",
            eligible=False,
            coverageLevel="none",
            service=request.service,
            message="Service level unknown or not covered.",
            suggestion="Check AI recommendations."
        )

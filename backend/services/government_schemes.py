from pydantic import BaseModel
from typing import List, Optional

# ==========================================
# PATIENT DATA (mock DB — replace with real DB queries)
# ==========================================

PATIENT_DB = {
    "PAT-123": {
        "name": "Rajesh Kumar",
        "age": 65,
        "gender": "male",
        "income": 180000,
        "medicalConditions": ["hypertension", "diabetes"],
        "location": "Tamil Nadu",
    },
    "PAT-456": {
        "name": "Priya Sharma",
        "age": 32,
        "gender": "female",
        "income": 320000,
        "medicalConditions": ["asthma"],
        "location": "Maharashtra",
    },
    "PAT-789": {
        "name": "Amit Singh",
        "age": 45,
        "gender": "male",
        "income": 550000,
        "medicalConditions": [],
        "location": "Delhi",
    },
}

# ==========================================
# MODELS
# ==========================================

class GovSchemeRequest(BaseModel):
    patientId: str

class GovSchemeResult(BaseModel):
    id: str
    schemeName: str
    type: str
    eligibilityPercentage: int
    coverage: str
    recommendationReason: str
    estimatedBenefit: int

class GovSchemeResponse(BaseModel):
    eligibleSchemes: List[GovSchemeResult]
    message: Optional[str] = None

# ==========================================
# RULE ENGINE: Each rule returns a scheme dict or None
# ==========================================

def _rule_ayushman_bharat(patient: dict) -> Optional[dict]:
    """Ayushman Bharat – PMJAY: income < ₹2,50,000"""
    if patient["income"] < 250000:
        score = 95 if patient["income"] < 150000 else 88
        return {
            "id": "gov_ayushman",
            "schemeName": "Ayushman Bharat – PMJAY",
            "type": "Government Subsidy",
            "eligibilityPercentage": score,
            "coverage": "Up to ₹5,00,000 per family per year",
            "recommendationReason": (
                f"Your annual household income (₹{patient['income']:,}) is below the ₹2,50,000 threshold. "
                "You qualify for cashless treatment at empanelled hospitals across India."
            ),
            "estimatedBenefit": 500000,
        }
    return None


def _rule_senior_citizen_health(patient: dict) -> Optional[dict]:
    """Senior Citizen Health Scheme: age ≥ 60"""
    if patient["age"] >= 60:
        score = 96 if patient["age"] >= 70 else 90
        return {
            "id": "gov_senior",
            "schemeName": "Rashtriya Vayoshri Yojana",
            "type": "Government Subsidy",
            "eligibilityPercentage": score,
            "coverage": "Free assistive devices + ₹1,00,000 medical cover",
            "recommendationReason": (
                f"At age {patient['age']}, you qualify for senior citizen healthcare benefits "
                "including free assistive living devices and subsidized specialist consultations."
            ),
            "estimatedBenefit": 100000,
        }
    return None


def _rule_women_health(patient: dict) -> Optional[dict]:
    """Women Health Scheme: gender === female"""
    if patient["gender"] == "female":
        score = 92
        return {
            "id": "gov_women",
            "schemeName": "Janani Suraksha Yojana",
            "type": "Government Subsidy",
            "eligibilityPercentage": score,
            "coverage": "₹1,400 – ₹6,000 institutional delivery benefit",
            "recommendationReason": (
                "As a female beneficiary, you are eligible for maternal and reproductive healthcare "
                "subsidies covering institutional delivery and ante-natal care."
            ),
            "estimatedBenefit": 6000,
        }
    return None


def _rule_chronic_disease(patient: dict) -> Optional[dict]:
    """Chronic Disease Programme: has chronic conditions"""
    chronic_conditions = {"diabetes", "hypertension", "cancer", "cardiovascular", "kidney_disease", "copd"}
    matched = [c for c in patient.get("medicalConditions", []) if c.lower() in chronic_conditions]
    if matched:
        score = min(97, 80 + len(matched) * 8)
        return {
            "id": "gov_npcdcs",
            "schemeName": "NPCDCS (National Programme for NCDs)",
            "type": "Government Health Programme",
            "eligibilityPercentage": score,
            "coverage": "Free screening, treatment & medication for chronic conditions",
            "recommendationReason": (
                f"Your medical records indicate: {', '.join(matched)}. "
                "You qualify for free diagnosis, medication, and follow-up under NPCDCS at district-level health facilities."
            ),
            "estimatedBenefit": 50000,
        }
    return None


def _rule_state_health_scheme(patient: dict) -> Optional[dict]:
    """State-specific health scheme based on location"""
    state_schemes = {
        "Tamil Nadu": {
            "name": "Chief Minister's Comprehensive Health Insurance Scheme",
            "coverage": "Up to ₹5,00,000 for 1,027 listed procedures",
            "benefit": 500000,
        },
        "Maharashtra": {
            "name": "Mahatma Jyotiba Phule Jan Arogya Yojana",
            "coverage": "Up to ₹2,50,000 for surgeries & therapies",
            "benefit": 250000,
        },
        "Delhi": {
            "name": "Delhi Arogya Kosh",
            "coverage": "Up to ₹5,00,000 for critical illness treatment",
            "benefit": 500000,
        },
    }
    location = patient.get("location", "")
    scheme_info = state_schemes.get(location)
    if scheme_info:
        return {
            "id": f"gov_state_{location.lower().replace(' ', '_')}",
            "schemeName": scheme_info["name"],
            "type": "State Government Scheme",
            "eligibilityPercentage": 85,
            "coverage": scheme_info["coverage"],
            "recommendationReason": (
                f"As a resident of {location}, you are eligible for your state's flagship healthcare scheme "
                "providing cashless treatment at network hospitals."
            ),
            "estimatedBenefit": scheme_info["benefit"],
        }
    return None


# All rules collected in execution order
_ALL_RULES = [
    _rule_ayushman_bharat,
    _rule_senior_citizen_health,
    _rule_women_health,
    _rule_chronic_disease,
    _rule_state_health_scheme,
]


def evaluate_government_schemes(request: GovSchemeRequest) -> GovSchemeResponse:
    """
    Run the full rule engine against a patient profile.
    Returns sorted list of eligible government schemes (highest eligibility first).
    """
    patient = PATIENT_DB.get(request.patientId)

    if not patient:
        return GovSchemeResponse(
            eligibleSchemes=[],
            message=f"Patient {request.patientId} not found in records."
        )

    eligible: List[dict] = []
    for rule_fn in _ALL_RULES:
        result = rule_fn(patient)
        if result is not None:
            eligible.append(result)

    # Sort by eligibilityPercentage DESC
    eligible.sort(key=lambda s: s["eligibilityPercentage"], reverse=True)

    return GovSchemeResponse(
        eligibleSchemes=[GovSchemeResult(**s) for s in eligible],
        message=None if eligible else "No eligible government schemes found for this patient profile."
    )

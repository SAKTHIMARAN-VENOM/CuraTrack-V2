from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import List, Optional

router = APIRouter()

SYMPTOM_TAXONOMY = {
    "Respiratory": [
        "Persistent Cough (> 2 weeks)",
        "Shortness of breath on exertion",
        "Sore throat & difficulty swallowing",
        "Wheezing / Stridor",
        "Chest tightness",
        "Nasal congestion & runny nose"
    ],
    "Cardiovascular": [
        "Chest pain / Heavy pressure",
        "Palpitations / Rapid heartbeat",
        "Swelling in feet / ankles (Edema)",
        "Dizziness when standing",
        "Cyanosis (Bluish lips or fingertips)"
    ],
    "Gastrointestinal": [
        "Acute Diarrhea (> 3 episodes/day)",
        "Severe abdominal pain / cramping",
        "Persistent nausea / vomiting",
        "Blood in stool or vomit",
        "Loss of appetite & weight loss",
        "Jaundice (Yellowing of eyes/skin)"
    ],
    "Neurological": [
        "Severe sudden onset headache",
        "Dizziness / Vertigo",
        "Numbness or weakness in limbs",
        "Confusion / Altered sensorium",
        "Fainting / Syncope",
        "Seizures / Convulsions"
    ],
    "Maternal & Reproductive": [
        "Decreased fetal movements",
        "Severe lower abdominal pain during pregnancy",
        "Vaginal bleeding / abnormal discharge",
        "High blood pressure during pregnancy",
        "Swelling in hands & face in pregnancy"
    ],
    "Pediatric & General": [
        "High fever (> 102°F / 38.9°C)",
        "Fever with chills (Suspected Malaria/Dengue)",
        "Lethargy / Refusal to feed in infants",
        "Persistent body aches / Fatigue",
        "Skin rash with fever",
        "Severe dehydration / Dry tongue"
    ]
}

RED_FLAGS = [
    "Severe central chest pain radiating to left arm or jaw",
    "Extreme breathlessness at rest (Cannot speak full sentences)",
    "Loss of consciousness or sudden confusion",
    "SpO2 oxygen saturation below 92%",
    "Severe uncontrolled bleeding",
    "High fever with neck stiffness and sensitivity to light",
    "Sudden weakness or drooping on one side of face/body",
    "Pregnancy with vaginal bleeding or severe headache"
]

class TriageAssessmentRequest(BaseModel):
    patient_id: Optional[str] = "patient-001"
    patient_name: Optional[str] = "Anonymous Patient"
    age: Optional[int] = 32
    gender: Optional[str] = "Other"
    pregnant: Optional[bool] = False
    symptoms: List[str] = Field(default_factory=list)
    severity: int = Field(ge=1, le=10, default=5)
    duration_days: int = Field(ge=0, default=1)
    red_flags: List[str] = Field(default_factory=list)
    heart_rate: Optional[float] = None
    spo2: Optional[float] = None
    systolic_bp: Optional[float] = None
    temperature: Optional[float] = None
    notes: Optional[str] = None


@router.get("/triage/symptoms")
def get_symptom_taxonomy():
    """Returns categorized primary care symptoms and red flag danger signs."""
    return {
        "categories": SYMPTOM_TAXONOMY,
        "red_flags": RED_FLAGS
    }


@router.post("/triage/assess")
def assess_triage(req: TriageAssessmentRequest):
    """
    Evaluates clinical urgency according to Indian public health triage protocols
    (Ayushman Arogya Mandir / Sub-Centre -> PHC -> CHC -> District Hospital).
    """
    is_red = False
    is_yellow = False
    reasons = []
    potential_conditions = []
    immediate_actions = []

    # 1. Evaluate Red Flags
    if req.red_flags and len(req.red_flags) > 0:
        is_red = True
        reasons.extend(req.red_flags)

    # 2. Evaluate Objective Vitals
    if req.spo2 is not None and req.spo2 < 92:
        is_red = True
        reasons.append(f"Critical Hypoxemia (SpO2: {req.spo2}%)")
    elif req.spo2 is not None and req.spo2 < 95:
        is_yellow = True
        reasons.append(f"Mild-to-moderate oxygen drop (SpO2: {req.spo2}%)")

    if req.systolic_bp is not None and (req.systolic_bp > 180 or req.systolic_bp < 85):
        is_red = True
        reasons.append(f"Critical Blood Pressure ({req.systolic_bp} mmHg)")
    elif req.systolic_bp is not None and req.systolic_bp > 140:
        is_yellow = True
        reasons.append(f"Elevated blood pressure ({req.systolic_bp} mmHg)")

    if req.heart_rate is not None and (req.heart_rate > 130 or req.heart_rate < 45):
        is_red = True
        reasons.append(f"Dangerous Heart Rate ({req.heart_rate} bpm)")

    if req.temperature is not None and req.temperature > 39.5:
        is_red = True
        reasons.append(f"Hyperpyrexia ({req.temperature}°C)")

    # 3. Evaluate Symptom Patterns
    symptom_str = " ".join(req.symptoms).lower()

    if any(k in symptom_str for k in ["chest pain", "pressure", "cyanosis"]):
        if req.severity >= 7:
            is_red = True
            reasons.append("Severe acute chest pain / cardiovascular compromise")
            potential_conditions.extend(["Acute Coronary Syndrome (ACS)", "Angina Pectoris", "Hypertensive Emergency"])
        else:
            is_yellow = True
            potential_conditions.append("Atypical Chest Pain / Musculoskeletal")

    if any(k in symptom_str for k in ["shortness of breath", "wheezing", "stridor"]):
        if req.severity >= 7 or (req.spo2 and req.spo2 < 94):
            is_red = True
            potential_conditions.extend(["Acute Severe Asthma", "COPD Exacerbation", "Pneumonia"])
        else:
            is_yellow = True
            potential_conditions.extend(["Bronchitis", "Upper Respiratory Tract Infection (URTI)"])

    if any(k in symptom_str for k in ["diarrhea", "vomiting"]):
        if req.duration_days >= 3 or req.severity >= 7:
            is_yellow = True
            potential_conditions.extend(["Acute Gastroenteritis with Dehydration", "Foodborne Illness"])
            immediate_actions.append("Administer Oral Rehydration Salts (ORS) + Zinc tablets immediately.")
        else:
            potential_conditions.append("Mild Viral Gastroenteritis")

    if any(k in symptom_str for k in ["cough (> 2 weeks)", "weight loss", "chills"]):
        is_yellow = True
        potential_conditions.extend(["Suspected Pulmonary Tuberculosis", "Chronic Bronchitis"])
        immediate_actions.append("Sputum microscopy test (CB-NAAT/Truenat) recommended at nearest PHC/DMC.")

    if req.pregnant and (any(k in symptom_str for k in ["bleeding", "severe", "fetal"]) or req.severity >= 6):
        is_red = True
        reasons.append("High-risk obstetric presentation")
        potential_conditions.extend(["Obstetric Emergency / Antepartum Hemorrhage", "Severe Preeclampsia"])

    # 4. Determine Tier & Recommendation
    if is_red:
        urgency = "RED"
        urgency_label = "EMERGENCY / IMMEDIATE EVACUATION"
        color = "red"
        recommended_facility = "District Hospital / Tertiary Medical College Hospital"
        immediate_actions.extend([
            "Call 108 Emergency Ambulance immediately for rapid transit.",
            "Keep patient in recovery position; administer supplemental oxygen if available at Sub-Centre.",
            "Alert Emergency Medical Officer at receiving District Hospital."
        ])
        teleconsult_recommended = False
        clinical_notes = f"Patient exhibits red flag danger criteria: {'; '.join(reasons) if reasons else 'Severe acute distress'}."

    elif is_yellow or req.severity >= 6 or req.duration_days >= 4:
        urgency = "YELLOW"
        urgency_label = "PRIORITY / CLINICAL CONSULT WITHIN 24 HOURS"
        color = "amber"
        recommended_facility = "Primary Health Centre (PHC) / Community Health Centre (CHC)"
        immediate_actions.extend([
            "Schedule assisted teleconsultation with Medical Officer today.",
            "Maintain fluid intake and monitor vitals (temperature, BP) every 4 hours.",
            "Visit nearest PHC for diagnostic workup if symptoms do not resolve within 24h."
        ])
        teleconsult_recommended = True
        clinical_notes = f"Moderate clinical urgency. Evaluation advised for: {', '.join(potential_conditions) if potential_conditions else 'symptom management'}."

    else:
        urgency = "GREEN"
        urgency_label = "ROUTINE / HOME MONITORING & SUB-CENTRE"
        color = "green"
        recommended_facility = "Ayushman Arogya Mandir (Sub-Centre) / Home Care"
        immediate_actions.extend([
            "Adequate rest, hydration, and symptomatic home care.",
            "Contact local ASHA worker or Ayushman Arogya Mandir if symptoms persist beyond 48 hours.",
            "Follow standard over-the-counter or basic prescription regimen."
        ])
        teleconsult_recommended = False
        potential_conditions.append("Self-limiting Primary Care Condition")
        clinical_notes = "Vitals and symptom score are within mild thresholds. Home care and community follow-up recommended."

    return {
        "urgency": urgency,
        "urgency_label": urgency_label,
        "color": color,
        "recommended_facility": recommended_facility,
        "immediate_actions": list(dict.fromkeys(immediate_actions)),
        "teleconsult_recommended": teleconsult_recommended,
        "potential_conditions": list(dict.fromkeys(potential_conditions)),
        "severity_score": req.severity,
        "clinical_notes": clinical_notes,
        "triage_summary": f"{urgency} tier triage: Recommend {recommended_facility}."
    }

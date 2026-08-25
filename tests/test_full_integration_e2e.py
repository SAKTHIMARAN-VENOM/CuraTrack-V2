import pytest

def test_full_patient_journey_triage_referral_scheme(client):
    """
    Comprehensive End-to-End Integration Flow:
    1. Digital Emergency Self-Triage Assessment
    2. Inter-facility Emergency Referral Creation
    3. Destination Facility Bed & Metrics Check
    4. Government Schemes & Empanelled Hospital Verification
    5. Cashless Pre-Authorization Claim Submission
    """
    # 1. Digital Emergency Self-Triage
    triage_payload = {
        "patient_id": "PAT-E2E-99",
        "patient_name": "Ramesh Patil",
        "age": 52,
        "gender": "Male",
        "symptoms": ["Chest Pain", "Shortness of Breath", "Diaphoresis"],
        "red_flags": ["Chest pressure radiating to left arm", "Severe sweating"],
        "severity": 4,
        "duration_days": 1,
        "spo2": 94.0,
        "heart_rate": 96.0,
        "systolic_bp": 155.0,
        "diastolic_bp": 98.0
    }
    triage_res = client.post("/api/triage/self-assess", json=triage_payload)
    assert triage_res.status_code == 200
    triage_data = triage_res.json()
    assert "urgency" in triage_data
    assert triage_data["urgency"] in ("RED", "YELLOW", "GREEN")
    assert "id" in triage_data or "triage_id" in triage_data

    # 2. Inter-facility Referral Creation
    referral_payload = {
        "patient_id": "PAT-E2E-99",
        "patient_name": "Ramesh Patil",
        "patient_age": 52,
        "patient_gender": "Male",
        "referring_facility_type": "Primary Health Centre (PHC)",
        "referring_facility_name": "PHC Nandurbar Rural",
        "referring_doctor_name": "Dr. Ananya Sharma",
        "destination_facility_type": "District Hospital",
        "destination_facility_name": "Nandurbar District Civil Hospital",
        "specialty": "Cardiology & Emergency Critical Care",
        "urgency": "EMERGENCY",
        "clinical_reason": "Acute Coronary Syndrome suspicion from digital self-triage",
        "provisional_diagnosis": "Suspected NSTEMI / Unstable Angina",
        "vitals_summary": "BP: 155/98 mmHg, HR: 96, SpO2: 94%"
    }
    ref_res = client.post("/api/referrals/create", json=referral_payload)
    assert ref_res.status_code == 200
    ref_data = ref_res.json()
    assert ref_data["success"] is True
    assert "referral" in ref_data
    ref_id = ref_data["referral"]["id"]

    # 3. Check Facility Operations & Bed Availability
    facility_res = client.get("/api/facility/stats")
    assert facility_res.status_code == 200
    fac_data = facility_res.json()
    assert "beds" in fac_data
    assert fac_data["beds"]["available"] > 0

    # 4. Verify Empanelled Hospital under Government Schemes
    verify_payload = {
        "hospital_name": "Nandurbar District Civil Hospital",
        "scheme_id": "gov_ayushman",
        "patient_id": "PAT-123"
    }
    verify_res = client.post("/api/government-schemes/verify-hospital", json=verify_payload)
    assert verify_res.status_code == 200
    verify_data = verify_res.json()
    assert verify_data["is_empanelled"] is True
    assert "Ayushman Bharat" in str(verify_data["matched_schemes"])

    # 5. File Cashless Pre-Authorization Claim
    claim_payload = {
        "schemeId": "gov_ayushman",
        "schemeName": "Ayushman Bharat – PMJAY",
        "recommendationReason": "Emergency Inpatient Admission for ACS",
        "amount": 100000
    }
    claim_res = client.post("/api/patient/PAT-E2E-99/claims", json=claim_payload)
    assert claim_res.status_code == 200
    claim_data = claim_res.json()
    assert claim_data["status"] == "success"
    assert "claimId" in claim_data

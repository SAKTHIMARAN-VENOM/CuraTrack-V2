import pytest

def test_triage_symptom_taxonomy(client):
    """Verify triage taxonomy returns categorized symptoms and red flags."""
    response = client.get("/api/triage/symptoms")
    assert response.status_code == 200
    data = response.json()
    assert "categories" in data
    assert "red_flags" in data
    assert "Respiratory" in data["categories"]
    assert "Cardiovascular" in data["categories"]
    assert len(data["red_flags"]) > 0


def test_triage_emergency_red_flag(client):
    """Verify acute danger signs trigger RED emergency tier with 108 ambulance recommendation."""
    payload = {
        "patient_name": "Emergency Patient",
        "age": 48,
        "symptoms": ["Chest pain / Heavy pressure"],
        "severity": 9,
        "duration_days": 1,
        "red_flags": ["Severe central chest pain radiating to left arm or jaw"],
        "spo2": 91,
        "systolic_bp": 185
    }
    response = client.post("/api/triage/assess", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["urgency"] == "RED"
    assert "108 Emergency Ambulance" in " ".join(data["immediate_actions"])
    assert "District Hospital" in data["recommended_facility"]


def test_triage_priority_yellow(client):
    """Verify moderate severity triggers YELLOW priority tier for PHC/CHC consult within 24h."""
    payload = {
        "patient_name": "Priority Patient",
        "age": 30,
        "symptoms": ["Acute Diarrhea (> 3 episodes/day)", "Persistent nausea / vomiting"],
        "severity": 6,
        "duration_days": 3,
        "red_flags": [],
        "spo2": 96,
        "systolic_bp": 122
    }
    response = client.post("/api/triage/assess", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["urgency"] == "YELLOW"
    assert data["teleconsult_recommended"] is True
    assert "PHC" in data["recommended_facility"] or "CHC" in data["recommended_facility"]


def test_triage_routine_green(client):
    """Verify mild self-limiting symptoms trigger GREEN routine tier for Sub-Centre / Home monitoring."""
    payload = {
        "patient_name": "Routine Patient",
        "age": 22,
        "symptoms": ["Nasal congestion & runny nose"],
        "severity": 2,
        "duration_days": 1,
        "red_flags": [],
        "spo2": 99,
        "systolic_bp": 118
    }
    response = client.post("/api/triage/assess", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["urgency"] == "GREEN"
    assert "Ayushman Arogya Mandir" in data["recommended_facility"] or "Home Care" in data["recommended_facility"]


def test_referral_creation_and_listing(client):
    """Verify referral creation and retrieval through the public health referral pipeline."""
    create_payload = {
        "patient_id": "test-patient-ref",
        "patient_name": "Kailash Chand",
        "patient_age": 52,
        "patient_gender": "Male",
        "referring_doctor_name": "Dr. Medical Officer",
        "referring_facility_type": "Primary Health Centre (PHC)",
        "referring_facility_name": "PHC Nandurbar Rural",
        "destination_facility_type": "District Hospital",
        "destination_facility_name": "Nandurbar Civil Hospital",
        "specialty": "Cardiology",
        "urgency": "URGENT",
        "clinical_reason": "Borderline ischemic ECG changes on exertion",
        "provisional_diagnosis": "Suspected Angina",
        "vitals_summary": "BP: 140/90, HR: 80, SpO2: 97%"
    }
    create_res = client.post("/api/referrals/create", json=create_payload)
    assert create_res.status_code == 200
    created_data = create_res.json()
    assert created_data["success"] is True
    assert "referral" in created_data
    ref_id = created_data["referral"]["id"]
    assert ref_id.startswith("REF-")

    # Verify listing
    list_res = client.get("/api/referrals")
    assert list_res.status_code == 200
    list_data = list_res.json()
    assert list_data["count"] > 0
    matching = [r for r in list_data["referrals"] if r["id"] == ref_id]
    assert len(matching) == 1


def test_referral_lifecycle_status_update(client):
    """Verify advancing referral status from CREATED -> ACCEPTED -> IN_TRANSIT -> COMPLETED."""
    # Create referral first
    create_payload = {
        "patient_id": "test-lifecycle-patient",
        "patient_name": "Meena Kumari",
        "patient_age": 28,
        "patient_gender": "Female",
        "referring_doctor_name": "Dr. Primary Doctor",
        "referring_facility_type": "PHC",
        "referring_facility_name": "PHC North",
        "destination_facility_type": "District Hospital",
        "destination_facility_name": "District Hospital Central",
        "specialty": "OBGYN",
        "urgency": "EMERGENCY",
        "clinical_reason": "High-risk pregnancy delivery evaluation",
        "provisional_diagnosis": "Preeclampsia"
    }
    create_res = client.post("/api/referrals/create", json=create_payload)
    ref_id = create_res.json()["referral"]["id"]

    # Update to ACCEPTED
    update_res = client.post(f"/api/referrals/{ref_id}/status", json={"status": "ACCEPTED", "notes": "Bed reserved"})
    assert update_res.status_code == 200
    assert update_res.json()["referral"]["status"] == "ACCEPTED"

    # Update to IN_TRANSIT
    transit_res = client.post(f"/api/referrals/{ref_id}/status", json={"status": "IN_TRANSIT", "notes": "108 ambulance dispatched"})
    assert transit_res.status_code == 200
    assert transit_res.json()["referral"]["status"] == "IN_TRANSIT"

    # Update to COMPLETED
    complete_res = client.post(f"/api/referrals/{ref_id}/status", json={"status": "COMPLETED", "notes": "Consultation done"})
    assert complete_res.status_code == 200
    assert complete_res.json()["referral"]["status"] == "COMPLETED"
    assert len(complete_res.json()["referral"]["timeline"]) >= 4


def test_referral_history_filter_completed_exclusion(client):
    """Verify default/ALL listing excludes COMPLETED referrals, while COMPLETED/HISTORY filter returns them."""
    # Active pipeline (ALL or default)
    active_res = client.get("/api/referrals")
    assert active_res.status_code == 200
    active_data = active_res.json()
    assert all(r["status"] != "COMPLETED" for r in active_data["referrals"])

    # Completed history filter
    history_res = client.get("/api/referrals?status=COMPLETED")
    assert history_res.status_code == 200
    history_data = history_res.json()
    assert history_data["count"] > 0
    assert all(r["status"] == "COMPLETED" for r in history_data["referrals"])

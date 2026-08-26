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


def test_patient_emergency_self_triage_flow(client):
    """Verify patient emergency self-assessment, severity notification routing, and doctor queue listing."""
    # 1. Critical RED emergency self-assessment
    red_payload = {
        "patient_id": "test-patient-self-99",
        "patient_name": "Rohan Sharma",
        "age": 45,
        "gender": "Male",
        "symptoms": ["Chest pain / Heavy pressure"],
        "red_flags": ["Severe central chest pain radiating to left arm or jaw"],
        "severity": 9,
        "duration_days": 1,
        "spo2": 90,
        "systolic_bp": 185,
        "notes": "Crushing chest pain radiating to left arm since 30 mins"
    }
    red_res = client.post("/api/triage/self-assess", json=red_payload)
    assert red_res.status_code == 200
    red_data = red_res.json()
    assert red_data["urgency"] == "RED"
    assert red_data["consult_action"] == "VISIT_EMERGENCY"
    assert any("Emergency Medical Officer" in p for p in red_data["notified_parties"])
    assessment_id = red_data["id"]

    # 2. Priority YELLOW self-assessment
    yellow_payload = {
        "patient_id": "test-patient-self-100",
        "patient_name": "Geeta Bai",
        "age": 35,
        "gender": "Female",
        "symptoms": ["Acute Diarrhea (> 3 episodes/day)"],
        "severity": 6,
        "duration_days": 2,
        "spo2": 97
    }
    yellow_res = client.post("/api/triage/self-assess", json=yellow_payload)
    assert yellow_res.status_code == 200
    yellow_data = yellow_res.json()
    assert yellow_data["urgency"] == "YELLOW"
    assert yellow_data["consult_action"] == "ONLINE_CONSULTATION"
    assert yellow_data["teleconsult_recommended"] is True

    # 3. Doctor retrieves self-assessments list
    list_res = client.get("/api/triage/self-assessments")
    assert list_res.status_code == 200
    list_data = list_res.json()
    assert list_data["total"] > 0
    assert list_data["emergency_count"] >= 1

    # 4. Doctor acknowledges and resolves the alert
    ack_res = client.patch(f"/api/triage/self-assessments/{assessment_id}/status", json={"status": "ACKNOWLEDGED", "acknowledged_by": "Dr. David Ross"})
    assert ack_res.status_code == 200
    assert ack_res.json()["assessment"]["status"] == "ACKNOWLEDGED"

    resolve_res = client.patch(f"/api/triage/self-assessments/{assessment_id}/status", json={"status": "RESOLVED", "acknowledged_by": "Dr. David Ross"})
    assert resolve_res.status_code == 200
    assert resolve_res.json()["assessment"]["status"] == "RESOLVED"



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


def test_referral_patients_and_doctors_directory(client):
    """Verify patients and verified doctors directory endpoints for referral creation."""
    patients_res = client.get("/api/referrals/patients")
    assert patients_res.status_code == 200
    pdata = patients_res.json()
    assert "patients" in pdata
    assert pdata["count"] > 0
    assert any(p["name"] == "Sunita Devi" for p in pdata["patients"])

    doctors_res = client.get("/api/referrals/doctors")
    assert doctors_res.status_code == 200
    ddata = doctors_res.json()
    assert "doctors" in ddata
    assert ddata["count"] > 0
    assert any(d["role"] == "doctor" for d in ddata["doctors"])


def test_referral_role_based_access_rules(client):
    """Verify role-based referral creation: ASHA -> Doctor (allowed), Doctor -> Doctor (allowed), Patient -> Rejected (403), ASHA -> ASHA (400)."""
    # 1. ASHA Worker refers patient to Medical Officer (Allowed)
    asha_payload = {
        "patient_id": "p-204",
        "patient_name": "Sunita Devi",
        "patient_age": 27,
        "patient_gender": "Female",
        "referring_doctor_name": "Sunita Tai (ASHA)",
        "referring_role": "fhw",
        "referring_facility_type": "Ayushman Arogya Mandir (Sub-Centre)",
        "referring_facility_name": "Sub-Centre Borvihir",
        "destination_doctor_id": "doc-ananya-sharma",
        "destination_doctor_name": "Dr. Ananya Sharma (MO)",
        "destination_role": "doctor",
        "destination_facility_type": "Primary Health Centre (PHC)",
        "destination_facility_name": "PHC Nandurbar Rural",
        "specialty": "Obstetrics & Maternal Care",
        "urgency": "EMERGENCY",
        "clinical_reason": "Gestational hypertension with pedal edema",
        "provisional_diagnosis": "Preeclampsia risk",
        "created_by_role": "fhw"
    }
    asha_res = client.post("/api/referrals/create", json=asha_payload)
    assert asha_res.status_code == 200
    assert asha_res.json()["success"] is True
    assert asha_res.json()["referral"]["referring_role"] == "fhw"
    assert asha_res.json()["referral"]["destination_role"] == "doctor"

    # 2. Doctor refers patient to Super-specialist / Tertiary Hospital (Allowed)
    doc_payload = {
        "patient_id": "p-101",
        "patient_name": "Rameshwar Patel",
        "patient_age": 54,
        "patient_gender": "Male",
        "referring_doctor_name": "Dr. David Ross",
        "referring_role": "doctor",
        "referring_facility_type": "Primary Health Centre (PHC)",
        "referring_facility_name": "PHC Nandurbar Rural",
        "destination_doctor_id": "doc-vk-deshmukh",
        "destination_doctor_name": "Dr. V. K. Deshmukh",
        "destination_role": "doctor",
        "destination_facility_type": "District Hospital",
        "destination_facility_name": "Nandurbar District Civil Hospital",
        "specialty": "Cardiology",
        "urgency": "URGENT",
        "clinical_reason": "Ischemic ECG changes with persistent angina",
        "provisional_diagnosis": "Coronary Artery Disease",
        "created_by_role": "doctor"
    }
    doc_res = client.post("/api/referrals/create", json=doc_payload)
    assert doc_res.status_code == 200
    assert doc_res.json()["success"] is True

    # 3. Patient attempts to generate clinical referral pass (Forbidden 403)
    patient_payload = {
        "patient_id": "p-101",
        "patient_name": "Rameshwar Patel",
        "patient_age": 54,
        "patient_gender": "Male",
        "referring_facility_type": "Home",
        "referring_facility_name": "Home Self-Referral",
        "destination_facility_type": "District Hospital",
        "destination_facility_name": "Nandurbar District Civil Hospital",
        "specialty": "Cardiology",
        "urgency": "ROUTINE",
        "clinical_reason": "Self-referral request",
        "provisional_diagnosis": "Chest discomfort",
        "created_by_role": "patient"
    }
    patient_res = client.post("/api/referrals/create", json=patient_payload)
    assert patient_res.status_code == 403
    assert "not authorized" in patient_res.json()["detail"].lower()

    # 4. ASHA worker attempts to refer to another ASHA / non-doctor (Rejected 400)
    invalid_asha_payload = {
        "patient_id": "p-204",
        "patient_name": "Sunita Devi",
        "patient_age": 27,
        "patient_gender": "Female",
        "referring_facility_name": "Sub-Centre Borvihir",
        "destination_facility_name": "Sub-Centre Dongargaon",
        "destination_role": "fhw",
        "specialty": "Maternal Care",
        "clinical_reason": "Transfer to another ASHA",
        "provisional_diagnosis": "ANC visit",
        "created_by_role": "fhw"
    }
    invalid_res = client.post("/api/referrals/create", json=invalid_asha_payload)
    assert invalid_res.status_code == 400
    assert "role hierarchy violation" in invalid_res.json()["detail"].lower()


def test_doctor_referral_privacy_and_access_control(client):
    """
    Verify doctor privacy and access control:
    1. A doctor only sees patient referrals specifically addressed to them.
    2. No other doctor can view another doctor's incoming patient details.
    3. Only the assigned destination doctor can accept and manage the referral.
    """
    # 1. Create Referral A for Dr. David Ross
    ref_a_payload = {
        "patient_id": "p-101",
        "patient_name": "Rameshwar Patel (Dr Ross Patient)",
        "patient_age": 54,
        "patient_gender": "Male",
        "referring_doctor_name": "Sunita Tai (ASHA)",
        "referring_role": "fhw",
        "referring_facility_type": "Sub-Centre",
        "referring_facility_name": "Sub-Centre Borvihir",
        "destination_doctor_id": "doc-david-ross",
        "destination_doctor_name": "Dr. David Ross",
        "destination_role": "doctor",
        "destination_facility_type": "Primary Health Centre (PHC)",
        "destination_facility_name": "PHC Nandurbar Rural",
        "specialty": "General Medicine",
        "urgency": "URGENT",
        "clinical_reason": "Severe exertional chest pain",
        "provisional_diagnosis": "Unstable Angina",
        "created_by_role": "fhw"
    }
    res_a = client.post("/api/referrals/create", json=ref_a_payload)
    assert res_a.status_code == 200
    ref_a_id = res_a.json()["referral"]["id"]

    # 2. Create Referral B for Dr. Priya Nair
    ref_b_payload = {
        "patient_id": "p-204",
        "patient_name": "Sunita Devi (Dr Priya Patient)",
        "patient_age": 27,
        "patient_gender": "Female",
        "referring_doctor_name": "Rekha ANM",
        "referring_role": "fhw",
        "referring_facility_type": "Sub-Centre",
        "referring_facility_name": "Sub-Centre Dhanora",
        "destination_doctor_id": "doc-priya-nair",
        "destination_doctor_name": "Dr. Priya Nair",
        "destination_role": "doctor",
        "destination_facility_type": "Community Health Centre (CHC)",
        "destination_facility_name": "CHC Shahada Block",
        "specialty": "Obstetrics & Gynecology",
        "urgency": "EMERGENCY",
        "clinical_reason": "Eclampsia risk",
        "provisional_diagnosis": "Severe Preeclampsia",
        "created_by_role": "fhw"
    }
    res_b = client.post("/api/referrals/create", json=ref_b_payload)
    assert res_b.status_code == 200
    ref_b_id = res_b.json()["referral"]["id"]

    # 3. Query as Dr. David Ross -> Must see Ref A, but NOT Ref B
    ross_res = client.get("/api/referrals?doctor_id=doc-david-ross&doctor_name=Dr.+David+Ross")
    assert ross_res.status_code == 200
    ross_ids = [r["id"] for r in ross_res.json()["referrals"]]
    assert ref_a_id in ross_ids
    assert ref_b_id not in ross_ids

    # 4. Query as Dr. Priya Nair -> Must see Ref B, but NOT Ref A
    priya_res = client.get("/api/referrals?doctor_id=doc-priya-nair&doctor_name=Dr.+Priya+Nair")
    assert priya_res.status_code == 200
    priya_ids = [r["id"] for r in priya_res.json()["referrals"]]
    assert ref_b_id in priya_ids
    assert ref_a_id not in priya_ids

    # 5. Unauthorized Doctor (Dr. Sarah Jenkins) attempts to access Dr. David Ross's patient details (403 Forbidden)
    unauth_detail = client.get(f"/api/referrals/{ref_a_id}?doctor_id=doc-sarah-jenkins&doctor_name=Dr.+Sarah+Jenkins")
    assert unauth_detail.status_code == 403
    assert "access denied" in unauth_detail.json()["detail"].lower()

    # 6. Unauthorized Doctor (Dr. Sarah Jenkins) attempts to accept Dr. David Ross's referral (403 Forbidden)
    unauth_accept = client.post(f"/api/referrals/{ref_a_id}/status", json={
        "status": "ACCEPTED",
        "actor_role": "doctor",
        "doctor_id": "doc-sarah-jenkins",
        "doctor_name": "Dr. Sarah Jenkins",
        "notes": "Unauthorized attempt to accept Dr Ross referral"
    })
    assert unauth_accept.status_code == 403
    assert "access denied" in unauth_accept.json()["detail"].lower()

    # 7. Assigned Doctor (Dr. David Ross) accepts his own referral -> Succeeded 200 OK
    auth_accept = client.post(f"/api/referrals/{ref_a_id}/status", json={
        "status": "ACCEPTED",
        "actor_role": "doctor",
        "doctor_id": "doc-david-ross",
        "doctor_name": "Dr. David Ross",
        "notes": "Accepted into Nandurbar PHC OPD queue"
    })
    assert auth_accept.status_code == 200
    assert auth_accept.json()["referral"]["status"] == "ACCEPTED"


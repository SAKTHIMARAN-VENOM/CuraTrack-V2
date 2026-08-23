import pytest

def test_fhw_beneficiaries_listing_and_filtering(client):
    """Verify frontline worker catchment registry returns beneficiaries and handles category/risk filters."""
    # List all
    response = client.get("/api/fhw/beneficiaries")
    assert response.status_code == 200
    data = response.json()
    assert "beneficiaries" in data
    assert data["count"] > 0
    assert "high_risk_count" in data
    assert "overdue_count" in data

    # Filter by category
    maternal_res = client.get("/api/fhw/beneficiaries?category=Maternal ANC")
    assert maternal_res.status_code == 200
    maternal_data = maternal_res.json()
    assert all(b["category"] == "Maternal ANC" for b in maternal_data["beneficiaries"])

    # Filter by risk level
    high_risk_res = client.get("/api/fhw/beneficiaries?risk_level=HIGH")
    assert high_risk_res.status_code == 200
    high_risk_data = high_risk_res.json()
    assert all(b["risk_level"] == "HIGH" for b in high_risk_data["beneficiaries"])


def test_fhw_followup_alerts(client):
    """Verify overdue tasks, scheduled home visits, and catchment summary."""
    response = client.get("/api/fhw/followups")
    assert response.status_code == 200
    data = response.json()
    assert "overdue_tasks" in data
    assert "upcoming_tasks" in data
    assert "summary" in data
    assert data["summary"]["total_assigned"] > 0
    assert "urgent_home_visits_needed" in data["summary"]


def test_fhw_register_beneficiary(client):
    """Verify enrolling a new rural beneficiary into the ASHA catchment records."""
    payload = {
        "name": "Savita Patil",
        "age": 29,
        "gender": "Female",
        "category": "Maternal ANC",
        "risk_level": "HIGH",
        "village_name": "Dongargaon Pada 2",
        "contact_phone": "+91 98901 22334",
        "guardian_name": "Deepak Patil",
        "next_due_date": "2026-08-30",
        "next_due_service": "ANC-2 Ultrasound & Blood Grouping",
        "notes": "Twin pregnancy (high risk)"
    }
    response = client.post("/api/fhw/register-beneficiary", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "beneficiary" in data
    assert data["beneficiary"]["name"] == "Savita Patil"
    assert data["beneficiary"]["id"].startswith("BEN-")


def test_fhw_assisted_teleconsult_initiation(client):
    """Verify ASHA tablet assisted teleconsultation generates WebRTC call room with vitals snapshot."""
    payload = {
        "beneficiary_id": "BEN-101",
        "beneficiary_name": "Kavita Bai",
        "asha_name": "Sunita Tai (ASHA #402)",
        "village_name": "Borvihir Pada",
        "specialist_type": "Obstetrician / Gynaecologist",
        "chief_complaint": "Severe fatigue, dizziness, and low hemoglobin during 32nd gestational week.",
        "systolic_bp": 142,
        "diastolic_bp": 92,
        "spo2": 97,
        "heart_rate": 84,
        "random_glucose": 138
    }
    response = client.post("/api/fhw/assisted-consult", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "room_id" in data
    assert data["room_id"].startswith("fhw-teleconsult-")
    assert "vitals_snapshot" in data
    assert data["vitals_snapshot"]["bp"] == "142/92 mmHg"
    assert data["vitals_snapshot"]["spo2"] == "97%"
    assert data["status"] == "CONNECTING"

import pytest

def test_vitals_check_normal(client):
    """Verify normal vitals trigger no critical or emergency alerts."""
    payload = {
        "patient_id": "test-patient-normal",
        "heart_rate": 72,
        "spo2": 98,
        "systolic_bp": 120,
        "diastolic_bp": 80,
        "temperature": 37.0,
    }
    response = client.post("/api/alerts/vitals-check", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["has_critical"] is False


def test_vitals_check_emergency_hypoxemia(client):
    """Verify SpO2 < 90 triggers EMERGENCY alert priority."""
    payload = {
        "patient_id": "test-patient-emergency",
        "spo2": 88,
        "heart_rate": 75,
    }
    response = client.post("/api/alerts/vitals-check", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["has_critical"] is True
    severities = [a["severity"] for a in data["alerts"]]
    assert "EMERGENCY" in severities


def test_vitals_check_hypertensive_crisis(client):
    """Verify Systolic BP > 180 triggers CRITICAL alert."""
    payload = {
        "patient_id": "test-patient-bp",
        "systolic_bp": 190,
    }
    response = client.post("/api/alerts/vitals-check", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["has_critical"] is True
    severities = [a["severity"] for a in data["alerts"]]
    assert "CRITICAL" in severities


def test_drug_checker_validation_error(client):
    """Verify drug checker requires at least 2 medications."""
    payload = {"medications": ["Aspirin"]}
    response = client.post("/api/check-drug-interactions", json=payload)
    assert response.status_code == 422  # Validation error


def test_drug_checker_valid_pair(client):
    """Verify drug checker executes successfully for valid medication pairs."""
    payload = {"medications": ["Metformin", "Lisinopril"]}
    response = client.post("/api/check-drug-interactions", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "interactions_found" in data
    assert "pairs" in data
    assert "safe_combinations" in data

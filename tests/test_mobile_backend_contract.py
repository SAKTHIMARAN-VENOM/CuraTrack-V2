import pytest

def test_mobile_contract_vitals_check(client):
    """Verify mobile vitals check payload structure and response contract."""
    payload = {
        "patient_id": "mobile-test-user",
        "heart_rate": 82,
        "spo2": 97,
        "systolic_bp": 118,
        "diastolic_bp": 76,
    }
    response = client.post("/api/alerts/vitals-check", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "patient_id" in data
    assert "alerts" in data
    assert "alert_count" in data
    assert "has_critical" in data
    assert isinstance(data["alerts"], list)


def test_mobile_contract_drug_interactions(client):
    """Verify mobile drug checker payload contract with multiple drugs."""
    payload = {
        "medications": ["Atorvastatin", "Metformin", "Albuterol"]
    }
    response = client.post("/api/check-drug-interactions", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "interactions_found" in data
    assert "pairs" in data
    assert "safe_combinations" in data


def test_mobile_contract_insurance_schemes(client):
    """Verify mobile recommended schemes endpoint contract."""
    patient_id = "mobile-user-001"
    response = client.post(f"/api/patient/{patient_id}/insurance-schemes")
    assert response.status_code == 200
    data = response.json()
    assert "availableSchemes" in data
    assert len(data["availableSchemes"]) > 0
    first_scheme = data["availableSchemes"][0]
    assert "id" in first_scheme
    assert "name" in first_scheme
    assert "type" in first_scheme
    assert "amount" in first_scheme
    assert "match_percentage" in first_scheme


def test_mobile_contract_insurance_claim(client):
    """Verify mobile insurance claim submission and tracking ID contract."""
    patient_id = "mobile-user-001"
    payload = {
        "schemeName": "Optima Secure Comprehensive Cover",
        "recommendationReason": "User applied via CuraTrack Mobile",
        "amount": 50000
    }
    response = client.post(f"/api/patient/{patient_id}/claims", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "claimId" in data
    assert data["claimId"].startswith("CLM-")


def test_mobile_contract_passport_generation(client):
    """Verify mobile emergency passport QR token generation contract."""
    payload = {
        "userId": "mobile-user-001",
        "userName": "Sara Jenkins",
        "scope": ["vitals", "allergies", "medications", "diagnoses", "insurance"]
    }
    response = client.post("/api/passport/generate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "token" in data
    assert "qrImage" in data
    assert "passportId" in data
    assert "expiresInSeconds" in data

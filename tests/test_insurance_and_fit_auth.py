import pytest
from unittest.mock import MagicMock

def test_google_fit_auth_url(client):
    """Verify Google Fit OAuth authorization URL generator."""
    response = client.get("/api/fit/auth-url")
    assert response.status_code == 200
    data = response.json()
    assert "url" in data
    url = data["url"]
    assert "accounts.google.com" in url
    assert "client_id=" in url
    assert "response_type=code" in url
    assert "fitness.heart_rate.read" in url
    assert "fitness.activity.read" in url
    assert "fitness.sleep.read" in url


def test_google_fit_callback_with_error(client):
    """Verify Google Fit callback handles error parameter gracefully."""
    response = client.get("/api/fit/callback?error=access_denied")
    assert response.status_code == 200
    assert "Google Fit Authorization Failed" in response.text


def test_google_fit_callback_without_code(client):
    """Verify Google Fit callback handles missing code parameter."""
    response = client.get("/api/fit/callback")
    assert response.status_code == 200
    assert "Google Fit Authorization Failed" in response.text


def test_google_fit_callback_success(client, monkeypatch):
    """Verify Google Fit callback handles successful OAuth authorization."""
    mock_token_resp = MagicMock()
    mock_token_resp.status_code = 200
    mock_token_resp.json.return_value = {
        "access_token": "ya29.mock_token_abc123",
        "expires_in": 3600,
        "token_type": "Bearer"
    }
    import requests
    monkeypatch.setattr(requests, "post", lambda *args, **kwargs: mock_token_resp)

    response = client.get("/api/fit/callback?code=mock_authorization_code_456")
    assert response.status_code == 200
    assert "Google Fit Connected" in response.text
    assert "curatrackmobile://" in response.text


def test_insurance_eligibility_active_premium_consultation(client):
    """Verify FHIR insurance eligibility check for consultation under active premium plan."""
    payload = {
        "patientId": "PAT-101",
        "insuranceId": "INS-123",
        "service": "consultation"
    }
    response = client.post("/api/insurance/eligibility", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["resourceType"] == "CoverageEligibilityResponse"
    assert data["eligible"] is True
    assert data["status"] == "active"
    assert data["outcome"] == "complete"
    assert data["coverageLevel"] == "full"
    assert data["details"]["insurancePays"] == "500"
    assert data["details"]["youPay"] == "0"


def test_insurance_eligibility_active_premium_lab_test(client):
    """Verify FHIR insurance eligibility check for lab test with partial co-pay."""
    payload = {
        "patientId": "PAT-101",
        "insuranceId": "INS-123",
        "service": "lab_test"
    }
    response = client.post("/api/insurance/eligibility", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["eligible"] is True
    assert data["coverageLevel"] == "partial"
    assert data["details"]["insurancePays"] == "1,200"
    assert data["details"]["youPay"] == "800"


def test_insurance_eligibility_active_premium_surgery(client):
    """Verify surgery coverage under premium plan."""
    payload = {
        "patientId": "PAT-101",
        "insuranceId": "INS-123",
        "service": "surgery"
    }
    response = client.post("/api/insurance/eligibility", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["eligible"] is True
    assert data["coverageLevel"] == "partial"
    assert data["details"]["insurancePays"] == "15,000"
    assert data["details"]["youPay"] == "5,000"


def test_insurance_eligibility_standard_plan_surgery_excluded(client):
    """Verify standard plan correctly excludes surgery."""
    payload = {
        "patientId": "PAT-102",
        "insuranceId": "INS-456",
        "service": "surgery"
    }
    response = client.post("/api/insurance/eligibility", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["eligible"] is False
    assert data["coverageLevel"] == "none"
    assert "not covered" in data["message"]


def test_insurance_eligibility_inactive_policy(client):
    """Verify inactive policy is flagged properly with guidance suggestion."""
    payload = {
        "patientId": "PAT-103",
        "insuranceId": "INS-789",
        "service": "consultation"
    }
    response = client.post("/api/insurance/eligibility", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["eligible"] is False
    assert data["status"] == "inactive"
    assert data["coverageLevel"] == "none"


def test_insurance_eligibility_invalid_insurance_id(client):
    """Verify unknown insurance ID returns error status."""
    payload = {
        "patientId": "PAT-104",
        "insuranceId": "INVALID-INS-999",
        "service": "consultation"
    }
    response = client.post("/api/insurance/eligibility", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["eligible"] is False
    assert data["status"] == "error"
    assert data["coverageLevel"] == "none"


def test_patient_recommended_insurance_schemes(client):
    """Verify AI recommended health insurance schemes endpoint."""
    response = client.post("/api/patient/PAT-123/insurance-schemes")
    assert response.status_code == 200
    data = response.json()
    assert "availableSchemes" in data
    schemes = data["availableSchemes"]
    assert len(schemes) >= 3
    for scheme in schemes:
        assert "id" in scheme
        assert "name" in scheme
        assert "type" in scheme
        assert "match_percentage" in scheme
        assert "amount" in scheme
        assert scheme["match_percentage"] > 50


def test_patient_claims_submission_custom_amount(client):
    """Verify insurance claim submission with custom claim amount."""
    payload = {
        "schemeName": "Optima Secure Comprehensive Cover",
        "recommendationReason": "Post-cardiac rehabilitation cover",
        "amount": 75000
    }
    response = client.post("/api/patient/PAT-123/claims", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "claimId" in data
    assert data["claimId"].startswith("CLM-")
    assert data["amount"] == 75000


def test_patient_claims_submission_default_amount(client):
    """Verify insurance claim submission fallback default amount."""
    payload = {
        "schemeName": "Star Cardiac & Vital Care Shield",
        "recommendationReason": "Routine checkup"
    }
    response = client.post("/api/patient/PAT-123/claims", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["claimId"].startswith("CLM-")
    assert data["amount"] == 50000


def test_patient_insurance_profile_fetch(client):
    """Verify patient insurance coverage profile fetch."""
    response = client.post("/api/patient/PAT-123/insurance")
    assert response.status_code == 200
    data = response.json()
    assert data["insuranceId"] == "INS-123"
    assert data["status"] == "active"
    assert "Mock Health Insurance Corp" in data["provider"]


def test_asha_assisted_scheme_enrolment(client):
    """Verify ASHA worker assisted scheme enrolment on behalf of rural beneficiary."""
    payload = {
        "schemeId": "gov_pmmvy",
        "schemeName": "Pradhan Mantri Matru Vandana Yojana (PMMVY)",
        "recommendationReason": "Maternal ANC Nutrition and Delivery Installment Benefit",
        "amount": 6000,
        "patientName": "Kavita Bai",
        "beneficiaryId": "BEN-101",
        "assignedAsha": "Sunita Tai (ASHA #402)"
    }
    response = client.post("/api/patient/BEN-101/claims", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "Kavita Bai" in data["message"]
    assert "Sunita Tai (ASHA #402)" in data["message"]
    assert data["patientName"] == "Kavita Bai"
    assert data["claimId"].startswith("CLM-")


def test_dynamic_government_scheme_evaluation_maternal_beneficiary(client):
    """Verify dynamic evaluation returns maternal schemes for Maternal ANC beneficiary."""
    response = client.get("/api/patient/BEN-101/government-schemes")
    assert response.status_code == 200
    data = response.json()
    assert "schemes" in data
    scheme_names = [s["schemeName"] for s in data["schemes"]]
    assert any("Matru Vandana" in s or "Janani Suraksha" in s or "PM-JAY" in s for s in scheme_names)


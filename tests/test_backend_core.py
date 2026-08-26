import pytest

def test_health_check_root(client):
    """Verify backend health check returns status 200 and expected version."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "CuraTrack Backend API Running" in data.get("message", "")
    assert "version" in data


def test_health_risks_current_month(client):
    """Verify seasonal health risks endpoint returns valid outbreak list."""
    response = client.get("/api/health-risks")
    assert response.status_code == 200
    data = response.json()
    assert "month_number" in data
    assert "season" in data
    assert "risks" in data
    assert isinstance(data["risks"], list)
    assert len(data["risks"]) > 0
    # Check risk structure
    first_risk = data["risks"][0]
    assert "disease" in first_risk
    assert "risk" in first_risk
    assert "symptoms" in first_risk


def test_health_risks_all_months(client):
    """Verify all 12-month outbreak calendar endpoint returns 12 months."""
    response = client.get("/api/health-risks/all-months")
    assert response.status_code == 200
    data = response.json()
    assert data.get("total_months") == 12
    assert len(data.get("calendar", [])) == 12


def test_sdoh_calculation_low_risk(client):
    """Verify SDOH calculation accurately computes low-risk score."""
    payload = {
        "patient_id": "test-patient-low",
        "income_band": 0,
        "food_security": 0,
        "hospital_distance": 0,
        "employment": 0,
        "health_literacy": 0,
    }
    response = client.post("/api/sdoh/calculate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["score"] == 0
    assert data["risk_level"] == "LOW"
    assert data["risk_color"] == "green"


def test_sdoh_calculation_high_risk(client):
    """Verify SDOH calculation accurately flags high-risk patients."""
    payload = {
        "patient_id": "test-patient-high",
        "income_band": 3,
        "food_security": 3,
        "hospital_distance": 3,
        "employment": 2,
        "health_literacy": 3,
    }
    response = client.post("/api/sdoh/calculate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["score"] == 14
    assert data["risk_level"] == "HIGH"
    assert data["risk_color"] == "red"
    assert len(data["recommendations"]) > 0


def test_government_schemes_eligibility(client):
    """Verify rule-based Government Schemes eligibility engine."""
    payload = {"patientId": "PAT-123"}
    response = client.post("/api/government-schemes/eligibility", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "eligibleSchemes" in data
    assert isinstance(data["eligibleSchemes"], list)


def test_activity_fit_data(client):
    """Verify activity/fit data baseline route."""
    response = client.get("/api/fit-data")
    assert response.status_code == 200
    data = response.json()
    assert "steps" in data
    assert "goal" in data


def test_government_schemes_hospitals_listing(client):
    """Verify search and listing of hospitals and diagnostic centres under government schemes."""
    response = client.get("/api/government-schemes/hospitals")
    assert response.status_code == 200
    data = response.json()
    assert "total" in data
    assert "facilities" in data
    assert len(data["facilities"]) > 0
    first = data["facilities"][0]
    assert "name" in first
    assert "facility_type" in first
    assert "empanelment_status" in first
    assert "empanelled_schemes" in first
    assert "covered_diagnostic_tests" in first


def test_government_schemes_hospitals_filtering(client):
    """Verify filtering by state and facility_type (Diagnostic Centres)."""
    response = client.get("/api/government-schemes/hospitals?state=Maharashtra&facility_type=DIAGNOSTIC_CENTRE")
    assert response.status_code == 200
    data = response.json()
    assert len(data["facilities"]) > 0
    for fac in data["facilities"]:
        assert fac["state"] == "Maharashtra"
        assert fac["facility_type"] == "DIAGNOSTIC_CENTRE"


def test_verify_hospital_empanelment_active(client):
    """Verify checking an empanelled hospital returns active status, covered procedures, and docs."""
    payload = {
        "hospital_name": "Nandurbar Sub-District Civil Hospital",
        "scheme_id": "gov_ayushman",
        "patient_id": "PAT-123"
    }
    response = client.post("/api/government-schemes/verify-hospital", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["is_empanelled"] is True
    assert data["empanelment_status"] == "EMPANELLED_ACTIVE"
    assert "Ayushman Bharat" in str(data["matched_schemes"])
    assert len(data["covered_diagnostics"]) > 0
    assert len(data["required_documents"]) > 0
    assert "pre_authorization_available" in data
    assert data["pre_authorization_available"] is True


def test_verify_hospital_not_empanelled(client):
    """Verify checking an unknown private clinic flags not empanelled."""
    payload = {
        "hospital_name": "NonExistent Private Cosmetic Clinic",
        "patient_id": "PAT-123"
    }
    response = client.post("/api/government-schemes/verify-hospital", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["is_empanelled"] is False
    assert data["empanelment_status"] == "NOT_EMPANELLED"
    assert data["pre_authorization_available"] is False


def test_government_schemes_filters_metadata(client):
    """Verify metadata endpoint returns states, districts, schemes, and facility types."""
    response = client.get("/api/government-schemes/filters")
    assert response.status_code == 200
    data = response.json()
    assert "states" in data
    assert "districts" in data
    assert "schemes" in data
    assert "facility_types" in data
    assert len(data["states"]) >= 10
    assert len(data["facility_types"]) > 0


def test_cghs_dataset_integration_and_search(client):
    """Verify full CGHS dataset of 2,500+ facilities is loaded, searchable, and verifiable."""
    # 1. Check total count includes full CGHS dataset
    res = client.get("/api/government-schemes/hospitals?limit=10")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 2500

    # 2. Search for a specific CGHS empaneled hospital from the dataset
    search_res = client.get("/api/government-schemes/hospitals?q=Arunodaya")
    assert search_res.status_code == 200
    sdata = search_res.json()
    assert sdata["total"] >= 1
    assert "Arunodaya" in sdata["facilities"][0]["name"]

    # 3. Verify specific CGHS hospital empanelment
    verify_res = client.post(
        "/api/government-schemes/verify-hospital",
        json={"hospital_name": "Puru Eye Hospital", "patient_id": "PAT-123"}
    )
    assert verify_res.status_code == 200
    vdata = verify_res.json()
    assert vdata["is_empanelled"] is True
    assert vdata["empanelment_status"] == "EMPANELLED_ACTIVE"
    assert "Central Government Health Scheme (CGHS)" in vdata["matched_schemes"]


def test_government_schemes_api_status(client):
    """Verify health and connectivity check for Data.gov.in API."""
    response = client.get("/api/government-schemes/api-status")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "resource_id" in data
    assert data["resource_id"] == "de59e770-2333-4eaf-9088-a3643de040c8"
    assert data["local_dataset_records"] >= 2500


def test_patient_government_schemes_compatibility_route(client):
    """Verify patient profile government schemes evaluation endpoint."""
    response = client.post("/api/patient/PAT-123/government-schemes")
    assert response.status_code == 200
    data = response.json()
    assert "schemes" in data
    assert "eligibleSchemes" in data
    assert len(data["schemes"]) > 0


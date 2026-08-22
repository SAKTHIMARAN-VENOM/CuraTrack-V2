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

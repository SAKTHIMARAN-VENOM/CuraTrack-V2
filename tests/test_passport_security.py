import pytest
import time

def test_passport_generate_valid(client):
    """Verify generating a passport QR returns token, base64 image, and passportId."""
    payload = {
        "userId": "test-patient-001",
        "userName": "Test Patient",
        "scope": ["vitals", "allergies", "medications"],
    }
    response = client.post("/api/passport/generate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "token" in data
    assert "passportId" in data
    assert "qrImage" in data
    assert data["qrImage"].startswith("data:image/png;base64,")
    assert data["expiresInSeconds"] == 300


def test_passport_generate_invalid_scope(client):
    """Verify passport generation rejects invalid or unapproved scopes."""
    payload = {
        "userId": "test-patient-001",
        "userName": "Test Patient",
        "scope": ["invalid_custom_scope"],
    }
    response = client.post("/api/passport/generate", json=payload)
    assert response.status_code == 400
    assert "Invalid scope" in response.json().get("detail", "")


def test_passport_view_and_one_time_enforcement(client):
    """Verify patient passport scoped access and strict one-time access security."""
    payload = {
        "userId": "test-patient-one-time",
        "userName": "Security Test User",
        "scope": ["vitals", "medications"],
    }
    gen_res = client.post("/api/passport/generate", json=payload)
    assert gen_res.status_code == 200
    gen_data = gen_res.json()
    passport_id = gen_data["passportId"]
    token = gen_data["token"]

    # First access - should succeed
    view_res = client.get(f"/api/passport/{passport_id}?token={token}")
    assert view_res.status_code == 200
    view_data = view_res.json()
    assert "passport_id" in view_data

    # Wait out the strict 1-second grace window cache
    time.sleep(1.5)

    # Subsequent access attempt - must be blocked (401 Unauthorized / One-time expired)
    second_res = client.get(f"/api/passport/{passport_id}?token={token}")
    assert second_res.status_code == 401

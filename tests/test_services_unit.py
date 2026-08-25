import pytest
import time
from fastapi import HTTPException
from services.jwt_helper import create_passport_token, decode_passport_token
from services.redis_client import setnx_with_ttl, exists, set_key_with_ttl, get_key
from services.audit_logger import log_passport_access, log_passport_generation
from services.government_schemes import (
    PATIENT_DB,
    FACILITY_DATABASE,
    GovSchemeRequest,
    evaluate_government_schemes
)

def test_jwt_helper_create_and_decode_valid():
    """Verify JWT token creation with valid scopes and successful decoding."""
    token_dict = create_passport_token(
        patient_id="PAT-999",
        patient_name="Ananya Sharma",
        scope=["allergies", "medications", "vitals"]
    )
    assert "token" in token_dict
    assert "jti" in token_dict
    assert token_dict["expires_in_seconds"] == 300

    decoded = decode_passport_token(token_dict["token"])
    assert decoded["sub"] == "PAT-999"
    assert decoded["name"] == "Ananya Sharma"
    assert set(decoded["scope"]) == {"allergies", "medications", "vitals"}
    assert decoded["type"] == "patient_passport"
    assert decoded["jti"] == token_dict["jti"]


def test_jwt_helper_invalid_and_empty_scope():
    """Verify JWT helper rejects unsupported or empty scopes with 400 error."""
    with pytest.raises(HTTPException) as exc_empty:
        create_passport_token("PAT-1", "Name", [])
    assert exc_empty.value.status_code == 400
    assert "At least one scope" in exc_empty.value.detail

    with pytest.raises(HTTPException) as exc_invalid:
        create_passport_token("PAT-1", "Name", ["financial_records", "passwords"])
    assert exc_invalid.value.status_code == 400
    assert "Invalid scope values" in exc_invalid.value.detail


def test_jwt_helper_tampered_token():
    """Verify decoding a malformed or forged JWT raises 401."""
    with pytest.raises(HTTPException) as exc:
        decode_passport_token("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.malformed.signature")
    assert exc.value.status_code == 401
    assert "Invalid passport token" in exc.value.detail


def test_redis_fallback_storage_and_ttl():
    """Verify in-memory fallback for redis client setnx, get, and exists operations."""
    key = f"unit_test_token_{int(time.time() * 1000)}"
    
    # 1. First setnx should succeed
    first_set = setnx_with_ttl(key, "used", 60)
    assert first_set is True

    # 2. Immediate second setnx on same key must return False (already used)
    second_set = setnx_with_ttl(key, "used", 60)
    assert second_set is False

    # 3. exists and get_key check
    assert exists(key) is True
    assert get_key(key) == "used"


def test_audit_logger_recording():
    """Verify audit logger generates structured passport access & generation entries."""
    # Should execute cleanly without raising exceptions
    log_passport_generation("PAT-123", ["allergies"], "jti-001", "127.0.0.1")
    log_passport_access("PAT-123", ["allergies"], "jti-001", "192.168.1.100")


def test_government_schemes_patient_db():
    """Verify preloaded clinical patient profiles for government scheme testing."""
    assert len(PATIENT_DB) >= 3
    assert "PAT-123" in PATIENT_DB
    assert PATIENT_DB["PAT-123"]["location"] == "Tamil Nadu"


def test_government_schemes_evaluation_engine():
    """Verify full government schemes rule engine returns prioritized schemes."""
    req = GovSchemeRequest(patientId="PAT-123")
    res = evaluate_government_schemes(req)
    assert len(res.eligibleSchemes) > 0
    first_scheme = res.eligibleSchemes[0]
    assert first_scheme.eligibilityPercentage >= 70
    assert first_scheme.schemeName != ""


def test_facility_database_directory_structure():
    """Verify empanelled facilities and diagnostic imaging labs catalog."""
    assert len(FACILITY_DATABASE) >= 5
    for facility in FACILITY_DATABASE:
        assert "id" in facility
        assert "name" in facility
        assert "state" in facility
        assert "empanelled_schemes" in facility
        assert "covered_diagnostic_tests" in facility

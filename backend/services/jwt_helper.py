"""
JWT helper for Patient Passport tokens.
Uses python-jose for JWT encoding/decoding with HS256.
"""
import os
import uuid
import time
from jose import jwt, JWTError, ExpiredSignatureError
from fastapi import HTTPException

PASSPORT_SECRET = os.getenv("PASSPORT_SECRET_KEY", os.getenv("QR_SECRET_KEY", "curatrack-passport-secret-dev"))
PASSPORT_EXPIRY_SECONDS = 300  # 5 minutes
ALGORITHM = "HS256"

VALID_SCOPES = {"allergies", "medications", "insurance", "vitals", "diagnoses"}


def create_passport_token(patient_id: str, patient_name: str, scope: list[str]) -> dict:
    """
    Create a signed JWT for a Patient Passport.
    Returns dict with token string, expiry info, and jti.
    """
    # Validate scope
    invalid = set(scope) - VALID_SCOPES
    if invalid:
        raise HTTPException(status_code=400, detail=f"Invalid scope values: {list(invalid)}")
    if not scope:
        raise HTTPException(status_code=400, detail="At least one scope must be provided")

    now = int(time.time())
    jti = str(uuid.uuid4())

    payload = {
        "sub": patient_id,
        "name": patient_name,
        "scope": scope,
        "jti": jti,
        "iat": now,
        "exp": now + PASSPORT_EXPIRY_SECONDS,
        "type": "patient_passport",
    }

    token = jwt.encode(payload, PASSPORT_SECRET, algorithm=ALGORITHM)

    return {
        "token": token,
        "jti": jti,
        "expires_at": now + PASSPORT_EXPIRY_SECONDS,
        "expires_in_seconds": PASSPORT_EXPIRY_SECONDS,
    }


def decode_passport_token(token: str) -> dict:
    """
    Decode and validate a Patient Passport JWT.
    Raises HTTPException on expired/invalid tokens.
    Returns the decoded payload.
    """
    try:
        payload = jwt.decode(token, PASSPORT_SECRET, algorithms=[ALGORITHM])

        if payload.get("type") != "patient_passport":
            raise HTTPException(status_code=401, detail="Invalid token type")

        if "scope" not in payload or not isinstance(payload["scope"], list):
            raise HTTPException(status_code=400, detail="Token missing scope")

        if "jti" not in payload:
            raise HTTPException(status_code=400, detail="Token missing jti")

        return payload

    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Passport token has expired")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid passport token")

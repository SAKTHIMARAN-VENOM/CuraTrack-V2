"""
Patient Passport endpoints — secure, scoped, one-time-access medical summary.
Excludes raw patient IDs from URLs, enforces deployed FRONTEND_URL in QR codes,
stores passport metadata, and enforces strict one-time access & expiry.
"""
import os
import io
import base64
import time
import json
from fastapi import APIRouter, HTTPException, Request, Query
from pydantic import BaseModel, Field
import qrcode

from services.jwt_helper import (
    create_passport_token,
    decode_passport_token,
    PASSPORT_EXPIRY_SECONDS,
    VALID_SCOPES,
)
from services.redis_client import setnx_with_ttl, set_key_with_ttl, get_key
from services.patient_data import get_scoped_patient_data
from services.audit_logger import log_passport_access, log_passport_generation

router = APIRouter()


# ─── Request / Response Models ──────────────────────────────────────────

class PassportGenerateRequest(BaseModel):
    userId: str = Field(..., min_length=1)
    userName: str = "Patient"
    scope: list[str] = Field(..., min_length=1)


class PassportGenerateResponse(BaseModel):
    qrImage: str
    token: str
    passportId: str
    url: str
    expiresInSeconds: int
    expiresAt: int
    scope: list[str]


# ─── Generate Passport QR ──────────────────────────────────────────────

@router.post("/passport/generate", response_model=PassportGenerateResponse)
def generate_passport_qr(request: PassportGenerateRequest, http_request: Request):
    """
    Generate a scoped Patient Passport QR code.
    Encodes a JWT with patient_id, scope, jti (secure random passport ID) and 5-min expiry.
    Encodes deployed frontend URL: https://<FRONTEND_URL>/passport/<passport_id>?token=<token>
    Returns base64-encoded QR PNG + metadata.
    """
    # Validate scope
    invalid = set(request.scope) - VALID_SCOPES
    if invalid:
        raise HTTPException(status_code=400, detail=f"Invalid scope: {list(invalid)}")
    if not request.scope:
        raise HTTPException(status_code=400, detail="At least one scope required")

    token_data = create_passport_token(
        patient_id=request.userId,
        patient_name=request.userName,
        scope=request.scope,
    )

    passport_id = token_data["jti"]
    token = token_data["token"]
    expires_at = token_data["expires_at"]

    # Store passport metadata in Redis / key-value store (TTL = 5 minutes)
    meta = {
        "passport_id": passport_id,
        "token": token,
        "patient_id": request.userId,
        "patient_name": request.userName,
        "scope": request.scope,
        "created_at": int(time.time()),
        "expires_at": expires_at,
    }
    set_key_with_ttl(f"passport:meta:{passport_id}", json.dumps(meta), PASSPORT_EXPIRY_SECONDS)

    # Build QR code with the deployed frontend passport URL (supports both portals dynamically)
    origin_header = http_request.headers.get("origin") or http_request.headers.get("referer")
    if origin_header:
        frontend_url = origin_header.split("/passport")[0].split("/api")[0].rstrip("/")
    else:
        frontend_url = os.getenv("FRONTEND_URL", "https://moblie-ui-curatrack.vercel.app").rstrip("/")
    
    passport_url = f"{frontend_url}/passport/{passport_id}?token={token}"

    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(passport_url)
    qr.make(fit=True)

    img = qr.make_image(fill_color="#001f29", back_color="white")

    buffer = io.BytesIO()
    try:
        img.save(buffer, format="PNG")  # type: ignore[call-arg]
    except TypeError:
        img.save(buffer)
    buffer.seek(0)
    img_base64 = base64.b64encode(buffer.read()).decode("utf-8")

    # Audit log generation
    client_ip = http_request.client.host if http_request.client else "unknown"
    log_passport_generation(request.userId, request.scope, passport_id, ip_address=client_ip)

    return PassportGenerateResponse(
        qrImage=f"data:image/png;base64,{img_base64}",
        token=token,
        passportId=passport_id,
        url=passport_url,
        expiresInSeconds=token_data["expires_in_seconds"],
        expiresAt=expires_at,
        scope=request.scope,
    )


# ─── View Passport (one-time access) ───────────────────────────────────

@router.get("/passport/{passport_id}")
def view_passport_by_id(passport_id: str, http_request: Request, token: str = Query(None)):
    """
    Public Passport verification and data retrieval.
    URL format: GET /api/passport/{passport_id}?token={secure_token}
    """
    effective_token = token if token else passport_id

    # 1. Decode & validate JWT
    payload = decode_passport_token(effective_token)

    patient_id: str = payload["sub"]
    patient_name: str = payload.get("name", "")
    scope: list[str] = payload["scope"]
    jti: str = payload["jti"]
    exp: int = payload["exp"]

    # 2. Check 15-second initial load grace cache (for React StrictMode / double-mount)
    cache_key = f"passport:cache:{jti}"
    cached_raw = get_key(cache_key)
    if cached_raw:
        try:
            return json.loads(cached_raw)
        except Exception:
            pass

    # 3. Check expiry
    if exp < int(time.time()):
        raise HTTPException(status_code=401, detail="This passport link has expired or has already been used.")

    # 4. One-time use enforcement via atomic SETNX
    blacklist_key = f"passport:used:{jti}"
    is_first_use = setnx_with_ttl(blacklist_key, "used", PASSPORT_EXPIRY_SECONDS)
    if not is_first_use:
        raise HTTPException(
            status_code=401,
            detail="This passport link has expired or has already been used."
        )

    # 5. Fetch scoped data
    data = get_scoped_patient_data(patient_id, patient_name, scope)

    # 6. Add metadata
    data["passport_id"] = jti
    data["expires_at"] = exp
    data["remaining_seconds"] = max(0, exp - int(time.time()))

    # 7. Save 1-second grace window cache for React StrictMode / duplicate mount
    set_key_with_ttl(cache_key, json.dumps(data), 1)

    # 8. Audit log access
    client_ip = http_request.client.host if http_request.client else "unknown"
    log_passport_access(patient_id, scope, jti, ip_address=client_ip)

    return data


@router.get("/patient-passport/{token}")
def view_passport_alias(token: str, request: Request):
    """
    Alias endpoint for backward compatibility with /api/patient-passport/{token}
    """
    return view_passport_by_id(passport_id=token, http_request=request, token=token)

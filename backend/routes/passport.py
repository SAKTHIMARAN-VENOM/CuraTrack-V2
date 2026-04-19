"""
Patient Passport endpoints — secure, scoped, one-time-access medical summary.
Does NOT modify existing QR endpoints.
"""
import io
import base64
import time
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
import qrcode

from services.jwt_helper import (
    create_passport_token,
    decode_passport_token,
    PASSPORT_EXPIRY_SECONDS,
    VALID_SCOPES,
)
from services.redis_client import setnx_with_ttl
from services.patient_data import get_scoped_patient_data
from services.audit_logger import log_passport_access

router = APIRouter()


# ─── Request / Response Models ──────────────────────────────────────────

class PassportGenerateRequest(BaseModel):
    userId: str = Field(..., min_length=1)
    userName: str = "Patient"
    scope: list[str] = Field(..., min_length=1)


class PassportGenerateResponse(BaseModel):
    qrImage: str
    token: str
    expiresInSeconds: int
    expiresAt: int
    scope: list[str]


# ─── Generate Passport QR ──────────────────────────────────────────────

@router.post("/passport/generate", response_model=PassportGenerateResponse)
def generate_passport_qr(request: PassportGenerateRequest):
    """
    Generate a scoped Patient Passport QR code.
    Encodes a JWT with patient_id, scope, jti and 5-min expiry.
    Returns a base64-encoded QR PNG + the raw token.
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

    # Build QR code with the passport URL (Using local IP for mobile access on same WiFi)
    local_ip = "10.151.93.61"
    passport_url = f"http://{local_ip}:3000/passport/{token_data['token']}"

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
    img.save(buffer, format="PNG")
    buffer.seek(0)
    img_base64 = base64.b64encode(buffer.read()).decode("utf-8")

    return PassportGenerateResponse(
        qrImage=f"data:image/png;base64,{img_base64}",
        token=token_data["token"],
        expiresInSeconds=token_data["expires_in_seconds"],
        expiresAt=token_data["expires_at"],
        scope=request.scope,
    )


# ─── View Passport (one-time access) ───────────────────────────────────

@router.get("/patient-passport/{token}")
def view_passport(token: str, request: Request):
    """
    Validate JWT, enforce one-time usage via Redis SETNX,
    fetch scoped patient data, log access, return structured response.
    """
    # 1. Decode & validate JWT (checks expiry, type, scope, jti)
    payload = decode_passport_token(token)

    patient_id: str = payload["sub"]
    patient_name: str = payload.get("name", "")
    scope: list[str] = payload["scope"]
    jti: str = payload["jti"]
    exp: int = payload["exp"]

    # 2. One-time use enforcement via atomic SETNX
    blacklist_key = f"passport:jti:{jti}"
    is_first_use = setnx_with_ttl(blacklist_key, "used", PASSPORT_EXPIRY_SECONDS)
    if not is_first_use:
        raise HTTPException(status_code=401, detail="Token already used")

    # 3. Fetch scoped data
    data = get_scoped_patient_data(patient_id, patient_name, scope)

    # 4. Add expiry metadata
    data["expires_at"] = exp
    data["remaining_seconds"] = max(0, exp - int(time.time()))

    # 5. Audit log
    client_ip = request.client.host if request.client else "unknown"
    log_passport_access(patient_id, scope, jti, ip_address=client_ip)

    return data

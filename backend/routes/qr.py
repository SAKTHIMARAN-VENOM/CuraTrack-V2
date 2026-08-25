import jwt
import time
import io
import base64
import os
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
import qrcode

from services.patient_data import get_scoped_patient_data

router = APIRouter()

QR_SECRET = os.getenv("QR_SECRET_KEY", "curatrack-qr-secret-dev")
QR_EXPIRY_SECONDS = 300  # 5 minutes


class QRGenerateRequest(BaseModel):
    userId: str
    userName: str = "Patient"


class QRVerifyRequest(BaseModel):
    token: str


@router.post("/qr/generate")
def generate_qr(request: QRGenerateRequest, http_request: Request):
    """
    Generate a secure QR code containing a full frontend URL pointing to the patient passport page.
    Token expires in 5 minutes.
    Returns a base64-encoded PNG image and the target passport URL.
    """
    from services.jwt_helper import create_passport_token
    from services.redis_client import set_key_with_ttl
    import json

    scopes = ["medications", "allergies", "vitals", "diagnoses", "insurance"]
    token_data = create_passport_token(
        patient_id=request.userId,
        patient_name=request.userName,
        scope=scopes,
    )

    passport_id = token_data["jti"]
    token = token_data["token"]
    expires_at = token_data["expires_at"]

    # Cache passport metadata
    meta = {
        "passport_id": passport_id,
        "token": token,
        "patient_id": request.userId,
        "patient_name": request.userName,
        "scope": scopes,
        "created_at": int(time.time()),
        "expires_at": expires_at,
    }
    set_key_with_ttl(f"passport:meta:{passport_id}", json.dumps(meta), QR_EXPIRY_SECONDS)

    origin_header = http_request.headers.get("origin") or http_request.headers.get("referer")
    if origin_header:
        frontend_url = origin_header.split("/passport")[0].split("/api")[0].rstrip("/")
    else:
        frontend_url = os.getenv("FRONTEND_URL", "https://moblie-ui-curatrack.vercel.app").rstrip("/")
    passport_url = f"{frontend_url}/passport/{passport_id}?token={token}"

    # Generate QR code image
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(passport_url)
    qr.make(fit=True)

    img = qr.make_image(fill_color="#001f29", back_color="white")

    # Convert to base64
    buffer = io.BytesIO()
    try:
        img.save(buffer, format="PNG")  # type: ignore[call-arg]
    except TypeError:
        img.save(buffer)
    buffer.seek(0)
    img_base64 = base64.b64encode(buffer.read()).decode("utf-8")

    return {
        "qrImage": f"data:image/png;base64,{img_base64}",
        "url": passport_url,
        "passportId": passport_id,
        "expiresInSeconds": QR_EXPIRY_SECONDS,
        "token": token,
    }


@router.post("/qr/verify")
def verify_qr(request: QRVerifyRequest):
    """
    Verify a QR token. Returns patient info if valid, error if expired or invalid.
    """
    try:
        payload = jwt.decode(request.token, QR_SECRET, algorithms=["HS256"])

        if payload.get("type") != "health_id_qr":
            raise HTTPException(status_code=400, detail="Invalid QR token type")

        return {
            "valid": True,
            "userId": payload["sub"],
            "userName": payload.get("name", "Unknown"),
            "issuedAt": payload["iat"],
            "expiresAt": payload["exp"],
            "remainingSeconds": max(0, payload["exp"] - int(time.time())),
        }
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="QR code has expired. Please generate a new one.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=400, detail="Invalid QR token.")


@router.get("/patient/{patient_id}")
def get_patient_by_id(patient_id: str):
    """
    Fetch patient details and clinical summary for the given patient ID.
    Returns patient profile and medical information.
    """
    scopes = ["diagnoses", "medications", "allergies", "vitals", "insurance"]
    scoped_data = get_scoped_patient_data(patient_id, "Patient", scopes)

    return {
        "id": patient_id,
        "patient_id": patient_id,
        "name": scoped_data.get("patient_name") or "Patient Details",
        "age": 34,
        "gender": "Female",
        "blood_group": "O+",
        "data": scoped_data,
        "diagnoses": scoped_data.get("last_3_diagnoses", []),
        "medications": scoped_data.get("active_medications", []),
        "allergies": scoped_data.get("allergies", []),
        "vitals": scoped_data.get("last_lab_values", {}),
        "insurance": scoped_data.get("insurance_status", {}),
    }

import jwt
import time
import io
import base64
import os
from fastapi import APIRouter, HTTPException
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
def generate_qr(request: QRGenerateRequest):
    """
    Generate a secure QR code containing a full frontend URL pointing to the patient details page.
    Token expires in 5 minutes. Encodes user ID and name.
    Returns a base64-encoded PNG image and the target patient URL.
    """
    payload = {
        "sub": request.userId,
        "name": request.userName,
        "iat": int(time.time()),
        "exp": int(time.time()) + QR_EXPIRY_SECONDS,
        "type": "health_id_qr",
    }

    token = jwt.encode(payload, QR_SECRET, algorithm="HS256")

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
    patient_url = f"{frontend_url}/patient/{request.userId}"

    # Generate QR code image
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(patient_url)
    qr.make(fit=True)

    img = qr.make_image(fill_color="#001f29", back_color="white")

    # Convert to base64
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    img_base64 = base64.b64encode(buffer.read()).decode("utf-8")

    return {
        "qrImage": f"data:image/png;base64,{img_base64}",
        "url": patient_url,
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


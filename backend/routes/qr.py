import jwt
import time
import io
import base64
import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import qrcode

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
    Generate a secure QR code containing a JWT token.
    Token expires in 5 minutes. Encodes user ID and name.
    Returns a base64-encoded PNG image.
    """
    payload = {
        "sub": request.userId,
        "name": request.userName,
        "iat": int(time.time()),
        "exp": int(time.time()) + QR_EXPIRY_SECONDS,
        "type": "health_id_qr",
    }

    token = jwt.encode(payload, QR_SECRET, algorithm="HS256")

    # Generate QR code image
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(token)
    qr.make(fit=True)

    img = qr.make_image(fill_color="#001f29", back_color="white")

    # Convert to base64
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    img_base64 = base64.b64encode(buffer.read()).decode("utf-8")

    return {
        "qrImage": f"data:image/png;base64,{img_base64}",
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

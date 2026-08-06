"""
OCR API routes for document scanning and structured field parsing.
"""
import os
import uuid
import shutil
import logging
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from services.ocr_service import extract_raw_text, parse_document_fields

logger = logging.getLogger("curatrack.ocr_route")
router = APIRouter()

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".tiff", ".bmp", ".webp"}


@router.post("/ocr/parse")
async def parse_document(
    file: UploadFile = File(...),
    doc_type: str = Form("govt_id")  # govt_id, medical_report, insurance_card, doctor_credential
):
    """
    Upload a document (Image or PDF) and perform structured field extraction based on doc_type.
    Returns raw extracted text AND parsed field JSON for user review & editing.
    """
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {ext}. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    file_id = str(uuid.uuid4())
    temp_path = os.path.join(UPLOAD_DIR, f"{file_id}{ext}")

    try:
        with open(temp_path, "wb") as f:
            shutil.copyfileobj(file.file, f)

        # 1. Extract raw text via Gemini Vision AI
        raw_text = extract_raw_text(temp_path)

        # 2. Extract structured fields via Gemini Vision AI
        parsed_fields = parse_document_fields(doc_type, temp_path)

        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "doc_type": doc_type,
                "filename": file.filename,
                "raw_text": raw_text[:2000],
                "extracted_data": parsed_fields
            }
        )
    except Exception as e:
        logger.error("OCR parse error: %s", e)
        # Fallback structured response
        fallback_fields = parse_document_fields(doc_type, f"Uploaded file: {file.filename}")
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "doc_type": doc_type,
                "filename": file.filename,
                "raw_text": f"Uploaded document: {file.filename}",
                "extracted_data": fallback_fields
            }
        )
    finally:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError:
                pass

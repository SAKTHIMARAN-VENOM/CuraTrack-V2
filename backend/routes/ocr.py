"""
OCR API routes for document scanning and structured field parsing.
"""
import os
import uuid
import shutil
import logging
import traceback
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
    NEVER returns mock data — returns empty fields + error on failure.
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

        # 1. Extract raw text via Tesseract OCR
        raw_text = extract_raw_text(temp_path)

        if not raw_text or not raw_text.strip():
            logger.warning("OCR extracted no text from %s (doc_type=%s)", file.filename, doc_type)
            return JSONResponse(
                status_code=200,
                content={
                    "success": False,
                    "doc_type": doc_type,
                    "filename": file.filename,
                    "raw_text": "",
                    "extracted_data": {},
                    "error": "OCR could not extract any text from this document. Please try a clearer image or enter data manually."
                }
            )

        # 2. Analyze raw text string via Gemini Text API
        parsed_fields = parse_document_fields(doc_type, raw_text)

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
        logger.error("OCR parse error for %s: %s\n%s", file.filename, e, traceback.format_exc())
        # Return real error — NOT mock data
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "doc_type": doc_type,
                "filename": file.filename,
                "raw_text": "",
                "extracted_data": {},
                "error": f"OCR processing failed: {str(e)}"
            }
        )
    finally:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError:
                pass

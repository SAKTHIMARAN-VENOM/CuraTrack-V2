"""
Document ingestion endpoints.
Upload → OCR → LLM → Parse → Return for verification.
Confirmation endpoint saves verified data to DB.
"""
import os
import uuid
import shutil
import logging
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from pydantic import BaseModel, Field

from services.ocr_service import extract_text
from services.llm_service import extract_medical_data
from services.parser_service import parse_llm_response, EMPTY_RESULT
from services.save_service import save_confirmed_data

logger = logging.getLogger("curatrack.ingest")
router = APIRouter()

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".tiff", ".bmp", ".webp"}


# ─── Models ─────────────────────────────────────────────────────────────

class MedicationItem(BaseModel):
    name: str = ""
    dosage: str = ""
    frequency: str = ""
    time: str = ""
    reason: str = ""
    confidence: float = 0.0

class LabResultItem(BaseModel):
    test: str = ""
    value: str = ""
    unit: str = ""
    status: str = "unknown"
    confidence: float = 0.0

class DoctorNotesItem(BaseModel):
    summary: str = ""
    confidence: float = 0.0

class ConfirmIngestionRequest(BaseModel):
    patient_id: str = Field(default="demo-patient-001")
    medications: list[MedicationItem] = []
    lab_results: list[LabResultItem] = []
    doctor_notes: DoctorNotesItem = DoctorNotesItem()


# ─── Ingest Endpoint ────────────────────────────────────────────────────

@router.post("/ingest-document")
async def ingest_document(file: UploadFile = File(...)):
    """
    Upload a medical document (PDF or image).
    1. Save file to disk
    2. OCR → extract text
    3. LLM → extract structured data
    4. Parse → validate and normalize
    5. Return data with status 'needs_verification'

    Does NOT save to database — requires /confirm-ingestion.
    """
    # Validate file extension
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {ext}. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    # Save uploaded file
    file_id = str(uuid.uuid4())
    safe_name = f"{file_id}{ext}"
    file_path = os.path.join(UPLOAD_DIR, safe_name)

    try:
        with open(file_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        logger.info("Saved upload: %s (%s)", safe_name, file.filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    # Step 1: OCR
    try:
        raw_text = extract_text(file_path)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=f"OCR failed: {str(e)}")
    except Exception as e:
        logger.error("OCR error: %s", e)
        raise HTTPException(status_code=500, detail=f"OCR processing error: {str(e)}")

    if not raw_text.strip():
        raise HTTPException(status_code=422, detail="OCR returned empty text — document may be blank or unreadable")

    # Step 2: LLM extraction
    try:
        llm_response = extract_medical_data(raw_text)
    except RuntimeError as e:
        logger.warning("LLM failed, returning empty structure: %s", e)
        # Return empty structure with the raw text so user can manually enter
        return {
            "status": "needs_verification",
            "llm_available": False,
            "raw_text": raw_text[:3000],
            "data": EMPTY_RESULT.copy(),
            "source": "ocr_upload",
            "filename": file.filename,
            "created_at": datetime.utcnow().isoformat() + "Z",
        }

    # Step 3: Parse
    parsed_data = parse_llm_response(llm_response)

    # Cleanup temp file
    try:
        os.remove(file_path)
    except OSError:
        pass

    return {
        "status": "needs_verification",
        "llm_available": True,
        "raw_text": raw_text[:3000],
        "data": parsed_data,
        "source": "ocr_upload",
        "filename": file.filename,
        "created_at": datetime.utcnow().isoformat() + "Z",
    }


# ─── Confirm Endpoint ───────────────────────────────────────────────────

@router.post("/confirm-ingestion")
async def confirm_ingestion(body: ConfirmIngestionRequest):
    """
    Save user-verified medical data to the database.
    Called ONLY after the user reviews and confirms extracted data.
    """
    medications = [m.model_dump() for m in body.medications]
    lab_results = [l.model_dump() for l in body.lab_results]
    doctor_notes = body.doctor_notes.model_dump()

    # Clamp all confidence values
    for med in medications:
        med["confidence"] = max(0.0, min(float(med.get("confidence", 0)), 1.0))
    for lab in lab_results:
        lab["confidence"] = max(0.0, min(float(lab.get("confidence", 0)), 1.0))
    doctor_notes["confidence"] = max(0.0, min(float(doctor_notes.get("confidence", 0)), 1.0))

    saved = save_confirmed_data(
        patient_id=body.patient_id,
        medications=medications,
        lab_results=lab_results,
        doctor_notes=doctor_notes,
    )

    return {
        "status": "confirmed",
        "saved": saved,
        "message": "Medical records saved successfully after verification.",
    }

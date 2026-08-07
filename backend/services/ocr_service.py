"""
Unified Tesseract OCR + Gemini Text Analysis Pipeline for CuraTrack V3.

Architecture:
1. Tesseract OCR (offline) extracts raw text from images & PDFs.
2. Gemini Text API receives ONLY raw text strings (never images) to parse structured JSON.
3. Form fields in frontend are populated for user review and editing before saving.

Error handling: Real errors propagate. No mock data. No silent fallbacks.
"""
import os
import re
import json
import shutil
import logging
import platform
import traceback
import requests
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("curatrack.ocr")

TESSERACT_AVAILABLE = False
TESSERACT_VERSION = None
TESSERACT_CMD_PATH = None


def find_tesseract_cmd() -> str | None:
    r"""
    Auto-detect Tesseract OCR executable path across standard search locations in strict order:
    1. TESSERACT_CMD environment variable
    2. System PATH
    3. C:\Program Files\Tesseract-OCR\tesseract.exe
    4. C:\Program Files (x86)\Tesseract-OCR\tesseract.exe
    5. User AppData / Local installation directories
    """
    # 1. TESSERACT_CMD env var
    env_path = os.getenv("TESSERACT_CMD")
    if env_path and os.path.exists(env_path):
        return env_path

    # 2. System PATH
    which_path = shutil.which("tesseract")
    if which_path:
        return which_path

    # 3. Windows standard paths
    if platform.system() == "Windows":
        local_app_data = os.getenv("LOCALAPPDATA", "")
        user_profile = os.getenv("USERPROFILE", "")
        common_paths = [
            r"C:\Program Files\Tesseract-OCR\tesseract.exe",
            r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
            os.path.join(local_app_data, "Programs", "Tesseract-OCR", "tesseract.exe") if local_app_data else "",
            os.path.join(local_app_data, "Tesseract-OCR", "tesseract.exe") if local_app_data else "",
            os.path.join(user_profile, "AppData", "Local", "Programs", "Tesseract-OCR", "tesseract.exe") if user_profile else "",
            os.path.join(user_profile, "AppData", "Local", "Tesseract-OCR", "tesseract.exe") if user_profile else "",
        ]
        for path in common_paths:
            if path and os.path.exists(path):
                return path

    # 4. Linux / Unix standard paths
    linux_paths = [
        "/usr/bin/tesseract",
        "/usr/local/bin/tesseract",
        "/usr/bin/tesseract-ocr",
        "/app/.apt/usr/bin/tesseract",
    ]
    for path in linux_paths:
        if os.path.exists(path):
            return path

    return None


def configure_tesseract() -> tuple[bool, str | None, str | None]:
    """Configure pytesseract with detected executable path."""
    global TESSERACT_AVAILABLE, TESSERACT_VERSION, TESSERACT_CMD_PATH

    cmd_path = find_tesseract_cmd()
    if cmd_path:
        try:
            import pytesseract
            pytesseract.pytesseract.tesseract_cmd = cmd_path
            version = str(pytesseract.get_tesseract_version())
            TESSERACT_AVAILABLE = True
            TESSERACT_VERSION = version
            TESSERACT_CMD_PATH = cmd_path
            return True, version, cmd_path
        except Exception as e:
            logger.warning("Found Tesseract at %s but failed to query version: %s", cmd_path, e)
            TESSERACT_AVAILABLE = False
            return False, None, cmd_path
    else:
        TESSERACT_AVAILABLE = False
        return False, None, None


# Configure on import
configure_tesseract()


def validate_tesseract_on_startup() -> bool:
    """Startup check log printed to console on FastAPI launch."""
    available, version, cmd_path = configure_tesseract()
    if available and version:
        msg = f"[OK] Tesseract Found (Version {version}) at {cmd_path}"
        print(msg)
        logger.info(msg)
        return True
    else:
        msg = "[WARN] Tesseract Not Found: Please install Tesseract OCR or set TESSERACT_CMD env var"
        print(msg)
        logger.warning(msg)
        return False


def is_tesseract_installed() -> bool:
    """Return True ONLY if Tesseract OCR binary is actually detected and working."""
    return TESSERACT_AVAILABLE


# ─── Raw Text Extraction ───────────────────────────────────────────────

def extract_raw_text(file_path: str) -> str:
    """
    Extract raw text from image or PDF using Tesseract OCR + PyMuPDF / pdfplumber.
    Raises ValueError for unsupported file types.
    Returns empty string if extraction fails (never returns fake text).
    """
    ext = os.path.splitext(file_path)[1].lower()

    if ext == ".pdf":
        return _extract_from_pdf_tesseract(file_path)
    elif ext in (".png", ".jpg", ".jpeg", ".tiff", ".bmp", ".webp"):
        return _extract_from_image_tesseract(file_path)
    else:
        raise ValueError(f"Unsupported file type: {ext}")


# Alias for backward compatibility (used by ingest.py)
extract_text = extract_raw_text


def _extract_from_image_tesseract(file_path: str) -> str:
    """Extract text from image using Tesseract OCR via pytesseract."""
    if not TESSERACT_AVAILABLE:
        configure_tesseract()

    if not TESSERACT_AVAILABLE:
        logger.error("Tesseract OCR is not installed. Cannot extract text from image: %s", file_path)
        return ""

    try:
        import pytesseract
        from PIL import Image

        image = Image.open(file_path)
        text = pytesseract.image_to_string(image).strip()
        logger.info("Tesseract extracted %d chars from image %s", len(text), os.path.basename(file_path))
        return text
    except Exception as e:
        logger.error("Tesseract image extraction failed for %s: %s\n%s", file_path, e, traceback.format_exc())
        return ""


def _extract_from_pdf_tesseract(file_path: str) -> str:
    """
    Extract text from PDF using PyMuPDF (fitz) or pdfplumber.
    If text layer is missing or scanned, renders page image for Tesseract OCR.
    """
    text_parts: list[str] = []

    # 1. Try PyMuPDF (fitz)
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(file_path)
        for page_num in range(len(doc)):
            page = doc[page_num]
            t = page.get_text().strip()
            if t:
                text_parts.append(t)
            elif TESSERACT_AVAILABLE:
                # Scanned PDF page: render image for Tesseract OCR
                pix = page.get_pixmap(dpi=150)
                img_bytes = pix.tobytes("png")
                import io
                from PIL import Image
                import pytesseract
                img = Image.open(io.BytesIO(img_bytes))
                ocr_text = pytesseract.image_to_string(img).strip()
                if ocr_text:
                    text_parts.append(ocr_text)
        if text_parts:
            result = "\n\n".join(text_parts).strip()
            logger.info("PyMuPDF extracted %d chars from PDF %s", len(result), os.path.basename(file_path))
            return result
    except ImportError:
        logger.info("PyMuPDF not installed, trying pdfplumber")
    except Exception as e:
        logger.warning("PyMuPDF PDF extraction failed: %s", e)

    # 2. Fallback pdfplumber
    try:
        import pdfplumber
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                t = page.extract_text()
                if t:
                    text_parts.append(t.strip())
        if text_parts:
            result = "\n\n".join(text_parts).strip()
            logger.info("pdfplumber extracted %d chars from PDF %s", len(result), os.path.basename(file_path))
            return result
    except ImportError:
        logger.warning("pdfplumber not installed")
    except Exception as e:
        logger.warning("pdfplumber PDF extraction failed: %s", e)

    logger.warning("No text extracted from PDF: %s", os.path.basename(file_path))
    return ""


# ─── Gemini Text Analysis (Raw Text -> Structured JSON) ────────────────

def parse_document_fields(doc_type: str, file_path_or_text: str) -> dict:
    """
    Step 1: Extract raw text via Tesseract OCR (if input is file path).
    Step 2: Send ONLY the raw text string to Gemini Text API to parse structured JSON.
    Step 3: Return structured JSON dict to populate existing form fields for user review.

    NEVER returns mock/hardcoded data. Returns empty fields on failure.
    """
    # 1. Extract raw text with Tesseract OCR if input is a file path
    if os.path.exists(file_path_or_text):
        raw_text = extract_raw_text(file_path_or_text)
    else:
        raw_text = file_path_or_text

    if not raw_text or len(raw_text.strip()) < 3:
        logger.warning("No text available for Gemini analysis (doc_type=%s)", doc_type)
        return _empty_fields(doc_type)

    # 2. Analyze raw text string with Gemini Text API
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        logger.error("GEMINI_API_KEY is not set or empty. Cannot analyze document text.")
        return _empty_fields(doc_type)

    gemini_result = _parse_text_with_gemini(doc_type, raw_text, api_key)
    if gemini_result is not None:
        return gemini_result

    # Gemini failed — return empty fields, NOT mock data
    logger.warning("Gemini analysis returned no result for doc_type=%s. Returning empty fields.", doc_type)
    return _empty_fields(doc_type)


def _empty_fields(doc_type: str) -> dict:
    """Return empty structured fields for a given doc_type. No mock data."""
    if doc_type == "govt_id":
        return {"name": "", "dob": "", "gender": "", "address": ""}
    if doc_type == "medical_report":
        return {"blood_group": "", "allergies": [], "chronic_diseases": [], "current_medications": []}
    if doc_type == "insurance_card":
        return {"provider": "", "policy_number": "", "expiry": "", "coverage": ""}
    if doc_type == "doctor_credential":
        return {"reg_number": "", "doctor_name": "", "hospital": "", "qualification": "", "issue_date": ""}
    if doc_type == "health_record":
        return {
            "medications": [],
            "lab_results": [],
            "doctor_notes": {"summary": "", "confidence": 0.0},
        }
    return {}


def _parse_text_with_gemini(doc_type: str, raw_text: str, api_key: str) -> dict | None:
    """
    Send raw OCR text string to Gemini Text API.
    Gemini NEVER receives images — only raw text strings.
    Errors propagate with full tracebacks. No silent swallowing.
    """
    prompts = {
        "govt_id": (
            "You are an AI document parser.\n"
            "Analyze the following OCR raw text extracted from a Government ID / Aadhaar card.\n"
            "Extract the following fields and return ONLY a valid JSON object:\n"
            "{\n"
            '  "name": "Full Name",\n'
            '  "dob": "YYYY-MM-DD",\n'
            '  "gender": "Male | Female | Other",\n'
            '  "address": "Full Residential Address"\n'
            "}"
        ),
        "medical_report": (
            "You are an AI medical report parser.\n"
            "Analyze the following OCR raw text extracted from a Prescription or Lab Report.\n"
            "Extract the following fields and return ONLY a valid JSON object:\n"
            "{\n"
            '  "blood_group": "e.g. O+",\n'
            '  "allergies": ["Allergy1", "Allergy2"],\n'
            '  "chronic_diseases": ["Disease1"],\n'
            '  "current_medications": [{"name": "Med Name", "dosage": "10mg", "frequency": "Once daily"}]\n'
            "}"
        ),
        "insurance_card": (
            "You are an AI health insurance parser.\n"
            "Analyze the following OCR raw text extracted from a Health Insurance Card.\n"
            "Extract the following fields and return ONLY a valid JSON object:\n"
            "{\n"
            '  "provider": "Insurance Company Name",\n'
            '  "policy_number": "Policy / Member ID",\n'
            '  "expiry": "YYYY-MM-DD",\n'
            '  "coverage": "Coverage Scope / Tier"\n'
            "}"
        ),
        "doctor_credential": (
            "You are an AI medical credential parser.\n"
            "Analyze the following OCR raw text extracted from a Doctor Medical Registration / Certificate.\n"
            "Extract the following fields and return ONLY a valid JSON object:\n"
            "{\n"
            '  "reg_number": "Medical Registration Number",\n'
            '  "doctor_name": "Doctor Full Name",\n'
            '  "hospital": "Affiliated Hospital / Clinic",\n'
            '  "qualification": "Medical Degree",\n'
            '  "issue_date": "YYYY-MM-DD"\n'
            "}"
        ),
        "health_record": (
            "You are a medical data extraction AI.\n"
            "Analyze the following OCR raw text from a medical document.\n"
            "Extract structured data and return ONLY a valid JSON object:\n"
            "{\n"
            '  "medications": [{"name": "", "dosage": "", "frequency": "", "time": "", "reason": "", "confidence": 0.9}],\n'
            '  "lab_results": [{"test": "", "value": "", "unit": "", "status": "normal|high|low|unknown", "confidence": 0.9}],\n'
            '  "doctor_notes": {"summary": "", "confidence": 0.9}\n'
            "}\n"
            "If a field is not found in the text, omit it or use an empty value. Never invent data."
        ),
    }

    prompt = prompts.get(doc_type)
    if not prompt:
        logger.warning("Unknown doc_type '%s', using govt_id prompt", doc_type)
        prompt = prompts["govt_id"]

    model = os.getenv("GEMINI_MODEL", "gemini-flash-latest").strip()
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"

    payload = {
        "contents": [
            {
                "parts": [
                    {
                        "text": f'{prompt}\n\nExtracted OCR Text:\n"""{raw_text[:4000]}"""\n\nRespond ONLY with valid JSON.'
                    }
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.1,
            "responseMimeType": "application/json",
        }
    }

    try:
        logger.info("Calling Gemini API (model=%s, doc_type=%s, text_len=%d)", model, doc_type, len(raw_text))
        res = requests.post(url, json=payload, timeout=30)

        if res.status_code != 200:
            logger.error("Gemini API HTTP %d for doc_type=%s: %s", res.status_code, doc_type, res.text[:500])
            # Try fallback model if primary fails
            if model != "gemini-flash-latest":
                logger.info("Retrying with fallback model gemini-flash-latest")
                fallback_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={api_key}"
                res = requests.post(fallback_url, json=payload, timeout=30)
                if res.status_code != 200:
                    logger.error("Fallback model also failed HTTP %d: %s", res.status_code, res.text[:500])
                    return None

        data = res.json()
        candidates = data.get("candidates", [])
        if not candidates:
            logger.error("Gemini returned no candidates for doc_type=%s", doc_type)
            return None

        content = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
        if not content:
            logger.error("Gemini returned empty text for doc_type=%s", doc_type)
            return None

        logger.info("Gemini returned %d chars for doc_type=%s", len(content), doc_type)

        # Parse JSON from response
        json_match = re.search(r"\{.*\}", content, re.DOTALL)
        if json_match:
            parsed = json.loads(json_match.group(0))
            logger.info("Successfully parsed Gemini JSON for doc_type=%s: %s", doc_type, list(parsed.keys()))
            return parsed
        else:
            logger.error("No JSON object found in Gemini response for doc_type=%s: %s", doc_type, content[:200])
            return None

    except requests.Timeout:
        logger.error("Gemini API request timed out after 30s for doc_type=%s", doc_type)
        return None
    except json.JSONDecodeError as e:
        logger.error("Failed to parse Gemini JSON for doc_type=%s: %s", doc_type, e)
        return None
    except Exception as e:
        logger.error("Gemini analysis failed for doc_type=%s: %s\n%s", doc_type, e, traceback.format_exc())
        return None

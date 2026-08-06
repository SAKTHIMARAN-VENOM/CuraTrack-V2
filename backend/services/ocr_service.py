"""
OCR service for medical document text extraction.
Supports PDF (via pdfplumber) and images (via pytesseract).
"""
import os
import shutil
import logging
import platform

logger = logging.getLogger("curatrack.ocr")

TESSERACT_AVAILABLE = False
TESSERACT_VERSION = None


def find_tesseract_cmd() -> str | None:
    """Auto-detect Tesseract OCR executable path across standard locations."""
    # 1. Check environment variable
    env_path = os.getenv("TESSERACT_CMD")
    if env_path and os.path.exists(env_path):
        return env_path

    # 2. Check system PATH
    which_path = shutil.which("tesseract")
    if which_path:
        return which_path

    # 3. Check Windows common installation paths
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

    return None


def configure_tesseract() -> bool:
    """Configure pytesseract with detected executable path."""
    global TESSERACT_AVAILABLE, TESSERACT_VERSION

    cmd_path = find_tesseract_cmd()
    if cmd_path:
        try:
            import pytesseract
            pytesseract.pytesseract.tesseract_cmd = cmd_path
            version = str(pytesseract.get_tesseract_version())
            TESSERACT_AVAILABLE = True
            TESSERACT_VERSION = version
            return True
        except Exception as e:
            logger.warning("Found tesseract at %s but failed to initialize: %s", cmd_path, e)
            TESSERACT_AVAILABLE = False
            return False
    else:
        TESSERACT_AVAILABLE = False
        return False


# Initial configuration attempt
configure_tesseract()


def validate_tesseract_on_startup() -> bool:
    """Validate Tesseract installation and log formatted status on backend startup."""
    is_available = configure_tesseract()
    if is_available:
        try:
            print("✓ Tesseract Found")
        except UnicodeEncodeError:
            print("[OK] Tesseract Found")
        print(f"Version: {TESSERACT_VERSION}")
        logger.info("Tesseract Found - Version: %s", TESSERACT_VERSION)
    else:
        try:
            print("✗ Tesseract Not Found")
        except UnicodeEncodeError:
            print("[X] Tesseract Not Found")
        print("Error: Tesseract OCR is not installed or it's not in your PATH.")
        logger.warning("Tesseract Not Found - Install Tesseract and restart backend.")
    return is_available


def is_tesseract_installed() -> bool:
    """Return True if Tesseract OCR is installed and available."""
    return configure_tesseract()


def extract_text(file_path: str) -> str:
    """
    Extract text from a PDF or image file.
    Returns the extracted raw text string.
    Raises ValueError if file type is unsupported or text is empty.
    Raises RuntimeError if Tesseract is required but not installed.
    """
    ext = os.path.splitext(file_path)[1].lower()

    if ext == ".pdf":
        return _extract_from_pdf(file_path)
    elif ext in (".png", ".jpg", ".jpeg", ".tiff", ".bmp", ".webp"):
        return _extract_from_image(file_path)
    else:
        raise ValueError(f"Unsupported file type: {ext}")


def _extract_from_pdf(file_path: str) -> str:
    """Extract text from PDF using pdfplumber."""
    import pdfplumber

    text_parts: list[str] = []

    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text.strip())

    combined = "\n\n".join(text_parts).strip()

    if not combined:
        # Fallback: try OCR on rasterized pages
        logger.warning("pdfplumber returned empty text, attempting image-based OCR fallback")
        combined = _ocr_pdf_pages(file_path)

    if not combined:
        raise ValueError("OCR extraction returned empty text from PDF")

    return combined


def _ocr_with_tesseract_js(file_path: str) -> str:
    """Fallback OCR engine using tesseract.js via Node.js."""
    import subprocess
    import json

    frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend"))
    abs_file_path = os.path.abspath(file_path)

    js_code = (
        'const { createWorker } = require("tesseract.js");'
        '(async () => {'
        '  try {'
        '    const worker = await createWorker("eng");'
        '    const ret = await worker.recognize(' + json.dumps(abs_file_path) + ');'
        '    console.log(ret.data.text);'
        '    await worker.terminate();'
        '  } catch (err) {'
        '    console.error("tesseract.js error:", err);'
        '    process.exit(1);'
        '  }'
        '})();'
    )

    try:
        res = subprocess.run(
            ["node", "-e", js_code],
            cwd=frontend_dir,
            capture_output=True,
            text=True,
            timeout=60,
        )
        if res.returncode == 0 and res.stdout.strip():
            return res.stdout.strip()
        else:
            logger.warning("tesseract.js failed or returned empty text: %s", res.stderr)
            return ""
    except Exception as e:
        logger.warning("Failed to run tesseract.js fallback: %s", e)
        return ""


def _extract_from_image(file_path: str) -> str:
    """Extract text from image using pytesseract or tesseract.js fallback."""
    if is_tesseract_installed():
        import pytesseract
        from PIL import Image

        try:
            image = Image.open(file_path)
            text = pytesseract.image_to_string(image).strip()
            if text:
                return text
        except Exception as e:
            logger.warning("pytesseract extraction failed: %s, attempting tesseract.js fallback", e)

    # Fallback to tesseract.js via Node
    js_text = _ocr_with_tesseract_js(file_path)
    if js_text:
        return js_text

    raise RuntimeError("Tesseract OCR is not installed or it's not in your PATH.")


def _ocr_pdf_pages(file_path: str) -> str:
    """Fallback: convert PDF pages to images and OCR each one."""
    if is_tesseract_installed():
        try:
            import pytesseract
            from pdf2image import convert_from_path

            images = convert_from_path(file_path, dpi=300)
            parts: list[str] = []
            for img in images:
                page_text = pytesseract.image_to_string(img).strip()
                if page_text:
                    parts.append(page_text)
            if parts:
                return "\n\n".join(parts).strip()
        except Exception as e:
            logger.error("PDF pytesseract fallback failed: %s", e)

    return ""



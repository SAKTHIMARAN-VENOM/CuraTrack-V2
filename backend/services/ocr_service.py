"""
OCR service for medical document text extraction.
Supports PDF (via pdfplumber) and images (via pytesseract).
"""
import os
import logging

logger = logging.getLogger("curatrack.ocr")

# Configure tesseract path for Windows if not in PATH
try:
    import pytesseract
    import platform
    if platform.system() == "Windows":
        # Check common installation paths
        common_paths = [
            r"C:\Program Files\Tesseract-OCR\tesseract.exe",
            f"C:\\Users\\{os.getlogin()}\\AppData\\Local\\Tesseract-OCR\\tesseract.exe",
            r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe"
        ]
        for path in common_paths:
            if os.path.exists(path):
                pytesseract.pytesseract.tesseract_cmd = path
                break
except Exception as e:
    logger.warning("Failed to configure pytesseract path: %s", e)


def extract_text(file_path: str) -> str:
    """
    Extract text from a PDF or image file.
    Returns the extracted raw text string.
    Raises ValueError if file type is unsupported or text is empty.
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


def _extract_from_image(file_path: str) -> str:
    """Extract text from image using pytesseract."""
    import pytesseract
    from PIL import Image

    image = Image.open(file_path)
    text = pytesseract.image_to_string(image).strip()

    if not text:
        raise ValueError("OCR extraction returned empty text from image")

    return text


def _ocr_pdf_pages(file_path: str) -> str:
    """Fallback: convert PDF pages to images and OCR each one."""
    try:
        import pytesseract
        from pdf2image import convert_from_path

        images = convert_from_path(file_path, dpi=300)
        parts: list[str] = []
        for img in images:
            page_text = pytesseract.image_to_string(img).strip()
            if page_text:
                parts.append(page_text)
        return "\n\n".join(parts).strip()
    except ImportError:
        logger.warning("pdf2image not installed, skipping PDF OCR fallback")
        return ""
    except Exception as e:
        logger.error("PDF OCR fallback failed: %s", e)
        return ""

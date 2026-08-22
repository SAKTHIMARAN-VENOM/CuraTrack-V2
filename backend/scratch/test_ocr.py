import os
import sys

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

from services.ocr_service import find_tesseract_cmd, configure_tesseract, is_tesseract_installed

def test_ocr():
    print("Testing Tesseract OCR Detection...")
    cmd = find_tesseract_cmd()
    print(f"Tesseract executable found: {cmd}")
    configured = configure_tesseract()
    print(f"Configured status: {configured}")
    installed = is_tesseract_installed()
    print(f"Installed status: {installed}")

if __name__ == "__main__":
    test_ocr()

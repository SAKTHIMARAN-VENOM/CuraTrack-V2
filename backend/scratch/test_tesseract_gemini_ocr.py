import os
import sys
import io
from PIL import Image, ImageDraw
from fastapi.testclient import TestClient

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

from main import app

client = TestClient(app)

def create_sample_id_card():
    img = Image.new('RGB', (600, 350), color=(255, 255, 255))
    d = ImageDraw.Draw(img)
    d.text((30, 30), "GOVERNMENT OF INDIA - AADHAAR", fill=(0, 0, 0))
    d.text((30, 80), "Name: Jane Doe", fill=(0, 0, 0))
    d.text((30, 120), "DOB: 14/05/1990", fill=(0, 0, 0))
    d.text((30, 160), "Gender: Female", fill=(0, 0, 0))
    d.text((30, 200), "Address: 123 Healthcare Ave, Metro District, TX 75001", fill=(0, 0, 0))
    
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='PNG')
    img_byte_arr.seek(0)
    return img_byte_arr.getvalue()

def run_e2e_tesseract_tests():
    print("==========================================")
    print("RUNNING TESSERACT OCR + GEMINI TEXT TEST")
    print("==========================================")

    sample_png = create_sample_id_card()

    # Test 1: Govt ID OCR
    res1 = client.post(
        "/api/ocr/parse",
        files={"file": ("govt_id.png", sample_png, "image/png")},
        data={"doc_type": "govt_id"}
    )
    assert res1.status_code == 200
    data1 = res1.json()
    print(f"[OK] Govt ID OCR response: {data1}")
    assert data1["success"] is True
    assert "extracted_data" in data1

    # Test 2: Doctor Credential OCR
    res2 = client.post(
        "/api/ocr/parse",
        files={"file": ("credential.png", sample_png, "image/png")},
        data={"doc_type": "doctor_credential"}
    )
    assert res2.status_code == 200
    data2 = res2.json()
    print(f"[OK] Doctor Credential response: {data2}")
    assert data2["success"] is True

    print("\n==========================================")
    print("TESSERACT OCR + GEMINI TEXT TESTS PASSED!")
    print("==========================================")

if __name__ == "__main__":
    run_e2e_tesseract_tests()

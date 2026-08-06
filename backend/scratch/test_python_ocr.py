import os
import easyocr
from PIL import Image, ImageDraw

def test_easyocr():
    print("Testing pure Python EasyOCR engine...")
    img = Image.new('RGB', (700, 350), color=(255, 255, 255))
    d = ImageDraw.Draw(img)
    d.text((30, 30), "SUNRISE MULTI-SPECIALITY HOSPITAL", fill=(0, 0, 0))
    d.text((30, 80), "Patient Name: Lakshmi Narayanan (PAT-89321)", fill=(0, 0, 0))
    d.text((30, 130), "Diagnosis: Type 2 Diabetes Mellitus, Hypertension", fill=(0, 0, 0))
    d.text((30, 180), "Rx: Metformin 500mg - Twice daily After Food", fill=(0, 0, 0))
    d.text((30, 230), "Dr. Arjun Mehta, MD (MED-IND-44992)", fill=(0, 0, 0))
    
    test_path = "temp_easyocr_test.png"
    img.save(test_path)
    
    try:
        reader = easyocr.Reader(['en'], gpu=False)
        results = reader.readtext(test_path, detail=0)
        extracted_text = "\n".join(results)
        print("\n--- Extracted Text from Python OCR ---")
        print(extracted_text)
        print("\n[OK] Pure Python OCR Extraction Succeeded!")
    finally:
        if os.path.exists(test_path):
            os.remove(test_path)

if __name__ == "__main__":
    test_easyocr()

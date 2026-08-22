"""
Single Gemini API call check for user verification.
Uses EXACTLY 1 API call to Gemini using GEMINI_API_KEY from .env.
"""
import os
import json
import requests
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

api_key = os.getenv("GEMINI_API_KEY", "").strip()
model = os.getenv("GEMINI_MODEL", "gemini-flash-latest").strip()

print("=" * 60)
print("1. GEMINI API KEY VALIDATION")
print("=" * 60)
print(f"API Key present: {bool(api_key)}")
print(f"API Key length: {len(api_key)}")
print(f"Model configured: {model}")

# Extract OCR text using RapidOCR
from rapidocr_onnxruntime import RapidOCR
engine = RapidOCR()
img_path = os.path.join(os.path.dirname(__file__), "test_prescription_user.jpg")

# If local test image copy doesn't exist, use original path
orig_img = r"C:\Users\Sakth\.gemini\antigravity-ide\brain\c5d1fc65-0fd9-4159-a21b-ab3b0f027e79\media__1786076852965.jpg"
target_img = img_path if os.path.exists(img_path) else orig_img

ocr_result, elapse = engine(target_img)
raw_ocr_lines = [box[1] for box in ocr_result] if ocr_result else []
raw_ocr_text = "\n".join(raw_ocr_lines)

print("\n" + "=" * 60)
print("2. ACTUAL OCR EXTRACTED TEXT FROM USER IMAGE")
print("=" * 60)
print(raw_ocr_text)

# EXACTLY 1 GEMINI API CALL
print("\n" + "=" * 60)
print("3. MAKING EXACTLY 1 GEMINI API CALL")
print("=" * 60)

url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
prompt = (
    "You are an AI medical report parser.\n"
    "Analyze the following OCR text extracted from a Prescription.\n"
    "Extract structured JSON with keys: patient_name, doctor_name, diagnosis, medications, additional_instructions, follow_up.\n"
    "Respond ONLY with valid JSON."
)

payload = {
    "contents": [
        {
            "parts": [
                {"text": f"{prompt}\n\nOCR Text:\n\"\"\"{raw_ocr_text}\"\"\"\n\nRespond ONLY with valid JSON."}
            ]
        }
    ],
    "generationConfig": {
        "temperature": 0.1,
        "responseMimeType": "application/json",
    }
}

try:
    res = requests.post(url, json=payload, timeout=30)
    print(f"HTTP Status Code: {res.status_code}")
    if res.status_code == 200:
        json_resp = res.json()
        parsed_text = json_resp["candidates"][0]["content"]["parts"][0]["text"]
        print("\n" + "=" * 60)
        print("4. ACTUAL GEMINI API STRUCTURED JSON OUTPUT")
        print("=" * 60)
        print(parsed_text)
    else:
        print(f"Gemini API Error ({res.status_code}): {res.text[:500]}")
except Exception as e:
    print(f"Exception calling Gemini API: {e}")

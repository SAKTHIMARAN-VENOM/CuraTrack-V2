"""Quick Gemini + Empty Fields test — no Tesseract required."""
import os, sys, json
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from services.ocr_service import _parse_text_with_gemini, _empty_fields

api_key = os.getenv("GEMINI_API_KEY", "").strip()
print(f"API key length: {len(api_key)}")
model = os.getenv("GEMINI_MODEL", "")
print(f"Model: {model}")

# Test 1: medical_report
print("\n--- Test: medical_report ---")
text = """Dr. Priya Sharma MD
Patient: Ramesh Kumar, 45M
Blood Group: B+
Diagnosis: Type 2 Diabetes
Allergies: Sulfa drugs, Peanuts
Rx:
1. Metformin 500mg Twice daily
2. Amlodipine 5mg Once daily"""

r = _parse_text_with_gemini("medical_report", text, api_key)
if r:
    print(f"[PASS] Keys: {list(r.keys())}")
    print(json.dumps(r, indent=2))
else:
    print("[FAIL] Returned None")

# Test 2: govt_id
print("\n--- Test: govt_id ---")
gt = "Aadhaar Card\nName: Ramesh Kumar\nDOB: 1981-03-15\nGender: Male\nAddress: 42 MG Road Bengaluru 560001"
r2 = _parse_text_with_gemini("govt_id", gt, api_key)
if r2:
    print(f"[PASS] Keys: {list(r2.keys())}")
    print(json.dumps(r2, indent=2))
else:
    print("[FAIL] Returned None")

# Test 3: insurance_card
print("\n--- Test: insurance_card ---")
ins = "Star Health Insurance\nMember ID: SH-2024-88421\nName: Ananya Reddy\nCoverage: Family Floater Rs 10 Lakh\nExpiry: 2028-06-30"
r3 = _parse_text_with_gemini("insurance_card", ins, api_key)
if r3:
    print(f"[PASS] Keys: {list(r3.keys())}")
    print(json.dumps(r3, indent=2))
else:
    print("[FAIL] Returned None")

# Test 4: health_record (ingest pipeline)
print("\n--- Test: health_record ---")
r4 = _parse_text_with_gemini("health_record", text, api_key)
if r4:
    print(f"[PASS] Keys: {list(r4.keys())}")
    meds = r4.get("medications", [])
    print(f"  Medications: {len(meds)}")
    for m in meds[:3]:
        print(f"    - {m.get('name','?')} {m.get('dosage','?')} ({m.get('frequency','?')})")
else:
    print("[FAIL] Returned None")

# Test 5: Empty fields contain no mock data
print("\n--- Test: Empty fields (no mock data) ---")
mock_check = ["Jane Doe", "John Doe", "Blue Cross", "BCBS", "Penicillin",
              "Dr. Sarah Jenkins", "MED-00471", "123 Healthcare", "Metformin"]
for dt in ["govt_id", "medical_report", "insurance_card", "doctor_credential", "health_record"]:
    e = _empty_fields(dt)
    found_mock = False
    for key, val in e.items():
        if isinstance(val, str):
            for mc in mock_check:
                if mc.lower() in val.lower():
                    print(f"  [FAIL] {dt}.{key} contains mock: '{mc}'")
                    found_mock = True
    if not found_mock:
        print(f"  [PASS] {dt}: clean (no mock data)")

print("\nDONE")

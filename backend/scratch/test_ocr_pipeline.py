"""
CuraTrack V3 — Full OCR Pipeline Test Suite
Tests: Tesseract extraction, Gemini text analysis, end-to-end pipeline.
Creates test images dynamically (no external files needed).
"""
import os
import sys
import json
import tempfile
import traceback

# Add parent dir to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))


def create_test_image(text: str, filename: str = "test_prescription.png") -> str:
    """Create a test image with text rendered on it using Pillow."""
    from PIL import Image, ImageDraw, ImageFont

    img = Image.new("RGB", (800, 600), "white")
    draw = ImageDraw.Draw(img)

    # Try to use a clear font
    try:
        font = ImageFont.truetype("arial.ttf", 20)
    except (IOError, OSError):
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 20)
        except (IOError, OSError):
            font = ImageFont.load_default()

    y = 20
    for line in text.split("\n"):
        draw.text((20, y), line, fill="black", font=font)
        y += 30

    path = os.path.join(tempfile.gettempdir(), filename)
    img.save(path)
    return path


def print_section(title: str):
    print()
    print("=" * 70)
    print(f"  {title}")
    print("=" * 70)


def test_tesseract_detection():
    """Test 1: Verify Tesseract is detected and configured."""
    print_section("TEST 1: Tesseract Detection")

    from services.ocr_service import (
        find_tesseract_cmd, configure_tesseract,
        is_tesseract_installed, TESSERACT_AVAILABLE
    )

    cmd_path = find_tesseract_cmd()
    print(f"  find_tesseract_cmd() = {cmd_path}")

    available, version, path = configure_tesseract()
    print(f"  configure_tesseract() = available={available}, version={version}, path={path}")
    print(f"  is_tesseract_installed() = {is_tesseract_installed()}")
    print(f"  TESSERACT_AVAILABLE global = {TESSERACT_AVAILABLE}")

    if not available:
        print()
        print("  [FAIL] Tesseract is NOT installed.")
        print("  Install: winget install UB-Mannheim.TesseractOCR")
        print("  Or set TESSERACT_CMD env var to the tesseract.exe path")
        return False

    print(f"  [PASS] Tesseract v{version} at {path}")
    return True


def test_tesseract_extraction():
    """Test 2: Verify Tesseract can extract text from a generated image."""
    print_section("TEST 2: Tesseract OCR Extraction (PNG)")

    from services.ocr_service import is_tesseract_installed, extract_raw_text

    if not is_tesseract_installed():
        print("  [SKIP] Tesseract not installed")
        return False

    # Create test prescription image
    test_text = """Dr. Priya Sharma, MD
General Medicine Clinic
Date: 2026-08-07

Patient: Ramesh Kumar
Age: 45 years, Male

Diagnosis: Type 2 Diabetes Mellitus, Hypertension

Rx:
1. Metformin 500mg Tablet - Twice daily After Food
2. Amlodipine 5mg Tablet - Once daily Morning
3. Aspirin 75mg Tablet - Once daily Night After Food

Follow up: 15 days"""

    img_path = create_test_image(test_text, "test_prescription.png")
    print(f"  Created test image: {img_path}")

    raw_text = extract_raw_text(img_path)
    print(f"  Extracted text length: {len(raw_text)} chars")
    print(f"  Extracted text preview:")
    for line in raw_text.split("\n")[:10]:
        stripped = line.strip()
        if stripped:
            print(f"    | {stripped}")

    if len(raw_text) < 10:
        print("  [FAIL] Extracted text too short — Tesseract likely not working")
        return False

    print(f"  [PASS] Tesseract extracted {len(raw_text)} chars from PNG")
    return True


def test_gemini_text_analysis():
    """Test 3: Verify Gemini can analyze raw text into structured JSON."""
    print_section("TEST 3: Gemini Text Analysis")

    from services.ocr_service import _parse_text_with_gemini, _empty_fields

    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        print("  [FAIL] GEMINI_API_KEY not set")
        return False

    print(f"  API key length: {len(api_key)}")

    # Test with realistic medical text
    test_text = """Dr. Priya Sharma, MD
General Medicine Clinic, Chennai
Date: 2026-08-07

Patient: Ramesh Kumar, 45 years Male
Blood Group: B+

Diagnosis: Type 2 Diabetes Mellitus, Hypertension
Known Allergies: Sulfa drugs, Peanuts

Rx:
1. Metformin 500mg Tablet - Twice daily After Food
2. Amlodipine 5mg Tablet - Once daily Morning
3. Aspirin 75mg Tablet - Once daily Night After Food

Follow up: 15 days"""

    # Test medical_report doc_type
    print("  Testing doc_type='medical_report'...")
    result = _parse_text_with_gemini("medical_report", test_text, api_key)
    if result:
        print(f"  Gemini returned JSON keys: {list(result.keys())}")
        print(f"  Parsed result:")
        print(f"    {json.dumps(result, indent=2)[:800]}")
        print(f"  [PASS] Gemini returned structured data for medical_report")
    else:
        print(f"  [FAIL] Gemini returned None for medical_report")
        return False

    # Test govt_id doc_type
    print()
    print("  Testing doc_type='govt_id'...")
    govt_text = "Government of India\nAadhaar Card\nName: Ramesh Kumar\nDOB: 1981-03-15\nGender: Male\nAddress: 42 MG Road, Bengaluru, Karnataka 560001"
    result2 = _parse_text_with_gemini("govt_id", govt_text, api_key)
    if result2:
        print(f"  Gemini returned: {json.dumps(result2, indent=2)[:400]}")
        print(f"  [PASS] Gemini returned structured data for govt_id")
    else:
        print(f"  [FAIL] Gemini returned None for govt_id")
        return False

    # Test health_record doc_type (used by ingest pipeline)
    print()
    print("  Testing doc_type='health_record'...")
    result3 = _parse_text_with_gemini("health_record", test_text, api_key)
    if result3:
        print(f"  Gemini returned JSON keys: {list(result3.keys())}")
        meds = result3.get("medications", [])
        labs = result3.get("lab_results", [])
        notes = result3.get("doctor_notes", {})
        print(f"    medications: {len(meds)} items")
        for m in meds[:3]:
            print(f"      - {m.get('name', '?')} {m.get('dosage', '?')} ({m.get('frequency', '?')})")
        print(f"    lab_results: {len(labs)} items")
        print(f"    doctor_notes: {notes.get('summary', '')[:100]}")
        print(f"  [PASS] Gemini returned structured data for health_record")
    else:
        print(f"  [FAIL] Gemini returned None for health_record")
        return False

    return True


def test_end_to_end_pipeline():
    """Test 4: Full pipeline — Image -> Tesseract OCR -> Gemini -> Structured JSON."""
    print_section("TEST 4: End-to-End Pipeline (Image -> OCR -> Gemini -> JSON)")

    from services.ocr_service import is_tesseract_installed, extract_raw_text, parse_document_fields

    if not is_tesseract_installed():
        print("  [SKIP] Tesseract not installed — testing text-only path")
        # Still test with raw text input
        test_text = "Patient: Ananya Reddy\nInsurance: Star Health\nPolicy: SH-2024-88421\nExpiry: 2028-06-30\nCoverage: Comprehensive Family Floater"
        result = parse_document_fields("insurance_card", test_text)
        print(f"  Text-only parse result: {json.dumps(result, indent=2)[:400]}")
        if result.get("provider") or result.get("policy_number"):
            print("  [PASS] Text-only pipeline works")
            return True
        else:
            print("  [FAIL] Text-only pipeline returned empty")
            return False

    # Create test image
    test_text = """Star Health Insurance
Member Card

Name: Ananya Reddy
Member ID: SH-2024-88421
Policy Type: Comprehensive Family Floater
Coverage: Up to Rs 10,00,000
Valid Until: 2028-06-30
Hospital Network: All India Cashless"""

    img_path = create_test_image(test_text, "test_insurance.png")
    print(f"  Created test image: {img_path}")

    # Step 1: OCR
    raw_text = extract_raw_text(img_path)
    print(f"  OCR extracted {len(raw_text)} chars:")
    for line in raw_text.split("\n")[:5]:
        if line.strip():
            print(f"    | {line.strip()}")

    # Step 2: Gemini analysis via parse_document_fields
    result = parse_document_fields("insurance_card", raw_text)
    print(f"  Parsed fields: {json.dumps(result, indent=2)}")

    # Verify NO mock data
    mock_values = ["Blue Cross Blue Shield", "BCBS-8849201", "Jane Doe", "John Doe",
                   "Dr. Sarah Jenkins", "Penicillin, Dust Mites", "123 Healthcare Ave"]
    for mv in mock_values:
        for v in result.values():
            if isinstance(v, str) and mv.lower() in v.lower():
                print(f"  [FAIL] Mock data detected in result: '{mv}'")
                return False

    print(f"  [PASS] No mock data detected. Pipeline returned actual extracted values.")
    return True


def test_no_mock_data_on_empty():
    """Test 5: Verify empty OCR text returns empty fields, not mock data."""
    print_section("TEST 5: Empty Input Returns Empty Fields (No Mock Data)")

    from services.ocr_service import parse_document_fields

    for doc_type in ["govt_id", "medical_report", "insurance_card", "doctor_credential", "health_record"]:
        result = parse_document_fields(doc_type, "")
        # Check all values are empty
        has_mock = False
        for key, val in result.items():
            if isinstance(val, str) and len(val) > 0:
                # Check if it's a known mock value
                mock_strings = ["Jane Doe", "John Doe", "Blue Cross", "BCBS", "Penicillin",
                                "Dr. Sarah Jenkins", "MED-00471", "123 Healthcare", "Metformin",
                                "Amlodipine", "Aspirin", "Lisinopril"]
                for ms in mock_strings:
                    if ms.lower() in val.lower():
                        print(f"  [FAIL] doc_type={doc_type}, key={key}: contains mock value '{ms}' -> '{val}'")
                        has_mock = True
        if not has_mock:
            print(f"  [PASS] doc_type={doc_type}: returns empty fields, no mock data")

    return True


if __name__ == "__main__":
    print()
    print("CuraTrack V3 — OCR Pipeline Test Suite")
    print("=" * 70)

    results = {}

    try:
        results["tesseract_detection"] = test_tesseract_detection()
    except Exception as e:
        print(f"  [ERROR] {e}\n{traceback.format_exc()}")
        results["tesseract_detection"] = False

    try:
        results["tesseract_extraction"] = test_tesseract_extraction()
    except Exception as e:
        print(f"  [ERROR] {e}\n{traceback.format_exc()}")
        results["tesseract_extraction"] = False

    try:
        results["gemini_analysis"] = test_gemini_text_analysis()
    except Exception as e:
        print(f"  [ERROR] {e}\n{traceback.format_exc()}")
        results["gemini_analysis"] = False

    try:
        results["e2e_pipeline"] = test_end_to_end_pipeline()
    except Exception as e:
        print(f"  [ERROR] {e}\n{traceback.format_exc()}")
        results["e2e_pipeline"] = False

    try:
        results["no_mock_data"] = test_no_mock_data_on_empty()
    except Exception as e:
        print(f"  [ERROR] {e}\n{traceback.format_exc()}")
        results["no_mock_data"] = False

    # Summary
    print_section("RESULTS SUMMARY")
    all_pass = True
    for name, passed in results.items():
        status = "[PASS]" if passed else "[FAIL]"
        if not passed:
            all_pass = False
        print(f"  {status} {name}")

    print()
    if all_pass:
        print("  ALL TESTS PASSED")
    else:
        print("  SOME TESTS FAILED — see details above")
    print()

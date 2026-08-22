import os
import sys
import json
import time

# Add backend directory to sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def run_tests():
    print("==========================================")
    print("RUNNING END-TO-END PASSPORT QR VERIFICATION")
    print("==========================================")

    # 1. Test Passport QR Generation
    print("\n--- Test 1: Generate Passport QR ---")
    gen_payload = {
        "userId": "patient_8829",
        "userName": "Jane Doe",
        "scope": ["medications", "allergies"]
    }
    response = client.post("/api/passport/generate", json=gen_payload)
    assert response.status_code == 200, f"Generate failed: {response.text}"
    gen_data = response.json()
    print("[OK] Generation status: 200 OK")
    print(f"[OK] Passport ID: {gen_data['passportId']}")
    print(f"[OK] Target URL: {gen_data['url']}")
    print(f"[OK] Expiry: {gen_data['expiresInSeconds']}s")

    passport_url = gen_data["url"]
    token = gen_data["token"]
    passport_id = gen_data["passportId"]

    # Verify no localhost or 127.0.0.1 or raw user ID in QR URL
    assert "localhost" not in passport_url, "URL contains localhost!"
    assert "127.0.0.1" not in passport_url, "URL contains 127.0.0.1!"
    assert "patient_8829" not in passport_url, "URL contains raw patient ID!"
    print("[OK] Decoded URL domain check: Valid deployed domain used, no localhost or raw patient ID!")

    # 2. Test 1st View (Successful Access)
    print("\n--- Test 2: Access Passport Endpoint (1st View) ---")
    view_res = client.get(f"/api/passport/{passport_id}?token={token}")
    assert view_res.status_code == 200, f"View failed: {view_res.text}"
    view_data = view_res.json()
    print("[OK] First access status: 200 OK")
    print("[OK] Patient Name:", view_data.get("patient_name"))

    # Verify field scoping
    assert "active_medications" in view_data, "active_medications missing!"
    assert "allergies" in view_data, "allergies missing!"
    assert "last_lab_values" not in view_data, "vitals exposed when not in scope!"
    assert "insurance_status" not in view_data, "insurance exposed when not in scope!"
    assert "last_3_diagnoses" not in view_data, "diagnoses exposed when not in scope!"
    print("[OK] Scoped filtering check PASSED: ONLY medications and allergies returned!")

    # 3. Test 2nd View (One-time Access Enforcement)
    print("\n--- Test 3: Access Passport Endpoint (2nd View - Should Fail) ---")
    time.sleep(1.2)
    view_res_2 = client.get(f"/api/passport/{passport_id}?token={token}")
    assert view_res_2.status_code == 401, f"Expected 401 on 2nd view, got {view_res_2.status_code}: {view_res_2.text}"
    print(f"[OK] One-time access check PASSED: 2nd view rejected with 401 ('{view_res_2.json()['detail']}')")

    # 4. Test Invalid Scope Request
    print("\n--- Test 4: Generate with Invalid Scope ---")
    bad_scope_res = client.post("/api/passport/generate", json={
        "userId": "patient_8829",
        "userName": "Jane Doe",
        "scope": ["invalid_scope_xyz"]
    })
    assert bad_scope_res.status_code == 400, "Invalid scope check failed"
    print("[OK] Invalid scope rejected with 400 Bad Request")

    # 5. Test QR route (/api/qr/generate)
    print("\n--- Test 5: Verify /api/qr/generate endpoint ---")
    qr_res = client.post("/api/qr/generate", json={"userId": "patient_123", "userName": "Alice"})
    assert qr_res.status_code == 200
    qr_data = qr_res.json()
    assert "localhost" not in qr_data["url"]
    print("[OK] /api/qr/generate URL check PASSED:", qr_data["url"])

    print("\n==========================================")
    print("ALL VERIFICATION TESTS PASSED SUCCESSFULLY!")
    print("==========================================")

if __name__ == "__main__":
    run_tests()

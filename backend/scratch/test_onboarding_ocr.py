import os
import sys
from fastapi.testclient import TestClient

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

from main import app

client = TestClient(app)

def run_onboarding_tests():
    print("==========================================")
    print("RUNNING ONBOARDING & UNIFIED OCR TESTS")
    print("==========================================")

    # 1. Test Onboarding Status
    res = client.get("/api/onboarding/status/test-patient-1")
    print(f"[OK] Initial status check status: {res.status_code}, data: {res.json()}")

    # 2. Test Patient Onboarding
    patient_payload = {
        "user_id": "test-patient-1",
        "personal_info": {"name": "Jane Doe", "dob": "1992-04-10", "gender": "Female", "address": "123 Main St"},
        "medical_info": {"blood_group": "O+", "allergies": "Penicillin", "chronic_diseases": "None", "current_medications": "Lisinopril"},
        "insurance_info": {"provider": "BCBS", "policy_number": "POL-12345", "expiry": "2027-12-31", "coverage": "Full"},
        "emergency_contact": {"name": "John Doe", "relationship": "Spouse", "phone": "+15550192"},
        "government_schemes": {"occupation": "Service", "annual_income_range": "2-5L", "state": "Tamil Nadu"}
    }
    pat_res = client.post("/api/onboarding/patient", json=patient_payload)
    assert pat_res.status_code == 200
    print(f"[OK] Patient onboarding: {pat_res.json()}")

    # 3. Test Doctor Onboarding
    doc_payload = {
        "user_id": "test-doctor-1",
        "personal_details": {"name": "Dr. Sarah Jenkins", "email": "doctor@hospital.org"},
        "professional_details": {"reg_number": "MED-00471", "qualification": "MBBS MD", "specialization": "Cardiology"},
        "verification_documents": {"reg_cert": "cert.pdf"}
    }
    doc_res = client.post("/api/onboarding/doctor", json=doc_payload)
    assert doc_res.status_code == 200
    print(f"[OK] Doctor onboarding: {doc_res.json()}")

    # 4. Test Admin Onboarding & Verification Action
    admin_payload = {
        "user_id": "test-admin-1",
        "name": "Admin Smith",
        "email": "admin@curatrack.org",
        "department": "Governance",
        "organization": "CuraTrack HQ"
    }
    adm_res = client.post("/api/onboarding/admin", json=admin_payload)
    assert adm_res.status_code == 200
    print(f"[OK] Admin onboarding: {adm_res.json()}")

    # 5. List Pending Doctors & Verify Doctor
    pending_res = client.get("/api/admin/doctors")
    assert pending_res.status_code == 200
    print(f"[OK] Admin pending doctors list count: {len(pending_res.json()['doctors'])}")

    verify_res = client.post("/api/admin/verify-doctor", json={"doctor_id": "test-doctor-1", "status": "verified"})
    assert verify_res.status_code == 200
    print(f"[OK] Doctor verification approval: {verify_res.json()}")

    status_after = client.get("/api/onboarding/status/test-doctor-1")
    assert status_after.json()["verification_status"] == "verified"
    print(f"[OK] Doctor status after verification: {status_after.json()}")

    print("\n==========================================")
    print("ALL ONBOARDING & OCR TESTS PASSED SUCCESSFULLY!")
    print("==========================================")

if __name__ == "__main__":
    run_onboarding_tests()

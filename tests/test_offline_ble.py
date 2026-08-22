import pytest

def test_doctor_presence_and_discovery(client):
    """Verify offline BLE doctor presence advertising and patient discovery."""
    doc_payload = {
        "doctorId": "doc-test-99",
        "doctorName": "Dr. Testing Specialist",
        "specialization": "General Medicine",
        "hospitalName": "CuraTrack Rural Clinic",
        "availabilityState": "AVAILABLE",
    }
    adv_res = client.post("/api/offline/presence/advertise", json=doc_payload)
    assert adv_res.status_code == 200
    assert adv_res.json()["status"] == "success"

    # Patient searches for active broadcasting doctors
    list_res = client.get("/api/offline/presence/doctors")
    assert list_res.status_code == 200
    doctors = list_res.json().get("doctors", [])
    assert any(d["id"] == "doc-test-99" for d in doctors)

    # Doctor ceases presence
    cease_res = client.post("/api/offline/presence/cease?doctorId=doc-test-99")
    assert cease_res.status_code == 200


def test_pairing_request_handshake_flow(client):
    """Verify offline Bluetooth pairing handshake request and response."""
    # 1. Create request
    req_payload = {
        "patientId": "pat-test-01",
        "patientName": "Ramesh Kumar",
        "targetDoctorId": "doc-test-99",
    }
    create_res = client.post("/api/offline/requests/create", json=req_payload)
    assert create_res.status_code == 200
    req_id = create_res.json()["requestId"]

    # 2. Doctor polls for pending requests
    pending_res = client.get("/api/offline/requests/pending?doctorId=doc-test-99")
    assert pending_res.status_code == 200
    reqs = pending_res.json().get("requests", [])
    assert any(r["requestId"] == req_id for r in reqs)

    # 3. Doctor responds (ACCEPT)
    respond_payload = {
        "requestId": req_id,
        "status": "ACCEPTED",
    }
    resp_res = client.post("/api/offline/requests/respond", json=respond_payload)
    assert resp_res.status_code == 200

    # 4. Patient polls status
    status_res = client.get(f"/api/offline/requests/{req_id}")
    assert status_res.status_code == 200
    assert status_res.json()["status"] == "ACCEPTED"

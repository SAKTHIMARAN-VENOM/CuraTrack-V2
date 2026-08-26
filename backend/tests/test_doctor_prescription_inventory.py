import pytest
from fastapi.testclient import TestClient
from main import app
from routes.facility import _DEFAULT_FACILITY_MEDICINES, _processed_prescription_deductions

client = TestClient(app)

def test_facility_medicines_search_filter():
    # 1. Search for Paracetamol
    res = client.get("/api/facility/medicines?search=para")
    assert res.status_code == 200
    data = res.json()
    assert "medicines" in data
    assert len(data["medicines"]) >= 1
    found_names = [m["name"].lower() for m in data["medicines"]]
    assert any("paracetamol" in name for name in found_names)

    # 2. Search for non-existent drug
    res_empty = client.get("/api/facility/medicines?search=nonexistentxyz12345")
    assert res_empty.status_code == 200
    data_empty = res_empty.json()
    assert len(data_empty["medicines"]) == 0

def test_prescription_stock_deduction_and_idempotency():
    # Record initial stock of Paracetamol
    res_init = client.get("/api/facility/medicines?search=para")
    assert res_init.status_code == 200
    initial_stock = res_init.json()["medicines"][0]["stock_units"]
    med_id = res_init.json()["medicines"][0]["id"]
    med_name = res_init.json()["medicines"][0]["name"]

    test_rx_id = f"test-rx-idempotency-{int(initial_stock)}"

    # 1. First deduction of 10 units
    payload = {
        "prescription_id": test_rx_id,
        "patient_id": "test-patient-001",
        "items": [
            {
                "medicine_id": med_id,
                "medicine_name": med_name,
                "quantity": 10
            }
        ],
        "dispensed_by": "Dr. David Ross"
    }

    res_deduct = client.post("/api/facility/medicines/deduct-stock", json=payload)
    assert res_deduct.status_code == 200
    deduct_data = res_deduct.json()
    assert deduct_data["success"] is True
    assert len(deduct_data["deductions"]) == 1
    new_stock = deduct_data["deductions"][0]["remaining_stock"]
    assert new_stock == initial_stock - 10

    # 2. Duplicate submission with same prescription_id should be idempotent
    res_dup = client.post("/api/facility/medicines/deduct-stock", json=payload)
    assert res_dup.status_code == 200
    dup_data = res_dup.json()
    assert dup_data["success"] is True
    assert "already processed" in dup_data["message"]
    # No extra deductions should have been made
    assert len(dup_data["deductions"]) == 0

    # 3. Verify stock in GET /facility/medicines reflects new stock
    res_after = client.get("/api/facility/medicines?search=para")
    assert res_after.status_code == 200
    current_stock = res_after.json()["medicines"][0]["stock_units"]
    assert current_stock == new_stock

def test_stock_cannot_become_negative():
    # Attempt to deduct excessive stock
    excessive_rx_id = "test-rx-excessive-999999"
    payload = {
        "prescription_id": excessive_rx_id,
        "patient_id": "test-patient-002",
        "items": [
            {
                "medicine_id": "MED-108",
                "medicine_name": "Tetanus Toxoid Vaccine",
                "quantity": 9999999
            }
        ],
        "dispensed_by": "Dr. David Ross"
    }
    res = client.post("/api/facility/medicines/deduct-stock", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    if data["deductions"]:
        assert data["deductions"][0]["remaining_stock"] >= 0

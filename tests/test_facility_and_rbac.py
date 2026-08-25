import pytest

def test_facility_stats_and_metrics(client):
    """Verify facility stats returns OPD queue numbers, beds, and doctors."""
    response = client.get("/api/facility/stats")
    assert response.status_code == 200
    data = response.json()
    assert "facility_name" in data
    assert "opd_today" in data
    assert "beds" in data
    assert data["opd_today"]["total_registered"] > 0
    assert data["beds"]["available"] > 0


def test_essential_medicines_inventory_and_stock_update(client):
    """Verify EDL medicine stock tracking, filtering, and stock receipt logging."""
    # List medicines
    res = client.get("/api/facility/medicines")
    assert res.status_code == 200
    data = res.json()
    assert "medicines" in data
    assert data["count"] > 0
    assert "critical_alerts_count" in data

    # Update stock for the first medicine dynamically
    target_med = data["medicines"][0]
    target_id = target_med["id"]
    initial_stock = target_med["stock_units"]

    # 1. Update stock (Add)
    update_payload = {
        "medicine_id": target_id,
        "action": "ADD",
        "units": 1000
    }
    update_res = client.post("/api/facility/medicines/update-stock", json=update_payload)
    assert update_res.status_code == 200
    assert update_res.json()["success"] is True
    post_add_stock = update_res.json()["updated_medicine"]["stock_units"]
    assert post_add_stock >= initial_stock + 1000

    # 2. Update stock (Reduce / Deduct)
    reduce_payload = {
        "medicine_id": target_id,
        "action": "REDUCE",
        "units": 200,
        "reason": "Dispensed to Inpatient / Emergency Ward"
    }
    reduce_res = client.post("/api/facility/medicines/update-stock", json=reduce_payload)
    assert reduce_res.status_code == 200
    assert reduce_res.json()["success"] is True
    assert reduce_res.json()["updated_medicine"]["stock_units"] == post_add_stock - 200

    # 3. Update stock (Set exact count via audit)
    set_payload = {
        "medicine_id": target_id,
        "action": "SET",
        "units": 750,
        "reason": "Physical Inventory Audit Count"
    }
    set_res = client.post(f"/api/facility/medicines/{target_id}/update-stock", json=set_payload)
    assert set_res.status_code == 200
    assert set_res.json()["success"] is True
    assert set_res.json()["updated_medicine"]["stock_units"] == 750


def test_diagnostic_lab_order_lifecycle(client):
    """Verify diagnostic lab ordering and sample queue retrieval."""
    # List diagnostics
    list_res = client.get("/api/facility/diagnostics")
    assert list_res.status_code == 200
    data = list_res.json()
    assert "diagnostics" in data
    assert data["count"] > 0

    # Place new order
    order_payload = {
        "patient_id": "P-9901",
        "patient_name": "Suresh Kale",
        "test_name": "Complete Blood Count (CBC) + Hemoglobin",
        "category": "Hematology",
        "priority": "HIGH",
        "ordered_by": "Dr. David Ross",
        "clinical_indication": "Suspected chronic fatigue / anemia"
    }
    order_res = client.post("/api/facility/diagnostics/order", json=order_payload)
    assert order_res.status_code == 200
    order_data = order_res.json()
    assert order_data["success"] is True
    assert order_data["diagnostic_order"]["patient_name"] == "Suresh Kale"
    assert order_data["diagnostic_order"]["status"] == "ORDERED"


def test_medicine_order_lifecycle(client):
    """Verify patient direct medicine ordering from doctor prescription."""
    order_payload = {
        "patient_id": "P-101",
        "patient_name": "Akshanth N",
        "prescription_id": "rx-uuid-999",
        "medicine_name": "Paracetamol 500mg Tablets",
        "dosage": "500 mg",
        "quantity": "10 Tablets",
        "frequency": "TDS (3 times daily)",
        "instructions": "Take after meals",
        "pharmacy": "Nandurbar SDH Dispensary"
    }
    res = client.post("/api/facility/medicine-orders", json=order_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["order"]["medicine_name"] == "Paracetamol 500mg Tablets"
    assert data["order"]["status"] == "ORDERED"

    # List orders for patient
    list_res = client.get("/api/facility/medicine-orders?patient_id=P-101")
    assert list_res.status_code == 200
    list_data = list_res.json()
    assert "orders" in list_data


def test_facility_doctors_roster(client):
    """Verify facility doctor roster returns doctors with required fields."""
    response = client.get("/api/facility/doctors")
    assert response.status_code == 200
    data = response.json()
    assert "doctors" in data
    assert data["count"] > 0
    assert "on_duty" in data
    assert "off_duty" in data

    # Check a doctor has required fields
    doc = data["doctors"][0]
    assert "name" in doc
    assert "specialty" in doc
    assert "status" in doc
    assert "shift" in doc

    # Filter by ON_DUTY
    on_duty_res = client.get("/api/facility/doctors?status=ON_DUTY")
    assert on_duty_res.status_code == 200
    on_duty_data = on_duty_res.json()
    assert all(d["status"] == "ON_DUTY" for d in on_duty_data["doctors"])


def test_facility_beds_detailed(client):
    """Verify ward-level bed breakdown returns all required fields."""
    response = client.get("/api/facility/beds")
    assert response.status_code == 200
    data = response.json()
    assert "total_beds" in data
    assert "total_occupied" in data
    assert "total_available" in data
    assert "occupancy_rate" in data
    assert "wards" in data
    assert len(data["wards"]) > 0

    # Each ward should have total, occupied, available
    ward = data["wards"][0]
    assert "ward" in ward
    assert "total" in ward
    assert "occupied" in ward
    assert "available" in ward


def test_facility_medicine_alerts(client):
    """Verify medicine alerts endpoint returns only non-ADEQUATE medicines."""
    response = client.get("/api/facility/medicine-alerts")
    assert response.status_code == 200
    data = response.json()
    assert "alert_count" in data
    assert "medicines" in data
    # All returned medicines should be LOW_STOCK or CRITICAL
    for med in data["medicines"]:
        assert med["status"] in ("LOW_STOCK", "CRITICAL_STOCKOUT_RISK")



def test_rbac_onboarding_fhw(client):
    """Verify Frontline Health Worker (ASHA) role onboarding."""
    fhw_payload = {
        "user_id": "test-fhw-user-101",
        "name": "Sunita Devi",
        "worker_type": "ASHA",
        "asha_id": "ASHA-MH-4019",
        "village_name": "Borvihir Pada",
        "sub_centre": "Sub-Centre Borvihir",
        "parent_phc": "PHC Nandurbar Rural",
        "contact_phone": "+91 98230 11223"
    }
    res = client.post("/api/onboarding/fhw", json=fhw_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["profile_completed"] is True

    # Check status
    status_res = client.get("/api/onboarding/status/test-fhw-user-101")
    assert status_res.status_code == 200
    assert status_res.json()["role"] == "fhw"


def test_rbac_onboarding_facility_manager(client):
    """Verify Facility Operations Manager role onboarding."""
    fm_payload = {
        "user_id": "test-fm-user-201",
        "name": "Anil Deshmukh",
        "role_title": "Pharmacy & Facility Officer",
        "facility_name": "Nandurbar Sub-District Hospital",
        "facility_type": "CHC",
        "district": "Nandurbar",
        "block": "Shahada",
        "license_number": "DMSD-MH-994",
        "contact_phone": "+91 98221 44556"
    }
    res = client.post("/api/onboarding/facility", json=fm_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True

    # Check status
    status_res = client.get("/api/onboarding/status/test-fm-user-201")
    assert status_res.status_code == 200
    assert status_res.json()["role"] == "facility_manager"

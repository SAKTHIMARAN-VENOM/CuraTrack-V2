from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_admin_dashboard_stats():
    res = client.get("/api/admin/dashboard-stats")
    assert res.status_code == 200
    data = res.json()
    assert "district" in data
    assert "population_covered" in data
    assert "total_villages" in data
    assert "total_doctors" in data
    assert "total_asha_workers" in data

def test_admin_action_required():
    res = client.get("/api/admin/action-required")
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert len(data["items"]) > 0

def test_admin_district_overview():
    res = client.get("/api/admin/district-overview")
    assert res.status_code == 200
    data = res.json()
    assert "district" in data
    assert "villages" in data

def test_admin_villages_list_and_detail():
    res = client.get("/api/admin/villages")
    assert res.status_code == 200
    data = res.json()
    assert "villages" in data
    assert len(data["villages"]) > 0
    village_id = data["villages"][0]["id"]

    detail_res = client.get(f"/api/admin/villages/{village_id}")
    assert detail_res.status_code == 200
    detail_data = detail_res.json()
    assert "village" in detail_data
    assert "workforce" in detail_data
    assert "health_indicators" in detail_data

def test_admin_workers_and_verification():
    # Doctors
    doc_res = client.get("/api/admin/doctors")
    assert doc_res.status_code == 200
    assert "doctors" in doc_res.json()

    # ASHA workers
    asha_res = client.get("/api/admin/asha-workers")
    assert asha_res.status_code == 200
    assert "asha_workers" in asha_res.json()

    # Verify ASHA
    ver_res = client.post("/api/admin/verify-asha", json={
        "asha_id": "ASHA-208",
        "status": "verified",
        "admin_id": "admin-1",
        "notes": "Verified induction certificates"
    })
    assert ver_res.status_code == 200
    assert ver_res.json()["verification_status"] == "verified"

def test_admin_disease_monitoring_and_alerts():
    dis_res = client.get("/api/admin/disease-monitoring")
    assert dis_res.status_code == 200
    assert "diseases" in dis_res.json()

    alt_res = client.get("/api/admin/disease-alerts")
    assert alt_res.status_code == 200
    assert "alerts" in alt_res.json()
    assert len(alt_res.json()["alerts"]) > 0

    alert_id = alt_res.json()["alerts"][0]["id"]
    act_res = client.post(f"/api/admin/disease-alerts/{alert_id}/action", json={
        "action": "DISPATCH_MMU",
        "notes": "Dispatch mobile unit for rapid testing"
    })
    assert act_res.status_code == 200
    assert act_res.json()["success"] is True

def test_admin_facilities_and_referrals():
    fac_res = client.get("/api/admin/facilities-overview")
    assert fac_res.status_code == 200
    assert "facilities" in fac_res.json()

    ref_res = client.get("/api/admin/referrals-overview")
    assert ref_res.status_code == 200
    assert "referrals" in ref_res.json()

def test_admin_reports_and_notifications():
    rep_res = client.get("/api/admin/reports?report_type=district_health")
    assert rep_res.status_code == 200
    assert "report" in rep_res.json()

    notif_res = client.get("/api/admin/notifications")
    assert notif_res.status_code == 200
    assert "notifications" in notif_res.json()

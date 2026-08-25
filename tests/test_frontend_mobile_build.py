import os
import json
import pytest

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def test_frontend_project_structure():
    """Verify frontend Next.js application has all critical production routes."""
    frontend_dir = os.path.join(ROOT_DIR, "frontend")
    package_json = os.path.join(frontend_dir, "package.json")
    
    assert os.path.exists(package_json), "frontend/package.json missing"
    with open(package_json, "r", encoding="utf-8") as f:
        pkg = json.load(f)
    assert "build" in pkg.get("scripts", {})

    required_frontend_routes = [
        "app/layout.tsx",
        "app/page.tsx",
        "app/admin/page.tsx",
        "app/(dashboard)/doctor/page.tsx",
        "app/(dashboard)/facility/clinical-schedule/page.tsx",
        "app/(dashboard)/facility/consultation-service/page.tsx",
        "app/login/page.tsx",
        "app/(dashboard)/dashboard/page.tsx",
        "app/(dashboard)/triage/page.tsx",
        "app/(dashboard)/referrals/page.tsx",
        "app/(dashboard)/fhw/page.tsx",
        "app/(dashboard)/facility/page.tsx",
        "app/(dashboard)/records/page.tsx",
        "app/(dashboard)/telemedicine/page.tsx",
        "app/(dashboard)/alerts/page.tsx",
        "app/(dashboard)/benefits/page.tsx",
        "app/(dashboard)/self-triage/page.tsx",
        "app/(dashboard)/doctor/triage/page.tsx",
        "app/(dashboard)/drug-checker/page.tsx",
        "app/(dashboard)/profile/page.tsx",
        "app/call/[roomId]/page.tsx",
        "app/passport/[token]/page.tsx",
    ]

    for route in required_frontend_routes:
        path = os.path.join(frontend_dir, route)
        assert os.path.exists(path), f"Critical frontend route missing: {route}"


def test_mobile_project_structure():
    """Verify mobile Next.js application has all required routes."""
    mobile_dir = os.path.join(ROOT_DIR, "mobile")
    package_json = os.path.join(mobile_dir, "package.json")

    assert os.path.exists(package_json), "mobile/package.json missing"
    with open(package_json, "r", encoding="utf-8") as f:
        pkg = json.load(f)
    assert "build" in pkg.get("scripts", {})

    required_mobile_routes = [
        "app/layout.tsx",
        "app/page.tsx",
        "app/appointments/page.tsx",
        "app/emergency/page.tsx",
        "app/medications/page.tsx",
        "app/records/page.tsx",
        "app/vitals/page.tsx",
        "app/schemes/page.tsx",
        "app/profile/page.tsx",
        "app/login/page.tsx",
    ]

    for route in required_mobile_routes:
        path = os.path.join(mobile_dir, route)
        assert os.path.exists(path), f"Critical mobile route missing: {route}"


def test_render_yaml_validity():
    """Verify Render deployment configuration file exists and has correct start commands."""
    render_yaml = os.path.join(ROOT_DIR, "render.yaml")
    assert os.path.exists(render_yaml), "render.yaml missing"
    with open(render_yaml, "r", encoding="utf-8") as f:
        content = f.read()
    assert "uvicorn main:app" in content
    assert "curatrack-backend" in content


def test_fhw_page_dropdown_filters_and_clean_heading():
    """Verify ASHA catchment center page contains dropdown filters and removed outbreak radar."""
    fhw_path = os.path.join(ROOT_DIR, "frontend", "app", "(dashboard)", "fhw", "page.tsx")
    assert os.path.exists(fhw_path)
    with open(fhw_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Outbreak radar banner must be removed
    assert "Active Village Catchment Outbreak Radar" not in content
    assert "SURVEILLANCE ACTIVE" not in content

    # Dropdown select filters must exist
    assert "id=\"fhw-category-filter\"" in content
    assert "id=\"fhw-risk-filter\"" in content
    assert "<select" in content

    # Direct phone/teleconsultation CTA on beneficiary cards must be removed
    assert "Connect Patient to Doctor" not in content
    assert "Assisted Teleconsultation" not in content


def test_referrals_page_audit_timeline_and_filters():
    """Verify referrals page has animated dropdowns, audit timeline in facility bar, and no docstrings."""
    referrals_path = os.path.join(ROOT_DIR, "frontend", "app", "(dashboard)", "referrals", "page.tsx")
    assert os.path.exists(referrals_path)
    with open(referrals_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Filters must exist
    assert "id=\"referral-status-filter\"" in content
    assert "id=\"referral-urgency-filter\"" in content
    assert "AnimatedSelect" in content

    # Embedded audit timeline in facility bar must be present
    assert "Audit Timeline" in content

    # Clinical reason docstring under the bar must be removed
    assert "line-clamp-1 italic" not in content


def test_telemedicine_page_removed_secure_session():
    """Verify telemedicine page has ASHA patient-first handoff and removed the Secure Session card."""
    telemed_path = os.path.join(ROOT_DIR, "frontend", "app", "(dashboard)", "telemedicine", "page.tsx")
    assert os.path.exists(telemed_path)
    with open(telemed_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Secure Session card must be removed
    assert "One tap starts a protected consultation session" not in content
    assert "Select Patient Before Doctor" in content
    assert "Patient / Beneficiary" in content
    assert "Choose Doctor for Selected Patient" in content
    assert "Connect Patient" in content


def test_clean_headings_without_descriptive_definitions():
    """Verify pages have clean headings without redundant descriptive paragraphs."""
    pages_to_check = [
        os.path.join(ROOT_DIR, "frontend", "app", "(dashboard)", "fhw", "page.tsx"),
        os.path.join(ROOT_DIR, "frontend", "app", "(dashboard)", "facility", "page.tsx"),
        os.path.join(ROOT_DIR, "frontend", "app", "(dashboard)", "drug-checker", "page.tsx"),
        os.path.join(ROOT_DIR, "frontend", "app", "(dashboard)", "referrals", "page.tsx"),
        os.path.join(ROOT_DIR, "frontend", "app", "(dashboard)", "triage", "page.tsx"),
        os.path.join(ROOT_DIR, "frontend", "app", "(dashboard)", "telemedicine", "page.tsx"),
    ]

    for p in pages_to_check:
        assert os.path.exists(p)
        with open(p, "r", encoding="utf-8") as f:
            content = f.read()
        # Verify specific removed descriptive paragraphs are gone
        assert "Proactive community surveillance for maternal ANC" not in content
        assert "Manage your facility's doctor roster" not in content
        assert "Real-time polypharmacy interaction screening" not in content
        assert "Structured continuity of care linking Ayushman" not in content
        assert "Rule-based urgency classification connecting rural" not in content
        assert "Choose a doctor and move directly into a secure consultation" not in content


def test_patient_portal_removed_symptom_triage():
    """Verify Symptom Triage is removed from Patient Portal while preserved for other staff portals."""
    # 1. SideNavBar check
    nav_path = os.path.join(ROOT_DIR, "frontend", "components", "layout", "SideNavBar.tsx")
    assert os.path.exists(nav_path)
    with open(nav_path, "r", encoding="utf-8") as f:
        nav_content = f.read()

    # Patient nav items must NOT have Symptom Triage or /triage
    patient_nav_block = nav_content.split("PATIENT_NAV_ITEMS = [")[1].split("];")[0]
    assert "Symptom Triage" not in patient_nav_block
    assert "/triage" not in patient_nav_block

    # FHW nav items MUST still have Community Triage
    fhw_nav_block = nav_content.split("FHW_NAV_ITEMS = [")[1].split("];")[0]
    assert "Community Triage" in fhw_nav_block
    assert "/triage" in fhw_nav_block

    # 2. Patient Dashboard check
    dash_path = os.path.join(ROOT_DIR, "frontend", "app", "(dashboard)", "dashboard", "page.tsx")
    assert os.path.exists(dash_path)
    with open(dash_path, "r", encoding="utf-8") as f:
        dash_content = f.read()
    assert "Symptom Checker" not in dash_content
    assert "router.push('/triage')" not in dash_content

    # 3. Triage route guard check
    triage_path = os.path.join(ROOT_DIR, "frontend", "app", "(dashboard)", "triage", "page.tsx")
    assert os.path.exists(triage_path)
    with open(triage_path, "r", encoding="utf-8") as f:
        triage_content = f.read()
    assert "userRole === 'patient'" in triage_content
    assert "router.replace('/dashboard')" in triage_content

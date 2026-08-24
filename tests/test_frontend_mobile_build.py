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
        "app/(dashboard)/doctor/clinical-schedule/page.tsx",
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
        "app/(dashboard)/bluetooth/page.tsx",
        "app/(dashboard)/bluetooth/fhw/page.tsx",
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


def test_clean_headings_without_descriptive_definitions():
    """Verify pages have clean headings without redundant descriptive paragraphs."""
    pages_to_check = [
        os.path.join(ROOT_DIR, "frontend", "app", "(dashboard)", "fhw", "page.tsx"),
        os.path.join(ROOT_DIR, "frontend", "app", "(dashboard)", "facility", "page.tsx"),
        os.path.join(ROOT_DIR, "frontend", "app", "(dashboard)", "drug-checker", "page.tsx"),
        os.path.join(ROOT_DIR, "frontend", "app", "(dashboard)", "referrals", "page.tsx"),
        os.path.join(ROOT_DIR, "frontend", "app", "(dashboard)", "triage", "page.tsx"),
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


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
        "app/doctor/page.tsx",
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

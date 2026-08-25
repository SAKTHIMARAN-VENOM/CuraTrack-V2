import sys
import os
import pytest
from fastapi.testclient import TestClient

# Add backend directory and root directory to sys.path for cross-platform CI import compatibility
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")

if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

try:
    from main import app
except ImportError:
    from backend.main import app


@pytest.fixture(scope="session")
def client():
    """
    FastAPI TestClient fixture for running in-memory HTTP requests against all routes.
    """
    with TestClient(app) as test_client:
        yield test_client

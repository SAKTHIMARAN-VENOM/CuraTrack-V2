import sys
import os
import pytest
from fastapi.testclient import TestClient

# Add backend directory to sys.path so tests can import backend modules directly
BACKEND_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from main import app

@pytest.fixture(scope="session")
def client():
    """
    FastAPI TestClient fixture for running in-memory HTTP requests against all routes.
    """
    with TestClient(app) as test_client:
        yield test_client

"""
Unit tests for Sarvam AI Translation Service and API endpoints in CuraTrack-V2.
"""

import os
import sys
import pytest
from fastapi.testclient import TestClient

# Ensure backend directory is in sys.path
BACKEND_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from backend.main import app

try:
    from backend.services.sarvam_translation import (
        translate_batch,
        clear_translation_cache,
        get_cache_size,
        _TRANSLATION_CACHE
    )
except ImportError:
    from services.sarvam_translation import (
        translate_batch,
        clear_translation_cache,
        get_cache_size,
        _TRANSLATION_CACHE
    )

client = TestClient(app)


def test_translation_service_status():
    """Verify translation status endpoint returns active supported languages."""
    res = client.get("/api/translation/status")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "online"
    assert "hi" in data["supported_languages"]
    assert "mr" in data["supported_languages"]
    assert "ta" in data["supported_languages"]
    assert "en" in data["supported_languages"]


def test_translate_endpoint_batch():
    """Test batch translation API endpoint with multiple strings."""
    clear_translation_cache()
    # Seed cache in the shared services module
    _TRANSLATION_CACHE["en:hi:Dashboard"] = "डैशबोर्ड"
    _TRANSLATION_CACHE["en:hi:Appointments"] = "अपॉइंटमेंट"

    payload = {
        "texts": ["Dashboard", "Appointments", "100", "Doctor Name"],
        "source_language": "en",
        "target_language": "hi"
    }

    res = client.post("/api/translation/translate", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert len(data["translations"]) == 4
    assert data["translations"][0] == "डैशबोर्ड"
    assert data["translations"][1] == "अपॉइंटमेंट"
    assert data["translations"][2] == "100"  # Numeric unchanged


def test_translate_endpoint_invalid_language():
    """Test that invalid language codes return 400 Bad Request."""
    payload = {
        "texts": ["Hello"],
        "source_language": "en",
        "target_language": "fr"
    }
    res = client.post("/api/translation/translate", json=payload)
    assert res.status_code == 400
    assert "Unsupported target language" in res.json()["detail"]


def test_translate_batch_direct_function():
    """Test translate_batch direct function with cache and Sarvam API."""
    clear_translation_cache()
    _TRANSLATION_CACHE["en:mr:Emergency"] = "आणीबाणी"

    results = translate_batch(["Emergency", "Hospital"], source_lang="en", target_lang="mr")
    assert results[0] == "आणीबाणी"
    assert len(results) == 2
    assert isinstance(results[1], str) and len(results[1]) > 0

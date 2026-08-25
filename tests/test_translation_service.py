"""
Unit tests for Sarvam AI Translation Service and API endpoints in CuraTrack-V2.
"""

import pytest


def test_translation_service_status(client):
    """Verify translation status endpoint returns active supported languages."""
    res = client.get("/api/translation/status")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "online"
    assert "hi" in data["supported_languages"]
    assert "mr" in data["supported_languages"]
    assert "ta" in data["supported_languages"]
    assert "en" in data["supported_languages"]


def test_translate_endpoint_batch(client):
    """Test batch translation API endpoint with multiple strings."""
    payload = {
        "texts": ["Dashboard", "Appointments", "100", "Doctor Name"],
        "source_language": "en",
        "target_language": "hi"
    }

    res = client.post("/api/translation/translate", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert len(data["translations"]) == 4
    assert isinstance(data["translations"][0], str) and len(data["translations"][0]) > 0
    assert isinstance(data["translations"][1], str) and len(data["translations"][1]) > 0
    assert data["translations"][2] == "100"  # Numeric unchanged


def test_translate_endpoint_invalid_language(client):
    """Test that invalid language codes return 400 Bad Request."""
    payload = {
        "texts": ["Hello"],
        "source_language": "en",
        "target_language": "fr"
    }
    res = client.post("/api/translation/translate", json=payload)
    assert res.status_code == 400
    assert "Unsupported target language" in res.json()["detail"]


def test_translate_same_language(client):
    """Test translating to same language returns original text immediately."""
    payload = {
        "texts": ["Emergency Department", "Appointments"],
        "source_language": "en",
        "target_language": "en"
    }
    res = client.post("/api/translation/translate", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["translations"] == ["Emergency Department", "Appointments"]

"""
Unit tests for Sarvam AI Translation Service and API endpoints in CuraTrack-V2.
All external network calls to Sarvam AI are safely mocked.
"""

from unittest.mock import patch, MagicMock
import pytest
from backend.services.sarvam_translation import (
    translate_batch,
    translate_single_sarvam,
    clear_translation_cache,
    get_cache_size,
    _TRANSLATION_CACHE
)


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


def test_translate_endpoint_batch_mocked(client):
    """Test batch translation API endpoint with mocked Sarvam API response."""
    clear_translation_cache()

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"translated_text": "डैशबोर्ड"}

    with patch("requests.post", return_value=mock_resp):
        payload = {
            "texts": ["Dashboard", "100", ""],
            "source_language": "en",
            "target_language": "hi"
        }
        res = client.post("/api/translation/translate", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert len(data["translations"]) == 3
        assert data["translations"][0] == "डैशबोर्ड"
        assert data["translations"][1] == "100"  # Numbers preserved
        assert data["translations"][2] == ""  # Empty string preserved


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
    """Test translating to same language returns original text immediately without calling API."""
    payload = {
        "texts": ["Emergency Department", "Appointments"],
        "source_language": "en",
        "target_language": "en"
    }
    with patch("requests.post") as mock_post:
        res = client.post("/api/translation/translate", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["translations"] == ["Emergency Department", "Appointments"]
        mock_post.assert_not_called()


def test_translation_caching_behavior():
    """Verify that identical translation requests hit memory cache instead of Sarvam API."""
    clear_translation_cache()

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"translated_text": "रुग्णालय"}

    with patch("os.getenv", return_value="mock_api_key"):
        with patch("requests.post", return_value=mock_resp) as mock_post:
            # First call -> triggers mocked network call
            res1 = translate_batch(["Hospital"], source_lang="en", target_lang="mr")
            assert res1[0] == "रुग्णालय"
            assert mock_post.call_count == 1

            # Second call for same text -> must use cache, call count remains 1
            res2 = translate_batch(["Hospital"], source_lang="en", target_lang="mr")
            assert res2[0] == "रुग्णालय"
            assert mock_post.call_count == 1
            assert get_cache_size() >= 1


def test_translation_fallback_on_api_error():
    """Verify that network exceptions or HTTP 500 fall back to original text without crashing."""
    clear_translation_cache()

    mock_resp = MagicMock()
    mock_resp.status_code = 500
    mock_resp.text = "Internal Server Error"

    with patch("os.getenv", return_value="mock_api_key"):
        with patch("requests.post", return_value=mock_resp):
            res = translate_batch(["Clinical Consultation"], source_lang="en", target_lang="ta")
            # Should safely fallback to original text
            assert res[0] == "Clinical Consultation"


def test_translation_missing_api_key_fallback():
    """Verify that when no API key is set, texts gracefully pass through untranslated."""
    clear_translation_cache()

    with patch("os.getenv", return_value=None):
        with patch("requests.post") as mock_post:
            res = translate_batch(["Active Regimen"], source_lang="en", target_lang="hi")
            assert res[0] == "Active Regimen"
            mock_post.assert_not_called()

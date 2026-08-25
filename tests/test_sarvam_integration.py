"""
Integration tests for real Sarvam AI API communication.
Executes live Sarvam AI Translation API calls when SARVAM_API_KEY is available in the environment.
"""

import os
import pytest
from dotenv import load_dotenv

load_dotenv("backend/.env")

try:
    from backend.services.sarvam_translation import (
        translate_batch,
        translate_single_sarvam,
        get_sarvam_api_key,
        clear_translation_cache,
    )
except ImportError:
    from services.sarvam_translation import (  # type: ignore
        translate_batch,
        translate_single_sarvam,
        get_sarvam_api_key,
        clear_translation_cache,
    )


def test_live_sarvam_api_translation():
    """
    Tests live translation of English UI phrases into Tamil, Hindi, and Marathi.
    Validates that the real Sarvam AI endpoint responds with genuine translations.
    """
    api_key = get_sarvam_api_key()
    if not api_key:
        pytest.skip("SARVAM_API_KEY not configured in environment, skipping live integration test.")

    clear_translation_cache()

    test_phrases = ["Welcome to CuraTrack", "Clinical OPD Queue", "Emergency Self-Triage"]

    # 1. Test Tamil Translation
    tamil_results, tamil_map, tamil_err = translate_batch(test_phrases, source_lang="en", target_lang="ta")
    assert tamil_err is None, f"Tamil translation failed: {tamil_err}"
    assert len(tamil_results) == 3
    # Check that returned text is not identical to English (i.e. has Tamil characters)
    for original, translated in zip(test_phrases, tamil_results):
        assert translated != original
        assert len(translated) > 0
        assert original in tamil_map

    # 2. Test Hindi Translation
    hindi_results, hindi_map, hindi_err = translate_batch(test_phrases, source_lang="en", target_lang="hi")
    assert hindi_err is None, f"Hindi translation failed: {hindi_err}"
    assert len(hindi_results) == 3
    for original, translated in zip(test_phrases, hindi_results):
        assert translated != original
        assert len(translated) > 0

    # 3. Test Marathi Translation
    marathi_results, marathi_map, marathi_err = translate_batch(test_phrases, source_lang="en", target_lang="mr")
    assert marathi_err is None, f"Marathi translation failed: {marathi_err}"
    assert len(marathi_results) == 3
    for original, translated in zip(test_phrases, marathi_results):
        assert translated != original
        assert len(translated) > 0

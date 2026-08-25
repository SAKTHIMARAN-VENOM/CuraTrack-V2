"""
Sarvam AI Translation Service for CuraTrack-V2.
Provides real-time, cached, batch translation across English, Hindi, Marathi, and Tamil.
Respects rate limits, timeouts, and fallback mechanisms.
"""

import os
import time
import logging
from typing import List, Dict, Optional
import requests

logger = logging.getLogger("curatrack.sarvam_translation")

SARVAM_API_URL = "https://api.sarvam.ai/translate"
SUPPORTED_LANGUAGES = {"en", "hi", "mr", "ta"}

SARVAM_LANG_MAP = {
    "en": "en-IN",
    "hi": "hi-IN",
    "mr": "mr-IN",
    "ta": "ta-IN",
}

# In-memory LRU/Dictionary cache: "src:tgt:text" -> "translated_text"
_TRANSLATION_CACHE: Dict[str, str] = {}


def get_sarvam_api_key() -> Optional[str]:
    """Retrieve Sarvam API Key from environment."""
    return os.getenv("SARVAM_API_KEY") or os.getenv("SARVAM_API_SUBSCRIPTION_KEY")


def translate_single_sarvam(
    text: str,
    source_lang: str,
    target_lang: str,
    api_key: str,
    timeout: float = 6.0,
    max_retries: int = 2
) -> str:
    """
    Calls Sarvam AI translate endpoint for a single text chunk.
    Implements retry on rate-limit (HTTP 429) or transient server errors.
    """
    src_code = SARVAM_LANG_MAP.get(source_lang, "en-IN")
    tgt_code = SARVAM_LANG_MAP.get(target_lang, "hi-IN")

    payload = {
        "input": text,
        "source_language_code": src_code,
        "target_language_code": tgt_code,
        "speaker_gender": "Male",
        "mode": "formal",
        "model": "mayura:v1",
        "enable_preprocessing": True
    }

    headers = {
        "api-subscription-key": api_key.strip(),
        "Content-Type": "application/json"
    }

    for attempt in range(max_retries + 1):
        try:
            response = requests.post(
                SARVAM_API_URL,
                json=payload,
                headers=headers,
                timeout=timeout
            )
            if response.status_code == 200:
                data = response.json()
                translated = data.get("translated_text")
                if translated:
                    return translated.strip()
            elif response.status_code == 429:
                # Rate limit encountered - sleep briefly and retry
                time.sleep(0.5 * (attempt + 1))
                continue
            else:
                logger.warning(
                    "Sarvam translation API returned status %s: %s",
                    response.status_code,
                    response.text[:200]
                )
                break
        except requests.exceptions.RequestException as ex:
            logger.warning("Sarvam translation network exception: %s", ex)
            if attempt < max_retries:
                time.sleep(0.3 * (attempt + 1))
            else:
                break

    return text


def translate_batch(
    texts: List[str],
    source_lang: str = "en",
    target_lang: str = "hi"
) -> List[str]:
    """
    Translate a batch of UI texts from source_lang to target_lang.
    Uses cached translations when available, and queries Sarvam AI for uncached texts.
    Falls back gracefully to original text if translation fails or key is missing.
    """
    if not texts:
        return []

    source_lang = source_lang.lower().strip()
    target_lang = target_lang.lower().strip()

    # If same language or unsupported target, return original texts
    if source_lang == target_lang or target_lang not in SUPPORTED_LANGUAGES:
        return texts

    api_key = get_sarvam_api_key()
    results: List[str] = []
    uncached_indices: List[int] = []
    uncached_texts: List[str] = []

    for idx, raw_text in enumerate(texts):
        if not raw_text or not raw_text.strip():
            results.append(raw_text)
            continue

        stripped = raw_text.strip()

        # Don't translate pure numbers or simple punctuation
        if stripped.replace(".", "").replace(",", "").replace("%", "").replace(":", "").replace("-", "").isdigit():
            results.append(raw_text)
            continue

        cache_key = f"{source_lang}:{target_lang}:{stripped}"
        if cache_key in _TRANSLATION_CACHE:
            results.append(_TRANSLATION_CACHE[cache_key])
        else:
            # Placeholder for uncached translation
            results.append(raw_text)
            uncached_indices.append(idx)
            uncached_texts.append(stripped)

    # If all were cached or no API key, return immediately
    if not uncached_texts or not api_key:
        return results

    # Process uncached strings with Sarvam AI
    for u_idx, text_to_translate in zip(uncached_indices, uncached_texts):
        translated = translate_single_sarvam(
            text=text_to_translate,
            source_lang=source_lang,
            target_lang=target_lang,
            api_key=api_key
        )
        cache_key = f"{source_lang}:{target_lang}:{text_to_translate}"
        _TRANSLATION_CACHE[cache_key] = translated
        results[u_idx] = translated

    return results


def clear_translation_cache():
    """Clear memory cache."""
    _TRANSLATION_CACHE.clear()


def get_cache_size() -> int:
    """Return number of cached translations."""
    return len(_TRANSLATION_CACHE)

"""
Sarvam AI Translation Service for CuraTrack-V2.
Provides real-time, cached, high-throughput concurrent batch translation
across English, Hindi, Marathi, and Tamil using ThreadPoolExecutor.
Communicates directly with the Sarvam AI Translation API (https://api.sarvam.ai/translate).
Never logs or exposes API keys or sensitive health data.
"""

import os
import time
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict, Tuple, Optional
import requests

logger = logging.getLogger("curatrack.sarvam_translation")

SARVAM_API_URL = "https://api.sarvam.ai/translate"
SUPPORTED_LANGUAGES = {"en", "hi", "mr", "ta"}

# Standard BCP-47 language codes expected by Sarvam AI
SARVAM_LANG_MAP = {
    "en": "en-IN",
    "hi": "hi-IN",
    "mr": "mr-IN",
    "ta": "ta-IN",
}

# In-memory translation cache: "src:tgt:text" -> "translated_text"
_TRANSLATION_CACHE: Dict[str, str] = {}


def get_sarvam_api_key() -> Optional[str]:
    """Retrieve Sarvam API Key from environment."""
    key = os.getenv("SARVAM_API_KEY") or os.getenv("SARVAM_API_SUBSCRIPTION_KEY")
    if key and key.strip():
        return key.strip()
    return None


def is_pure_numeric_or_symbol(text: str) -> bool:
    """Check if a string is pure numbers, punctuation, or whitespace that shouldn't be translated."""
    stripped = text.strip()
    if not stripped:
        return True
    cleaned = stripped.replace(".", "").replace(",", "").replace("%", "").replace(":", "").replace("-", "").replace("/", "").replace("+", "").replace("#", "").replace("•", "").replace("(", "").replace(")", "")
    return cleaned.isdigit()


def translate_single_sarvam(
    text: str,
    source_lang: str,
    target_lang: str,
    api_key: str,
    timeout: float = 8.0,
    max_retries: int = 2
) -> Tuple[str, Optional[str]]:
    """
    Calls Sarvam AI translate endpoint for a single text chunk.
    Returns: (translated_text, error_message)
    """
    src_code = SARVAM_LANG_MAP.get(source_lang, "en-IN")
    tgt_code = SARVAM_LANG_MAP.get(target_lang, "hi-IN")

    cleaned_input = text.strip()
    if len(cleaned_input) > 1000:
        cleaned_input = cleaned_input[:1000]

    payload = {
        "input": cleaned_input,
        "source_language_code": src_code,
        "target_language_code": tgt_code,
        "model": "mayura:v1",
        "mode": "formal"
    }

    headers = {
        "api-subscription-key": api_key,
        "Content-Type": "application/json"
    }

    last_error: Optional[str] = None

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
                if translated and translated.strip():
                    return translated.strip(), None
                return text, "Malformed response from Sarvam AI"

            elif response.status_code in (401, 403):
                logger.warning("Sarvam AI authentication failure (HTTP %s)", response.status_code)
                return text, "Sarvam API authentication failed (invalid or expired subscription key)"

            elif response.status_code == 429:
                last_error = "Sarvam API rate limit exceeded"
                logger.warning("Sarvam AI rate limited (HTTP 429), attempt %d of %d", attempt + 1, max_retries + 1)
                if attempt < max_retries:
                    time.sleep(0.5 * (attempt + 1))
                    continue
                return text, last_error

            elif response.status_code == 400:
                last_error = "Sarvam API bad request (HTTP 400)"
                logger.warning("Sarvam AI bad request: %s", response.text[:200])
                return text, last_error

            else:
                last_error = f"Sarvam API error (HTTP {response.status_code})"
                logger.warning("Sarvam AI returned unexpected status %s", response.status_code)
                if attempt < max_retries:
                    time.sleep(0.3 * (attempt + 1))
                    continue
                return text, last_error

        except requests.exceptions.Timeout:
            last_error = "Sarvam API request timed out"
            logger.warning("Sarvam AI request timed out on attempt %d", attempt + 1)
            if attempt < max_retries:
                time.sleep(0.4)
                continue
            return text, last_error

        except requests.exceptions.RequestException as ex:
            last_error = f"Sarvam API network error: {type(ex).__name__}"
            logger.warning("Sarvam AI network exception on attempt %d: %s", attempt + 1, ex)
            if attempt < max_retries:
                time.sleep(0.4)
                continue
            return text, last_error

    return text, last_error or "Translation failed"


def translate_batch(
    texts: List[str],
    source_lang: str = "en",
    target_lang: str = "hi"
) -> Tuple[List[str], Dict[str, str], Optional[str]]:
    """
    Translate a batch of UI texts from source_lang to target_lang concurrently.
    Uses in-memory cache for instant returns, and ThreadPoolExecutor for fast parallel API calls.
    Returns: (translations_list, translations_map, error_if_any)
    """
    if not texts:
        return [], {}, None

    source_lang = source_lang.lower().strip()
    target_lang = target_lang.lower().strip()

    # Same language -> no translation needed
    if source_lang == target_lang:
        identity_map = {t: t for t in texts if t}
        return texts, identity_map, None

    if target_lang not in SUPPORTED_LANGUAGES:
        return texts, {}, f"Unsupported target language: {target_lang}"

    if source_lang not in SUPPORTED_LANGUAGES:
        return texts, {}, f"Unsupported source language: {source_lang}"

    api_key = get_sarvam_api_key()
    if not api_key:
        logger.warning("Sarvam API key missing in environment")
        return texts, {}, "Sarvam API key is not configured on the backend"

    results: List[str] = []
    translations_map: Dict[str, str] = {}
    uncached_indices: List[int] = []
    uncached_texts: List[str] = []

    for idx, raw_text in enumerate(texts):
        if raw_text is None:
            results.append("")
            continue

        if not raw_text or not raw_text.strip() or is_pure_numeric_or_symbol(raw_text):
            results.append(raw_text)
            translations_map[raw_text] = raw_text
            continue

        stripped = raw_text.strip()
        cache_key = f"{source_lang}:{target_lang}:{stripped}"

        if cache_key in _TRANSLATION_CACHE:
            cached_val = _TRANSLATION_CACHE[cache_key]
            results.append(cached_val)
            translations_map[raw_text] = cached_val
            translations_map[stripped] = cached_val
        else:
            results.append(raw_text)
            uncached_indices.append(idx)
            uncached_texts.append(stripped)

    if not uncached_texts:
        return results, translations_map, None

    # Deduplicate uncached strings to avoid redundant Sarvam API calls
    unique_uncached_list = list(set(uncached_texts))
    unique_translations: Dict[str, str] = {}
    last_error: Optional[str] = None

    logger.info("Sarvam AI translating batch: %d unique strings in parallel (%s -> %s)", len(unique_uncached_list), source_lang, target_lang)

    max_workers = min(12, max(1, len(unique_uncached_list)))
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_text = {
            executor.submit(
                translate_single_sarvam,
                text=text_chunk,
                source_lang=source_lang,
                target_lang=target_lang,
                api_key=api_key
            ): text_chunk
            for text_chunk in unique_uncached_list
        }

        for future in as_completed(future_to_text):
            text_chunk = future_to_text[future]
            try:
                translated_chunk, err = future.result()
                if err:
                    last_error = err
                else:
                    cache_key = f"{source_lang}:{target_lang}:{text_chunk}"
                    _TRANSLATION_CACHE[cache_key] = translated_chunk

                unique_translations[text_chunk] = translated_chunk
            except Exception as e:
                logger.warning("Translation worker exception for '%s': %s", text_chunk, e)
                unique_translations[text_chunk] = text_chunk

    # Populate results
    for u_idx, original_text in zip(uncached_indices, uncached_texts):
        translated_val = unique_translations.get(original_text, original_text)
        results[u_idx] = translated_val
        translations_map[original_text] = translated_val
        translations_map[texts[u_idx]] = translated_val

    return results, translations_map, last_error


def clear_translation_cache():
    """Clear memory cache."""
    _TRANSLATION_CACHE.clear()


def get_cache_size() -> int:
    """Return number of cached translations."""
    return len(_TRANSLATION_CACHE)

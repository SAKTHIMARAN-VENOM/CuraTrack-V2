"""
FastAPI Route for Multilingual Translation using Sarvam AI.
Provides full-page UI translation endpoints with batching, server-side caching, and error safety.
"""

from typing import List, Dict, Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

try:
    from backend.services.sarvam_translation import (
        translate_batch,
        SUPPORTED_LANGUAGES,
        get_cache_size,
        get_sarvam_api_key,
    )
except ImportError:
    from services.sarvam_translation import (  # type: ignore
        translate_batch,
        SUPPORTED_LANGUAGES,
        get_cache_size,
        get_sarvam_api_key,
    )

router = APIRouter(prefix="/translation", tags=["Translation"])


class TranslationBatchRequest(BaseModel):
    texts: List[str] = Field(..., description="List of UI strings to translate")
    source_language: str = Field("en", description="Source language code (en, hi, mr, ta)")
    target_language: str = Field(..., description="Target language code (en, hi, mr, ta)")


class TranslationBatchResponse(BaseModel):
    success: bool = Field(True, description="Whether translation succeeded or partially succeeded")
    error: Optional[str] = Field(None, description="Safe error message if translation failed")
    translations: List[str] = Field(..., description="Ordered translated strings matching requested texts")
    translations_map: Dict[str, str] = Field(default_factory=dict, description="Dictionary mapping original text to translated text")
    source_language: str
    target_language: str
    sarvam_configured: bool
    cached_entries: int


@router.post("/translate", response_model=TranslationBatchResponse)
async def translate_ui_batch(payload: TranslationBatchRequest):
    """
    Translate a batch of UI text strings to the target language via Sarvam AI.
    Utilizes in-memory caching and batching.
    """
    if payload.target_language not in SUPPORTED_LANGUAGES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported target language: {payload.target_language}. Supported: {sorted(list(SUPPORTED_LANGUAGES))}"
        )

    if payload.source_language not in SUPPORTED_LANGUAGES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported source language: {payload.source_language}. Supported: {sorted(list(SUPPORTED_LANGUAGES))}"
        )

    is_configured = bool(get_sarvam_api_key())

    # If source and target are the same, return as-is
    if payload.source_language == payload.target_language:
        identity_map = {t: t for t in payload.texts if t}
        return TranslationBatchResponse(
            success=True,
            error=None,
            translations=payload.texts,
            translations_map=identity_map,
            source_language=payload.source_language,
            target_language=payload.target_language,
            sarvam_configured=is_configured,
            cached_entries=get_cache_size()
        )

    # If API key is missing, return safe error with fallback texts
    if not is_configured:
        identity_map = {t: t for t in payload.texts if t}
        return TranslationBatchResponse(
            success=False,
            error="Sarvam API key is not configured on the backend",
            translations=payload.texts,
            translations_map=identity_map,
            source_language=payload.source_language,
            target_language=payload.target_language,
            sarvam_configured=False,
            cached_entries=get_cache_size()
        )

    try:
        translated_results, trans_map, err = translate_batch(
            texts=payload.texts,
            source_lang=payload.source_language,
            target_lang=payload.target_language
        )

        return TranslationBatchResponse(
            success=err is None,
            error=err,
            translations=translated_results,
            translations_map=trans_map,
            source_language=payload.source_language,
            target_language=payload.target_language,
            sarvam_configured=is_configured,
            cached_entries=get_cache_size()
        )
    except Exception as ex:
        identity_map = {t: t for t in payload.texts if t}
        return TranslationBatchResponse(
            success=False,
            error=f"Translation error: {type(ex).__name__}",
            translations=payload.texts,
            translations_map=identity_map,
            source_language=payload.source_language,
            target_language=payload.target_language,
            sarvam_configured=is_configured,
            cached_entries=get_cache_size()
        )


@router.get("/status")
async def get_translation_status():
    """
    Check the operational status of the Sarvam translation service.
    """
    api_key = get_sarvam_api_key()
    return {
        "status": "online",
        "service": "sarvam-ai-translate",
        "supported_languages": sorted(list(SUPPORTED_LANGUAGES)),
        "sarvam_configured": bool(api_key),
        "cached_entries": get_cache_size()
    }

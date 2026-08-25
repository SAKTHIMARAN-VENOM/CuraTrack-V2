"""
FastAPI Route for Multilingual Translation using Sarvam AI.
Provides full-page UI translation endpoints with batching and server-side caching.
"""

from typing import List, Optional
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
    from services.sarvam_translation import (
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
    translations: List[str]
    source_language: str
    target_language: str
    sarvam_configured: bool
    cached_entries: int


@router.post("/translate", response_model=TranslationBatchResponse)
async def translate_ui_batch(payload: TranslationBatchRequest):
    """
    Translate a batch of UI text strings to the target language.
    Utilizes in-memory caching and batching with Sarvam AI API.
    """
    if payload.target_language not in SUPPORTED_LANGUAGES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported target language: {payload.target_language}. Supported: {list(SUPPORTED_LANGUAGES)}"
        )

    if payload.source_language not in SUPPORTED_LANGUAGES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported source language: {payload.source_language}. Supported: {list(SUPPORTED_LANGUAGES)}"
        )

    # If source and target are the same, return as-is
    if payload.source_language == payload.target_language:
        return TranslationBatchResponse(
            translations=payload.texts,
            source_language=payload.source_language,
            target_language=payload.target_language,
            sarvam_configured=bool(get_sarvam_api_key()),
            cached_entries=get_cache_size()
        )

    try:
        translated_results = translate_batch(
            texts=payload.texts,
            source_lang=payload.source_language,
            target_lang=payload.target_language
        )

        return TranslationBatchResponse(
            translations=translated_results,
            source_language=payload.source_language,
            target_language=payload.target_language,
            sarvam_configured=bool(get_sarvam_api_key()),
            cached_entries=get_cache_size()
        )
    except Exception as exc:
        # Fall back to original texts on error so UI never crashes
        return TranslationBatchResponse(
            translations=payload.texts,
            source_language=payload.source_language,
            target_language=payload.target_language,
            sarvam_configured=bool(get_sarvam_api_key()),
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
        "supported_languages": SUPPORTED_LANGUAGES,
        "sarvam_configured": bool(api_key),
        "cached_entries": get_cache_size()
    }

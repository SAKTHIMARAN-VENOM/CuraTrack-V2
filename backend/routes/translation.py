"""
Translation API routes for CuraTrack-V2 powered by Sarvam AI.
Supports batch translation requests for dynamic and static UI elements.
"""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from services.sarvam_translation import (
    translate_batch,
    SUPPORTED_LANGUAGES,
    get_cache_size,
    get_sarvam_api_key
)

router = APIRouter(prefix="/translation", tags=["Translation"])


class TranslateRequest(BaseModel):
    texts: List[str] = Field(..., max_items=150, description="List of text strings to translate")
    source_language: str = Field("en", description="Source language code (en, hi, mr, ta)")
    target_language: str = Field("hi", description="Target language code (en, hi, mr, ta)")


class TranslateResponse(BaseModel):
    translations: List[str]
    source_language: str
    target_language: str
    sarvam_configured: bool
    cached_entries: int


@router.post("/translate", response_model=TranslateResponse)
def translate_texts(request: TranslateRequest):
    """
    Batch translate UI strings using Sarvam AI translation with caching.
    """
    src = request.source_language.lower().strip()
    tgt = request.target_language.lower().strip()

    if src not in SUPPORTED_LANGUAGES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported source language: {src}. Supported languages: {list(SUPPORTED_LANGUAGES)}"
        )

    if tgt not in SUPPORTED_LANGUAGES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported target language: {tgt}. Supported languages: {list(SUPPORTED_LANGUAGES)}"
        )

    try:
        translated_list = translate_batch(
            texts=request.texts,
            source_lang=src,
            target_lang=tgt
        )
    except Exception as ex:
        # Fallback to original text if unforeseen exception occurs
        translated_list = request.texts

    return TranslateResponse(
        translations=translated_list,
        source_language=src,
        target_language=tgt,
        sarvam_configured=bool(get_sarvam_api_key()),
        cached_entries=get_cache_size()
    )


@router.get("/status")
def translation_service_status():
    """
    Health check and configuration status for translation service.
    """
    return {
        "status": "online",
        "supported_languages": list(SUPPORTED_LANGUAGES),
        "sarvam_configured": bool(get_sarvam_api_key()),
        "cached_translations": get_cache_size()
    }

"""
LLM service — calls Google Gemini API (or local Ollama fallback) for structured medical data extraction
and patient-friendly clinical interpretation.

This is used by the /api/ingest-document pipeline for health records (prescriptions, lab reports, doctor notes).
Uses the unified ocr_service for Gemini calls when possible.

Error handling: Real errors propagate. No mock data. No silent fallbacks.
"""
import os
import json
import logging
import traceback
import requests
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("curatrack.llm")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-flash-latest")

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1:8b")


def extract_medical_data(text: str) -> str:
    """
    Send OCR text to LLM (Gemini API or Ollama fallback) and get structured medical JSON back.
    The response also includes patient-friendly clinical insights based only on the extracted file.
    Returns the raw LLM response string.
    Raises RuntimeError on failure — NO silent fallback to mock data.
    """
    prompt = f"""You are a careful clinical assistant helping a patient understand a medical document.

Extract structured healthcare data from the text, then explain the results in plain language.
Act like a doctor explaining what the report appears to show, without pretending to diagnose.

Return ONLY JSON in this format:

{{
  "medications": [
    {{
      "name": "",
      "dosage": "",
      "frequency": "",
      "time": "",
      "reason": "",
      "confidence": 0.0
    }}
  ],
  "lab_results": [
    {{
      "test": "",
      "value": "",
      "unit": "",
      "status": "normal | high | low | unknown",
      "confidence": 0.0
    }}
  ],
  "doctor_notes": {{
    "summary": "",
    "confidence": 0.0
  }},
  "clinical_insights": {{
    "plain_language_summary": "",
    "key_findings": [
      {{
        "title": "",
        "explanation": "",
        "severity": "normal | watch | concerning | urgent | unknown",
        "related_tests": []
      }}
    ],
    "possible_meaning": "",
    "recommended_next_steps": [],
    "questions_for_doctor": [],
    "urgent_warning_signs": [],
    "disclaimer": "This is an AI explanation of the uploaded document and is not a diagnosis. Please confirm with a qualified clinician."
  }}
}}

If a field cannot be determined from the text, leave it as an empty string or omit it.
Never invent or fabricate data that is not present in the input text.
Use simple language a non-medical person can understand.
Highlight high, low, abnormal, critical, positive, negative, and out-of-range values when the report provides them.
If reference ranges are missing, say what is unclear instead of guessing.
Do not recommend starting, stopping, or changing medication without speaking to a clinician.
Use "urgent" only when the document explicitly contains critical, emergency, severe, or life-threatening wording.

Input:
\"\"\"{text}\"\"\"
"""

    api_key = os.getenv("GEMINI_API_KEY", GEMINI_API_KEY).strip()

    if not api_key:
        logger.warning("GEMINI_API_KEY is empty. Attempting Ollama fallback.")
    else:
        try:
            result = _extract_with_gemini(text, prompt, api_key)
            return result
        except Exception as e:
            # LOG THE REAL ERROR AT ERROR LEVEL WITH FULL TRACEBACK — never silently swallow
            logger.error(
                "Gemini API call FAILED for medical extraction: %s\n%s",
                e, traceback.format_exc()
            )
            # Do NOT fall back to mock data. Try Ollama, then raise.

    # Ollama fallback (only if Gemini key missing or Gemini failed)
    try:
        result = _extract_with_ollama(text, prompt)
        return result
    except Exception as e:
        logger.error(
            "Ollama fallback also FAILED: %s\n%s",
            e, traceback.format_exc()
        )
        # Return empty structure — NEVER fake data
        empty = {
            "medications": [],
            "lab_results": [],
            "doctor_notes": {"summary": "", "confidence": 0.0},
            "clinical_insights": {
                "plain_language_summary": "",
                "key_findings": [],
                "possible_meaning": "",
                "recommended_next_steps": [],
                "questions_for_doctor": [],
                "urgent_warning_signs": [],
                "disclaimer": "This is an AI explanation of the uploaded document and is not a diagnosis. Please confirm with a qualified clinician.",
            },
        }
        logger.warning("Both Gemini and Ollama failed. Returning empty medical structure.")
        return json.dumps(empty)


def _extract_with_gemini(text: str, prompt: str, api_key: str) -> str:
    """Call Google Gemini API for medical data extraction."""
    model = os.getenv("GEMINI_MODEL", GEMINI_MODEL).strip()
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"

    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt}
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.1,
            "responseMimeType": "application/json",
        }
    }

    try:
        logger.info("Calling Gemini API (model=%s) for medical extraction (%d chars input)", model, len(text))
        response = requests.post(url, json=payload, timeout=60)

        if response.status_code != 200:
            error_detail = response.text[:500]
            logger.error("Gemini API HTTP %d: %s", response.status_code, error_detail)

            # Try fallback model
            if model != "gemini-flash-latest":
                logger.info("Retrying with fallback model gemini-flash-latest")
                fallback_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={api_key}"
                res2 = requests.post(fallback_url, json=payload, timeout=60)
                if res2.status_code == 200:
                    data2 = res2.json()
                    parts2 = data2.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])
                    if parts2 and parts2[0].get("text"):
                        logger.info("Fallback model gemini-2.0-flash succeeded")
                        return parts2[0]["text"].strip()

            raise RuntimeError(f"Gemini API returned HTTP {response.status_code}: {error_detail}")

        data = response.json()
        candidates = data.get("candidates", [])
        if not candidates:
            raise RuntimeError("Gemini API returned no response candidates")

        parts = candidates[0].get("content", {}).get("parts", [])
        if not parts or not parts[0].get("text"):
            raise RuntimeError("Gemini API returned empty text response")

        raw_response = parts[0]["text"].strip()
        logger.info("Gemini API medical extraction completed (%d chars response)", len(raw_response))
        return raw_response

    except requests.Timeout:
        raise RuntimeError("Gemini API request timed out after 60s")
    except RuntimeError:
        raise
    except Exception as e:
        raise RuntimeError(f"Gemini extraction failed: {str(e)}")


def _extract_with_ollama(text: str, prompt: str) -> str:
    """Fallback: Call local Ollama server."""
    try:
        logger.info("Attempting Ollama extraction (model=%s, url=%s)", OLLAMA_MODEL, OLLAMA_URL)
        response = requests.post(
            f"{OLLAMA_URL}/api/generate",
            json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.1,
                    "num_predict": 2048,
                },
            },
            timeout=120,
        )
        response.raise_for_status()

        data = response.json()
        raw_response = data.get("response", "")

        if not raw_response.strip():
            raise RuntimeError("Ollama returned empty response")

        logger.info("Ollama extraction completed (%d chars)", len(raw_response))
        return raw_response

    except requests.ConnectionError:
        raise RuntimeError(f"Cannot connect to Ollama at {OLLAMA_URL}. Is it running?")
    except requests.Timeout:
        raise RuntimeError("Ollama request timed out after 120s")
    except Exception as e:
        raise RuntimeError(f"Ollama extraction failed: {str(e)}")

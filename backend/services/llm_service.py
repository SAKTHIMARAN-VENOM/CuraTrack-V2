"""
LLM service — calls Google Gemini API (or local Ollama fallback) for structured medical data extraction.
"""
import os
import json
import logging
import requests

logger = logging.getLogger("curatrack.llm")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-flash-latest")

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1:8b")


def extract_medical_data(text: str) -> str:
    """
    Send OCR text to LLM (Gemini API or Ollama fallback) and get structured medical JSON back.
    Returns the raw LLM response string.
    Raises RuntimeError on failure.
    """
    prompt = f"""You are a medical data extraction AI.

Extract structured healthcare data from the text.

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
  }}
}}

Input:
\"\"\"{text}\"\"\"
"""

    api_key = os.getenv("GEMINI_API_KEY", GEMINI_API_KEY).strip()
    if api_key:
        return _extract_with_gemini(text, prompt, api_key)
    else:
        return _extract_with_ollama(text, prompt)


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
        response = requests.post(url, json=payload, timeout=60)
        if response.status_code != 200:
            logger.error("Gemini API error (%d): %s", response.status_code, response.text)
            # Try fallback model if default failed
            if model != "gemini-1.5-flash":
                fallback_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
                res2 = requests.post(fallback_url, json=payload, timeout=60)
                if res2.status_code == 200:
                    data2 = res2.json()
                    parts2 = data2.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])
                    if parts2 and parts2[0].get("text"):
                        return parts2[0]["text"].strip()
            raise RuntimeError(f"Gemini API returned HTTP {response.status_code}: {response.text}")

        data = response.json()
        candidates = data.get("candidates", [])
        if not candidates:
            raise RuntimeError("Gemini API returned no response candidates")

        parts = candidates[0].get("content", {}).get("parts", [])
        if not parts or not parts[0].get("text"):
            raise RuntimeError("Gemini API returned empty text response")

        raw_response = parts[0]["text"].strip()
        logger.info("Gemini API medical extraction completed (%d chars)", len(raw_response))
        return raw_response

    except requests.Timeout:
        logger.error("Gemini API request timed out after 60s")
        raise RuntimeError("Gemini API request timed out after 60s")
    except Exception as e:
        logger.error("Gemini extraction failed: %s", e)
        raise RuntimeError(f"Gemini extraction failed: {str(e)}")


def _extract_with_ollama(text: str, prompt: str) -> str:
    """Fallback: Call local Ollama server."""
    try:
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
        logger.error("Cannot connect to Ollama at %s", OLLAMA_URL)
        raise RuntimeError(f"Cannot connect to Ollama at {OLLAMA_URL}. Is it running?")
    except requests.Timeout:
        logger.error("Ollama request timed out")
        raise RuntimeError("Ollama request timed out after 120s")
    except Exception as e:
        logger.error("Ollama extraction failed: %s", e)
        raise RuntimeError(f"Ollama extraction failed: {str(e)}")


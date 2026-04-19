"""
LLM service — calls local Ollama (Llama3) for structured medical data extraction.
"""
import os
import json
import logging
import requests

logger = logging.getLogger("curatrack.llm")

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1:8b")


def extract_medical_data(text: str) -> str:
    """
    Send OCR text to Ollama and get structured medical JSON back.
    Returns the raw LLM response string.
    Raises RuntimeError on failure.
    """
    prompt = f"""
You are a medical data extraction AI.

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
            raise RuntimeError("LLM returned empty response")

        logger.info("LLM extraction completed (%d chars)", len(raw_response))
        return raw_response

    except requests.ConnectionError:
        logger.error("Cannot connect to Ollama at %s", OLLAMA_URL)
        raise RuntimeError(f"Cannot connect to Ollama at {OLLAMA_URL}. Is it running?")
    except requests.Timeout:
        logger.error("Ollama request timed out")
        raise RuntimeError("LLM request timed out after 120s")
    except Exception as e:
        logger.error("LLM extraction failed: %s", e)
        raise RuntimeError(f"LLM extraction failed: {str(e)}")

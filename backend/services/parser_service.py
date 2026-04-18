"""
Parser service — extracts and validates structured JSON from raw LLM output.
"""
import re
import json
import logging

logger = logging.getLogger("curatrack.parser")

EMPTY_RESULT = {
    "medications": [],
    "lab_results": [],
    "doctor_notes": {
        "summary": "",
        "confidence": 0.0,
    },
}


def parse_llm_response(raw_response: str) -> dict:
    """
    Parse the raw LLM response to extract structured medical data.
    Uses regex to find JSON blocks, validates structure, clamps confidence.
    Returns fallback empty structure on failure.
    """
    try:
        # Try to extract JSON block from response
        json_str = _extract_json(raw_response)
        if not json_str:
            logger.warning("No JSON block found in LLM response")
            return EMPTY_RESULT.copy()

        data = json.loads(json_str)

        # Validate and normalize
        result = {
            "medications": _normalize_medications(data.get("medications", [])),
            "lab_results": _normalize_lab_results(data.get("lab_results", [])),
            "doctor_notes": _normalize_doctor_notes(data.get("doctor_notes", {})),
        }

        return result

    except json.JSONDecodeError as e:
        logger.error("JSON parse error: %s", e)
        return EMPTY_RESULT.copy()
    except Exception as e:
        logger.error("Parser error: %s", e)
        return EMPTY_RESULT.copy()


def _extract_json(text: str) -> str | None:
    """Extract JSON from LLM output — handles markdown fences and raw JSON."""
    # Try ```json ... ``` blocks first
    match = re.search(r"```(?:json)?\s*\n?(.*?)\n?```", text, re.DOTALL)
    if match:
        return match.group(1).strip()

    # Try raw { ... } block
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        return match.group(0).strip()

    return None


def _clamp_confidence(value) -> float:
    """Clamp confidence to [0, 1]."""
    try:
        return max(0.0, min(float(value), 1.0))
    except (TypeError, ValueError):
        return 0.0


def _normalize_medications(meds) -> list[dict]:
    """Validate and normalize medication entries."""
    if not isinstance(meds, list):
        return []

    result = []
    for med in meds:
        if not isinstance(med, dict):
            continue
        result.append({
            "name": str(med.get("name", "")).strip(),
            "dosage": str(med.get("dosage", "")).strip(),
            "frequency": str(med.get("frequency", "")).strip(),
            "time": str(med.get("time", "")).strip(),
            "reason": str(med.get("reason", "")).strip(),
            "confidence": _clamp_confidence(med.get("confidence", 0.0)),
        })
    return result


def _normalize_lab_results(labs) -> list[dict]:
    """Validate and normalize lab result entries."""
    if not isinstance(labs, list):
        return []

    valid_statuses = {"normal", "high", "low", "unknown"}
    result = []
    for lab in labs:
        if not isinstance(lab, dict):
            continue
        status = str(lab.get("status", "unknown")).lower().strip()
        if status not in valid_statuses:
            status = "unknown"
        result.append({
            "test": str(lab.get("test", "")).strip(),
            "value": str(lab.get("value", "")).strip(),
            "unit": str(lab.get("unit", "")).strip(),
            "status": status,
            "confidence": _clamp_confidence(lab.get("confidence", 0.0)),
        })
    return result


def _normalize_doctor_notes(notes) -> dict:
    """Validate and normalize doctor notes."""
    if not isinstance(notes, dict):
        return {"summary": "", "confidence": 0.0}

    return {
        "summary": str(notes.get("summary", "")).strip(),
        "confidence": _clamp_confidence(notes.get("confidence", 0.0)),
    }

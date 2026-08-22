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
            "clinical_insights": _normalize_clinical_insights(data.get("clinical_insights", {})),
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


def _normalize_string_list(value, max_items: int = 6) -> list[str]:
    """Normalize a list of short user-facing strings."""
    if not isinstance(value, list):
        return []

    result = []
    for item in value[:max_items]:
        text = str(item).strip()
        if text:
            result.append(text)
    return result


def _normalize_key_findings(findings) -> list[dict]:
    """Validate and normalize patient-facing clinical findings."""
    if not isinstance(findings, list):
        return []

    valid_severities = {"normal", "watch", "concerning", "urgent", "unknown"}
    result = []
    for finding in findings[:8]:
        if not isinstance(finding, dict):
            continue

        severity = str(finding.get("severity", "unknown")).lower().strip()
        if severity not in valid_severities:
            severity = "unknown"

        result.append({
            "title": str(finding.get("title", "")).strip(),
            "explanation": str(finding.get("explanation", "")).strip(),
            "severity": severity,
            "related_tests": _normalize_string_list(finding.get("related_tests", []), max_items=5),
        })
    return result


def _normalize_clinical_insights(insights) -> dict:
    """Validate and normalize plain-language clinical interpretation."""
    default_disclaimer = EMPTY_RESULT["clinical_insights"]["disclaimer"]
    if not isinstance(insights, dict):
        return EMPTY_RESULT["clinical_insights"].copy()

    return {
        "plain_language_summary": str(insights.get("plain_language_summary", "")).strip(),
        "key_findings": _normalize_key_findings(insights.get("key_findings", [])),
        "possible_meaning": str(insights.get("possible_meaning", "")).strip(),
        "recommended_next_steps": _normalize_string_list(insights.get("recommended_next_steps", [])),
        "questions_for_doctor": _normalize_string_list(insights.get("questions_for_doctor", [])),
        "urgent_warning_signs": _normalize_string_list(insights.get("urgent_warning_signs", [])),
        "disclaimer": str(insights.get("disclaimer", default_disclaimer)).strip() or default_disclaimer,
    }

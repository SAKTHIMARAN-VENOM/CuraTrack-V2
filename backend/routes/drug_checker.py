import httpx
import time
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, field_validator
from typing import List

router = APIRouter()

# In-memory cache: drug_name -> {"data": ..., "cached_at": timestamp}
_drug_cache: dict = {}
CACHE_TTL = 86400  # 24 hours


class DrugInteractionRequest(BaseModel):
    medications: List[str]

    @field_validator("medications")
    @classmethod
    def check_count(cls, v):
        if len(v) < 2:
            raise ValueError("At least 2 medications are required.")
        if len(v) > 8:
            raise ValueError("Maximum 8 medications allowed.")
        return v


def _classify_severity(text: str) -> str:
    t = text.lower()
    if "contraindicated" in t:
        return "high"
    if "caution" in t or "monitor" in t or "avoid" in t:
        return "moderate"
    return "low"


def _get_from_cache(drug: str):
    entry = _drug_cache.get(drug.lower())
    if entry and (time.time() - entry["cached_at"]) < CACHE_TTL:
        return entry["data"]
    return None


def _set_cache(drug: str, data):
    _drug_cache[drug.lower()] = {"data": data, "cached_at": time.time()}


async def _fetch_drug_interactions(drug: str) -> str:
    cached = _get_from_cache(drug)
    if cached is not None:
        return cached

    url = f"https://api.fda.gov/drug/label.json?search=drug_interactions:{drug}&limit=1"
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url)
            if resp.status_code == 429:
                return ""
            if resp.status_code != 200:
                return ""
            data = resp.json()
            results = data.get("results", [])
            if not results:
                _set_cache(drug, "")
                return ""
            interactions_list = results[0].get("drug_interactions", [])
            text = " ".join(interactions_list) if interactions_list else ""
            _set_cache(drug, text)
            return text
    except Exception:
        return ""


@router.post("/check-drug-interactions")
async def check_drug_interactions(request: DrugInteractionRequest):
    meds = [m.strip() for m in request.medications]

    # Fetch interaction text for each drug
    interaction_texts: dict = {}
    for drug in meds:
        interaction_texts[drug] = await _fetch_drug_interactions(drug)

    pairs = []
    safe = []

    for i in range(len(meds)):
        for j in range(i + 1, len(meds)):
            drug_a = meds[i]
            drug_b = meds[j]

            text_a = interaction_texts.get(drug_a, "")
            text_b = interaction_texts.get(drug_b, "")

            interaction_found = False
            description = ""
            severity = "low"

            if text_a and drug_b.lower() in text_a.lower():
                interaction_found = True
                # Find relevant snippet
                idx = text_a.lower().find(drug_b.lower())
                start = max(0, idx - 100)
                end = min(len(text_a), idx + 200)
                description = text_a[start:end].strip()
                severity = _classify_severity(description)
            elif text_b and drug_a.lower() in text_b.lower():
                interaction_found = True
                idx = text_b.lower().find(drug_a.lower())
                start = max(0, idx - 100)
                end = min(len(text_b), idx + 200)
                description = text_b[start:end].strip()
                severity = _classify_severity(description)

            if interaction_found:
                pairs.append({
                    "drug_a": drug_a,
                    "drug_b": drug_b,
                    "severity": severity,
                    "description": description or "Potential interaction detected. Consult your pharmacist.",
                    "source": "OpenFDA",
                })
            else:
                if not text_a and not text_b:
                    pairs.append({
                        "drug_a": drug_a,
                        "drug_b": drug_b,
                        "severity": "unknown",
                        "description": "No interaction data available from OpenFDA for this combination.",
                        "source": "OpenFDA",
                    })
                else:
                    safe.append(f"{drug_a} + {drug_b}")

    return {
        "interactions_found": any(p["severity"] != "unknown" for p in pairs if p not in [x for x in pairs if x["severity"] == "unknown"]),
        "pairs": pairs,
        "safe_combinations": safe,
    }

"""
AI Health Insights service — uses Ollama (Llama 3.1:8b) to analyze patient vitals
and return actionable health recommendations.
"""
import os
import json
import logging
import requests

logger = logging.getLogger("curatrack.insights")

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1:8b")

# Mock vitals — in production these come from Google Fit / Supabase
CURRENT_VITALS = {
    "heart_rate": {"value": 72, "unit": "bpm"},
    "steps": {"value": 4200, "goal": 8000},
    "sleep": {"hours": 7, "minutes": 20},
}


def generate_health_insights() -> list[dict]:
    """
    Send current vitals to Llama 3.1 and get back structured health insights.
    Returns a list of insight dicts, or falls back to rule-based insights if LLM is unavailable.
    """
    vitals_summary = _format_vitals()

    prompt = f"""You are a preventative health coach AI. Analyze the following patient vitals and return EXACTLY 3 health insights as a JSON array.

Patient Vitals:
{vitals_summary}

Return ONLY a valid JSON array (no markdown, no explanation) in this exact format:
[
  {{
    "category": "Heart Rate",
    "icon": "favorite",
    "status": "Normal",
    "statusColor": "green",
    "insight": "Your resting heart rate is within the healthy range.",
    "tip": "Maintain regular cardio exercises to keep it optimal."
  }}
]

Rules:
- category: One of "Heart Rate", "Activity", "Sleep"
- icon: Use Material Symbols icon names: "favorite" for heart, "steps" for activity, "bedtime" for sleep
- status: "Normal", "Elevated", "Low", "At Risk", or "Needs Attention"
- statusColor: "green" for normal, "amber" for caution, "red" for danger
- insight: A brief 1-sentence observation about the metric
- tip: A specific, actionable health tip (1-2 sentences)

Analyze each metric carefully. Be specific and medically accurate."""

    try:
        response = requests.post(
            f"{OLLAMA_URL}/api/generate",
            json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.3,
                    "num_predict": 1024,
                },
            },
            timeout=60,
        )
        response.raise_for_status()

        data = response.json()
        raw = data.get("response", "").strip()

        if not raw:
            logger.warning("LLM returned empty response, using fallback")
            return _fallback_insights()

        # Extract JSON array from response (strip markdown fences if present)
        json_str = raw
        if "```" in json_str:
            # Find content between ``` markers
            parts = json_str.split("```")
            for part in parts:
                stripped = part.strip()
                if stripped.startswith("json"):
                    stripped = stripped[4:].strip()
                if stripped.startswith("["):
                    json_str = stripped
                    break

        insights = json.loads(json_str)

        if isinstance(insights, list) and len(insights) > 0:
            logger.info("AI generated %d health insights", len(insights))
            return insights[:3]
        else:
            logger.warning("LLM response was not a valid list, using fallback")
            return _fallback_insights()

    except requests.ConnectionError:
        logger.warning("Ollama not reachable at %s, using fallback insights", OLLAMA_URL)
        return _fallback_insights()
    except requests.Timeout:
        logger.warning("Ollama timed out, using fallback insights")
        return _fallback_insights()
    except json.JSONDecodeError as e:
        logger.warning("Failed to parse LLM JSON (%s), using fallback", e)
        return _fallback_insights()
    except Exception as e:
        logger.error("Insight generation failed: %s", e)
        return _fallback_insights()


def _format_vitals() -> str:
    """Format vitals into a human-readable summary for the LLM."""
    v = CURRENT_VITALS
    return f"""- Heart Rate: {v['heart_rate']['value']} {v['heart_rate']['unit']}
- Daily Steps: {v['steps']['value']} / {v['steps']['goal']} goal
- Sleep Last Night: {v['sleep']['hours']}h {v['sleep']['minutes']}m"""


def _fallback_insights() -> list[dict]:
    """Rule-based fallback when LLM is unavailable."""
    v = CURRENT_VITALS
    insights = []

    # Heart Rate
    hr = v["heart_rate"]["value"]
    if 60 <= hr <= 100:
        insights.append({
            "category": "Heart Rate",
            "icon": "favorite",
            "status": "Normal",
            "statusColor": "green",
            "insight": f"Resting heart rate of {hr} bpm is within the healthy range (60-100 bpm).",
            "tip": "Continue regular aerobic exercises like brisk walking to maintain cardiovascular health."
        })
    else:
        insights.append({
            "category": "Heart Rate",
            "icon": "favorite",
            "status": "Needs Attention",
            "statusColor": "red",
            "insight": f"Heart rate of {hr} bpm is outside the normal range.",
            "tip": "Please consult your physician if this persists. Avoid caffeine and monitor at rest."
        })

    # Activity
    steps_val = v["steps"]["value"]
    steps_goal = v["steps"]["goal"]
    pct = round((steps_val / steps_goal) * 100)
    if pct >= 80:
        insights.append({
            "category": "Activity",
            "icon": "steps",
            "status": "Normal",
            "statusColor": "green",
            "insight": f"You've completed {pct}% of your daily step goal. Great progress!",
            "tip": "Keep it up! Consistent movement improves cardiovascular endurance."
        })
    else:
        insights.append({
            "category": "Activity",
            "icon": "steps",
            "status": "Needs Attention",
            "statusColor": "amber",
            "insight": f"Only {pct}% of your daily step goal reached ({steps_val:,} / {steps_goal:,}).",
            "tip": "Try a 15-minute evening walk after dinner to improve digestion and hit your target."
        })

    # Sleep
    hours = v["sleep"]["hours"]
    if hours >= 7:
        insights.append({
            "category": "Sleep",
            "icon": "bedtime",
            "status": "Normal",
            "statusColor": "green",
            "insight": f"You got {hours} hours of sleep, which is optimal for recovery.",
            "tip": "Maintain a consistent sleep schedule even on weekends."
        })
    else:
        insights.append({
            "category": "Sleep",
            "icon": "bedtime",
            "status": "Low",
            "statusColor": "amber",
            "insight": f"You only got {hours} hours of sleep last night.",
            "tip": "Try to limit screen time 1 hour before bed to improve sleep quality."
        })

    return insights
